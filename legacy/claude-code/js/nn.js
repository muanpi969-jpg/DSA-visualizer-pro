/* =====================================================================
   nn.js — a small multilayer perceptron implemented from scratch.
   Supports configurable depth/width, several activations, L2 weight
   decay, and SGD / Momentum / RMSprop / Adam optimizers.
   Pure JS, no dependencies — this is the actual learning engine.
   ===================================================================== */
(() => {
  const U = ML.util;

  /* ---- activation functions and their derivatives (wrt pre-activation z) ---- */
  const ACT = {
    tanh:    { f: z => Math.tanh(z),                 d: (z, a) => 1 - a * a },
    relu:    { f: z => (z > 0 ? z : 0),              d: (z) => (z > 0 ? 1 : 0) },
    sigmoid: { f: z => 1 / (1 + Math.exp(-z)),       d: (z, a) => a * (1 - a) },
    linear:  { f: z => z,                            d: () => 1 },
  };

  class Layer {
    constructor(inDim, outDim, act) {
      this.inDim = inDim; this.outDim = outDim; this.act = act;
      // He/Xavier-ish init scaled by activation.
      const scale = (act === 'relu') ? Math.sqrt(2 / inDim) : Math.sqrt(1 / inDim);
      this.W = []; this.b = new Float64Array(outDim);
      for (let o = 0; o < outDim; o++) {
        const row = new Float64Array(inDim);
        for (let i = 0; i < inDim; i++) row[i] = U.randn(0, 1) * scale;
        this.W.push(row);
      }
      // optimizer state
      this.mW = this._zerosLike(); this.vW = this._zerosLike();
      this.mb = new Float64Array(outDim); this.vb = new Float64Array(outDim);
      // forward caches
      this.z = new Float64Array(outDim);
      this.a = new Float64Array(outDim);
      // grads
      this.dW = this._zerosLike(); this.db = new Float64Array(outDim);
      this.delta = new Float64Array(outDim);
    }
    _zerosLike() {
      const m = [];
      for (let o = 0; o < this.outDim; o++) m.push(new Float64Array(this.inDim));
      return m;
    }
    forward(input) {
      const fn = ACT[this.act].f;
      for (let o = 0; o < this.outDim; o++) {
        let s = this.b[o];
        const row = this.W[o];
        for (let i = 0; i < this.inDim; i++) s += row[i] * input[i];
        this.z[o] = s;
        this.a[o] = fn(s);
      }
      return this.a;
    }
  }

  class Network {
    /**
     * @param {number[]} sizes  e.g. [2, 8, 8, 1]
     * @param {object} opts { hiddenAct, task, lr, l2, optimizer }
     */
    constructor(sizes, opts = {}) {
      this.sizes = sizes.slice();
      this.task = opts.task || 'classification';      // 'classification' | 'regression'
      this.hiddenAct = opts.hiddenAct || 'tanh';
      this.outAct = this.task === 'classification' ? 'sigmoid' : 'linear';
      this.lr = opts.lr ?? 0.03;
      this.l2 = opts.l2 ?? 0;
      this.optimizer = opts.optimizer || 'adam';
      this.t = 0;            // adam timestep
      this.epoch = 0;
      this.layers = [];
      for (let l = 0; l < sizes.length - 1; l++) {
        const isOut = l === sizes.length - 2;
        this.layers.push(new Layer(sizes[l], sizes[l + 1], isOut ? this.outAct : this.hiddenAct));
      }
    }

    forward(x) {
      let a = x;
      for (const layer of this.layers) a = layer.forward(a);
      return a; // Float64Array length = outDim
    }

    // Single-output prediction convenience.
    predict1(x) { return this.forward(x)[0]; }

    /**
     * Run one mini-batch update. Each sample: {input:[..], target:[..]}.
     * Returns the mean batch loss.
     */
    trainBatch(batch) {
      const L = this.layers.length;
      // zero grads
      for (const layer of this.layers) {
        for (let o = 0; o < layer.outDim; o++) { layer.db[o] = 0; layer.dW[o].fill(0); }
      }
      let totalLoss = 0;

      for (const sample of batch) {
        const out = this.forward(sample.input);
        const y = sample.target;
        const outLayer = this.layers[L - 1];

        // output delta + loss
        for (let o = 0; o < outLayer.outDim; o++) {
          const a = out[o];
          if (this.task === 'classification') {
            // sigmoid + binary cross entropy → delta = a - y
            outLayer.delta[o] = a - y[o];
            const eps = 1e-7;
            totalLoss += -(y[o] * Math.log(a + eps) + (1 - y[o]) * Math.log(1 - a + eps));
          } else {
            // linear + MSE → dL/dz = (a - y)
            outLayer.delta[o] = a - y[o];
            totalLoss += 0.5 * (a - y[o]) * (a - y[o]);
          }
        }

        // backprop through hidden layers
        for (let l = L - 2; l >= 0; l--) {
          const layer = this.layers[l];
          const next = this.layers[l + 1];
          const dfn = ACT[layer.act].d;
          for (let o = 0; o < layer.outDim; o++) {
            let acc = 0;
            for (let k = 0; k < next.outDim; k++) acc += next.W[k][o] * next.delta[k];
            layer.delta[o] = acc * dfn(layer.z[o], layer.a[o]);
          }
        }

        // accumulate gradients (input to layer l is previous layer's activation)
        for (let l = 0; l < L; l++) {
          const layer = this.layers[l];
          const prevA = l === 0 ? sample.input : this.layers[l - 1].a;
          for (let o = 0; o < layer.outDim; o++) {
            const d = layer.delta[o];
            layer.db[o] += d;
            const dW = layer.dW[o];
            for (let i = 0; i < layer.inDim; i++) dW[i] += d * prevA[i];
          }
        }
      }

      // apply update (mean over batch) with chosen optimizer
      const m = batch.length;
      this.t++;
      for (const layer of this.layers) {
        for (let o = 0; o < layer.outDim; o++) {
          const row = layer.W[o], dW = layer.dW[o];
          for (let i = 0; i < layer.inDim; i++) {
            let g = dW[i] / m + this.l2 * row[i];   // L2 decay
            row[i] -= this._step(g, layer.mW[o], layer.vW[o], i);
          }
          let gb = layer.db[o] / m;
          layer.b[o] -= this._stepScalar(gb, layer.mb, layer.vb, o);
        }
      }
      this.epoch++;
      return totalLoss / m;
    }

    _step(g, mArr, vArr, i) {
      const lr = this.lr;
      switch (this.optimizer) {
        case 'sgd': return lr * g;
        case 'momentum': {
          mArr[i] = 0.9 * mArr[i] + g; return lr * mArr[i];
        }
        case 'rmsprop': {
          vArr[i] = 0.9 * vArr[i] + 0.1 * g * g;
          return lr * g / (Math.sqrt(vArr[i]) + 1e-8);
        }
        case 'adam':
        default: {
          const b1 = 0.9, b2 = 0.999;
          mArr[i] = b1 * mArr[i] + (1 - b1) * g;
          vArr[i] = b2 * vArr[i] + (1 - b2) * g * g;
          const mh = mArr[i] / (1 - Math.pow(b1, this.t));
          const vh = vArr[i] / (1 - Math.pow(b2, this.t));
          return lr * mh / (Math.sqrt(vh) + 1e-8);
        }
      }
    }
    _stepScalar(g, mArr, vArr, o) { return this._step(g, mArr, vArr, o); }

    // Mean loss over a dataset (no grad).
    evalLoss(samples) {
      let total = 0;
      for (const s of samples) {
        const out = this.forward(s.input);
        if (this.task === 'classification') {
          const a = out[0], y = s.target[0], eps = 1e-7;
          total += -(y * Math.log(a + eps) + (1 - y) * Math.log(1 - a + eps));
        } else {
          const a = out[0], y = s.target[0];
          total += 0.5 * (a - y) * (a - y);
        }
      }
      return total / samples.length;
    }

    // Classification accuracy (threshold 0.5).
    accuracy(samples) {
      if (this.task !== 'classification') return NaN;
      let correct = 0;
      for (const s of samples) {
        const p = this.forward(s.input)[0] >= 0.5 ? 1 : 0;
        if (p === s.target[0]) correct++;
      }
      return correct / samples.length;
    }
  }

  ML.NN = { Network, Layer, ACT };
})();
