/* Notifications, FAQ, Terms, Privacy, Change log, Tutorial + gifts and rewards that wait for you */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc, C = window.EH_CONTENT || { faq: [], privacy: { secs: [] }, terms: { secs: [] } };

  /* ───── gifts + rewards (shown when the app opens, like the site) ───── */
  function giftSheet(g) {
    var s = EH.sheet({ title: 'You got a gift!', html: '<div style="text-align:center;padding:4px 0 14px"><div style="font-size:60px">🎁</div><div class="sub" style="font-size:16px;color:var(--tx);margin-top:8px"><b>@' + esc(g.fromUsername) + '</b> sent you <b style="color:var(--p)">' + g.amount + ' coin' + (g.amount > 1 ? 's' : '') + '</b></div>' + (g.message ? '<div class="note" style="font-style:italic">“' + esc(g.message) + '”</div>' : '') + '</div><div class="btns"><button class="btn alt tap" data-d>' + ic('x') + ' Decline</button><button class="btn tap" data-a>' + ic('check') + ' Accept</button></div>' });
    var act = function (a) { return function () { EH.api('/api/gifts/' + g.id + '/' + a, { method: 'POST', body: {} }).then(function (r) { s.close(); if (r.d.success) { EH.toast(a === 'accept' ? '🎁 Gift accepted!' : 'Gift declined', a === 'accept' ? 'ok' : ''); EH.refreshUser(); } else EH.toast(r.d.error || 'Failed', 'er'); }); }; };
    $('[data-a]', s.el).onclick = act('accept'); $('[data-d]', s.el).onclick = act('decline');
  }
  function rewardSheet(kind) {
    var u = EH.user, r = u && u.rewards && u.rewards[kind]; if (!r || !r.available) return; var prem = kind === 'premium';
    var s = EH.sheet({ title: prem ? 'Premium reward' : 'Compensation reward', html: '<div style="text-align:center;padding:4px 0 14px"><div class="pm-crown">' + ic(prem ? 'crown' : 'gift') + '</div><div class="h1" style="font-size:22px;margin-top:12px">' + (prem ? 'Congratulations! You are Premium 👑' : 'We owe you ' + r.amount + ' coins') + '</div><div class="sub" style="margin:8px 0">' + (prem ? 'You have a bonus waiting: <b style="color:var(--tx)">' + r.amount + ' free coins</b>, just for being with us.' : 'Editing your bot\'s name, picture and channel used to cost coins. It is part of <b style="color:var(--tx)">Premium</b> now, so those charges should never have been taken. Here are your coins back.') + '</div><div style="font-size:30px;font-weight:800"><span class="coin" style="width:30px;height:30px;font-size:11px">EH</span> +' + r.amount + '</div></div><button class="btn gold block tap" data-claim>' + ic('gift') + ' Claim ' + r.amount + ' coins</button><button class="btn ghost block tap" data-later style="margin-top:6px">Maybe later</button>', onClose: function () {} });
    $('[data-claim]', s.el).onclick = function (e) { var b = e.currentTarget; b.classList.add('busy'); EH.api('/api/rewards/claim', { method: 'POST', body: { kind: kind } }).then(function (x) { b.classList.remove('busy'); var d = x.d; if (!d.success) return EH.toast(d.error || 'Could not claim', 'er'); EH.buzz([30, 40, 30]); u.coins = d.coins; u.rewards[kind].available = false; EH.setUser(u); s.close(); EH.toast(d.added + ' coins added · you now have ' + EH.fmt(d.coins), 'ok'); }); };
    $('[data-later]', s.el).onclick = function () { EH.api('/api/rewards/dismiss', { method: 'POST', body: { kind: kind } }); if (u.rewards) u.rewards[kind].dismissed = true; s.close(); };
  }
  var shown = {};
  EH.checkPending = function () {
    var u = EH.user; if (!u || !EH.token) return;
    if (u.pendingGifts && u.pendingGifts.length && !shown.gift) { shown.gift = 1; giftSheet(u.pendingGifts[0]); return; }
    var r = u.rewards; if (!r) return;
    if (r.compensation && r.compensation.available && !r.compensation.dismissed && !shown.comp) { shown.comp = 1; rewardSheet('compensation'); }
    else if (r.premium && r.premium.available && !r.premium.dismissed && !shown.prem) { shown.prem = 1; rewardSheet('premium'); }
  };
  EH.on('ready', function () { setTimeout(EH.checkPending, 700); }); EH.on('user', function () { if (document.body.classList.contains('ready')) setTimeout(EH.checkPending, 400); });

  /* ───── phone notifications (web push, same as the site) ───── */
  var pushOk = function () { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; };
  var pushReg = function () { return navigator.serviceWorker.getRegistrations().then(function (regs) { return regs.filter(function (r) { var w = r.active || r.waiting || r.installing; return w && /\/push-sw\.js$/.test(w.scriptURL); })[0] || null; }); };
  function permState() {
    var p = 'Notification' in window ? Notification.permission : 'denied';
    if (p !== 'denied') return Promise.resolve(p);
    return (navigator.permissions && navigator.permissions.query ? navigator.permissions.query({ name: 'notifications' }) : Promise.reject()).then(function (q) { return q.state === 'prompt' ? 'default' : q.state === 'granted' ? 'granted' : p; }, function () { return p; });
  }
  function pushState() {
    if (!pushOk()) return Promise.resolve('unsupported');
    return permState().then(function (perm) {
      if (perm === 'denied') return 'denied';
      return pushReg().then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; }).then(function (sub) { return sub && perm === 'granted' ? 'on' : 'off'; }, function () { return 'off'; });
    });
  }
  var b64u8 = function (b64) { var p = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(Array.prototype.map.call(raw, function (c) { return c.charCodeAt(0); })); };
  function pushSubscribe() {
    return pushReg().then(function (reg) { return reg || navigator.serviceWorker.register('/push-sw.js'); }).then(function (reg) {
      return navigator.serviceWorker.ready.then(function () { return reg.pushManager.getSubscription(); }).then(function (sub) {
        if (sub) return sub;
        return EH.api('/api/push/key', { auth: false }).then(function (k) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(k.d.publicKey) }); });
      });
    }).then(function (sub) { return EH.api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } }).then(function (r) { if (!r.d.success) throw new Error(r.d.error || 'Failed'); }); });
  }
  EH.enablePush = function (after) {
    if (EH.needLogin('Sign in to get phone notifications.')) return;
    EH.ls.set('eh_push_want', String(Date.now()));
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { pushTried = true; EH.toast('Not turned on. Tap Allow whenever you are ready.'); return; }
      EH.ls.del('eh_push_want'); return pushSubscribe().then(function () { EH.toast('Phone notifications are on 🔔', 'ok'); });
    }).catch(function () { EH.toast('Could not turn on notifications on this device', 'er'); }).then(function () { if (after) after(); });
  };
  EH.disablePush = function (after) {
    pushReg().then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; }).then(function (sub) {
      if (!sub) return; EH.api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }); return sub.unsubscribe().then(function () { EH.toast('Phone notifications are off', 'ok'); });
    }).catch(function () {}).then(function () { if (after) after(); });
  };
  EH.pushForget = function () {   // on log out: this device stops getting this account's notifications
    var tok = EH.token; if (!tok || !pushOk()) return;
    pushReg().then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; }).then(function (sub) { if (sub) fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': tok }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(function () {}); }).catch(function () {});
  };
  var pushSynced = false;   // after a sign-in on this phone, its pop-ups belong to the account now signed in
  EH.on('user', function (u) {
    if (!u || pushSynced || !pushOk() || Notification.permission !== 'granted') return; pushSynced = true;
    pushReg().then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; }).then(function (sub) { if (sub) EH.api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } }); }).catch(function () {});
  });
  var pushTried = false;   // the phone's question was answered "Don't allow" this time: the card stays as it is, with a small hint
  function pushCard(box) {
    pushState().then(function (st) {
      if (st === 'denied') st = 'off';   // never a dead end: Allow stays, and tapping it asks the phone again
      var card = function (icn, a, b, title, text, btn) { return '<div class="card push-card"><div class="bico" style="--a:' + a + ';--b:' + b + '">' + ic(icn) + '</div><div class="rt"><b>' + title + '</b><small>' + text + '</small></div>' + (btn || '') + '</div>'; };
      box.innerHTML = st === 'on' ? card('bell', '#34d399', '#059669', 'Notifications are on', 'Payments, gifts, followers and news pop up on this phone.', '<button class="btn alt sm tap" data-pf>Turn off</button>')
        : st === 'off' ? card('bell', '#ff2e93', '#7c2bff', 'Allow notifications', 'Get payments, gifts, followers and news on your phone, even when the app is closed.' + (pushTried ? ' If the phone does not ask again, allow Notifications for this app in your phone Settings.' : ''), '<button class="btn sm tap" data-pn>Allow</button>')
        : st === 'denied' ? card('bell', '#94a3b8', '#475569', 'Notifications are blocked', 'Open your phone Settings, find this app (or your browser) and allow Notifications. Then come back here.')
        : st === 'unsupported' ? card('bell', '#94a3b8', '#475569', 'Notifications are not available', 'This phone or browser cannot show app notifications.') : '';
      var on = $('[data-pn]', box), off = $('[data-pf]', box);
      if (on) on.onclick = function () { EH.enablePush(function () { pushCard(box); }); }; if (off) off.onclick = function () { EH.disablePush(function () { pushCard(box); }); };
    });
  }

  /* ───── notifications ───── */
  var ICONS = { receipt: '🧾', credited: '✨', welcome: '👋', referral: '🎉', bot_space: '🤖', gift: '🎁', gift_received: '🎁', gift_accepted: '✅', gift_declined: '↩️', redeem: '🎁', verified: '✅', ban: '🚫', chatban: '🔇', promoted: '🛡️', broadcast: '📢', pinned: '📌', reward: '🎁' };
  var delIn = function (at) { var ms = new Date(at).getTime() - Date.now(); if (!(ms > 0)) return 'Deletes soon'; var h = Math.floor(ms / 3600000), d = Math.floor(h / 24), m = Math.max(1, Math.floor(ms / 60000)); return 'Deletes in ' + (d ? d + 'd ' + (h % 24) + 'h' : h ? h + 'h' : m + 'm'); };
  EH.screen('notifs', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Notifications', icon: 'bell', ia: '#60a5fa', ib: '#2563eb', acts: '<button class="btn alt sm tap" data-all hidden>' + ic('check') + ' Mark read</button>' }), body = f.body, alive = true;
    if (!EH.token) { body.innerHTML = '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('bell') + '</div><b>Sign in to see notifications</b><p>Receipts, gifts, rewards and news show up here.</p><button class="btn tap" data-login style="margin-top:14px">' + ic('user') + ' Sign in</button></div>'; return {}; }
    body.innerHTML = '<div data-push></div><div data-nlist>' + [1, 2, 3, 4].map(function () { return '<div class="skb" style="height:68px;margin-bottom:10px"></div>'; }).join('') + '</div>';
    var pc = $('[data-push]', body); pushCard(pc); var back = function () { if (!document.hidden) pushCard(pc); }; document.addEventListener('visibilitychange', back);
    EH.api('/api/notifications/read', { method: 'POST', body: {} }).then(function () { if (EH.user) { EH.user.unreadNotifs = 0; EH.setUser(EH.user); } });
    function load() {
      EH.api('/api/notifications').then(function (r) { var d = r.d; if (!alive) return; if (!d || !d.success) { body.innerHTML = '<div class="empty"><b>Failed to load</b></div>'; return; }
        var list = d.notifications || []; $('[data-all]', scr).hidden = true;
        $('[data-nlist]', body).innerHTML = list.length ? '<div class="grp">' + list.map(function (n) {
          var reward = n.type === 'reward', receipt = n.type === 'receipt' || n.type === 'credited', gift = /^gift_/.test(n.type) && n.meta && n.meta.giftId, click = reward || receipt || gift;
          return '<div class="row' + (click ? ' tap' : '') + (n.read ? '' : ' unr') + '" data-id="' + esc(n._id) + '"><div class="ri" style="font-size:21px;--a:#2a2a33;--b:#1b1b22">' + (ICONS[n.type] || '🔔') + '</div><div class="rt"><b>' + esc(n.title) + '</b><small style="color:var(--t1)">' + esc(n.body) + '</small><small>' + (reward ? '<b style="color:var(--wa)">Tap to claim</b>' : receipt ? EH.ago(n.createdAt) + ' · <b class="okc">View receipt</b>' : EH.ago(n.createdAt)) + (n.expiresAt ? ' · ' + delIn(n.expiresAt) : '') + '</small></div>' + (reward || receipt ? '' : '<button class="ibtn tap sm" data-del="' + esc(n._id) + '" aria-label="Delete">' + ic('x') + '</button>') + '</div>';
        }).join('') + '</div>' : '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('bell') + '</div><b>No notifications yet</b><p>Receipts, gifts, rewards and news show up here.</p></div>';
        $$('[data-del]', body).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); EH.api('/api/notifications/' + b.dataset.del, { method: 'DELETE' }).then(function () { var row = b.closest('.row'); row.style.transition = 'all .25s'; row.style.opacity = 0; row.style.transform = 'translateX(40px)'; setTimeout(function () { row.remove(); }, 250); }); }; });
        list.forEach(function (n) { var row = $('[data-id="' + n._id + '"]', body); if (!row) return;
          if (n.type === 'reward') row.onclick = function () { EH.refreshUser().then(function () { var k = n.meta && n.meta.reward; if (EH.user && EH.user.rewards && EH.user.rewards[k] && EH.user.rewards[k].available) rewardSheet(k); else EH.toast('Already claimed'); }); };
          else if (n.type === 'receipt' || n.type === 'credited') row.onclick = function () { EH.openReceipt(n.meta && n.meta.reference); };
          else if (/^gift_/.test(n.type) && n.meta && n.meta.giftId) row.onclick = function () { EH.api('/api/gifts/' + n.meta.giftId).then(function (r) { var x = r.d; if (!x.success) return EH.toast('Could not load gift', 'er'); var g = x.gift; if (g.status === 'pending' && !x.isSender) giftSheet(g); else EH.alert('🎁 ' + g.amount + ' coin' + (g.amount > 1 ? 's' : ''), x.isSender ? 'You sent this gift to @' + (g.toUsername || '') + '. Status: ' + g.status + '.' : 'From @' + g.fromUsername + '. Status: ' + g.status + '.'); }); }; });
      });
    }
    load(); return { destroy: function () { alive = false; document.removeEventListener('visibilitychange', back); } };
  } });

  /* ───── FAQ ───── */
  EH.screen('faq', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'FAQ', sub: 'Everything about EMMYHENZ V4' }), b = f.body;
    b.innerHTML = '<div class="grp rise">' + C.faq.map(function (q, i) { return '<div class="faq' + (i === 0 ? ' open' : '') + '"><button class="faq-q tap" type="button"><span>' + q[0] + '</span>' + ic('chevD') + '</button><div class="faq-a">' + q[1] + '</div></div>'; }).join('') + '</div>' +
      '<div class="card" style="text-align:center;margin-top:16px"><div class="sub" style="margin-bottom:12px">Still have questions?</div><a class="btn block tap" href="https://t.me/real_emmyhenz" target="_blank" rel="noopener">' + ic('send') + ' Contact us on Telegram</a></div>' + EH.adCard();
    $$('.faq-q', b).forEach(function (q) { q.onclick = function () { q.parentNode.classList.toggle('open'); }; }); EH.mountAds(scr); return {};
  } });

  /* ───── Terms + Privacy ───── */
  function legal(name, title, sub, data, extra) {
    EH.screen(name, { mount: function (scr) {
      var f = EH.frame(scr, { bar: 'push', title: title, sub: sub }), b = f.body;
      b.innerHTML = '<div class="sub rise" style="margin:4px 2px 14px">' + data.lead + '</div>' + (extra ? extra(data) : '') + data.secs.map(function (s, i) { return '<div class="card legal rise" style="margin-bottom:12px;--i:' + Math.min(i, 6) + '"><h4>' + s[0] + '</h4><p>' + s[1] + '</p></div>'; }).join('');
      return {};
    } });
  }
  legal('terms', 'Terms & Conditions', 'Please read them carefully', C.terms, function (d) {
    return (d.disclaimer ? '<div class="card" style="border-color:rgba(245,180,23,.45);background:rgba(245,180,23,.08);margin-bottom:12px"><div style="color:#f5b417;font-weight:800;margin-bottom:6px">' + ic('info') + ' Disclaimer</div><div class="sub" style="font-size:13.5px;color:var(--t1)">' + d.disclaimer + '</div></div>' : '') +
      (d.quick && d.quick.length ? '<div class="card" style="border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.07);margin-bottom:12px"><div style="color:#4ade80;font-weight:800;margin-bottom:8px">QUICK NOTE</div>' + d.quick.map(function (q) { return '<div class="sub" style="font-size:13.5px;color:var(--t1);margin-bottom:8px">' + q + '</div>'; }).join('') + '</div>' : '');
  });
  legal('privacy', 'Privacy Policy', 'How we handle your data', C.privacy);

  /* ───── Change log ───── */
  EH.screen('changelog', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Change log', sub: 'Every update to EMMYHENZ V4' }), b = f.body, kind = 'all', data = null;
    b.innerHTML = '<div class="seg" data-k><button data-k="all" class="on">All</button><button data-k="bot">Bot</button><button data-k="site">Site</button></div><div data-list style="margin-top:14px"><div class="spinner"></div></div>';
    EH.api('/changelog.json', { auth: false }).then(function (r) { var l = Array.isArray(r.d) ? r.d : []; return EH.api('/api/announcements', { auth: false }).then(function (a) { var adm = ((a.d && a.d.changelog) || []).map(function (c) { return { at: c.date, kind: 'news', title: c.title, version: c.version, body: c.body }; }); return l.concat(adm); }).catch(function () { return l; }); }).then(function (l) { data = l.sort(function (x, y) { return new Date(y.at) - new Date(x.at); }); EH.ls.set('eh_cl_seen', String(data[0] ? new Date(data[0].at).getTime() : Date.now())); paint(); });
    $$('[data-k] button', b).forEach(function (x) { x.onclick = function () { kind = x.dataset.k; $$('[data-k] button', b).forEach(function (y) { y.classList.toggle('on', y === x); }); paint(); }; });
    function paint() {
      var box = $('[data-list]', b), list = (data || []).filter(function (e) { return kind === 'all' || e.kind === kind || (kind === 'site' && e.kind === 'news'); });
      if (!list.length) { box.innerHTML = '<div class="empty"><b>Nothing here yet.</b></div>'; return; }
      var label = { bot: 'Bot', site: 'Site', news: 'News' }, note = function (n) { return typeof n === 'string' ? '<li>' + esc(n) + '</li>' : '<li>' + (n.cmd ? '<code>' + esc(n.cmd) + '</code> ' : '') + esc(n.text || '') + '</li>'; };
      box.innerHTML = list.map(function (it) { return '<div class="card" style="margin-bottom:12px"><div class="chips" style="margin-bottom:8px"><span class="chip on">' + (label[it.kind] || 'Update') + '</span>' + (it.version ? '<span class="chip">v' + esc(it.version) + '</span>' : '') + '<span class="chip" style="margin-left:auto">' + new Date(it.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + '</span></div><b style="font-size:16px">' + esc(it.title) + '</b>' +
        (it.sections || []).map(function (sec) { return '<div style="margin-top:10px"><div class="sub" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em">' + esc(sec.name) + '</div>' + (sec.cmds ? '<div class="chips" style="margin-top:6px">' + sec.cmds.map(function (c) { return '<code>' + esc(c) + '</code>'; }).join('') + '</div>' : '') + (sec.notes ? '<ul class="cl">' + sec.notes.map(note).join('') + '</ul>' : '') + '</div>'; }).join('') + (it.body ? '<div class="sub" style="margin-top:8px;color:var(--t1)">' + esc(it.body) + '</div>' : '') + '</div>'; }).join('');
    }
    return {};
  } });

  /* ───── Tutorial: how-to videos ───── */
  EH.screen('tutorial', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Tutorial', sub: 'Learn it in a minute' }), b = f.body;
    var steps = [['Type your WhatsApp number', 'On Deploy Bot, enter your number with the country code — no + and no spaces, e.g. 2349012345678.'], ['Tap “Generate pairing code”', 'You get a short code. Keep the app open — you will type it into WhatsApp next.'], ['Open Linked devices', 'In WhatsApp go to Settings → Linked devices → Link a device, then choose “Link with phone number instead”.'], ['Enter the code', 'Type the code exactly as shown. WhatsApp says the device is linked and your bot comes online.'], ['Say hello to your bot', 'Message yourself or any chat with .menu to see everything it can do.']];
    var vids = [['link-number', 'Link a number to your account', 'See how to link a Premium number'], ['premium-pay', 'Get Premium', 'How paying for Premium works'], ['channel-react', 'Channel React', 'Send reactions to a channel post'], ['poll-vote', 'Poll Voting', 'Send votes to a channel poll']];
    b.innerHTML = '<div class="sec" style="margin-top:6px"><h3>Pair your bot</h3></div><div class="card">' + steps.map(function (s, i) { return '<div class="dp-steps"><div><i>' + (i + 1) + '</i><span><b>' + esc(s[0]) + '</b><br><span style="color:var(--t2)">' + esc(s[1]) + '</span></span></div></div>'; }).join('') + '</div>' +
      '<a class="btn alt block tap" style="margin-top:12px" href="https://youtube.com/shorts/o5dfnjKEiq8?si=AMXR_eaov5B4hf2s" target="_blank" rel="noopener">' + ic('play') + ' Watch the pairing video</a>' +
      '<div class="sec"><h3>How-to videos</h3></div><div class="grp">' + vids.map(function (v) { return '<div class="row tap" data-v="' + v[0] + '"><div class="ri" style="--a:#fb923c;--b:#ea580c">' + ic('play') + '</div><div class="rt"><b>' + esc(v[1]) + '</b><small>' + esc(v[2]) + '</small></div>' + ic('chevR', 'chev') + '</div>'; }).join('') + '</div>';
    $$('[data-v]', b).forEach(function (r) { r.onclick = function () { var s = EH.sheet({ title: '', full: true, html: '<video src="/videos/' + r.dataset.v + '.mp4?v=1" controls autoplay playsinline style="width:100%;border-radius:18px;background:#000;max-height:76vh"></video>', onClose: function () { var v = $('video', s.el); if (v) v.pause(); } }); }; });
    return {};
  } });
})();
