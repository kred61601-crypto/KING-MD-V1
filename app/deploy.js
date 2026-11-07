/* Deploy Bot screen: number -> pairing code -> online. Same server calls as the site's pairing card. */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc, GUEST_SPACES = 3;

  var digits = function (v) { return String(v || '').replace(/\D/g, ''); };
  var sess = function () { return EH.ls.json('eh_sess', []); };
  var saveSess = function (l) { EH.ls.set('eh_sess', JSON.stringify(l)); };
  var online = {};   // number -> 'online' | 'offline' | 'pairing'

  /* the account's bots, listed from the server (so a bot paired on another phone shows up too) */
  EH.syncBots = function () {
    if (!EH.token) return Promise.resolve();
    return EH.api('/api/my-bots').then(function (r) {
      var d = r.d; if (!r.ok || !d.success) return;
      var mine = {}; (d.bots || []).forEach(function (b) { mine[b.number] = 1; if (b.state) online[b.number] = b.state; });
      var keep = sess().filter(function (s) { return !s.synced || mine[digits(s.phoneNumber)]; }), have = {}; keep.forEach(function (s) { have[digits(s.phoneNumber)] = 1; });
      Object.keys(mine).forEach(function (n) { if (!have[n]) keep.push({ phoneNumber: n, timestamp: Date.now(), status: 'active', deviceId: EH.devId(), synced: true }); });
      saveSess(keep);
    });
  };
  function pollStates() {
    var nums = sess().map(function (s) { return digits(s.phoneNumber); }).filter(Boolean).slice(0, 12); if (!nums.length) return Promise.resolve(false);
    return EH.api('/api/bots/status', { method: 'POST', body: { numbers: nums, deviceId: EH.devId() }, timeout: 12000 }).then(function (r) {
      if (r.ok && r.d.success) { Object.keys(r.d.bots || {}).forEach(function (n) { online[n] = r.d.bots[n]; }); return true; } return false;
    });
  }
  EH.botSpaces = function () { var u = EH.user, list = sess(); return { total: (u && u.botSpaces) || GUEST_SPACES, used: Math.max(list.length, (u && u.usedSpaces) || 0), list: list }; };

  /* Cloudflare "verify" box (only when the admin switched the check on) */
  var cfScript = null;
  function cfLoad() {
    if (window.turnstile) return Promise.resolve(window.turnstile); if (cfScript) return cfScript;
    return cfScript = new Promise(function (res) { var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = function () { res(window.turnstile || null); }; s.onerror = function () { cfScript = null; res(null); }; document.head.appendChild(s); });
  }

  /* space-full / buy a space with coins */
  EH.spaceFull = function () {
    var b = EH.botSpaces(), u = EH.user, over = b.used > b.total;
    var s = EH.sheet({ title: over ? 'More bots than spaces' : 'Bot spaces are full', html:
      '<div class="empty" style="padding:6px 0 16px"><div class="ei">' + ic('robot') + '</div><b>' + b.used + ' of ' + b.total + ' spaces in use</b><p>' + (over ? 'Your bots keep working. To pair a new one, delete ' + (b.used - b.total + 1) + ' bot' + (b.used - b.total + 1 === 1 ? '' : 's') + ' you no longer use.' : 'Delete a bot you no longer use, or get more space.') + '</p></div>' +
      (!u ? '<button class="btn block tap" data-login>' + ic('user') + ' Sign in for more spaces</button>' : (!u.isPremium ? '<button class="btn gold block tap" data-premium>' + ic('crown') + ' Upgrade to Premium (6 spaces)</button>' : '')) +
      (u ? '<button class="btn alt block tap" style="margin-top:10px" data-buy>' + ic('wallet') + ' Buy 1 space · 15 coins</button>' : '') +
      '<button class="btn ghost block tap" style="margin-top:6px" data-close>Delete an old bot instead</button>' });
    $$('[data-premium],[data-login]', s.el).forEach(function (e) { e.addEventListener('click', function () { s.close(); }); });
    $('[data-close]', s.el).onclick = s.close;
    var buy = $('[data-buy]', s.el); if (buy) buy.onclick = function () { s.close(); EH.buySpace(); };
  };
  EH.buySpace = function () {
    var have = (EH.user && EH.user.coins) || 0, COST = 15;
    if (have < COST) { EH.shortage(have, COST, 'unlock 1 more bot space'); return; }
    EH.confirm({ title: 'Buy a bot space?', text: 'Buy 1 bot space for ' + COST + ' coins. Balance: ' + have + ' → ' + (have - COST) + ' coins.', ok: 'Yes, buy' }).then(function (y) {
      if (!y) return; EH.api('/api/spaces/buy', { method: 'POST', body: {} }).then(function (r) {
        if (!r.d.success) return EH.toast(r.d.error || 'Failed', 'er'); EH.toast('Bot space unlocked! ' + r.d.coinsLeft + ' coins left.', 'ok'); EH.refreshUser().then(function () { EH.emit('bots'); });
      });
    });
  };
  EH.shortage = function (have, need, action) {
    var short = need - have;
    var s = EH.sheet({ title: 'Not enough coins', html: '<div class="empty" style="padding:4px 0 14px"><div class="ei" style="color:#f5b417">' + ic('wallet') + '</div><b>You need ' + short + ' more coin' + (short > 1 ? 's' : '') + '</b><p>to ' + esc(action) + '. Balance: ' + have + ' / ' + need + ' needed.</p></div>' +
      '<button class="btn block tap" data-coins>' + ic('wallet') + ' Buy coins</button><button class="btn alt block tap" style="margin-top:10px" data-spin>' + ic('gift') + ' Get free coins with Tasks</button>' });
    $('[data-coins]', s.el).onclick = function () { s.close(); EH.openBuyCoins(); }; $('[data-spin]', s.el).onclick = function () { s.close(); EH.go('spin'); };
  };
  EH.dbFull = function () {
    var s = EH.sheet({ title: 'Servers are filling up', html: '<div class="empty" style="padding:4px 0 14px"><div class="ei">' + ic('server') + '</div><b>We could not save a new bot right now</b><p>The storage for new bots is full. Tell the admin and it will be fixed as soon as possible.</p></div><button class="btn block tap" data-rep>' + ic('send') + ' Report to admin</button><div class="note" style="text-align:center" data-msg></div>' });
    $('[data-rep]', s.el).onclick = function (e) { var b = e.currentTarget; b.classList.add('busy'); EH.api('/api/db-full/report', { method: 'POST', body: {} }).then(function (r) { b.classList.remove('busy'); if (r.d.success) { b.disabled = true; $('[data-msg]', s.el).innerHTML = '<b class="okc">Report sent to the admin.</b><br>Please check again in 1 to 2 hours.'; } else $('[data-msg]', s.el).textContent = r.d.error || 'Could not send the report, please try again later.'; }); };
  };

  EH.screen('deploy', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Deploy Bot', sub: 'Link your WhatsApp number', icon: 'rocket', ia: '#ff2e93', ib: '#7c2bff' }), body = f.body, alive = true, pairToken = null, cfSite = null, cfId = null, cfTok = null, cfWaiters = [], busy = false, watch = null;
    body.innerHTML =
      '<div class="dp-hero rise"><div class="dp-hl"><div class="svc-logo"><img src="/logo.png" alt=""></div><div><h2>Deploy your bot</h2><p>Enter your number, get a pairing code and link it in WhatsApp. Live in about a minute.</p></div></div>' +
        '<div class="dp-st"><div><b data-st="bots"><i class="sk"></i></b><span>Bots paired</span></div><div><b data-st="srv"><i class="sk"></i></b><span>Servers</span></div><div><b data-st="slots"><i class="sk"></i></b><span>Free slots</span></div></div>' +
        '<button class="svc-how tap" data-tut type="button" style="--g2:var(--p)">' + ic('play') + ' Watch the tutorial</button></div>' +
      EH.adCard() +
      '<form class="card rise" data-form style="--i:1;margin-top:14px" autocomplete="off">' +
        '<label class="fld"><span>Your WhatsApp number</span><div class="inwrap"><span class="pre">' + ic('phone') + '</span><input class="inp big" data-phone type="tel" inputmode="numeric" placeholder="2349012345678" autocomplete="off"></div></label>' +
        '<div class="note" style="margin:-6px 4px 14px">Start with the country code, no + and no leading 0. Example for Nigeria: <b>2349012345678</b>.</div>' +
        '<div data-cf style="margin-bottom:14px;display:none;justify-content:center"></div>' +
        '<div class="dp-bar" data-bar hidden><i data-fill></i></div>' +
        '<button class="btn block tap" type="submit" data-go-btn>' + ic('bolt') + ' Generate pairing code</button>' +
        '<div class="note" style="text-align:center">By continuing you accept our <a data-terms style="color:var(--p);font-weight:700">Terms</a> and <a data-privacy style="color:var(--p);font-weight:700">Privacy Policy</a>.</div>' +
      '</form>' +
      '<div data-result class="hide"></div>' +
      '<div class="sec"><h3>Your bot spaces</h3><span data-spaces></span></div><div class="card" data-slots></div>' +
      '<div class="sec"><h3>My bots</h3></div><div data-bots></div>';
    $('[data-terms]', body).onclick = function () { EH.go('terms'); }; $('[data-privacy]', body).onclick = function () { EH.go('privacy'); }; $$('[data-tut]', body).forEach(function (t) { t.onclick = function () { EH.go('tutorial'); }; });

    /* security check + pair token */
    function getToken(n) { n = n || 1; return EH.api('/api/pair-token', { auth: false }).then(function (r) { if (r.d && r.d.success) { pairToken = r.d.token; return; } if (n < 3) return new Promise(function (ok) { setTimeout(ok, n * 800); }).then(function () { return getToken(n + 1); }); }); }
    getToken();
    EH.api('/api/pages/status', { auth: false }).then(function (r) {
      cfSite = r.d && r.d.success ? (r.d.turnstileSiteKey || null) : null; if (!cfSite || !alive) return;
      var box = $('[data-cf]', body); box.style.display = 'flex'; box.innerHTML = '<div class="note">Loading security check…</div>';
      cfLoad().then(function (ts) {
        if (!ts || !alive) return; box.innerHTML = '';
        try { cfId = ts.render(box, { sitekey: cfSite, theme: 'dark', callback: function (t) { cfTok = t; var w = cfWaiters; cfWaiters = []; w.forEach(function (f) { f(t); }); }, 'expired-callback': function () { cfTok = null; }, 'error-callback': function () { cfTok = null; } }); } catch (e) { box.innerHTML = ''; }
      });
    });
    function cfEnsure() {
      if (!cfSite) return Promise.resolve(null); if (cfTok) return Promise.resolve(cfTok);
      return new Promise(function (res) { var t = setTimeout(function () { res(null); }, 12000); cfWaiters.push(function (v) { clearTimeout(t); res(v); }); }).then(function (t) { if (!t) EH.toast('Please tick the verify box first', 'er'); return t; });
    }

    /* my bots list */
    var chip = function (st) { return st === 'online' ? '<span class="chip ok">Online</span>' : st === 'offline' ? '<span class="chip er">Offline</span>' : st === 'pairing' ? '<span class="chip warn">Waiting for link</span>' : '<span class="chip">Checking</span>'; };
    function paintBots() {
      if (!alive) return; var b = EH.botSpaces(), list = b.list, dots = '';
      for (var i = 0; i < Math.min(b.total, 10); i++) dots += '<i class="' + (i < b.used ? 'u' : '') + '"></i>';
      $('[data-spaces]', body).innerHTML = b.used + ' of ' + b.total + ' used';
      var sl = ''; for (var k = 0; k < Math.min(Math.max(b.total, b.used), 12); k++) {
        var it = list[k]; sl += it ? '<div class="slot used"><span>' + ic('robot') + '</span><small>…' + esc(digits(it.phoneNumber).slice(-4)) + '</small></div>' : '<button type="button" class="slot free tap" data-free>' + ic('plus') + '<small>Free</small></button>'; }
      if (EH.user) sl += '<button type="button" class="slot buy tap" data-buyslot>' + ic('wallet') + '<small>15 coins</small></button>';
      $('[data-slots]', body).innerHTML = '<div class="slots">' + sl + '</div><div class="note" style="margin:10px 2px 0">' + (EH.user ? (EH.user.isPremium ? 'Premium: 6 bot spaces.' : 'Free: 3 bot spaces. Premium gets 6, or buy more with coins.') : 'Sign in to get more bot spaces.') + '</div>';
      $$('[data-free]', body).forEach(function (x) { x.onclick = function () { var i = $('[data-phone]', body); EH.reveal(i, 'center'); setTimeout(function () { i.focus({ preventScroll: true }); }, 350); }; });
      var bs = $('[data-buyslot]', body); if (bs) bs.onclick = EH.buySpace;
      var box = $('[data-bots]', body);
      if (!list.length) { box.innerHTML = '<div class="empty"><div class="ei">' + ic('robot') + '</div><b>No bots yet</b><p>Pair your first bot above. It will show up here.</p></div>'; return; }
      box.innerHTML = '<div class="grp">' + list.map(function (s) {
        var n = digits(s.phoneNumber), st = online[n];
        return '<div class="row"><div class="ri" style="--a:' + (st === 'online' ? '#34d399' : '#64748b') + ';--b:' + (st === 'online' ? '#059669' : '#334155') + '">' + ic('robot') + '</div><div class="rt"><b>+' + esc(n) + '</b><small>' + (s.synced ? 'On your account' : 'Paired on this phone') + '</small></div>' + chip(st) + '<button class="ibtn tap" data-del="' + esc(s.phoneNumber) + '" aria-label="Delete" style="margin-left:6px;color:#f87171">' + ic('trash') + '</button></div>';
      }).join('') + '</div>';
      $$('[data-del]', box).forEach(function (bt) { bt.onclick = function () { del(bt.dataset.del); }; });
    }
    function del(phone) {
      EH.confirm({ title: 'Delete this bot?', text: '+' + digits(phone) + ' will be removed from all servers. You can pair it again later.', ok: 'Delete', danger: true }).then(function (y) {
        if (!y) return; EH.toast('Deleting…'); saveSess(sess().filter(function (s) { return s.phoneNumber !== phone; })); paintBots();
        EH.api('/session/' + phone, { method: 'DELETE', headers: { 'X-Force-Delete': 'true' }, body: { deviceId: EH.devId() }, timeout: 20000 }).then(function (r) {
          if (EH.user) EH.refreshUser().then(paintBots);
          var d = r.d || {}; if (d.success && d.serversDeleted && d.serversDeleted.length) EH.toast('Bot deleted ✓', 'ok'); else if (d.success) EH.toast('Bot removed', ''); else EH.toast('Removed here. The server may have failed to delete it.', '');
        });
      });
    }

    /* pairing */
    function showCode(code, phone) {
      var box = $('[data-result]', body); box.classList.remove('hide');
      var clean = String(code).replace(/[^A-Za-z0-9]/g, '');
      box.innerHTML = '<div class="card dp-code"><small>YOUR PAIRING CODE</small><div class="code" data-code>' + esc(code) + '</div>' +
        '<div class="btns" style="margin-top:14px"><button class="btn sm tap" data-copy>' + ic('copy') + ' Copy</button><button class="btn sm alt tap" data-hide>' + ic('x') + ' Close</button></div>' +
        '<div class="dp-live" data-live><i class="live off"></i><span>Waiting for you to link it in WhatsApp…</span></div></div>' +
        '<div class="card" style="margin-top:12px"><div class="dp-steps"><div><i>1</i><span>Open <b>WhatsApp</b> on the phone with <b>+' + esc(digits(phone)) + '</b></span></div><div><i>2</i><span>Tap <b>⋮ Menu → Linked devices → Link a device</b></span></div><div><i>3</i><span>Tap <b>Link with phone number instead</b></span></div><div><i>4</i><span>Type the code above</span></div></div></div>';
      $('[data-copy]', box).onclick = function () { EH.copy(clean, 'Code copied!'); };
      $('[data-hide]', box).onclick = function () { box.classList.add('hide'); clearInterval(watch); };
      EH.reveal(box, 'center');   // in the middle of the screen (it used to scroll too far, under the header and the ad)
      var n = digits(phone), tries = 0; clearInterval(watch);
      watch = setInterval(function () {
        if (!alive || ++tries > 40) { clearInterval(watch); return; }
        pollStates().then(function () {
          var st = online[n], live = $('[data-live]', box); if (!live) return;
          if (st === 'online') { live.innerHTML = '<i class="live"></i><span class="okc"><b>Linked!</b> Your bot is online. Send <b>.menu</b> to it on WhatsApp.</span>'; clearInterval(watch); EH.buzz(20); }
          paintBots();
        });
      }, 5000);
    }
    function pair(phone) {
      if (busy) return; var u = EH.user, b = EH.botSpaces();
      var activeLocal = sess().filter(function (s) { return s.status === 'active'; }).length;
      if (!u && activeLocal >= GUEST_SPACES) { EH.login('You have used your free spaces. Sign in for more space.'); return; }
      if (u && b.used >= b.total) { EH.spaceFull(); return; }
      busy = true; var btn = $('[data-go-btn]', body); btn.classList.add('busy');
      var go = pairToken ? Promise.resolve() : getToken();
      go.then(cfEnsure).then(function (cf) {
        if (cfSite && !cf) { busy = false; btn.classList.remove('busy'); return null; }
        var bar = $('[data-bar]', body), fill = $('[data-fill]', body); bar.hidden = false; var prog = 0; fill.style.width = '0';
        var iv = setInterval(function () { prog = Math.min(90, prog + Math.random() * 15); fill.style.width = prog + '%'; }, 200);
        return EH.api('/request-pairing', { method: 'POST', auth: false, timeout: 60000, body: { phoneNumber: phone, deviceId: EH.devId(), username: u ? u.username : null, pairToken: pairToken, cfToken: cf } }).then(function (r) {
          clearInterval(iv); fill.style.width = '100%'; pairToken = null; getToken(); if (cfId != null && window.turnstile) { try { window.turnstile.reset(cfId); } catch (e) {} } cfTok = null;
          setTimeout(function () { bar.hidden = true; fill.style.width = '0'; }, 450);
          var d = r.d || {}; busy = false; btn.classList.remove('busy');
          if (d.success) {
            var list = sess(), x = { phoneNumber: phone, timestamp: Date.now(), status: 'active', deviceId: EH.devId() }, i = -1; list.forEach(function (s, k) { if (s.phoneNumber === phone) i = k; });
            if (i >= 0) list[i] = x; else list.push(x); saveSess(list); online[digits(phone)] = 'pairing';
            showCode(d.pairingCode, phone); paintBots(); EH.buzz(25);
            EH.toast('Pairing code ready!' + (d.serverInfo && d.serverInfo.serverUsed ? ' Server: ' + d.serverInfo.serverUsed : ''), 'ok');
            if (EH.user) EH.refreshUser().then(paintBots); $('[data-phone]', body).value = '';
          } else if (d.code === 'NO_BOT_SPACE') EH.spaceFull();
          else if (d.code === 'DB_FULL') EH.dbFull();
          else EH.toast(d.error || 'Pairing failed', 'er');
        });
      }).catch(function () { busy = false; btn.classList.remove('busy'); EH.toast('Network error. Try again.', 'er'); });
    }
    $('[data-form]', body).addEventListener('submit', function (e) {
      e.preventDefault(); var phone = $('[data-phone]', body).value.trim().replace(/\s+/g, '');
      if (!phone) return EH.toast('Enter your phone number', 'er');
      var n = digits(phone); if (n.charAt(0) === '0') return EH.toast('Start with the country code instead of the leading 0 (for Nigeria: 234…)', 'er');
      pair(n);
    });

    var cs = EH.ls.json('eh_app_stats', {});
    function paintStats(o) { ['bots', 'srv', 'slots'].forEach(function (k) { var e = $('[data-st="' + k + '"]', body); if (e && o[k] != null) e.textContent = EH.fmt(o[k]); }); }
    paintStats(cs);
    EH.api('/sessions', { auth: false, timeout: 12000 }).then(function (r) { var a = r.d && r.d.success ? r.d : null; if (!a || !alive) return; var st = a.serverStats || {}; var o = { bots: a.total || 0, srv: st.detectedServers || 0, slots: st.serversLeft == null ? 0 : st.serversLeft }; for (var k in o) cs[k] = o[k]; EH.ls.set('eh_app_stats', JSON.stringify(cs)); paintStats(o); });
    paintBots(); EH.syncBots().then(function () { return pollStates(); }).then(paintBots);
    var iv2 = setInterval(function () { if (!document.hidden) pollStates().then(paintBots); }, 45000);
    var off = EH.on('bots', paintBots), off2 = EH.on('user', paintBots);
    EH.mountAds(scr);
    return { destroy: function () { alive = false; clearInterval(watch); clearInterval(iv2); off(); off2(); } };
  } });
})();
