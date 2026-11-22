/* =====================================================================
   Light of Deen — প্রোফাইল, স্ট্যাটস, পিন/নোট, এক্সপোর্ট/ইম্পোর্ট ও Firebase সিঙ্ক
   নির্ভর করে: firebase-config.js (আগে লোড হবে) এবং index.html-এর switchView / openSurah
   ডেটা প্রথমে localStorage-এ থাকে (অফলাইনেও চলে), লগইন থাকলে Firestore-এ সিঙ্ক হয়।
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- স্টোরেজ কী ---------- */
  var K = { bm: 'quranBookmarks', pins: 'lodPins', notes: 'lodNotes', stats: 'lodProfile', meta: 'lodSyncMeta', user: 'lodUser', on: 'lodAuthOn', pend: 'lodAuthPending' };
  var FB_VER = '10.14.1';

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sdel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function arr(k) { var v = jget(k, []); return Array.isArray(v) ? v : []; }
  function stats() { var s = jget(K.stats, null); if (!s || typeof s !== 'object') s = {}; if (!s.days || typeof s.days !== 'object') s.days = {}; if (!s.read || typeof s.read !== 'object') s.read = {}; return s; }
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

  function computeStats() {
    var s = stats(), secs = 0, active = [];
    Object.keys(s.days).forEach(function (k) {
      var v = +s.days[k] || 0; secs += v;
      if (v >= 10) active.push(dnum(k));
    });
    active.sort(function (a, b) { return a - b; });
    var best = 0, run = 0, prev = null;
    active.forEach(function (d) { run = (prev !== null && d === prev + 1) ? run + 1 : 1; if (run > best) best = run; prev = d; });
    var set = {}; active.forEach(function (d) { set[d] = 1; });
    var today = dnum(dkey()), cur = 0, d = set[today] ? today : today - 1;
    while (set[d]) { cur++; d--; }
    return { secs: secs, activeDays: active.length, streak: cur, best: best, read: Object.keys(s.read).length };
  }

  function fmtTime(secs) {
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
    var title, items = [];
    if (kind === 'bm') { title = 'বুকমার্ক'; items = arr(K.bm).map(function (k) { return { k: k }; }); }
    else if (kind === 'pins') { title = 'পিন'; items = pins().map(function (k) { return { k: k }; }); }
    else if (kind === 'notes') { title = 'নোট'; items = notes().slice().sort(function (a, b) { return b.t - a.t; }); }
    else if (kind === 'read') {
      title = 'পড়া সূরা';
      items = Object.keys(stats().read).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return { k: n + ':1', surah: true }; });
    }
    var html = '<h3 class="pf-mh">' + esc(title) + ' (' + num(items.length) + ')</h3>';
    if (!items.length) html += '<p class="pf-empty">এখনো কিছু নেই।</p>';
    items.forEach(function (it, i) {
      var p = String(it.k).split(':');
      var label = it.surah ? 'সূরা ' + sname(+p[0]) : refText(it.k);
      html += '<div class="pf-li"><button class="pf-li-main" data-m="open" data-i="' + i + '"><b>' + esc(label) + '</b>' +
              (it.x ? '<small>' + esc(it.x) + '</small>' : '') + '</button>' +
              (it.surah ? '' : '<button class="pf-li-x" data-m="rm" data-i="' + i + '" aria-label="সরান">✕</button>') + '</div>';
    });
    html += '<div class="pf-mrow"><span style="flex:1"></span><button class="pf-btn ghost" data-m="x">বন্ধ</button></div>';
    openModal(html, function (act, box, b) {
      var i = +b.getAttribute('data-i'), it = items[i];
      if (act === 'x') { closeModal(); return; }
      if (act === 'open' && it) {
        closeModal();
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
    '.pf-acts{display:grid;grid-template-columns:repeat(3,1fr);margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}' +
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
    '.ayah-foot button.b-pin.on,.ayah-foot button.b-note.on{color:var(--blue)}' +
    '.ayah-foot button.b-pin.on svg{fill:currentColor}';

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
      else if (a === 'export') doExport();
      else if (a === 'import') doImport();
      else if (a === 'sync') syncNow(true);
      else if (a === 'list') openList(b.getAttribute('data-k'));
    });

    new MutationObserver(function () { if (v.classList.contains('active')) { render(); preload(); } })
      .observe(v, { attributes: true, attributeFilter: ['class'] });

    var open = document.getElementById('profileOpen');
    if (open) open.addEventListener('click', function () {
      var x = document.getElementById('drawerX'); if (x) x.click();
      if (typeof switchView === 'function') switchView('profile');
    });
  }

  function displayUser() {
    if (user) return { name: user.displayName || '', email: user.email || '', photo: user.photoURL || '' };
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

  function render() {
    var box = document.getElementById('pfBody'); if (!box) return;
    var u = displayUser(), cs = computeStats();
    var counts = { bm: arr(K.bm).length, pins: pins().length, notes: notes().length };
    var canSync = !!user && !syncing;

    box.innerHTML =
      '<div class="pf-card">' +
        '<div class="pf-user"><div class="pf-av" id="pfAv"></div><div style="min-width:0"><div class="pf-name" id="pfName"></div><div class="pf-mail" id="pfMail"></div></div></div>' +
        '<div class="pf-acts">' +
          (u ? '<button class="pf-act" data-a="logout">' + IC.out + '<span>লগ আউট</span></button>'
             : '<button class="pf-act" data-a="login">' + IC.login + '<span>লগইন</span></button>') +
          '<button class="pf-act" data-a="export">' + IC.up + '<span>এক্সপোর্ট</span></button>' +
          '<button class="pf-act" data-a="import">' + IC.down + '<span>ইম্পোর্ট</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="pf-card pf-sync">' +
        '<div class="pf-g">' + IC.g + '</div>' +
        '<div class="pf-sync-t"><b>Google Sync</b><div class="pf-sync-s">' + (user && !syncErr ? IC.cloud : IC.cloudOff) + '<span id="pfSyncT"></span></div></div>' +
        (u ? '<button class="pf-btn ghost" data-a="sync"' + (canSync ? '' : ' disabled') + '>' + (syncing ? 'সিঙ্ক হচ্ছে' : 'সিঙ্ক করুন') + '</button>'
           : '<button class="pf-btn" data-a="login">Google লগইন</button>') +
      '</div>' +
      '<div class="pf-h">সর্বমোট কার্যক্রম</div>' +
      '<div class="pf-card"><div class="pf-grid4">' +
        stat('read', IC.book, cs.read, 'পড়া') +
        stat('bm', IC.bm, counts.bm, 'বুকমার্ক') +
        stat('pins', IC.pin.replace('class="i" ', ''), counts.pins, 'পিন') +
        stat('notes', IC.note.replace('class="i" ', ''), counts.notes, 'নোট') +
      '</div></div>' +
      '<div class="pf-h">লাইফটাইম অ্যাক্টিভিটি</div>' +
      '<div class="pf-card"><div class="pf-grid2">' +
        row(IC.clock, fmtTime(cs.secs), 'সময়') +
        row(IC.cal, num(cs.activeDays), 'সক্রিয় দিন') +
        row(IC.fire, num(cs.streak), 'স্ট্রিক') +
        row(IC.cup, num(cs.best), 'সেরা স্ট্রিক') +
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
    box.querySelector('#pfSyncT').textContent = lastSyncText();
  }
  function stat(k, icon, n, label) {
    return '<button class="pf-st" data-a="list" data-k="' + k + '"><div class="pf-ic">' + icon + '</div><b>' + num(n) + '</b><span>' + label + '</span></button>';
  }
  function row(icon, val, label) {
    return '<div class="pf-row"><div class="pf-ic">' + icon + '</div><div><b>' + val + '</b><span>' + label + '</span></div></div>';
  }

  /* =====================================================================
     ৫) এক্সপোর্ট / ইম্পোর্ট
     ===================================================================== */
  function snapshot() { return { bm: arr(K.bm), pins: pins(), notes: notes(), stats: stats() }; }

  function mergeInto(base, inc) {
    // ইম্পোর্ট/প্রথম-সিঙ্কের জন্য: ইউনিয়ন (কিছু হারায় না)
    var out = { bm: [], pins: [], notes: [], stats: { days: {}, read: {} } };
    function uni(a, b) { var s = {}, r = []; (a || []).concat(b || []).forEach(function (x) { if (typeof x === 'string' && !s[x]) { s[x] = 1; r.push(x); } }); return r; }
    out.bm = uni(base.bm, inc.bm); out.pins = uni(base.pins, inc.pins);
    var nm = {};
    (base.notes || []).concat(inc.notes || []).forEach(function (n) { if (n && n.k && n.x && (!nm[n.k] || (n.t || 0) > (nm[n.k].t || 0))) nm[n.k] = { k: n.k, x: String(n.x).slice(0, 2000), t: n.t || 0 }; });
    out.notes = Object.keys(nm).map(function (k) { return nm[k]; });
    [base.stats, inc.stats].forEach(function (s) {
      if (!s) return;
      Object.keys(s.days || {}).forEach(function (k) { var v = +s.days[k] || 0; if (v > (out.stats.days[k] || 0)) out.stats.days[k] = v; });
      Object.keys(s.read || {}).forEach(function (k) { out.stats.read[k] = 1; });
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
  var user = null, fbP = null, syncing = false, syncErr = '', again = false, pushTimer = null, authReady = false;

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
      jset(K.user, { name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' });
      render(); syncNow(false);
    } else {
      if (sget(K.on) === '1' && !sget(K.pend)) { /* সেশন শেষ — ক্যাশ করা তথ্য সরাই */ sdel(K.on); sdel(K.user); }
      render();
    }
  }

  function login() {
    if (!hasConfig()) { toast('firebase-config.js এ Firebase কনফিগ বসান'); return; }
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
        if (first && m.uid) { local = { bm: [], pins: [], notes: [], stats: { days: {}, read: {} } }; m = {}; }
        var res = {};
        ['bm', 'pins', 'notes'].forEach(function (k) {
          var lt = m[k + 'T'] || 0, ct = cloud ? (cloud[k + 'T'] || 0) : 0;
          if (!cloud) res[k] = { v: local[k], t: lt };
          else if (first) res[k] = { v: null, t: Math.max(lt, ct) };       // নিচে ইউনিয়ন হবে
          else if (lt > ct) res[k] = { v: local[k], t: lt };
          else res[k] = { v: cloud[k] || [], t: ct };
        });
        var cs = cloud && cloud.stats ? { days: cloud.stats.days || {}, read: cloud.stats.read || {} } : { days: {}, read: {} };
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
        applyLocal(out);

        var now = Date.now(), nm = { uid: uid, last: now, bmT: res.bm.t || now, pinsT: res.pins.t || now, notesT: res.notes.t || now };
        if (first) { nm.bmT = nm.pinsT = nm.notesT = now; }
        jset(K.meta, nm);

        var u = user;
        return f.F.setDoc(ref, {
          v: 1, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '',
          bm: out.bm, pins: out.pins, notes: out.notes, bmT: nm.bmT, pinsT: nm.pinsT, notesT: nm.notesT,
          stats: out.stats, updatedAt: f.F.serverTimestamp()
        });
      });
    }).catch(function (e) {
      var c = e && e.code;
      syncErr = (c === 'permission-denied') ? 'অনুমতি নেই — Firestore Rules দেখুন'
              : (c === 'unavailable' || !navigator.onLine) ? 'ইন্টারনেট নেই — পরে সিঙ্ক হবে'
              : 'সিঙ্ক ব্যর্থ — আবার চেষ্টা করুন';
      if (manual) toast(syncErr);
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
