/* Home screen */
(function () {
  var EH = window.EH, $ = EH.$, ic = EH.ic;

  /* pull down to refresh (any scrolling body) */
  EH.ptr = function (scr, body, fn) {
    var el = document.createElement('div'); el.className = 'ptr'; el.innerHTML = ic('refresh'); scr.appendChild(el);
    var y0 = 0, pull = 0, on = false, busy = false;
    body.addEventListener('touchstart', function (e) { if (body.scrollTop <= 0 && !busy) { y0 = e.touches[0].clientY; on = true; pull = 0; } }, { passive: true });
    body.addEventListener('touchmove', function (e) {
      if (!on) return; var dy = e.touches[0].clientY - y0;
      if (dy > 0 && body.scrollTop <= 0) { pull = Math.min(dy * 0.5, 84); el.style.transition = 'none'; el.style.opacity = Math.min(pull / 56, 1); el.style.transform = 'translateY(' + (pull - 40) + 'px) rotate(' + (pull * 5) + 'deg)'; } else pull = 0;
    }, { passive: true });
    body.addEventListener('touchend', function () {
      if (!on) return; on = false; el.style.transition = 'transform .3s var(--spring),opacity .25s';
      if (pull >= 60 && !busy) { busy = true; EH.buzz(10); el.classList.add('go'); el.style.opacity = 1; el.style.transform = 'translateY(22px)';
        Promise.all([Promise.resolve(fn()), new Promise(function (r) { setTimeout(r, 700); })]).then(function () { busy = false; el.classList.remove('go'); el.style.opacity = 0; el.style.transform = 'translateY(-40px)'; }); }
      else { el.style.opacity = 0; el.style.transform = 'translateY(-40px)'; }
    });
  };

  /* numbers that count up */
  function setNum(el, n) {
    if (!el || n == null || isNaN(n)) return; var from = Number(el.dataset.v), to = Math.round(n); el.dataset.v = to;
    if (isNaN(from) || document.documentElement.classList.contains('lite') || from === to) { el.textContent = EH.fmt(to); return; }
    var t0 = performance.now(), dur = 900;
    (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = EH.fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function greet() { var h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

  EH.screen('home', { tab: true, mount: function (scr) {
    var f = EH.frame(scr, { bar: 'brand', tab: true }), body = f.body, cache = EH.ls.json('eh_app_stats', {}), retry, alive = true;
    body.innerHTML =
      '<section class="hi rise" style="--i:0"><small data-hs></small><h1 data-hn></h1></section>' +
      '<div data-sx></div>' +
      '<section class="hero rise" style="--i:1"><button class="pchip free tap" data-premium data-pchip>' + ic('crown') + '<span>UPGRADE</span></button>' +
        '<div class="h-top"><div class="h-ico">' + ic('rocket') + '</div><div><h2>Deploy your bot</h2><p>Enter your WhatsApp number, get a pairing code, and your bot is live in about a minute.</p></div></div>' +
        '<button class="cta tap" data-go="deploy">' + ic('rocket') + 'Deploy Bot</button>' +
        '<div class="hst"><div><b data-n="bots"><i class="sk"></i></b><span>Bots paired</span></div><div><b data-n="srv"><i class="sk"></i></b><span>Servers</span></div><div><b data-n="slots"><i class="sk"></i></b><span>Free slots</span></div></div>' +
        '<div class="net"><i class="live" data-dot></i><span data-net>Checking servers…</span></div></section>' +
      '<div data-inst></div>' +
      EH.adCard() +
      '<div class="sec rise" style="--i:2"><h3>Quick actions</h3></div>' +
      '<nav class="qa rise" style="--i:3">' +
        '<a class="tap" data-go="react"><span class="ic" style="--a:#ff6aa8;--b:#e11d63">' + ic('heart') + '</span>Channel React</a>' +
        '<a class="tap" data-go="vote"><span class="ic" style="--a:#60a5fa;--b:#2563eb">' + ic('poll') + '</span>Poll Voting</a>' +
        '<a class="tap" data-go="spin"><span class="ic" style="--a:#fbbf24;--b:#d97706">' + ic('gift') + '<i class="dot hide" data-spin-dot></i></span>Daily Spin</a>' +
        '<a class="tap" data-premium><span class="ic" style="--a:#c084fc;--b:#7c3aed">' + ic('gem') + '</span>Premium</a>' +
        '<a class="tap" data-go="settings"><span class="ic" style="--a:#34d399;--b:#059669">' + ic('sliders') + '</span>Bot Settings</a>' +
        '<a class="tap" data-go="chat"><span class="ic" style="--a:#22d3ee;--b:#0891b2">' + ic('chat') + '</span>Community</a>' +
        '<a class="tap" data-go="tutorial"><span class="ic" style="--a:#fb923c;--b:#ea580c">' + ic('play') + '</span>Tutorial</a>' +
        '<a class="tap" data-go="faq"><span class="ic" style="--a:#94a3b8;--b:#475569">' + ic('help') + '</span>FAQ</a>' +
      '</nav>' +
      '<button class="admrow ai-row rise tap" data-go="ai" style="--i:4"><span class="admic">' + ic('bolt') + '</span><span class="admtx"><b>Ask EMMYHENZ AI</b><small>Instant help about your bot and the app</small></span><span class="admgo">' + ic('chevR') + '</span></button>' +
      '<button class="admrow rise hide tap" data-adm data-admin style="--i:4"><span class="admic">' + ic('shield') + '</span><span class="admtx"><b>Admin panel</b><small>Users, servers, payments and settings</small></span><span class="admgo">' + ic('chevR') + '</span></button>' +
      '<div class="sec rise" style="--i:4"><h3>What you can do on EMMYHENZ V4</h3></div>' +
      '<div class="rail rise" style="--i:5">' +
        '<a class="rc tap" data-tab="deploy"><img src="/features/deploy.svg" alt="" loading="lazy"><div><b>Your own bot, free</b><p>Pair your number with a code and your bot is live in a minute.</p><em>Deploy ' + ic('arrow') + '</em></div></a>' +
        '<a class="rc tap" data-go="spin"><img src="/features/spin.svg" alt="" loading="lazy"><div><b>Daily Spin &amp; Tasks</b><p>Spin the wheel every day and win EH coins.</p><em>Spin now ' + ic('arrow') + '</em></div></a>' +
        '<a class="rc tap" data-go="react"><img src="/features/chreact.svg" alt="" loading="lazy"><div><b>Channel Reacts</b><p>Send reactions to any WhatsApp channel post.</p><em>Open ' + ic('arrow') + '</em></div></a>' +
        '<a class="rc tap" data-go="vote"><img src="/features/chvote.svg" alt="" loading="lazy"><div><b>Poll Voting</b><p>Push the poll option you want to the top.</p><em>Open ' + ic('arrow') + '</em></div></a>' +
        '<a class="rc tap" data-go="settings"><img src="/features/managebot.svg" alt="" loading="lazy"><div><b>Manage Bot</b><p>Switch features on and off, protect your groups and set your bot up.</p><em>Open ' + ic('arrow') + '</em></div></a>' +
        '<a class="rc tap" data-premium><img src="/features/premium.svg" alt="" loading="lazy"><div><b>Premium</b><p>Your own bot name and picture, no watermarks, and free reacts and votes every day.</p><em>See Premium ' + ic('arrow') + '</em></div></a>' +
        '<a class="rc tap" data-go="chat"><img src="/features/community.svg" alt="" loading="lazy"><div><b>Community</b><p>Ask questions, get help and share tips with other bot owners.</p><em>Open ' + ic('arrow') + '</em></div></a>' +
      '</div>' +
      '<div class="sec rise" style="--i:6"><h3>Live stats</h3><span><i class="live" data-dot2></i>Updates every minute</span></div>' +
      '<div class="grp rise" style="--i:7">' +
        '<div class="row"><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic('bolt') + '</div><div class="rt"><b>Paired today</b><small>Bots linked since midnight</small></div><div class="rv" data-n="today">–</div></div>' +
        '<div class="row"><div class="ri" style="--a:#c084fc;--b:#7c3aed">' + ic('cal') + '</div><div class="rt"><b>This month</b><small>Bots linked this month</small></div><div class="rv" data-n="month">–</div></div>' +
        '<div class="row"><div class="ri" style="--a:#60a5fa;--b:#2563eb">' + ic('trend') + '</div><div class="rt"><b>All time</b><small>Every bot deployed so far</small></div><div class="rv" data-n="all">–</div></div>' +
      '</div>' +
      '<div data-testi hidden><div class="sec rise" style="--i:8"><h3>What users say</h3></div><div class="rail tq-rail rise" style="--i:8" data-tq></div></div>' +
      EH.adCard() +
      '<div class="foot rise" style="--i:8"><b>EMMYHENZ V4</b><br>Free WhatsApp bot · 24/7 · by EmmyHenzTech</div>';

    var sx = $('[data-sx]', body), offSx = EH.on('season', function () { if (alive) sx.innerHTML = EH.seasonCard ? EH.seasonCard() : ''; });   // the celebration card (nothing while none is on)
    sx.innerHTML = EH.seasonCard ? EH.seasonCard() : '';
    var ins = $('[data-inst]', body), offIn = EH.on('install', function () { if (!alive) return; ins.innerHTML = EH.installCard ? EH.installCard() : ''; });   // "Install the app" (only on the app's own address, in a browser)
    ins.innerHTML = EH.installCard ? EH.installCard() : '';
    if (EH.ss.get('eh_inst_force')) setTimeout(function () { var c = $('.inst', ins); if (c && alive) EH.reveal(c, 'center'); }, 1800);
    var N = function (k) { return $('[data-n="' + k + '"]', body); };
    function paint(s) { ['bots', 'srv', 'slots', 'today', 'month', 'all'].forEach(function (k) { if (s[k] != null) { var el = N(k); if (el && el.dataset.v === undefined) el.dataset.v = 0; setNum(el, s[k]); } }); }
    function net(ok, txt) { $('[data-dot]', body).classList.toggle('off', !ok); $('[data-dot2]', body).classList.toggle('off', !ok); $('[data-net]', body).textContent = txt; }
    function user() {
      var u = EH.user; $('[data-hs]', body).textContent = greet();
      $('[data-hn]', body).textContent = u ? 'Hi, ' + (u.username || 'there') + ' 👋' : 'Your WhatsApp bot, ready in a minute';
      $('[data-adm]', body).classList.toggle('hide', !(u && u.isAdmin));
      var pc = $('[data-pchip]', body), pm = !!(u && u.isPremium); pc.classList.toggle('free', !pm); $('span', pc).textContent = pm ? 'PREMIUM' : 'UPGRADE';
      $('[data-spin-dot]', body).classList.toggle('hide', !(u && u.canSpin));
    }
    function load() {
      return Promise.all([EH.api('/sessions', { auth: false, timeout: 12000 }), EH.api('/api/stats/deploys', { auth: false, timeout: 12000 })]).then(function (rs) {
        if (!alive) return false;
        var a = rs[0].d && rs[0].d.success ? rs[0].d : null, b = rs[1].d && rs[1].d.success ? rs[1].d : null, s = {}, starting = 0, names = [];
        if (a) { var st = a.serverStats || {}; s.bots = a.total || 0; s.srv = st.detectedServers || 0; s.slots = st.serversLeft == null ? 0 : st.serversLeft; starting = st.loadingServers || 0; names = (st.loadingList || []).concat(st.restartingList || []); }
        if (b) { s.today = (b.totals && b.totals.today) || 0; s.month = (b.totals && b.totals.month) || 0; s.all = (b.totals && b.totals.allTime) || 0; }
        var got = a || b; if (got) { for (var k in s) cache[k] = s[k]; EH.ls.set('eh_app_stats', JSON.stringify(cache)); }
        paint(got ? s : cache); clearTimeout(retry);
        if (a) { net(true, starting > 0 ? 'Some servers are restarting' + (names.length ? ' (' + names.join(', ') + ')' : '') + '…' : 'All systems online'); if (starting > 0) retry = setTimeout(load, 15000); }
        else if (b) net(true, 'Online'); else net(false, 'Can’t reach the server — showing the last numbers');
        return !!got;
      });
    }
    EH.api('/api/testimonials', { auth: false, timeout: 10000 }).then(function (r) {   // real ratings with a comment (same as the site)
      var l = r.d && r.d.success ? (r.d.testimonials || []).slice(0, 10) : []; if (!alive || !l.length) return;
      $('[data-tq]', body).innerHTML = l.map(function (t) { var n = Math.max(1, Math.min(5, Math.round(t.stars || 5))); return '<div class="tq"><div class="tq-s">' + '★★★★★'.slice(0, n) + '</div><p>“' + EH.esc(t.comment) + '”</p><b>@' + EH.esc(t.username) + ' <span>· ' + EH.esc(t.feature || 'EMMYHENZ') + '</span></b></div>'; }).join('');
      $('[data-testi]', body).hidden = false;
    }, function () {});
    user(); if (Object.keys(cache).length) paint(cache);
    var off = EH.on('user', user), off2 = EH.on('logout', user), last = Date.now();
    EH.ptr(scr, body, function () { return Promise.all([load(), EH.refreshUser()]).then(function (r) { EH.toast(r[0] ? 'Up to date' : 'No connection'); }); });
    var iv = setInterval(function () { if (!document.hidden && $('.scr:not(.hide) [data-n="bots"]')) { last = Date.now(); load(); } }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - last > 30000) { last = Date.now(); load(); EH.refreshUser(); } });
    window.addEventListener('online', load); window.addEventListener('offline', function () { net(false, 'You are offline — showing the last numbers'); });
    EH.mountAds(scr); load();
    return { show: function () { EH.mountAds(scr); }, destroy: function () { alive = false; clearInterval(iv); off(); off2(); offSx(); offIn(); } };
  } });
})();
