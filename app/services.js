/* Channel React (+ Auto React) and Poll Voting - FIXED: EVERY BOT REACTS! */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var TOP = ['❤️', '👍', '😮', '🙏', '😂', '🔥', '😍', '👏', '😢', '🎉', '🙌', '✨', '💯', '🤔', '😎', '🥳', '🤩', '💡', '🚀', '👀', '✅', '❌', '😭', '💔', '💙', '💚', '💛', '🧡', '💜', '🖤'];
  var fmtT = function (ms) { var t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return h ? h + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2) : ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2); };
  var resetIn = function (t) { var l = t - Date.now(); return l > 0 ? fmtT(l) : 'soon'; };

  EH.pageOn = function (key) { return EH.api('/api/pages/status', { auth: false }).then(function (r) { return r.d && r.d.success ? r.d.pages[key] !== false : true; }, function () { return true; }); };
  function maint(body, what) { body.innerHTML = '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('warn') + '</div><b>Under maintenance</b><p>' + esc(what) + ' is temporarily unavailable. Please try again later.</p></div>'; }

  var cfScript = null;
  function cfBox(box) {
    var site = null, id = null, tok = null, waiters = [], ready = EH.api('/api/pages/status', { auth: false }).then(function (r) {
      site = r.d && r.d.success ? (r.d.turnstileSiteKey || null) : null; if (!site) return;
      box.style.display = 'flex'; box.innerHTML = '<div class="note">Loading security check…</div>';
      var load = window.turnstile ? Promise.resolve(window.turnstile) : (cfScript || (cfScript = new Promise(function (res) { var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = function () { res(window.turnstile || null); }; s.onerror = function () { cfScript = null; res(null); }; document.head.appendChild(s); })));
      return load.then(function (ts) { if (!ts) return; box.innerHTML = ''; try { id = ts.render(box, { sitekey: site, theme: 'dark', callback: function (t) { tok = t; var w = waiters; waiters = []; w.forEach(function (f) { f(t); }); }, 'expired-callback': function () { tok = null; }, 'error-callback': function () { tok = null; } }); } catch (e) {} });
    });
    return { ensure: function () { return ready.then(function () { if (!site) return null; if (tok) return tok; return new Promise(function (res) { var t = setTimeout(function () { res(null); }, 12000); waiters.push(function (v) { clearTimeout(t); res(v); }); }).then(function (v) { if (!v) EH.toast('Please tick the verify box first', 'er'); return v; }); }); },
      needed: function () { return !!site; }, reset: function () { tok = null; if (id != null && window.turnstile) { try { window.turnstile.reset(id); } catch (e) {} } } };
  }

  function unlock(number, btn, done) {
    number = String(number || '').replace(/\D/g, ''); if (!number) return EH.toast('Enter your premium bot number', 'er'); btn.classList.add('busy');
    var post = function (body) { return EH.api('/api/channel-react/premium-link', { method: 'POST', body: body }).then(function (r) { return r.d; }); };
    post({ number: number }).then(function (d) {
      if (!d) { btn.classList.remove('busy'); return null; }
      if (d.notPremium) { btn.classList.remove('busy'); EH.confirm({ title: '+' + number + ' is not Premium', text: 'Do you want to upgrade this number to Premium now?', ok: 'Upgrade it' }).then(function (y) { if (y) EH.openPremPay({ prefill: number }); }); return null; }
      if (!d.success) { btn.classList.remove('busy'); EH.toast(d.error || 'Failed', 'er'); return null; }
      var msg = d.needsReplace
        ? 'This account already has +' + d.current + ' linked. Continue with +' + number + '? Then +' + d.current + ' is unlinked.'
        : (d.until ? 'This number is Premium until ' + EH.date(d.until) + '. ' : '') + 'It will be used by this account only, and you can unbind it later from your profile.';
      return EH.confirm({ title: 'Link +' + number + '?', text: msg, ok: 'Link it' }).then(function (y) {
        if (!y) { btn.classList.remove('busy'); return null; }
        return post({ number: number, confirm: true, replace: !!d.needsReplace });
      });
    }).then(function (d2) {
      btn.classList.remove('busy'); if (!d2) return;
      if (!d2.success) return EH.toast(d2.error || 'Failed', 'er');
      if (EH.user) { EH.user.boundNumber = number; if (EH.setUser) EH.setUser(EH.user); }
      EH.toast('Premium activated on this account 👑', 'ok');
      EH.refreshUser().then(function () { if (done) done(); });
    }).catch(function () { btn.classList.remove('busy'); EH.toast('Network error', 'er'); });
  }

  function hero(o) {
    return '<div class="svc-hero rise" style="--g1:' + o.g1 + ';--g2:' + o.g2 + '"><span class="svc-wm">' + ic(o.icon) + '</span><div class="svc-top"><div class="svc-logo"><img src="/logo.png" alt=""></div><div class="svc-tx"><h2>' + o.title + '</h2><p>' + o.sub + '</p></div></div>' +
      '<button class="svc-how tap" data-how="' + o.video + '">' + ic('play') + ' See how it works</button></div>';
  }
  function wireHow(root) {
    $$('[data-how]', root).forEach(function (b) { b.onclick = function () { var s = EH.sheet({ title: '', full: true, html: '<video src="/videos/' + b.dataset.how + '.mp4?v=1" controls autoplay playsinline style="width:100%;border-radius:18px;background:#000;max-height:76vh"></video>', onClose: function () { var v = $('video', s.el); if (v) v.pause(); } }); }; });
  }
  /* FOR EVERYONE: Premium = boundNumber, Free = own deployed bots. Shows BOT COUNT! */
  function premCard(o) {
    var u = EH.user || {}, d = o.d;
    var botCount = o.botCount || 0;
    var botLine = botCount ? '<span style="display:block;margin-top:6px">Your bots: <b>' + botCount + '</b> ' + (botCount === 1 ? 'bot' : 'bots') + ' will react — 1 react per bot number!</span>' : '<span style="display:block;margin-top:6px;color:#f87171">No bot linked yet.</span>';
    if (u.isPremium) {
      var left = d ? Math.max(0, d.limit - d.used) : 0;
      return '<div class="card rcard prem"><div class="pf-t" style="color:#f5b417">' + ic('crown') + ' Premium — ' + o.free + ' free ' + o.what + ' a day</div><div class="sub">' + (d ? (left > 0 ? '<b style="color:#f5b417">' + left + ' of ' + d.limit + '</b> free ' + o.what + ' left today · 1 minute between each. Resets in ' + resetIn(d.reset) + '.' : 'You used all ' + d.limit + ' free ' + o.what + ' today. More cost <b>1 coin</b> each. Free ones are back in ' + resetIn(d.reset) + '.') : 'Premium: ' + o.free + ' free ' + o.what + ' a day.') + (u.boundNumber ? '<span style="display:block;margin-top:6px">Linked: <b>+' + esc(u.boundNumber) + '</b></span>' : '') + botLine + '</div></div>';
    }
    if (o.hasBot) {
      return '<div class="card rcard prem"><div class="pf-t" style="color:#4ade80">' + ic('check') + ' Bot linked — ' + o.free + ' free ' + o.what + ' a day</div><div class="sub">Your bot: <b>+' + esc(o.botNumber || u.boundNumber || '') + '</b> · Free accounts get ' + o.free + ' a day. Extra costs 1 coin each.' + botLine + '</div></div>';
    }
    return '<div class="card rcard prem" data-unbox><div class="pf-t" style="color:#f5b417">' + ic('crown') + ' Are you a premium user?</div><div class="sub" style="margin-bottom:12px">Premium? Enter your premium bot number to unlock ' + o.more + '.<br><b>Not Premium?</b> You can still use Channel React with YOUR OWN bots — deploy them first, it is FREE. Every bot you deploy = 1 more react!</div>' +
      '<div class="btns"><input class="inp" data-un type="tel" inputmode="numeric" placeholder="e.g. 2349012345678" autocomplete="off" style="flex:2;height:50px"><button class="btn gold tap" data-unlock style="flex:1;height:50px">' + ic('lock') + ' Unlock</button></div>' +
      '<button class="btn alt block tap" data-godeploy style="margin-top:10px">' + ic('plus') + ' Deploy MY bots (Free)</button></div>';
  }
  function balRow(o) {
    var u = EH.user; if (!u) return '';
    var d = o.d, left = d ? Math.max(0, d.limit - d.used) : 0;
    var lt = u.isPremium ? '<span class="bal-left">' + ic('crown') + ' <b>' + (d ? left + ' of ' + d.limit : o.free) + '</b> free ' + o.what + ' left today</span>' : '<button type="button" class="bal-up tap" data-premium>' + ic('crown') + ' Get unlimited ' + o.unl + '?</button>';
    return '<div class="bal-row">' + lt + '<div class="pill bal-pill tap" data-buycoins role="button" aria-label="Add coins"><span class="coin">EH</span><span>' + EH.bal(u.coins) + '</span><span class="plus">' + ic('plus') + '</span></div></div>';
  }
  function wireUnlock(root, done) {
    var b = $('[data-unlock]', root); if (b) b.onclick = function () { unlock($('[data-un]', root).value, b, done); };
    var i = $('[data-un]', root); if (i) i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); b.click(); } };
    var g = $('[data-godeploy]', root); if (g) g.onclick = function () { EH.go('deploy'); };
  }
  function coinsCard() {
    return '<div class="card pf-coins rise" style="margin-top:18px"><div class="pc-top"><span class="coin lg">EH</span><div><small>YOUR COINS</small><b data-cb2>' + EH.bal(EH.user ? EH.user.coins : 0) + '</b></div></div>' +
      '<div class="note" style="margin:10px 2px 12px">Each submission costs 1 coin after your free uses.</div>' +
      '<div class="svc-ac"><button class="tap" data-go="spin">' + ic('gift') + '<span>Earn coins<small>by tasks</small></span></button><button class="tap" data-buycoins>' + ic('wallet') + '<span>Buy<small>coins</small></span></button><button class="tap" data-redeem>' + ic('hash') + '<span>Redeem<small>a code</small></span></button></div></div>';
  }
  function wireCoins(root) { var r = $('[data-redeem]', root); if (r) r.onclick = EH.openRedeem; }
  function bindBal(scr) { return EH.on('user', function () { var c = $('[data-cb2]', scr); if (c) c.textContent = EH.bal(EH.user ? EH.user.coins : 0); }); }

  /* FIXED: Amount = HOW MANY OF YOUR BOTS REACT! 1 bot = 1 react! */
  function amountRow(id, max, botCount) {
    if (!max || max < 1) return '<div class="note" style="margin:0 4px 12px">No bots linked yet. Deploy a bot first — every bot = 1 react!</div>';
    if (max < 2) return '<div class="note" style="margin:0 4px 12px">Bots that will react: <b>1</b> (you have 1 bot — deploy more bots to get more reacts!)</div>';
    return '<div class="fld" data-amt-row><span>How many of YOUR bots react? <b data-av style="color:var(--tx);float:right;text-transform:none;font-size:15px">' + EH.fmt(max) + ' bots = ' + EH.fmt(max) + ' reacts</b></span><input type="range" min="1" max="' + max + '" value="' + max + '" step="1" data-amt style="width:100%;accent-color:var(--p);height:34px"><div class="note" style="margin:4px 0 0">You have <b>' + botCount + '</b> bots. Each bot = 1 WhatsApp number = 1 react. Slide to choose how many of YOUR bots react!</div></div>';
  }
  function amountVal(root) { var i = $('[data-amt]', root); if (!i) return 1; return Math.max(1, Number(i.value) || 1); }
  function bindAmount(root) { var i = $('[data-amt]', root); if (i) i.oninput = function () { var v = $('[data-av]', root); if (v) v.textContent = EH.fmt(i.value) + ' bots = ' + EH.fmt(i.value) + ' reacts'; hint(); }; }

  var RHERO = { g1: '#ff6aa8', g2: '#e11d63', icon: 'heart', title: 'Channel React', sub: 'Send free WhatsApp channel reactions to any post. Pick the emojis, choose an amount and boost your channel with real bots.', video: 'channel-react' };
  var VHERO = { g1: '#60a5fa', g2: '#2563eb', icon: 'poll', title: 'Poll Voting', sub: 'Send votes to any WhatsApp channel poll and push your option to the top.', video: 'poll-vote' };

  EH.screen('react', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Channel React', sub: 'Reactions for any channel post', icon: 'heart', ia: '#ff6aa8', ib: '#e11d63' }), body = f.body, alive = true, sel = [], timer = null, nextAt = 0, st = {}, cf = null, ar = null, arT = null, prevT = null;
    var off = EH.on('user', function () { if (alive) { premBox(); hint(); } }), off2 = bindBal(scr);
    var gone = function () { alive = false; clearInterval(timer); clearInterval(arT); off(); off2(); };
    if (!EH.token) { guest(); return { destroy: gone }; }
    body.innerHTML = '<div class="skb" style="height:150px;border-radius:26px"></div><div class="skb" style="height:110px;margin-top:14px"></div><div class="skb" style="height:230px;margin-top:14px"></div>';
    EH.pageOn('channelReact').then(function (ok) { if (!ok) return maint(body, 'Channel React'); EH.refreshUser().then(function () { shell(); loadStatus(); autoLoad(); }); });

    function guest() {
      body.innerHTML = hero(RHERO) + '<div class="card rise" style="text-align:center;padding:22px 18px;margin-top:14px"><div class="sub" style="margin-bottom:14px">Sign in to send reactions to a channel post.</div><button class="btn block tap" data-login>' + ic('user') + ' Sign in to continue</button></div>';
      wireHow(body);
    }
    function shell() {
      body.innerHTML = hero(RHERO) + EH.adCard() + '<div data-bal style="margin-top:14px"></div><div data-rform></div><div data-pw></div>' +
        '<div class="sec"><h3>More</h3></div><div class="grp"><div class="row tap" data-openauto><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic('crown') + '</div><div class="rt"><b>Channel Auto React</b><small>New posts on your channel get reactions by themselves</small></div><span class="chip" style="color:#f5b417;border-color:rgba(245,180,23,.5);background:rgba(245,180,23,.1)">PREMIUM</span>' + ic('chevR', 'chev') + '</div></div>' + coinsCard();
      wireHow(body); wireCoins(body); premBox(); reactPane(); EH.mountAds(body);
      $('[data-openauto]', body).onclick = openAuto;
    }
    function premBox() {
      var bal = $('[data-bal]', body), box = $('[data-pw]', body); if (!box || (document.activeElement && box.contains(document.activeElement) && /INPUT/.test(document.activeElement.tagName))) return;
      var u = EH.user || {};
      // FOR EVERYONE: botCount from /api/my-bots, not just boundNumber!
      var botCount = st.botCount || (st.bots ? st.bots.length : 0) || (u.boundNumber ? 1 : 0);
      var po = { d: u.isPremium && st.premium ? { limit: st.dailyLimit, used: st.dailyUsed, reset: Date.parse(st.dailyResetAt || st.reset || new Date().setUTCHours(24,0,0,0)) } : null, free: u.isPremium ? 10 : 1, what: 'Channel Reacts', more: 'more reactions and Channel Auto React', unl: 'Channel React', hasBot: !!st.hasBot || !!u.boundNumber || botCount > 0, botNumber: (st.bots && st.bots[0]) || u.boundNumber || '', botCount: botCount };
      if (bal) bal.innerHTML = balRow(po); box.innerHTML = premCard(po);
      box.style.marginTop = '14px'; wireUnlock(box, function () { loadStatus(); autoLoad(); });
    }

    /* FOR EVERYONE: fetch status + my-bots together! */
    function loadStatus() {
      Promise.all([
        EH.api('/api/channel-react/status'),
        EH.api('/api/my-bots').catch(function(){ return { d: { bots: [] } }; })
      ]).then(function (rs) {
        var d = rs[0].d || {}; if (!d.success) return; st = d;
        var myBots = (rs[1].d && rs[1].d.bots) || [];
        // If status has bots, use them, else use my-bots
        var allBots = [];
        if (d.bots && d.bots.length) allBots = d.bots;
        if (myBots.length) {
          var nums = myBots.map(function(b){ return b.number; });
          nums.forEach(function(n){ if (allBots.indexOf(n) < 0) allBots.push(n); });
        }
        // Premium boundNumber is also a bot
        if (d.boundNumber && allBots.indexOf(d.boundNumber) < 0) allBots.push(d.boundNumber);
        st.bots = allBots;
        st.botCount = allBots.length;
        st.hasBot = allBots.length > 0;
        if (allBots.length && EH.user && !EH.user.boundNumber) EH.user.boundNumber = allBots[0];
        if (EH.user) {
          EH.user.isPremium = !!d.premium;
          if (d.boundNumber) EH.user.boundNumber = d.boundNumber;
          if (typeof d.coins === 'number') EH.user.coins = d.coins;
          if (EH.setUser) EH.setUser(EH.user);
        }
        if (d.refillPrice) EH.refillPrice = d.refillPrice;
        setNext(d.nextAt ? Date.parse(d.nextAt) : 0); if (alive) { premBox(); reactPane(true); }
      });
    }
    function setNext(ts) { nextAt = ts && ts > Date.now() ? ts : 0; if (nextAt) EH.ls.set('eh_cr_next', String(nextAt)); else EH.ls.del('eh_cr_next'); run(); }
    function run() {
      clearInterval(timer); var btn = $('[data-send]', body); if (!btn) return;
      var tick = function () { btn = $('[data-send]', body); if (!btn) { clearInterval(timer); return; } var left = nextAt - Date.now();
        if (left <= 0) { clearInterval(timer); nextAt = 0; EH.ls.del('eh_cr_next'); btn.innerHTML = ic('send') + ' Send reactions'; btn.classList.remove('wait'); return; }
        btn.classList.add('wait'); btn.innerHTML = ic('clock') + ' Next react in ' + fmtT(left); };
      tick(); if (nextAt) timer = setInterval(tick, 1000);
    }
    function hint() {
      var h = $('[data-hint]', body), u = EH.user, dd = st.premium ? { limit: st.dailyLimit, used: st.dailyUsed } : null; if (!h || !u) return;
      var remaining = u.channelReactProRemaining || 0, total = u.channelReactProTotal || 0, hasFree = remaining > 0 && !u.isPremium, mode = ($('[data-um].on', body) || {}).dataset ? $('[data-um].on', body).dataset.um : 'free', premFree = u.isPremium && dd && dd.used < dd.limit;
      var um = $('[data-um-row]', body); if (um) um.hidden = !hasFree;
      var botCount = st.botCount || 0;
      var amt = amountVal(body);
      if (!st.hasBot && !u.boundNumber && botCount === 0) {
        h.innerHTML = '<span class="warn">' + ic('warn') + '</span> <b>No bot linked!</b> Deploy YOUR bots first — <a data-godeploy2 style="color:var(--p);font-weight:800">Deploy my bots</a>. Every bot = 1 react!';
        var g2 = $('[data-godeploy2]', h); if (g2) g2.onclick = function () { EH.go('deploy'); };
        return;
      }
      // EVERY BOT REACTS: show how many bots will react!
      var botMsg = '<br><span style="color:#4ade80">🤖 <b>' + amt + ' of YOUR ' + botCount + ' bots</b> will react — 1 react per bot number!</span>';
      if (hasFree && mode === 'free' && !premFree) h.innerHTML = '<span class="okc">' + ic('star') + '</span> This submission uses a <b class="okc">free use</b> (' + remaining + '/' + total + ' left)' + botMsg;
      else if (premFree && mode !== 'coin') h.innerHTML = '<span style="color:#f5b417">' + ic('crown') + '</span> Premium: this react is <b>free</b> · ' + (dd.limit - dd.used) + ' of ' + dd.limit + ' free reacts left today' + botMsg;
      else if (u.isPremium && dd && mode !== 'coin') h.innerHTML = '<span class="warn">' + ic('warn') + '</span> You used your ' + dd.limit + ' free reacts today. This react costs <b>1 coin</b> — or <a data-refill style="color:var(--p);font-weight:800">refill your free uses</a>.' + botMsg;
      else if (!u.isPremium && st.dailyLimit != null && st.dailyUsed >= st.dailyLimit) h.innerHTML = '<span class="coin" style="width:20px;height:20px;font-size:8px;vertical-align:middle">EH</span> You used your free react today. This one costs <b style="color:var(--wa)">1 EH coin</b>.' + botMsg;
      else h.innerHTML = '<span class="coin" style="width:20px;height:20px;font-size:8px;vertical-align:middle">EH</span> You will be debited <b style="color:var(--wa)">1 EH coin</b> for this submission after free uses.' + botMsg;
      var rf = $('[data-refill]', h); if (rf) rf.onclick = function () { EH.openRefill('cr'); };
    }
    function reactPane(keep) {
      var pane = $('[data-rform]', body); if (!pane) return; var u = EH.user || {}, link = keep && $('[data-link]', pane) ? $('[data-link]', pane).value : '', custom = keep && $('[data-custom]', pane) ? !$('[data-custom]', pane).hidden : false;
      // EVERY BOT: max = YOUR bot count! Not dailyLimit!
      var botCount = st.botCount || (st.bots ? st.bots.length : 0) || (u.boundNumber ? 1 : 0);
      var amtMax = botCount; // 3 bots = max 3 reacts, 1 bot = max 1 react
      pane.innerHTML =
        '<form data-form class="card" autocomplete="off">' +
          '<label class="fld"><span>Channel post link</span><div class="inwrap"><span class="pre">' + ic('link') + '</span><input class="inp" data-link type="url" placeholder="https://whatsapp.com/channel/.../123456" value="' + esc(link) + '" autocapitalize="none"></div></label>' +
          '<div class="card ch-prev" data-prev hidden><div class="ch-av" data-pav></div><div style="min-width:0"><b data-pn></b><small>Channel found</small></div></div>' +
          '<div class="fld"><span>Reaction emojis</span><div class="seg" data-rm><button type="button" data-m="auto" class="' + (custom ? '' : 'on') + '">Auto (random)</button><button type="button" data-m="custom" class="' + (custom ? 'on' : '') + '">Choose emojis</button></div></div>' +
          '<div data-auto-note class="note" style="margin:-4px 4px 14px"' + (custom ? ' hidden' : '') + '>Random reactions are chosen for every post.</div>' +
          '<div data-custom' + (custom ? '' : ' hidden') + ' style="margin-bottom:14px"><div class="emo" data-grid></div><div class="btns" style="margin-top:10px"><input class="inp" data-ce placeholder="Type or paste an emoji" style="flex:2"><button type="button" class="btn alt tap" data-add>Add</button></div><div class="chips" data-chips style="margin-top:10px"></div></div>' +
          amountRow('cr', amtMax, botCount) +
          '<div data-cf style="display:none;justify-content:center;margin-bottom:14px"></div>' +
          '<div class="seg" data-um-row hidden style="margin-bottom:12px"><button type="button" data-um="free" class="on">Use a free use</button><button type="button" data-um="coin">Use a coin</button></div>' +
          '<div class="card hintbox" data-hint style="font-size:13px;line-height:1.5;margin-bottom:14px"></div>' +
          '<button class="btn block tap" type="submit" data-send>' + ic('send') + ' Send reactions</button><div data-note class="note"></div></form><div data-result style="margin-top:14px"></div>';
      cf = cfBox($('[data-cf]', pane)); bindAmount(pane);
      var grid = $('[data-grid]', pane), chips = $('[data-chips]', pane);
      function paintEmo() { grid.innerHTML = TOP.map(function (e) { return '<button type="button" class="ep' + (sel.indexOf(e) >= 0 ? ' on' : '') + '" data-e="' + e + '">' + e + '</button>'; }).join(''); chips.innerHTML = sel.length ? sel.map(function (e) { return '<span class="chip on" data-rmv="' + e + '">' + e + ' ×</span>'; }).join('') : '<span class="note" style="margin:0">None — Auto will be used if empty</span>';
        $$('[data-e]', grid).forEach(function (b) { b.onclick = function () { var e = b.dataset.e, i = sel.indexOf(e); if (i >= 0) sel.splice(i, 1); else { if (sel.length >= 5) return EH.toast('Max 5 emojis allowed'); sel.push(e); } paintEmo(); }; });
        $$('[data-rmv]', chips).forEach(function (c) { c.onclick = function () { sel.splice(sel.indexOf(c.dataset.rmv), 1); paintEmo(); }; }); }
      paintEmo();
      $('[data-add]', pane).onclick = function () { var inp = $('[data-ce]', pane), chars = Array.from(inp.value.trim()).filter(function (c) { return c.trim(); }); var added = 0; chars.forEach(function (c) { if (sel.length < 5 && sel.indexOf(c) < 0) { sel.push(c); added++; } }); if (!added && chars.length) EH.toast(sel.length >= 5 ? 'Max 5 emojis allowed' : 'Already added'); inp.value = ''; paintEmo(); };
      $$('[data-m]', pane).forEach(function (b) { b.onclick = function () { var c = b.dataset.m === 'custom'; $$('[data-m]', pane).forEach(function (x) { x.classList.toggle('on', x === b); }); $('[data-custom]', pane).hidden = !c; $('[data-auto-note]', pane).hidden = c; }; });
      $$('[data-um]', pane).forEach(function (b) { b.onclick = function () { $$('[data-um]', pane).forEach(function (x) { x.classList.toggle('on', x === b); }); hint(); }; });
      var li = $('[data-link]', pane); li.oninput = function () { clearTimeout(prevT); var v = li.value.trim(), box = $('[data-prev]', pane); if (!v) { box.hidden = true; return; }
        prevT = setTimeout(function () { var m = v.match(/^(https?:\/\/[^\/]+\/channel\/[A-Za-z0-9_-]+)(?:\/\d+)?$/), base = m ? m[1] : v, invite = (base.match(/channel\/([A-Za-z0-9_-]+)/) || [])[1];
          fetch('https://flat-king-b0cd.KING MD1.workers.dev?url=' + encodeURIComponent(base)).then(function (r) { return r.json(); }).then(function (d) { show(d && d.name ? d.name : (invite || 'WhatsApp Channel'), d && /^https:\/\//.test(d.image || '') ? d.image : ''); }).catch(function () { show(invite || 'WhatsApp Channel', ''); }); }, 400);
        function show(n, img) { var bx = $('[data-prev]', pane); if (!bx) return; bx.hidden = false; $('[data-pn]', bx).textContent = n; $('[data-pav]', bx).innerHTML = img ? '<img src="' + esc(img) + '" alt="" onerror="this.remove()">' : ic('chat'); } };
      if (link) li.oninput();
      $('[data-form]', pane).onsubmit = send; hint(); run();
      var note = $('[data-note]', pane); if (note) { var n = st.freeLimit != null ? st.freeLimit : (u.isPremium ? 10 : 1); note.innerHTML = 'You have <b>' + botCount + '</b> ' + (botCount === 1 ? 'bot' : 'bots') + ' — every bot = 1 react! Deploy more bots to get more reacts. ' + (u.isPremium ? 'Premium gets 10 free reacts a day, 1 minute apart.' : 'Free accounts can react ' + n + ' time' + (n === 1 ? '' : 's') + ' a day.'); }
    }
    function send(e) {
      e.preventDefault(); var pane = $('[data-rform]', body), link = $('[data-link]', pane).value.trim(), u = EH.user || {}; if (!link) return EH.toast('Enter a channel post link', 'er');
      if (link.includes('chat.whatsapp.com')) return EH.toast('That is a GROUP link! Use whatsapp.com/channel/...', 'er');
      if (!link.includes('whatsapp.com/channel/') && !link.includes('/channel/')) return EH.toast('Invalid Channel link. Use https://whatsapp.com/channel/...', 'er');
      var botCount = st.botCount || 0;
      if (!st.hasBot && !u.boundNumber && botCount === 0) { EH.toast('Link a WhatsApp bot first', 'er'); EH.go('deploy'); return; }
      var custom = $('[data-custom]', pane) && !$('[data-custom]', pane).hidden, emoji = null, random = true; if (custom && sel.length) { emoji = sel.join(','); random = false; }
      if (nextAt > Date.now()) { if (u.isPremium) EH.toast('Premium: next react in ' + fmtT(nextAt - Date.now())); else EH.openPremium(); return; }
      var dd = st.premium ? { limit: st.dailyLimit, used: st.dailyUsed } : null;
      if (u.isPremium && dd && dd.used >= dd.limit && EH.ss.get('eh_rf_coins') !== new Date().toISOString().slice(0, 10)) { EH.openRefill('cr', function () { send(e); }); return; }
      var btn = $('[data-send]', pane), res = $('[data-result]', pane); btn.classList.add('busy'); res.innerHTML = '<div class="skb" style="height:56px"></div>';
      var hasFree = (u.channelReactProRemaining || 0) > 0, useMode = hasFree ? (($('[data-um].on', pane) || {}).dataset || {}).um || 'free' : 'free';
      // EVERY BOT: amount = how many of YOUR bots to use! Send YOUR bot list too!
      var botAmount = amountVal(pane);
      var botsToUse = (st.bots || []).slice(0, botAmount);
      cf.ensure().then(function (cfTok) {
        if (cf.needed() && !cfTok) { btn.classList.remove('busy'); res.innerHTML = ''; return; }
        return EH.api('/api/channel-react', { method: 'POST', body: { link: link, emoji: emoji, random: random, useMode: useMode, cfToken: cfTok, amount: botAmount, phoneNumbers: botsToUse, bots: botsToUse }, timeout: 90000 }).then(function (r) {
          btn.classList.remove('busy'); var d = r.d || {}; cf.reset();
          if (d.success) {
            var used = d.emojisUsed ? d.emojisUsed.join(' ') : (emoji || 'random'); EH.buzz(25);
            res.innerHTML = '<div class="card" style="border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.07)"><b class="okc">' + ic('check') + ' Done!</b><div class="sub" style="margin-top:6px">' + (d.reactionsSent > 0 ? EH.fmt(d.reactionsSent) + ' reaction' + (d.reactionsSent === 1 ? '' : 's') + ' sent using: ' + esc(used) + '<br><small>' + EH.fmt(d.reactionsSent) + ' of YOUR bots reacted — 1 per bot number!</small>' : 'Your reactions with ' + esc(used) + ' are on the way.') + '</div></div>';
            if (d.premium && st.premium) st.dailyUsed = d.dailyUsed; loadStatus(); EH.refreshUser(); setNext(d.nextAt ? Date.parse(d.nextAt) : 0);
            EH.sheet({ title: 'Reactions sent!', html: '<div style="text-align:center;padding:4px 0 8px"><div class="pm-crown" style="background:linear-gradient(135deg,#34d399,#059669);color:#fff">' + ic('check') + '</div><div class="sub" style="margin-top:14px;font-size:15px;color:var(--tx)">' + (d.reactionsSent > 0 ? EH.fmt(d.reactionsSent) + ' reaction' + (d.reactionsSent === 1 ? '' : 's') + ' sent with ' + esc(used) + '<br><small>' + EH.fmt(d.reactionsSent) + ' of YOUR bots reacted!</small>' : 'Your reactions with ' + esc(used) + ' are on the way') + '</div>' + (d.nextAt ? '<div class="note">Next react in <b data-tm>' + fmtT(Date.parse(d.nextAt) - Date.now()) + '</b></div>' : '') + '</div><button class="btn block tap" data-ok>Done</button>' }).el.querySelector('[data-ok]').onclick = function () { EH.closeSheets(); };
          } else if (d.cooldown) { res.innerHTML = ''; setNext(d.nextAt ? Date.parse(d.nextAt) : 0); if (u.isPremium) EH.toast(d.error || 'Please wait'); else EH.openPremium(); }
          else if (d.needCoins) { res.innerHTML = '<div class="card" style="border-color:rgba(245,180,23,.45);background:rgba(245,180,23,.07)"><b class="err">' + ic('warn') + ' ' + esc(d.error || 'Not enough coins') + '</b><div style="margin-top:10px"><button class="btn block tap" data-buyc>Buy Coins</button></div></div>'; var bc = $('[data-buyc]', res); if (bc) bc.onclick = function () { if (EH.openBuyCoins) EH.openBuyCoins(); else EH.go('coins'); }; }
          else if (/Link a WhatsApp bot/i.test(d.error || '')) { res.innerHTML = '<div class="card" style="border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.07)"><b class="err">' + ic('warn') + ' ' + esc(d.error) + '</b><div style="margin-top:10px"><button class="btn block tap" data-godeploy>Deploy My Bots</button><button class="btn alt block tap" data-relink style="margin-top:8px">Link Premium Number</button></div></div>'; var gd = $('[data-godeploy]', res); if (gd) gd.onclick = function () { EH.go('deploy'); }; var rl = $('[data-relink]', res); if (rl) rl.onclick = function () { var inp = $('[data-un]', body); if (inp) { EH.reveal(inp, 'center'); inp.focus(); } }; }
          else res.innerHTML = '<div class="card" style="border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.07)"><b class="err">' + ic('warn') + ' ' + esc(d.error || 'Failed') + '</b></div>';
        });
      }).catch(function () { btn.classList.remove('busy'); res.innerHTML = '<div class="card err">Network error</div>'; });
    }

    function arCall(path, b) { return EH.api(path, b === undefined ? {} : { method: 'POST', body: b }).then(function (r) { var d = r.d; if (!d || d.success === false) throw new Error((d && d.error) || (r.net ? 'No connection — check your network and try again.' : 'Failed')); return d; }); }
    var autoSheet = null;
    function openAuto() {
      if (autoSheet) return;
      autoSheet = EH.sheet({ title: 'Channel Auto React', full: true, html: '<div data-auto></div>', onClose: function () { autoSheet = null; clearInterval(arT); } });
      autoLoad();
    }
    function autoLoad(quiet) {
      var pane = autoSheet ? $('[data-auto]', autoSheet.el) : null; if (!pane) return;
      if (!quiet) pane.innerHTML = '<div class="card"><div class="skb" style="height:16px;width:55%"></div><div class="skb" style="height:12px;width:90%;margin-top:12px"></div><div class="skb" style="height:46px;margin-top:14px"></div></div>';
      arCall('/api/autoreact').then(function (d) {
        ar = d; if (!alive) return;
        if (!d.premium) {
          clearInterval(arT);
          pane.innerHTML = '<div class="card ar-lock"><div class="pm-crown">' + ic('lock') + '</div><div class="h1" style="font-size:21px;margin-top:12px">Premium feature</div><div class="sub" style="margin:8px 0 16px">Add your channel once. Every new post you make gets your reactions automatically — no bot needed.</div><button class="btn gold block tap" data-arun>' + ic('key') + ' Enter my premium number</button><button class="btn alt block tap" data-arget style="margin-top:10px">' + ic('crown') + ' Get Premium</button></div>';
          $('[data-arun]', pane).onclick = function () { if (autoSheet) autoSheet.close(); var i = $('[data-un]', body); if (i) { EH.reveal(i, 'center'); setTimeout(function () { i.focus({ preventScroll: true }); }, 350); } };
          $('[data-arget]', pane).onclick = function () { EH.openPremium(); };
          return;
        }
        var chans = d.channels || [], max = d.max || 3, left = Math.max(0, d.usage.limit - d.usage.used);
        pane.innerHTML = '<div class="sub" style="margin:0 2px 12px">Add your channel once. Every new post you make gets your reactions automatically.</div><div class="sec" style="margin-top:6px"><h3>Your channels <span style="color:var(--t2);font-weight:600;font-size:15px">' + chans.length + '/' + max + '</span></h3><span class="chip" style="color:#f5b417;border-color:rgba(245,180,23,.5);background:rgba(245,180,23,.1)">' + ic('bolt') + ' <b>' + left + '</b> of ' + d.usage.limit + ' left</span></div>' +
          (chans.length ? '<div class="grp">' + chans.map(function (c) { return '<div class="row"><div class="ch-av">' + (c.image ? '<img src="' + esc(c.image) + '" alt="" onerror="this.remove()">' : ic('chat')) + '</div><div class="rt"><b>' + esc(c.name || 'WhatsApp channel') + '</b><small>' + (c.emojis || []).join(' ') + '</small></div><label class="sw"><input type="checkbox" data-tg="' + esc(c.id) + '"' + (c.enabled ? ' checked' : '') + '><i></i></label><button class="ibtn tap" data-ed="' + esc(c.id) + '" aria-label="Edit">' + ic('edit') + '</button></div>'; }).join('') + '</div>' : '<div class="empty"><div class="ei">' + ic('chat') + '</div><b>No channel yet</b><p>Add your channel and every new post gets reactions automatically.</p></div>') +
          (chans.length < max ? '<button class="btn block tap" data-addch style="margin-top:14px">' + ic('plus') + ' Add channel</button>' : '<div class="note" style="text-align:center">You have added the most (' + max + ').</div>') +
          '<div class="sec"><h3>History today</h3><a data-rl>Refresh</a></div><div class="grp">' + ((d.log || []).length ? d.log.map(logRow).join('') : '<div class="row"><div class="rt"><small>No posts yet today. New posts in your channels will show here.</small></div></div>') + '</div><div class="note">Each new post uses one of your free reacts. The list is cleared every day.</div>';
        $$('[data-tg]', pane).forEach(function (c) { c.onchange = function () { arCall('/api/autoreact/toggle', { id: c.dataset.tg, enabled: c.checked }).then(function () { EH.toast(c.checked ? 'Channel is ON' : 'Channel is OFF — your settings are kept', 'ok'); }).catch(function (e) { EH.toast(e.message, 'er'); autoLoad(true); }); }; });
        $$('[data-ed]', pane).forEach(function (b) { b.onclick = function () { edit(chans.filter(function (x) { return x.id === b.dataset.ed; })[0]); }; });
        var ad = $('[data-addch]', pane); if (ad) ad.onclick = function () { edit(null); }; $('[data-rl]', pane).onclick = function () { autoLoad(true); };
        clearInterval(arT); arT = setInterval(function () { if (!alive) clearInterval(arT); else if (!document.hidden) autoLoad(true); }, 20000);
      }).catch(function (e) { pane.innerHTML = '<div class="empty"><b>' + esc(e.message || 'Could not load') + '</b></div>'; });
    }
    function logRow(l) { var ico = { reacted: ['check', '#4ade80'], pending: ['clock', 'var(--t2)'], limit: ['warn', '#fbbf24'], failed: ['x', '#f87171'] }[l.status] || ['clock', 'var(--t2)'], t = l.at ? new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      var what = l.status === 'reacted' ? EH.fmt(l.reactions || 0) + ' reaction' + (l.reactions === 1 ? '' : 's') + ' sent' : l.status === 'limit' ? 'Out of reacts for today' : l.status === 'failed' ? 'Could not react' : 'Reacting…';
      return '<div class="row"><div class="rt"><b style="font-size:13.5px"><span style="color:' + ico[1] + '">' + ic(ico[0]) + '</span> ' + what + '</b><small>' + esc(l.channelName || l.name || '') + ' · ' + t + '</small></div></div>'; }
    function edit(c) {
      var emo = c ? (c.emojis || []).slice(0, 5) : [], name = c ? (c.name || '') : '', pt;
      var s = EH.sheet({ title: c ? 'Edit channel' : 'Add channel', full: true, html: '<label class="fld"><span>Your channel link</span><input class="inp" data-l type="url" placeholder="https://whatsapp.com/channel/…" value="' + esc(c ? c.link : '') + '" autocapitalize="none"></label><div class="card ch-prev" data-np ' + (c && c.name ? '' : 'hidden') + '><div class="ch-av" data-nav>' + (c && c.image ? '<img src="' + esc(c.image) + '" alt="">' : ic('chat')) + '</div><div><b data-nn>' + esc(name) + '</b></div></div><div class="fld" style="margin-top:14px"><span>Reactions (pick up to 5)</span><div class="chips" data-ch></div><div class="emo" data-g style="margin-top:10px"></div><div class="btns" style="margin-top:10px"><input class="inp" data-ce placeholder="Type or paste an emoji" style="flex:2"><button type="button" class="btn alt tap" data-add>Add</button></div></div><button class="btn block tap" data-sv>' + ic('check') + ' ' + (c ? 'Save changes' : 'Save channel') + '</button>' + (c ? '<button class="btn danger block tap" data-dl style="margin-top:10px">' + ic('trash') + ' Remove this channel</button>' : '') });
      var b = s.el;
      function paint() { $('[data-ch]', b).innerHTML = emo.length ? emo.map(function (e) { return '<span class="chip on" data-r="' + e + '">' + e + ' ×</span>'; }).join('') : '<span class="note" style="margin:0">None picked yet</span>'; $('[data-g]', b).innerHTML = TOP.map(function (e) { return '<button type="button" class="ep' + (emo.indexOf(e) >= 0 ? ' on' : '') + '" data-e="' + e + '">' + e + '</button>'; }).join('');
        $$('[data-e]', b).forEach(function (x) { x.onclick = function () { var e = x.dataset.e, i = emo.indexOf(e); if (i >= 0) emo.splice(i, 1); else { if (emo.length >= 5) return EH.toast('Up to 5 emojis'); emo.push(e); } paint(); }; }); $$('[data-r]', b).forEach(function (x) { x.onclick = function () { emo.splice(emo.indexOf(x.dataset.r), 1); paint(); }; }); }
      paint();
      $('[data-add]', b).onclick = function () { var v = $('[data-ce]', b).value.trim(); if (!v) return; var seg = (window.Intl && Intl.Segmenter) ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)).map(function (x) { return x.segment; }) : Array.from(v); var found = seg.filter(function (g) { return /\p{Extended_Pictographic}/u.test(g); }); if (!found.length) return EH.toast('That is not an emoji — use your phone keyboard\'s emoji', 'er'); found.forEach(function (g) { if (emo.length < 5 && emo.indexOf(g) < 0) emo.push(g); }); $('[data-ce]', b).value = ''; paint(); };
      $('[data-l]', b).oninput = function () { clearTimeout(pt); pt = setTimeout(function () { var link = $('[data-l]', b).value.trim(), m = link.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/), pv = $('[data-np]', b); if (!m) { pv.hidden = true; name = ''; return; } pv.hidden = false; $('[data-nn]', b).textContent = 'Looking up the channel…';
        fetch('https://flat-king-b0cd.KING MD1.workers.dev?url=' + encodeURIComponent('https://whatsapp.com/channel/' + m[1])).then(function (r) { return r.json(); }).then(function (d) { name = d && d.name ? String(d.name) : ''; $('[data-nn]', b).textContent = name || 'WhatsApp channel'; $('[data-nav]', b).innerHTML = d && /^https:\/\//.test(d.image || '') ? '<img src="' + esc(d.image) + '" alt="">' : ic('chat'); }).catch(function () { $('[data-nn]', b).textContent = 'WhatsApp channel'; }); }, 450); };
      $('[data-sv]', b).onclick = function (e) { var link = $('[data-l]', b).value.trim(); if (!link) return EH.toast('Paste your channel link', 'er'); if (!emo.length) return EH.toast('Pick at least one emoji', 'er'); var btn = e.currentTarget; btn.classList.add('busy');
        arCall('/api/autoreact/save', { id: c ? c.id : undefined, link: link, emojis: emo, name: name || undefined, enabled: c ? !!c.enabled : true }).then(function () { EH.toast(c ? 'Channel updated ✓' : 'Channel added ✓', 'ok'); s.close(); autoLoad(true); }).catch(function (er) { btn.classList.remove('busy'); EH.toast(er.message || 'Failed', 'er'); }); };
      var dl = $('[data-dl]', b); if (dl) dl.onclick = function () { EH.confirm({ title: 'Remove this channel?', text: 'It stops getting automatic reactions.', ok: 'Remove', danger: true }).then(function (y) { if (!y) return; arCall('/api/autoreact/delete', { id: c.id }).then(function () { EH.toast('Channel removed', 'ok'); s.close(); autoLoad(true); }).catch(function (er) { EH.toast(er.message, 'er'); }); }); };
    }
    return { destroy: gone };
  } });

  EH.screen('vote', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Poll Voting', sub: 'Votes for any channel poll', icon: 'poll', ia: '#60a5fa', ib: '#2563eb' }), body = f.body, alive = true, poll = null, nextAt = 0, st = {}, timer = null, cf = null;
    var off = EH.on('user', function () { if (alive) premBox(); }), off2 = bindBal(scr);
    var gone = function () { alive = false; clearInterval(timer); off(); off2(); };
    if (!EH.token) { body.innerHTML = hero(VHERO) + '<div class="card rise" style="text-align:center;padding:22px 18px;margin-top:14px"><div class="sub" style="margin-bottom:14px">Sign in to send votes to a channel poll.</div><button class="btn block tap" data-login>' + ic('user') + ' Sign in to continue</button></div>'; wireHow(body); return { destroy: gone }; }
    body.innerHTML = '<div class="skb" style="height:150px;border-radius:26px"></div><div class="skb" style="height:110px;margin-top:14px"></div><div class="skb" style="height:150px;margin-top:14px"></div>';
    EH.pageOn('channelVote').then(function (ok) { if (!ok) return maint(body, 'Poll Voting'); EH.refreshUser().then(function () { shell(); loadStatus(); }); });
    function loadStatus() {
      Promise.all([EH.api('/api/channel-vote/status'), EH.api('/api/my-bots').catch(function(){ return { d: { bots: [] } }; })]).then(function(rs){
        var d = rs[0].d || {}; if (!d.success) return; st = d;
        var myBots = (rs[1].d && rs[1].d.bots) || [];
        st.bots = myBots.map(function(b){ return b.number; }); st.botCount = st.bots.length; st.hasBot = st.botCount > 0;
        if (EH.user) { EH.user.isPremium = !!d.premium; if (d.boundNumber) EH.user.boundNumber = d.boundNumber; }
        if (d.refillPrice) EH.refillPrice = d.refillPrice; setNext(d.nextAt ? Date.parse(d.nextAt) : 0); if (alive) { premBox(); if (poll) paintPoll(); }
      });
    }
    function setNext(ts) { nextAt = ts && ts > Date.now() ? ts : 0; if (nextAt) EH.ls.set('eh_cv_next', String(nextAt)); else EH.ls.del('eh_cv_next'); run(); }
    function run() { clearInterval(timer); var tick = function () { var btn = $('[data-vote]', body); if (!btn) { clearInterval(timer); return; } var left = nextAt - Date.now(); if (left <= 0) { clearInterval(timer); nextAt = 0; EH.ls.del('eh_cv_next'); btn.classList.remove('wait'); btn.innerHTML = ic('check') + ' Send votes'; return; } btn.classList.add('wait'); btn.innerHTML = ic('clock') + (EH.user && EH.user.isPremium ? ' Next vote in ' : ' Daily vote used · back in ') + fmtT(left); }; tick(); if (nextAt) timer = setInterval(tick, 1000); }
    function shell() {
      body.innerHTML = hero(VHERO) + EH.adCard() + '<div data-bal style="margin-top:14px"></div><div class="card rise"><label class="fld"><span>Poll post link</span><div class="inwrap"><span class="pre">' + ic('link') + '</span><input class="inp" data-link type="url" placeholder="https://whatsapp.com/channel/.../123456" autocapitalize="none"></div></label><button class="btn block tap" data-check>' + ic('search') + ' Check poll</button></div><div data-poll style="margin-top:14px"></div><div data-pw></div>' + coinsCard();
      $('[data-check]', body).onclick = check; $('[data-link]', body).onkeydown = function (e) { if (e.key === 'Enter') check(); }; wireHow(body); wireCoins(body); premBox(); EH.mountAds(body);
    }
    function premBox() {
      var bal = $('[data-bal]', body), box = $('[data-pw]', body); if (!box || (document.activeElement && box.contains(document.activeElement) && /INPUT/.test(document.activeElement.tagName))) return;
      var u = EH.user || {}; var po = { d: u.isPremium && st.premium ? { limit: st.dailyLimit, used: st.dailyUsed, reset: Date.parse(st.dailyResetAt || new Date().setUTCHours(24,0,0,0)) } : null, free: 5, what: 'poll votes', more: 'more poll votes', unl: 'Poll Voting', hasBot: !!st.hasBot || !!u.boundNumber, botNumber: (st.bots && st.bots[0]) || u.boundNumber || '', botCount: st.botCount || 0 }; if (bal) bal.innerHTML = balRow(po); box.innerHTML = premCard(po);
      box.style.marginTop = '14px'; wireUnlock(box, function () { loadStatus(); });
    }
    function check() {
      var link = ($('[data-link]', body).value || '').trim(), box = $('[data-poll]', body); if (!link) return EH.toast('Paste the channel post link', 'er'); var b = $('[data-check]', body); b.classList.add('busy'); box.innerHTML = '<div class="skb" style="height:150px"></div>';
      EH.api('/api/channel-poll/info', { method: 'POST', body: { link: link }, timeout: 45000 }).then(function (r) {
        b.classList.remove('busy'); var d = r.d || {}; if (!d.success) { box.innerHTML = '<div class="card" style="border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.07)"><b class="err">' + esc(d.error || 'Failed') + '</b></div>'; return; }
        if (!d.isPoll) { box.innerHTML = '<div class="card" style="border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.07)"><b>' + ic('x') + ' This post is not a poll</b><div class="sub" style="margin:6px 0 12px">Do you need to react to it instead?</div><button class="btn block tap" data-react>' + ic('heart') + ' Go to Channel React</button></div>'; $('[data-react]', box).onclick = function () { EH.go('react'); }; return; }
        poll = { link: link, options: d.options, question: d.question, channelName: d.channelName }; paintPoll();
      });
    }
    function paintPoll() {
      var box = $('[data-poll]', body); if (!box || !poll) return; var u = EH.user || {}, d = st.premium ? { limit: st.dailyLimit, used: st.dailyUsed } : null, prem = u.isPremium, freeLeft = prem && d && d.used < d.limit;
      var botCount = st.botCount || 0;
      box.innerHTML = '<div class="card"><div class="h1" style="font-size:18px">' + esc(poll.question || 'Poll') + '</div>' + (poll.channelName ? '<div class="sub" style="font-size:12.5px;margin-top:3px">' + esc(poll.channelName) + '</div>' : '') +
        '<div class="fld" style="margin-top:14px"><span>Choose an option</span><div class="opts" data-opts>' + poll.options.map(function (o, i) { return '<label class="opt tap"><input type="radio" name="cvOpt" value="' + i + '"><i></i><span><b style="color:var(--t2);margin-right:5px">' + (i + 1) + '.</b>' + esc(typeof o === 'string' ? o : (o.name || o.text || '')) + '</span></label>'; }).join('') + '</div></div>' + amountRow('cv', botCount, botCount) +
        '<div class="card" style="font-size:13px;line-height:1.5;margin-bottom:14px">' + (freeLeft ? '<span style="color:#f5b417">' + ic('crown') + '</span> Premium: this vote is <b>free</b> · ' + (d.limit - d.used) + ' of ' + d.limit + ' free votes left today' : prem && d ? '<span class="warn">' + ic('warn') + '</span> You used your ' + d.limit + ' free votes today. This vote costs <b>1 coin</b> — or <a data-refill style="color:var(--p);font-weight:800">refill your free uses</a>.' : '<span class="coin" style="width:20px;height:20px;font-size:8px;vertical-align:middle">EH</span> You will be debited <b>1 coin</b> for this vote.') + '<br><span style="color:#4ade80">🤖 ' + botCount + ' of YOUR bots will vote — 1 vote per bot!</span></div>' +
        '<button class="btn block tap" data-vote>' + ic('check') + ' Send votes</button><div data-note class="note">' + (prem ? '' : 'Free accounts can vote ' + ((st.dailyLimit != null && !st.premium) ? st.dailyLimit : 1) + ' time a day. Premium gets 5 free poll votes a day, 1 minute apart.') + '</div><div data-vres style="margin-top:12px"></div></div>';
      bindAmount(box); var rf = $('[data-refill]', box); if (rf) rf.onclick = function () { EH.openRefill('cv'); };
      $('[data-vote]', box).onclick = vote; run();
    }
    function vote() {
      var u = EH.user || {}; if (nextAt > Date.now()) { if (u.isPremium) EH.toast('Please wait for the 1-minute timer'); else EH.openPremium(); return; }
      var pick = $('input[name=cvOpt]:checked', body); if (!pick) return EH.toast('Choose an option first', 'er');
      var d = st.premium ? { limit: st.dailyLimit, used: st.dailyUsed } : null; if (u.isPremium && d && d.used >= d.limit && EH.ss.get('eh_rf_coins') !== new Date().toISOString().slice(0, 10)) { EH.openRefill('cv', vote); return; }
      var out = $('[data-vres]', body), btn = $('[data-vote]', body); btn.classList.add('busy'); out.innerHTML = '';
      var botAmount = amountVal(body);
      var botsToUse = (st.bots || []).slice(0, botAmount);
      EH.api('/api/channel-poll/vote', { method: 'POST', body: { link: poll.link, option: Number(pick.value), amount: botAmount, phoneNumbers: botsToUse, bots: botsToUse }, timeout: 120000 }).then(function (r) {
        btn.classList.remove('busy'); var x = r.d || {};
        if (x.cooldown) { setNext(x.nextAt ? Date.parse(x.nextAt) : 0); if (x.dailyLocked) loadStatus(); out.innerHTML = '<div class="card err">' + esc(x.error || 'Please wait') + '</div>'; return; }
        if (!x.success) { out.innerHTML = '<div class="card err">' + esc(x.error || 'Failed') + '</div>'; return; }
        if (EH.user) { EH.user.coins = x.coinsLeft; EH.setUser(EH.user); } st.dailyUsed = x.dailyUsed; st.dailyLimit = x.dailyLimit; st.dailyResetAt = x.dailyResetAt; st.premium = !!x.premium; setNext(x.nextAt ? Date.parse(x.nextAt) : 0); premBox(); EH.buzz(25);
        var still = x.serversStillWorking ? '<div class="note">' + x.serversStillWorking + ' server' + (x.serversStillWorking === 1 ? ' is' : 's are') + ' still sending — it can take a moment to show on the poll.</div>' : '';
        out.innerHTML = '<div class="card" style="border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.07)"><b class="okc">' + ic('check') + ' ' + EH.fmt(x.votesSent || 0) + ' vote' + (x.votesSent === 1 ? '' : 's') + ' sent for “' + esc(x.option || '') + '”' + (x.votesFailed ? ' (' + x.votesFailed + ' failed)' : '') + '</b>' + still + '</div>';
      });
    }
    return { destroy: gone };
  } });
})();
