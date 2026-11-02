/* KuArte shared helpers, loaded by every page (old screens and responsive pages):
   the demo chat thread, the notifications panel, and code boxes that move on as you type. */
(function () {
  'use strict';
  var PH = 'assets/photos/';
  var CHAT = 'kuarte.chat';
  var SEED = [
    { by: 'c', text: 'Hi Viper! Can the chrome be a little darker than the photo?', t: '9:02 AM' },
    { by: 't', text: "Yes po, I'll mix a deeper wine. Do you want them a bit shorter too?", t: '9:20 AM' },
    { by: 'c', text: 'Same length is fine. My number is 0917 555 0142 if easier', t: '9:21 AM' },
    { by: 't', text: 'No worries, here works! See you Wednesday.', t: '9:25 AM' },
    { by: 'c', img: PH + 'black-cherry.jpg', text: 'Idea for next time', t: '9:26 AM' }
  ];
  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function clock() { return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var KUS = window.KUS = {
    read: read, write: write, clock: clock, esc: esc,
    chat: function () { return read(CHAT, null) || SEED.slice(); },
    chatSave: function (list) { write(CHAT, list); },
    chatPush: function (by, text) { var l = KUS.chat(); l.push({ by: by, text: text, t: clock() }); write(CHAT, l); return l; }
  };

  /* ---------- notifications panel: built from what has happened in this browser ---------- */
  function items(side) {
    var b = read('kuarte.booking', null), chat = KUS.chat(), offer = read('kuarte.offer', null), out = [];
    var lastFrom = function (who) { for (var i = chat.length - 1; i >= 0; i--) if (chat[i].by === who) return chat[i]; return null; };
    if (side === 'tech') {
      var cname = (b && b.customer) || 'Maria Santos', first = cname.split(' ')[0];
      if (b && b.tech === 'viper') {
        if (b.status === 'requested') out.push({ t: 'New request from ' + first, s: b.svc + ' · ' + b.when, href: 'm21-request.dc.html', dot: 1 });
        if (b.status === 'confirmed' && !b.checkin) out.push({ t: first + ' confirmed the booking', s: b.when, href: 'm22-dashboard.dc.html', dot: 1 });
        if (b.checkin === 'onway') out.push({ t: first + ' is on the way', s: b.late ? 'Running about ' + b.late + ' min late' : 'Checked in from the customer app', href: 'm22-dashboard.dc.html', dot: 1 });
        if (b.checkin === 'here') out.push({ t: first + ' has arrived', s: 'Checked in at the studio', href: 'm22-dashboard.dc.html', dot: 1 });
        if (b.status === 'cancelled') out.push({ t: first + ' cancelled', s: 'The deposit refund follows your policy', href: 'm22-dashboard.dc.html', dot: 1 });
      } else {
        out.push({ t: 'New request from Maria', s: 'Gel extensions + chrome nail art · Wed, Nov 4 · 2:30 PM', href: 'm21-request.dc.html', dot: 1 });
      }
      var m = lastFrom('c');
      if (m) out.push({ t: 'Message from ' + first, s: m.img ? 'Sent a photo' : m.text, href: 'chat.html?as=tech', dot: chat[chat.length - 1].by === 'c' ? 1 : 0 });
      out.push({ t: '3 design requests near you', s: 'Send an offer before they close', href: 'm27-design-requests.dc.html' });
      out.push({ t: 'You earned Repeat Favorite', s: '38% of your customers booked again', href: 'm24-insights.dc.html' });
    } else {
      if (b && b.source === 'booking') {
        var S = { requested: ['Request sent to Viper', 'She has 4 hours to reply'], accepted: ['Viper accepted. Confirm to lock it in', b.when], confirmed: ["You're booked with Viper", b.when], declined: ['Viper declined your request', 'Your deposit is on its way back'], cancelled: ['Booking cancelled', 'Refund details are on the booking'] };
        var s = S[b.status];
        if (s) out.push({ t: s[0], s: s[1], href: 'm12-status.dc.html', dot: b.status === 'accepted' ? 1 : 0 });
      }
      if (offer) out.push({ t: 'Viper sent an offer: ₱' + offer.price, s: 'For your design request', href: 'm26-offers.dc.html', dot: 1 });
      var r = lastFrom('t');
      if (r) out.push({ t: 'Message from Viper', s: r.text, href: 'chat.html', dot: chat[chat.length - 1].by === 't' ? 1 : 0 });
      out.push({ t: 'Reminder: Gel extensions tomorrow', s: 'Wed, Nov 4 · 2:30 PM with Viper', href: 'm12-status.dc.html' });
      out.push({ t: 'New Verified designs near you', s: 'Rose florals, Sapphire chrome and more', href: 'designs.html' });
    }
    return out;
  }
  var panel = null;
  function close() { if (!panel) return; var p = panel; panel = null; p.classList.remove('in'); setTimeout(function () { p.remove(); }, 160); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open(btn) {
    if (panel) { close(); return; }
    var side = btn.getAttribute('data-notify');
    var list = items(side);
    panel = document.createElement('div');
    panel.className = 'knotif';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notifications');
    panel.innerHTML = '<div class="kn-h"><b>Notifications</b><button type="button" class="kn-x" aria-label="Close">×</button></div>' +
      list.map(function (it) { return '<a class="kn-i" href="' + it.href + '">' + (it.dot ? '<i class="kn-dot" aria-label="New"></i>' : '<i class="kn-sp"></i>') + '<span><b>' + esc(it.t) + '</b><span>' + esc(it.s) + '</span></span></a>'; }).join('') +
      '<p class="kn-f">Sample notifications · new ones appear as you use the demo</p>';
    var host = btn.closest('.scr') || document.body;
    host.appendChild(panel);
    var r = btn.getBoundingClientRect(), hr = host === document.body ? { left: 0, top: 0, width: window.innerWidth } : host.getBoundingClientRect();
    var top = r.bottom - hr.top + 8 + (host === document.body ? window.scrollY : 0);
    panel.style.top = top + 'px';
    panel.style.right = Math.max(8, (hr.left + hr.width) - r.right) + 'px';
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (panel) panel.classList.add('in'); }); });
    panel.querySelector('.kn-x').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    var first = panel.querySelector('.kn-i'); if (first) first.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-notify]');
    if (b) { e.preventDefault(); open(b); return; }
    if (panel && !panel.contains(e.target)) close();
  });

  /* ---------- code boxes: one digit each, focus moves on, paste fills them all ---------- */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.matches || !el.matches('.otp input')) return;
    el.value = el.value.replace(/\D/g, '').slice(-1);
    if (el.value && el.nextElementSibling && el.nextElementSibling.tagName === 'INPUT') el.nextElementSibling.focus();
  });
  document.addEventListener('keydown', function (e) {
    var el = e.target;
    if (!el.matches || !el.matches('.otp input')) return;
    if (e.key === 'Backspace' && !el.value && el.previousElementSibling) { el.previousElementSibling.focus(); }
  });
  document.addEventListener('paste', function (e) {
    var el = e.target;
    if (!el.matches || !el.matches('.otp input')) return;
    var digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    var boxes = el.parentNode.querySelectorAll('input');
    boxes.forEach(function (b, i) { b.value = digits[i] || ''; });
    boxes[Math.min(digits.length, boxes.length) - 1].focus();
  });
})();
