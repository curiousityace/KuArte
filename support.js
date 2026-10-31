/* KuArte prototype runtime.
   Renders each screen's <template id="dc-tpl"> with its Component class:
   {{path}} holes, <sc-if value>, <sc-for list as>, data-for on table rows,
   and onClick="{{handler}}" events. setState() re-renders the screen. */
(function () {
  'use strict';

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) {
      const next = typeof patch === 'function' ? patch(this.state) : patch;
      this.state = Object.assign({}, this.state, next);
      if (window.__dcRender) window.__dcRender();
    }
    forceUpdate() { if (window.__dcRender) window.__dcRender(); }
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

  function lookup(scope, path) {
    path = (path || '').trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  function wholeHole(str) {
    const m = (str || '').match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
    return m ? m[1] : null;
  }
  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => { const v = lookup(scope, p); return v == null ? '' : String(v); });
  }
  function child(scope, name, item, i) {
    const s = Object.create(scope); s[name] = item; s.$index = i; return s;
  }

  function render(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if') {
      if (lookup(scope, wholeHole(node.getAttribute('value')))) node.childNodes.forEach((c) => render(c, scope, out));
      return;
    }
    if (tag === 'sc-for') {
      const list = lookup(scope, wholeHole(node.getAttribute('list'))) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((it, i) => { const s = child(scope, as, it, i); node.childNodes.forEach((c) => render(c, s, out)); });
      return;
    }
    if (node.hasAttribute('data-for')) {
      const list = lookup(scope, wholeHole(node.getAttribute('data-for'))) || [];
      const as = node.getAttribute('data-as') || 'item';
      list.forEach((it, i) => element(node, child(scope, as, it, i), out));
      return;
    }
    element(node, scope, out);
  }

  function element(node, scope, out) {
    const el = document.createElementNS(node.namespaceURI, node.localName);
    for (const a of Array.from(node.attributes)) {
      const name = a.name;
      if (name.startsWith('hint-') || name === 'data-for' || name === 'data-as') continue;
      if (/^on[a-z]+$/i.test(name)) {
        const fn = lookup(scope, wholeHole(a.value));
        if (typeof fn === 'function') el.addEventListener(name.slice(2).toLowerCase(), (e) => fn(e));
        continue;
      }
      el.setAttribute(name, interp(a.value, scope));
    }
    const kids = node.localName === 'template' ? node.content.childNodes : node.childNodes;
    kids.forEach((c) => render(c, scope, el));
    out.appendChild(el);
  }

  /* Screen pairs for the mobile / desktop switch */
  const M = ['Main', 'm02-search', 'm03-filters', 'm04-designs', 'm05-design-detail', 'm06-profile', 'm07-reviews', 'm08-book-service', 'm09-book-time', 'm10-guest', 'm11-deposit', 'm12-status', 'm13-checkin', 'm14-review', 'm15-chat', 'm16-signup', 'm17-setup', 'm18-rules', 'm19-camera', 'm20-availability', 'm21-request', 'm22-dashboard', 'm23-complete', 'm24-insights'];
  const D = ['d01-home', 'd02-search', 'd03-filters', 'd04-designs', 'd05-design-detail', 'd06-profile', 'd07-reviews', 'd08-book-service', 'd09-book-time', 'd10-guest', 'd11-deposit', 'd12-status', 'd13-checkin', 'd14-review', 'd15-chat', 'd16-signup', 'd17-setup', 'd18-rules', 'd19-camera', 'd20-availability', 'd21-request', 'd22-dashboard', 'd23-complete', 'd24-insights'];

  function addPill() {
    const file = (location.pathname.split('/').pop() || '').replace('.dc.html', '');
    let i = M.indexOf(file), mobile = true;
    if (i < 0) { i = D.indexOf(file); mobile = false; }
    if (i < 0) return;
    const other = (mobile ? D[i] : M[i]) + '.dc.html';
    const pill = document.createElement('div');
    pill.className = 'kp' + (mobile ? ' kp-m' : '');
    pill.innerHTML = '<span class="kp-tag">Prototype</span>' +
      '<a href="./' + other + '">' + (mobile ? 'Desktop version' : 'Mobile version') + '</a>' +
      '<a href="./index.html">All screens</a>';
    document.body.appendChild(pill);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const tpl = document.getElementById('dc-tpl');
    const root = document.getElementById('dc-root');
    if (!tpl || !root) return;
    const src = document.querySelector('script[type="text/x-dc"]');
    let Comp = DCLogic;
    if (src) Comp = new Function('DCLogic', src.textContent + '\n;return Component;')(DCLogic);
    const inst = new Comp({});

    window.__dcRender = function () {
      const keep = Array.from(root.querySelectorAll('.scroll, .tbox')).map((n) => n.scrollTop);
      const y = window.scrollY;
      const frag = document.createDocumentFragment();
      const vals = inst.renderVals() || {};
      tpl.content.childNodes.forEach((c) => render(c, vals, frag));
      root.replaceChildren(frag);
      Array.from(root.querySelectorAll('.scroll, .tbox')).forEach((n, i) => { if (keep[i]) n.scrollTop = keep[i]; });
      window.scrollTo(0, y);
    };
    window.__dcRender();
    if (root.querySelector('.scr')) document.body.classList.add('m');
    addPill();
  });
})();
