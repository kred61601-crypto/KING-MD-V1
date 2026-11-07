/* EMMYHENZ V4 AI: the assistant chat (the same one as the site's Help chat) */
(function () {
  var EH = window.EH, $ = EH.$, $$ = EH.$$, ic = EH.ic, esc = EH.esc;
  var KEY = 'eh_ai_chat', HOUR = 60 * 60 * 1000;
  var CHIPS = ['How do I get a pairing code?', 'What does Premium give me?', 'My bot is offline, what now?', 'What commands does the bot have?'];

  /* *bold*, `code`, links and line breaks; text only, never HTML */
  function fmt(t) {
    var h = esc(String(t || ''));
    h = h.replace(/```([\s\S]+?)```/g, function (m, c) { return '<pre>' + c.replace(/^[a-z]*\n/, '') + '</pre>'; });
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,!?:;)])/g, '$1<i>$2</i>');
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return h.replace(/\n/g, '<br>');
  }

  EH.screen('ai', { mount: function (scr) {
    var f = EH.frame(scr, { bar: 'push', title: 'EMMYHENZ AI', sub: 'Ask anything about the site or your bot', logo: true, verified: true }), body = f.body, alive = true, busy = false;
    body.classList.remove('body'); body.className = 'chat-body';
    body.innerHTML = '<div class="chat-list ai-list" data-list></div>' +
      '<div class="chat-foot"><div class="ai-chips" data-chips></div><div class="ai-rep">Not satisfied? <a data-report>Report to Emmy</a></div><div class="chat-in"><textarea class="chat-ta" data-ta rows="1" maxlength="600" placeholder="Ask the AI…"></textarea><button class="chat-send tap" data-send aria-label="Send">' + ic('send') + '</button></div></div>';
    var list = $('[data-list]', body), ta = $('[data-ta]', body), chips = $('[data-chips]', body), st = { sid: null, msgs: [], t: 0 };
    var saved = EH.ls.json(KEY, null); if (saved && saved.sid && Date.now() - saved.t < HOUR) st = saved;   // an hour without a message and the chat starts again
    function save() { st.t = Date.now(); EH.ls.set(KEY, JSON.stringify({ sid: st.sid, msgs: st.msgs.slice(-40), t: st.t })); }
    function add(role, text, note) { var d = document.createElement('div'); d.className = 'ai-m ' + (role === 'u' ? 'me' : 'bot') + (note ? ' note' : ''); d.innerHTML = '<div class="ai-b">' + fmt(text) + '</div>'; list.appendChild(d); list.scrollTop = list.scrollHeight; return d; }
    function typing() { var d = document.createElement('div'); d.className = 'ai-m bot'; d.innerHTML = '<div class="ai-b"><span class="ai-dots"><i></i><i></i><i></i></span><span class="ai-wait"></span></div>'; list.appendChild(d); list.scrollTop = list.scrollHeight; return d; }
    function greet() { if (!st.msgs.length) add('a', "Hi! 👋 I'm *EMMYHENZ V4 AI*, Emmy's personal assistant. I can help with anything about the site or your bot. What do you need?"); st.msgs.forEach(function (m) { add(m.r, m.t); }); chips.hidden = st.msgs.length > 0; }
    function send(text) {
      text = String(text || ta.value).trim(); if (!text || busy) return; busy = true; ta.value = ''; ta.style.height = ''; chips.hidden = true;
      add('u', text); st.msgs.push({ r: 'u', t: text }); var tp = typing(), wait = $('.ai-wait', tp);
      var t1 = setTimeout(function () { wait.textContent = 'Getting ready, one moment…'; }, 6000), t2 = setTimeout(function () { wait.textContent = 'Still working on it…'; }, 20000);
      var done = function (msg, role, note) { clearTimeout(t1); clearTimeout(t2); tp.parentNode && tp.parentNode.removeChild(tp); if (msg) { add(role || 'a', msg, note); if (!note) st.msgs.push({ r: 'a', t: msg }); } save(); busy = false; };
      var t0 = Date.now(), post = function (url, b) { return EH.api(url, { method: 'POST', body: b, auth: false, timeout: 30000 }).then(function (r) { if (!r.d || !r.d.success) throw new Error((r.d && r.d.error) || 'The assistant is busy right now. Please try again.'); return r.d; }); };
      post('/api/support/chat', { sid: st.sid, message: text, name: (EH.user && EH.user.username) || '' }).then(function poll(j) {
        st.sid = j.sid; if (!alive) return;
        if (j.pending) { if (Date.now() - t0 > 120000) throw new Error('The assistant is taking too long. Please try again.'); return new Promise(function (r) { setTimeout(r, 2000); }).then(function () { return post('/api/support/result', { sid: st.sid }); }).then(poll); }
        done(j.reply); if (j.escalated) add('a', '✅ Emmy has been notified about this.', true);
      }).catch(function (e) { if (alive) done(e.message || 'The assistant is busy. Please try again.', 'a', true); });
    }
    CHIPS.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.className = 'ai-chip tap'; b.textContent = c; b.onclick = function () { send(c); }; chips.appendChild(b); });
    $('[data-send]', body).onclick = function () { send(); };
    ta.oninput = function () { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; };
    ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover:hover)').matches) { e.preventDefault(); send(); } };
    /* "Not satisfied? Report to Emmy": the same report the site's Help chat sends */
    $('[data-report]', body).onclick = function () {
      var s = EH.sheet({ title: 'Report to Emmy', html: '<div class="sub" style="margin:0 2px 12px">Tell Emmy what went wrong. The more detail, the faster it gets fixed.</div><label class="fld"><span>Your name</span><input class="inp" data-rn maxlength="100" placeholder="Your name" value="' + esc((EH.user && EH.user.username) || '') + '"></label><label class="fld"><span>What happened?</span><textarea class="inp" data-ri rows="5" maxlength="1800" placeholder="Describe the problem…" style="height:auto;padding:12px 14px"></textarea></label><button class="btn block tap" data-rs>' + ic('send') + ' Send report</button>' });
      var b = s.el; $('[data-rs]', b).onclick = function () {
        var issue = $('[data-ri]', b).value.trim(); if (!issue) return EH.toast('Describe the problem first', 'er');
        var btn = $('[data-rs]', b); btn.disabled = true;
        EH.api('/api/report', { method: 'POST', auth: false, body: { name: $('[data-rn]', b).value.trim() || 'Anonymous', issue: issue, workedStatus: '\n💬 From: EMMYHENZ AI chat (app)' } }).then(function (r) {
          if (r.d && r.d.success) { s.close(); EH.toast('Sent to Emmy ✅', 'ok'); } else { btn.disabled = false; EH.toast((r.d && r.d.error) || 'Could not send. Try again', 'er'); }
        });
      };
    };
    greet();
    return { destroy: function () { alive = false; } };
  } });
})();
