/* =====================================================================
   Light of Deen — প্রোফাইল, স্ট্যাটস, পিন/নোট, এক্সপোর্ট/ইম্পোর্ট ও Firebase সিঙ্ক
   নির্ভর করে: firebase-config.js (আগে লোড হবে) এবং index.html-এর switchView / openSurah
   ডেটা প্রথমে localStorage-এ থাকে (অফলাইনেও চলে), লগইন থাকলে Firestore-এ সিঙ্ক হয়।
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- স্টোরেজ কী ---------- */
  var K = { bm: 'quranBookmarks', pins: 'lodPins', notes: 'lodNotes', stats: 'lodProfile', meta: 'lodSyncMeta', user: 'lodUser', prof: 'lodProf', on: 'lodAuthOn', pend: 'lodAuthPending' };
  var FB_VER = '10.14.1';

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sdel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function arr(k) { var v = jget(k, []); return Array.isArray(v) ? v : []; }
  function stats() { var s = jget(K.stats, null); if (!s || typeof s !== 'object') s = {}; if (!s.days || typeof s.days !== 'object') s.days = {}; if (!s.read || typeof s.read !== 'object') s.read = {};
    ['ay', 'hd', 'tbd', 'last'].forEach(function (f) { if (!s[f] || typeof s[f] !== 'object' || Array.isArray(s[f])) s[f] = {}; });
    return s; }
  function meta() { var m = jget(K.meta, null); return (m && typeof m === 'object') ? m : {}; }

  /* ---------- ছোট ইউটিলিটি ---------- */
  function num(n) {
    var s = String(n), L = (typeof LANG !== 'undefined') ? LANG : 'bn';
    if (L === 'en') return s;
    var D = L === 'ar' ? '٠١٢٣٤٥٦٧٨٩' : '০১২৩৪৫৬৭৮৯';
    return s.replace(/\d/g, function (d) { return D[d]; });
  }
  function toast(m) { if (typeof lodToast === 'function') lodToast(m); else try { alert(m); } catch (e) {} }
  function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dnum(k) { var p = k.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sname(n) { try { return (typeof surahName === 'function') ? surahName(n) : String(n); } catch (e) { return String(n); } }
  function refText(key) { var p = String(key).split(':'); return 'সূরা ' + sname(+p[0]) + ' · আয়াত ' + num(p[1]); }

  /* ---------- আইকন ---------- */
  var IC = {
    pin: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3v1.5H7V13l3-3z"/><path d="M12 14.5V21"/></svg>',
    note: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5M7 10l5-5 5 5"/><path d="M5 19h14"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>',
    login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l4 4-4 4M14 12H4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.5 5.3 8.3 5 4 5v13c4.3 0 6.5.3 8 1.5 1.5-1.2 3.7-1.5 8-1.5V5c-4.300 0-6.500.3-8 1.5zM12 6.500V19.500"/></svg>',
    bm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v16l-5-3.500L7 20z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.500" width="16" height="14" rx="2.500"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/></svg>',
    fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3.500 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3.500 2.500-4.500.2 1.500 1 2.200 1.800 2.500C11.300 8.500 11 6 12 3z"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.500 20h7M10 17h4"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 0 1-.6-7.960A5.500 5.500 0 0 1 17 9.500 4.200 4.200 0 0 1 17 18z"/></svg>',
    cloudOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 0 1-.6-7.960A5.500 5.500 0 0 1 17 9.500 4.200 4.200 0 0 1 17 18z"/><path d="M4 4l16 16"/></svg>',
    hadith: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/></svg>',
    tasbih: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="1.8"/><circle cx="18" cy="9" r="1.8"/><circle cx="6" cy="9" r="1.8"/><circle cx="16" cy="16" r="1.8"/><circle cx="8" cy="16" r="1.8"/><path d="M12 19v3"/></svg>',
    topic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    g: '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.500c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z"/><path fill="#4285F4" d="M46.980 24.550c0-1.570-.15-3.090-.38-4.550H24v9.020h12.940c-.58 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z"/><path fill="#FBBC05" d="M10.530 28.590c-.48-1.450-.76-2.990-.76-4.590s.27-3.140.76-4.590l-7.980-6.190C.92 16.460 0 20.120 0 24c0 3.880.92 7.540 2.560 10.780l7.970-6.190z"/><path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z"/></svg>'
  };

  /* =====================================================================
     ১) স্ট্যাটস ট্র্যাকিং (সময়, সক্রিয় দিন, স্ট্রিক, পড়া)
     ===================================================================== */
  var timeDirty = false;

  function tick() {
    if (document.visibilityState !== 'visible') return;
    var s = stats(), k = dkey();
    s.days[k] = (s.days[k] || 0) + 5;
    jset(K.stats, s);
    timeDirty = true;
  }
  setInterval(tick, 5000);

  function onRead(n) {
    n = +n; if (!n) return;
    var s = stats();
    if (!s.read[n]) { s.read[n] = 1; jset(K.stats, s); touch('stats'); }
  }

  /* ---- বিস্তারিত পাঠ-ট্র্যাকিং: আয়াত, হাদিস, তাসবিহ, শেষ পড়া ---- */
  var ioAy = null, ioHd = null, pendTb = 0, tbTimer = null;

  function normNo(v) { var n = +v; return (isFinite(n) && String(n) === String(v)) ? n : String(v); }
  function setAdd(map, key, v) {
    var a = map[key]; if (!Array.isArray(a)) a = map[key] = [];
    v = normNo(v); if (a.indexOf(v) > -1) return false;
    a.push(v); return true;
  }
  function setCount(map) {
    var c = 0; Object.keys(map || {}).forEach(function (k) { if (Array.isArray(map[k])) c += map[k].length; });
    return c;
  }

  function markAyah(sNo, a) {
    sNo = +sNo; a = +a; if (!sNo || !a) return;
    var s = stats();
    setAdd(s.ay, String(sNo), a);
    s.last.ay = { s: sNo, a: a, t: Date.now() };
    jset(K.stats, s); touch('stats');
  }
  function markHadith(bk, no) {
    if (!bk || no === '' || no == null) return;
    var s = stats();
    if (setAdd(s.hd, String(bk), no)) { jset(K.stats, s); touch('stats'); }
  }
  function setTopic(title, cat, f, a, ct) {
    if (!title) return;
    var s = stats();
    s.last.tp = { n: String(title), c: cat || '', f: f || '', a: (a === undefined || a === null) ? '' : a, ct: ct || 0, t: Date.now() };
    jset(K.stats, s); touch('stats');
  }

  // তাসবিহ: প্রতি ট্যাপে ডিস্কে না লিখে জমিয়ে একসাথে সেভ
  function flushTb() {
    if (!pendTb) return;
    var s = stats(), k = dkey();
    s.tbd[k] = (+s.tbd[k] || 0) + pendTb; pendTb = 0;
    jset(K.stats, s); touch('stats');
  }
  function onTasbih() { pendTb++; clearTimeout(tbTimer); tbTimer = setTimeout(flushTb, 1500); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushTb(); });
  window.addEventListener('pagehide', flushTb);

  // পড়ার হিসাব: স্ক্রিনে অর্ধেকের বেশি দেখা গেলে এবং ~২ সেকেন্ড থাকলে "পড়া" ধরা হয়
  var ioTimers = new WeakMap();
  function mkIO(cb) {
    if (!('IntersectionObserver' in window)) return null;
    return new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var el = e.target, t = ioTimers.get(el);
        var vis = e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.45);
        if (vis && !t) {
          ioTimers.set(el, setTimeout(function () {
            ioTimers.delete(el);
            if (document.visibilityState === 'visible') cb(el);
          }, 2000));
        } else if (!vis && t) { clearTimeout(t); ioTimers.delete(el); }
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  }
  function watchBox(id, fn) {
    var box = document.getElementById(id); if (!box || !window.MutationObserver) return;
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) fn(n); }); });
    }).observe(box, { childList: true });
  }
  function wrap(name, fn) {
    var o = window[name]; if (typeof o !== 'function' || o.__lod) return;
    var w = function () { try { fn.apply(this, arguments); } catch (e) {} return o.apply(this, arguments); };
    w.__lod = 1; window[name] = w;
  }
  function gTopic() { try { return (typeof curTopic !== 'undefined') ? curTopic : 0; } catch (e) { return 0; } }
  function gTopicName(n) { try { return (typeof TOPICS !== 'undefined' && TOPICS[n - 1]) || ''; } catch (e) { return ''; } }
  function gBook() { try { return (typeof hd !== 'undefined') ? hd.book : null; } catch (e) { return null; } }

  function setupTracking() {
    // আয়াত
    ioAy = mkIO(function (el) { var p = String(el.dataset.k || '').split(':'); if (p.length === 2) markAyah(p[0], p[1]); });
    // হাদিস (কিতাব + বিষয়ভিত্তিক)
    ioHd = mkIO(function (el) { var v = String(el.dataset.hk || ''), i = v.lastIndexOf('|'); if (i > 0) markHadith(v.slice(0, i), v.slice(i + 1)); });
    if (ioHd) {
      watchBox('hdBody', function (n) {
        if (!n.classList.contains('hb-card') || n.dataset.no == null) return;
        var b = gBook(); if (!b) return;
        n.dataset.hk = b.id + '|' + n.dataset.no; ioHd.observe(n);
      });
      watchBox('topicBody', function (n) {
        if (!n.classList.contains('hd-item') || gTopic() !== 2) return;
        var sub; try { sub = (typeof curSub !== 'undefined') ? curSub : ''; } catch (e) { sub = ''; }
        if (!sub) return;
        var idx = Array.prototype.indexOf.call(n.parentNode.querySelectorAll('.hd-item'), n);
        if (idx < 0) return;
        n.dataset.hk = 't:' + sub + '|' + (idx + 1); ioHd.observe(n);
      });
    }
    // তাসবিহ
    wrap('incrementTasbih', onTasbih);
    // সর্বশেষ বিষয়
    wrap('openSub', function (name) { if (gTopic() === 1) setTopic(name, gTopicName(1), 'sub', name, 1); });
    wrap('openHadithSub', function (name) { setTopic(name, 'বিষয়ভিত্তিক হাদিস', 'sub', name, 2); });
    wrap('openQasasQ', function (title) { var ct = gTopic(); setTopic(title, gTopicName(ct), 'sub', title, ct); });
    wrap('openBioPerson', function (name) { setTopic(name, 'জীবনী সমূহ', 'bio', name, 3); });
    wrap('openAsma', function (n) { try { setTopic(ASMA[n - 1][1], 'আসমাউল হুসনা', 'asma', n, 0); } catch (e) {} });
    wrap('openHadithBook', function (b) { if (b && b.name) setTopic(b.name, 'হাদিস', 'hbook', b.id, 0); });
    wrap('openHadithChapter', function (k, name) { var b = gBook(); if (b && name) setTopic(name, b.name, 'hbook', b.id, 0); });
  }

  function reopenTopic(t) {
    if (!t) return;
    try {
      if (t.f === 'sub') { curTopic = +t.ct; openSub(t.a); }
      else if (t.f === 'bio') { curTopic = 3; switchView('topic'); openBioPerson(t.a); }
      else if (t.f === 'asma') { switchView('asma'); openAsma(+t.a); }
      else if (t.f === 'hbook') {
        var b = null; HADITH_BOOKS.forEach(function (x) { if (String(x.id) === String(t.a)) b = x; });
        if (b) { switchView('hadith'); openHadithBook(b); }
      }
    } catch (e) {}
  }

  function openLast(kind) {
    var L = stats().last || {};
    if (kind === 'tp') { reopenTopic(L.tp); return; }
    var l = L.ay; if (!l || typeof openSurah !== 'function') return;
    openSurah(+l.s);
    var key = l.s + ':' + l.a, n = 0;
    var iv = setInterval(function () {
      var el = document.querySelector('#rdAyahs .ayah[data-k="' + key + '"]');
      if (el) { clearInterval(iv); el.scrollIntoView({ block: 'center' }); }
      else if (++n > 40) clearInterval(iv);
    }, 150);
  }

  function fmtWhen(t) {
    if (!t) return '';
    var d = new Date(t), now = new Date(), hm;
    try { hm = d.toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' }); } catch (e) { hm = d.toLocaleTimeString(); }
    if (dkey(d) === dkey(now)) return 'আজ, ' + hm;
    var y = new Date(now.getTime() - 86400000);
    if (dkey(d) === dkey(y)) return 'গতকাল, ' + hm;
    var ds; try { ds = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }); } catch (e) { ds = dkey(d); }
    return ds + ', ' + hm;
  }

  function computeStats() {
    var s = stats(), secs = 0, active = [], lastDay = '';
    Object.keys(s.days).forEach(function (k) {
      var v = +s.days[k] || 0; secs += v;
      if (v >= 10) { active.push(dnum(k)); if (k > lastDay) lastDay = k; }
    });
    active.sort(function (a, b) { return a - b; });
    var best = 0, run = 0, prev = null;
    active.forEach(function (d) { run = (prev !== null && d === prev + 1) ? run + 1 : 1; if (run > best) best = run; prev = d; });
    var set = {}; active.forEach(function (d) { set[d] = 1; });
    var today = dnum(dkey()), cur = 0, d = set[today] ? today : today - 1;
    while (set[d]) { cur++; d--; }
    var td = dkey(), tb = 0;
    Object.keys(s.tbd).forEach(function (k) { tb += (+s.tbd[k] || 0); });
    return { secs: secs, activeDays: active.length, streak: cur, best: best, read: Object.keys(s.read).length,
             ay: setCount(s.ay), hd: setCount(s.hd), tb: tb + pendTb, tbToday: (+s.tbd[td] || 0) + pendTb, today: +s.days[td] || 0, last: s.last || {}, lastDay: lastDay };
  }

  function fmtTime(secs) {
    if (secs < 60) return num(secs) + ' সে';
    var m = Math.floor(secs / 60);
    if (m < 60) return num(m) + ' মি';
    var h = Math.floor(m / 60); m = m % 60;
    return num(h) + ' ঘ' + (m ? ' ' + num(m) + ' মি' : '');
  }

  /* =====================================================================
     ২) পিন ও নোট (আয়াত-ভিত্তিক)
     ===================================================================== */
  function pins() { return arr(K.pins); }
  function notes() { return arr(K.notes).filter(function (n) { return n && n.k; }); }
  function noteOf(key) { var l = notes(); for (var i = 0; i < l.length; i++) if (l[i].k === key) return l[i]; return null; }

  function btns(s, a) {
    var key = s + ':' + a;
    return '<button class="b-pin' + (pins().indexOf(key) > -1 ? ' on' : '') + '" title="পিন">' + IC.pin + '</button>' +
           '<button class="b-note' + (noteOf(key) ? ' on' : '') + '" title="নোট">' + IC.note + '</button>';
  }

  function bind(el, s, a) {
    var key = s + ':' + a;
    if (ioAy && el) { el.dataset.k = key; ioAy.observe(el); }
    var bp = el.querySelector('.b-pin'), bnn = el.querySelector('.b-note');
    if (bp) bp.onclick = function (e) {
      e.stopPropagation();
      var p = pins(), i = p.indexOf(key);
      if (i > -1) p.splice(i, 1); else p.push(key);
      jset(K.pins, p); touch('pins');
      bp.classList.toggle('on', i === -1);
      toast(i === -1 ? 'পিন করা হয়েছে' : 'পিন সরানো হয়েছে');
    };
    if (bnn) bnn.onclick = function (e) {
      e.stopPropagation();
      editNote(s, a, function () { bnn.classList.toggle('on', !!noteOf(key)); });
    };
  }

  function editNote(s, a, done) {
    var key = s + ':' + a, cur = noteOf(key);
    openModal(
      '<h3 class="pf-mh">নোট · ' + esc(refText(key)) + '</h3>' +
      '<textarea class="pf-ta" id="pfNoteTa" rows="6" maxlength="2000" placeholder="এই আয়াত সম্পর্কে আপনার নোট লিখুন..."></textarea>' +
      '<div class="pf-mrow">' +
        (cur ? '<button class="pf-btn ghost" data-m="del">মুছুন</button>' : '') +
        '<span style="flex:1"></span><button class="pf-btn ghost" data-m="x">বাতিল</button><button class="pf-btn" data-m="save">সেভ</button>' +
      '</div>',
      function (act, box) {
        var ta = box.querySelector('#pfNoteTa'), l = notes().filter(function (n) { return n.k !== key; });
        if (act === 'save') {
          var v = ta.value.trim();
          if (v) l.push({ k: key, x: v, t: Date.now() });
          jset(K.notes, l); touch('notes'); closeModal(); toast(v ? 'নোট সেভ হয়েছে' : 'নোট মুছে গেছে');
        } else if (act === 'del') {
          jset(K.notes, l); touch('notes'); closeModal(); toast('নোট মুছে গেছে');
        } else { closeModal(); return; }
        if (done) done(); render();
      },
      function (box) { var ta = box.querySelector('#pfNoteTa'); ta.value = cur ? cur.x : ''; setTimeout(function () { ta.focus(); }, 60); }
    );
  }

  /* =====================================================================
     ৩) মোডাল (বটম শিট)
     ===================================================================== */
  var modal = null;
  function openModal(html, onAct, onOpen) {
    closeModal();
    modal = document.createElement('div');
    modal.className = 'pf-modal';
    modal.innerHTML = '<div class="pf-box" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(modal);
    var box = modal.firstChild;
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { closeModal(); return; }
      var b = e.target.closest('[data-m]');
      if (b && onAct) onAct(b.getAttribute('data-m'), box, b);
    });
    if (onOpen) onOpen(box);
  }
  function closeModal() { if (modal) { modal.remove(); modal = null; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('popstate', closeModal);

  function openList(kind) {
    var title, items = [], total = null;
    if (kind === 'bm') { title = 'বুকমার্ক'; items = arr(K.bm).map(function (k) { return { k: k }; }); }
    else if (kind === 'pins') { title = 'পিন'; items = pins().map(function (k) { return { k: k }; }); }
    else if (kind === 'notes') { title = 'নোট'; items = notes().slice().sort(function (a, b) { return b.t - a.t; }); }
    else if (kind === 'read') {
      title = 'পড়া সূরা';
      items = Object.keys(stats().read).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return { k: n + ':1', surah: true }; });
    }
    else if (kind === 'ay') {
      title = 'পড়া আয়াত';
      var ay = stats().ay; total = setCount(ay);
      items = Object.keys(ay).map(Number).filter(Boolean).sort(function (a, b) { return a - b; }).map(function (n) {
        var c = (ay[n] || []).length, tot = 0;
        try { tot = SURAH_INFO[n].cnt || 0; } catch (e) {}
        return { k: n + ':1', surah: true, x: num(c) + (tot ? ' / ' + num(tot) : '') + ' আয়াত পড়া' };
      });
    }
    else if (kind === 'hd') {
      title = 'পড়া হাদিস';
      var hs = stats().hd; total = setCount(hs);
      items = Object.keys(hs).filter(function (k) { return Array.isArray(hs[k]) && hs[k].length; }).sort(function (a, b) {
        var ta = a.indexOf('t:') === 0, tb = b.indexOf('t:') === 0;
        if (ta !== tb) return ta ? 1 : -1;
        return ta ? a.localeCompare(b) : (+a - +b);
      }).map(function (k) {
        var c = hs[k].length;
        if (k.indexOf('t:') === 0) { var nm = k.slice(2); return { k: k, hb: { f: 'sub', a: nm, ct: 2 }, label: 'বিষয়ভিত্তিক হাদিস · ' + nm, x: num(c) + 'টি হাদিস পড়া' }; }
        var bk = null; try { HADITH_BOOKS.forEach(function (x) { if (String(x.id) === String(k)) bk = x; }); } catch (e) {}
        return { k: k, hb: { f: 'hbook', a: k }, label: bk ? bk.name : ('কিতাব ' + num(k)), x: num(c) + 'টি হাদিস পড়া' };
      });
    }
    var html = '<h3 class="pf-mh">' + esc(title) + ' (' + num(total == null ? items.length : total) + ')</h3>';
    if (!items.length) html += '<p class="pf-empty">এখনো কিছু নেই।</p>';
    items.forEach(function (it, i) {
      var p = String(it.k).split(':');
      var label = it.label || (it.surah ? 'সূরা ' + sname(+p[0]) : refText(it.k));
      html += '<div class="pf-li"><button class="pf-li-main" data-m="open" data-i="' + i + '"><b>' + esc(label) + '</b>' +
              (it.x ? '<small>' + esc(it.x) + '</small>' : '') + '</button>' +
              ((it.surah || it.hb) ? '' : '<button class="pf-li-x" data-m="rm" data-i="' + i + '" aria-label="সরান">✕</button>') + '</div>';
    });
    html += '<div class="pf-mrow"><span style="flex:1"></span><button class="pf-btn ghost" data-m="x">বন্ধ</button></div>';
    openModal(html, function (act, box, b) {
      var i = +b.getAttribute('data-i'), it = items[i];
      if (act === 'x') { closeModal(); return; }
      if (act === 'open' && it) {
        closeModal();
        if (it.hb) { reopenTopic(it.hb); return; }
        var p = String(it.k).split(':');
        if (typeof openSurah === 'function') openSurah(+p[0]);
        return;
      }
      if (act === 'rm' && it) {
        if (kind === 'bm') { jset(K.bm, arr(K.bm).filter(function (k) { return k !== it.k; })); touch('bm'); }
        else if (kind === 'pins') { jset(K.pins, pins().filter(function (k) { return k !== it.k; })); touch('pins'); }
        else if (kind === 'notes') { jset(K.notes, notes().filter(function (n) { return n.k !== it.k; })); touch('notes'); }
        openList(kind); render();
      }
    });
  }

  /* =====================================================================
     ৪) প্রোফাইল পেজ (UI)
     ===================================================================== */
  var CSS = '' +
    '.pf-wrap{padding:14px 14px 120px;max-width:720px;margin:0 auto}' +
    '.pf-card{background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow);padding:16px;margin-bottom:14px}' +
    '.pf-user{display:flex;gap:14px;align-items:center}' +
    '.pf-av{flex:none;width:66px;height:66px;border-radius:50%;background:var(--blue-l);border:3px solid var(--blue-l);display:grid;place-items:center;overflow:hidden;color:var(--blue);font-size:26px;font-weight:700}' +
    '.pf-av img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.pf-name{font-weight:700;font-size:17px;line-height:1.35;overflow-wrap:anywhere}' +
    '.pf-mail{color:var(--muted);font-size:13px;margin-top:2px;overflow-wrap:anywhere}' +
    '.pf-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}' +
    '.pf-act{background:none;border:0;border-inline-start:1px solid var(--line);color:var(--text);font:inherit;font-size:13.5px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 4px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.pf-act:first-child{border-inline-start:0}' +
    '.pf-act svg{width:24px;height:24px;color:var(--blue)}' +
    '.pf-act:active{background:var(--blue-l);border-radius:12px}' +
    '.pf-sync{display:flex;align-items:center;gap:12px}' +
    '.pf-g{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:#fff;display:grid;place-items:center}' +
    '.pf-g svg{width:22px;height:22px}' +
    '.pf-sync-t{flex:1;min-width:0}' +
    '.pf-sync-t b{display:block;font-size:16px}' +
    '.pf-sync-s{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;margin-top:2px}' +
    '.pf-sync-s svg{width:16px;height:16px;flex:none;color:var(--blue)}' +
    '.pf-btn{border:0;background:var(--blue);color:var(--on-blue);font:inherit;font-size:14px;font-weight:600;padding:10px 18px;border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.pf-btn[disabled]{opacity:.55;cursor:default}' +
    '.pf-btn.ghost{background:var(--blue-l);color:var(--blue)}' +
    '.pf-h{font-size:17px;font-weight:700;margin:22px 4px 10px}' +
    '.pf-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center}' +
    '.pf-st{background:none;border:0;color:var(--text);font:inherit;display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px 0;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:14px}' +
    '.pf-st:active{background:var(--blue-l)}' +
    '.pf-ic{width:46px;height:46px;border-radius:50%;background:var(--blue-l);color:var(--blue);display:grid;place-items:center}' +
    '.pf-ic svg{width:23px;height:23px}' +
    '.pf-st b{font-size:20px;line-height:1.1}' +
    '.pf-st span{color:var(--muted);font-size:13px}' +
    '.pf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px 12px;padding:6px 4px}' +
    '.pf-row{display:flex;align-items:center;gap:12px}' +
    '.pf-row .pf-ic{width:48px;height:48px;flex:none}' +
    '.pf-row b{display:block;font-size:20px;line-height:1.15}' +
    '.pf-row span{color:var(--muted);font-size:13px}' +
    '.pf-modal{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.pf-box{background:var(--bg);color:var(--text);width:100%;max-width:720px;max-height:86vh;max-height:86dvh;overflow:auto;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 34px rgba(0,0,0,.3)}' +
    '.pf-mh{font-size:17px;margin:0 0 12px}' +
    '.pf-ta{width:100%;box-sizing:border-box;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:14px;padding:12px;font:inherit;font-size:15.5px;line-height:1.7;resize:vertical;outline:none}' +
    '.pf-ta:focus{border-color:var(--blue)}' +
    '.pf-mrow{display:flex;gap:10px;align-items:center;margin-top:14px}' +
    '.pf-empty{color:var(--muted);text-align:center;padding:18px 0}' +
    '.pf-li{display:flex;align-items:stretch;border:1px solid var(--line);background:var(--card);border-radius:14px;margin-bottom:8px;overflow:hidden}' +
    '.pf-li-main{flex:1;min-width:0;text-align:start;background:none;border:0;color:var(--text);font:inherit;padding:12px;cursor:pointer}' +
    '.pf-li-main b{display:block;font-size:15px}' +
    '.pf-li-main small{display:block;color:var(--muted);font-size:13.5px;margin-top:4px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;max-height:5.2em;overflow:hidden}' +
    '.pf-li-x{flex:none;width:44px;background:none;border:0;border-inline-start:1px solid var(--line);color:var(--muted);font-size:16px;cursor:pointer}' +
    '.pf-in{display:block;width:100%;box-sizing:border-box;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:14px;padding:13px 14px;font:inherit;font-size:15.5px;margin-bottom:10px;outline:none}' +
    '.pf-in:focus{border-color:var(--blue)}' +
    '.pf-full{width:100%;display:flex;align-items:center;justify-content:center;gap:10px}' +
    '.pf-gbtn svg{width:20px;height:20px;flex:none}' +
    '.pf-err{color:#e5484d;font-size:13.5px;line-height:1.6;min-height:0;margin:0 2px 10px}' +
    '.pf-err:empty{display:none}' +
    '.pf-link{background:none;border:0;color:var(--blue);font:inherit;font-size:13.5px;padding:10px 2px 0;cursor:pointer;display:block;margin:0 auto}' +
    '.pf-or{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;margin:14px 0}' +
    '.pf-or:before,.pf-or:after{content:"";flex:1;height:1px;background:var(--line)}' +
    '.pf-switch{text-align:center;color:var(--muted);font-size:14px;margin-top:14px}' +
    '.pf-switch button{background:none;border:0;color:var(--blue);font:inherit;font-weight:700;cursor:pointer;padding:0 2px}' +
    '.pf-av[data-a]{cursor:pointer}' +
    '.pf-hint{font-size:12.5px;color:var(--muted);line-height:1.5;margin:-4px 2px 10px}' +
    '.pf-un{color:var(--blue);font-size:13.5px;font-weight:600;margin-top:2px;overflow-wrap:anywhere}' +
    '.pf-av-lg{width:96px;height:96px;margin:0 auto 12px;font-size:36px}' +
    '.pf-ph{display:flex;gap:8px;justify-content:center;margin-bottom:16px}' +
    '.pf-lbl{display:block;font-size:13px;color:var(--muted);margin:2px 2px 6px}' +
    '.pf-bio{font-size:13.5px;line-height:1.6;margin-top:6px;overflow-wrap:anywhere;white-space:pre-wrap}' +
    '.pf-chip{display:inline-block;background:var(--blue-l);color:var(--blue);font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;margin-top:6px}' +
    '.ayah-foot button.b-pin.on,.ayah-foot button.b-note.on{color:var(--blue)}' +
    '.ayah-foot button.b-pin.on svg{fill:currentColor}' +
    '.pf-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 4px;text-align:center}' +
    '.pf-grid3 .pf-st b{font-size:19px}' +
    '.pf-last{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;background:none;border:0;border-top:1px solid var(--line);color:var(--text);font:inherit;text-align:start;padding:12px 2px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.pf-last:first-child{border-top:0}' +
    '.pf-last[disabled]{cursor:default}' +
    '.pf-last .pf-ic{flex:none;width:44px;height:44px}' +
    '.pf-lt{flex:1;min-width:0}' +
    '.pf-lt span{display:block;color:var(--muted);font-size:12.5px}' +
    '.pf-lt b{display:block;font-size:16px;line-height:1.4;margin-top:1px;overflow-wrap:anywhere}' +
    '.pf-lt small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}' +
    '.pf-last>svg{flex:none;width:18px;height:18px;color:var(--muted)}' +
    '.lb-tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}' +
    '.lb-tabs::-webkit-scrollbar{display:none}' +
    '.lb-tab{flex:none;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:14px;padding:8px 16px;border-radius:999px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.lb-tab.on{background:var(--blue);color:var(--on-blue);border-color:var(--blue)}' +
    '.lb-me{display:flex;align-items:center;gap:10px;background:var(--blue-l);border:1px solid var(--line);border-radius:18px;padding:12px 14px;margin-bottom:12px;font-size:14px;line-height:1.5}' +
    '.lb-me b{color:var(--blue);font-size:20px}' +
    '.lb-row{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 12px;margin-bottom:8px}' +
    '.lb-row.me{border-color:var(--blue);background:var(--blue-l)}' +
    '.lb-rk{flex:none;width:34px;text-align:center;font-weight:700;font-size:15px;color:var(--muted)}' +
    '.lb-rk.m{font-size:22px}' +
    '.lb-av{flex:none;width:44px;height:44px;border-radius:50%;background:var(--blue-l);color:var(--blue);display:grid;place-items:center;overflow:hidden;font-weight:700}' +
    '.lb-av img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.lb-nm{flex:1;min-width:0}' +
    '.lb-nm b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lb-nm small{display:block;color:var(--muted);font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lb-v{flex:none;font-weight:700;font-size:16px;color:var(--blue);text-align:end}' +
    '.lb-note{color:var(--muted);font-size:12.5px;line-height:1.7;margin:14px 4px}';

  function injectUI() {
    if (document.getElementById('profile-view')) return;
    var st = document.createElement('style'); st.id = 'pf-style'; st.textContent = CSS; document.head.appendChild(st);
    var host = document.querySelector('main.app') || document.body;
    var v = document.createElement('div');
    v.id = 'profile-view'; v.className = 'view-section';
    v.innerHTML = '<div class="rd-bar"><button class="rd-back" onclick="navBack()" aria-label="ফিরে যান"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg></button><h3>প্রোফাইল</h3></div><div class="pf-wrap" id="pfBody"></div>';
    host.appendChild(v);

    v.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'login') login();
      else if (a === 'logout') logout();
      else if (a === 'edit') openEdit();
      else if (a === 'export') doExport();
      else if (a === 'import') doImport();
      else if (a === 'sync') syncNow(true);
      else if (a === 'list') openList(b.getAttribute('data-k'));
      else if (a === 'last') openLast(b.getAttribute('data-k'));
      else if (a === 'lb') { if (typeof switchView === 'function') switchView('leaderboard'); }
    });

    new MutationObserver(function () { if (v.classList.contains('active')) { render(); preload(); } })
      .observe(v, { attributes: true, attributeFilter: ['class'] });

    var open = document.getElementById('profileOpen');
    if (open) open.addEventListener('click', function () {
      var x = document.getElementById('drawerX'); if (x) x.click();
      if (typeof switchView === 'function') switchView('profile');
    });
  }

  function uname(u) { return u.displayName || (u.email ? u.email.split('@')[0] : ''); }

  var GENDER = { m: 'পুরুষ', f: 'মহিলা' };
  var UN_RE = /^[a-z][a-z0-9_.]{2,19}$/;
  var UN_HELP = '৩–২০ অক্ষর; ইংরেজি ছোট হাতের অক্ষর (a–z), সংখ্যা, _ বা . ; শুরুতে অক্ষর হতে হবে';
  function profFor(uid) { var p = jget(K.prof, null); return (uid && p && typeof p === 'object' && p.uid === uid) ? p : null; }
  function userInfo(u) {
    var p = profFor(u.uid) || {};
    return { uid: u.uid, name: p.name || uname(u), email: u.email || '', photo: p.photo || u.photoURL || '', bio: p.bio || '', gender: p.gender || '', username: p.username || '' };
  }

  function displayUser() {
    if (user) return userInfo(user);
    if (sget(K.on) === '1') { var c = jget(K.user, null); if (c) return c; }
    return null;
  }

  function lastSyncText() {
    if (!hasConfig()) return 'Firebase কনফিগ বসানো হয়নি';
    if (syncing) return 'সিঙ্ক হচ্ছে…';
    if (!displayUser()) return 'লগইন করলে সিঙ্ক হবে';
    if (syncErr) return syncErr;
    var m = meta();
    if (!m.last) return 'এখনো সিঙ্ক হয়নি';
    var t; try { t = new Date(m.last).toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { t = new Date(m.last).toLocaleString(); }
    return 'সর্বশেষ সিঙ্ক: ' + t;
  }

  /* নিচের নেভিগেশনের প্রোফাইল আইকন: লগইন থাকলে ছবি (না থাকলে নামের প্রথম অক্ষর), নইলে সাধারণ আইকন */
  function updateNavAv() {
    var el = document.getElementById('navAv'); if (!el) return;
    var u = displayUser();
    var key = u ? (u.photo || '') + '|' + (u.name || u.email || '') : '';
    if (el.getAttribute('data-k') === key) return;
    el.setAttribute('data-k', key);
    if (!u) {
      el.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c.6-4 3.8-6 7.5-6s6.9 2 7.5 6"/></svg>';
      return;
    }
    var nm = u.name || u.email || '', ch = nm ? Array.from(nm)[0].toUpperCase() : '?';
    setAv(el, u.photo, ch);
    var im = el.querySelector('img');
    if (im) im.onerror = function () { el.textContent = ch; };
  }

  function render() {
    updateNavAv();
    var box = document.getElementById('pfBody'); if (!box) return;
    var u = displayUser(), cs = computeStats();
    var counts = { bm: arr(K.bm).length, pins: pins().length, notes: notes().length };
    var canSync = !!user && !syncing;

    box.innerHTML =
      '<div class="pf-card">' +
        '<div class="pf-user"><div class="pf-av" id="pfAv"></div><div style="min-width:0"><div class="pf-name" id="pfName"></div><div class="pf-mail" id="pfMail"></div><div id="pfExtra"></div></div></div>' +
        '<div class="pf-acts">' +
          (u ? '<button class="pf-act" data-a="edit">' + IC.note.replace('class="i" ', '') + '<span>এডিট</span></button><button class="pf-act" data-a="logout">' + IC.out + '<span>লগ আউট</span></button>'
             : '<button class="pf-act" data-a="login">' + IC.login + '<span>লগইন</span></button>') +
        '</div>' +
      '</div>' +
      '<div class="pf-card" style="padding-top:4px;padding-bottom:4px"><button class="pf-last" data-a="lb"><div class="pf-ic">' + IC.cup + '</div><div class="pf-lt"><span>সবার মধ্যে আপনার অবস্থান</span><b>লিডারবোর্ড দেখুন</b></div>' + IC.chev + '</button></div>' +
      '<div class="pf-h">সর্বমোট কার্যক্রম</div>' +
      '<div class="pf-card"><div class="pf-grid3">' +
        stat('ay', IC.book, cs.ay, 'আয়াত পড়া') +
        stat('hd', IC.hadith, cs.hd, 'হাদিস পড়া') +
        statStatic(IC.tasbih, cs.tb, 'তাসবিহ') +
        stat('bm', IC.bm, counts.bm, 'বুকমার্ক') +
        stat('pins', IC.pin.replace('class="i" ', ''), counts.pins, 'পিন') +
        stat('notes', IC.note.replace('class="i" ', ''), counts.notes, 'নোট') +
      '</div></div>' +
      '<div class="pf-h">সর্বশেষ পড়া</div>' +
      '<div class="pf-card" style="padding-top:4px;padding-bottom:4px">' +
        lastAyahRow(cs.last.ay) +
        lastTopicRow(cs.last.tp) +
      '</div>' +
      '<div class="pf-h">লাইফটাইম অ্যাক্টিভিটি</div>' +
      '<div class="pf-card"><div class="pf-grid2">' +
        row(IC.clock, fmtTime(cs.secs), 'মোট সময়') +
        row(IC.clock, fmtTime(cs.today), 'আজকের সময়') +
        row(IC.cal, num(cs.activeDays), 'সক্রিয় দিন') +
        row(IC.fire, num(cs.streak), 'স্ট্রিক') +
        row(IC.cup, num(cs.best), 'সেরা স্ট্রিক') +
        row(IC.tasbih, num(cs.tbToday), 'আজকের তাসবিহ') +
      '</div></div>';

    var av = box.querySelector('#pfAv');
    if (u && u.photo) {
      var im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = u.photo;
      im.onerror = function () { av.textContent = (u.name || u.email || '?').trim().charAt(0).toUpperCase(); };
      av.appendChild(im);
    } else {
      av.textContent = u ? (u.name || u.email || '?').trim().charAt(0).toUpperCase() : '☪';
    }
    box.querySelector('#pfName').textContent = u ? (u.name || 'ব্যবহারকারী') : 'অতিথি';
    box.querySelector('#pfMail').textContent = u ? u.email : 'লগইন করলে ডেটা ক্লাউডে সংরক্ষিত থাকবে';
    var ex = box.querySelector('#pfExtra');
    if (u && (u.gender || u.bio || u.username)) {
      ex.innerHTML = (u.username ? '<div class="pf-un">@' + esc(u.username) + '</div>' : '') + (GENDER[u.gender] ? '<span class="pf-chip">' + esc(GENDER[u.gender]) + '</span>' : '') +
                     (u.bio ? '<div class="pf-bio">' + esc(u.bio) + '</div>' : '');
    }
    if (u && user) av.setAttribute('data-a', 'edit');
  }
  function stat(k, icon, n, label) {
    return '<button class="pf-st" data-a="list" data-k="' + k + '"><div class="pf-ic">' + icon + '</div><b>' + num(n) + '</b><span>' + label + '</span></button>';
  }
  function row(icon, val, label) {
    return '<div class="pf-row"><div class="pf-ic">' + icon + '</div><div><b>' + val + '</b><span>' + label + '</span></div></div>';
  }
  function statStatic(icon, n, label) {
    return '<div class="pf-st" style="cursor:default"><div class="pf-ic">' + icon + '</div><b>' + num(n) + '</b><span>' + label + '</span></div>';
  }
  function lastRow(kind, icon, label, val, sub, on) {
    return '<button class="pf-last" data-a="last" data-k="' + kind + '"' + (on ? '' : ' disabled') + '><div class="pf-ic">' + icon + '</div>' +
      '<div class="pf-lt"><span>' + label + '</span><b>' + esc(val) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (on ? IC.chev : '') + '</button>';
  }
  function lastAyahRow(l) {
    if (!l || !l.s) return lastRow('ay', IC.book, 'শেষ পড়া আয়াত', 'এখনো কোনো আয়াত পড়া হয়নি', '', false);
    return lastRow('ay', IC.book, 'শেষ পড়া আয়াত', refText(l.s + ':' + l.a), fmtWhen(l.t), true);
  }
  function lastTopicRow(l) {
    if (!l || !l.n) return lastRow('tp', IC.topic, 'সর্বশেষ পড়া বিষয়', 'এখনো কোনো বিষয় পড়া হয়নি', '', false);
    var on = ['sub', 'bio', 'asma', 'hbook'].indexOf(l.f) > -1;
    return lastRow('tp', IC.topic, 'সর্বশেষ পড়া বিষয়', l.n, (l.c ? l.c + ' · ' : '') + fmtWhen(l.t), on);
  }

  /* =====================================================================
     ৫) এক্সপোর্ট / ইম্পোর্ট
     ===================================================================== */
  /* =====================================================================
     লিডারবোর্ড — সবার নাম ও (থাকলে) ছবিসহ। Firestore: leaderboard/{uid}
     স্কোর = আয়াত + হাদিস + (তাসবিহ ÷ ৩৩) + (সময় ÷ ১০ মিনিট) + (সেরা স্ট্রিক × ৫)
     ===================================================================== */
  var LB = { tab: 'score', cache: {}, busy: false, err: '' };
  var LB_TABS = [['score', 'সার্বিক'], ['streak', 'স্ট্রিক'], ['ay', 'আয়াত'], ['hd', 'হাদিস'], ['tb', 'তাসবিহ'], ['secs', 'সময়']];
  var thumbC = { src: '', v: '' }, lbTimer = null;

  function lbScore(cs) { return cs.ay + cs.hd + Math.floor(cs.tb / 33) + Math.floor(cs.secs / 600) + cs.best * 5; }
  function effStreak(x) {
    var y = dkey(new Date(Date.now() - 86400000));
    return (x && x.last && x.last >= y) ? (+x.streak || 0) : 0;
  }

  // লিডারবোর্ডের জন্য ছোট (৭২px) ছবি
  function lbThumb(photo, cb) {
    if (!photo) { cb(''); return; }
    if (photo.indexOf('data:') !== 0) { cb(photo.length <= 600 ? photo : ''); return; }
    if (thumbC.src === photo) { cb(thumbC.v); return; }
    var im = new Image();
    im.onerror = function () { cb(''); };
    im.onload = function () {
      try {
        var S = 72, c = document.createElement('canvas'); c.width = c.height = S;
        var m = Math.min(im.width, im.height);
        c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, S, S);
        var v = c.toDataURL('image/jpeg', 0.72); thumbC = { src: photo, v: v }; cb(v);
      } catch (e) { cb(''); }
    };
    im.src = photo;
  }

  // সিঙ্কের পর নিজের সারাংশ leaderboard-এ পাঠানো (কমপক্ষে ৯০ সেকেন্ড পরপর)
  function publishLb(f, uid, op, u) {
    try {
      var cs = computeStats(), p = op || profFor(uid) || {};
      var name = String(p.name || u.displayName || p.username || '').trim().slice(0, 60) || 'ব্যবহারকারী';
      lbThumb(p.photo || u.photoURL || '', function (th) {
        var d = { name: name, un: String(p.username || '').slice(0, 21), photo: th, ay: cs.ay, hd: cs.hd, tb: cs.tb, secs: cs.secs,
                  streak: cs.streak, best: cs.best, days: cs.activeDays, score: lbScore(cs), last: cs.lastDay || '' };
        var sig = uid + '|' + JSON.stringify(d), now = Date.now();
        var lastT = +sget('lodLbT') || 0, lastS = sget('lodLbSig') || '';
        if (sig === lastS && now - lastT < 6 * 3600000) return;
        if (sig !== lastS && now - lastT < 90000) {
          clearTimeout(lbTimer);
          lbTimer = setTimeout(function () { if (user && !syncing) syncNow(false); }, 90000 - (now - lastT) + 500);
          return;
        }
        d.t = f.F.serverTimestamp();
        f.F.setDoc(f.F.doc(f.db, 'leaderboard', uid), d).then(function () {
          sset('lodLbT', String(Date.now())); sset('lodLbSig', sig); LB.cache = {};
        }).catch(function () {});
      });
    } catch (e) {}
  }

  function lbVal(tab, x) {
    if (tab === 'streak') return num(effStreak(x)) + ' দিন';
    if (tab === 'secs') return fmtTime(+x.secs || 0);
    return num(+x[tab] || 0);
  }
  function lbPhoto(s) { return (typeof s === 'string' && /^(data:image\/|https:\/\/)/.test(s)) ? s : ''; }

  function lbRender() {
    var tabs = document.getElementById('lbTabs'), body = document.getElementById('lbBody'); if (!tabs || !body) return;
    tabs.innerHTML = LB_TABS.map(function (t) {
      return '<button class="lb-tab' + (t[0] === LB.tab ? ' on' : '') + '" data-lb="tab" data-k="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    if (!hasConfig()) { body.innerHTML = '<p class="pf-empty">Firebase কনফিগ বসানো হয়নি</p>'; return; }
    var c = LB.cache[LB.tab];
    if (!c) { body.innerHTML = '<p class="pf-empty">' + (LB.err ? esc(LB.err) : 'লোড হচ্ছে…') + '</p>'; return; }
    var h = '', tab = LB.tab;
    if (!user) {
      h += '<div class="lb-me"><span style="flex:1">লগইন করলে আপনিও এই তালিকায় আসবেন</span><button class="pf-btn" data-lb="login" style="padding:8px 16px">লগইন</button></div>';
    } else if (c.mine) {
      h += '<div class="lb-me"><span style="flex:1">আপনার অবস্থান</span>' + (c.rank ? '<b>#' + num(c.rank) + '</b>' : '<b>—</b>') +
           '<span>' + esc(lbVal(tab, c.mine)) + '</span></div>';
    } else {
      h += '<div class="lb-me"><span>সিঙ্ক হলে আপনার নাম তালিকায় আসবে (কিছুক্ষণ লাগতে পারে)</span></div>';
    }
    if (!c.rows.length) h += '<p class="pf-empty">এখনো কেউ নেই।</p>';
    c.rows.forEach(function (x, i) {
      var me = user && x.uid === user.uid, nm = String(x.name || 'ব্যবহারকারী'), ph = lbPhoto(x.photo);
      var rk = i < 3 ? '<div class="lb-rk m">' + ['🥇', '🥈', '🥉'][i] + '</div>' : '<div class="lb-rk">' + num(i + 1) + '</div>';
      var av = ph ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(ph) + '">' : esc(nm.charAt(0).toUpperCase());
      var sub = 'আয়াত ' + num(+x.ay || 0) + ' · হাদিস ' + num(+x.hd || 0) + ' · স্ট্রিক ' + num(effStreak(x)) + ' দিন';
      h += '<div class="lb-row' + (me ? ' me' : '') + '">' + rk + '<div class="lb-av">' + av + '</div>' +
           '<div class="lb-nm"><b>' + esc(nm) + '</b><small>' + esc(sub) + '</small></div><div class="lb-v">' + esc(lbVal(tab, x)) + '</div></div>';
    });
    h += '<p class="lb-note">এখানে আপনার নাম ও প্রোফাইল ছবি (থাকলে) সবাই দেখতে পাবে। ' +
         'স্কোর = আয়াত + হাদিস + (তাসবিহ ÷ ৩৩) + (সময় ÷ ১০ মিনিট) + (সেরা স্ট্রিক × ৫)। স্ট্রিক মানে টানা প্রতিদিন অ্যাপে আসা।</p>';
    body.innerHTML = h;
  }

  function lbLoad(force) {
    if (!hasConfig()) { lbRender(); return; }
    var tab = LB.tab, c = LB.cache[tab];
    if (!force && c && Date.now() - c.t < 60000) { lbRender(); return; }
    if (LB.busy) return;
    LB.busy = true; LB.err = ''; lbRender();
    fbLoad().then(function (f) {
      var col = f.F.collection(f.db, 'leaderboard');
      return f.F.getDocs(f.F.query(col, f.F.orderBy(tab, 'desc'), f.F.limit(tab === 'streak' ? 60 : 50))).then(function (sn) {
        var rows = []; sn.forEach(function (d) { var x = d.data(); x.uid = d.id; rows.push(x); });
        if (tab === 'streak') {
          rows = rows.filter(function (x) { return effStreak(x) > 0; })
            .sort(function (a, b) { return (effStreak(b) - effStreak(a)) || ((+b.best || 0) - (+a.best || 0)); }).slice(0, 50);
        }
        var res = { t: Date.now(), rows: rows, rank: 0, mine: null };
        var uid = user && user.uid; if (!uid) return res;
        var idx = -1; rows.forEach(function (x, i) { if (x.uid === uid) idx = i; });
        return f.F.getDoc(f.F.doc(f.db, 'leaderboard', uid)).then(function (ms) {
          if (!ms.exists()) return res;
          res.mine = ms.data(); res.mine.uid = uid;
          if (idx > -1) { res.rank = idx + 1; return res; }
          var val = tab === 'streak' ? effStreak(res.mine) : (+res.mine[tab] || 0);
          if (tab === 'streak' && !val) return res;
          return f.F.getCountFromServer(f.F.query(col, f.F.where(tab, '>', val)))
            .then(function (cn) { res.rank = cn.data().count + 1; return res; }).catch(function () { return res; });
        }).catch(function () { return res; });
      });
    }).then(function (res) { LB.cache[tab] = res; })
      .catch(function (e) {
        LB.err = (e && e.code === 'permission-denied') ? 'অনুমতি নেই — Firestore Rules-এ leaderboard যোগ করুন' : 'লোড হয়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন';
      })
      .then(function () {
        LB.busy = false;
        if (!LB.cache[LB.tab] && !LB.err) lbLoad(false); else lbRender();
      });
  }

  function injectLB() {
    if (document.getElementById('leaderboard-view')) return;
    var host = document.querySelector('main.app') || document.body;
    var v = document.createElement('div');
    v.id = 'leaderboard-view'; v.className = 'view-section';
    v.innerHTML = '<div class="rd-bar"><button class="rd-back" onclick="navBack()" aria-label="ফিরে যান"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg></button><h3>লিডারবোর্ড</h3>' +
      '<button class="pf-btn ghost" data-lb="refresh" style="padding:7px 14px;font-size:13px">রিফ্রেশ</button></div>' +
      '<div class="pf-wrap"><div class="lb-tabs" id="lbTabs"></div><div id="lbBody"></div></div>';
    host.appendChild(v);
    v.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]'); if (!b) return;
      var a = b.getAttribute('data-lb');
      if (a === 'tab') { LB.tab = b.getAttribute('data-k'); LB.err = ''; lbLoad(false); }
      else if (a === 'refresh') { LB.cache = {}; lbLoad(true); }
      else if (a === 'login') login();
    });
    new MutationObserver(function () { if (v.classList.contains('active')) { lbLoad(false); preload(); } })
      .observe(v, { attributes: true, attributeFilter: ['class'] });

    // মেনুতে "লিডারবোর্ড" আইটেম (প্রোফাইলের ঠিক নিচে)
    var po = document.getElementById('profileOpen');
    if (po && po.parentNode && !document.getElementById('lbOpen')) {
      var mb = po.cloneNode(true); mb.id = 'lbOpen';
      var sp = mb.querySelector('span'); if (sp) sp.textContent = 'লিডারবোর্ড';
      var ic = mb.querySelector('svg'); if (ic) ic.outerHTML = IC.cup.replace('<svg ', '<svg class="i" ');
      mb.addEventListener('click', function () {
        var x = document.getElementById('drawerX'); if (x) x.click();
        if (typeof switchView === 'function') switchView('leaderboard');
      });
      po.parentNode.insertBefore(mb, po.nextSibling);
    }
  }

  function snapshot() { return { bm: arr(K.bm), pins: pins(), notes: notes(), stats: stats() }; }

  function mergeInto(base, inc) {
    // ইম্পোর্ট/প্রথম-সিঙ্কের জন্য: ইউনিয়ন (কিছু হারায় না)
    var out = { bm: [], pins: [], notes: [], stats: { days: {}, read: {}, ay: {}, hd: {}, tbd: {}, last: {} } };
    function uni(a, b) { var s = {}, r = []; (a || []).concat(b || []).forEach(function (x) { if (typeof x === 'string' && !s[x]) { s[x] = 1; r.push(x); } }); return r; }
    out.bm = uni(base.bm, inc.bm); out.pins = uni(base.pins, inc.pins);
    var nm = {};
    (base.notes || []).concat(inc.notes || []).forEach(function (n) { if (n && n.k && n.x && (!nm[n.k] || (n.t || 0) > (nm[n.k].t || 0))) nm[n.k] = { k: n.k, x: String(n.x).slice(0, 2000), t: n.t || 0 }; });
    out.notes = Object.keys(nm).map(function (k) { return nm[k]; });
    var seen = {};
    function uAdd(f, k, v) {
      var key = f + '\u0001' + k, sm = seen[key] || (seen[key] = {}), vv = normNo(v), id = typeof vv + vv;
      if (sm[id]) return; sm[id] = 1;
      (out.stats[f][k] = out.stats[f][k] || []).push(vv);
    }
    [base.stats, inc.stats].forEach(function (s) {
      if (!s) return;
      Object.keys(s.days || {}).forEach(function (k) { var v = +s.days[k] || 0; if (v > (out.stats.days[k] || 0)) out.stats.days[k] = v; });
      Object.keys(s.read || {}).forEach(function (k) { out.stats.read[k] = 1; });
      ['ay', 'hd'].forEach(function (f) {
        var m = s[f] || {};
        Object.keys(m).forEach(function (k) { if (Array.isArray(m[k])) m[k].forEach(function (v) { uAdd(f, k, v); }); });
      });
      Object.keys(s.tbd || {}).forEach(function (k) { var v = +s.tbd[k] || 0; if (v > (out.stats.tbd[k] || 0)) out.stats.tbd[k] = v; });
      var L = s.last || {};
      Object.keys(L).forEach(function (k) {
        if (L[k] && typeof L[k] === 'object' && (L[k].t || 0) >= ((out.stats.last[k] || {}).t || 0)) out.stats.last[k] = L[k];
      });
    });
    return out;
  }
  function applyLocal(d) {
    jset(K.bm, d.bm); jset(K.pins, d.pins); jset(K.notes, d.notes); jset(K.stats, d.stats);
  }

  function doExport() {
    var data = { app: 'light-of-deen', v: 1, exportedAt: new Date().toISOString(), data: snapshot() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'light-of-deen-backup-' + dkey() + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('ব্যাকআপ ফাইল তৈরি হয়েছে');
  }

  function doImport() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json'; inp.style.display = 'none';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      if (f.size > 5 * 1024 * 1024) { toast('ফাইলটি অনেক বড়'); return; }
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          if (!j || j.app !== 'light-of-deen' || !j.data) throw new Error('bad');
          var merged = mergeInto(snapshot(), {
            bm: j.data.bm, pins: j.data.pins, notes: j.data.notes,
            stats: j.data.stats
          });
          applyLocal(merged); touch('bm'); touch('pins'); touch('notes'); touch('stats');
          render(); toast('ইম্পোর্ট সম্পন্ন হয়েছে');
        } catch (e) { toast('ফাইলটি সঠিক ব্যাকআপ নয়'); }
      };
      r.readAsText(f);
    };
    document.body.appendChild(inp); inp.click();
  }

  /* =====================================================================
     ৬) Firebase: লগইন + Firestore সিঙ্ক
     ===================================================================== */
  var errShown = false, user = null, fbP = null, syncing = false, syncErr = '', again = false, pushTimer = null, authReady = false;

  function cfg() { return window.LOD_FIREBASE || {}; }
  function hasConfig() { var c = cfg(); return !!(c.apiKey && c.projectId && c.appId); }

  function fbLoad() {
    if (!hasConfig()) return Promise.reject(new Error('no-config'));
    if (fbP) return fbP;
    var base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    fbP = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')])
      .then(function (m) {
        var app = m[0].initializeApp(cfg());
        var o = { A: m[1], F: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
        o.A.onAuthStateChanged(o.auth, onAuth);
        return o;
      })
      .catch(function (e) { fbP = null; throw e; });
    return fbP;
  }
  function preload() { if (hasConfig()) fbLoad().catch(function () {}); }

  function onAuth(u) {
    user = u; authReady = true;
    if (u) {
      sset(K.on, '1');
      jset(K.user, userInfo(u));
      render(); syncNow(false);
    } else {
      if (sget(K.on) === '1' && !sget(K.pend)) { /* সেশন শেষ — ক্যাশ করা তথ্য সরাই */ sdel(K.on); sdel(K.user); }
      render();
    }
  }

  /* ---------- লগইন: ইমেইল/পাসওয়ার্ড + Google ---------- */
  var ERR = {
    'auth/invalid-email': 'ইমেইল সঠিক নয়',
    'auth/missing-email': 'ইমেইল লিখুন',
    'auth/missing-password': 'পাসওয়ার্ড দিন',
    'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড ভুল। আগে Google দিয়ে একাউন্ট খুলে থাকলে Google দিয়ে লগইন করুন, অথবা "পাসওয়ার্ড ভুলে গেছেন?" দিয়ে পাসওয়ার্ড সেট করুন',
    'auth/wrong-password': 'পাসওয়ার্ড ভুল',
    'auth/user-not-found': 'এই ইমেইলে কোনো একাউন্ট নেই',
    'auth/user-disabled': 'এই একাউন্ট বন্ধ করা হয়েছে',
    'auth/email-already-in-use': 'এই ইমেইলে আগেই একাউন্ট আছে। লগইন করুন বা পাসওয়ার্ড রিসেট করুন',
    'auth/weak-password': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন',
    'auth/too-many-requests': 'অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করুন',
    'auth/network-request-failed': 'ইন্টারনেট সংযোগ দেখুন',
    'auth/operation-not-allowed': 'Firebase Console-এ Email/Password চালু করা হয়নি',
    'auth/unauthorized-domain': 'এই ডোমেইন Firebase → Authorized domains এ যোগ করুন'
  };

  function login() { openLogin('login'); }

  function openLogin(mode) {
    if (!hasConfig()) { toast('firebase-config.js এ Firebase কনফিগ বসান'); return; }
    mode = mode || 'login';
    var sign = mode === 'signup', reset = mode === 'reset';
    var title = reset ? 'পাসওয়ার্ড রিসেট' : sign ? 'নতুন একাউন্ট' : 'লগইন';
    var btn = reset ? 'রিসেট লিংক পাঠান' : sign ? 'সাইন আপ' : 'লগইন';
    var html = '<h3 class="pf-mh">' + title + '</h3>' +
      (reset ? '<p class="pf-empty" style="padding:0 0 12px;text-align:start">আপনার ইমেইল দিন, পাসওয়ার্ড বদলানোর লিংক পাঠানো হবে।</p>' : '') +
      (sign ? '<input class="pf-in" id="pfLName" type="text" maxlength="60" autocomplete="name" placeholder="আপনার নাম (ঐচ্ছিক)">' : '') +
      '<input class="pf-in" id="pfLEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="ইমেইল">' +
      (reset ? '' : '<input class="pf-in" id="pfLPass" type="password" autocomplete="' + (sign ? 'new-password' : 'current-password') + '" placeholder="পাসওয়ার্ড">') +
      '<div class="pf-err" id="pfLErr" role="alert"></div>' +
      '<button class="pf-btn pf-full" data-m="submit">' + btn + '</button>' +
      (mode === 'login' ? '<button class="pf-link" data-m="reset">পাসওয়ার্ড ভুলে গেছেন?</button>' : '') +
      (reset ? '' : '<div class="pf-or"><span>অথবা</span></div><button class="pf-btn ghost pf-full pf-gbtn" data-m="google">' + IC.g + '<span>Google দিয়ে চালিয়ে যান</span></button>') +
      '<div class="pf-switch">' + (mode === 'login'
        ? 'একাউন্ট নেই? <button data-m="signup">সাইন আপ</button>'
        : 'একাউন্ট আছে? <button data-m="login">লগইন</button>') + '</div>' +
      '<div class="pf-mrow"><span style="flex:1"></span><button class="pf-btn ghost" data-m="x">বন্ধ</button></div>';

    openModal(html, function (act, box, b) {
      if (act === 'x') { closeModal(); return; }
      if (act === 'google') { closeModal(); loginGoogle(); return; }
      if (act === 'login' || act === 'signup' || act === 'reset') { openLogin(act); return; }
      if (act === 'submit') emailAuth(mode, box, b);
    }, function (box) {
      var em = box.querySelector('#pfLEmail');
      box.querySelectorAll('.pf-in').forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); box.querySelector('[data-m="submit"]').click(); }
        });
      });
      setTimeout(function () { if (em) em.focus(); }, 80);
    });
  }

  function emailAuth(mode, box, btn) {
    var err = box.querySelector('#pfLErr');
    var em = box.querySelector('#pfLEmail').value.trim();
    var pwEl = box.querySelector('#pfLPass'), pw = pwEl ? pwEl.value : '';
    var nmEl = box.querySelector('#pfLName'), nm = nmEl ? nmEl.value.trim() : '';
    function fail(e) {
      var c = e && e.code;
      err.textContent = ERR[c] || ('কিছু একটা সমস্যা হয়েছে' + (c ? ' (' + c + ')' : ''));
      btn.disabled = false;
    }
    err.textContent = '';
    if (!em) { err.textContent = ERR['auth/missing-email']; return; }
    if (mode !== 'reset' && !pw) { err.textContent = ERR['auth/missing-password']; return; }
    btn.disabled = true;

    fbLoad().then(function (f) {
      if (mode === 'reset') {
        return f.A.sendPasswordResetEmail(f.auth, em).then(function () {
          closeModal(); toast('রিসেট লিংক ইমেইলে পাঠানো হয়েছে (স্প্যামও দেখুন)');
        });
      }
      if (mode === 'signup') {
        return f.A.createUserWithEmailAndPassword(f.auth, em, pw).then(function (cred) {
          closeModal(); toast('একাউন্ট তৈরি হয়েছে — ইমেইলে যাচাই লিংক পাঠানো হয়েছে (স্প্যামও দেখুন)');
          f.A.sendEmailVerification(cred.user).catch(function () {});
          var pr = nm ? f.A.updateProfile(cred.user, { displayName: nm }).catch(function () {}) : Promise.resolve();
          return pr.then(function () {
            jset(K.user, userInfo(cred.user)); render(); syncNow(false);
            setTimeout(openEdit, 500);   // একাউন্ট খোলার পরপরই প্রোফাইল সম্পূর্ণ করার শিট
          });
        });
      }
      return f.A.signInWithEmailAndPassword(f.auth, em, pw).then(function () {
        closeModal(); toast('লগইন সম্পন্ন');
      });
    }).catch(function (e) {
      if (e && e.message === 'no-config') { err.textContent = 'Firebase কনফিগ বসানো হয়নি'; btn.disabled = false; return; }
      if (e && !e.code) { err.textContent = 'Firebase লোড করা যায়নি — ইন্টারনেট দেখুন'; btn.disabled = false; return; }
      fail(e);
    });
  }

  function loginGoogle() {
    fbLoad().then(function (f) {
      var p = new f.A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      return f.A.signInWithPopup(f.auth, p).catch(function (e) {
        var c = e && e.code;
        if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') {
          sset(K.pend, '1'); sset(K.on, '1');
          return f.A.signInWithRedirect(f.auth, p);
        }
        if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
        if (c === 'auth/unauthorized-domain') toast('এই ডোমেইন Firebase → Authorized domains এ যোগ করুন');
        else toast('লগইন ব্যর্থ' + (c ? ' (' + c + ')' : ''));
      });
    }).catch(function () { toast('Firebase লোড করা যায়নি — ইন্টারনেট দেখুন'); });
  }

  /* ---------- প্রোফাইল এডিট: নাম, পরিচয়, লিঙ্গ, ছবি ---------- */
  function setAv(el, photo, ch) {
    el.textContent = '';
    if (photo) { var im = document.createElement('img'); im.alt = ''; im.src = photo; el.appendChild(im); }
    else el.textContent = ch;
  }

  // ছবি চৌকো করে কেটে ২৫৬×২৫৬ JPEG বানায় (ছোট সাইজ, Firestore-এ রাখা যায়)
  function resizeImg(file, cb) {
    var r = new FileReader();
    r.onerror = function () { cb(null); };
    r.onload = function () {
      var im = new Image();
      im.onerror = function () { cb(null); };
      im.onload = function () {
        try {
          var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
          var m = Math.min(im.width, im.height);
          c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, S, S);
          cb(c.toDataURL('image/jpeg', 0.82));
        } catch (e) { cb(null); }
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  // ইউজারনেম ইউনিক রাখতে usernames/{নাম} ডকুমেন্টে uid লিখে "দখল" করা হয় (ট্রানজেকশনে)
  function claimUsername(nu, old) {
    return fbLoad().then(function (f) {
      var F = f.F, db = f.db, uid = user.uid;
      return F.runTransaction(db, function (tx) {
        var nr = nu ? F.doc(db, 'usernames', nu) : null, orf = old ? F.doc(db, 'usernames', old) : null;
        return Promise.all([nr ? tx.get(nr) : null, orf ? tx.get(orf) : null]).then(function (r) {
          var ns = r[0], os = r[1];
          if (ns && ns.exists() && ns.data().uid !== uid) throw { code: 'lod/username-taken' };
          if (nr && !ns.exists()) tx.set(nr, { uid: uid, t: Date.now() });
          if (orf && os && os.exists() && os.data().uid === uid) tx.delete(orf);
        });
      });
    });
  }

  function openEdit() {
    if (!user) { login(); return; }
    var p0 = profFor(user.uid) || {}, cur = displayUser(), pend;   // pend: undefined = ছবি বদলায়নি
    var initial = (cur.name || cur.email || '?').trim().charAt(0).toUpperCase();
    openModal(
      '<h3 class="pf-mh">প্রোফাইল এডিট</h3>' +
      '<div class="pf-av pf-av-lg" id="pfEdAv"></div>' +
      '<div class="pf-ph"><button class="pf-btn ghost" data-m="photo">ছবি বদলান</button><button class="pf-btn ghost" data-m="rmphoto">ছবি সরান</button></div>' +
      '<input type="file" id="pfPhotoIn" accept="image/*" hidden>' +
      '<label class="pf-lbl" for="pfEdName">নাম</label>' +
      '<input class="pf-in" id="pfEdName" type="text" maxlength="50" autocomplete="name">' +
      '<label class="pf-lbl" for="pfEdUser">ইউজারনেম</label>' +
      '<input class="pf-in" id="pfEdUser" type="text" maxlength="21" dir="ltr" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="username">' +
      '<div class="pf-hint" id="pfEdUH"></div>' +
      '<label class="pf-lbl" for="pfEdBio">পরিচয়</label>' +
      '<textarea class="pf-ta" id="pfEdBio" rows="3" maxlength="160" placeholder="নিজের সম্পর্কে সংক্ষেপে লিখুন" style="margin-bottom:10px"></textarea>' +
      '<label class="pf-lbl" for="pfEdG">লিঙ্গ</label>' +
      '<select class="pf-in" id="pfEdG"><option value="">উল্লেখ করতে চাই না</option><option value="m">পুরুষ</option><option value="f">মহিলা</option></select>' +
      '<div class="pf-err" id="pfEdErr"></div>' +
      '<div class="pf-mrow"><span style="flex:1"></span><button class="pf-btn ghost" data-m="x">বাতিল</button><button class="pf-btn" data-m="save">সেভ</button></div>',
      function (act, box) {
        var av = box.querySelector('#pfEdAv');
        if (act === 'x') { closeModal(); return; }
        if (act === 'photo') { box.querySelector('#pfPhotoIn').click(); return; }
        if (act === 'rmphoto') { pend = ''; setAv(av, user.photoURL || '', initial); return; }
        if (act === 'save') {
          var btn = box.querySelector('[data-m="save"]'), err = box.querySelector('#pfEdErr');
          var nu = box.querySelector('#pfEdUser').value.trim().replace(/^@/, '').toLowerCase();
          var old = p0.username || '';
          err.textContent = '';
          if (nu && !UN_RE.test(nu)) { err.textContent = 'ইউজারনেম: ' + UN_HELP; return; }
          btn.disabled = true;
          var done = function () {
            var np = profFor(user.uid) || { uid: user.uid };
            np.uid = user.uid;
            np.name = box.querySelector('#pfEdName').value.trim();
            np.bio = box.querySelector('#pfEdBio').value.trim();
            np.gender = box.querySelector('#pfEdG').value;
            np.username = nu;
            if (pend !== undefined) np.photo = pend;
            np.t = Date.now();
            jset(K.prof, np);
            jset(K.user, userInfo(user));
            touch('prof');
            closeModal(); render(); toast('প্রোফাইল সেভ হয়েছে');
          };
          if (nu === old) { done(); return; }
          claimUsername(nu, old).then(done).catch(function (e) {
            btn.disabled = false;
            var c = e && e.code;
            err.textContent = c === 'lod/username-taken' ? 'এই ইউজারনেম আগেই নেওয়া হয়েছে, অন্যটা চেষ্টা করুন'
              : c === 'permission-denied' ? 'অনুমতি নেই — Firestore Rules-এ usernames যোগ করুন'
              : 'ইউজারনেম সেভ হয়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন';
          });
        }
      },
      function (box) {
        var av = box.querySelector('#pfEdAv'), nameEl = box.querySelector('#pfEdName');
        setAv(av, cur.photo, initial);
        nameEl.value = p0.name || user.displayName || '';
        nameEl.placeholder = user.email ? user.email.split('@')[0] : 'আপনার নাম';
        box.querySelector('#pfEdBio').value = p0.bio || '';
        var ue = box.querySelector('#pfEdUser'), hint = box.querySelector('#pfEdUH'), tmr;
        ue.value = p0.username || '';
        hint.textContent = UN_HELP;
        ue.addEventListener('input', function () {
          clearTimeout(tmr);
          var v = ue.value.trim().replace(/^@/, '').toLowerCase();
          hint.style.color = ''; hint.textContent = UN_HELP;
          if (!v || v === (p0.username || '')) return;
          if (!UN_RE.test(v)) { hint.style.color = '#e5484d'; return; }
          hint.textContent = 'যাচাই হচ্ছে…';
          tmr = setTimeout(function () {
            fbLoad().then(function (f) { return f.F.getDoc(f.F.doc(f.db, 'usernames', v)); }).then(function (sn) {
              if (ue.value.trim().replace(/^@/, '').toLowerCase() !== v) return;
              if (sn.exists() && sn.data().uid !== user.uid) { hint.style.color = '#e5484d'; hint.textContent = 'এই ইউজারনেম নেওয়া হয়ে গেছে'; }
              else { hint.style.color = '#2e9e5b'; hint.textContent = 'ইউজারনেমটি পাওয়া যাবে ✓'; }
            }).catch(function () { hint.textContent = UN_HELP; });
          }, 500);
        });
        box.querySelector('#pfEdG').value = p0.gender || '';
        box.querySelector('#pfPhotoIn').addEventListener('change', function () {
          var f = this.files && this.files[0]; this.value = '';
          if (!f) return;
          if (f.size > 12 * 1024 * 1024) { toast('ছবিটি অনেক বড়'); return; }
          resizeImg(f, function (d) {
            if (!d) { toast('ছবিটি পড়া যায়নি, অন্য ছবি দিন'); return; }
            pend = d; setAv(av, d, initial);
          });
        });
      }
    );
  }

  function logout() {
    fbLoad().then(function (f) { return f.A.signOut(f.auth); }).catch(function () {}).then(function () {
      user = null; sdel(K.on); sdel(K.user); sdel(K.pend); syncErr = ''; render(); toast('লগ আউট হয়েছে');
    });
  }

  function touch(kind) {
    var m = meta(); m[kind + 'T'] = Date.now(); jset(K.meta, m);
    if (document.getElementById('profile-view') && document.getElementById('profile-view').classList.contains('active')) render();
    if (!user) return;
    clearTimeout(pushTimer); pushTimer = setTimeout(function () { syncNow(false); }, 4000);
  }

  function syncNow(manual) {
    if (!user) { if (manual) toast('আগে লগইন করুন'); return Promise.resolve(); }
    if (syncing) { again = true; return Promise.resolve(); }
    syncing = true; syncErr = ''; timeDirty = false; render();
    var uid = user.uid;
    return fbLoad().then(function (f) {
      var ref = f.F.doc(f.db, 'users', uid);
      return f.F.getDoc(ref).then(function (snap) {
        var cloud = snap.exists() ? snap.data() : null, m = meta();
        var first = m.uid !== uid;
        var local = snapshot();
        // অন্য অ্যাকাউন্টের ডেটা এই ফোনে থাকলে (আগে সিঙ্ক হয়েছিল) — মিশে না গিয়ে আলাদা থাকবে
        if (first && m.uid) { local = { bm: [], pins: [], notes: [], stats: { days: {}, read: {}, ay: {}, hd: {}, tbd: {}, last: {} } }; m = {}; }
        var res = {};
        ['bm', 'pins', 'notes'].forEach(function (k) {
          var lt = m[k + 'T'] || 0, ct = cloud ? (cloud[k + 'T'] || 0) : 0;
          if (!cloud) res[k] = { v: local[k], t: lt };
          else if (first) res[k] = { v: null, t: Math.max(lt, ct) };       // নিচে ইউনিয়ন হবে
          else if (lt > ct) res[k] = { v: local[k], t: lt };
          else res[k] = { v: cloud[k] || [], t: ct };
        });
        var cs = cloud && cloud.stats ? cloud.stats : { days: {}, read: {} };
        var merged = mergeInto({ stats: local.stats }, { stats: cs }); // সময়/পড়া সবসময় ইউনিয়ন/ম্যাক্স
        var out = { stats: merged.stats };
        if (first && cloud) {
          var u2 = mergeInto({ bm: local.bm, pins: local.pins, notes: local.notes }, { bm: cloud.bm, pins: cloud.pins, notes: cloud.notes });
          out.bm = u2.bm; out.pins = u2.pins; out.notes = u2.notes;
        } else {
          out.bm = res.bm.v; out.pins = res.pins.v; out.notes = res.notes.v;
        }
        out.bm = (out.bm || []).filter(function (x) { return typeof x === 'string'; });
        out.pins = (out.pins || []).filter(function (x) { return typeof x === 'string'; });
        out.notes = (out.notes || []).filter(function (n) { return n && n.k && n.x; });
        // প্রোফাইল তথ্য (নাম/পরিচয়/লিঙ্গ/ছবি): যেটা নতুন সেটা জেতে
        var lp = profFor(uid), lpT = m.profT || 0;
        var cp = (cloud && cloud.prof && typeof cloud.prof === 'object') ? cloud.prof : null, cpT = cloud ? (cloud.profT || 0) : 0;
        var op, opT;
        if (!cp) { op = lp; opT = lp ? (lpT || Date.now()) : 0; }
        else if (!lp || cpT > lpT) { op = cp; opT = cpT; }
        else { op = lp; opT = lpT; }
        if (op) jset(K.prof, { uid: uid, name: op.name || '', bio: op.bio || '', gender: op.gender || '', photo: op.photo || '', username: op.username || '', t: opT });
        applyLocal(out);

        var now = Date.now(), nm = { uid: uid, last: now, bmT: res.bm.t || now, pinsT: res.pins.t || now, notesT: res.notes.t || now, profT: opT || 0 };
        if (first) { nm.bmT = nm.pinsT = nm.notesT = now; }
        jset(K.meta, nm);

        var u = user;
        return f.F.setDoc(ref, {
          v: 1, name: (op && op.name) || u.displayName || '', email: u.email || '', photo: u.photoURL || '',
          bm: out.bm, pins: out.pins, notes: out.notes, bmT: nm.bmT, pinsT: nm.pinsT, notesT: nm.notesT,
          stats: out.stats, profT: opT || 0,
          prof: op ? { name: op.name || '', bio: op.bio || '', gender: op.gender || '', photo: op.photo || '', username: op.username || '' } : null,
          updatedAt: f.F.serverTimestamp()
        }).then(function () { publishLb(f, uid, op, u); });
      });
    }).catch(function (e) {
      var c = e && e.code;
      syncErr = (c === 'permission-denied') ? 'অনুমতি নেই — Firestore Rules দেখুন'
              : (c === 'unavailable' || !navigator.onLine) ? 'ইন্টারনেট নেই — পরে সিঙ্ক হবে'
              : 'সিঙ্ক ব্যর্থ — আবার চেষ্টা করুন';
      if (manual || (c !== 'unavailable' && navigator.onLine && !errShown)) { errShown = true; toast(syncErr); }
    }).then(function () {
      syncing = false; render();
      if (manual && !syncErr) toast('সিঙ্ক সম্পন্ন');
      if (again) { again = false; clearTimeout(pushTimer); pushTimer = setTimeout(function () { syncNow(false); }, 1500); }
    });
  }

  // সময় ট্র্যাকিংয়ের পরিবর্তন মাঝেমধ্যে ক্লাউডে পাঠানো
  setInterval(function () { if (user && timeDirty && !syncing) syncNow(false); }, 180000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && user && timeDirty && !syncing) syncNow(false);
    else if (document.visibilityState === 'visible' && user && !syncing) {
      var m = meta(); if (!m.last || Date.now() - m.last > 600000) syncNow(false);
    }
  });
  window.addEventListener('online', function () { if (user && !syncing) syncNow(false); });

  /* =====================================================================
     ৭) চালু করা
     ===================================================================== */
  window.LODP = { btns: btns, bind: bind, onRead: onRead, touch: touch, open: function () { if (typeof switchView === 'function') switchView('profile'); } };

  function init() {
    injectUI();
    updateNavAv();
    injectLB();
    setupTracking();
    // আগে লগইন করা থাকলে বা রিডাইরেক্ট থেকে ফিরলে সেশন ফেরত আনি
    if (hasConfig() && (sget(K.on) === '1' || sget(K.pend))) {
      setTimeout(function () {
        fbLoad().then(function (f) {
          if (sget(K.pend)) { return f.A.getRedirectResult(f.auth).catch(function () {}).then(function () { sdel(K.pend); }); }
        }).catch(function () {});
      }, 600);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
