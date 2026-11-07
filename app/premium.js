/* Premium: the button-on-top sheet (membership card), pay sheet, refill sheet and the Premium perks screen */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;

  var PERKS = [
    ['heart', 'Get 10 free Channel Reacts every day', 'React to any WhatsApp channel post for free, only 1 minute apart. Free accounts only get a small daily limit. After your 10, each react costs 1 coin.'],
    ['poll', 'Get 5 free Poll Votes every day', 'Vote on any WhatsApp channel poll for free, only 1 minute apart. After your 5, each vote costs 1 coin.'],
    ['sparkles', 'Auto-react to your own channel posts', 'Add your channel once and pick up to 5 emojis. Every new post you make gets reactions by itself. Up to 3 channels.'],
    ['shield', 'No ads', 'Premium accounts never see ads, on any page.'],
    ['robot', 'Get 6 bot spaces instead of 3', 'Pair twice as many bots on your account while Premium lasts.'],
    ['phone', 'Log in on 3 devices at once', 'A free account can be logged in on only 1 device. With Premium, the same account stays logged in on 3 devices at the same time.'],
    ['edit', 'Change your bot name', 'Your bot shows your own name in the menu, ping and replies.'],
    ['image', 'Change your bot profile picture', 'Set the picture your bot shows on the menu, ping and results.'],
    ['user', 'Change your bot owner name', 'Your name shows as the owner in the menu, and nobody sees EMMYHENZ links or credits there.'],
    ['chat', 'Add your own channel to your bot', 'The "View channel" button on your bot\'s replies opens your channel.'],
    ['doc', 'Remove the EmmyHenz watermark', 'Hide the heading at the top and the credit at the bottom of your bot\'s replies.'],
    ['smile', 'Write your own welcome and goodbye messages', 'Choose what your bot says when someone joins or leaves a group.'],
    ['phone', 'Write your own anti-call message', 'Choose what people get when they call your bot number while anti-call is on.'],
    ['hash', 'Teach your bot replies', 'Pick a word and a reply. When someone says that word, your bot answers by itself.'],
    ['reply', 'Auto-reply when people message you', 'Set a message and your bot answers everyone who messages you once.'],
    ['clock', 'Away mode and scheduled messages', 'Tell people you are away, or send a message later at the time you choose.'],
    ['smile', 'Give the AI chatbot a personality', 'Describe who the AI chatbot should be and it talks that way.'],
    ['eye', 'Ghost mode', 'Turns your WhatsApp read receipts off. Read messages without blue ticks.'],
    ['lock', 'Make your bot fully private', 'In private mode nobody else can use your bot, not even .ping.'],
    ['trend', 'See who uses your bot', 'See every command used on your bot in the last hour: who ran it, where and when.'],
    ['bolt', 'Faster premium servers', 'Premium bots run on premium servers with fewer bots on each, so replies come faster.'],
    ['key', 'Get 5 API keys instead of 3', 'Use our APIs in your own projects with up to 5 keys.'],
    ['gem', 'Premium colours and gold badge', 'Make the whole app Aurora or Gold, and show a gold P badge next to your name.'],
    ['refresh', 'Refill your free reacts and votes', 'Used up today\'s free reacts or votes? Pay a small amount to have them full again.'],
    ['gift', 'Get 5 bonus coins', 'A one-time gift of 5 coins the first time your account goes Premium.']
  ];
  EH.PERKS = PERKS;
  var perkRow = function (p) { return '<div class="row"><div class="ri" style="--a:#ffe9a3;--b:#d99a00;color:#3a2600">' + ic(p[0]) + '</div><div class="rt"><b>' + esc(p[1]) + '</b><small>' + esc(p[2]) + '</small></div></div>'; };

  /* ───── the sheet behind the gold button ───── */
  EH.openPremium = function () {
    var s = EH.sheet({ title: 'Premium', full: false, html: '<div class="skb" style="height:178px;border-radius:24px"></div><div class="skb" style="height:62px;margin-top:14px"></div><div class="skb" style="height:54px;margin-top:14px"></div>' });
    var box = s.el;
    if (!EH.token) {
      box.innerHTML = freeCard(null) + '<div class="note" style="text-align:center;margin:12px 0 14px">Sign in to see your Premium or get it.</div><button class="btn gold block tap" data-login>' + ic('crown') + ' Sign in</button>' +
        '<button class="btn alt block tap" style="margin-top:10px" data-allperks>' + ic('gem') + ' All Premium perks</button>';
      wire(box, s); return s;
    }
    var shown = '';
    var draw = function (d) {
      shown = JSON.stringify(d);
      if (!d.premium) {
        box.innerHTML = freeCard(d) + '<div class="note" style="text-align:center;margin:12px 0 14px">10 free Channel Reacts and 5 free Poll Votes every day, your own bot name and picture, no ads, and much more.</div>' +
          '<button class="btn gold block tap" data-pay>' + ic('crown') + ' Get Premium</button><button class="btn alt block tap" style="margin-top:10px" data-allperks>' + ic('gem') + ' All Premium perks</button>';
      } else {
        var exp = new Date(d.until), valid = ('0' + (exp.getMonth() + 1)).slice(-2) + '/' + String(exp.getFullYear()).slice(-2);
        var total = Math.max(1, Math.round((Date.parse(d.until) - Date.parse(d.since)) / 86400000)), pct = Math.max(4, Math.min(100, Math.round(d.daysLeft / total * 100)));
        var tile = function (icn, label, o) { var left = Math.max(0, o.limit - o.used); return '<div class="ptile"><div class="t">' + ic(icn) + label + '</div><div class="n">' + left + '<span> / ' + o.limit + ' left</span></div><div class="pbar"><i style="width:' + Math.round(left / o.limit * 100) + '%"></i></div></div>'; };
        var used = d.react.used >= d.react.limit || d.vote.used >= d.vote.limit;
        box.innerHTML = '<div class="mcard"><div class="mc-top"><span>EMMYHENZ V4</span><b class="mc-tag">PREMIUM</b></div><div class="mc-sim"></div><div class="mc-name">' + esc(d.name || '') + '</div>' +
          '<div class="mc-bot"><div><small>MEMBER</small><b>' + esc(d.memberId || '') + '</b></div><div style="text-align:right"><small>VALID THRU</small><b>' + valid + '</b></div></div></div>' +
          '<div class="card" style="margin-top:14px"><div class="ptime"><span>Premium ends ' + EH.date(d.until) + '</span><b>' + d.daysLeft + ' day' + (d.daysLeft === 1 ? '' : 's') + ' left</b></div><div class="pbar"><i style="width:' + pct + '%"></i></div></div>' +
          '<div class="ptiles">' + tile('heart', 'Channel Reacts', d.react) + tile('poll', 'Poll Votes', d.vote) + '</div>' +
          '<div class="grp" style="margin-top:14px"><div class="row"><div class="rt"><small>Premium bot number</small><b>' + (d.number ? '+' + esc(d.number) : '—') + '</b></div></div><div class="row"><div class="rt"><small>Free uses reset in</small><b>' + resetIn(Date.parse(d.resetAt)) + '</b></div></div></div>' +
          (used ? '<button class="btn alt block tap" style="margin-top:14px" data-refill>' + ic('refresh') + ' Refill free uses — ₦' + Number(d.refillPrice || EH.refillPrice || 0).toLocaleString() + '</button>' : '') +
          '<button class="btn gold block tap" style="margin-top:14px" data-pay>' + ic('refresh') + ' Renew Premium</button>' +
          '<div class="note" style="text-align:center">Starts after your current Premium ends on ' + EH.date(d.until) + ' — you don\'t lose any days.</div>' +
          '<button class="btn alt block tap" style="margin-top:12px" data-allperks>' + ic('gem') + ' All Premium perks</button>';
      }
      wire(box, s);
    };
    if (EH.premCache && EH.premCache.u === EH.token && Date.now() - EH.premCache.at < 300000) draw(EH.premCache.d);   // show the last answer at once, then refresh it quietly (no blank flash)
    EH.api('/api/premium/overview').then(function (r) {
      var d = r.d || {};
      if (!r.ok || !d.success) { if (!shown) box.innerHTML = '<div class="empty"><b>Could not load Premium</b><p>Check your connection and try again.</p></div>'; return; }
      if (d.refillPrice) EH.refillPrice = d.refillPrice;
      EH.premCache = { d: d, at: Date.now(), u: EH.token };
      if (JSON.stringify(d) !== shown) draw(d);
    });
    return s;
  };
  function resetIn(t) { var ms = Math.max(60000, t - Date.now()), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h ? h + 'h ' + m + 'm' : m + ' min'; }
  function freeCard(d) {
    return '<div class="mcard off"><div class="mc-top"><span>EMMYHENZ V4</span><b class="mc-tag">FREE</b></div><div class="mc-sim"></div><div class="mc-name">' + esc((d && d.name) || (EH.user && EH.user.username) || 'Guest') + '</div>' +
      '<div class="mc-bot"><div><small>MEMBER</small><b>' + esc((d && d.memberId) || '—') + '</b></div><div style="text-align:right"><small>PLAN</small><b>FREE</b></div></div></div>';
  }
  function wire(box, s) {
    var on = function (sel, fn) { var e = $(sel, box); if (e) e.addEventListener('click', fn); };
    on('[data-pay]', function () { s.close(); EH.openPremPay(); });
    on('[data-refill]', function () { s.close(); EH.openRefill(); });
    on('[data-allperks]', function () { s.close(); EH.go('premium'); });
    on('[data-login]', function () { s.close(); EH.login('Sign in to see your Premium or get it.'); });
  }

  /* ───── pay for Premium (Korapay hosted checkout, same as the site) ───── */
  var guess = function () { var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {} return { 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'CI', 'Africa/Douala': 'CM', 'Africa/Cairo': 'EG' }[tz] || 'XX'; };
  /* EH.openPremPay()                      -> Premium for your own account / linked number
     EH.openPremPay({ number, bot: true })  -> upgrade THAT bot number only (from Bot Settings): the number is filled in and locked,
                                              the payment never links it to your account (bind:false) */
  EH.openPremPay = function (o) {
    o = o || {}; var botNum = o.bot ? String(o.number || '').replace(/\D/g, '') : '';
    if (EH.needLogin('Sign in to get Premium.')) return;
    var s = EH.sheet({ title: botNum ? 'Upgrade +' + botNum : 'Get Premium', html: '<div class="spinner"></div>' }), box = s.el;
    EH.api('/api/premium/pay-info').then(function (r) {
      var d = r.d || {};
      if (!r.ok || !d.success) { s.close(); EH.toast('Could not open payment — try again', 'er'); return; }
      var st = { months: 1, gift: !!botNum, d: d }, renew = function () { return !st.gift && !!d.premiumUntil && Date.parse(d.premiumUntil) > Date.now(); };
      var live = d.options.filter(function (o) { return o.live; }), keep = guess(), first = (live[0] || d.options[0]).id, def = live.some(function (o) { return o.id === keep; }) ? keep : first;
      box.innerHTML =
        '<div class="sub" data-sub style="margin-bottom:14px"></div>' +
        (d.paymentsOff ? '<div class="card" style="border-color:rgba(245,158,11,.45);margin-bottom:14px;font-size:13px;color:#fbbf24">Payments are switched off for a moment. Please try again later.</div>' : '') +
        (botNum ? '<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="ri" style="--a:#34d399;--b:#059669">' + ic('robot') + '</div><div class="rt"><small style="display:block;font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--t2)">UPGRADING THIS BOT</small><b style="font-size:17px">+' + esc(botNum) + '</b></div></div>' : '') +
        '<label class="fld"' + (botNum ? ' hidden' : '') + '><span data-lbl>Bot number to make Premium</span><input class="inp" data-num inputmode="numeric" placeholder="e.g. 2349012345678" autocomplete="off"></label>' +
        '<label class="fld"><span>Country</span><select class="inp" data-cty>' + d.options.map(function (o) { return '<option value="' + esc(o.id) + '"' + (o.live ? '' : ' disabled') + '>' + o.flag + ' ' + esc(o.country) + ' — ' + (o.live ? esc(o.symbol) + o.month.toLocaleString() + '/month' : 'Coming soon') + '</option>'; }).join('') + '</select></label>' +
        '<div class="fld"><span>For how long</span><div class="seg" data-months>' + [1, 2].filter(function (n) { return n <= d.maxMonths; }).map(function (n) { return '<button type="button" data-n="' + n + '" class="' + (n === 1 ? 'on' : '') + '">' + n + ' month' + (n === 1 ? '' : 's') + '</button>'; }).join('') + '</div></div>' +
        '<div class="card" data-renew hidden style="margin-bottom:14px;font-size:13px;line-height:1.5"></div>' +
        '<div class="card" style="text-align:center;margin-bottom:14px"><div style="font-size:30px;font-weight:800" data-total></div><div class="sub" data-for></div><div class="note" data-methods></div></div>' +
        '<button class="btn gold block tap" data-go-pay>' + ic('lock') + ' <span data-paytxt>Pay securely</span></button>' +
        '<button class="btn ghost block tap" data-gift style="margin-top:8px"></button><div class="note" style="text-align:center" data-giftsub></div>';
      var num = $('[data-num]', box), cty = $('[data-cty]', box); num.value = botNum || String(o.prefill || '').replace(/\D/g, '') || d.number || ''; if (botNum) num.readOnly = true; cty.value = def;
      function ui() {
        var g = st.gift, rn = renew(), o = d.options.find(function (x) { return x.id === cty.value; }) || d.options[0], n = st.months;
        $('[data-sub]', box).textContent = botNum ? 'Only +' + botNum + ' gets Premium. Your own account stays exactly as it is.' : g ? 'Their number gets Premium. Nothing changes on your account.' : rn ? 'You are Premium. Renewing adds more time after your current Premium ends.' : 'Pay here and your Premium turns on by itself.';
        $('[data-lbl]', box).textContent = g ? 'Their WhatsApp number (with country code)' : rn ? 'Your Premium number' : 'Bot number to make Premium';
        num.readOnly = !!botNum || (rn && !!d.number); num.placeholder = g ? 'Their number, e.g. 2348012345678' : 'e.g. 2349012345678';
        $('[data-paytxt]', box).textContent = botNum ? 'Pay to upgrade +' + botNum : g ? 'Pay for their Premium' : rn ? 'Renew securely' : 'Pay securely';
        $('[data-gift]', box).textContent = g ? 'Buying for yourself instead?' : 'Buying for someone else?';
        $('[data-giftsub]', box).textContent = g ? 'Go back to paying for your own number.' : 'Pay for another person\'s number — it won\'t be linked to your account.';
        $('[data-gift]', box).hidden = !!botNum; $('[data-giftsub]', box).hidden = !!botNum;
        $('[data-total]', box).textContent = o.symbol + (o.month * n).toLocaleString();
        $('[data-for]', box).textContent = 'for ' + n + ' month' + (n === 1 ? '' : 's') + ' of Premium';
        var label = { card: 'Card', bank_transfer: 'Bank transfer', pay_with_bank: 'Pay with bank', mobile_money: 'Mobile money' };
        $('[data-methods]', box).textContent = 'Pay with: ' + (o.methods || []).map(function (m) { return label[m] || m; }).join(' · ');
        var rb = $('[data-renew]', box); rb.hidden = !rn;
        if (rn) { var from = new Date(d.premiumUntil), to = new Date(from.getTime() + n * 30 * 86400000);
          rb.innerHTML = '<b>Your Premium is active until ' + EH.date(from) + '.</b> Renewing now does not cut it short — the new time starts when this one ends.<div class="note">Renewal ends ' + EH.date(to) + '. It does not renew by itself after that.</div>'; }
      }
      $$('[data-months] button', box).forEach(function (b) { b.onclick = function () { st.months = Number(b.dataset.n); $$('[data-months] button', box).forEach(function (x) { x.classList.toggle('on', x === b); }); ui(); }; });
      cty.onchange = ui;
      $('[data-gift]', box).onclick = function () { if (botNum) return; st.gift = !st.gift; if (st.gift && d.number && num.value.replace(/\D/g, '') === d.number) num.value = ''; if (!st.gift && d.number) num.value = d.number; ui(); if (st.gift) setTimeout(function () { num.focus(); }, 200); };
      var pay = $('[data-go-pay]', box); if (d.paymentsOff) pay.disabled = true;
      pay.onclick = function () {
        var number = (num.value || '').replace(/\D/g, '');
        if (!number) return EH.toast(st.gift ? 'Enter their WhatsApp number with the country code' : 'Enter the bot number with the country code', 'er');
        if (number.charAt(0) === '0') return EH.toast(number.length === 11 ? 'Start with the country code instead of 0 — for Nigeria, ' + number + ' becomes 234' + number.slice(1) : 'Start with the country code, not 0 (for example 2348012345678)', 'er');
        if (number.length < 10 || number.length > 15) return EH.toast('That number looks wrong — type it with the country code, digits only (for example 2348012345678)', 'er');
        pay.classList.add('busy');
        var go = function (replace) { return EH.api('/api/premium/pay/initiate', { method: 'POST', body: { country: cty.value, months: st.months, number: number, bind: !st.gift, replace: replace, app: true } }); };
        go(false).then(function (r) {
          var x = r.d || {};
          if (x.needsReplace) {
            return EH.confirm({ title: 'You entered a different number', text: 'This account already has +' + x.current + ' linked, but you entered +' + number + '. Continue with +' + number + '? Then +' + x.current + ' is unlinked and +' + number + ' is linked.' + (x.currentPremium ? ' +' + x.current + ' is still Premium: your account stops being Premium on it.' : ''), ok: 'Yes, use +' + number }).then(function (yes) { return yes ? go(true) : null; });
          }
          return r;
        }).then(function (r) {
          if (!r) { pay.classList.remove('busy'); return; } var x = r.d || {};
          if (x.checkoutUrl) { location.href = x.checkoutUrl; return; }
          pay.classList.remove('busy'); EH.toast(x.error || 'Could not start the payment', x.comingSoon ? '' : 'er');
        });
      };
      ui();
    });
    return s;
  };

  /* ───── refill free uses (after a Premium account used up its daily react / vote) ───── */
  EH.openRefill = function (feature, resume) {
    if (EH.needLogin('Sign in first.')) return;
    var coins = (EH.user && EH.user.coins) || 0, price = Number(EH.refillPrice || 0);
    var s = EH.sheet({ title: 'Refill free uses', html:
      '<div class="sub" style="margin-bottom:14px">' + (feature === 'cv' ? 'You have used all your free Poll Votes for today.' : feature === 'cr' ? 'You have used all your free Channel Reacts for today.' : 'Your free uses for today are finished.') + '</div>' +
      '<div class="card" style="margin-bottom:14px;font-size:13.5px;line-height:1.5"><b>Refill</b> makes your daily Channel Reacts and Poll Votes free again, for today.</div>' +
      '<button class="btn gold block tap" data-rf>' + ic('refresh') + ' Refill usage' + (price ? ' — ₦' + price.toLocaleString() : '') + '</button>' +
      (feature ? '<button class="btn alt block tap" style="margin-top:10px" data-coin><span class="coin">EH</span> ' + (coins >= 1 ? 'Use coins instead (you have ' + coins + ')' : 'No coins — buy coins') + '</button>' : '') +
      '<div class="note" style="text-align:center">Or wait: your free uses come back by themselves at midnight UTC.</div>' });
    $('[data-rf]', s.el).onclick = function (e) {
      var b = e.currentTarget; b.classList.add('busy');
      EH.api('/api/premium/refill/initiate', { method: 'POST', body: { app: true } }).then(function (r) { var d = r.d || {}; if (d.checkoutUrl) { location.href = d.checkoutUrl; return; } b.classList.remove('busy'); EH.toast(d.error || 'Could not start the payment', d.comingSoon || d.paymentsOff ? '' : 'er'); });
    };
    var c = $('[data-coin]', s.el); if (c) c.onclick = function () { s.close(); if (coins < 1) { EH.openBuyCoins && EH.openBuyCoins(); return; } EH.ss.set('eh_rf_coins', new Date().toISOString().slice(0, 10)); if (resume) resume(); };
    return s;
  };

  /* ───── Premium perks screen ───── */
  EH.screen('premium', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Premium', sub: 'Everything Premium unlocks', icon: 'crown', ia: '#ffe9a3', ib: '#d99a00' }), b = f.body;
    var u = EH.user, isP = !!(u && u.isPremium);
    b.innerHTML = '<div class="card" style="text-align:center;background:linear-gradient(160deg,#2b1c05,#12100a);border-color:rgba(245,180,23,.4);color:#fff"><div class="pm-crown">' + ic('crown') + '</div><div class="h1" style="font-size:24px;margin-top:10px">' + (isP ? 'You are Premium' : 'Go Premium') + '</div><div class="sub" style="margin-top:6px">' + (isP ? 'Thank you! Here is everything you get.' : 'Skip every wait and make your bot truly yours.') + '</div>' +
      '<button class="btn gold block tap" style="margin-top:16px" data-pp>' + ic('crown') + (isP ? ' View my Premium' : ' Get Premium — ₦1,500/month') + '</button></div>' +
      '<div class="sec"><h3>What you get</h3></div><div class="grp">' + PERKS.map(perkRow).join('') + '</div>' + EH.adCard();
    $('[data-pp]', b).onclick = function () { if (isP) EH.openPremium(); else EH.openPremPay(); };
    EH.mountAds(scr); return {};
  } });
})();
