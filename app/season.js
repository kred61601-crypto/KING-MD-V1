/* Seasonal themes in the app (Admin → Page Management → Seasonal Themes). One celebration at a time, off until the admin turns it on.
   The app dresses up the app way: falling snow / confetti / hearts…, a hat or badge on the logo, a string of lights under the top bar,
   matching colours (people who picked their own accent colour keep it) and a small greeting card at the top of Home.
   It is all decoration: nothing here takes a tap, it stops for people who asked their phone for less motion, it is lighter on
   Android / smooth mode, and a mistake in here can never break the app. */
(function () {
  'use strict';
  var EH = window.EH; if (!EH) return;

  function svg(inner, vb) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 64 52') + '">' + inner + '</svg>'; }
  function edge(inner) { return svg(inner, '0 0 56 14').replace('<svg ', '<svg width="56" height="14" '); }
  function bunting(colors) {   // a string with little flags hanging from it
    var w = 22 * colors.length, s = '<path d="M0 2 Q' + (w / 2) + ' 5 ' + w + ' 2" stroke="#9ca3af" stroke-width="1" fill="none"/>';
    colors.forEach(function (c, i) { var x = i * 22 + 3; s += '<path d="M' + x + ' 2.8 L' + (x + 16) + ' 3.4 L' + (x + 8) + ' 13Z" fill="' + c + '" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>'; });
    return svg(s, '0 0 ' + w + ' 14').replace('<svg ', '<svg width="' + w + '" height="14" ');
  }

  /* p = main colour, p2 = second colour of the gradients (buttons, hero), hex = the big badge colour on the Home card */
  var S = {
    christmas: { name: 'Christmas', icon: '🎄', title: 'Merry Christmas!', hi: '🎄 Merry Christmas from EMMYHENZ V4!', p: '#dc2626', p2: '#16a34a', rgb: '220,38,38',
      fx: [{ kind: 'fall', glyphs: ['❄', '❅', '❆'], n: [9, 20], sz: [10, 19], dur: [9, 17], color: '#e0f2fe', glow: 'rgba(56,189,248,.9)' }],
      hat: svg('<path d="M8 44C10 22 24 8 44 8c10 0 14 8 12 16-2 8 0 14 2 20Z" fill="#dc2626"/><path d="M10 40C14 28 22 18 34 12" stroke="#f87171" stroke-width="3" fill="none" opacity=".7"/><rect x="3" y="39" width="58" height="12" rx="6" fill="#fff"/><circle cx="50" cy="9" r="6.5" fill="#fff"/>'),
      edge: edge('<path d="M0 2Q14 11 28 2T56 2" stroke="#374151" stroke-width="1.3" fill="none"/><g><circle cx="14" cy="9" r="3.4" fill="#ef4444"/><circle cx="42" cy="9" r="3.4" fill="#22c55e"/><circle cx="28" cy="4.6" r="3.2" fill="#fbbf24"/><circle cx="1" cy="4.4" r="3.2" fill="#38bdf8"/><circle cx="55" cy="4.4" r="3.2" fill="#38bdf8"/></g><g fill="#fff" opacity=".6"><circle cx="13" cy="8" r="1"/><circle cx="41" cy="8" r="1"/><circle cx="27" cy="3.6" r="1"/></g>') },
    newyear: { name: 'New Year', icon: '🎆', title: 'Happy New Year!', hi: '🎆 Happy New Year! Wishing you a great year ahead.', p: '#f59e0b', p2: '#8b5cf6', rgb: '245,158,11',
      fx: [{ kind: 'fall', colors: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#ffffff', '#a78bfa'], n: [10, 22], dur: [7, 14] }],
      hat: svg('<path d="M32 3L53 47H11Z" fill="#fbbf24"/><path d="M22 26L42 26 46 36 18 36Z" fill="#f472b6"/><path d="M14 42L50 42 53 47H11Z" fill="#a78bfa"/><circle cx="32" cy="5" r="5" fill="#fff"/>'),
      edge: edge('<g fill="#fbbf24"><path d="M6 1L7.4 5 11.5 6 7.4 7 6 11 4.6 7 .5 6 4.6 5Z"/><path d="M34 3L34.9 5.4 37.4 6 34.9 6.6 34 9 33.1 6.6 30.6 6 33.1 5.4Z" fill="#e5e7eb"/></g><circle cx="20" cy="9" r="1.6" fill="#f472b6"/><circle cx="45" cy="4" r="1.5" fill="#60a5fa"/><circle cx="50" cy="10" r="1.3" fill="#fbbf24"/>') },
    halloween: { name: 'Halloween', icon: '🎃', title: 'Happy Halloween!', hi: '🎃 Happy Halloween! Stay spooky.', p: '#f97316', p2: '#7c3aed', rgb: '249,115,22',
      fx: [{ kind: 'drift', glyphs: ['🦇'], n: [3, 6], sz: [16, 24], dur: [12, 24], glow: 'rgba(0,0,0,0)' }, { kind: 'rise', glyphs: ['🎃', '👻'], n: [2, 4], sz: [18, 26], dur: [13, 22], glow: 'rgba(249,115,22,.6)' }],
      hat: svg('<ellipse cx="32" cy="45" rx="30" ry="6" fill="#3b1a78" stroke="#a78bfa" stroke-width="1"/><path d="M17 45C22 30 26 18 38 3 38 14 42 30 47 45Z" fill="#4c1d95" stroke="#a78bfa" stroke-width="1"/><path d="M19.5 38L44.5 38 46.5 45 17.5 45Z" fill="#f97316"/><rect x="29" y="37" width="8" height="8" rx="1.2" fill="none" stroke="#fde047" stroke-width="2"/>'),
      edge: bunting(['#f97316', '#8b5cf6']) },
    easter: { name: 'Easter', icon: '🐣', title: 'Happy Easter!', hi: '🐣 Happy Easter! Hope your day is full of joy.', p: '#14b8a6', p2: '#ec4899', rgb: '20,184,166',
      fx: [{ kind: 'fall', glyphs: ['🌸', '🌼'], n: [5, 10], sz: [13, 21], dur: [11, 19], glow: 'rgba(0,0,0,0)' }, { kind: 'rise', glyphs: ['🥚', '🐣'], n: [2, 4], sz: [18, 25], dur: [12, 20], glow: 'rgba(0,0,0,0)' }],
      hat: svg('<ellipse cx="21" cy="24" rx="7.5" ry="20" transform="rotate(-12 21 24)" fill="#fff" stroke="#e5e7eb" stroke-width="1"/><ellipse cx="21" cy="25" rx="3.6" ry="14" transform="rotate(-12 21 25)" fill="#f9a8d4"/><ellipse cx="43" cy="24" rx="7.5" ry="20" transform="rotate(12 43 24)" fill="#fff" stroke="#e5e7eb" stroke-width="1"/><ellipse cx="43" cy="25" rx="3.6" ry="14" transform="rotate(12 43 25)" fill="#f9a8d4"/>'),
      edge: bunting(['#f9a8d4', '#fde68a', '#86efac', '#c4b5fd']) },
    valentine: { name: "Valentine's Day", icon: '💖', title: "Happy Valentine's Day!", hi: "💖 Happy Valentine's Day from EMMYHENZ V4!", p: '#e11d48', p2: '#ec4899', rgb: '225,29,72',
      fx: [{ kind: 'rise', glyphs: ['❤', '💖', '💗', '💕'], n: [6, 13], sz: [14, 25], dur: [9, 17], color: '#fb7185', glow: 'rgba(244,63,94,.7)' }],
      hat: svg('<path d="M32 49C5 30 7 7 25 7c5 0 7 3 7 6 0-3 2-6 7-6 18 0 20 23-7 42Z" fill="#f43f5e"/><path d="M16 14C13 17 14 23 18 28" stroke="#fda4af" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>'),
      edge: edge('<path d="M10 3C4 7 6 12 10 14.5 14 12 16 7 10 3Z" fill="#f43f5e" transform="translate(-1 -2.5) scale(.9)"/><path d="M38 3C32 7 34 12 38 14.5 42 12 44 7 38 3Z" fill="#fb7185" transform="translate(-1 -2.5) scale(.9)"/><circle cx="24" cy="4" r="1.2" fill="#fda4af"/><circle cx="52" cy="6" r="1.2" fill="#fda4af"/>') },
    eid: { name: 'Eid', icon: '🌙', title: 'Eid Mubarak!', hi: '🌙 Eid Mubarak from EMMYHENZ V4!', p: '#10b981', p2: '#d97706', rgb: '16,185,129',
      fx: [{ kind: 'twinkle', glyphs: ['✦', '★', '✧', '☾'], n: [8, 16], sz: [11, 21], dur: [3.5, 7], color: '#fde68a', glow: 'rgba(251,191,36,.9)' }],
      hat: svg('<path d="M42 5A23 23 0 1 0 42 49 18 18 0 1 1 42 5Z" fill="#fbbf24"/><path d="M47 16L48.9 21 54 22.2 49.9 25.4 51.2 30.6 47 27.6 42.8 30.6 44.1 25.4 40 22.2 45.1 21Z" fill="#fde68a"/>'),
      edge: bunting(['#10b981', '#fbbf24', '#ffffff']) },
    independence: { name: 'Independence Day', icon: '🇳🇬', title: 'Happy Independence Day!', hi: '🇳🇬 Happy Independence Day! God bless Nigeria.', p: '#16a34a', p2: '#15803d', rgb: '22,163,74',
      fx: [{ kind: 'fall', colors: ['#16a34a', '#ffffff', '#16a34a', '#4ade80'], n: [10, 20], dur: [8, 15] }],
      hat: svg('<rect x="9" y="4" width="3" height="46" rx="1.5" fill="#d1d5db"/><rect x="12" y="6" width="10" height="20" fill="#16a34a"/><rect x="22" y="6" width="10" height="20" fill="#fff"/><rect x="32" y="6" width="10" height="20" fill="#16a34a"/>'),
      edge: bunting(['#16a34a', '#ffffff', '#16a34a']) }
  };

  /* Christmas tree and New Year bells: the art on the Home greeting card (the lights twinkle, the bells swing) */
  function tree() {
    var cols = ['#ef4444', '#fde047', '#38bdf8', '#f472b6', '#ffffff'], bulbs = '';
    [[23.2, 27.1], [30, 29], [36.8, 27.1], [19.2, 45.6], [24.6, 47.8], [30, 48.5], [35.4, 47.8], [40.8, 45.6], [15.2, 66.2], [22.6, 69], [30, 70], [37.4, 69], [44.8, 66.2]].forEach(function (p, i) {
      bulbs += '<g class="sx-tl" style="animation-delay:-' + ((i * 0.43) % 1.8).toFixed(2) + 's"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.7" fill="' + cols[i % 5] + '" opacity=".32"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.8" fill="' + cols[i % 5] + '"/></g>';
    });
    return '<svg viewBox="0 0 60 86" width="40" height="57" aria-hidden="true" focusable="false"><defs><linearGradient id="sxTg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14632f"/><stop offset=".5" stop-color="#22a24c"/><stop offset="1" stop-color="#0f5126"/></linearGradient></defs>' +
      '<rect x="26" y="72" width="8" height="12" rx="1.5" fill="#7c4a1e"/><path d="M30 32 L5 74 H55 Z" fill="url(#sxTg)"/><path d="M30 20 L10 54 H50 Z" fill="url(#sxTg)"/><path d="M30 8 L16 36 H44 Z" fill="url(#sxTg)"/>' +
      '<g fill="none" stroke="#6b7280" stroke-width=".7" stroke-linecap="round"><path d="M21.5 26 Q30 32 38.5 26"/><path d="M16.5 44 Q30 53 43.5 44"/><path d="M11.5 64 Q30 76 48.5 64"/></g>' + bulbs +
      '<polygon class="sx-star" points="30,0.5 31.65,4.73 36.18,4.99 32.66,7.87 33.82,12.26 30,9.8 26.18,12.26 27.34,7.87 23.82,4.99 28.35,4.73" fill="#fde047" stroke="#f59e0b" stroke-width=".6"/></svg>';
  }
  function bells() {
    function bell(x, cls) { return '<g transform="translate(' + x + ' 24) scale(.75)"><g class="sx-bell ' + cls + '"><path d="M0 0 C-7 0 -9 12 -11 20 H11 C9 12 7 0 0 0Z" fill="url(#sxBg)" stroke="#b45309" stroke-width="1"/><rect x="-12.5" y="19" width="25" height="4.4" rx="2.2" fill="#f59e0b" stroke="#b45309" stroke-width=".8"/><circle cx="0" cy="26.6" r="3.2" fill="#d97706"/><path d="M-5 5C-6 10 -7 14 -8 17" stroke="#fff7d1" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".75"/></g></g>'; }
    return '<svg viewBox="0 0 60 56" width="46" height="43" aria-hidden="true" focusable="false"><defs><linearGradient id="sxBg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs>' +
      '<path d="M28 11 L22 24 M32 11 L38 24" stroke="#dc2626" stroke-width="2.6" stroke-linecap="round" fill="none"/>' + bell(22, 'b1') + bell(38, 'b2') +
      '<path d="M30 9 C20 -1 12 5 18 11 C22 14 28 11 30 9Z" fill="#dc2626"/><path d="M30 9 C40 -1 48 5 42 11 C38 14 32 11 30 9Z" fill="#dc2626"/><circle cx="30" cy="9" r="3.2" fill="#b91c1c"/></svg>';
  }

  var root = document.documentElement, cur = '', reduce = false;
  try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function url(s) { return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")'; }

  /* the colours: only for people on the default pink look (anyone who picked their own colour keeps it) */
  var baseAccent = EH.accent;
  EH.accent = function () {
    var a = baseAccent.apply(this, arguments), X = cur && S[cur], r = root.style;
    if (X && a === 'pink') { r.setProperty('--p', X.p); r.setProperty('--p-rgb', X.rgb); r.setProperty('--p2', X.p2); }
    else r.removeProperty('--p2');
    return a;
  };

  function fx(X, id) {
    var old = document.getElementById('seasonFx'); if (old) old.remove();
    var host = document.getElementById('app'); if (!host) return;
    var lite = root.classList.contains('lite'), droid = root.classList.contains('droid'), html = '';
    (reduce ? [] : X.fx || []).forEach(function (f) {
      var n = (lite || droid) ? Math.max(2, Math.round(f.n[0] * (lite ? .5 : .75))) : f.n[1];
      for (var i = 0; i < n; i++) {
        var d = rnd(f.dur[0], f.dur[1]), st = ['--x:' + rnd(0, 97).toFixed(1) + '%', '--y:' + rnd(8, 78).toFixed(0) + '%', '--d:' + d.toFixed(1) + 's', '--dl:' + (-rnd(0, d)).toFixed(1) + 's', '--sw:' + rnd(-40, 40).toFixed(0) + 'px', '--r:' + rnd(-360, 360).toFixed(0) + 'deg', '--o:' + rnd(.5, .9).toFixed(2)];
        if (f.colors) { var w = rnd(5, 9); st.push('--c:' + f.colors[i % f.colors.length], '--w:' + w.toFixed(0) + 'px', '--h:' + (w * rnd(1.3, 2)).toFixed(0) + 'px'); html += '<i class="sx-p cf sx-' + f.kind + '" style="' + st.join(';') + '"></i>'; }
        else { st.push('--sz:' + rnd(f.sz[0], f.sz[1]).toFixed(0) + 'px', '--c:' + (f.color || '#fff'), '--g:' + (f.glow || 'rgba(255,255,255,.5)')); html += '<i class="sx-p sx-' + f.kind + '" style="' + st.join(';') + '">' + f.glyphs[i % f.glyphs.length] + '</i>'; }
      }
    });
    if (id === 'halloween' && !reduce) html += '<div class="sx-spider">🕷️</div>';
    var w2 = document.createElement('div'); w2.id = 'seasonFx'; w2.setAttribute('aria-hidden', 'true'); w2.innerHTML = html;
    host.appendChild(w2);
  }

  EH.season = function () { return cur; };
  /* the greeting card at the top of Home (empty while no celebration is on) */
  EH.seasonCard = function () {
    var X = cur && S[cur]; if (!X) return '';
    var art = cur === 'christmas' ? tree() : cur === 'newyear' ? bells() : '<span class="sxc-em">' + X.icon + '</span>';
    return '<section class="sxc rise" style="--i:1"><div class="sxc-art' + (cur === 'christmas' || cur === 'newyear' ? ' own' : '') + '">' + art + '</div>' +
      '<div class="sxc-tx"><b>' + EH.esc(X.title) + '</b><small>From all of us at EMMYHENZ V4</small></div><i class="sxc-sh"></i></section>';
  };

  function apply(id, cache) {
    try {
      var X = id && S[id] ? S[id] : null; id = X ? id : '';
      if (cache) { if (id) EH.ls.set('eh_season', id); else EH.ls.del('eh_season'); }
      if (id === cur && (!X || document.getElementById('seasonFx'))) return;   // nothing changed
      cur = id;
      var old = document.getElementById('seasonFx'); if (old) old.remove();
      if (!X) { root.removeAttribute('data-season'); root.style.removeProperty('--sx-hat'); root.style.removeProperty('--sx-edge'); EH.accent(); EH.emit('season', ''); return; }
      root.setAttribute('data-season', id);
      root.style.setProperty('--sx-hat', url(X.hat)); root.style.setProperty('--sx-edge', url(X.edge));
      EH.accent(); fx(X, id); EH.emit('season', id);
    } catch (e) { /* decoration only — never let it break the app */ }
  }

  /* a short hello, once a day per celebration, for people who open the app while it is on */
  function hello(id) {
    try {
      var k = id + '|' + new Date().toDateString(); if (EH.ls.get('eh_season_hi') === k) return;
      EH.ls.set('eh_season_hi', k); setTimeout(function () { EH.toast(S[id].hi, 'ok'); }, 1500);
    } catch (e) {}
  }

  apply(EH.ls.get('eh_season') || '');   // what was on last time, so there is no flash
  var greeted = false;
  EH.on('status', function (d) {
    if (!d || typeof d.season !== 'string') return;
    apply(d.season, true);
    if (d.season && S[d.season] && !greeted) { greeted = true; var go = function () { hello(d.season); }; document.body.classList.contains('ready') ? go() : EH.on('ready', go); }
  });
})();
