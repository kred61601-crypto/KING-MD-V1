/* Bot Settings (Manage Bot): sign in to a bot with its number + password, then switches, prefixes, group defaults, Premium settings and usage */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var mb = null;
  EH.mb = function () { return mb; };

  // ===== NO URL - SAME SERVER ✅ =====
  // App + Bot are on same main.js, so fetch('/api/...') auto uses your site.
  function botApi(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device': dev() },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().then(function (d) { return { d: d, status: r.status }; });
    });
  }

  var dev = function () { var d = EH.ls.get('eh_mbdev'); if (!d) { d = 'd' + Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(12)), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); EH.ls.set('eh_mbdev', d); } return d; };
  var att = function () { return EH.ls.json('eh_mbatt', {}) || {}; };
  var setAtt = function (v) { if (v) EH.ls.set('eh_mbatt', JSON.stringify(v)); else EH.ls.del('eh_mbatt'); };
  var saved = function () { return EH.ls.json('eh_bots', []); };
  var saveSaved = function (a) { EH.ls.set('eh_bots', JSON.stringify(a)); };
  function api(path, o) { o = o || {}; o.headers = Object.assign({ 'x-device': dev() }, o.headers || {}); o.auth = false; return EH.api(path, o); }

  function set(feature, value, silent) {
    if (!mb) return Promise.reject();
    return botApi('/api/managebot/update', { server: mb.server, token: mb.token, feature: feature, value: value, phoneNumber: mb.number }).then(function (r) {
      if (!r.d.success) { return EH.api('/api/managebot/update', { method: 'POST', auth: false, body: { server: mb.server, token: mb.token, feature: feature, value: value, phoneNumber: mb.number } }).then(function (r2) { if (!r2.d.success) { EH.toast(r2.d.error || 'Update failed', 'er'); throw new Error('fail'); } mb.settings = r2.d.settings; if (!silent) EH.toast('Updated ✓', 'ok'); return r2.d; }); }
      mb.settings = r.d.settings || mb.settings; if (!silent) EH.toast('Updated ✓', 'ok'); return r.d;
    }).catch(function () { return EH.api('/api/managebot/update', { method: 'POST', auth: false, body: { server: mb.server, token: mb.token, feature: feature, value: value, phoneNumber: mb.number } }); });
  }
  var help = function () {
    var s = EH.sheet({ title: 'Forgot your bot password?', html: '<div class="sub" style="margin-bottom:14px">You don\'t need to report this — your bot can send it to you directly.</div><div class="card"><div class="sub" style="font-size:13px;margin-bottom:10px">On WhatsApp, open a chat with <b style="color:var(--tx)">your own number</b> (or any chat your bot can see) and send:</div><div class="btns"><div class="inp" style="display:flex;align-items:center;color:var(--p);font-weight:800;font-family:ui-monospace,monospace">.password</div><button class="btn alt sm tap" data-cp style="flex:none;height:56px">' + ic('copy') + '</button></div><div class="note">Your bot will DM you the password with a one-tap copy button, plus a link to the Manage Bot panel.</div></div><button class="btn block tap" style="margin-top:14px" data-ok>Got it</button>' });
    $('[data-cp]', s.el).onclick = function () { EH.copy('.password', 'Copied'); }; $('[data-ok]', s.el).onclick = s.close;
  };

  EH.screen('settings', { tab: true, mount: function (scr) {
    var f = EH.frame(scr, { bar: 'title', title: 'Bot Settings', sub: 'Control your bot', tab: true }), body = f.body, lockT, alive = true;
    function loginView() {
      var list = saved();
      body.innerHTML =
        '<div class="bl-top rise"><div class="bl-logo"><img src="/logo.png" alt=""></div><div><h2>Log in to your bot</h2><p>Enter your bot number and password.</p></div></div>' +
        (list.length ? '<div class="grp rise" data-saved style="margin-bottom:14px">' + list.map(function (b) { return '<div class="row tap" data-q="' + esc(b.number) + '"><div class="ri" style="--a:#34d399;--b:#059669">' + ic('robot') + '</div><div class="rt"><b>+' + esc(b.number) + '</b><small>Tap to log in · last login ' + new Date(b.lastLogin).toLocaleDateString() + '</small></div><button class="ibtn tap" data-rm="' + esc(b.number) + '" aria-label="Remove" style="color:#f87171">' + ic('trash') + '</button></div>'; }).join('') + '</div>' : '') +
        '<form class="card rise" data-form style="--i:1" autocomplete="off"><label class="fld"><span>Bot number</span><div class="inwrap"><span class="pre">' + ic('phone') + '</span><input class="inp" data-num type="tel" inputmode="numeric" placeholder="e.g. 2348012345678"></div></label>' +
        '<label class="fld"><span>Password</span><div class="inwrap"><span class="pre">' + ic('key') + '</span><input class="inp" data-pw type="text" placeholder="8 characters" maxlength="32" style="letter-spacing:2px" autocapitalize="none" autocomplete="off"></div></label>' +
        '<div class="card" data-att hidden style="border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.08);margin-bottom:14px;font-size:13.5px;line-height:1.5"></div>' +
        '<button class="btn block tap" type="submit" data-signin>' + ic('lock') + ' Log in</button>' +
        '<div style="text-align:center;margin-top:14px"><a data-forgot style="color:var(--p);font-weight:700;font-size:14px">' + ic('key') + ' Forgot your bot password?</a></div></form>' + EH.adCard();
      $('[data-forgot]', body).onclick = help;
      $('[data-form]', body).onsubmit = function (e) { e.preventDefault(); login($('[data-num]', body).value.replace(/\D/g, ''), $('[data-pw]', body).value.trim()); };
      $$('[data-q]', body).forEach(function (r) { r.onclick = function (e) { if (e.target.closest('[data-rm]')) return; var b = saved().filter(function (x) { return x.number === r.dataset.q; })[0]; if (b) login(b.number, b.password); }; });
      $$('[data-rm]', body).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); EH.confirm({ title: 'Remove +' + b.dataset.rm + '?', text: 'It is only removed from this list on this phone.', ok: 'Remove', danger: true }).then(function (y) { if (y) { saveSaved(saved().filter(function (x) { return x.number !== b.dataset.rm; })); loginView(); } }); }; });
      showAtt(false); EH.mountAds(scr);
      api('/api/managebot/attempts').then(function (r) { var d = r.d; if (d && d.success) { setAtt(d.lockedUntil ? { left: 0, until: d.lockedUntil } : (d.attemptsLeft < d.max ? { left: d.attemptsLeft } : null)); showAtt(false); } }).catch(function(){});
    }
    function showAtt(wrong) {
      var box = $('[data-att]', body), btn = $('[data-signin]', body); clearInterval(lockT); if (!box) return; var a = att(), now = Date.now();
      if (a.until && a.until > now) {
        var paint = function () { var left = (a.until || 0) - Date.now(); if (left <= 0) { clearInterval(lockT); setAtt(null); showAtt(); return; } var m = Math.floor(left / 60000), s = ('0' + Math.floor(left % 60000 / 1000)).slice(-2);
          box.innerHTML = '<b class="err">' + ic('lock') + ' Too many wrong passwords.</b><br>Bot settings are locked on this phone for <b>' + m + ':' + s + '</b> more. You cannot sign in to any bot from this phone until then.'; };
        box.hidden = false; paint(); lockT = setInterval(paint, 1000); if (btn) btn.disabled = true; return;
      }
      if (btn) btn.disabled = false; if (a.until) setAtt(null);
      if (a.left != null && a.left < 5) { box.hidden = false; box.innerHTML = (wrong ? '<b class="err">Wrong password.</b><br>' : '') + 'You have <b>' + a.left + '</b> ' + (a.left === 1 ? 'attempt' : 'attempts') + ' left.' + (wrong ? ' Go to your bot on WhatsApp and type <b>.password</b> to get your password.' : ''); }
      else { box.hidden = true; box.innerHTML = ''; }
    }
    // ===== LOGIN - ACCEPTS BOT PASSWORD ✅ - NO URL =====
    function login(number, pass) {
      if ((att().until || 0) > Date.now()) { showAtt(); return; }
      if (!number || !pass) return EH.toast('Enter both number and password', 'er');
      var btn = $('[data-signin]', body); if (btn) btn.classList.add('busy'); EH.toast('Signing in…');
      botApi('/api/manage-login', { phoneNumber: number, password: pass }).then(function (r) {
        var d = r.d || {};
        if (d.success) { onLoginSuccess(d); return; }
        return botApi('/api/managebot/login', { phoneNumber: number, password: pass }).then(function (r2) {
          var d2 = r2.d || {};
          if (d2.success) { onLoginSuccess(d2); return; }
          return api('/api/managebot/login', { method: 'POST', body: { phoneNumber: number, password: pass } }).then(function (r3) {
            var d3 = r3.d || {};
            if (d3.success) { onLoginSuccess(d3); return; }
            throw new Error(d3.error || d2.error || d.error || 'Sign in failed');
          });
        });
      }).catch(function (e) {
        if (btn) btn.classList.remove('busy');
        var msg = (e && e.message) || 'Sign in failed';
        if (msg.indexOf('Wrong') >= 0) { var a = att(); var left = (a.left == null ? 4 : a.left - 1); setAtt({ left: left }); showAtt(true); }
        EH.toast(msg, 'er');
      });
      function onLoginSuccess(d) {
        if (btn) btn.classList.remove('busy');
        setAtt(null);
        mb = { token: d.token, server: d.server || '', number: number, settings: d.settings || {}, password: pass };
        var l = saved(), i = -1; l.forEach(function (b, k) { if (b.number === number) i = k; }); var en = { number: number, password: pass, lastLogin: Date.now() }; if (i >= 0) l[i] = en; else l.push(en); saveSaved(l);
        EH.buzz(15); EH.toast('Bot unlocked ✓', 'ok'); panel();
      }
    }

    var CMDS = ['.menu', '.ping', '.password', '.antilink on'];
    var open = {};
    var SEC = [
      ['owner', 'user', '#60a5fa', '#2563eb', '👤 Owner Settings', '', false],
      ['group', 'users', '#22d3ee', '#0891b2', '👥 Group Settings', '', false],
      ['premium', 'crown', '#ffe9a3', '#d99a00', 'Premium Settings', '', true],
      ['usage', 'trend', '#fbbf24', '#d97706', 'Bot Usage', '<span class="chip" style="margin-left:7px;padding:3px 8px;font-size:10px;color:#f5b417;border-color:rgba(245,180,23,.5);background:rgba(245,180,23,.1)">' + ic('crown') + ' Premium</span>', true]
    ];
    function panel() {
      if (!mb) { loginView(); return; } var s = mb.settings || {}, mode = s.mode || 'public';
      body.innerHTML =
        '<div class="card rise bt-head" style="--i:0"><div class="ri" style="--a:#34d399;--b:#059669;width:46px;height:46px;border-radius:16px;font-size:23px">' + ic('robot') + '</div><div class="rt"><small>Signed in as</small><b>+' + esc(mb.number) + '</b></div>' +
          '<button class="btn alt sm tap" data-out>' + ic('logout') + ' Logout</button></div>' +
        '<div class="card rise mode-row" style="--i:1"><span>🛠️ Mode</span><div class="seg" data-mode><button data-m="public" class="' + (mode === 'public' ? 'on' : '') + '">public</button><button data-m="private" class="' + (mode === 'private' ? 'on' : '') + '">private</button></div></div>' +
        SEC.map(function (x) { return '<div class="acc' + (x[6] ? ' gold' : '') + (open[x[0]] ? ' open' : '') + '"><button type="button" class="acc-h tap" data-ah="' + x[0] + '"><span class="ri" style="--a:' + x[2] + ';--b:' + x[3] + (x[6] ? ';color:#3a2600' : '') + '">' + ic(x[1]) + '</span><span class="acc-t">' + x[4] + x[5] + '</span>' + ic('chevD', 'chev') + '</button><div class="acc-b" data-ab="' + x[0] + '"></div></div>'; }).join('') + EH.adCard() +
        '<div class="sec"><h3>Handy commands</h3><span>Tap to copy</span></div><div class="card"><div class="chips">' + CMDS.map(function (c) { return '<button type="button" class="chip cmd tap" data-cmd="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div><div class="note" style="margin:10px 2px 0">Send these to your bot on WhatsApp. <b>.password</b> sends you a new copy of your password.</div></div>' +
        '<div class="grp" style="margin-top:14px"><div class="row tap" data-go="deploy"><div class="ri" style="--a:#34d399;--b:#059669">' + ic('rocket') + '</div><div class="rt"><b>Add another bot</b><small>Pair a new WhatsApp number</small></div>' + ic('chevR', 'chev') + '</div>' +
          '<div class="row tap" data-go="tutorial"><div class="ri" style="--a:#fb923c;--b:#ea580c">' + ic('play') + '</div><div class="rt"><b>Watch the tutorial</b><small>Pair and manage your bot step by step</small></div>' + ic('chevR', 'chev') + '</div></div>';
      $$('[data-m]', body).forEach(function (b) { b.onclick = function () { var v = b.dataset.m; $$('[data-m]', body).forEach(function (x) { x.classList.toggle('on', x === b); }); set('mode', v).catch(function () { $$('[data-m]', body).forEach(function (x) { x.classList.toggle('on', x.dataset.m === mode); }); }); }; });
      $$('[data-cmd]', body).forEach(function (c) { c.onclick = function () { EH.copy(c.dataset.cmd, c.dataset.cmd + ' copied'); }; });
      $$('[data-ah]', body).forEach(function (h) { h.onclick = function () { toggle(h.dataset.ah); }; });
      Object.keys(open).forEach(function (k) { if (open[k]) fill(k); });
      $('[data-out]', body).onclick = function () { var m = mb; mb = null; open = {}; EH.api('/api/managebot/logout', { method: 'POST', auth: false, body: { server: m.server, token: m.token } }); loginView(); };
      EH.mountAds(scr);
    }
    function fill(k) { var box = $('[data-ab="' + k + '"]', body); if (!box || !mb) return; var fresh = box.cloneNode(false); box.parentNode.replaceChild(fresh, box); box = fresh; if (k === 'owner') renderOwner(box); else if (k === 'group') renderGroup(box); else if (k === 'premium') renderPremium(box); else if (k === 'usage') renderUsage(box); }
    function toggle(k) {
      var acc = $('[data-ah="' + k + '"]', body).parentNode; open[k] = !open[k]; acc.classList.toggle('open', open[k]); EH.buzz(5);
      if (open[k]) { fill(k); setTimeout(function () { try { EH.reveal(acc, 'nearest'); } catch (e) {} }, 60); }
    }
    EH.upgradeBot = function () { if (!mb) return; EH.openPremPay({ number: mb.number, bot: true }); };
    EH.mbRender = function () { if (alive) panel(); };
    if (mb) panel(); else loginView();
    return { show: function () { if (!mb) showAtt(false); }, destroy: function () { alive = false; clearInterval(lockT); } };
  } });

  function need(scr, then) { if (!mb) { EH.go('settings', true); return null; } return then(); }
  var rowT = function (emoji, label, key, on, desc, cb) { return '<div class="row"><div class="rt"><b>' + emoji + ' ' + label + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</div><label class="sw"><input type="checkbox" data-k="' + key + '"' + (on ? ' checked' : '') + '><i></i></label></div>'; };
  function wireToggles(root, group) {
    $$('[data-k]', root).forEach(function (c) { c.onchange = function () { var k = c.dataset.k, v = c.checked; set(k, v, true).then(function () { EH.toast(group ? (v ? 'Default enabled' : 'Default disabled') : 'Updated ✓', 'ok'); }).catch(function () { c.checked = !v; }); }; });
  }
  EH.screen('bot', { mount: function (scr, which) {
    if (!mb) { setTimeout(function () { EH.go('settings', true); }, 0); return {}; }
    if (which === 'owner') return owner(scr); if (which === 'group') return group(scr); if (which === 'premium') return premium(scr); if (which === 'usage') return usage(scr);
    setTimeout(function () { EH.back(); }, 0); return {};
  } });
  function prefixes() { var p = mb.settings && mb.settings.prefix; if (typeof p === 'string') p = [p]; if (!Array.isArray(p) || !p.length) p = ['.']; return ['.'].concat(p.filter(function (x) { return x !== '.'; })); }
  function owner(scr) { return renderOwner(EH.frame(scr, { bar: 'push', title: 'Owner settings' }).body); }
  function renderOwner(b) {
    var s = mb.settings || {}, feats = s.features || {};
    function paint() {
      s = mb.settings || {}; feats = s.features || {}; var pf = prefixes();
      b.innerHTML = '<div class="grp">' + OWN().map(function (t) { return rowT(t[1], t[2], t[0], !!feats[t[0]]); }).join('') + '<div class="row"><div class="rt"><b>😊 Status react emoji</b></div><input class="inp" data-emo maxlength="8" value="' + esc(s.statusReactEmoji || '❤️') + '" style="width:84px;height:44px;text-align:center;font-size:20px;padding:0"></div></div>' +
        '<div class="sec"><h3>Command prefixes</h3></div><div class="card"><div class="sub" style="margin-bottom:12px"><b style="color:var(--tx)">.</b> is the default and always works. Add more if you want.</div><div class="chips" data-pf>' + pf.map(function (p) { return '<span class="chip on" style="font-family:ui-monospace,monospace;font-size:15px">' + esc(p) + (p === '.' ? ' ' + ic('lock') : ' <button class="pfx" data-rm="' + esc(p) + '" aria-label="Remove">×</button>') + '</span>'; }).join('') + '</div><div class="btns" style="margin-top:14px"><input class="inp" data-np maxlength="1" placeholder="! or / or #" style="text-align:center;font-family:ui-monospace,monospace;font-weight:800;flex:2"><button class="btn tap" data-add>' + ic('plus') + ' Add</button></div></div>';
      wireToggles(b, false);
      $('[data-emo]', b).onchange = function (e) { set('statusReactEmoji', e.target.value); };
      $('[data-add]', b).onclick = function (e) { var v = $('[data-np]', b).value.trim(); if (!v) return EH.toast('Type a prefix to add', 'er'); if (!/^[^A-Za-z0-9\s"'`]$/.test(v)) return EH.toast('Prefix must be a single non-letter / non-digit character', 'er'); var cur = prefixes(); if (cur.indexOf(v) >= 0) return EH.toast('"' + v + '" is already active'); e.currentTarget.classList.add('busy'); set('prefix', cur.concat([v]), true).then(function () { EH.toast('Added "' + v + '" ✓', 'ok'); paint(); }).catch(function () { paint(); }); };
      $$('[data-rm]', b).forEach(function (x) { x.onclick = function () { var p = x.dataset.rm, nx = prefixes().filter(function (q) { return q !== p; }); set('prefix', nx, true).then(function () { EH.toast('Removed "' + p + '" ✓', 'ok'); paint(); }); }; });
    }
    paint(); return {};
  }
  function OWN() { return [['autotyping', '⌨️', 'Auto-typing'], ['autorecording', '🎤', 'Auto-recording'], ['anticall', '📵', 'Anti-call'], ['antidelete', '🖲️', 'Anti-delete'], ['autostatusview', '👁️', 'Auto status view'], ['autostatusreact', '💬', 'Auto status react'], ['autoreact', '🎲', 'Auto-react (random emoji every message)']]; }
  function group(scr) { return renderGroup(EH.frame(scr, { bar: 'push', title: 'Group settings', sub: 'Defaults for groups' }).body); }
  function renderGroup(b) {
    var feats = (mb.settings && mb.settings.features) || {};
    var G = [['antilink', '🔗', 'Anti-link', 'Deletes the message when a link is posted. A group\'s own .antilink command always overrides this default.', 'Want it to also kick the sender? Type <code>.antilink set kick</code> yourself inside that group.'],
      ['antibot', '🤖', 'Anti-bot', 'Auto-deletes other bots\' messages (I need to be admin in the group). A group\'s own .antibot on/off always overrides this default.'],
      ['antitaggroup', '🛡️', 'Anti group mention', 'Removes WhatsApp status posts that mention/link the group (I need to be admin). A group\'s own .antigroupmention command always overrides this default.'],
      ['antibadword', '🤬', 'Anti-badword', 'Deletes messages with bad words, warns the sender, auto-kicks after 3 warnings. A group\'s own .antibadword always overrides this default.'],
      ['antispam', '🛑', 'Anti-spam', 'Deletes and warns anyone who floods a group (7+ messages in 10 seconds; I need to be admin). This default never removes anyone — type .antispam on in a group to also remove someone after 3 warnings.']];
    b.innerHTML = '<div class="note" style="margin:0 4px 12px">These are defaults for groups that never set their own. A group\'s own command always wins.</div><div class="grp">' + G.map(function (g) { return rowT(g[1], g[2], g[0], !!feats[g[0]], g[3]) + (g[4] ? '<div class="row" style="padding-top:0"><div class="rt"><small class="warn">' + ic('warn') + ' ' + g[4] + '</small></div></div>' : ''); }).join('') + '</div>';
    wireToggles(b, true); return {};
  }
  function premium(scr) { return renderPremium(EH.frame(scr, { bar: 'push', title: 'Premium settings', sub: '+' + mb.number }).body); }
  function renderPremium(b) {
    var d = null, img = null; b.innerHTML = '<div class="spinner"></div>';
    var q = function () { return '?server=' + encodeURIComponent(mb.server) + '&token=' + encodeURIComponent(mb.token) + '&number=' + encodeURIComponent(mb.number || ''); };
    function load() { img = null; EH.api('/api/managebot/premium' + q(), { auth: false }).then(function (r) { if (!r.d.success) { b.innerHTML = '<div class="empty"><b>' + esc(r.d.error || 'Failed') + '</b></div>'; return; } d = r.d; paint(); }); }
    function paint() {
      var prem = !!d.premium, can = prem && !d.outdated, msgs = d.outdated || d.anticallMessage !== undefined, bye = d.outdated || d.goodbyeMessage !== undefined, dis = can ? '' : ' disabled', own = d.whatsappName ? d.whatsappName + ' Bot' : 'Your WhatsApp name + Bot';
      var sw = function (id, label, help, on, extra) { return '<div class="row"><div class="rt"><b>' + label + '</b><small>' + help + '</small></div><label class="sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (extra || dis) + '><i></i></label></div>'; };
      var fld = function (label, help, inner) { return '<label class="fld"><span>' + label + '</span>' + inner + '<div class="note" style="margin-top:6px">' + help + '</div></label>'; };
      b.innerHTML =
        (prem ? '<div class="card" style="border-color:rgba(245,180,23,.4);margin-bottom:12px;font-size:13.5px;color:#f5b417">' + ic('crown') + ' Premium until <b>' + (d.premiumUntil ? EH.date(d.premiumUntil) : '—') + '</b></div>' + (d.outdated ? '<div class="card" style="margin-bottom:12px;font-size:13px;color:var(--t2)">Your bot\'s server is being updated. These settings will be editable again soon.</div>' : '')
          : '<div class="card" style="border-color:rgba(245,180,23,.4);margin-bottom:12px"><b>' + ic('lock') + ' +' + esc(mb.number) + ' is not Premium</b><div class="sub" style="margin:6px 0 12px">These settings are locked for this bot number. Upgrade it to unlock them. Your own account stays as it is.</div><button class="btn gold block tap" data-bup>' + ic('crown') + ' Upgrade +' + esc(mb.number) + ' to Premium</button></div>') +
        '<div class="grp">' + sw('pOwn', 'Use my WhatsApp name as bot name', 'Shows as <b>' + esc(own) + '</b>', prem && d.useOwnName !== false) + sw('pWm', 'Hide the bottom watermark', 'Removes the KING MD link and credit at the bottom of every reply', prem && d.hideWatermark) +
          sw('pHd', 'Hide the top watermark', d.hideHeader === undefined ? 'Available once your bot\'s server is updated.' : 'Removes the heading with the bot name at the top of every reply', prem && d.hideHeader, d.hideHeader === undefined ? ' disabled' : dis) + sw('pGh', 'Ghost mode 👻', 'Turns your WhatsApp read receipts off — nobody sees blue ticks', d.ghostMode) + '</div>' +
        '<div style="height:16px"></div>' +
        fld('Bot name', 'Leave empty to use the option above', '<input class="inp" id="pName" maxlength="40" placeholder="e.g. Henry Bot" value="' + esc(d.botName || '') + '"' + dis + '>') +
        fld('Bot owner', 'The owner / creator name shown in your menu', '<input class="inp" id="pOwner" maxlength="40" placeholder="' + esc(d.whatsappName || 'Your name') + '" value="' + esc(d.ownerName || '') + '"' + dis + '>') +
        fld('Channel link', 'Your WhatsApp channel — "View channel" on your menu and ping opens it', '<input class="inp" id="pChan" type="url" placeholder="https://whatsapp.com/channel/…" value="' + esc(d.channelLink || '') + '"' + dis + '>') +
        '<div class="fld"><span>Bot profile picture</span><div class="card" style="display:flex;align-items:center;gap:14px"><img id="pPrev" alt="" style="width:64px;height:64px;border-radius:18px;object-fit:cover;background:var(--s3);display:none"><div style="flex:1;min-width:0"><div class="sub" style="font-size:13px">' + (d.hasPicture ? 'A custom picture is set.' : 'Upload a picture from your phone — it is shrunk automatically.') + '</div><div id="pNote" class="note" style="margin:4px 0 0"></div></div><label class="btn alt sm tap">' + ic('image') + ' Pick<input type="file" id="pFile" accept="image/*" hidden' + dis + '></label></div>' +
          '<input class="inp" id="pImg" type="url" placeholder="…or paste an image link" style="margin-top:10px" ' + dis + '>' + (d.hasPicture ? '<button class="btn danger sm tap" data-reset style="margin-top:10px">Reset to the default picture</button>' : '') + '</div>' +
        (msgs ? '' : '<div class="note">Custom welcome, goodbye and anti-call messages can be set here once your bot\'s server is updated.</div>') +
        fld('Welcome message', 'Sent when someone joins a group where welcome is on. You can use {user} {group} {count} {desc} {rules} {date} {time}. Leave empty for the default.', '<textarea class="inp" id="pWel" rows="3" maxlength="1000"' + (can && msgs ? '' : ' disabled') + '>' + esc(d.welcomeMessage || '') + '</textarea>') +
        fld('Goodbye message', 'Sent when someone leaves a group where goodbye is on. Leave empty for the default.', '<textarea class="inp" id="pBye" rows="3" maxlength="1000"' + (can && bye ? '' : ' disabled') + '>' + esc(d.goodbyeMessage || '') + '</textarea>') +
        fld('Anti-call message', 'What people who call you get while Anti-call is on. Leave empty for the default.', '<textarea class="inp" id="pCall" rows="3" maxlength="500"' + (can && msgs ? '' : ' disabled') + '>' + esc(d.anticallMessage || '') + '</textarea>') +
        '<div class="grp">' + sw('pCR', 'Enable channel react', (d.channelReact === undefined ? 'Available once your bot\'s server is updated. ' : '') + 'Use <b>.chreact</b> in your bot to react to a channel post. It uses your account\'s Premium free reacts first, then 1 coin each.', !!d.channelReact, d.channelReact === undefined ? ' disabled' : dis) +
          sw('pPV', 'Enable poll vote', (d.pollVote === undefined ? 'Available once your bot\'s server is updated. ' : '') + 'Use <b>.pollvote</b> in your bot to vote on a channel poll. It uses your account\'s Premium free votes first, then 1 coin each.', !!d.pollVote, d.pollVote === undefined ? ' disabled' : dis) + '</div>' +
        '<button class="btn gold block tap" style="margin-top:18px" data-save' + (prem ? dis : '') + '>' + ic(can ? 'check' : prem ? 'lock' : 'crown') + ' ' + (can ? 'Save Premium settings' : prem ? 'Waiting for your bot\'s server' : 'Upgrade +' + esc(mb.number)) + '</button>';
      if (!prem) { var trap = function (e) { if (e.target.closest('[data-bup]')) return; e.preventDefault(); e.stopPropagation(); if (e.target.blur) e.target.blur(); if (Date.now() - (b._la || 0) > 500) { b._la = Date.now(); EH.upgradeBot(); } };
        $$('[disabled]', b).forEach(function (x) { x.removeAttribute('disabled'); }); b.addEventListener('click', function (e) { if (e.target.closest('input,textarea,label.btn,.sw,[data-save]')) trap(e); }, true); b.addEventListener('focusin', function (e) { if (e.target.matches('input,textarea')) trap(e); }, true); }
      var pf = $('#pFile', b); if (pf) pf.onchange = function () { var file = pf.files && pf.files[0]; pf.value = ''; if (!file) return; if (!/^image\//.test(file.type)) return EH.toast('Choose a picture', 'er');
        var im = new Image(), url = URL.createObjectURL(file); im.onload = function () { var k = Math.min(1, 720 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); img = c.toDataURL('image/jpeg', 0.78); var pv = $('#pPrev', b); pv.src = img; pv.style.display = ''; $('#pNote', b).textContent = 'Ready (' + Math.round(img.length * 0.75 / 1024) + ' KB) — press Save'; }; im.onerror = function () { URL.revokeObjectURL(url); EH.toast('Could not read that picture', 'er'); }; im.src = url; };
      $$('[id=pCR],[id=pPV]', b).forEach(function (el) { el.onchange = function () { service(el.id === 'pCR' ? 'react' : 'vote', el); }; });
      var rs = $('[data-reset]', b); if (rs) rs.onclick = function () { save(true); };
      $('[data-save]', b).onclick = function () { if (!d.premium) return EH.upgradeBot(); save(false); };
      var up = $('[data-bup]', b); if (up) up.addEventListener('click', EH.upgradeBot);
    }
    function service(kind, el) {
      var on = el.checked, name = kind === 'react' ? 'Channel React' : 'Poll Vote', cmd = kind === 'react' ? '.chreact' : '.pollvote';
      if (!d.premium) { el.checked = !on; return EH.upgradeBot(); }
      if (!EH.token) { el.checked = !on; EH.toast('Sign in to your account first — your bot uses that account'); return EH.login('Your bot uses your KING MD account for ' + name + '.'); }
      var go = function () { el.disabled = true; EH.api('/api/managebot/bot-service', { method: 'POST', body: { server: mb.server, token: mb.token, number: mb.number, kind: kind, on: on } }).then(function (r) { el.disabled = false; var x = r.d; if (!x.success) { el.checked = !on; return EH.toast(x.error || 'Failed', 'er'); } d.channelReact = !!x.react; d.pollVote = !!x.vote; EH.toast(on ? name + ' is on — use ' + cmd + ' in your bot' : name + ' is off', 'ok'); }); };
      if (on) EH.confirm({ title: 'Turn on ' + name + '?', text: 'You can then use ' + cmd + ' in your bot (only you, the owner). Each use counts like in the app: your Premium free ' + (kind === 'react' ? 'reacts' : 'votes') + ' first, then 1 EH coin.', ok: 'Turn on' }).then(function (y) { if (y) go(); else el.checked = false; }); else go();
    }
    function save(reset) {
      var btn = $('[data-save]', b), v = function (id) { var e = $('#' + id, b); return e ? e.value.trim() : ''; }, body = { server: mb.server, token: mb.token };
      if (reset) body.resetImage = true; else {
        body.useOwnName = !!$('#pOwn', b).checked; body.hideWatermark = !!$('#pWm', b).checked; if (d.hideHeader !== undefined) body.hideHeader = !!$('#pHd', b).checked; body.ghostMode = !!$('#pGh', b).checked;
        body.botName = v('pName'); body.ownerName = v('pOwner'); body.channelLink = v('pChan');
        if (d.anticallMessage !== undefined) { body.anticallMessage = v('pCall'); body.welcomeMessage = v('pWel'); } if (d.goodbyeMessage !== undefined) body.goodbyeMessage = v('pBye');
        if (img) body.imageData = img; else if (v('pImg')) body.imageUrl = v('pImg');
      }
      btn.classList.add('busy'); EH.api('/api/managebot/premium', { method: 'POST', auth: false, body: body }).then(function (r) { btn.classList.remove('busy'); if (r.d.success) { EH.toast('Premium settings saved ✓', 'ok'); load(); } else EH.toast(r.d.error || 'Failed', 'er'); });
    }
    load(); return {};
  }
  function usage(scr) { return renderUsage(EH.frame(scr, { bar: 'push', title: 'Bot usage', sub: '+' + mb.number }).body); }
  function renderUsage(b) {
    function load() {
      b.innerHTML = '<div class="spinner"></div>';
      EH.api('/api/managebot/usage?server=' + encodeURIComponent(mb.server) + '&token=' + encodeURIComponent(mb.token) + '&number=' + encodeURIComponent(mb.number || ''), { auth: false }).then(function (r) {
        var d = r.d; if (!d.success) { b.innerHTML = '<div class="empty"><b>' + esc(d.error || 'Failed') + '</b></div>'; return; }
        if (d.locked) { b.innerHTML = '<div class="card" style="text-align:center;border-color:rgba(245,180,23,.4)"><div class="pm-crown">' + ic('lock') + '</div><div class="h1" style="font-size:22px;margin-top:12px">Premium only</div><div class="sub" style="margin:8px 0 16px">See every command used on your bot in the last hour, live — who ran it, where, and when.</div><button class="btn gold block tap" data-bup>' + ic('crown') + ' Upgrade +' + esc(mb.number) + '</button></div>'; var ub = $('[data-bup]', b); if (ub) ub.onclick = EH.upgradeBot; return; }
        if (d.outdated) { b.innerHTML = '<div class="empty"><b>Coming soon</b><p>Usage will show here once your bot\'s server has been updated. Check back soon.</p></div>'; return; }
        var up = function (s) { if (!s) return '—'; var dd = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return dd ? dd + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm'; };
        var ago = function (t) { var s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + 's ago' : Math.round(s / 60) + ' min ago'; };
        var tile = function (k, v) { return '<div class="ptile"><div class="t">' + k + '</div><div class="n" style="margin:0">' + v + '</div></div>'; };
        b.innerHTML = '<div class="ptiles" style="margin-top:0">' + tile(ic('bolt') + 'Commands, last hour', EH.fmt(d.total || 0)) + tile(ic('clock') + 'Online for', d.online ? up(d.uptimeSec) : 'Offline') + '</div>' +
          ((d.top || []).length ? '<div class="chips" style="margin-top:12px">' + d.top.map(function (x) { return '<span class="chip">' + esc(x[0]) + ' · ' + x[1] + '</span>'; }).join('') + '</div>' : '') +
          '<div class="sec"><h3>Console — last hour</h3><a data-rf>Refresh</a></div><div class="card" style="padding:6px 14px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px">' + ((d.entries || []).length ? d.entries.map(function (e) { return '<div style="display:flex;gap:8px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line)"><span style="color:var(--t2)">' + new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</span><span style="color:var(--wa);font-weight:700">' + esc(e.cmd) + '</span><span style="color:var(--t2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (e.chat === 'group' ? 'group' : 'private') + ' · ' + (e.by === 'you' ? 'you' : '+' + esc(e.by)) + '</span><span style="margin-left:auto;color:var(--t2);font-size:11px">' + ago(e.t) + '</span></div>'; }).join('') : '<div class="sub" style="padding:14px 0">No commands in the last hour.</div>') + '</div><div class="note">Only the last hour is kept — older commands are deleted automatically.</div>';
        var rf = $('[data-rf]', b); if (rf) rf.onclick = load;
      });
    }
    load(); return {};
  }
})();
