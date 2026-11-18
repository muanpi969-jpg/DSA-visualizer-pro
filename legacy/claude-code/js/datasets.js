/* =====================================================================
   datasets.js — synthetic 2D datasets for classification & clustering
   Each generator returns { points: [{x, y, label}], classes }
   Coordinates live in [-1, 1] x [-1, 1].
   ===================================================================== */
(() => {
  const U = ML.util;

  // ---- binary classification datasets (labels 0 / 1) ----

  function spiral(n = 240, noise = 0.18) {
    const pts = [];
    const per = Math.floor(n / 2);
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < per; i++) {
        const r = i / per;
        const t = ((c === 0 ? 0 : Math.PI) + (i / per) * 4 * Math.PI) + U.randn(0, noise);
        pts.push({ x: r * Math.sin(t), y: r * Math.cos(t), label: c });
      }
    }
    return { points: U.shuffle(pts), classes: 2 };
  }

  function circles(n = 240, noise = 0.12) {
    const pts = [];
    const per = Math.floor(n / 2);
    // inner (label 1) and outer ring (label 0)
    for (let i = 0; i < per; i++) {
      const t = U.randRange(0, 2 * Math.PI);
      const r = U.randRange(0, 0.4);
      pts.push({ x: r * Math.cos(t) + U.randn(0, noise * 0.5), y: r * Math.sin(t) + U.randn(0, noise * 0.5), label: 1 });
    }
    for (let i = 0; i < per; i++) {
      const t = U.randRange(0, 2 * Math.PI);
      const r = U.randRange(0.7, 0.95);
      pts.push({ x: r * Math.cos(t) + U.randn(0, noise * 0.5), y: r * Math.sin(t) + U.randn(0, noise * 0.5), label: 0 });
    }
    return { points: U.shuffle(pts), classes: 2 };
  }

  function xor(n = 240, noise = 0.12) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      let x = U.randRange(-1, 1), y = U.randRange(-1, 1);
      const label = (x * y >= 0) ? 1 : 0;
      x += U.randn(0, noise); y += U.randn(0, noise);
      pts.push({ x, y, label });
    }
    return { points: pts, classes: 2 };
  }

  function moons(n = 240, noise = 0.1) {
    const pts = [];
    const per = Math.floor(n / 2);
    for (let i = 0; i < per; i++) {
      const t = (i / per) * Math.PI;
      pts.push({ x: Math.cos(t) - 0.5 + U.randn(0, noise), y: Math.sin(t) - 0.2 + U.randn(0, noise), label: 0 });
    }
    for (let i = 0; i < per; i++) {
      const t = (i / per) * Math.PI;
      pts.push({ x: 1 - Math.cos(t) - 0.5 + U.randn(0, noise), y: 1 - Math.sin(t) - 0.5 + U.randn(0, noise), label: 1 });
    }
    return { points: U.shuffle(pts), classes: 2 };
  }

  function gaussians(n = 240, noise = 0.12) {
    const pts = [];
    const per = Math.floor(n / 2);
    for (let i = 0; i < per; i++)
      pts.push({ x: U.randn(-0.45, noise + 0.12), y: U.randn(-0.45, noise + 0.12), label: 0 });
    for (let i = 0; i < per; i++)
      pts.push({ x: U.randn(0.45, noise + 0.12), y: U.randn(0.45, noise + 0.12), label: 1 });
    return { points: U.shuffle(pts), classes: 2 };
  }

  // ---- unlabeled blobs for clustering ----
  function blobs(n = 300, k = 3, spread = 0.14) {
    const centers = [];
    for (let i = 0; i < k; i++) {
      const a = (i / k) * 2 * Math.PI + 0.4;
      centers.push({ x: 0.6 * Math.cos(a), y: 0.6 * Math.sin(a) });
    }
    const pts = [];
    for (let i = 0; i < n; i++) {
      const c = centers[i % k];
      pts.push({ x: c.x + U.randn(0, spread), y: c.y + U.randn(0, spread), label: -1 });
    }
    return { points: U.shuffle(pts), classes: k, trueCenters: centers };
  }

  ML.datasets = {
    classification: { spiral, circles, xor, moons, gaussians },
    blobs,
    // train/test split helper
    split(points, frac = 0.5) {
      const shuffled = U.shuffle(points.slice());
      const cut = Math.floor(points.length * frac);
      return { train: shuffled.slice(0, cut), test: shuffled.slice(cut) };
    }
  };
})();
