/* =====================================================================
   playground.js — interactive neural-network training playground.
   Trains a from-scratch MLP on 2D datasets and visualizes the decision
   boundary, network weights, and loss curves in real time.
   ===================================================================== */
(() => {
  const U = ML.util, ui = ML.ui, el = ui.el;

  function mount(root) {
    const state = {
      datasetName: 'spiral',
      noise: 0.18,
      hidden: [6, 4],
      act: 'tanh',
      lr: 0.03,
      l2: 0,
      optimizer: 'adam',
      batch: 16,
      stepsPerFrame: 3,
      running: false,
      net: null,
      data: null, train: null, test: null,
      history: [],         // {epoch, trainLoss, testLoss, acc}
      raf: null,
    };

    /* ---------- layout ---------- */
    const controls = el('div', { class: 'panel-controls' });
    const stage = el('div', { class: 'panel-stage' });
    root.appendChild(el('div', { class: 'module module-playground' }, [controls, stage]));

    // canvases
    const boundaryCanvas = el('canvas', { class: 'canvas boundary-canvas' });
    const netCanvas = el('canvas', { class: 'canvas net-canvas' });
    const lossCanvas = el('canvas', { class: 'canvas loss-canvas' });

    const stEpoch = ui.stat('Epoch');
    const stTrain = ui.stat('Train loss');
    const stTest = ui.stat('Test loss');
    const stAcc = ui.stat('Test acc');

    stage.appendChild(el('div', { class: 'stage-grid' }, [
      el('div', { class: 'card card-boundary' }, [
        el('div', { class: 'card-title' }, ['Decision boundary',
          el('span', { class: 'card-sub' }, ['model output over input space'])]),
        boundaryCanvas,
        el('div', { class: 'legend' }, [
          el('span', { class: 'legend-swatch', style: 'background:#4477c4' }), 'class 0',
          el('span', { class: 'legend-swatch', style: 'background:#e97a2f;margin-left:14px' }), 'class 1',
          el('span', { class: 'legend-note' }, ['◦ hollow = test']),
        ]),
      ]),
      el('div', { class: 'card-col' }, [
        el('div', { class: 'card card-net' }, [
          el('div', { class: 'card-title' }, ['Network',
            el('span', { class: 'card-sub' }, ['edge = weight (blue −, orange +)'])]),
          netCanvas,
        ]),
        el('div', { class: 'card card-loss' }, [
          el('div', { class: 'card-title' }, ['Loss', el('span', { class: 'card-sub' }, ['train vs test'])]),
          lossCanvas,
        ]),
      ]),
    ]));

    const statBar = el('div', { class: 'stat-bar' }, [stEpoch.node, stTrain.node, stTest.node, stAcc.node]);
    stage.appendChild(statBar);

    /* ---------- controls ---------- */
    const playBtn = ui.button('▶ Train', toggleRun, 'btn-primary');

    const archRow = el('div', { class: 'arch-row' });
    function renderArch() {
      archRow.innerHTML = '';
      archRow.appendChild(el('span', { class: 'arch-chip arch-fixed' }, ['2 in']));
      state.hidden.forEach((n, idx) => {
        const chip = el('div', { class: 'arch-chip' }, [
          el('button', { class: 'arch-mini', title: 'remove neuron', onclick: () => { if (state.hidden[idx] > 1) { state.hidden[idx]--; rebuild(); } } }, ['−']),
          el('span', { class: 'arch-n' }, [String(n)]),
          el('button', { class: 'arch-mini', title: 'add neuron', onclick: () => { if (state.hidden[idx] < 12) { state.hidden[idx]++; rebuild(); } } }, ['+']),
          el('button', { class: 'arch-del', title: 'remove layer', onclick: () => { state.hidden.splice(idx, 1); rebuild(); } }, ['×']),
        ]);
        archRow.appendChild(chip);
      });
      if (state.hidden.length < 5)
        archRow.appendChild(el('button', { class: 'arch-add', title: 'add hidden layer', onclick: () => { state.hidden.push(4); rebuild(); } }, ['+ layer']));
      archRow.appendChild(el('span', { class: 'arch-chip arch-fixed' }, ['1 out']));
    }

    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Data']),
      ui.select({
        label: 'Dataset', value: state.datasetName, onChange: v => { state.datasetName = v; regenData(); reset(); },
        options: [
          { value: 'spiral', label: 'Spiral' }, { value: 'circles', label: 'Circles' },
          { value: 'xor', label: 'XOR' }, { value: 'moons', label: 'Moons' },
          { value: 'gaussians', label: 'Gaussians' },
        ],
      }),
      ui.slider({ label: 'Noise', min: 0, max: 0.4, step: 0.01, value: state.noise, fmt: v => v.toFixed(2), onInput: v => { state.noise = v; regenData(); reset(); } }),
    ]));

    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Architecture']),
      archRow,
      ui.select({
        label: 'Activation', value: state.act, onChange: v => { state.act = v; rebuild(); },
        options: [{ value: 'tanh', label: 'tanh' }, { value: 'relu', label: 'ReLU' }, { value: 'sigmoid', label: 'sigmoid' }],
      }),
    ]));

    controls.appendChild(el('div', { class: 'ctrl-group' }, [
      el('div', { class: 'ctrl-group-title' }, ['Optimization']),
      ui.select({
        label: 'Optimizer', value: state.optimizer, onChange: v => { state.optimizer = v; if (state.net) state.net.optimizer = v; },
        options: [{ value: 'adam', label: 'Adam' }, { value: 'rmsprop', label: 'RMSprop' }, { value: 'momentum', label: 'Momentum' }, { value: 'sgd', label: 'SGD' }],
      }),
      ui.slider({ label: 'Learning rate', min: 0.001, max: 0.3, step: 0.001, value: state.lr, fmt: v => v.toFixed(3), onInput: v => { state.lr = v; if (state.net) state.net.lr = v; } }),
      ui.slider({ label: 'L2 reg', min: 0, max: 0.05, step: 0.001, value: state.l2, fmt: v => v.toFixed(3), onInput: v => { state.l2 = v; if (state.net) state.net.l2 = v; } }),
      ui.slider({ label: 'Batch size', min: 1, max: 32, step: 1, value: state.batch, fmt: v => String(v | 0), onInput: v => { state.batch = v | 0; } }),
      ui.slider({ label: 'Speed (steps/frame)', min: 1, max: 20, step: 1, value: state.stepsPerFrame, fmt: v => String(v | 0), onInput: v => { state.stepsPerFrame = v | 0; } }),
    ]));

    controls.appendChild(el('div', { class: 'ctrl-actions' }, [
      playBtn,
      ui.button('⏭ Step', () => { stepN(1); render(); }),
      ui.button('↺ Reset', reset),
      ui.button('🎲 New data', () => { regenData(); reset(); }),
    ]));

    /* ---------- model + data lifecycle ---------- */
    function regenData() {
      U.seed(Date.now() & 0xffffff);
      state.data = ML.datasets.classification[state.datasetName](260, state.noise);
      const sp = ML.datasets.split(state.data.points, 0.5);
      const toSample = p => ({ input: [p.x, p.y], target: [p.label], raw: p });
      state.train = sp.train.map(toSample);
      state.test = sp.test.map(toSample);
    }
    function rebuild() {
      renderArch();
      const sizes = [2, ...state.hidden, 1];
      state.net = new ML.NN.Network(sizes, {
        task: 'classification', hiddenAct: state.act, lr: state.lr, l2: state.l2, optimizer: state.optimizer,
      });
      state.history = [];
      render();
    }
    function reset() { rebuild(); }

    function stepN(n) {
      for (let s = 0; s < n; s++) {
        const batch = [];
        for (let i = 0; i < state.batch; i++) batch.push(state.train[(Math.random() * state.train.length) | 0]);
        state.net.trainBatch(batch);
      }
      // record metrics
      const trainLoss = state.net.evalLoss(state.train);
      const testLoss = state.net.evalLoss(state.test);
      const acc = state.net.accuracy(state.test);
      state.history.push({ epoch: state.net.epoch, trainLoss, testLoss, acc });
      if (state.history.length > 600) state.history.shift();
      stEpoch.set(state.net.epoch.toLocaleString());
      stTrain.set(U.fmt(trainLoss));
      stTest.set(U.fmt(testLoss));
      stAcc.set((acc * 100).toFixed(1) + '%');
    }

    function loop() {
      if (!state.running) return;
      stepN(state.stepsPerFrame);
      render();
      state.raf = requestAnimationFrame(loop);
    }
    function toggleRun() {
      state.running = !state.running;
      playBtn.textContent = state.running ? '⏸ Pause' : '▶ Train';
      playBtn.classList.toggle('running', state.running);
      if (state.running) loop(); else cancelAnimationFrame(state.raf);
    }

    /* ---------- rendering ---------- */
    let gridCache = null;
    function render() { drawBoundary(); drawNet(); drawLoss(); }

    function drawBoundary() {
      const { ctx, w, h } = U.fitCanvas(boundaryCanvas);
      const sx = U.makeScale(-1, 1, 0, w), sy = U.makeScale(-1, 1, h, 0);
      // boundary heatmap on a grid
      const G = 64;
      const cw = w / G, ch = h / G;
      for (let gx = 0; gx < G; gx++) {
        for (let gy = 0; gy < G; gy++) {
          const x = U.lerp(-1, 1, gx / (G - 1));
          const y = U.lerp(1, -1, gy / (G - 1));
          const out = state.net.predict1([x, y]);      // 0..1
          ctx.fillStyle = U.diverging((out - 0.5) * 2 * 0.95);
          ctx.fillRect(gx * cw, gy * ch, cw + 1, ch + 1);
        }
      }
      // points
      drawPoints(ctx, state.train, sx, sy, false);
      drawPoints(ctx, state.test, sx, sy, true);
    }
    function drawPoints(ctx, samples, sx, sy, hollow) {
      for (const s of samples) {
        const p = s.raw;
        const col = p.label === 1 ? '#e97a2f' : '#4477c4';
        const px = sx(p.x), py = sy(p.y);
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, 2 * Math.PI);
        if (hollow) { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke(); }
        else { ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6; ctx.stroke(); }
      }
    }

    function drawNet() {
      const { ctx, w, h } = U.fitCanvas(netCanvas);
      ctx.clearRect(0, 0, w, h);
      const net = state.net;
      const layerSizes = net.sizes;
      const padX = 28, padY = 16;
      const colX = i => padX + (i / (layerSizes.length - 1)) * (w - 2 * padX);
      const nodePos = layerSizes.map((sz, li) => {
        const ys = [];
        for (let n = 0; n < sz; n++) {
          const y = layerSizes.length === 1 ? h / 2 : padY + (sz === 1 ? (h - 2 * padY) / 2 : (n / (sz - 1)) * (h - 2 * padY));
          ys.push({ x: colX(li), y });
        }
        return ys;
      });
      // edges weighted by |W|
      let maxW = 1e-6;
      for (const layer of net.layers) for (const row of layer.W) for (const wv of row) maxW = Math.max(maxW, Math.abs(wv));
      for (let l = 0; l < net.layers.length; l++) {
        const layer = net.layers[l];
        for (let o = 0; o < layer.outDim; o++) {
          for (let i = 0; i < layer.inDim; i++) {
            const wv = layer.W[o][i];
            const a = nodePos[l][i], b = nodePos[l + 1][o];
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = U.diverging((wv / maxW));
            ctx.globalAlpha = U.clamp(Math.abs(wv) / maxW, 0.06, 0.9);
            ctx.lineWidth = 0.5 + 3 * (Math.abs(wv) / maxW);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      // nodes
      for (let li = 0; li < nodePos.length; li++) {
        for (const p of nodePos[li]) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = li === 0 ? '#3a4a63' : (li === nodePos.length - 1 ? '#e97a2f' : '#2bb673');
          ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    function drawLoss() {
      const { ctx, w, h } = U.fitCanvas(lossCanvas);
      ctx.clearRect(0, 0, w, h);
      const hist = state.history;
      const pad = { l: 36, r: 8, t: 10, b: 18 };
      // axes box
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      ctx.strokeRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
      if (hist.length < 2) return;
      let maxL = 0;
      for (const p of hist) maxL = Math.max(maxL, p.trainLoss, p.testLoss);
      maxL = Math.max(maxL, 1e-3) * 1.05;
      const sx = U.makeScale(0, hist.length - 1, pad.l, w - pad.r);
      const sy = U.makeScale(0, maxL, h - pad.b, pad.t);
      const line = (key, color) => {
        ctx.beginPath();
        hist.forEach((p, i) => { const X = sx(i), Y = sy(p[key]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
      };
      line('trainLoss', '#2bb673');
      line('testLoss', '#e97a2f');
      // y labels
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(U.fmt(maxL, 2), 4, pad.t + 8);
      ctx.fillText('0', 4, h - pad.b);
      // legend
      ctx.fillStyle = '#2bb673'; ctx.fillRect(w - 110, pad.t + 2, 10, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('train', w - 96, pad.t + 6);
      ctx.fillStyle = '#e97a2f'; ctx.fillRect(w - 60, pad.t + 2, 10, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('test', w - 46, pad.t + 6);
    }

    /* ---------- init ---------- */
    regenData();
    rebuild();
    renderArch();
    window.addEventListener('resize', render);

    return {
      onShow() { render(); },
      onHide() { if (state.running) toggleRun(); },
    };
  }

  ML.Playground = { mount };
})();
