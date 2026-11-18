/* =====================================================================
   ui.js — tiny declarative helpers for building control panels.
   ===================================================================== */
(() => {
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  // Labeled slider that reports live value. opts: {label,min,max,step,value,fmt,onInput}
  function slider(opts) {
    const valSpan = el('span', { class: 'ctrl-val' });
    const fmt = opts.fmt || (v => v);
    const input = el('input', {
      type: 'range', min: opts.min, max: opts.max, step: opts.step, value: opts.value,
      oninput: e => { const v = parseFloat(e.target.value); valSpan.textContent = fmt(v); opts.onInput(v); }
    });
    valSpan.textContent = fmt(opts.value);
    const wrap = el('label', { class: 'ctrl' }, [
      el('span', { class: 'ctrl-label' }, [opts.label, valSpan]),
      input,
    ]);
    wrap.setValue = v => { input.value = v; valSpan.textContent = fmt(v); };
    return wrap;
  }

  // Select dropdown. opts: {label,options:[{value,label}],value,onChange}
  function select(opts) {
    const sel = el('select', {
      onchange: e => opts.onChange(e.target.value)
    }, opts.options.map(o => el('option', { value: o.value, ...(o.value === opts.value ? { selected: '' } : {}) }, [o.label])));
    return el('label', { class: 'ctrl' }, [
      el('span', { class: 'ctrl-label' }, [opts.label]),
      sel,
    ]);
  }

  function button(label, onClick, cls = '') {
    return el('button', { class: 'btn ' + cls, onclick: onClick }, [label]);
  }

  // Toggle group of buttons; returns {node, set(value)}
  function segmented(opts) {
    let current = opts.value;
    const btns = {};
    const node = el('div', { class: 'segmented' });
    function render() {
      for (const o of opts.options) btns[o.value].className = 'seg' + (o.value === current ? ' active' : '');
    }
    for (const o of opts.options) {
      const b = el('button', { class: 'seg', onclick: () => { current = o.value; render(); opts.onChange(o.value); } }, [o.label]);
      btns[o.value] = b; node.appendChild(b);
    }
    render();
    return { node, set(v) { current = v; render(); } };
  }

  function stat(label) {
    const val = el('span', { class: 'stat-val' }, ['–']);
    const node = el('div', { class: 'stat' }, [el('span', { class: 'stat-label' }, [label]), val]);
    return { node, set: v => { val.textContent = v; } };
  }

  ML.ui = { el, slider, select, button, segmented, stat };
})();
