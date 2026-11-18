/* =====================================================================
   regression.js — polynomial regression & the bias/variance tradeoff.
   Fits a degree-d polynomial by (ridge-regularized) least squares and
   shows how model complexity drives under- and over-fitting.
   ===================================================================== */
(() => {
  const U = ML.util, ui = ML.ui, el = ui.el;

  // Solve (A) w = b for small symmetric systems via Gaussian elimination.
  function solve(A, b) {
    const n = b.length;
    const M = A.map((row, i) => row.concat(b[i]));
    for (let col = 0; col < n; col++) {
      // partial pivot
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      [M[col], M[piv]] = [M[piv], M[col]];
      const d = M[col][col] || 1e-12;
      for (let c = col; c <= n; c++) M[col][c] /= d;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col];
        for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
      }
    }
    return M.map(row => row[n]);
  }

  // Ridge polynomial fit. Returns weight vector length degree+1.
  function fitPoly(xs, ys, degree, lambda) {
    const p = degree + 1;
    const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
    const Xty = new Array(p).fill(0);
    for (let k = 0; k < xs.length; k++) {
      const powers = []; let v = 1;
      for (let j = 0; j < p; j++) { powers.push(v); v *= xs[k]; }
      for (let i = 0; i < p; i++) {
        Xty[i] += powers[i] * ys[k];
        for (let j = 0; j < p; j++) XtX[i][j] += powers[i] * powers[j];
      }
    }
    for (let i = 0; i < p; i++) XtX[i][i] += lambda; // ridge (skip intercept-only nuance for clarity)
    return solve(XtX, Xty);
  }
  function evalPoly(w, x) { let v = 0, p = 1; for (const c of w) { v += c * p; p *= x; } return v; }

  const TRUE_FNS = {
    sine: { label: 'sine', f: x => Math.sin(x * Math.PI * 1.3) },
    cubic: { label: 'cubic', f: x => 2 * x ** 3 - x },
    step: { label: 'step', f: x => (x > 0 ? 0.6 : -0.6) },
    spike: { label: 'gaussian bump', f: x => Math.exp(-((x) ** 2) * 6) * 1.4 - 0.5 },
  };

  function mount(root) {
    const state = { trueFn: 'sine', degree: 3, noise: 0.18, lambda: 0, n: 24, points: [], train: [], test: [], split: 0.65 };

    const controls = el('div', { class: 'panel-controls' });
    const stage = el('div', { class: 'panel-stage' });
    root.appendChild(el('div', { class: 'module module-regression' }, [controls, stage]));

    const fitCanvas = el('canvas', { class: 'canvas fit-canvas' });
    const errCanvas = el('canvas', { class: 'canvas err-canvas' });
    const stTrain = ui.stat('Train MSE'), stTest = ui.stat('Test MSE'), stGap = ui.stat('Gap (test−train)');

    stage.appendChild(el('div', { class: 'stage-grid' }, [
      el('div', { class: 'card card-fit' }, [
        el('div', { class: 'card-title' }, ['Polynomial fit', el('span', { class: 'card-sub' }, ['dashed = true function · ● train · ◦ test'])]),
        fitCanvas,
      ]),
      el('div', { class: 'card-col' }, [
        el('div', { class: 'card card-err' }, [
          el('div', { class: 'card-title' }, ['Error vs degree', el('span', { class: 'card-sub' }, ['the bias / variance U-curve'])]),
          errCanvas,
        ]),
        el('div', { class: 'stat-bar stat-bar-col' }, [stTrain.node, stTest.node, stGap.node]),
      ]),
    ]));

    const degSlider = ui.slider({ label: 'Polynomial degree', min: 1, max: 15, step: 1, value: state.degree, fmt: v => String(v | 0), onInput: v => { state.degree = v | 0; render(); } });

    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Data']),
      ui.select({ label: 'True function', value: state.trueFn, options: Object.entries(TRUE_FNS).map(([k, v]) => ({ value: k, label: v.label })), onChange: v => { state.trueFn = v; regen(); } }),
      ui.slider({ label: 'Sample size', min: 8, max: 80, step: 1, value: state.n, fmt: v => String(v | 0), onInput: v => { state.n = v | 0; regen(); } }),
      ui.slider({ label: 'Noise', min: 0, max: 0.5, step: 0.01, value: state.noise, fmt: v => v.toFixed(2), onInput: v => { state.noise = v; regen(); } }),
    ]));
    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Model']),
      degSlider,
      ui.slider({ label: 'Ridge λ', min: 0, max: 1, step: 0.005, value: state.lambda, fmt: v => v.toFixed(3), onInput: v => { state.lambda = v; render(); } }),
    ]));
    controls.appendChild(el('div', { class: 'ctrl-actions' }, [
      ui.button('🎲 New sample', regen, 'btn-primary'),
      ui.button('↺ Reset model', () => { state.degree = 3; state.lambda = 0; degSlider.setValue(3); render(); }),
    ]));

    function regen() {
      U.seed((Date.now() & 0xffffff) ^ 0xa7);
      const f = TRUE_FNS[state.trueFn].f;
      const pts = [];
      for (let i = 0; i < state.n; i++) {
        const x = U.randRange(-1, 1);
        pts.push({ x, y: f(x) + U.randn(0, state.noise) });
      }
      pts.sort((a, b) => a.x - b.x);
      const sp = ML.datasets.split(pts, state.split);
      state.points = pts; state.train = sp.train; state.test = sp.test;
      render();
    }

    function mse(w, set) { if (!set.length) return NaN; let s = 0; for (const p of set) { const e = evalPoly(w, p.x) - p.y; s += e * e; } return s / set.length; }

    function render() {
      const xs = state.train.map(p => p.x), ys = state.train.map(p => p.y);
      const w = fitPoly(xs, ys, state.degree, state.lambda);
      const trainMSE = mse(w, state.train), testMSE = mse(w, state.test);
      stTrain.set(U.fmt(trainMSE, 4)); stTest.set(U.fmt(testMSE, 4)); stGap.set(U.fmt(testMSE - trainMSE, 4));
      drawFit(w); drawErrCurve();
    }

    function drawFit(w) {
      const { ctx, w: cw, h } = U.fitCanvas(fitCanvas);
      ctx.clearRect(0, 0, cw, h);
      const sx = U.makeScale(-1.05, 1.05, 0, cw), sy = U.makeScale(-1.8, 1.8, h, 0);
      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      for (let gx = -1; gx <= 1; gx += 0.5) { ctx.beginPath(); ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), h); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(cw, sy(0)); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
      // true function (dashed)
      const f = TRUE_FNS[state.trueFn].f;
      ctx.setLineDash([5, 4]); ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = U.lerp(-1, 1, i / 200); const X = sx(x), Y = sy(f(x)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      // fitted polynomial
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const x = U.lerp(-1.05, 1.05, i / 240); const X = sx(x), Y = sy(U.clamp(evalPoly(w, x), -3, 3)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.strokeStyle = '#e97a2f'; ctx.lineWidth = 2.4; ctx.stroke();
      // points
      for (const p of state.train) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3.6, 0, 2 * Math.PI); ctx.fillStyle = '#4477c4'; ctx.fill(); }
      for (const p of state.test) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3.6, 0, 2 * Math.PI); ctx.strokeStyle = '#2bb673'; ctx.lineWidth = 1.8; ctx.stroke(); }
    }

    function drawErrCurve() {
      const { ctx, w: cw, h } = U.fitCanvas(errCanvas);
      ctx.clearRect(0, 0, cw, h);
      const pad = { l: 38, r: 10, t: 10, b: 22 };
      const maxDeg = 15;
      const trainErr = [], testErr = [];
      const xs = state.train.map(p => p.x), ys = state.train.map(p => p.y);
      for (let d = 1; d <= maxDeg; d++) { const w = fitPoly(xs, ys, d, state.lambda); trainErr.push(mse(w, state.train)); testErr.push(mse(w, state.test)); }
      const allFinite = trainErr.concat(testErr).filter(isFinite);
      let maxE = Math.max(...allFinite); maxE = Math.min(maxE, (state.noise + 0.2) ** 2 * 12 + 0.4); maxE = Math.max(maxE, 0.05);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(pad.l, pad.t, cw - pad.l - pad.r, h - pad.t - pad.b);
      const sx = U.makeScale(1, maxDeg, pad.l, cw - pad.r);
      const sy = U.makeScale(0, maxE, h - pad.b, pad.t);
      const drawSeries = (arr, color) => { ctx.beginPath(); arr.forEach((v, i) => { const X = sx(i + 1), Y = sy(U.clamp(v, 0, maxE)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); };
      drawSeries(trainErr, '#4477c4');
      drawSeries(testErr, '#2bb673');
      // current degree marker
      ctx.strokeStyle = 'rgba(233,122,47,0.8)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sx(state.degree), pad.t); ctx.lineTo(sx(state.degree), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      // labels
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('degree →', cw - 60, h - 6);
      ctx.fillStyle = '#4477c4'; ctx.fillRect(cw - 96, pad.t + 2, 10, 3); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('train', cw - 82, pad.t + 6);
      ctx.fillStyle = '#2bb673'; ctx.fillRect(cw - 50, pad.t + 2, 10, 3); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('test', cw - 36, pad.t + 6);
    }

    regen();
    window.addEventListener('resize', render);
    return { onShow() { render(); }, onHide() {} };
  }

  ML.Regression = { mount };
})();
