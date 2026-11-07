/* Daily Spin & Tasks */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var KIND = { coin1: ['🪙', '1 Coin', '#fbbf24'], coin2: ['💰', '2 Coins', '#f472b6'], coin3: ['💎', '3 Coins', '#34d399'], respin: ['🔄', 'Try again', '#a78bfa'], none: ['😢', 'Nothing', '#64748b'] };
  var PAL = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];   // every slice its own colour; the pointer wears the colour of the slice it is on
  var pad = function (n) { return ('0' + n).slice(-2); };

  EH.screen('spin', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Daily Spin & Tasks', sub: 'Earn free EH coins', acts: '<div class="pill tap" data-buycoins><span class="coin">EH</span><span data-cb>' + EH.bal(EH.user ? EH.user.coins : 0) + '</span></div>' }), body = f.body, alive = true, data = null, rot = 0, spinning = false, cd = null, adT = null, adOpen = null;
    $('[data-buycoins]', scr).onclick = EH.openBuyCoins;
    var off = EH.on('user', function () { var c = $('[data-cb]', scr); if (c) c.textContent = EH.bal(EH.user ? EH.user.coins : 0); });
    if (!EH.token) { body.innerHTML = '<div class="card rise" style="text-align:center;padding:26px 18px"><div class="dp-ic" style="margin:0 auto 14px;width:64px;height:64px;font-size:30px;background:linear-gradient(135deg,#fbbf24,#d97706)">' + ic('gift') + '</div><div class="h1" style="font-size:23px">Daily Spin &amp; Tasks</div><div class="sub" style="margin:8px 0 18px">Sign in to spin the wheel every day and finish easy tasks to win EH coins.</div><button class="btn block tap" data-login>' + ic('user') + ' Sign in</button></div>'; return { destroy: function () { off(); } }; }
    body.innerHTML = '<div class="spinner"></div>';
    var key = 'eh_tasks_' + ((EH.user && EH.user.username) || '');
    EH.pageOn('referEarn').then(function (ok) {
      if (!ok) { body.innerHTML = '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('warn') + '</div><b>Under maintenance</b><p>Tasks are temporarily unavailable. Please try again later.</p></div>'; return; }
      EH.api('/api/tasks/visited', { method: 'POST', body: {} }); var saved = EH.ls.json(key, null); if (saved && saved.success !== false && saved.spin) { data = saved; paint(); } load();
    });
    function load() { EH.api('/api/tasks').then(function (r) { if (!alive || !r.d || !r.d.success) { if (!data && alive) body.innerHTML = '<div class="empty"><b>Could not load your tasks</b><p>Check your connection.</p></div>'; return; } data = r.d; EH.ls.set(key, JSON.stringify(data)); if (!spinning) paint(); }); }

    function wheelHtml(sp) {
      var segs = (sp && sp.segments) || ['coin1', 'none', 'none', 'respin', 'none', 'coin1', 'none', 'none'].map(function (id) { return { id: id }; }), n = segs.length, step = 360 / n;
      var grad = segs.map(function (x, i) { var c = PAL[i % PAL.length], a0 = i * step, a1 = (i + 1) * step; return c + ' ' + a0 + 'deg ' + (a1 - 1.2) + 'deg,rgba(255,255,255,.75) ' + (a1 - 1.2) + 'deg ' + a1 + 'deg'; }).join(',');
      return '<div class="whl"><div class="whl-ptr"></div><div class="whl-rim"><div class="whl-disk" data-wheel style="background:conic-gradient(' + grad + ');transform:rotate(' + rot + 'deg)">' + segs.map(function (x, i) { var k = KIND[x.id] || KIND.none; return '<div class="whl-seg" style="transform:rotate(' + (i * step + step / 2) + 'deg)"><span><em>' + k[0] + '</em>' + k[1] + '</span></div>'; }).join('') + '</div><button class="whl-hub tap" data-spin aria-label="Start">START</button></div></div>';
    }
    function paint() {
      if (!data) return; clearInterval(cd); clearInterval(adT);
      var sp = data.spin, can = sp.canSpin; if (!can && sp.nextSpinAt && Date.parse(sp.nextSpinAt) <= Date.now()) { sp = Object.assign({}, sp, { canSpin: true, respin: false }); can = true; }
      var prize = sp.todayPrize, coin = /^coin/.test(prize || '');
      body.innerHTML = '<div class="card rise spin-card"><div class="pf-t">' + ic('gift') + ' Daily Spin</div>' + wheelHtml(sp) +
        '<div class="spin-state" data-state>' + (can ? '<b>' + (sp.respin ? 'Try again!' : 'Your spin is ready!') + '</b><span>Tap START, then tap STOP on a coin</span>' : '<b>' + (coin ? 'Today you won ' + esc((KIND[prize] || [])[1] || '') .toLowerCase() + '!' : 'Nothing today') + '</b><span>Next spin in <b data-cd style="color:var(--p)">--:--:--</b></span>') + '</div><div data-sres></div></div>' +
        '<div data-adcoin></div><div class="sec"><h3>One-time tasks</h3></div><div data-tasks></div>' + EH.adCard();
      var sb = $('[data-spin]', body); if (!can) sb.disabled = true, sb.classList.add('dim'); sb.onclick = doSpin; ptr(rot);
      if (can && sp.needAd) { sb.disabled = true; sb.classList.add('dim'); if (!spinAd && sp.adOpen) spinAd = { token: sp.adOpen.token, at: Date.parse(sp.adOpen.at) }; spinAdPaint(); }
      if (!can && sp.nextSpinAt) { var target = Date.parse(sp.nextSpinAt), tick = function () { var el = $('[data-cd]', body); if (!el) { clearInterval(cd); return; } var ms = target - Date.now(); if (ms <= 0) { clearInterval(cd); load(); return; } el.textContent = pad(Math.floor(ms / 3600000)) + ':' + pad(Math.floor(ms % 3600000 / 60000)) + ':' + pad(Math.floor(ms % 60000 / 1000)); }; tick(); cd = setInterval(tick, 1000); }
      paintAdcoin(); paintTasks(); EH.mountAds(scr);
    }
    /* START turns the wheel at once (nothing waits for the server). The next tap stops it right there; the slice under the pointer is sent and is what you get. */
    var running = false, spinAd = null, spinAdT = null, raf = 0;
    function ptr(deg) { var p = $('.whl-ptr', body), n = (data && data.spin && data.spin.segments || []).length || 8; if (!p) return; var i = Math.floor((((360 - deg) % 360 + 360) % 360) / (360 / n)) % n; p.style.setProperty('--pc', PAL[i % PAL.length]); }
    /* the first spin of the day: open the ad for 10 seconds, then "Claim daily spin" unlocks the wheel */
    function spinAdPaint() {
      var box = $('[data-sres]', body); if (!box) return; var sp = data.spin, wait = sp.adWait || 10; clearInterval(spinAdT);
      var st = $('[data-state]', body); if (st) st.innerHTML = '<b>Your free daily spin</b><span>Open the ad for ' + wait + ' seconds to unlock it</span>';
      if (!spinAd) { box.innerHTML = '<button class="btn block tap" data-sadopen>' + ic('play') + ' Open the ad</button>'; $('[data-sadopen]', box).onclick = spinAdOpen; return; }
      box.innerHTML = '<div class="note" style="margin:0 0 10px">Keep the ad open, then come back and claim your spin.</div><button class="btn block tap" data-sadclaim disabled>' + ic('clock') + ' <span data-sadleft></span></button><div style="text-align:center;margin-top:10px"><a class="sub" data-sadagain style="text-decoration:underline">The ad did not open? Open it again</a></div>';
      var t = function () { var left = Math.ceil((spinAd.at + wait * 1000 - Date.now()) / 1000), b = $('[data-sadclaim]', box), l = $('[data-sadleft]', box); if (!b || !l) { clearInterval(spinAdT); return; } if (left > 0) { b.disabled = true; l.textContent = 'Wait ' + left + 's…'; } else { b.disabled = false; l.textContent = 'Claim daily spin'; clearInterval(spinAdT); } };
      t(); spinAdT = setInterval(t, 500); $('[data-sadclaim]', box).onclick = spinAdClaim; $('[data-sadagain]', box).onclick = function () { spinAd = null; spinAdOpen(); };
    }
    function spinAdOpen() {
      var sp = data.spin; window.open(sp.adLink || '', '_blank');
      EH.api('/api/spin/ad/start', { method: 'POST', body: {} }).then(function (r) { var d = r.d || {}; if (!d.success) { EH.toast(d.error || 'Failed', 'er'); return; } if (d.noAd) { sp.needAd = false; paint(); return; } spinAd = { token: d.token, at: Date.now() }; spinAdPaint(); });
    }
    function spinAdClaim() {
      if (!spinAd) return; var b = $('[data-sadclaim]', body); if (b) b.disabled = true;
      EH.api('/api/spin/ad/finish', { method: 'POST', body: { token: spinAd.token } }).then(function (r) { var d = r.d || {};
        if (d.success) { spinAd = null; data.spin.needAd = false; EH.toast('Daily spin unlocked 🎉', 'ok'); paint(); return; }
        EH.toast(d.error || 'Failed', 'er'); if (!d.wait) { spinAd = null; spinAdPaint(); } else if (b) b.disabled = false; });
    }
    function doSpin() {
      var b = $('[data-spin]', body), w = $('[data-wheel]', body), res = $('[data-sres]', body); if (!b || b.disabled || !w) return;
      var n = (data.spin.segments || []).length || 8, step = 360 / n;
      if (!running) {
        running = true; spinning = true; res.innerHTML = '<div class="sp-won no" style="background:none;border:0;color:var(--t2)">Tap STOP when a coin is under the pointer</div>';
        w.style.transition = 'none'; w.style.setProperty('--r0', (rot % 360) + 'deg'); w.classList.add('run'); b.textContent = 'STOP'; EH.buzz(8);
        (function loop() { try { var m = new DOMMatrixReadOnly(getComputedStyle(w).transform); ptr((Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360); } catch (e) {} raf = requestAnimationFrame(loop); })(); return;
      }
      var cur = rot % 360; try { var m = new DOMMatrixReadOnly(getComputedStyle(w).transform); cur = (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360; } catch (e) {}
      cancelAnimationFrame(raf); w.classList.remove('run'); w.style.transition = 'none'; w.style.transform = 'rotate(' + cur + 'deg)'; rot = cur; running = false; ptr(cur); EH.buzz(14);
      var seg = Math.floor(((360 - cur) % 360) / step) % n; b.disabled = true; b.textContent = '…';
      EH.api('/api/spin', { method: 'POST', body: { segment: seg } }).then(function (r) {
        var d = r.d || {}; if (!d.success) { spinning = false; EH.toast(d.error || (r.net ? 'No connection: try again' : 'Could not spin'), 'er'); load(); paint(); return; }
        spinning = false; var won = /^coin/.test(d.prize);
        res.innerHTML = '<div class="sp-won ' + (won ? 'win' : d.respin ? 're' : 'no') + '">' + (won ? '🏆 You won <b>' + esc(d.label) + '</b>!' : d.respin ? '🔄 Try again! Tap START to spin again.' : '😢 Nothing this time. Come back tomorrow for your next spin.') + '</div>';
        if (won) EH.buzz([30, 40, 30]); if (d.respin) { b.disabled = false; b.textContent = 'START'; } else b.textContent = won ? '🏆' : '😢';
        if (EH.user) { EH.user.coins = d.coins; EH.setUser(EH.user); } EH.refreshUser(); EH.api('/api/tasks').then(function (r2) { if (r2.d && r2.d.success) { data = r2.d; EH.ls.set(key, JSON.stringify(data)); setTimeout(function () { if (alive && !spinning) paint(); }, won || !d.respin ? 2600 : 600); } });
      });
    }

    function paintAdcoin() {
      var box = $('[data-adcoin]', body), a = data.adcoin; if (!box) return; if (!a || !a.on) { box.innerHTML = ''; return; }
      var dots = Array.from({ length: a.perCoin }, function (_, i) { return '<i class="' + (i < (a.done ? a.perCoin : a.progress) ? 'on' : '') + '"></i>'; }).join('');
      var head = '<div class="sec"><h3>Watch ads for coins</h3></div><div class="card"><div class="sub" style="margin-bottom:12px">Watch <b style="color:var(--tx)">' + a.perCoin + ' ads</b> = <b style="color:var(--tx)">1 EH coin</b> · ' + (a.maxCoins === 1 ? 'only 1 coin a day' : 'up to ' + a.maxCoins + ' coins a day') + '. Each ad must stay open a few seconds.</div>' +
        '<div class="card" style="background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.3);font-size:12.5px;line-height:1.5;margin-bottom:14px">' + ic('ext') + ' The ad opens an <b>outside website</b>. We don\'t control that page, so please <b>don\'t enter any personal information</b> on it and don\'t download anything. If anything looks suspicious, just close it.</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div class="adots">' + dots + '</div><div class="sub" style="font-size:12.5px;white-space:nowrap">Today: <b style="color:var(--tx)">' + a.coinsToday + '/' + a.maxCoins + '</b> ' + (a.maxCoins === 1 ? 'coin' : 'coins') + '</div></div>';
      if (a.done) { box.innerHTML = head + '<div class="sub">✅ Done for today — come back after midnight (UTC).</div></div>'; return; }
      var open = adOpen || (a.open ? { token: a.open.token, at: Date.parse(a.open.at) } : null);
      if (open) {
        box.innerHTML = head + '<div class="note" style="margin:0 0 10px">Ad opened — keep it open for a moment, then come back and claim.</div><button class="btn block tap" data-claim disabled>' + ic('clock') + ' <span data-left></span></button><button class="btn alt block tap" data-again style="margin-top:10px">' + ic('refresh') + ' Open the ad again</button></div>';
        var tick = function () { var left = Math.ceil((open.at + a.wait * 1000 - Date.now()) / 1000), b = $('[data-claim]', box), l = $('[data-left]', box); if (!b || !l) { clearInterval(adT); return; } if (left > 0) { b.disabled = true; l.textContent = 'Claim in ' + left + 's'; } else { b.disabled = false; b.innerHTML = ic('check') + ' I watched it — count it'; clearInterval(adT); } };
        tick(); adT = setInterval(tick, 500); $('[data-claim]', box).onclick = claim; $('[data-again]', box).onclick = function () { adOpen = null; watch(); }; return;
      }
      box.innerHTML = head + '<button class="btn block tap" data-watch>' + ic('play') + ' Watch an ad</button></div>'; $('[data-watch]', box).onclick = watch;
    }
    function watch() {
      var a = data.adcoin; if (!a || !a.on) return; var w = window.open(a.link, '_blank');
      EH.api('/api/adcoin/start', { method: 'POST', body: {} }).then(function (r) { var d = r.d; if (!d.success) { EH.toast(d.error || 'Failed', 'er'); if (w && d.done) try { w.close(); } catch (e) {} load(); return; } adOpen = { token: d.token, at: Date.now() }; paintAdcoin(); });
    }
    function claim() {
      var open = adOpen || (data.adcoin && data.adcoin.open ? { token: data.adcoin.open.token } : null); if (!open) return; var b = $('[data-claim]', body); if (b) b.classList.add('busy');
      EH.api('/api/adcoin/finish', { method: 'POST', body: { token: open.token } }).then(function (r) { var d = r.d;
        if (d.success) { adOpen = null; data.adcoin = d.adcoin; if (EH.user) { EH.user.coins = d.coins; EH.setUser(EH.user); } EH.toast(d.earned ? '🎉 +1 EH coin!' : 'Ad counted — ' + d.adcoin.progress + '/' + d.adcoin.perCoin + ' for your next coin', 'ok'); paintAdcoin(); }
        else { EH.toast(d.error || 'Failed', 'er'); if (!d.wait) { adOpen = null; load(); } else paintAdcoin(); } });
    }

    function paintTasks() {
      var list = $('[data-tasks]', body); if (!list) return; var tasks = (data.oneTime || []).slice().sort(function (a, b) { return a.completed === b.completed ? 0 : a.completed ? 1 : -1; });
      if (!tasks.length || tasks.every(function (t) { return t.completed; })) { list.innerHTML = '<div class="empty"><div class="ei" style="color:#4ade80">' + ic('check') + '</div><b>All tasks completed!</b><p>Spin the wheel every day for more coins.</p></div>'; return; }
      list.innerHTML = '<div class="grp">' + tasks.map(function (t) {
        var ref = t.type === 'referral', soc = t.type === 'socials', sub = ref ? t.progress + '/' + t.target + ' referrals · ' + (t.completed ? 'coin claimed' : '+' + t.reward + ' coin') : soc ? t.progress + '/' + t.target + ' followed · ' + (t.completed ? 'coin claimed' : 'follow all ' + t.target + ' channels to claim +' + t.reward + ' coin') : '+' + t.reward + ' coin';
        var act = t.completed ? '<span class="chip ok">' + ic('check') + ' Claimed</span>' : (ref && !t.eligible) ? '<button class="btn alt sm tap" data-ref>' + ic('copy') + ' Copy link</button>' : t.eligible ? '<button class="btn sm tap" data-done="' + esc(t.id) + '">Claim</button>' : '';
        var links = soc && !t.completed && t.links ? '<div class="chips" style="margin-top:10px">' + t.links.map(function (l) { return '<button type="button" class="chip tap' + (l.opened ? ' ok' : '') + '" data-soc="' + esc(l.id) + '" data-url="' + esc(l.url) + '">' + esc(l.title) + (l.opened ? ' ' + ic('check') : '') + '</button>'; }).join('') + '</div>' : '';
        return '<div class="row" style="flex-wrap:wrap;' + (t.completed ? 'opacity:.55' : '') + '"><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic(ref ? 'users' : soc ? 'chat' : 'star') + '</div><div class="rt"><b>' + esc(t.title) + '</b><small>' + sub + '</small></div>' + act + (links ? '<div style="flex-basis:100%">' + links + '</div>' : '') + '</div>';
      }).join('') + '</div>';
      $$('[data-done]', list).forEach(function (b) { b.onclick = function () { b.classList.add('busy'); EH.api('/api/tasks/complete', { method: 'POST', body: { taskId: b.dataset.done } }).then(function (r) { if (r.d.success) { EH.toast('+' + r.d.reward + ' coin' + (r.d.reward > 1 ? 's' : '') + ' earned!', 'ok'); EH.refreshUser(); load(); } else { b.classList.remove('busy'); EH.toast(r.d.error || 'Failed', 'er'); } }); }; });
      var rf = $('[data-ref]', list); if (rf) rf.onclick = function () { var u = EH.user; EH.copy(location.origin + '/?ref=' + (u.referralId || u.username), 'Referral link copied! When 2 people join, come back to claim your coin.'); };
      $$('[data-soc]', list).forEach(function (b) { b.onclick = function () { window.open(b.dataset.url, '_blank'); EH.api('/api/tasks/social', { method: 'POST', body: { id: b.dataset.soc } }).then(load); }; });
    }
    return { destroy: function () { alive = false; clearInterval(cd); clearInterval(adT); cancelAnimationFrame(raf); off(); } };
  } });
})();
