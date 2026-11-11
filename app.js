/* KuArte responsive pages: toasts, coming soon, demo reset, and per-page logic.
   Data comes from app-data.js (window.KD). */
(function () {
  'use strict';
  var KD = window.KD || { techs: [], pages: {} };
  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- toasts ---------- */
  function toast(msg, kind) {
    var old = document.querySelector('.ktoast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'ktoast' + (kind === 'ok' ? ' ok' : '');
    t.setAttribute('role', 'status');
    t.innerHTML = kind === 'ok'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg><span></span>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span></span>';
    t.querySelector('span').textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('in'); }); });
    var timer = setTimeout(hide, kind === 'ok' ? 3600 : 3000);
    function hide() { t.classList.remove('in'); t.classList.add('out'); setTimeout(function () { t.remove(); }, 180); }
    t.addEventListener('pointerenter', function () { clearTimeout(timer); });
    t.addEventListener('pointerleave', function () { timer = setTimeout(hide, 1200); });
    t.addEventListener('click', hide);
  }
  window.kuToast = toast;

  /* success messages arrive as ?toast=… from the previous page */
  var tmsg = params.get('toast');
  if (tmsg) {
    params.delete('toast');
    var rest = params.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    setTimeout(function () { toast(tmsg, 'ok'); }, 120);
  }

  document.addEventListener('click', function (e) {
    var soon = e.target.closest('[data-soon]');
    if (soon) {
      e.preventDefault();
      toast(soon.getAttribute('data-msg') || ((soon.getAttribute('data-soon') || 'This') + ' is coming soon.'));
      return;
    }
    var r = e.target.closest('[data-reset]');
    if (r) {
      e.preventDefault();
      try { Object.keys(localStorage).filter(function (k) { return k.indexOf('kuarte.') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (err) { /* storage blocked */ }
      toast('Demo reset. Every screen is back to its starting state.', 'ok');
    }
  });

  /* any save button with .fav or .fav-big */
  document.querySelectorAll('.fav, .fav-big').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var on = !b.classList.contains('on');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      toast(on ? 'Saved to your favourites' : 'Removed from favourites');
    });
  });

  function pressGroup(sel, attr, value) {
    document.querySelectorAll(sel).forEach(function (o) {
      var on = o.getAttribute(attr) === value;
      o.classList.toggle('on', on);
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- designs: filter by style ---------- */
  var fchips = document.querySelectorAll('[data-f]');
  if (fchips.length) {
    var tiles = document.querySelectorAll('.tile');
    var empty = document.getElementById('empty');
    var pick = function (f) {
      var n = 0;
      pressGroup('[data-f]', 'data-f', f);
      tiles.forEach(function (t) { var show = f === 'All' || t.getAttribute('data-tag').split(',').indexOf(f) >= 0; t.hidden = !show; if (show) n++; });
      if (empty) empty.hidden = n > 0;
    };
    fchips.forEach(function (c) { c.addEventListener('click', function () { pick(c.getAttribute('data-f')); }); });
    var start = params.get('f');
    pick(start && document.querySelector('[data-f="' + start.replace(/"/g, '') + '"]') ? start : 'All');
  }

  /* ---------- shared filter rules (search + filters pages) ---------- */
  var SORTS = {
    near: { label: 'distance', fn: function (a, b) { return a.km - b.km; } },
    top: { label: 'rating', fn: function (a, b) { return b.rating - a.rating || b.count - a.count; } },
    low: { label: 'price', fn: function (a, b) { return a.price - b.price; } },
    soon: { label: 'soonest available', fn: function (a, b) { return a.soon - b.soon; } }
  };
  function readFilters(p) {
    return {
      sort: SORTS[p.get('sort')] ? p.get('sort') : 'near',
      where: p.get('where') === 'walkin' || p.get('where') === 'home' ? p.get('where') : 'any',
      max: Math.max(200, Math.min(800, parseInt(p.get('max'), 10) || 800)),
      today: p.get('today') === '1',
      rated: p.get('rated') === '1'
    };
  }
  function applyFilters(f) {
    return KD.techs.filter(function (t) {
      if (f.today && !t.today) return false;
      if (f.where === 'home' && !t.home) return false;
      if (f.where === 'walkin' && !t.walkin) return false;
      if (t.price > f.max) return false;
      if (f.rated && !(t.rating >= 4.5 && t.count >= 10)) return false;
      return true;
    }).sort(SORTS[f.sort].fn);
  }
  function filterQuery(f, q) {
    var p = new URLSearchParams();
    if (q) p.set('q', q);
    if (f.sort !== 'near') p.set('sort', f.sort);
    if (f.where !== 'any') p.set('where', f.where);
    if (f.max < 800) p.set('max', f.max);
    if (f.today) p.set('today', '1');
    if (f.rated) p.set('rated', '1');
    var s = p.toString();
    return s ? '?' + s : '';
  }
  function profileLink(t) {
    if (t.profile && KD.pages.profile) return 'href="' + KD.pages.profile + '"';
    return 'href="#" data-soon="Nail Technician profiles" data-msg="' + (KD.pages.profile ? 'This prototype shows Viper Cullen\'s profile. Other profiles are coming soon.' : 'Nail Technician profiles are coming soon.') + '"';
  }

  /* ---------- search: list, pins and sorting share one selection ---------- */
  var list = document.getElementById('list');
  if (list) {
    var f = readFilters(params);
    var q = params.get('q');
    var input = document.querySelector('.mtop input');
    if (q && input) input.value = q;
    var STAR = '<svg class="i xs f" viewBox="0 0 24 24" style="color: #C49A45" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
    var sel = 'viper';
    var pins = document.getElementById('pins');
    var count = document.getElementById('count');
    var fon = document.getElementById('fon');
    var fbtn = document.getElementById('fbtn');

    var render = function () {
      var rows = applyFilters(f);
      if (rows.length && !rows.some(function (t) { return t.id === sel; })) sel = rows[0].id;
      count.innerHTML = '<b class="strong">' + rows.length + ' verified Nail Technician' + (rows.length === 1 ? '' : 's') + '</b> within 15 km · sorted by ' + SORTS[f.sort].label;
      var tags = [];
      if (f.where === 'home') tags.push('Home service');
      if (f.where === 'walkin') tags.push('Walk-in');
      if (f.max < 800) tags.push('Up to ₱' + f.max);
      if (f.rated) tags.push('4.5 and up');
      if (fon) {
        fon.hidden = !tags.length;
        fon.innerHTML = '<span class="cap">Filters:</span>' + tags.map(function (x) { return '<span class="badge">' + x + '</span>'; }).join('') + ' <a class="lnk" href="' + location.pathname.split('/').pop() + (q ? '?q=' + encodeURIComponent(q) : '') + '">Clear</a>';
      }
      if (fbtn && KD.pages.filters) fbtn.setAttribute('href', KD.pages.filters + filterQuery(f, q));
      pressGroup('[data-sort]', 'data-sort', f.sort);
      var td = document.querySelector('[data-today]');
      if (td) { td.classList.toggle('on', f.today); td.setAttribute('aria-pressed', f.today ? 'true' : 'false'); }

      list.innerHTML = rows.map(function (t) {
        return '<article class="card lc' + (t.id === sel ? ' on' : '') + '" data-id="' + t.id + '" tabindex="0" aria-label="' + t.name + '">' +
          '<div class="ph"><img src="' + t.img + '" alt="Work by ' + t.name + '" loading="lazy"><span class="ver"><svg class="i xs" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>Verified</span></div>' +
          '<div class="tb"><div class="row between" style="align-items: flex-start"><span class="ttl">' + t.name + '</span><span class="sm only-l" style="white-space: nowrap">from <b class="price">₱' + t.price + '</b></span></div>' +
          '<span class="row cap" style="gap: 4px">' + STAR + '<b class="strong">' + t.rating.toFixed(1) + '</b> (' + t.count + ') · ' + t.km + ' km · ' + t.area + '</span>' +
          '<span class="cap">' + t.modes + ' · Next open: <b class="strong"' + (t.today ? ' style="color: #2F7A4E"' : '') + '>' + t.next + '</b></span>' +
          '<span class="sm only-s">from <b class="price">₱' + t.price + '</b></span>' +
          '<div class="row go" style="gap: 10px"><span class="badge ' + t.bcls + '">' + t.badge + '</span><a class="lnk" ' + profileLink(t) + '>View profile</a></div></div></article>';
      }).join('');
      if (!rows.length) list.innerHTML = '<div class="card empty"><p class="ttl">No Nail Technicians match these filters</p><p class="sm">Try a higher price or turn off a filter.</p></div>';
      pins.innerHTML = rows.map(function (t) {
        var on = t.id === sel;
        return '<button class="pin' + (on ? ' on' : '') + '" type="button" data-id="' + t.id + '" style="left: ' + t.x + '%; top: ' + t.y + '%" aria-label="' + t.name + ', from ₱' + t.price + '" aria-pressed="' + on + '">' + (on ? STAR.replace('style="color: #C49A45" ', '') : '') + '₱' + t.price + (on ? ' · ' + t.short : '') + '</button>';
      }).join('');
    };
    var select = function (id, from) {
      sel = id; render();
      var target = from === 'pin' ? list.querySelector('[data-id="' + id + '"]') : null;
      if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    };
    pins.addEventListener('click', function (e) { var b = e.target.closest('.pin'); if (b) select(b.getAttribute('data-id'), 'pin'); });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) return; var c = e.target.closest('.lc'); if (c) select(c.getAttribute('data-id'), 'list'); });
    list.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('lc')) { e.preventDefault(); select(e.target.getAttribute('data-id'), 'list'); } });
    document.querySelectorAll('[data-sort]').forEach(function (c) { c.addEventListener('click', function () { f.sort = c.getAttribute('data-sort'); render(); }); });
    var tdb = document.querySelector('[data-today]');
    if (tdb) tdb.addEventListener('click', function () { f.today = !f.today; render(); });
    render();
  }

  /* ---------- filters page ---------- */
  var fform = document.getElementById('fform');
  if (fform) {
    var ff = readFilters(params);
    var fq = params.get('q');
    var show = document.getElementById('fshow');
    var maxIn = document.getElementById('fmax');
    var maxOut = document.getElementById('fmaxv');
    var sync = function () {
      pressGroup('[data-fsort]', 'data-fsort', ff.sort);
      pressGroup('[data-where]', 'data-where', ff.where);
      document.querySelectorAll('[data-sw]').forEach(function (b) { var on = !!ff[b.getAttribute('data-sw')]; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      maxIn.value = ff.max;
      maxOut.textContent = ff.max >= 800 ? 'Any price' : 'Up to ₱' + ff.max;
      var n = applyFilters(ff).length;
      show.textContent = n ? 'Show ' + n + ' Nail Technician' + (n === 1 ? '' : 's') : 'No Nail Technicians match';
      show.setAttribute('href', KD.pages.search + filterQuery(ff, fq));
      show.classList.toggle('bg', !n); show.classList.toggle('bp', !!n);
    };
    document.querySelectorAll('[data-fsort]').forEach(function (b) { b.addEventListener('click', function () { ff.sort = b.getAttribute('data-fsort'); sync(); }); });
    document.querySelectorAll('[data-where]').forEach(function (b) { b.addEventListener('click', function () { ff.where = b.getAttribute('data-where'); sync(); }); });
    document.querySelectorAll('[data-sw]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-sw'); ff[k] = !ff[k]; sync(); }); });
    document.querySelectorAll('[data-svc]').forEach(function (b) { b.addEventListener('click', function () { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); });
    maxIn.addEventListener('input', function () { ff.max = parseInt(maxIn.value, 10); sync(); });
    document.getElementById('fclear').addEventListener('click', function () {
      ff = { sort: 'near', where: 'any', max: 800, today: false, rated: false };
      document.querySelectorAll('[data-svc]').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
      sync();
    });
    fform.addEventListener('submit', function (e) { e.preventDefault(); location.href = show.getAttribute('href'); });
    sync();
  }

  /* ---------- tabs (profile) ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var btns = group.querySelectorAll('[data-tab]');
    var go = function (name) {
      btns.forEach(function (b) { var on = b.getAttribute('data-tab') === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-tab')); }); });
    go(params.get('tab') && group.querySelector('[data-tab="' + params.get('tab') + '"]') ? params.get('tab') : btns[0].getAttribute('data-tab'));
  });

  /* ---------- time slot pick (profile booking card) ---------- */
  document.querySelectorAll('[data-slots]').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.slot'); if (!b) return;
      g.querySelectorAll('.slot').forEach(function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var note = document.getElementById('slotnote');
      if (note) note.textContent = 'Today, ' + b.textContent + ' · you can change it on the next step';
    });
  });

  /* ---------- reviews filter ---------- */
  var mine = (function () { try { return JSON.parse(localStorage.getItem('kuarte.review') || 'null'); } catch (e) { return null; } })();
  var rlist = document.getElementById('rlist');
  if (mine && rlist) {
    var M = { 0: ['Matched', 'ok', 'matched'], 1: ['Partly', 'wait', 'partly'], 2: ['No', 'bad', 'partly'] }[mine.match || 0];
    var st = ''; for (var k = 1; k <= 5; k++) st += '<svg class="i xs f' + (k <= mine.stars ? '' : ' off') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
    var art = document.createElement('article');
    art.className = 'card rcard';
    art.setAttribute('data-rv', M[2] + ',photos');
    art.style.boxShadow = 'inset 0 0 0 1.5px #5E1720';
    art.innerHTML = '<div class="row" style="gap: 10px"><span class="av s">MS</span><div class="col grow" style="gap: 2px"><span class="sm strong">Maria S. <span class="badge" style="margin-left: 6px">Just now · your review</span></span><span class="cap">Gel extensions · Nov 4</span></div><span class="pill ' + M[1] + '">' + M[0] + '</span></div>' +
      '<span class="stars" aria-label="' + mine.stars + ' out of 5 stars">' + st + '</span>' +
      '<div class="refres"><div class="col" style="gap: 4px"><div class="ph"><img src="assets/photos/burgundy-gloss.jpg" alt="Reference photo"></div><span class="lbl">Reference</span></div><div class="col" style="gap: 4px"><div class="ph"><img src="assets/photos/burgundy-gloss.jpg" alt="Result photo"><span class="ver">Verified</span></div><span class="lbl">Result</span></div></div>' +
      '<p class="sm" style="color: #22161A"></p>';
    art.querySelector('p').textContent = mine.text || '';
    rlist.insertBefore(art, rlist.firstChild);
    var cnt = document.getElementById('rcount'); if (cnt) cnt.textContent = 'Showing 6 of 39 reviews (sample), including yours.';
  }
  var rchips = document.querySelectorAll('[data-rf]');
  if (rchips.length) {
    var cards = document.querySelectorAll('[data-rv]');
    var rempty = document.getElementById('rempty');
    var rpick = function (v) {
      var n = 0;
      pressGroup('[data-rf]', 'data-rf', v);
      cards.forEach(function (c) { var tags = c.getAttribute('data-rv').split(','); var show = v === 'all' || tags.indexOf(v) >= 0; c.hidden = !show; if (show) n++; });
      if (rempty) rempty.hidden = n > 0;
    };
    rchips.forEach(function (c) { c.addEventListener('click', function () { rpick(c.getAttribute('data-rf')); }); });
    rpick('all');
  }
})();

/* ---------- chat: one shared thread in this browser, seen live from both sides ---------- */
(function () {
  'use strict';
  var root = document.getElementById('chat');
  if (!root) return;
  var KEY = 'kuarte.chat';
  var PH = root.getAttribute('data-photo') || 'assets/photos/';
  var asTech = new URLSearchParams(location.search).get('as') === 'tech';
  var me = asTech ? 't' : 'c';
  var SEED = [
    { by: 'c', text: 'Hi Viper! Can the chrome be a little darker than the photo?', t: '9:02 AM' },
    { by: 't', text: "Yes po, I'll mix a deeper wine. Do you want them a bit shorter too?", t: '9:20 AM' },
    { by: 'c', text: 'Same length is fine. My number is 0917 555 0142 if easier', t: '9:21 AM' },
    { by: 't', text: 'No worries, here works! See you Wednesday.', t: '9:25 AM' },
    { by: 'c', img: PH + 'black-cherry.jpg', text: 'Idea for next time', t: '9:26 AM' }
  ];
  var PHONE = /(\+?63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/;
  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function load() { return window.KUS ? KUS.chat() : (read(KEY, null) || SEED.slice()); }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: this tab only */ } }
  function clock() { return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* who is on the other side */
  var b = read('kuarte.booking', null);
  var custName = (b && b.customer) || 'Maria Santos';
  var other = asTech
    ? { name: custName, ini: custName.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(), photo: null, sub: 'Your customer · first booking with you', back: 'm22-dashboard.dc.html', link: 'm21-request.dc.html', linkText: 'View request' }
    : { name: 'Viper Cullen', ini: 'VC', photo: PH + 'tech-viper.jpg', sub: 'Usually replies in 20 min', back: 'profile.html', link: 'profile.html', linkText: 'View profile' };
  document.querySelectorAll('[data-other-name]').forEach(function (el) { el.textContent = other.name; });
  document.querySelectorAll('[data-other-av]').forEach(function (el) {
    if (other.photo) { el.classList.add('ph-av'); el.innerHTML = '<img src="' + other.photo + '" alt="">'; } else { el.textContent = other.ini; }
  });
  document.getElementById('th-sub').textContent = other.sub;
  document.getElementById('th-back').setAttribute('href', other.back);
  var link = document.getElementById('th-link'); link.setAttribute('href', other.link); link.textContent = other.linkText;
  document.getElementById('cv2-av').textContent = asTech ? 'AM' : 'KN';
  document.getElementById('cv2-name').textContent = asTech ? 'Aria M.' : 'Killjoy Nails';
  document.getElementById('cv2-prev').textContent = asTech ? 'Thank you! See you next month' : 'Do you have a photo of the…';
  document.getElementById('msg').setAttribute('placeholder', 'Message ' + other.name.split(' ')[0] + '…');
  if (b) {
    document.getElementById('ctx-svc').textContent = b.svc || 'Gel extensions + chrome art';
    document.getElementById('ctx-when').textContent = (b.when || '') + (b.mode ? ' · ' + b.mode : '');
    var pill = document.getElementById('ctx-pill');
    var LBL = { requested: ['Requested', 'wait'], accepted: ['Accepted', 'info'], confirmed: ['Confirmed', 'ok'], declined: ['Declined', 'bad'], cancelled: ['Cancelled', 'bad'] };
    var l = LBL[b.status] || LBL.confirmed; pill.textContent = l[0]; pill.className = 'pill ' + l[1];
  }
  if (asTech) {
    document.getElementById('ctx-link').setAttribute('href', 'm22-dashboard.dc.html');
    /* the Nail Technician sees their own menu, not the customer's */
    var nav = document.querySelector('.hnav');
    if (nav) nav.innerHTML = '<a href="m22-dashboard.dc.html">Bookings</a><a href="m21-request.dc.html">Requests</a><a class="on" aria-current="page" href="chat.html?as=tech">Messages</a><a href="m19-camera.dc.html">Portfolio</a><a href="m24-insights.dc.html">Insights</a>';
    var av = document.getElementById('hd-av'); if (av) av.textContent = 'VC';
    var bell = document.getElementById('hd-bell'); if (bell) bell.setAttribute('data-notify', 'tech');
  }

  var box = document.getElementById('msgs');
  var shown = 0;
  function render(fresh) {
    var list = load();
    var html = '<span class="cap day">Today</span>';
    list.forEach(function (m, i) {
      var mine = m.by === me, side = mine ? 'out' : 'in', isNew = fresh && i >= shown ? ' new' : '';
      if (m.img) html += '<div class="pic ' + side + isNew + '"><div class="ph"><img src="' + esc(m.img) + '" alt="Photo sent in chat"></div><span class="cap">' + esc(m.text || '') + '</span></div>';
      else html += '<div class="bub ' + side + isNew + '">' + esc(m.text) + '</div>';
      html += '<span class="meta ' + side + '">' + (mine ? 'You' : esc(other.name.split(' ')[0])) + ' · ' + esc(m.t || '') + '</span>';
      if (m.text && PHONE.test(m.text)) html += '<div class="warnbox' + isNew + '"><svg class="i s" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v4M12 16h.01"/></svg><span>Bookings made outside KuArte don\'t get refund protection, reviews or badges. Keep chatting here to stay covered.</span></div>';
    });
    box.innerHTML = html;
    shown = list.length;
    var last = list[list.length - 1];
    document.getElementById('cv-prev').textContent = last ? (last.img ? 'Photo' : last.text) : '';
    document.getElementById('cv-time').textContent = last ? last.t : '';
    if (window.matchMedia('(min-width: 900px)').matches) box.scrollTop = box.scrollHeight;
    else window.scrollTo(0, document.documentElement.scrollHeight);
  }
  var form = document.getElementById('composer'), input = document.getElementById('msg'), send = document.getElementById('send');
  input.addEventListener('input', function () { send.disabled = !input.value.trim(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    var list = load();
    list.push({ by: me, text: text, t: clock() });
    save(list);
    input.value = ''; send.disabled = true;
    render(true);
    input.focus();
  });
  window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY) render(true); });
  render(false);
})();

/* ---------- log in: customer or Nail Technician, phone + code ---------- */
(function () {
  'use strict';
  var form = document.getElementById('lg');
  var hdLogin = document.getElementById('hd-login');
  var user = null;
  try { user = JSON.parse(localStorage.getItem('kuarte.user') || 'null'); } catch (e) { /* storage blocked */ }
  if (hdLogin && user) hdLogin.hidden = true;
  if (!form) return;
  var role = new URLSearchParams(location.search).get('as') === 'tech' ? 't' : 'c';
  var seg = document.getElementById('lg-seg'), sub = document.getElementById('lg-sub'), alt = document.getElementById('lg-alt');
  var phone = document.getElementById('lg-phone'), hint = document.getElementById('lg-hint'), code = document.getElementById('lg-code'), chint = document.getElementById('lg-chint');
  var TXT = {
    c: { sub: 'See your bookings, chat with your Nail Technician and leave reviews.', alt: 'New here? You can book walk-ins as a guest. <a class="lnk" href="#" data-soon="Customer sign-up">Create an account</a>', go: 'home.html?toast=' + encodeURIComponent('Welcome back, Maria.') },
    t: { sub: 'Manage requests, your calendar, portfolio and payouts.', alt: 'New to KuArte? <a class="lnk" href="m16-signup.dc.html">Join free as a Nail Technician</a>', go: 'm22-dashboard.dc.html?toast=' + encodeURIComponent('Welcome back, Viper.') }
  };
  function set(r) {
    role = r;
    seg.style.setProperty('--i', r === 'c' ? 0 : 1);
    seg.querySelectorAll('[data-role]').forEach(function (b) { var on = b.getAttribute('data-role') === r; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    sub.textContent = TXT[r].sub;
    alt.innerHTML = TXT[r].alt;
  }
  seg.addEventListener('click', function (e) { var b = e.target.closest('[data-role]'); if (b) set(b.getAttribute('data-role')); });
  document.getElementById('lg-send').addEventListener('click', function () {
    var digits = phone.value.replace(/\D/g, '');
    if (digits.length < 10) { hint.textContent = 'Enter your 10-digit mobile number, like 917 555 0142.'; hint.style.color = '#B42335'; phone.focus(); return; }
    hint.textContent = 'Code sent to +63 ' + phone.value.trim() + '.'; hint.style.color = '';
    code.classList.add('open');
    var first = code.querySelector('input'); if (first) setTimeout(function () { first.focus(); }, 150);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = Array.prototype.map.call(code.querySelectorAll('input'), function (i) { return i.value; }).join('');
    if (!code.classList.contains('open')) { document.getElementById('lg-send').click(); return; }
    if (c.length < 6) { chint.textContent = 'Type all 6 digits of the code.'; chint.style.color = '#B42335'; return; }
    try { localStorage.setItem('kuarte.user', JSON.stringify({ role: role })); } catch (err) { /* storage blocked */ }
    location.href = TXT[role].go;
  });
  set(role);
})();
