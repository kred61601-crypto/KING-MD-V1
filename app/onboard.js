/* Finish creating a new account inside the app (name, username, optional bot number, photo, colour) */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var COLORS = ['pink', 'blue', 'green', 'red', 'purple', 'orange'];

  EH.screen('welcome', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'title', title: 'Create your account', sub: 'Just a few details' }), b = f.body, tok = EH.onbToken, st = { unameOk: false, numOk: true, photo: 'none', file: null, accent: 'pink' }, tmU, tmN;
    if (!tok) { b.innerHTML = '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('user') + '</div><b>Sign in to continue</b><p>Create your account in one tap with Google or GitHub.</p><button class="btn tap" data-login style="margin-top:14px">' + ic('user') + ' Sign in</button></div>'; return {}; }
    b.innerHTML = '<div class="skb" style="height:90px"></div><div class="skb" style="height:60px;margin-top:14px"></div><div class="skb" style="height:60px;margin-top:14px"></div><div class="skb" style="height:60px;margin-top:14px"></div>';
    EH.api('/api/onboarding/info?token=' + encodeURIComponent(tok), { auth: false }).then(function (r) {
      var d = r.d || {};
      if (!d.success) { EH.onbToken = null; EH.toast(d.error || 'Your sign-up session expired. Please sign in again.', 'er'); EH.go('home', true); setTimeout(function () { EH.login(); }, 400); return; }
      st.photo = d.picture ? 'provider' : 'none'; paint(d);
    });

    function paint(d) {
      b.innerHTML =
        '<div class="bl-hero rise" style="padding-bottom:12px"><div class="bl-logo"><img src="/logo.png" alt=""></div><h2>Welcome to KINGMD V4</h2><p>Finish creating your account.</p><div class="chip" style="margin-top:10px;max-width:100%"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(d.email || '') + '</span></div></div>' +
        '<form data-form autocomplete="off">' +
        '<div class="btns"><label class="fld"><span>First name</span><input class="inp" data-f value="' + esc(d.suggestedFirstName || '') + '" placeholder="First name"></label><label class="fld"><span>Last name</span><input class="inp" data-l value="' + esc(d.suggestedLastName || '') + '" placeholder="Last name"></label></div>' +
        '<label class="fld"><span>Username</span><input class="inp" data-un maxlength="20" placeholder="3-20 letters, numbers or _" autocapitalize="none" autocomplete="off"></label><div class="note" data-us style="margin:-6px 4px 6px"></div><div class="chips" data-sug style="margin:0 2px 14px"></div>' +
        '<label class="fld"><span>Bot number (optional)</span><div class="inwrap"><span class="pre">' + ic('phone') + '</span><input class="inp" data-num type="tel" inputmode="numeric" placeholder="e.g. 2349012345678" autocomplete="off"></div></label><div class="note" data-ns style="margin:-6px 4px 4px">Link it now and Premium works on this account straight away if the number is Premium. You can unbind it any time from your profile.</div>' +
        '<div class="fld" style="margin-top:14px"><span>Profile picture (optional)</span><div class="opts" data-ph>' +
          (d.picture ? '<label class="opt tap"><input type="radio" name="ph" value="provider" checked><i></i><img src="' + esc(d.picture) + '" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover"><span>Use my ' + esc(d.provider || '') + ' photo</span></label>' : '') +
          '<label class="opt tap"><input type="radio" name="ph" value="upload"' + (d.picture ? '' : '') + '><i></i><span class="pv" style="width:34px;height:34px;border-radius:50%;background:var(--fill);display:flex;align-items:center;justify-content:center;flex:none;overflow:hidden">' + ic('camera') + '</span><span data-upl>Upload my own</span></label>' +
          '<label class="opt tap"><input type="radio" name="ph" value="none"' + (d.picture ? '' : ' checked') + '><i></i><span class="pv" style="width:34px;height:34px;border-radius:50%;background:var(--fill);display:flex;align-items:center;justify-content:center;flex:none">' + ic('user') + '</span><span>Skip for now</span></label></div>' +
          '<input type="file" accept="image/*" data-file hidden></div>' +
        '<div class="fld" style="margin-top:6px"><span>App colour (you can change it later)</span><div class="swatches" data-col>' + COLORS.map(function (k) { return '<button type="button" class="swatch tap' + (k === 'pink' ? ' on' : '') + '" data-c="' + k + '" style="background:' + EH.ACCENTS[k] + '" aria-label="' + k + '">' + ic('check') + '</button>'; }).join('') + '</div></div>' +
        '<button class="btn block tap" type="submit" data-go style="margin-top:22px">' + ic('check') + ' Create my account</button>' +
        '<div class="note" style="text-align:center">By continuing you accept our <a data-terms style="color:var(--p);font-weight:700">Terms</a> and <a data-privacy style="color:var(--p);font-weight:700">Privacy Policy</a>.</div></form>';
      var un = $('[data-un]', b), us = $('[data-us]', b), sug = $('[data-sug]', b), num = $('[data-num]', b), ns = $('[data-ns]', b), file = $('[data-file]', b);
      function checkU() {
        clearTimeout(tmU); st.unameOk = false; sug.innerHTML = ''; var v = un.value.trim();
        if (!v) { us.textContent = ''; us.className = 'note'; return; }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) { us.className = 'note err'; us.textContent = '3-20 characters: letters, numbers, underscore only'; return; }
        us.className = 'note'; us.textContent = 'Checking…';
        tmU = setTimeout(function () { EH.api('/api/onboarding/check-username?u=' + encodeURIComponent(v), { auth: false }).then(function (r) { var x = r.d || {};
          if (x.available) { us.className = 'note okc'; us.textContent = '✓ Available'; st.unameOk = true; }
          else { us.className = 'note err'; us.textContent = x.reason || 'Username taken'; if (x.suggestions && x.suggestions.length) { sug.innerHTML = x.suggestions.map(function (s) { return '<button type="button" class="chip tap" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join(''); $$('[data-s]', sug).forEach(function (c) { c.onclick = function () { un.value = c.dataset.s; checkU(); }; }); } } }); }, 380);
      }
      un.oninput = checkU;
      num.oninput = function () {
        clearTimeout(tmN); st.numOk = true; var n = num.value.replace(/\D/g, '');
        if (!n) { ns.className = 'note'; ns.textContent = 'Link it now and Premium works on this account straight away if the number is Premium. You can unbind it any time from your profile.'; return; }
        if (n.length < 10 || n.length > 15 || n.charAt(0) === '0') { ns.className = 'note err'; ns.textContent = 'Use the country code, e.g. 2349012345678'; st.numOk = false; return; }
        ns.className = 'note'; ns.textContent = 'Checking…';
        tmN = setTimeout(function () { EH.api('/api/onboarding/check-number?n=' + encodeURIComponent(n), { auth: false }).then(function (r) { var x = r.d || {};
          if (x.state === 'used') { ns.className = 'note err'; ns.textContent = 'This number is already used by an account'; st.numOk = false; } else if (x.state === 'free') { ns.className = 'note okc'; ns.textContent = '✓ Available'; } else ns.textContent = ''; }); }, 450);
      };
      $$('[name=ph]', b).forEach(function (r) { r.onchange = function () { st.photo = r.value; if (r.value === 'upload' && !st.file) file.click(); }; });
      file.onchange = function () {
        var fl = file.files && file.files[0]; file.value = ''; if (!fl) { return; }
        if (fl.size > 3 * 1024 * 1024) return EH.toast('Image too large (max 3MB)', 'er');
        st.file = fl; var rd = new FileReader(); rd.onload = function (e) { var pv = $('.pv', $('[value=upload]', b).parentNode); pv.innerHTML = '<img src="' + e.target.result + '" alt="" style="width:100%;height:100%;object-fit:cover">'; $('[data-upl]', b).textContent = 'My own photo'; }; rd.readAsDataURL(fl);
      };
      $$('[data-c]', b).forEach(function (c) { c.onclick = function () { st.accent = c.dataset.c; $$('[data-c]', b).forEach(function (x) { x.classList.toggle('on', x === c); }); EH.ls.set('eh_accent', st.accent); EH.accent(); }; });
      $('[data-terms]', b).onclick = function () { EH.go('terms'); }; $('[data-privacy]', b).onclick = function () { EH.go('privacy'); };
      $('[data-form]', b).onsubmit = function (e) {
        e.preventDefault(); var first = $('[data-f]', b).value.trim(), last = $('[data-l]', b).value.trim();
        if (!first || !last) return EH.toast('Enter your first and last name', 'er'); if (!st.unameOk) return EH.toast('Choose an available username', 'er');
        if (!st.numOk) return EH.toast('Fix the bot number, or leave it empty', 'er'); if (st.photo === 'upload' && !st.file) return EH.toast('Choose a photo, or pick another option', 'er');
        var btn = $('[data-go]', b); btn.classList.add('busy');
        var fd = new FormData(); fd.append('token', tok); fd.append('firstName', first); fd.append('lastName', last); fd.append('username', un.value.trim()); fd.append('photoChoice', st.photo);
        var bn = num.value.replace(/\D/g, ''); if (bn) fd.append('botNumber', bn); fd.append('accentColor', st.accent); if (st.photo === 'upload' && st.file) fd.append('photo', st.file); fd.append('deviceId', EH.devId());
        EH.api('/api/onboarding/complete', { method: 'POST', body: fd, auth: false, timeout: 60000 }).then(function (r) {
          btn.classList.remove('busy'); var x = r.d || {}; if (!x.success) return EH.toast(x.error || 'Failed to create account', 'er');
          EH.onbToken = null; EH.setToken(x.token); EH.ls.set('eh_last_login', JSON.stringify({ provider: EH.ls.get('eh_last_provider') || '' }));
          EH.refreshUser().then(function () {
            EH.go('home', true); EH.buzz([20, 40, 20]);
            setTimeout(function () { EH.toast('🎉 Account created! You got ' + (x.signupBonusCoins != null ? x.signupBonusCoins : 3) + ' coins', 'ok'); }, 500);
            if (x.numberLinked) setTimeout(function () { EH.toast(x.numberPremium ? 'Number linked — Premium is active on your account 👑' : 'Number linked to your account ✓', 'ok'); }, 3000); else if (x.numberError) setTimeout(function () { EH.toast(x.numberError, 'er'); }, 3000);
          });
        });
      };
    }
    return {};
  } });
})();
