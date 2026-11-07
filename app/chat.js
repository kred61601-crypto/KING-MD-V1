/* Community chat */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var STK = [['thanks', 'Thank you'], ['ok', 'Okay'], ['lol', 'LOL'], ['sorry', 'Sorry'], ['congrats', 'Congrats']];
  var stkM = {};   // id -> { src, premium } from the server's list (the admin manages the stickers)
  var stkSrc = function (id) { return stkM[id] ? stkM[id].src : '/stickers/' + id + '.svg?v=1'; };
  var trayHtml = function () { return STK.map(function (s) { return '<button type="button" data-s="' + s[0] + '" aria-label="' + esc(s[1]) + '"><img src="' + esc(stkSrc(s[0])) + '" alt="' + esc(s[1]) + '">' + ((stkM[s[0]] || {}).premium ? '<i class="stk-c">' + ic('crown') + '</i>' : '') + '</button>'; }).join(''); };
  var at = function (m) { return new Date(m.createdAt).getTime() || 0; };
  var short = function (t) { return String(t || '').length > 60 ? String(t).slice(0, 60) + '…' : String(t || ''); };

  /* loading placeholder: chat bubbles that shimmer (instead of a spinner) */
  function skeleton() {
    var rows = [[0, 62, 15], [0, 78, 15], [1, 56, 15], [0, 70, 30], [1, 44, 15], [0, 84, 15], [1, 66, 30], [0, 50, 15]];
    return '<div class="cm-skel" aria-hidden="true">' + rows.map(function (r) {
      return '<div class="cm-sk' + (r[0] ? ' own' : '') + '">' + (r[0] ? '' : '<i class="skb"></i>') + '<span class="skb" style="width:' + r[1] + '%;height:' + (r[2] + 22) + 'px"></span></div>';
    }).join('') + '</div>';
  }

  EH.screen('chat', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'Community', sub: 'Ask questions, get help, share tips', icon: 'chat', ia: '#22d3ee', ib: '#0891b2', acts: '<button class="ibtn tap" data-pins aria-label="Pinned messages" hidden>' + ic('pin') + '</button>' }), body = f.body, alive = true;
    body.classList.remove('body'); body.className = 'chat-body';
    $('.ttl small', scr).innerHTML = '<i class="live"></i> Ask questions, get help, share tips';
    body.innerHTML = '<div class="chat-list" data-list>' + skeleton() + '</div><div class="chat-new hide" data-newbtn>' + ic('chevD') + ' <span>New messages</span></div>' +
      '<div class="chat-foot" data-foot hidden>' +
        '<div class="chat-reply hide" data-reply><div><b data-rn></b><span data-rt></span></div><button class="ibtn tap sm" data-rx aria-label="Cancel reply">' + ic('x') + '</button></div>' +
        '<div class="chat-img hide" data-imgp><img data-imgv alt=""><button class="ibtn tap sm" data-imgx aria-label="Remove picture">' + ic('x') + '</button></div>' +
        '<div class="stk-tray hide" data-stk>' + trayHtml() + '</div>' +
        '<div class="chat-in"><button class="ibtn tap" data-stkb aria-label="Stickers">' + ic('smile') + '</button><label class="ibtn tap" aria-label="Picture">' + ic('image') + '<input type="file" accept="image/*" data-img hidden></label><textarea class="chat-ta" data-ta rows="1" maxlength="1000" placeholder="Message…"></textarea><button class="chat-send tap" data-send aria-label="Send">' + ic('send') + '</button></div></div>' +
      '<div class="chat-note hide" data-note></div>';
    var list = $('[data-list]', body), foot = $('[data-foot]', body), note = $('[data-note]', body), ta = $('[data-ta]', body), byId = {}, msgs = [], loaded = false, unreadId = null, unreadN = 0, older = false, olderBusy = false, replyTo = null, pendImg = null, status = null, pins = $('[data-pins]', scr), timer = null, lastSig = '', muteT = null;
    var me = function () { return (EH.user && EH.user.username) || ''; };
    /* the line under "Community": who is typing (green, moving dots) or how many are in the chat */
    var sub = $('.ttl small', scr), defSub = sub.innerHTML, liveT = null, tyAt = 0;
    function liveTick() {
      if (document.hidden) return;
      EH.api('/api/community/live', { timeout: 6000 }).then(function (r) {
        var d = r.d; if (!d || !d.success || !sub) return;
        if (d.typing && d.typing.length) { sub.className = 'ty-l'; sub.innerHTML = esc(d.typing.join(', ')) + ' typing<span class="ty-d"><i>.</i><i>.</i><i>.</i></span>'; }
        else if (d.online > 0) { sub.className = ''; sub.innerHTML = '<i class="live"></i> ' + d.online + ' online'; }
        else { sub.className = ''; sub.innerHTML = defSub; }
      });
    }
    liveTick(); liveT = setInterval(liveTick, 3000);
    ta.addEventListener('input', function () { if (!EH.token || Date.now() - tyAt < 2500) return; tyAt = Date.now(); EH.api('/api/community/typing', { method: 'POST', body: {} }); });

    function setNote(html) { note.classList.toggle('hide', !html); note.innerHTML = html || ''; }
    function render(keepScroll) {
      if (!loaded) return;   // the shimmering placeholder stays until the first messages are really here (no "say hi" flash)
      var atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 90, prevH = list.scrollHeight;
      byId = {}; msgs.forEach(function (m) { byId[m._id] = m; });
      var html = (older ? '<div class="chat-start">Start of the chat · older messages are removed automatically</div>' : '') + (msgs.length ? msgs.map(function (m) { try { return (m._id === unreadId ? '<div class="chat-unread" data-unread><span>' + unreadN + ' new message' + (unreadN === 1 ? '' : 's') + '</span></div>' : '') + bubble(m); } catch (e) { console.warn('chat: a message could not be drawn', m && m._id, e); return ''; } }).join('') : '<div class="empty"><div class="ei">' + ic('chat') + '</div><b>No messages yet</b><p>Say hi! 👋</p></div>');
      var sig = html.length + ':' + msgs.map(function (m) { return m._id + (m.pinned ? 'p' : ''); }).join(','); if (sig === lastSig) return; lastSig = sig;
      list.innerHTML = html;
      if (keepScroll === 'unread') { var ud = $('[data-unread]', list); list.scrollTop = ud ? Math.max(0, ud.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 12) : list.scrollHeight; }
      else if (keepScroll === 'older') list.scrollTop = list.scrollHeight - prevH; else if (atBottom || keepScroll === 'bottom') list.scrollTop = list.scrollHeight;
      bind();
    }
    function mentions(m) {
      var raw = String(m.text || ''), names = (m.mentions || []).filter(function (x) { return typeof x === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(x); }), canon = {}; names.forEach(function (x) { canon[x.toLowerCase()] = x; });
      var alts = names.slice(); if (m.mentionAll === true) alts.push('all');
      var tag = function (txt) { if (!alts.length) return txt; return txt.replace(new RegExp('(^|[^A-Za-z0-9_])@(' + alts.join('|') + ')(?![A-Za-z0-9_])', 'gi'), function (all, pre, name) { var u = canon[name.toLowerCase()]; if (!u) return pre + '<span class="mn all">@all</span>'; return pre + '<a class="mn' + (u.toLowerCase() === me().toLowerCase() ? ' me' : '') + '" data-u="' + u + '">@' + u + '</a>'; }); };
      if (!m.isAdmin) return tag(esc(raw));
      var re = /(^|[^A-Za-z0-9@])((?:https?:\/\/|www\.)[^\s<>"']*[^\s<>"'.,;:!?)\]])/gi, out = '', last = 0, mm;
      while ((mm = re.exec(raw))) { var s = mm.index + mm[1].length, u = /^www\./i.test(mm[2]) ? 'https://' + mm[2] : mm[2]; out += tag(esc(raw.slice(last, s))) + '<a class="lk" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(mm[2]) + '</a>'; last = s + mm[2].length; }
      return out + tag(esc(raw.slice(last)));
    }
    function bubble(m) {
      var own = me() === m.username, stk = m.sticker && STK.filter(function (s) { return s[0] === m.sticker; })[0];
      if (m.isGift) return '<div class="chat-sys">🎁 ' + esc(m.username) + ' sent a gift</div>';
      return '<div class="cm ' + (own ? 'own' : '') + (m.pinned ? ' pin' : '') + '" data-id="' + esc(m._id) + '"><i class="cm-sw">' + ic('reply') + '</i>' + (own ? '' : '<div class="cm-av tap" data-u="' + esc(m.username) + '">' + (m.photo ? '<img src="' + esc(m.photo) + '" alt="" onerror="this.remove()">' : esc(String(m.username || '?')[0].toUpperCase())) + '</div>') +
        '<div class="cm-b' + (m.proPlan && m.text ? ' gold' : '') + '">' + '<div class="cm-meta">' + (own ? '' : '<b data-u="' + esc(m.username) + '">' + esc(m.username) + '</b>') + EH.badges({ verified: m.verified, isPremium: !!m.proPlan, isAdmin: m.isAdmin }, 13) + (m.pinned ? '<span style="color:var(--wa)">' + ic('pin') + '</span>' : '') + '<span class="t">' + EH.ago(m.createdAt) + '</span></div>' +
        (m.replyTo ? '<div class="cm-rp"><b>@' + esc(m.replyTo.username) + '</b> ' + esc(m.replyTo.text || '[media]') + '</div>' : '') + (stk ? '<img class="cm-stk" src="' + stkSrc(m.sticker) + '" alt="' + esc(stk[1]) + '">' : '') + (m.image ? '<img class="cm-img" src="' + esc(m.image) + '" alt="">' : '') + (m.text ? '<div class="cm-tx">' + mentions(m) + '</div>' : '') + (m.edited ? '<div class="cm-ed">edited</div>' : '') + reactRow(m) + '</div></div>';
    }
    /* reactions sit inside the message card, BELOW the message (one line down), each with the little profile pictures of the people who reacted */
    var EMO = ['❤️', '👍', '😂', '😮', '😢'];
    function reactRow(m) {
      var l = Array.isArray(m.reactions) ? m.reactions : []; if (!l.length) return '';
      var g = {}; l.forEach(function (r) { (g[r.e] = g[r.e] || []).push(r); });
      return '<div class="cm-rx">' + EMO.filter(function (e) { return g[e]; }).map(function (e) {
        var arr = g[e], mine = arr.some(function (r) { return r.n === me(); });
        return '<button type="button" class="rx' + (mine ? ' me' : '') + '" data-emo="' + e + '" data-mid="' + esc(m._id) + '"><span class="rxe">' + e + '</span>' + arr.slice(0, 3).map(function (r) { return '<span class="rxa"><em>' + esc(String(r.n || '?')[0].toUpperCase()) + '</em><img src="/api/avatar/' + esc(r.u) + '" alt="" onerror="this.style.display=\'none\'"></span>'; }).join('') + (arr.length > 3 ? '<b>' + arr.length + '</b>' : '') + '</button>';
      }).join('') + '</div>';
    }
    function react(id, emoji) {
      if (EH.needLogin('Sign in to react.')) return; EH.buzz(8);
      EH.api('/api/community/react', { method: 'POST', body: { id: id, emoji: emoji } }).then(function (r) {
        var d = r.d || {}; if (!d.success) return EH.toast(d.error || 'Could not react', 'er');
        var m = byId[id]; if (m) { m.reactions = d.reactions; lastSig = ''; render(); }
      });
    }
    function bind() {
      $$('[data-u]', list).forEach(function (e) { e.onclick = function (ev) { ev.stopPropagation(); EH.go('user/' + e.dataset.u); }; });
      $$('.cm', list).forEach(function (e) {
        var tm, long = false, x0 = 0, y0 = 0, dx = 0, sw = false, hit = false, swiped = 0;
        /* swipe a message to the right to reply (like WhatsApp); a tap still opens the actions */
        e.addEventListener('touchstart', function (ev) { long = false; sw = false; hit = false; dx = 0; x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; tm = setTimeout(function () { long = true; actions(e.dataset.id); }, 450); }, { passive: true });
        e.addEventListener('touchmove', function (ev) {
          var t = ev.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
          if (!sw && Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { clearTimeout(tm); return; }
          if (Math.abs(mx) > 8) clearTimeout(tm);
          if (mx > 8 && Math.abs(mx) > Math.abs(my) * 1.2) {
            sw = true; dx = Math.min(mx * 0.75, 78); e.style.transition = 'none'; e.style.transform = 'translateX(' + dx + 'px)'; e.style.setProperty('--sw', Math.min(1, dx / 52));
            if (dx >= 52 && !hit) { hit = true; EH.buzz(8); e.classList.add('rp-hit'); } else if (dx < 52 && hit) { hit = false; e.classList.remove('rp-hit'); }
          }
        }, { passive: true });
        var end = function () { clearTimeout(tm); if (!sw) return; sw = false; swiped = Date.now(); e.style.transition = 'transform .24s var(--ease)'; e.style.transform = ''; e.style.setProperty('--sw', 0); e.classList.remove('rp-hit'); if (dx >= 52) setReply(e.dataset.id); };
        e.addEventListener('touchend', end, { passive: true }); e.addEventListener('touchcancel', end, { passive: true });
        e.addEventListener('click', function (ev) { if (Date.now() - swiped < 400) return; if (ev.target.closest('a,[data-u],img.cm-img,.rx')) return; actions(e.dataset.id); });
        e.addEventListener('dblclick', function () { setReply(e.dataset.id); });
      });
      $$('.rx', list).forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); react(b.dataset.mid, b.dataset.emo); }; });
      $$('img.cm-img', list).forEach(function (i) { i.onclick = function () { var s = EH.sheet({ title: '', full: true, html: '<img src="' + esc(i.src) + '" alt="" style="width:100%;border-radius:18px">' }); }; });
    }
    function actions(id) {
      var m = byId[id]; if (!m) return; var isAdmin = EH.user && EH.user.isAdmin, own = me() === m.username;
      var mineE = ((m.reactions || []).filter(function (r) { return r.n === me(); })[0] || {}).e;
      var s = EH.sheet({ title: '@' + m.username, html: '<div class="rx-bar">' + EMO.map(function (e) { return '<button type="button" class="' + (mineE === e ? 'on' : '') + '" data-e="' + e + '" aria-label="React ' + e + '">' + e + '</button>'; }).join('') + '</div><div class="grp">' + (m.image ? '<div class="row tap" data-a="save"><div class="ri" style="--a:#34d399;--b:#059669">' + ic('download') + '</div><div class="rt"><b>Save image</b></div></div>' : '') + (own && m.text && !m.sticker ? '<div class="row tap" data-a="edit"><div class="ri" style="--a:#a78bfa;--b:#7c3aed">' + ic('edit') + '</div><div class="rt"><b>Edit</b></div></div>' : '') + (m.text ? '<div class="row tap" data-a="copy"><div class="ri" style="--a:#94a3b8;--b:#475569">' + ic('copy') + '</div><div class="rt"><b>Copy</b></div></div>' : '') + '<div class="row tap" data-a="reply"><div class="ri" style="--a:#60a5fa;--b:#2563eb">' + ic('reply') + '</div><div class="rt"><b>Reply</b></div></div>' +
        (own || isAdmin ? '<div class="row tap" data-a="del"><div class="ri" style="--a:#f87171;--b:#dc2626">' + ic('trash') + '</div><div class="rt"><b class="err">Delete</b></div></div>' : '') + (isAdmin ? '<div class="row tap" data-a="pin"><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic('pin') + '</div><div class="rt"><b>' + (m.pinned ? 'Unpin' : 'Pin') + '</b></div></div>' : '') + '</div>' });
      $$('[data-e]', s.el).forEach(function (b) { b.onclick = function () { s.close(); react(id, b.dataset.e); }; });
      $$('[data-a]', s.el).forEach(function (r) { r.onclick = function () { s.close(); var a = r.dataset.a;
        if (a === 'copy') EH.copy(m.text); else if (a === 'reply') setReply(id); else if (a === 'edit') setEdit(id); else if (a === 'save') saveImg(m.image, id);
        else if (a === 'del') EH.confirm({ title: 'Delete message?', text: own ? 'Delete your message?' : 'Delete this message as admin?', ok: 'Delete', danger: true }).then(function (y) { if (!y) return; EH.api(isAdmin && !own ? '/api/admin/community/message/' + id : '/api/community/message/' + id, { method: 'DELETE' }).then(function (r) { if (r.d.success) { msgs = msgs.filter(function (x) { return x._id !== id; }); render(); } else EH.toast(r.d.error || 'Cannot delete', 'er'); }); });
        else if (a === 'pin') EH.api('/api/admin/community/pin/' + id, { method: 'POST', body: {} }).then(function (r) { if (r.d.success) { EH.toast(r.d.pinned ? 'Message pinned 📌' : 'Message unpinned', 'ok'); fetchNew(); } else EH.toast(r.d.error || 'Failed', 'er'); }); }; });
    }
    /* edit your own message: the text goes back into the box; Send saves it (the message then shows "edited") */
    var editing = null;
    function setEdit(id) { var m = byId[id]; if (!m) return; editing = id; replyTo = null; $('[data-rn]', body).textContent = 'Editing your message'; $('[data-rt]', body).textContent = short(m.text || ''); $('[data-reply]', body).classList.remove('hide'); ta.value = m.text || ''; ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; ta.focus(); }
    function doEdit() {
      var id = editing, text = ta.value.trim(); if (!id) return; if (!text) return EH.toast('A message cannot be empty', 'er');
      EH.api('/api/community/message/' + id, { method: 'PUT', body: { text: text } }).then(function (r) {
        var d = r.d || {}; if (!d.success) return EH.toast(d.error || 'Could not edit', 'er');
        var m = byId[id]; if (m) { m.text = d.text; m.mentions = d.mentions; m.edited = true; }
        editing = null; ta.value = ''; ta.style.height = ''; $('[data-reply]', body).classList.add('hide'); lastSig = ''; render(); setTimeout(fetchNew, 300);
      });
    }
    /* save a picture to the phone (the share sheet where the phone offers "Save image", otherwise a download) */
    function saveImg(url, id) {
      var dl = String(url).split('?')[0] + '?dl=1';
      fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
        var f = new File([b], 'emmyhenz-' + id + '.' + ((b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')), { type: b.type });
        if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f] }).catch(function () {});
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 800); EH.toast('Image saved', 'ok');
      }).catch(function () { window.open(dl, '_blank'); });
    }
    function setReply(id) { var m = byId[id]; if (!m) return; replyTo = { _id: id, username: m.username, text: short(m.text || (m.sticker ? '[sticker]' : '[media]')) }; $('[data-rn]', body).textContent = '@' + m.username; $('[data-rt]', body).textContent = replyTo.text; $('[data-reply]', body).classList.remove('hide'); ta.focus(); }
    $('[data-rx]', body).onclick = function () { if (editing) { editing = null; ta.value = ''; } replyTo = null; $('[data-reply]', body).classList.add('hide'); };

    function mute(until, tomorrow) {
      clearInterval(muteT); var end = Date.parse(until) || Date.now() + 300000; foot.hidden = true;
      var paint = function () { var left = end - Date.now(); if (left <= 0) { clearInterval(muteT); setNote(''); foot.hidden = false; return; } var m = Math.floor(left / 60000), s = ('0' + Math.floor(left % 60000 / 1000)).slice(-2); setNote(ic('mic') + (tomorrow ? ' You are muted until tomorrow.' : ' You are muted for <b>' + m + ':' + s + '</b>')); };
      paint(); muteT = setInterval(paint, 1000);
    }
    function send(sticker) {
      if (EH.needLogin('Sign in to chat with the community.')) return; if (editing) return doEdit(); if (typeof sticker !== 'string') sticker = null;
      var text = sticker ? '' : ta.value.trim(), image = sticker ? null : pendImg; if (!text && !image && !sticker) return;
      if (text && !(EH.user && EH.user.isAdmin) && /(^|[^A-Za-z0-9_])@all(?![A-Za-z0-9_])/i.test(text)) return EH.toast('Not allowed — only admins can use @all.', 'er');
      var rp = replyTo; if (sticker) $('[data-stk]', body).classList.add('hide'); else { ta.value = ''; ta.style.height = ''; pendImg = null; $('[data-imgp]', body).classList.add('hide'); }
      replyTo = null; $('[data-reply]', body).classList.add('hide'); EH.buzz(6);
      var temp = { _id: 'tmp' + Date.now(), username: me(), photo: EH.user && EH.user.photo, text: text || null, image: image, sticker: sticker, createdAt: new Date().toISOString(), proPlan: EH.user && EH.user.isPremium ? 'premium' : null, replyTo: rp ? { username: rp.username, text: rp.text } : null }; msgs.push(temp); render('bottom');
      EH.api('/api/community/message', { method: 'POST', body: { text: text || null, image: image || null, sticker: sticker || null, replyTo: rp ? rp._id : null }, timeout: 30000 }).then(function (r) {
        var d = r.d || {}; msgs = msgs.filter(function (x) { return x._id !== temp._id; });
        if (!d.success && d.muted) { render(); if (!sticker && d.reason !== 'link') ta.value = text; EH.toast(d.error || 'You are muted', 'er'); mute(d.until, d.untilTomorrow); }
        else if (!d.success) { render(); if (!sticker) { ta.value = text; pendImg = image; } EH.toast(d.error || 'Send failed', 'er'); if (d.premiumOnly && EH.openPremium) EH.openPremium(); }
        else setTimeout(fetchNew, 600);
      });
    }
    $('[data-send]', body).onclick = function () { send(); };
    ta.oninput = function () { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; };
    ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover:hover)').matches) { e.preventDefault(); send(); } };
    $('[data-stkb]', body).onclick = function () { $('[data-stk]', body).classList.toggle('hide'); };
    $('[data-stk]', body).onclick = function (e) { var b = e.target.closest ? e.target.closest('[data-s]') : null; if (b) send(b.dataset.s); };
    EH.api('/api/community/stickers', { auth: false }).then(function (r) { var d = r.d; if (!alive || !d || !d.success || !Array.isArray(d.stickers)) return; STK = d.stickers.map(function (x) { stkM[x.id] = x; return [x.id, x.name]; }); $('[data-stk]', body).innerHTML = trayHtml(); lastSig = ''; render(); });
    $('[data-img]', body).onchange = function (e) { var file = e.target.files[0]; e.target.value = ''; if (!file) return; if (file.size > 3 * 1024 * 1024) return EH.toast('Image too large (max 3MB)', 'er'); var rd = new FileReader(); rd.onload = function (ev) { pendImg = ev.target.result; $('[data-imgv]', body).src = pendImg; $('[data-imgp]', body).classList.remove('hide'); }; rd.readAsDataURL(file); };
    $('[data-imgx]', body).onclick = function () { pendImg = null; $('[data-imgp]', body).classList.add('hide'); };
    pins.onclick = function () {
      var s = EH.sheet({ title: 'Pinned messages', html: '<div class="spinner"></div>' });
      EH.api('/api/community/pinned', { auth: false }).then(function (r) { var d = r.d; if (!d || !d.success) { s.el.innerHTML = '<div class="empty"><b>Could not load pinned messages</b></div>'; return; } var l = d.messages || [];
        s.el.innerHTML = l.length ? '<div class="grp">' + l.map(function (m) { return '<div class="row tap" data-pid="' + esc(m._id) + '" data-pat="' + esc(m.createdAt) + '"><div class="ri" style="--a:#fbbf24;--b:#d97706">' + ic('pin') + '</div><div class="rt"><b>@' + esc(m.username) + '</b><small style="display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;color:var(--t1)">' + (m.text ? esc(m.text) : 'Photo') + '</small><small>' + EH.ago(m.createdAt) + '</small></div></div>'; }).join('') + '</div>' : '<div class="empty"><div class="ei">' + ic('pin') + '</div><b>No pinned messages</b></div>';
        $$('.row[data-pid]', s.el).forEach(function (row) { row.onclick = function () { s.close(); gotoMsg(row.dataset.pid, row.dataset.pat); }; }); });
    };

    /* tap a pinned message: the list closes and the chat scrolls to it (loading the messages in between when it is further back) and lights it up */
    function show(id) {
      var el = $('.cm[data-id="' + id + '"]', list); if (!el) return false;
      list.scrollTo({ top: Math.max(0, el.offsetTop - Math.max(12, (list.clientHeight - el.offsetHeight) / 3)), behavior: 'smooth' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 2600); return true;
    }
    function gotoMsg(id, createdAt) {
      if (show(id)) return;
      var from = Math.max(0, (Date.parse(createdAt) || 0) - 60000), got = [], n = 0; setNote('<span class="spinner" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:8px"></span>Loading older messages…');
      (function page() {
        EH.api('/api/community/since?after=' + from, { auth: false, timeout: 20000 }).then(function (r) {
          var d = r.d; if (!d || !d.success || ++n > 6) { setNote(''); if (!d || !d.success) EH.toast('Could not open that message', 'er'); return; }
          var add = d.messages || []; got = got.concat(add);
          if (add.length && d.hasMore) { from = at(add[add.length - 1]); return page(); }
          var have = {}; got.forEach(function (m) { have[m._id] = 1; });
          msgs = got.concat(msgs.filter(function (m) { return !have[m._id]; })).sort(function (a, b) { return String(a._id).indexOf('tmp') === 0 ? 1 : String(b._id).indexOf('tmp') === 0 ? -1 : at(a) - at(b); });
          lastSig = ''; render('older'); setNote('');
          setTimeout(function () { if (!show(id)) EH.toast('That message is no longer in the chat', 'er'); }, 60);
        });
      })();
    }
    function setPins(n) {   // the pin button: hidden with no pins, otherwise a red +N on it
      pins.hidden = !(n > 0); var pb = pins.querySelector('.ub');
      if (n > 0) { if (!pb) { pb = document.createElement('i'); pb.className = 'ub'; pins.appendChild(pb); } pb.textContent = '+' + Math.min(99, n); } else if (pb) pb.parentNode.removeChild(pb);
    }
    var oldBtn = $('[data-newbtn]', body); oldBtn.onclick = function () { list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' }); };
    list.addEventListener('scroll', function () { oldBtn.classList.toggle('hide', list.scrollHeight - list.scrollTop - list.clientHeight < 200); if (list.scrollTop < 60) loadOlder(); }, { passive: true });
    function loadOlder() {
      if (olderBusy || older || !msgs.length) return; var first = msgs.filter(function (m) { return String(m._id).indexOf('tmp') !== 0; })[0]; if (!first) return; olderBusy = true;
      EH.api('/api/community/messages?before=' + at(first) + '&limit=40', { auth: false }).then(function (r) { olderBusy = false; var d = r.d; if (!d || !d.success) return; var have = {}; msgs.forEach(function (m) { have[m._id] = 1; }); var add = (d.messages || []).filter(function (m) { return !have[m._id]; }); if (!d.hasMore || !add.length) older = true; msgs = add.concat(msgs); lastSig = ''; render('older'); });
    }
    function fetchNew() {
      if (!alive) return; EH.api('/api/community/messages', { auth: false }).then(function (r) { var d = r.d; if (!alive || !d || !d.success) return;
        var cur = {}, keep = msgs.filter(function (m) { return String(m._id).indexOf('tmp') === 0; }); (d.messages || []).forEach(function (m) { cur[m._id] = 1; });
        var olderOnes = msgs.filter(function (m) { return String(m._id).indexOf('tmp') !== 0 && !cur[m._id] && d.messages.length && at(m) < at(d.messages[0]); });
        msgs = olderOnes.concat(d.messages || [], keep); if (typeof d.pinnedCount === 'number') setPins(d.pinnedCount); render();
        var newest = Math.max.apply(null, [Date.now() - 1000].concat(msgs.map(at))); EH.ls.set('eh_chat_seen', String(newest)); if (EH.token) EH.api('/api/community/read', { method: 'POST', body: { at: newest }, keepAuth: true }); });
    }
    function open() {
      EH.pageOn('community').then(function (ok) { if (!ok) { list.innerHTML = '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('warn') + '</div><b>Under maintenance</b><p>The community is temporarily unavailable.</p></div>'; return; }
        EH.api('/api/community/status', { auth: false }).then(function (r) { status = r.d || {}; var u = EH.user;
          if (!status.enabled) { list.innerHTML = '<div class="empty" style="padding-top:60px"><div class="ei">' + ic('chat') + '</div><b>Community chat is currently disabled</b></div>'; return; }
          if (u && u.chatBanned) setNote(ic('x') + ' Your chat access is on hold' + (u.chatBanReason ? ': ' + esc(u.chatBanReason) : ' due to violation of rules and guidelines.'));
          else if (status.locked && status.lockedAdminOnly && !(u && u.isAdmin)) setNote(ic('lock') + ' Chat is locked by an admin.');
          else if (!u) { foot.hidden = true; setNote('<button class="btn sm tap" data-login>' + ic('user') + ' Sign in to chat</button>'); }
          else foot.hidden = false;
          EH.api('/api/community/messages', { auth: false }).then(function (r2) { var d = r2.d; if (!d || !d.success) { list.innerHTML = '<div class="empty"><b>Failed to load chat</b></div>'; return; } msgs = d.messages || []; loaded = true; if (typeof d.pinnedCount === 'number') setPins(d.pinnedCount);
            /* open where you stopped: a line "N new messages" above the first one you have not read, and the chat scrolls to it (not to the very bottom) */
            var seen = Number(EH.ls.get('eh_chat_seen') || 0), mine = me();
            var finish = function () {
              var un = seen ? msgs.filter(function (m) { return String(m._id).indexOf('tmp') !== 0 && at(m) > seen && m.username !== mine && !m.isGift; }) : [];
              unreadId = un.length ? un[0]._id : null; unreadN = un.length; if (un.length) $('[data-newbtn] span', body).textContent = un.length + ' new message' + (un.length === 1 ? '' : 's') + ' · tap for the latest';
              render(unreadId ? 'unread' : 'bottom');
              var newest = Math.max.apply(null, [Date.now() - 1000].concat(msgs.map(at))); EH.ls.set('eh_chat_seen', String(newest)); if (EH.token) EH.api('/api/community/read', { method: 'POST', body: { at: newest }, keepAuth: true });
            };
            if (seen && msgs.length && at(msgs[0]) > seen) {   // even the oldest of the newest 40 is new to you: everything since you stopped is loaded, so the line sits at the right place
              EH.api('/api/community/since?after=' + seen, { auth: false, timeout: 20000 }).then(function (r3) { var d3 = r3.d; if (alive && d3 && d3.success && d3.messages && d3.messages.length) msgs = d3.messages; if (alive) finish(); });
            } else finish(); });
          timer = setInterval(function () { if (!document.hidden) fetchNew(); }, 4000); }); });
    }
    open();
    var off = EH.on('user', function () { foot.hidden = !(EH.user && !(status && status.locked && status.lockedAdminOnly && !EH.user.isAdmin) && !EH.user.chatBanned); });
    return { destroy: function () { alive = false; clearInterval(timer); clearInterval(muteT); clearInterval(liveT); off(); } };
  } });
})();
