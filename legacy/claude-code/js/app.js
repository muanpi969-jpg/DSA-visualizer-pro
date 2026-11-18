/* =====================================================================
   app.js — top-level shell: tab navigation + lazy module mounting.
   ===================================================================== */
(() => {
  const el = ML.ui.el;

  const TABS = [
    { id: 'playground', label: 'Neural Network', icon: '◉', mount: ML.Playground.mount,
      blurb: 'Train a multilayer perceptron and watch its decision boundary form.' },
    { id: 'optimizers', label: 'Optimizers', icon: '⛰', mount: ML.Optimizers.mount,
      blurb: 'Race gradient-descent optimizers across a loss landscape.' },
    { id: 'kmeans', label: 'Clustering', icon: '⬡', mount: ML.KMeans.mount,
      blurb: 'Watch K-Means discover structure in unlabeled data.' },
    { id: 'regression', label: 'Regression', icon: '∿', mount: ML.Regression.mount,
      blurb: 'Fit polynomials and see the bias / variance tradeoff.' },
  ];

  function boot() {
    const app = document.getElementById('app');
    const nav = el('nav', { class: 'tab-nav' });
    const blurb = el('div', { class: 'tab-blurb' });
    const panels = el('div', { class: 'panels' });

    const instances = {};   // id -> { api, panel, mounted }
    const tabButtons = {};

    function activate(id) {
      for (const t of TABS) {
        const active = t.id === id;
        tabButtons[t.id].classList.toggle('active', active);
        const inst = instances[t.id];
        inst.panel.style.display = active ? '' : 'none';
        if (active) {
          if (!inst.mounted) { inst.api = t.mount(inst.panel); inst.mounted = true; }
          blurb.textContent = t.blurb;
          // allow layout to settle before first paint
          requestAnimationFrame(() => inst.api && inst.api.onShow && inst.api.onShow());
        } else if (inst.mounted && inst.api && inst.api.onHide) {
          inst.api.onHide();
        }
      }
      location.hash = id;
    }

    for (const t of TABS) {
      const btn = el('button', { class: 'tab-btn', onclick: () => activate(t.id) }, [
        el('span', { class: 'tab-icon' }, [t.icon]), t.label,
      ]);
      tabButtons[t.id] = btn; nav.appendChild(btn);
      const panel = el('div', { class: 'panel' }); panel.style.display = 'none';
      panels.appendChild(panel);
      instances[t.id] = { api: null, panel, mounted: false };
    }

    app.appendChild(el('header', { class: 'app-header' }, [
      el('div', { class: 'brand' }, [
        el('span', { class: 'brand-mark' }, ['∑']),
        el('div', {}, [
          el('div', { class: 'brand-title' }, ['ML Visual Lab']),
          el('div', { class: 'brand-sub' }, ['interactive machine-learning, from scratch in the browser']),
        ]),
      ]),
      nav,
    ]));
    app.appendChild(blurb);
    app.appendChild(panels);
    app.appendChild(el('footer', { class: 'app-footer' }, [
      'Every model here — backprop, Adam, k-means, ridge regression — is implemented in plain JavaScript with no libraries. ',
      el('span', { class: 'kbd' }, ['1']), '–', el('span', { class: 'kbd' }, ['4']), ' to switch tabs.',
    ]));

    // keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= TABS.length) activate(TABS[n - 1].id);
    });

    const initial = TABS.find(t => t.id === location.hash.slice(1)) ? location.hash.slice(1) : TABS[0].id;
    activate(initial);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
