/* Profile tab, other people's profiles, find users, wallet (coins, gifts, redeem), API keys */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var nameOf = function (u) { return u.firstName ? (u.firstName + ' ' + (u.lastName || '')).trim() : u.username; };
  EH.bal = function (n) { return (EH.user && EH.user.hideBalance) ? '••••' : EH.fmt(n); };
  EH.toggleBal = function () {
    if (!EH.user) return; var next = !EH.user.hideBalance; EH.user.hideBalance = next; EH.setUser(EH.user);
    EH.api('/api/profile/privacy', { method: 'POST', body: { hideBalance: next } });
  };

  /* ───── coins: buy sheet (same packages and Korapay checkout as the site) ───── */
  var pkgData = null;
  var guess = function () { var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {} return { 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'CI', 'Africa/Douala': 'CM', 'Africa/Cairo': 'EG' }[tz] || 'XX'; };
  EH.openBuyCoins = function () {
    if (EH.needLogin('Sign in to buy coins.')) return;
    var s = EH.sheet({ title: 'Buy EH coins', html: '<div class="spinner"></div>' }), box = s.el;
    (pkgData ? Promise.resolve(pkgData) : EH.api('/api/coins/packages').then(function (r) { return r.d; })).then(function (d) {
      if (!d || !d.success) { box.innerHTML = '<div class="empty"><b>Could not load packages</b><p>Check your connection.</p></div>'; return; } pkgData = d;
      var sel = null, live = !!d.paymentLive, off = !!d.paymentsOff, opts = d.options || [], g = guess();
      var def = (opts.some(function (o) { return o.id === g && o.live; }) ? g : (opts.filter(function (o) { return o.live; })[0] || { id: 'NG' }).id);
      box.innerHTML = '<label class="fld"><span>Country</span><select class="inp" data-cty>' + opts.map(function (o) { return '<option value="' + esc(o.id) + '"' + (o.live ? '' : ' disabled') + '>' + o.flag + ' ' + esc(o.country) + (o.live ? (o.id === 'XX' ? '' : ' — ' + esc(o.currency)) : ' — Coming soon') + '</option>'; }).join('') + '</select></label>' +
        '<div class="pkgs" data-pk></div>' +
        '<label class="fld" style="margin-top:14px"><span>Or a custom amount</span><input class="inp" data-custom type="number" inputmode="numeric" placeholder="Number of coins (min ' + d.custom.minCoins + ')"></label><div class="note" data-cprice style="margin:-6px 4px 14px;text-align:right"></div>' +
        (live ? '' : '<div class="card" style="border-color:rgba(245,180,23,.35);margin-bottom:12px;font-size:13px;color:#fbbf24;text-align:center">' + (off ? 'Payments are turned off right now. Please check back later.' : 'Payments are coming soon.') + '</div>') +
        '<button class="btn gold block tap" data-pay disabled>' + ic('lock') + ' Pay securely</button>';
      var cty = $('[data-cty]', box), pay = $('[data-pay]', box), cust = $('[data-custom]', box); cty.value = def;
      var opt = function () { return opts.filter(function (o) { return o.id === cty.value; })[0] || { symbol: '₦', currency: 'NGN', month: 1, base: 1 }; };
      var price = function (naira, o) { return o.currency === 'NGN' ? naira : Math.ceil(naira * o.month / o.base); };
      function paint() {
        var o = opt(); $('[data-pk]', box).innerHTML = d.packages.map(function (p, i) { return '<button type="button" class="pkg tap' + (sel && sel.type === 'package' && sel.index === i ? ' on' : '') + '" data-i="' + i + '">' + (p.bonus ? '<em>+' + p.bonus + '</em>' : '') + '<b><span class="coin">EH</span>' + p.coins.toLocaleString() + '</b><small>' + o.symbol + price(p.nairaPrice, o).toLocaleString() + '</small></button>'; }).join('');
        $$('[data-i]', box).forEach(function (b) { b.onclick = function () { var i = Number(b.dataset.i), p = d.packages[i]; cust.value = ''; $('[data-cprice]', box).textContent = ''; sel = { type: 'package', index: i, coins: p.coins + (p.bonus || 0), nairaPrice: p.nairaPrice }; pay.disabled = !live; paint(); }; });
      }
      cty.onchange = function () { paint(); custom(); };
      function custom() {
        var amt = parseInt(cust.value, 10), pr = $('[data-cprice]', box); if (!cust.value) return;
        if (!amt || amt < d.custom.minCoins) { pr.textContent = amt ? 'Min ' + d.custom.minCoins + ' coins' : ''; sel = null; pay.disabled = true; return; }
        var naira = Math.ceil(amt * d.custom.ratePerCoin), o = opt(); pr.textContent = '≈ ' + o.symbol + price(naira, o).toLocaleString(); sel = { type: 'custom', coins: amt, nairaPrice: naira }; pay.disabled = !live; $$('.pkg', box).forEach(function (x) { x.classList.remove('on'); });
      }
      cust.oninput = custom;
      pay.onclick = function () { if (!sel) return EH.toast('Choose a package or amount first', 'er'); pay.classList.add('busy');
        EH.api('/api/coins/topup/initiate', { method: 'POST', body: Object.assign({}, sel, { country: cty.value, app: true }) }).then(function (r) { var x = r.d || {}; if (x.checkoutUrl) { location.href = x.checkoutUrl; return; } pay.classList.remove('busy'); EH.toast(x.error || 'Failed', x.comingSoon ? '' : 'er'); }); };
      paint();
    });
    return s;
  };

  /* back from the payment page: the app opens with ?pay=<reference> */
  EH.handlePayReturn = function (ref) {
    if (!EH.token) { EH.toast('Sign in to see your payment'); return; }
    var i = 0; EH.toast('Confirming your payment…');
    (function tryIt() {
      EH.api('/api/payments/verify?reference=' + encodeURIComponent(ref)).then(function (r) {
        var d = r.d || {};
        if (d.success && d.status === 'paid') { EH.toast(d.kind === 'premium' ? 'Payment received — your Premium is on 🎉' : d.kind === 'refill' ? 'Payment received — your free uses are full again' : 'Payment received — coins added 🎉', 'ok'); EH.refreshUser(); EH.openReceipt(ref); return; }
        if (d.success && d.status === 'failed') { EH.toast('The payment did not go through — you have not been charged.', 'er'); return; }
        if (++i < 6) setTimeout(tryIt, 4000); else EH.toast('Still waiting for Korapay to confirm. It will be added automatically as soon as it does.');
      });
    })();
  };
  EH.openReceipt = function (ref) {
    if (!EH.token || !ref) return; var s = EH.sheet({ title: 'Receipt', html: '<div class="spinner"></div>' });
    EH.api('/api/payments/receipt/' + encodeURIComponent(ref)).then(function (r) {
      var d = r.d || {}; if (!d.success) { s.el.innerHTML = '<div class="empty"><b>' + esc(d.error || 'Could not load the receipt') + '</b></div>'; return; }
      var x = d.receipt, how = { card: 'Card', bank_transfer: 'Bank transfer', pay_with_bank: 'Pay with bank', mobile_money: 'Mobile money' }[x.method] || x.method || 'Korapay';
      var row = function (k, v) { return '<div class="row"><div class="rt"><small>' + k + '</small></div><div class="rv" style="font-size:14px">' + v + '</div></div>'; };
      s.el.innerHTML = '<div style="text-align:center;padding:6px 0 16px"><div class="pm-crown" style="background:linear-gradient(135deg,#34d399,#059669);color:#fff;box-shadow:0 0 28px rgba(34,197,94,.45)">' + ic('check') + '</div><div class="h1" style="font-size:22px;margin-top:12px">Payment successful</div><div style="font-size:30px;font-weight:800;margin-top:6px">' + esc(x.symbol) + Number(x.amount || 0).toLocaleString() + '</div><div class="sub">' + esc(x.item) + '</div></div>' +
        '<div class="grp">' + row('Order number', esc(x.reference)) + row('Date', esc(new Date(x.paidAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }))) + row('Paid with', esc(how)) +
        (x.kind === 'premium' && x.number ? row('Premium for', '+' + esc(x.number)) : '') + (x.kind === 'premium' && x.until ? row('Premium until', esc(EH.date(x.until))) : '') + (x.kind === 'coins' ? row('Coins added', Number(x.coins || 0).toLocaleString()) : '') +
        (x.kind === 'refill' ? row('Refilled for today', Number(x.reacts || 0) + ' reacts + ' + Number(x.votes || 0) + ' votes') : '') + row('Status', '<span class="okc">Paid</span>') + '</div>' +
        '<button class="btn alt block tap" style="margin-top:14px" data-cp>' + ic('copy') + ' Copy order number</button><div class="note" style="text-align:center">Keep this receipt. If anything is wrong, contact support with your order number.</div>';
      $('[data-cp]', s.el).onclick = function () { EH.copy(x.reference, 'Order number copied'); };
    });
  };

  /* gifts + redeem */
  EH.openGift = function (to) {
    if (EH.needLogin('Sign in to send a gift.')) return;
    var sel = null, s = EH.sheet({ title: 'Send a gift', html: '<label class="fld"><span>Recipient username</span><input class="inp" data-to placeholder="username" autocapitalize="none" autocomplete="off"></label>' +
      '<div class="fld"><span>Amount</span><div class="chips" data-amts>' + [5, 10, 20, 50, 100].map(function (n) { return '<button type="button" class="chip tap" data-a="' + n + '"><span class="coin" style="width:18px;height:18px;font-size:7px">EH</span>' + n + '</button>'; }).join('') + '</div><input class="inp" data-amt type="number" inputmode="numeric" placeholder="Or type an amount" style="margin-top:10px"></div>' +
      '<label class="fld"><span>Message (optional)</span><input class="inp" data-msg maxlength="120" placeholder="Say something nice"></label><button class="btn block tap" data-send>' + ic('gift') + ' Send gift</button><div class="note" style="text-align:center">They have to accept it. Your balance: ' + EH.bal((EH.user && EH.user.coins) || 0) + ' coins.</div>' });
    var b = s.el; if (to) $('[data-to]', b).value = to;
    $$('[data-a]', b).forEach(function (c) { c.onclick = function () { sel = Number(c.dataset.a); $('[data-amt]', b).value = ''; $$('[data-a]', b).forEach(function (x) { x.classList.toggle('on', x === c); }); }; });
    $('[data-amt]', b).oninput = function () { sel = null; $$('[data-a]', b).forEach(function (x) { x.classList.remove('on'); }); };
    $('[data-send]', b).onclick = function (e) {
      var btn = e.currentTarget, toU = $('[data-to]', b).value.trim().replace(/^@/, ''), amt = sel || parseInt($('[data-amt]', b).value, 10);
      if (!toU) return EH.toast('Enter recipient username', 'er'); if (!amt || amt < 1) return EH.toast('Select or enter gift amount', 'er');
      btn.classList.add('busy'); EH.api('/api/gifts/send', { method: 'POST', body: { toUsername: toU, amount: amt, message: $('[data-msg]', b).value.trim() } }).then(function (r) {
        btn.classList.remove('busy'); if (r.d.success) { s.close(); EH.toast('🎁 Sent ' + amt + ' coin' + (amt > 1 ? 's' : '') + ' to @' + toU + '! Waiting for them to accept.', 'ok'); EH.refreshUser(); } else EH.toast(r.d.error || 'Gift failed', 'er'); });
    };
  };
  EH.openRedeem = function () {
    if (EH.needLogin('Sign in to redeem a code.')) return;
    var s = EH.sheet({ title: 'Redeem a code', html: '<label class="fld"><span>Code</span><input class="inp big" data-code placeholder="ENTER CODE" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase"></label><button class="btn block tap" data-go>' + ic('gift') + ' Redeem</button>' });
    $('[data-go]', s.el).onclick = function (e) { var code = $('[data-code]', s.el).value.trim(); if (!code) return EH.toast('Enter a code', 'er'); var b = e.currentTarget; b.classList.add('busy');
      EH.api('/api/redeem', { method: 'POST', body: { code: code } }).then(function (r) { b.classList.remove('busy'); if (r.d.success) { s.close(); EH.toast(r.d.message || 'Redeemed!', 'ok'); EH.refreshUser(); } else EH.toast(r.d.error || 'Invalid code', 'er'); }); };
  };

  /* follow lists, edit profile, API keys, bot number */
  function followList(username, kind) {
    var title = kind === 'followers' ? 'Followers' : 'Following', s = EH.sheet({ title: title, html: '<div class="spinner"></div>' });
    EH.api('/api/users/' + encodeURIComponent(username) + '/' + kind, { auth: false }).then(function (r) {
      var d = r.d || {}; if (!d.success) { s.el.innerHTML = '<div class="empty"><b>Failed to load</b></div>'; return; }
      if (d.restricted) { s.el.innerHTML = '<div class="empty"><div class="ei">' + ic('lock') + '</div><b>Private</b><p>This user does not allow viewing who they follow.</p></div>'; return; }
      if (!d.users.length) { s.el.innerHTML = '<div class="empty"><b>No ' + title.toLowerCase() + ' yet</b></div>'; return; }
      s.el.innerHTML = '<div class="grp">' + d.users.map(function (u) { return '<div class="row tap" data-u="' + esc(u.username) + '">' + EH.avatar(u, 'sm') + '<div class="rt"><b>' + esc(nameOf(u)) + ' ' + EH.badges(u, 14) + '</b><small>@' + esc(u.username) + '</small></div>' + ic('chevR', 'chev') + '</div>'; }).join('') + '</div>' + (d.total > 5 ? '<div class="note" style="text-align:center">+' + (d.total - 5) + ' more — only the 5 most recent are shown here.</div>' : '');
      $$('[data-u]', s.el).forEach(function (e) { e.onclick = function () { s.close(); EH.go('user/' + e.dataset.u); }; });
    });
  }
  function editProfile() {
    var u = EH.user, valid = true, tm;
    var s = EH.sheet({ title: 'Edit profile', html: '<div class="btns"><label class="fld"><span>First name</span><input class="inp" data-f value="' + esc(u.firstName || '') + '"></label><label class="fld"><span>Last name</span><input class="inp" data-l value="' + esc(u.lastName || '') + '"></label></div>' +
      '<label class="fld"><span>Username</span><input class="inp" data-un value="' + esc(u.username) + '" autocapitalize="none" autocomplete="off"></label><div class="note" data-st style="margin:-6px 4px 12px"></div>' +
      '<label class="fld"><span>Bio</span><textarea class="inp" data-bio maxlength="200" placeholder="Tell the community about yourself...">' + esc(u.bio || '') + '</textarea></label><button class="btn block tap" data-save>' + ic('check') + ' Save changes</button>' });
    var b = s.el, un = $('[data-un]', b), st = $('[data-st]', b);
    un.oninput = function () { clearTimeout(tm); var v = un.value.trim(); if (v === u.username) { st.textContent = ''; valid = true; return; } valid = false;
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) { st.className = 'note err'; st.textContent = '3-20 characters: letters, numbers, underscore only'; return; }
      st.className = 'note'; st.textContent = 'Checking…'; tm = setTimeout(function () { EH.api('/api/onboarding/check-username?u=' + encodeURIComponent(v), { auth: false }).then(function (r) { var d = r.d; if (d.available) { st.className = 'note okc'; st.textContent = '✓ Available'; valid = true; } else { st.className = 'note err'; st.textContent = d.reason || 'Username taken'; } }); }, 380); };
    $('[data-save]', b).onclick = function (e) {
      var f = $('[data-f]', b).value.trim(), l = $('[data-l]', b).value.trim(), nm = un.value.trim(), bio = $('[data-bio]', b).value;
      if (!f || !l) return EH.toast('Enter your first and last name', 'er'); if (!valid) return EH.toast('Choose an available username', 'er');
      var btn = e.currentTarget; btn.classList.add('busy');
      EH.api('/api/profile/edit', { method: 'POST', body: { firstName: f, lastName: l, username: nm } }).then(function (r) {
        if (!r.d.success) { btn.classList.remove('busy'); return EH.toast(r.d.error || 'Update failed', 'er'); }
        return (bio !== (u.bio || '') ? EH.api('/api/profile/update', { method: 'POST', body: { bio: bio } }) : Promise.resolve()).then(function () { s.close(); EH.toast('Profile updated!', 'ok'); EH.refreshUser(); });
      });
    };
  }
  function apiKeys() {
    var s = EH.sheet({ title: 'API keys', full: true, html: '<div class="spinner"></div>' }), store = 'eh_ak_' + ((EH.user && EH.user.username) || 'x');
    function load() {
      EH.api('/api/me/apikeys').then(function (r) {
        var d = r.d || {}; if (!d.success) { s.el.innerHTML = '<div class="empty"><b>' + esc(d.error || 'Could not load your keys') + '</b></div>'; return; }
        s.el.innerHTML = '<div class="sub" style="margin-bottom:12px">' + d.keys.length + ' of ' + d.max + ' keys. Use them with our APIs. <a href="/api-docs" target="_blank" rel="noopener" style="color:var(--p);font-weight:700">API docs</a></div>' +
          '<div data-new></div>' + (d.keys.length < d.max ? '<div class="btns"><input class="inp" data-name placeholder="Key name (optional)" maxlength="40" style="flex:2"><button class="btn tap" data-mk style="flex:1">' + ic('plus') + ' Create</button></div>' : '') +
          '<div class="sec" style="margin-top:18px"><h3>My keys</h3></div>' + (d.keys.length ? '<div class="grp">' + d.keys.map(function (k) { return '<div class="row"><div class="rt"><b>' + esc(k.name) + '</b><small style="font-family:ui-monospace,Menlo,monospace">' + esc(k.prefix) + '</small><small>Made ' + new Date(k.createdAt).toLocaleDateString() + ' · ' + (k.lastUsedAt ? 'last used ' + new Date(k.lastUsedAt).toLocaleDateString() : 'never used') + ' · ' + k.uses + ' request' + (k.uses === 1 ? '' : 's') + '</small></div><button class="btn danger sm tap" data-rv="' + esc(k.id) + '">Revoke</button></div>'; }).join('') + '</div>' : '<div class="empty"><b>No keys yet</b></div>');
        var mk = $('[data-mk]', s.el); if (mk) mk.onclick = function () { mk.classList.add('busy'); EH.api('/api/me/apikeys', { method: 'POST', body: { name: $('[data-name]', s.el).value.trim() } }).then(function (r) { if (!r.d.success) { mk.classList.remove('busy'); return EH.toast(r.d.error || 'Could not create the key', 'er'); }
          EH.toast('API key created', 'ok'); load(); setTimeout(function () { var nb = $('[data-new]', s.el); if (nb) { nb.innerHTML = '<div class="card" style="border-color:rgba(34,197,94,.4);margin-bottom:14px"><b class="okc">Your new key — copy it now</b><div style="font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all;margin:8px 0;-webkit-user-select:text;user-select:text">' + esc(r.d.key) + '</div><button class="btn sm tap" data-ck>' + ic('copy') + ' Copy key</button></div>'; $('[data-ck]', nb).onclick = function () { EH.copy(r.d.key, 'Key copied!'); }; } }, 400); }); };
        $$('[data-rv]', s.el).forEach(function (b) { b.onclick = function () { EH.confirm({ title: 'Revoke this key?', text: 'Anything using it stops working right away. This cannot be undone.', ok: 'Revoke', danger: true }).then(function (y) { if (!y) return; EH.api('/api/me/apikeys/' + encodeURIComponent(b.dataset.rv), { method: 'DELETE' }).then(function (r) { if (r.d.success) { EH.toast('Key revoked', 'ok'); load(); } else EH.toast(r.d.error || 'Could not revoke', 'er'); }); }); }; });
      });
    }
    load();
  }
  function numberCard(box) {
    var u = EH.user, n = u && u.boundNumber;
    if (n) {
      box.innerHTML = '<div class="row" style="padding:0"><div class="rt"><b>+' + esc(n) + ' ' + (u.isPremium ? '<span class="chip on" style="color:#f5b417;border-color:rgba(245,180,23,.5);background:rgba(245,180,23,.1)">Premium</span>' : '') + '</b><small>Linked to this account</small></div><button class="btn danger sm tap" data-unbind>Unbind</button></div><div class="note">Unbinding lets you (or someone else) link this number to a different account. If this number gave you Premium, the account Premium goes with it.</div>';
      $('[data-unbind]', box).onclick = function () { EH.confirm({ title: 'Unbind +' + n + '?', text: 'If this number gave your account Premium, that goes with it. You can link it again later.', ok: 'Unbind', danger: true }).then(function (y) { if (!y) return; EH.api('/api/number/unbind', { method: 'POST', body: {} }).then(function (r) { if (!r.d.success) return EH.toast(r.d.error || 'Failed', 'er'); EH.toast('Number unbound', 'ok'); EH.refreshUser(); }); }); };
    } else {
      box.innerHTML = '<div class="btns"><input class="inp" data-n type="tel" inputmode="numeric" placeholder="e.g. 2349012345678" style="flex:2"><button class="btn tap" data-link style="flex:1">Link</button></div><div class="note">Link your bot number to this account. If it is Premium, Premium works here too.</div>';
      $('[data-link]', box).onclick = function (e) {
        var number = ($('[data-n]', box).value || '').replace(/\D/g, ''); if (!number) return EH.toast('Enter your bot number', 'er'); var btn = e.currentTarget; btn.classList.add('busy');
        var send = function (replace) { return EH.api('/api/number/bind', { method: 'POST', body: { number: number, replace: replace } }); };
        send(false).then(function (r) { var d = r.d; if (d.needsReplace) return EH.confirm({ title: 'You entered a different number', text: 'This account already has +' + d.current + ' linked. Continue with +' + number + '? Then +' + d.current + ' is unlinked.', ok: 'Yes, use +' + number }).then(function (y) { return y ? send(true) : null; }); return r; }).then(function (r) {
          btn.classList.remove('busy'); if (!r) return; if (!r.d.success) return EH.toast(r.d.error || 'Failed', 'er'); EH.toast(r.d.premium ? 'Number linked — Premium is active on your account 👑' : 'Number linked ✓', 'ok'); EH.refreshUser(); });
      };
    }
  }

  /* ───── cover photo: crop to a wide banner, upload / remove (same API as the site) ───── */
  function coverBlob(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url); var W = 960, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H;
        var r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
        c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('x')); }, 'image/jpeg', 0.72);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('x')); };
      img.src = url;
    });
  }
  function coverSheet() {
    var u = EH.user; if (!u) return;
    var s = EH.sheet({ title: 'Cover photo', html: '<div class="sub" style="margin-bottom:12px">The wide picture at the top of your profile. Any photo works — it is cropped to a banner for you.</div><div class="grp">' +
      '<label class="row tap"><div class="ri" style="--a:#60a5fa;--b:#2563eb">' + ic('image') + '</div><div class="rt"><b>' + (u.hasCover ? 'Change cover photo' : 'Upload cover photo') + '</b><small>Choose a picture from your phone</small></div>' + ic('chevR', 'chev') + '<input type="file" accept="image/*" data-cf hidden></label>' +
      (u.hasCover ? '<div class="row tap" data-rm><div class="ri" style="--a:#f87171;--b:#dc2626">' + ic('trash') + '</div><div class="rt"><b class="err">Remove cover photo</b><small>Go back to the colour banner</small></div></div>' : '') + '</div>' });
    var inp = $('[data-cf]', s.el);
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return; s.close(); EH.toast('Uploading cover…');
      coverBlob(f).then(function (blob) {
        var fd = new FormData(); fd.append('cover', blob, 'cover.jpg');
        return EH.api('/api/profile/cover', { method: 'POST', body: fd, timeout: 60000 }).then(function (r) {
          if (!r.d.success) return EH.toast(r.d.error || 'Upload failed', 'er');
          u.hasCover = true; u.coverAt = r.d.coverAt; EH.setUser(u); EH.toast('Cover updated!', 'ok');
        });
      }, function () { EH.toast('That picture could not be read — try a JPG or PNG', 'er'); });
    };
    var rm = $('[data-rm]', s.el); if (rm) rm.onclick = function () {
      s.close(); EH.confirm({ title: 'Remove your cover photo?', text: 'Your profile goes back to the colour banner.', ok: 'Remove', danger: true }).then(function (y) {
        if (!y) return; EH.api('/api/profile/cover/remove', { method: 'POST', body: {} }).then(function (r) { if (!r.d.success) return EH.toast(r.d.error || 'Failed', 'er'); u.hasCover = false; u.coverAt = 0; EH.setUser(u); EH.toast('Cover removed', 'ok'); });
      });
    };
  }

  /* full-width profile header: cover, round photo, then the name UNDER the cover */
  function head(u, o) {
    var cv = u.hasCover ? ' style="background-image:url(\'/api/users/' + encodeURIComponent(u.username) + '/cover?v=' + (u.coverAt || 0) + '\')"' : '';
    return '<div class="pf-cover' + (u.hasCover ? ' has' : '') + '"' + cv + '>' + (o.ctl || '') + '</div>' +
      '<div class="pf-idrow">' + (o.self ? '<div class="pf-av tap" data-pv>' + EH.avatar(u, 'lg') + '<label class="pf-cam tap" data-nopv>' + ic('camera') + '<input type="file" accept="image/*" data-photo hidden></label></div>' : '<div class="pf-av tap" data-pv>' + EH.avatar(u, 'lg') + '</div>') + (o.side || '') + '</div>' +
      '<div class="pf-info"><div class="pf-nm"><span>' + esc(nameOf(u)) + '</span>' + EH.badges(Object.assign({}, u, { isPremium: u.isPremium || !!u.proPlan }), 18) + '</div><div class="sub">@' + esc(u.username) + (o.sub || '') + '</div>' +
      (u.bio ? '<div class="pf-bio">' + esc(u.bio) + '</div>' : (o.self ? '<div class="pf-bio" style="color:var(--t2)">No bio yet. Tap Edit profile to add one.</div>' : '')) + '</div>';
  }
  function sig(u) {
    if (!u) return 'guest'; var b = EH.botSpaces ? EH.botSpaces() : {};
    return [u.username, u.firstName, u.lastName, u.photo && u.photo.length, u.bio, u.coins, u.hideBalance, u.isPremium, u.verified, u.isAdmin, u.accentColor, u.hasCover, u.coverAt, b.total, b.used, u.referralCount, u.unreadNotifs, u.boundNumber, u.hideFollowing, u.hideLastActive, u.scheduledDeletionAt, u.canSpin, EH.theme()].join('|');
  }

  /* ───── Profile tab (full screen, no card around it) ───── */
  EH.screen('profile', { tab: true, mount: function (scr) {
    scr.innerHTML = '<div class="body pfb tabpad"></div>'; var body = $('.body', scr), first = true, last = '';
    function guest() {
      body.innerHTML = '<div class="pf-guest"><h1 class="h1" style="font-size:28px">Profile</h1></div><div class="pf-pad"><div class="card" style="text-align:center;padding:26px 18px"><img src="/logo.png" alt="" style="width:84px;height:84px;border-radius:50%;margin:0 auto 14px"><div class="h1" style="font-size:24px">Join KINGMD V4</div><div class="sub" style="margin:8px 0 18px">Sign in to get more bot spaces, EH coins, daily spins, the community chat and your own profile.</div><button class="btn block tap" data-login>' + ic('user') + ' Sign in or create account</button></div>' +
        '<div class="sec"><h3>Appearance</h3></div>' + appearance(null) + '<div class="sec"><h3>More</h3></div><div class="grp">' + links() + '</div></div>';
      wireTheme();
    }
    function links() {
      var r = function (go, icn, a, b, t, s) { return '<div class="row tap" data-go="' + go + '"><div class="ri" style="--a:' + a + ';--b:' + b + '">' + ic(icn) + '</div><div class="rt"><b>' + t + '</b><small>' + s + '</small></div>' + ic('chevR', 'chev') + '</div>'; };
      return r('terms', 'doc', '#94a3b8', '#475569', 'Terms & Conditions', 'How KINGMD V4 works') + r('privacy', 'shield', '#94a3b8', '#475569', 'Privacy Policy', 'What we collect and why') + r('faq', 'help', '#94a3b8', '#475569', 'FAQ', 'Answers to common questions') + r('changelog', 'clock', '#94a3b8', '#475569', 'Change Log', 'Every update to KINGMD V4');
    }
    function appearance(u) {
      var sw = u ? Object.keys(EH.ACCENTS).map(function (k) { var prem = k === 'gold' || k === 'aurora', bg = k === 'aurora' ? 'linear-gradient(135deg,#7c3aed,#db2777 55%,#f59e0b)' : k === 'gold' ? 'linear-gradient(135deg,#b8860b,#ffe27a 50%,#f0b429)' : EH.ACCENTS[k];
        return '<button type="button" class="swatch tap' + (EH.accent() === k ? ' on' : '') + (prem && !u.isPremium ? ' lock' : '') + '" data-ac="' + k + '" style="background:' + bg + '" aria-label="' + k + '">' + (prem && !u.isPremium ? ic('lock') : ic('check')) + '</button>'; }).join('') : '';
      return '<div class="card"><div class="seg" data-theme><button data-th="dark" class="' + (EH.theme() === 'dark' ? 'on' : '') + '">Dark</button><button data-th="light" class="' + (EH.theme() === 'light' ? 'on' : '') + '">Light</button></div>' + (u ? '<div class="pf-t" style="margin:16px 0 4px">' + ic('sparkles') + ' App colour</div><div class="swatches">' + sw + '</div>' : '') + '</div>';
    }
    function wireTheme() { $$('[data-th]', body).forEach(function (b) { b.onclick = function () { EH.setTheme(b.dataset.th); $$('[data-th]', body).forEach(function (x) { x.classList.toggle('on', x === b); }); }; }); }

    function paint() {
      var u = EH.user; last = sig(u); if (!u) { guest(); first = false; return; }
      var keep = body.scrollTop, b = EH.botSpaces ? EH.botSpaces() : { total: u.botSpaces, used: u.usedSpaces }, an = first ? ' rise' : '';
      var prog = ((u.referralCount || 0) % 5) / 5 * 100, refLink = location.origin + '?ref=' + u.referralId, pending = u.scheduledDeletionAt ? Date.parse(u.scheduledDeletionAt) : 0;
      body.innerHTML =
        head(u, { self: true, ctl: '<div class="pf-ctl"><button class="pf-cb tap" data-go="users" aria-label="Find users">' + ic('search') + '</button><button class="pf-cb tap" data-go="notifs" aria-label="Notifications">' + ic('bell') + (u.unreadNotifs > 0 ? '<i class="dot"></i>' : '') + '</button></div><button class="pf-cedit tap" data-cover>' + ic('camera') + ' ' + (u.hasCover ? 'Edit cover' : 'Add cover') + '</button>',
          side: '<button class="btn alt sm tap" data-edit>' + ic('edit') + ' Edit profile</button>' }) +
        '<div class="pf-stats"><div class="tap" data-fl="followers"><b data-fo>–</b><span>Followers</span></div><div class="tap" data-fl="following"><b data-fg>–</b><span>Following</span></div><div><b data-lk>–</b><span>Likes</span></div></div>' +
        '<div class="pf-pad">' +
        '<div class="card pf-coins' + an + '" style="--i:1"><div class="pc-top"><span class="coin lg">EH</span><div><small>EH COINS</small><b data-bal>' + EH.bal(u.coins) + '</b></div><button class="ibtn tap" data-eye aria-label="Hide balance">' + ic(u.hideBalance ? 'eyeoff' : 'eye') + '</button></div>' +
          '<div class="btns" style="margin-top:14px"><button class="btn sm tap" data-buy>' + ic('plus') + ' Buy</button><button class="btn sm alt tap" data-gift>' + ic('gift') + ' Gift</button><button class="btn sm alt tap" data-redeem>' + ic('hash') + ' Redeem</button></div></div>' +
        '<div class="grp' + an + '" style="--i:2;margin-top:14px">' +
          '<div class="row tap" data-go="deploy"><div class="ri" style="--a:#34d399;--b:#059669">' + ic('robot') + '</div><div class="rt"><b>My bots</b><small>' + b.used + ' of ' + b.total + ' bot spaces used · ' + (u.referralCount || 0) + ' referrals</small></div>' + ic('chevR', 'chev') + '</div>' +
          '<div class="row tap" data-go="spin"><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic('gift') + '</div><div class="rt"><b>Daily Spin &amp; Tasks</b><small>' + (u.canSpin ? 'Your daily spin is ready!' : 'Earn free coins every day') + '</small></div>' + ic('chevR', 'chev') + '</div>' +
          '<div class="row tap" data-premium><div class="ri" style="--a:#ffe9a3;--b:#d99a00;color:#3a2600">' + ic('crown') + '</div><div class="rt"><b>' + (u.isPremium ? 'My Premium' : 'Upgrade to Premium') + '</b><small>' + (u.isPremium ? 'Membership card, usage and renewal' : 'No ads, 6 bot spaces, your own bot name') + '</small></div>' + ic('chevR', 'chev') + '</div>' +
          '<div class="row tap" data-go="notifs"><div class="ri" style="--a:#60a5fa;--b:#2563eb">' + ic('bell') + '</div><div class="rt"><b>Notifications</b><small>' + (u.unreadNotifs > 0 ? u.unreadNotifs + ' unread' : 'You are all caught up') + '</small></div>' + ic('chevR', 'chev') + '</div>' +
          '<div class="row tap" data-aks><div class="ri" style="--a:#c084fc;--b:#7c3aed">' + ic('key') + '</div><div class="rt"><b>API keys</b><small>Create and manage your keys</small></div>' + ic('chevR', 'chev') + '</div>' +
          (u.isAdmin ? '<div class="row tap" data-admin><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic('shield') + '</div><div class="rt"><b>Admin panel</b><small>Users, servers, payments and settings</small></div>' + ic('chevR', 'chev') + '</div>' : '') + '</div>' +
        '<div class="card' + an + '" style="--i:3;margin-top:14px"><div class="pf-t">' + ic('link') + ' Bot number</div><div data-num></div></div>' +
        '<div class="card' + an + '" style="--i:4;margin-top:14px"><div class="pf-t">' + ic('gift') + ' Invite friends</div><div class="sub" style="margin-bottom:10px">Every 5 referrals = +1 bot space. <b>' + ((u.referralCount || 0) % 5) + '/5</b> to the next one.</div><div class="pbar"><i style="width:' + prog + '%;background:linear-gradient(90deg,var(--p),var(--p2))"></i></div><div class="pf-ref" data-ref>' + esc(refLink) + '</div><button class="btn alt block tap" data-copyref>' + ic('copy') + ' Copy invite link</button></div>' +
        '<div class="sec"><h3>Appearance</h3></div>' + appearance(u) +
        '<div class="grp" style="margin-top:14px"><div class="row"><div class="rt"><b>Hide who I follow</b><small>Other users can\'t see your Following list</small></div><label class="sw"><input type="checkbox" data-pv="hideFollowing"' + (u.hideFollowing ? ' checked' : '') + '><i></i></label></div>' +
          '<div class="row"><div class="rt"><b>Hide my last active status</b><small>Other users can\'t see when you were online</small></div><label class="sw"><input type="checkbox" data-pv="hideLastActive"' + (u.hideLastActive ? ' checked' : '') + '><i></i></label></div></div>' +
        '<div class="sec"><h3>More</h3></div><div class="grp">' + links() + '</div>' +
        EH.adCard() +
        '<div class="btns" style="margin-top:22px"><button class="btn alt tap" data-logout>' + ic('logout') + ' Log out</button></div>' +
        '<div class="grp" style="margin-top:22px;border-color:rgba(239,68,68,.3)"><div class="row"><div class="rt"><b class="err">Delete my account</b><small data-delsub>' + (pending ? 'Your account will be permanently deleted on ' + EH.date(pending) + '.' : 'Permanently delete your account and all its data (7-day grace period).') + '</small></div><button class="btn danger sm tap" data-del>' + (pending ? 'Cancel deletion' : 'Delete') + '</button></div></div></div>';
      body.scrollTop = keep; first = false; wire(u); EH.mountAds(scr);
      EH.api('/api/users/' + encodeURIComponent(u.username), { auth: false }).then(function (r) { var d = r.d; if (d && d.success) { var q = function (s, v) { var e = $(s, body); if (e) e.textContent = EH.fmt(v); }; q('[data-fo]', d.user.followersCount); q('[data-fg]', d.user.followingCount); q('[data-lk]', d.user.likesCount); } });
    }
    function wire(u) {
      var on = function (s, fn) { var e = $(s, body); if (e) e.addEventListener('click', fn); };
      on('[data-pv]', function (e) { if (e.target.closest('[data-nopv]')) return; if (u.photo) EH.viewImg(u.photo); else if (u.self !== false && $('[data-photo]', body)) $('[data-photo]', body).click(); });
      on('.pf-cover', function (e) { if (e.target.closest('button,a,.pf-ctl')) return; if (u.hasCover) EH.viewImg('/api/users/' + encodeURIComponent(u.username) + '/cover?v=' + (u.coverAt || 0)); });
      on('[data-edit]', editProfile); on('[data-cover]', coverSheet); on('[data-buy]', EH.openBuyCoins); on('[data-gift]', function () { EH.openGift(); }); on('[data-redeem]', EH.openRedeem); on('[data-aks]', apiKeys);
      on('[data-copyref]', function () { EH.copy(location.origin + '?ref=' + u.referralId, 'Invite link copied!'); });
      on('[data-logout]', function () { EH.confirm({ title: 'Log out?', text: 'You can sign back in any time.', ok: 'Log out' }).then(function (y) { if (y) EH.logout(); }); });
      $$('[data-fl]', body).forEach(function (e) { e.onclick = function () { followList(u.username, e.dataset.fl); }; });
      numberCard($('[data-num]', body)); wireTheme();
      var ph = $('[data-photo]', body); if (ph) ph.onchange = function () { if (!ph.files[0]) return; EH.toast('Uploading photo…'); var fd = new FormData(); fd.append('photo', ph.files[0]); EH.api('/api/profile/photo', { method: 'POST', body: fd, timeout: 60000 }).then(function (r) { if (r.d.success) { u.photo = r.d.photo; EH.setUser(u); EH.toast('Photo updated!', 'ok'); } else EH.toast(r.d.error || 'Upload failed', 'er'); }); };
      $$('[data-ac]', body).forEach(function (b) { b.onclick = function () { var k = b.dataset.ac; if ((k === 'gold' || k === 'aurora') && !u.isPremium) return EH.openPremium();
        EH.ls.set('eh_accent', k); u.accentColor = k; EH.setUser(u); EH.api('/api/profile/accent', { method: 'POST', body: { accentColor: k } }).then(function (r) { if (!r.d.success) EH.toast(r.d.error || 'Failed to save colour', 'er'); }); }; });
      $$('[data-pv]', body).forEach(function (c) { c.onchange = function () { var o = {}; o[c.dataset.pv] = c.checked; EH.api('/api/profile/privacy', { method: 'POST', body: o }).then(function (r) { if (r.d.success) { u[c.dataset.pv] = c.checked; EH.setUser(u); EH.toast(c.checked ? 'Hidden' : 'Visible to everyone', 'ok'); } else { c.checked = !c.checked; EH.toast(r.d.error || 'Failed', 'er'); } }); }; });
      on('[data-del]', function () {
        if (u.scheduledDeletionAt) return EH.confirm({ title: 'Cancel the deletion?', text: 'Your account will be kept.', ok: 'Keep my account' }).then(function (y) { if (y) EH.api('/api/profile/delete-cancel', { method: 'POST', body: {} }).then(function (r) { if (r.d.success) { EH.toast('Account deletion cancelled', 'ok'); EH.refreshUser(); } else EH.toast(r.d.error || 'Failed', 'er'); }); });
        var want = 'DELETE ' + u.username + ' ACCOUNT', s = EH.sheet({ title: 'Delete my account', html: '<div class="sub" style="margin-bottom:12px">Your account and all its data will be permanently deleted after 7 days. You can cancel any time before then.</div><label class="fld"><span>Type <b style="color:var(--tx)">' + esc(want) + '</b> to confirm</span><input class="inp" data-c placeholder="' + esc(want) + '" autocapitalize="characters" autocomplete="off"></label><button class="btn danger block tap" data-go>' + ic('trash') + ' Delete my account</button>' });
        $('[data-go]', s.el).onclick = function (e) { var b = e.currentTarget; b.classList.add('busy'); EH.api('/api/profile/delete-request', { method: 'POST', body: { confirm: $('[data-c]', s.el).value.trim() } }).then(function (r) { b.classList.remove('busy'); if (r.d.success) { s.close(); EH.toast('Account deletion scheduled. You can cancel within 7 days.', 'ok'); EH.refreshUser(); } else EH.toast(r.d.error || 'Failed', 'er'); }); };
      });
    }
    /* repaint only when something this page shows really changed (no flash, no replayed animation) */
    function again() { if (document.activeElement && body.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; if (sig(EH.user) !== last) paint(); }
    paint(); var off = EH.on('user', again), off2 = EH.on('logout', paint);
    EH.ptr(scr, body, function () { return EH.refreshUser(); });
    return { show: function () { if (EH.token) EH.refreshUser(); EH.syncBots && EH.syncBots().then(again); }, destroy: function () { off(); off2(); } };
  } });

  /* ───── find users + someone else's profile ───── */
  EH.screen('users', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Find users' }), body = f.body, tm;
    body.innerHTML = '<div class="inwrap"><span class="pre">' + ic('search') + '</span><input class="inp" data-q placeholder="Search by username" autocapitalize="none" autocomplete="off"></div><div data-res style="margin-top:14px"><div class="empty"><div class="ei">' + ic('search') + '</div><b>Find people</b><p>Type at least 2 letters of a username.</p></div></div>';
    var q = $('[data-q]', body), res = $('[data-res]', body);
    q.oninput = function () { clearTimeout(tm); var v = q.value.trim(); if (v.length < 2) return; res.innerHTML = '<div class="spinner"></div>';
      tm = setTimeout(function () { EH.api('/api/users/search?q=' + encodeURIComponent(v), { auth: false }).then(function (r) { var d = r.d; if (!d.success) { res.innerHTML = '<div class="empty"><b>' + esc(d.error || 'Search failed') + '</b></div>'; return; } if (!d.users || !d.users.length) { res.innerHTML = '<div class="empty"><b>No users found</b></div>'; return; }
        res.innerHTML = '<div class="grp">' + d.users.map(function (u) { return '<div class="row tap" data-u="' + esc(u.username) + '">' + EH.avatar(u, '') + '<div class="rt"><b>' + esc(nameOf(u)) + ' ' + EH.badges(u, 14) + '</b><small>@' + esc(u.username) + '</small></div>' + ic('chevR', 'chev') + '</div>'; }).join('') + '</div>';
        $$('[data-u]', res).forEach(function (e) { e.onclick = function () { EH.go('user/' + e.dataset.u); }; }); }); }, 380); };
    setTimeout(function () { q.focus(); }, 380); return {};
  } });
  EH.screen('user', { mount: function (scr, name) {
    var f = EH.frame(scr, { bar: 'push', title: '@' + name }), body = f.body; body.classList.add('pfb'); body.innerHTML = '<div class="skb" style="height:150px;border-radius:0"></div><div class="skb" style="height:80px;margin:14px 16px"></div>';
    function load() {
      EH.api('/api/users/' + encodeURIComponent(name), { auth: !!EH.token }).then(function (r) {
        var d = r.d; if (!d.success) { body.innerHTML = '<div class="empty"><div class="ei">' + ic('user') + '</div><b>' + esc(d.error || 'User not found') + '</b></div>'; return; } var u = d.user;
        var stat = function (n, l, k) { return '<div' + (k ? ' class="tap" data-fl="' + k + '"' : '') + '><b>' + EH.fmt(n) + '</b><span>' + l + '</span></div>'; };
        body.innerHTML = head(u, { self: false, sub: u.active ? ' · <span class="okc">Active now</span>' : '' }) +
          (u.isSelf ? '' : '<div class="pf-pad"><div class="btns" style="margin:14px 0 4px"><button class="btn tap ' + (u.isFollowing ? 'alt' : '') + '" data-follow style="flex:2">' + ic(u.isFollowing ? 'check' : 'plus') + ' ' + (u.isFollowing ? 'Following' : 'Follow') + '</button><button class="btn alt tap" data-like aria-label="Like" style="' + (u.likedByMe ? 'color:var(--p)' : '') + '">' + ic('heart') + '</button><button class="btn alt tap" data-gift aria-label="Gift">' + ic('gift') + '</button></div></div>') +
          '<div class="pf-stats">' + stat(u.followersCount, 'Followers', 'followers') + (u.hideFollowing && !u.isSelf ? '' : stat(u.followingCount, 'Following', 'following')) + stat(u.likesCount, 'Likes') + stat(u.botCount, u.botCount === 1 ? 'Bot' : 'Bots') + '</div>' +
          '<div class="pf-pad"><div class="grp" style="margin-top:14px"><div class="row"><div class="ri" style="--a:#c084fc;--b:#7c3aed">' + ic('cal') + '</div><div class="rt"><small>Joined</small><b>' + EH.date(u.createdAt) + '</b></div></div>' + (u.lastActiveText ? '<div class="row"><div class="ri" style="--a:#60a5fa;--b:#2563eb">' + ic('clock') + '</div><div class="rt"><small>Last seen</small><b>' + (u.active ? 'Active now' : esc(u.lastActiveText)) + '</b></div></div>' : '') + '</div></div>';
        $$('[data-fl]', body).forEach(function (e) { e.onclick = function () { followList(u.username, e.dataset.fl); }; });
        var fo = $('[data-follow]', body); if (fo) fo.onclick = function () { if (EH.needLogin('Sign in to follow people.')) return; EH.api('/api/users/' + encodeURIComponent(u.username) + '/follow', { method: 'POST', body: {} }).then(function (r) { if (r.d.success) load(); else EH.toast(r.d.error || 'Failed', 'er'); }); };
        var lk = $('[data-like]', body); if (lk) lk.onclick = function () { if (EH.needLogin('Sign in to like profiles.')) return; EH.api('/api/users/' + encodeURIComponent(u.username) + '/like', { method: 'POST', body: {} }).then(function (r) { if (r.d.success) load(); else EH.toast(r.d.error || 'Failed', 'er'); }); };
        var gf = $('[data-gift]', body); if (gf) gf.onclick = function () { EH.openGift(u.username); };
        var pv = $('[data-pv]', body); if (pv) pv.addEventListener('click', function () { if (u.photo) EH.viewImg(u.photo); });
        var cv = $('.pf-cover', body); if (cv) cv.addEventListener('click', function () { if (u.hasCover) EH.viewImg('/api/users/' + encodeURIComponent(u.username) + '/cover?v=' + (u.coverAt || 0)); });
      });
    }
    load(); return {};
  } });
})();
