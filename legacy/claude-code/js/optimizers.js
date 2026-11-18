/* =====================================================================
   optimizers.js — gradient-descent optimizer race on 2D loss surfaces.
   Renders a loss landscape and animates several optimizers descending
   it simultaneously from a shared start point.
   ===================================================================== */
(() => {
  const U = ML.util, ui = ML.ui, el = ui.el;

  // ---- test functions. Each: {f, domain:[xmin,xmax,ymin,ymax], start, min, lr} ----
  const FUNCS = {
    rosenbrock: {
      label: 'Rosenbrock (banana valley)',
      f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
      domain: [-2, 2, -1, 3], start: [-1.5, 2.4], min: [1, 1], lr: 0.0008, logColor: true,
    },
    bowl: {
      label: 'Ill-conditioned bowl',
      f: (x, y) => 0.5 * (x * x + 12 * y * y),
      domain: [-3, 3, -3, 3], start: [-2.6, 2.4], min: [0, 0], lr: 0.06, logColor: false,
    },
    saddle: {
      label: 'Saddle point',
      f: (x, y) => x * x - y * y + 0.15 * y * y * y * y,
      domain: [-3, 3, -3, 3], start: [-2.2, 0.001], min: [0, 0], lr: 0.03, logColor: false,
    },
    beale: {
      label: 'Beale (steep walls)',
      f: (x, y) => (1.5 - x + x * y) ** 2 + (2.25 - x + x * y * y) ** 2 + (2.625 - x + x * y * y * y) ** 2,
      domain: [-4.5, 4.5, -4.5, 4.5], start: [-3.5, -3.5], min: [3, 0.5], lr: 0.0006, logColor: true,
    },
    himmelblau: {
      label: 'Himmelblau (4 minima)',
      f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
      domain: [-5, 5, -5, 5], start: [-0.2, -0.1], min: [3, 2], lr: 0.004, logColor: true,
    },
  };

  // numeric central-difference gradient
  function grad(f, x, y) {
    const h = 1e-4;
    return [
      (f(x + h, y) - f(x - h, y)) / (2 * h),
      (f(x, y + h) - f(x, y - h)) / (2 * h),
    ];
  }

  // ---- optimizer implementations on a 2-vector parameter ----
  function makeOptimizers(start, lr) {
    const base = () => ({ x: start[0], y: start[1], trail: [[start[0], start[1]]], done: false });
    return [
      { name: 'SGD', color: '#e74c3c', s: base(), step(f) { const [gx, gy] = grad(f, this.s.x, this.s.y); this.s.x -= lr * gx; this.s.y -= lr * gy; } },
      { name: 'Momentum', color: '#e97a2f', s: { ...base(), vx: 0, vy: 0 }, step(f) { const [gx, gy] = grad(f, this.s.x, this.s.y); this.s.vx = 0.9 * this.s.vx - lr * gx; this.s.vy = 0.9 * this.s.vy - lr * gy; this.s.x += this.s.vx; this.s.y += this.s.vy; } },
      { name: 'NAG', color: '#f1c40f', s: { ...base(), vx: 0, vy: 0 }, step(f) { const lx = this.s.x + 0.9 * this.s.vx, ly = this.s.y + 0.9 * this.s.vy; const [gx, gy] = grad(f, lx, ly); this.s.vx = 0.9 * this.s.vx - lr * gx; this.s.vy = 0.9 * this.s.vy - lr * gy; this.s.x += this.s.vx; this.s.y += this.s.vy; } },
      { name: 'Adagrad', color: '#2bb673', s: { ...base(), gx2: 1e-8, gy2: 1e-8 }, step(f) { const [gx, gy] = grad(f, this.s.x, this.s.y); this.s.gx2 += gx * gx; this.s.gy2 += gy * gy; this.s.x -= (lr * 8) * gx / Math.sqrt(this.s.gx2); this.s.y -= (lr * 8) * gy / Math.sqrt(this.s.gy2); } },
      { name: 'RMSprop', color: '#3498db', s: { ...base(), gx2: 0, gy2: 0 }, step(f) { const [gx, gy] = grad(f, this.s.x, this.s.y); this.s.gx2 = 0.9 * this.s.gx2 + 0.1 * gx * gx; this.s.gy2 = 0.9 * this.s.gy2 + 0.1 * gy * gy; this.s.x -= (lr * 6) * gx / (Math.sqrt(this.s.gx2) + 1e-8); this.s.y -= (lr * 6) * gy / (Math.sqrt(this.s.gy2) + 1e-8); } },
      { name: 'Adam', color: '#9b59b6', s: { ...base(), mx: 0, my: 0, vx: 0, vy: 0, t: 0 }, step(f) { const b1 = 0.9, b2 = 0.999; this.s.t++; const [gx, gy] = grad(f, this.s.x, this.s.y); this.s.mx = b1 * this.s.mx + (1 - b1) * gx; this.s.my = b1 * this.s.my + (1 - b1) * gy; this.s.vx = b2 * this.s.vx + (1 - b2) * gx * gx; this.s.vy = b2 * this.s.vy + (1 - b2) * gy * gy; const mhx = this.s.mx / (1 - b1 ** this.s.t), mhy = this.s.my / (1 - b1 ** this.s.t); const vhx = this.s.vx / (1 - b2 ** this.s.t), vhy = this.s.vy / (1 - b2 ** this.s.t); this.s.x -= (lr * 7) * mhx / (Math.sqrt(vhx) + 1e-8); this.s.y -= (lr * 7) * mhy / (Math.sqrt(vhy) + 1e-8); } },
    ];
  }

  function mount(root) {
    const state = { funcName: 'rosenbrock', lr: FUNCS.rosenbrock.lr, opts: null, iter: 0, running: false, raf: null, enabled: {}, maxIter: 600 };

    const controls = el('div', { class: 'panel-controls' });
    const stage = el('div', { class: 'panel-stage' });
    root.appendChild(el('div', { class: 'module module-optimizers' }, [controls, stage]));

    const canvas = el('canvas', { class: 'canvas surface-canvas' });
    const legend = el('div', { class: 'opt-legend' });
    stage.appendChild(el('div', { class: 'card card-surface' }, [
      el('div', { class: 'card-title' }, ['Loss landscape',
        el('span', { class: 'card-sub' }, ['★ marks the minimum · ● current position'])]),
      canvas,
      legend,
    ]));

    const playBtn = ui.button('▶ Race', toggleRun, 'btn-primary');
    const lrSlider = ui.slider({ label: 'Learning-rate scale', min: 0.1, max: 3, step: 0.05, value: 1, fmt: v => v.toFixed(2) + '×', onInput: v => { state.lrScale = v; reset(); } });
    state.lrScale = 1;

    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Landscape']),
      ui.select({
        label: 'Function', value: state.funcName,
        options: Object.entries(FUNCS).map(([k, v]) => ({ value: k, label: v.label })),
        onChange: v => { state.funcName = v; reset(); },
      }),
      lrSlider,
      ui.slider({ label: 'Max iterations', min: 100, max: 1500, step: 50, value: state.maxIter, fmt: v => String(v | 0), onInput: v => { state.maxIter = v | 0; } }),
    ]));

    const toggles = el('div', { class: 'ctrl-group' }, [el('div', { class: 'ctrl-group-title' }, ['Optimizers'])]);
    controls.appendChild(toggles);
    const toggleHost = el('div', { class: 'opt-toggles' });
    toggles.appendChild(toggleHost);

    controls.appendChild(el('div', { class: 'ctrl-actions' }, [
      playBtn,
      ui.button('⏭ Step ×20', () => { for (let i = 0; i < 20; i++) stepOnce(); render(); }),
      ui.button('↺ Reset', reset),
    ]));

    function buildToggles() {
      toggleHost.innerHTML = '';
      for (const o of state.opts) {
        if (!(o.name in state.enabled)) state.enabled[o.name] = true;
        const sw = el('label', { class: 'opt-toggle' }, [
          el('input', { type: 'checkbox', ...(state.enabled[o.name] ? { checked: '' } : {}), onchange: e => { state.enabled[o.name] = e.target.checked; render(); } }),
          el('span', { class: 'opt-dot', style: `background:${o.color}` }),
          o.name,
        ]);
        toggleHost.appendChild(sw);
      }
    }

    function reset() {
      const fn = FUNCS[state.funcName];
      state.lr = fn.lr * state.lrScale;
      state.opts = makeOptimizers(fn.start, state.lr);
      state.iter = 0;
      buildToggles();
      render();
    }

    function stepOnce() {
      const fn = FUNCS[state.funcName].f;
      const [dxmin, dxmax, dymin, dymax] = FUNCS[state.funcName].domain;
      for (const o of state.opts) {
        if (o.s.done || !state.enabled[o.name]) continue;
        o.step(fn);
        // clamp to domain so a diverging optimizer doesn't fly off
        o.s.x = U.clamp(o.s.x, dxmin - 1, dxmax + 1);
        o.s.y = U.clamp(o.s.y, dymin - 1, dymax + 1);
        o.s.trail.push([o.s.x, o.s.y]);
        if (o.s.trail.length > 1200) o.s.trail.shift();
      }
      state.iter++;
      if (state.iter >= state.maxIter && state.running) toggleRun();
    }

    function loop() { if (!state.running) return; for (let i = 0; i < 2; i++) stepOnce(); render(); state.raf = requestAnimationFrame(loop); }
    function toggleRun() {
      state.running = !state.running;
      playBtn.textContent = state.running ? '⏸ Pause' : '▶ Race';
      playBtn.classList.toggle('running', state.running);
      if (state.running) loop(); else cancelAnimationFrame(state.raf);
    }

    function render() {
      const { ctx, w, h } = U.fitCanvas(canvas);
      const fn = FUNCS[state.funcName];
      const [dxmin, dxmax, dymin, dymax] = fn.domain;
      const sx = U.makeScale(dxmin, dxmax, 0, w), sy = U.makeScale(dymin, dymax, h, 0);

      // sample loss on grid to find range
      const G = 90;
      const vals = new Float64Array(G * G);
      let lo = Infinity, hi = -Infinity;
      for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
        const x = U.lerp(dxmin, dxmax, gx / (G - 1)), y = U.lerp(dymin, dymax, gy / (G - 1));
        let v = fn.f(x, y); if (fn.logColor) v = Math.log(1 + v);
        vals[gx * G + gy] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      const cw = w / (G - 1), ch = h / (G - 1);
      for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
        const t = (vals[gx * G + gy] - lo) / (hi - lo + 1e-9);
        ctx.fillStyle = U.viridis(1 - t * 0.96);   // dark = low loss
        const px = sx(U.lerp(dxmin, dxmax, gx / (G - 1)));
        const py = sy(U.lerp(dymin, dymax, gy / (G - 1)));
        ctx.fillRect(px - cw / 2, py - ch / 2, cw + 1, ch + 1);
      }

      // iso-contour lines
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
      for (let level = 0; level <= 8; level++) {
        const target = lo + (hi - lo) * (level / 8);
        ctx.beginPath();
        for (let gx = 0; gx < G - 1; gx++) for (let gy = 0; gy < G - 1; gy++) {
          // crude marching: draw a dot where value crosses target
          const v = vals[gx * G + gy], vr = vals[(gx + 1) * G + gy];
          if ((v - target) * (vr - target) < 0) {
            const px = sx(U.lerp(dxmin, dxmax, (gx + 0.5) / (G - 1)));
            const py = sy(U.lerp(dymin, dymax, gy / (G - 1)));
            ctx.rect(px, py, 1, 1);
          }
        }
        ctx.stroke();
      }

      // minimum marker
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('★', sx(fn.min[0]), sy(fn.min[1]) + 5);
      ctx.textAlign = 'start';

      // optimizer trails
      legend.innerHTML = '';
      for (const o of state.opts) {
        if (!state.enabled[o.name]) continue;
        ctx.beginPath();
        o.s.trail.forEach((p, i) => { const X = sx(p[0]), Y = sy(p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
        // head
        const last = o.s.trail[o.s.trail.length - 1];
        ctx.beginPath(); ctx.arc(sx(last[0]), sy(last[1]), 4, 0, 2 * Math.PI);
        ctx.fillStyle = o.color; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // legend row with current loss
        const loss = FUNCS[state.funcName].f(last[0], last[1]);
        legend.appendChild(el('div', { class: 'opt-legrow' }, [
          el('span', { class: 'opt-dot', style: `background:${o.color}` }),
          el('span', { class: 'opt-legname' }, [o.name]),
          el('span', { class: 'opt-legloss' }, [U.fmt(loss, 4)]),
        ]));
      }
      legend.appendChild(el('div', { class: 'opt-iter' }, [`iteration ${state.iter}`]));
    }

    reset();
    window.addEventListener('resize', render);
    return { onShow() { render(); }, onHide() { if (state.running) toggleRun(); } };
  }

  ML.Optimizers = { mount };
})();
