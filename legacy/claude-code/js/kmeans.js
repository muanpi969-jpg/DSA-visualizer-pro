/* =====================================================================
   kmeans.js — interactive K-Means clustering (Lloyd's algorithm).
   Shows Voronoi assignment regions, animated centroid movement,
   and within-cluster inertia per iteration.
   ===================================================================== */
(() => {
  const U = ML.util, ui = ML.ui, el = ui.el;

  function mount(root) {
    const state = {
      k: 4, n: 320, spread: 0.14, init: 'kmeanspp',
      points: [], centroids: [], assign: [], trails: [],
      iter: 0, inertiaHist: [], running: false, raf: null, converged: false,
    };

    const controls = el('div', { class: 'panel-controls' });
    const stage = el('div', { class: 'panel-stage' });
    root.appendChild(el('div', { class: 'module module-kmeans' }, [controls, stage]));

    const canvas = el('canvas', { class: 'canvas cluster-canvas' });
    const inertiaCanvas = el('canvas', { class: 'canvas inertia-canvas' });
    const stIter = ui.stat('Iteration'), stInertia = ui.stat('Inertia');

    stage.appendChild(el('div', { class: 'stage-grid' }, [
      el('div', { class: 'card card-cluster' }, [
        el('div', { class: 'card-title' }, ['Clusters', el('span', { class: 'card-sub' }, ['shaded = nearest centroid · ✦ centroid'])]),
        canvas,
      ]),
      el('div', { class: 'card-col' }, [
        el('div', { class: 'card card-inertia' }, [
          el('div', { class: 'card-title' }, ['Inertia', el('span', { class: 'card-sub' }, ['Σ distance² to centroid'])]),
          inertiaCanvas,
        ]),
        el('div', { class: 'stat-bar stat-bar-col' }, [stIter.node, stInertia.node]),
      ]),
    ]));

    const playBtn = ui.button('▶ Run', toggleRun, 'btn-primary');

    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Data']),
      ui.slider({ label: 'Points', min: 50, max: 800, step: 10, value: state.n, fmt: v => String(v | 0), onInput: v => { state.n = v | 0; regen(); } }),
      ui.slider({ label: 'Spread', min: 0.05, max: 0.3, step: 0.01, value: state.spread, fmt: v => v.toFixed(2), onInput: v => { state.spread = v; regen(); } }),
    ]));
    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Algorithm']),
      ui.slider({ label: 'k (clusters)', min: 2, max: 8, step: 1, value: state.k, fmt: v => String(v | 0), onInput: v => { state.k = v | 0; initCentroids(); render(); } }),
      ui.select({
        label: 'Init', value: state.init,
        options: [{ value: 'kmeanspp', label: 'k-means++' }, { value: 'random', label: 'random' }],
        onChange: v => { state.init = v; initCentroids(); render(); },
      }),
    ]));
    controls.appendChild(el('div', { class: 'ctrl-actions' }, [
      playBtn,
      ui.button('⏭ Step', () => { if (!state.converged) { step(); render(); } }),
      ui.button('↺ Re-seed', () => { initCentroids(); render(); }),
      ui.button('🎲 New data', regen),
    ]));

    function regen() {
      U.seed((Date.now() & 0xffffff) ^ 0x55);
      // generate with a "true" number of blobs (use k by default but jitter)
      const ds = ML.datasets.blobs(state.n, Math.max(3, state.k), state.spread);
      state.points = ds.points.map(p => ({ x: p.x, y: p.y }));
      initCentroids();
      render();
    }

    function initCentroids() {
      state.iter = 0; state.inertiaHist = []; state.converged = false;
      state.trails = [];
      const pts = state.points;
      const cents = [];
      if (state.init === 'random') {
        // random positions across the space — produces visible centroid migration
        for (let i = 0; i < state.k; i++) cents.push({ x: U.randRange(-0.85, 0.85), y: U.randRange(-0.85, 0.85) });
      } else {
        // k-means++ seeding
        cents.push({ ...pts[(U.rand() * pts.length) | 0] });
        while (cents.length < state.k) {
          const d2 = pts.map(p => Math.min(...cents.map(c => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)));
          const sum = d2.reduce((a, b) => a + b, 0);
          let r = U.rand() * sum, idx = 0;
          for (; idx < d2.length; idx++) { r -= d2[idx]; if (r <= 0) break; }
          cents.push({ ...pts[Math.min(idx, pts.length - 1)] });
        }
      }
      state.centroids = cents;
      state.trails = cents.map(c => [[c.x, c.y]]);
      assignPoints();
    }

    function assignPoints() {
      let inertia = 0;
      state.assign = state.points.map(p => {
        let best = 0, bd = Infinity;
        state.centroids.forEach((c, i) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; best = i; } });
        inertia += bd; return best;
      });
      return inertia;
    }

    function step() {
      const inertia = assignPoints();
      state.inertiaHist.push(inertia);
      stIter.set(String(state.iter));
      stInertia.set(U.fmt(inertia, 3));
      // move centroids to mean of assigned points
      const sums = state.centroids.map(() => ({ x: 0, y: 0, n: 0 }));
      state.points.forEach((p, i) => { const a = state.assign[i]; sums[a].x += p.x; sums[a].y += p.y; sums[a].n++; });
      let moved = 0;
      state.centroids = state.centroids.map((c, i) => {
        if (sums[i].n === 0) return c; // keep empty centroid in place
        const nx = sums[i].x / sums[i].n, ny = sums[i].y / sums[i].n;
        moved += Math.hypot(nx - c.x, ny - c.y);
        state.trails[i].push([nx, ny]);
        return { x: nx, y: ny };
      });
      state.iter++;
      if (moved < 1e-4) { state.converged = true; if (state.running) toggleRun(); }
    }

    function loop() {
      if (!state.running) return;
      step(); render();
      if (state.converged) { stopRun(); return; }   // auto-stop, keep history intact
      setTimeout(() => { state.raf = requestAnimationFrame(loop); }, 220);
    }
    function stopRun() {
      state.running = false;
      playBtn.textContent = '▶ Run';
      playBtn.classList.remove('running');
      cancelAnimationFrame(state.raf);
    }
    function toggleRun() {
      if (state.running) { stopRun(); return; }
      if (state.converged) initCentroids();   // a fresh click after convergence restarts
      state.running = true;
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.add('running');
      loop();
    }

    function render() { drawClusters(); drawInertia(); }

    function drawClusters() {
      const { ctx, w, h } = U.fitCanvas(canvas);
      const sx = U.makeScale(-1.1, 1.1, 0, w), sy = U.makeScale(-1.1, 1.1, h, 0);
      // Voronoi-ish background (coarse grid colored by nearest centroid)
      const G = 56, cw = w / G, ch = h / G;
      for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
        const x = sx.invert((gx + 0.5) * cw), y = sy.invert((gy + 0.5) * ch);
        let best = 0, bd = Infinity;
        state.centroids.forEach((c, i) => { const d = (x - c.x) ** 2 + (y - c.y) ** 2; if (d < bd) { bd = d; best = i; } });
        ctx.fillStyle = U.palette[best % U.palette.length] + '22';
        ctx.fillRect(gx * cw, gy * ch, cw + 1, ch + 1);
      }
      // points colored by assignment
      state.points.forEach((p, i) => {
        const col = U.palette[state.assign[i] % U.palette.length];
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 2.8, 0, 2 * Math.PI);
        ctx.fillStyle = col; ctx.fill();
      });
      // centroid trails + markers
      state.trails.forEach((t, i) => {
        const col = U.palette[i % U.palette.length];
        ctx.beginPath();
        t.forEach((p, j) => { const X = sx(p[0]), Y = sy(p[1]); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4; ctx.stroke();
      });
      state.centroids.forEach((c, i) => {
        ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff'; ctx.fillText('✦', sx(c.x), sy(c.y));
        ctx.fillStyle = U.palette[i % U.palette.length]; ctx.font = '15px sans-serif'; ctx.fillText('✦', sx(c.x), sy(c.y));
      });
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }

    function drawInertia() {
      const { ctx, w, h } = U.fitCanvas(inertiaCanvas);
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 38, r: 8, t: 10, b: 18 };
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
      const hist = state.inertiaHist;
      if (hist.length < 1) return;
      const maxI = Math.max(...hist) * 1.05 || 1;
      const sx = U.makeScale(0, Math.max(1, hist.length - 1), pad.l, w - pad.r);
      const sy = U.makeScale(0, maxI, h - pad.b, pad.t);
      ctx.beginPath();
      hist.forEach((v, i) => { const X = sx(i), Y = sy(v); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = '#2bb673'; ctx.lineWidth = 2; ctx.stroke();
      hist.forEach((v, i) => { ctx.beginPath(); ctx.arc(sx(i), sy(v), 2.5, 0, 2 * Math.PI); ctx.fillStyle = '#2bb673'; ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(U.fmt(maxI, 1), 4, pad.t + 8); ctx.fillText('0', 4, h - pad.b);
    }

    regen();
    window.addEventListener('resize', render);
    return { onShow() { render(); }, onHide() { if (state.running) toggleRun(); } };
  }

  ML.KMeans = { mount };
})();
