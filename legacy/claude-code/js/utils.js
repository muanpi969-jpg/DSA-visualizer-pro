/* =====================================================================
   utils.js — shared math, color, and canvas helpers
   Loaded as a classic script; everything hangs off the global `ML`.
   ===================================================================== */
const ML = (window.ML = window.ML || {});

ML.util = (() => {
  /* ---- random ---- */
  let _seed = 1234567;
  function seed(s) { _seed = s >>> 0; }
  // Mulberry32 — deterministic PRNG so visualizations are reproducible.
  function rand() {
    _seed |= 0; _seed = (_seed + 0x6d2b79f5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randRange(a, b) { return a + (b - a) * rand(); }
  // Box–Muller gaussian.
  function randn(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---- numeric ---- */
  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  function mean(a) { let s = 0; for (const x of a) s += x; return s / a.length; }

  /* ---- color ---- */
  // Diverging colormap: blue (negative) → light → orange (positive). t in [-1,1].
  function diverging(t) {
    t = clamp(t, -1, 1);
    const neg = [68, 119, 196], mid = [245, 245, 245], pos = [233, 122, 47];
    let c;
    if (t < 0) { const k = t + 1; c = mix(neg, mid, k); }
    else { c = mix(mid, pos, t); }
    return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
  }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  // Categorical palette for classes / clusters.
  const palette = [
    '#e97a2f', '#4477c4', '#2bb673', '#c0392b', '#8e44ad',
    '#16a085', '#f1c40f', '#e84393', '#2980b9', '#27ae60'
  ];
  // Perceptual-ish viridis-like ramp for loss surfaces. t in [0,1].
  function viridis(t) {
    t = clamp(t, 0, 1);
    const stops = [
      [68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]
    ];
    const x = t * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    const c = mix(stops[i], stops[i + 1], f);
    return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
  }

  /* ---- canvas ---- */
  // Scale a canvas for crisp rendering on HiDPI displays.
  function fitCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  // Map a domain range to canvas pixels and back.
  function makeScale(domainMin, domainMax, rangeMin, rangeMax) {
    const ds = domainMax - domainMin, rs = rangeMax - rangeMin;
    const fwd = v => rangeMin + ((v - domainMin) / ds) * rs;
    fwd.invert = p => domainMin + ((p - rangeMin) / rs) * ds;
    return fwd;
  }

  function fmt(x, d = 3) {
    if (!isFinite(x)) return '–';
    if (Math.abs(x) >= 1000 || (Math.abs(x) < 0.001 && x !== 0)) return x.toExponential(2);
    return x.toFixed(d);
  }

  return {
    seed, rand, randRange, randn, shuffle,
    clamp, lerp, mean,
    diverging, viridis, palette,
    fitCanvas, makeScale, fmt,
  };
})();
