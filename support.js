/* KuArte prototype runtime.
   Renders each screen's <template id="dc-tpl"> with its Component class:
   {{path}} holes, <sc-if value>, <sc-for list as>, data-for on table rows,
   and onClick="{{handler}}" events.
   setState() builds the next view and patches the live DOM in place, so
   focus, scroll position and CSS transitions survive every tap. */
(function () {
  'use strict';

  const M = ['Main', 'm02-search', 'm03-filters', 'm04-designs', 'm05-design-detail', 'm06-profile', 'm07-reviews', 'm08-book-service', 'm09-book-time', 'm10-guest', 'm11-deposit', 'm12-status', 'm13-checkin', 'm14-review', 'm15-chat', 'm16-signup', 'm17-setup', 'm18-rules', 'm19-camera', 'm20-availability', 'm21-request', 'm22-dashboard', 'm23-complete', 'm24-insights', 'm25-post-design', 'm26-offers', 'm27-design-requests', 'm28-make-offer'];
  const D = ['d01-home', 'd02-search', 'd03-filters', 'd04-designs', 'd05-design-detail', 'd06-profile', 'd07-reviews', 'd08-book-service', 'd09-book-time', 'd10-guest', 'd11-deposit', 'd12-status', 'd13-checkin', 'd14-review', 'd15-chat', 'd16-signup', 'd17-setup', 'd18-rules', 'd19-camera', 'd20-availability', 'd21-request', 'd22-dashboard', 'd23-complete', 'd24-insights', 'd25-post-design', 'd26-offers', 'd27-design-requests', 'd28-make-offer'];

  /* ---- one URL per screen, layout picked by width ----
     Under 900px the mobile design loads, from 900px up the desktop design, keeping the
     query string. ?view=m or ?view=d pins a layout for this tab (phone view on a laptop);
     ?view=auto unpins. Frames (the live demo phones) are left alone. */
  const BP = 900;
  const FILE = (location.pathname.split('/').pop() || '').replace('.dc.html', '');
  const IDX = M.indexOf(FILE) >= 0 ? M.indexOf(FILE) : D.indexOf(FILE);
  const IS_M = M.indexOf(FILE) >= 0;
  const FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  function getPin() { try { return sessionStorage.getItem('kuarte-view'); } catch (e) { return null; } }
  function setPin(v) { try { if (v) sessionStorage.setItem('kuarte-view', v); else sessionStorage.removeItem('kuarte-view'); } catch (e) { /* private mode: no pin */ } }
  (function readViewParam() {
    const q = new URLSearchParams(location.search); const v = q.get('view');
    if (!v) return;
    setPin(v === 'm' || v === 'd' ? v : null);
    q.delete('view'); const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  })();
  function wanted() { return getPin() || (window.innerWidth < BP ? 'm' : 'd'); }
  function switchIfNeeded() {
    if (IDX < 0 || FRAMED) return false;
    const want = wanted();
    if ((want === 'm') === IS_M) return false;
    location.replace('./' + (want === 'm' ? M[IDX] : D[IDX]) + '.dc.html' + location.search + location.hash);
    return true;
  }
  const SWITCHING = switchIfNeeded();
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(switchIfNeeded, 150); });

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
  const EVENTS = ['click', 'input', 'change'];

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

  /* ---- build a detached tree from the template ---- */
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
        if (typeof fn === 'function') { el.__h = el.__h || {}; el.__h[name.slice(2).toLowerCase()] = fn; }
        continue;
      }
      el.setAttribute(name, interp(a.value, scope));
    }
    const kids = node.localName === 'template' ? node.content.childNodes : node.childNodes;
    kids.forEach((c) => render(c, scope, el));
    out.appendChild(el);
  }

  /* ---- patch the live DOM toward the new tree ---- */
  function patchChildren(live, next) {
    const nextKids = Array.from(next.childNodes);
    for (let i = 0; i < nextKids.length; i++) {
      const n = nextKids[i];
      const o = live.childNodes[i];
      if (!o) { live.appendChild(n); continue; }
      if (o.nodeType !== n.nodeType || (o.nodeType === 1 && o.localName !== n.localName)) { live.replaceChild(n, o); continue; }
      if (o.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
      if (o.nodeType === 1) patchElement(o, n);
    }
    while (live.childNodes.length > nextKids.length) live.removeChild(live.lastChild);
  }
  function patchElement(o, n) {
    for (const a of Array.from(o.attributes)) if (!n.hasAttribute(a.name)) o.removeAttribute(a.name);
    for (const a of Array.from(n.attributes)) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
    o.__h = n.__h;
    patchChildren(o, n);
  }

  /* ---- demo store: one simulated booking shared by the customer and Nail Technician screens ----
     Lives in this browser only. Other tabs and frames re-render when it changes, so a
     request sent from the customer side shows up on the Nail Technician side straight away. */
  const PFX = 'kuarte.';
  function rd(k, d) { try { const v = localStorage.getItem(PFX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function wr(k, v) { try { if (v == null) localStorage.removeItem(PFX + k); else localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* storage blocked: screens fall back to sample data */ } }
  function rerender() { if (window.__dcRender) window.__dcRender(); }
  function clock() { return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }
  window.KU = {
    live: true,
    get: rd,
    set(k, v) { wr(k, v); rerender(); },
    draft(patch) { const d = Object.assign({}, rd('draft', {}), patch); wr('draft', d); return d; },
    booking() { return rd('booking', null); },
    create(b) {
      const n = 20492 + Math.floor(Math.random() * 400);
      wr('booking', Object.assign({ id: 'KA-' + n, created: clock(), log: [] }, b));
      rerender();
    },
    update(patch, note) {
      const b = rd('booking', null);
      if (!b) return;
      const log = (b.log || []).concat(note ? [{ t: clock(), note }] : []);
      wr('booking', Object.assign({}, b, patch, { log }));
      rerender();
    },
    clock,
    reset() {
      try { Object.keys(localStorage).filter((k) => k.indexOf(PFX) === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nothing stored */ }
    }
  };
  window.addEventListener('storage', (e) => { if (!e.key || e.key.indexOf(PFX) === 0) rerender(); });

  /* ---- prototype chrome ---- */
  function addPrototypeBar(isMobile) {
    if (IDX < 0) return;
    const pinned = getPin();
    const other = (isMobile ? D[IDX] : M[IDX]) + '.dc.html';
    const links = (pinned ? '<a href="./' + other + '?view=auto">Fit to window</a>'
        : (isMobile ? '' : '<a href="./' + other + '?view=m">Phone view</a>')) +
      '<a href="./demo.html">Live demo</a>' +
      '<a href="./index.html">All screens</a>' +
      '<a href="#" data-reset>Reset demo</a>';
    if (isMobile) {
      const pill = document.createElement('nav');
      pill.className = 'kp';
      pill.setAttribute('aria-label', 'Prototype');
      pill.innerHTML = '<span class="kp-tag">Prototype</span>' + links;
      document.body.appendChild(pill);
    } else {
      const bar = document.createElement('nav');
      bar.className = 'kbar';
      bar.setAttribute('aria-label', 'Prototype');
      bar.innerHTML = '<span><b>Prototype</b> · sample data, no real bookings or payments</span><span class="kbar-l">' + links + '</span>';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    const r = document.querySelector('[data-reset]');
    if (r) r.addEventListener('click', (e) => { e.preventDefault(); window.KU.reset(); location.reload(); });
  }

  /* Toasts: success moments arrive as ?toast=message; KU.toast() shows one on demand */
  function toast(msg, kind) {
    const old = document.querySelector('.ktoast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'ktoast' + (kind === 'soon' ? ' soon' : '');
    t.setAttribute('role', 'status');
    t.innerHTML = kind === 'soon'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span></span>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg><span></span>';
    t.querySelector('span').textContent = msg;
    const host = document.querySelector('.scr') || document.body;
    host.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
    let timer = setTimeout(hide, 3600);
    function hide() { t.classList.remove('in'); t.classList.add('out'); setTimeout(() => t.remove(), 200); }
    /* hovering or focusing pauses the timer so the message can be read */
    t.addEventListener('pointerenter', () => clearTimeout(timer));
    t.addEventListener('pointerleave', () => { timer = setTimeout(hide, 1500); });
    t.addEventListener('click', hide);
  }
  window.KU.toast = toast;
  function showToast() {
    const params = new URLSearchParams(location.search);
    const msg = params.get('toast');
    if (!msg) return;
    params.delete('toast');
    const rest = params.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    toast(msg);
  }
  /* anything outside the prototype says so instead of doing nothing */
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-soon]');
    if (!el) return;
    e.preventDefault();
    toast(el.getAttribute('data-msg') || ((el.getAttribute('data-soon') || 'This') + ' is coming soon.'), 'soon');
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (SWITCHING) return;
    const tpl = document.getElementById('dc-tpl');
    const root = document.getElementById('dc-root');
    if (!tpl || !root) return;
    const src = document.querySelector('script[type="text/x-dc"]');
    let Comp = DCLogic;
    if (src) Comp = new Function('DCLogic', src.textContent + '\n;return Component;')(DCLogic);
    const inst = new Comp({});

    /* one delegated listener per event type; handlers live on el.__h */
    EVENTS.forEach((type) => root.addEventListener(type, (e) => {
      for (let el = e.target; el && el !== root; el = el.parentNode) {
        if (el.__h && el.__h[type]) { el.__h[type](e); return; }
      }
    }));

    let first = true;
    window.__dcRender = function () {
      const frag = document.createDocumentFragment();
      const vals = inst.renderVals() || {};
      tpl.content.childNodes.forEach((c) => render(c, vals, frag));
      if (first) { root.replaceChildren(frag); first = false; }
      else { const box = document.createElement('div'); box.appendChild(frag); patchChildren(root, box); }
      /* selects follow their data-val (a value attribute alone doesn't move the selection) */
      root.querySelectorAll('select[data-val]').forEach((el) => { if (el.value !== el.getAttribute('data-val')) el.value = el.getAttribute('data-val'); });
    };
    window.__dcRender();
    const isMobile = !!root.querySelector('.scr');
    if (isMobile) document.body.classList.add('m');
    addPrototypeBar(isMobile);
    showToast();
  });
})();
