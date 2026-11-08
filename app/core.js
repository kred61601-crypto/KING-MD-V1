/* KING MD V4 app — core: icons, helpers, account, router, sheets, toasts, ads, login */
(function () {
  'use strict';
  var EH = window.EH = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  EH.$ = $; EH.$$ = $$;

  /* ───── storage ───── */
  var mk = function (o) { return { get: function (k) { try { return o.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { o.setItem(k, v); } catch (e) {} }, del: function (k) { try { o.removeItem(k); } catch (e) {} },
    json: function (k, d) { try { var v = JSON.parse(o.getItem(k)); return v == null ? d : v; } catch (e) { return d; } } }; };
  EH.ls = mk(window.localStorage); EH.ss = mk(window.sessionStorage);

  /* ───── theme (dark / light, same key as the site) ───── */
  EH.theme = function () { return EH.ls.get('eh_th') === 'light' ? 'light' : 'dark'; };
  function applyTheme() {
    var t = EH.theme(), d = document.documentElement; d.setAttribute('data-theme', t); d.style.background = t === 'light' ? '#f2f3f8' : '#030303';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'light' ? '#f2f3f8' : '#030303');
    var c = document.querySelector('meta[name=color-scheme]'); if (c) c.setAttribute('content', t);
  }
  EH.setTheme = function (t) { EH.ls.set('eh_th', t === 'light' ? 'light' : 'dark'); applyTheme(); EH.emit('theme', EH.theme()); };

  /* ───── tiny helpers ───── */
  EH.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  EH.fmt = function (n) { return Number(n || 0).toLocaleString(); };
  EH.buzz = function (n) { try { if (navigator.vibrate) navigator.vibrate(n || 8); } catch (e) {} };
  EH.ic = function (n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '"><use href="#i-' + n + '"/></svg>'; };
  EH.ago = function (t) {
    var s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago'; return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  EH.date = function (t) { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  EH.left = function (ms) {   // "3 days", "5 hours", "12 minutes"
    var d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000);
    return d >= 1 ? d + (d === 1 ? ' day' : ' days') : h >= 1 ? h + (h === 1 ? ' hour' : ' hours') : Math.max(1, m) + ' min';
  };
  EH.copy = function (text, msg) {
    var done = function () { EH.toast(msg || 'Copied', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { try { var t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); } catch (e) { EH.toast('Could not copy', 'er'); } }
  };
  EH.devId = function () {
    var d = EH.ls.get('eh_dev');
    if (!/^[0-9a-f]{16,40}$/.test(d || '') && !/^dev_/.test(d || '')) { var b = new Uint8Array(12); crypto.getRandomValues(b); d = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); EH.ls.set('eh_dev', d); }
    return d;
  };

  /* ───── icons (inline, so nothing has to load) ───── */
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    poll: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    gift: '<path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6M2 9h20"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    trend: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    crown: '<path d="m2 4 3 12h14l3-12-6 5-4-7-4 7z"/><path d="M5 20h14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    edit: '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>',
    star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/><circle cx="12" cy="3" r="1"/>',
    key: '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    reply: '<path d="m9 17-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m17 2-5 5-5-5"/>',
    plug: '<path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0z"/><path d="M12 17v5"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
  };
  var sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + Object.keys(P).map(function (k) { return '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + P[k] + '</symbol>'; }).join('') + '</svg>';
  EH.sprite = sprite;

  /* ───── events ───── */
  var subs = {};
  EH.on = function (ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return function () { subs[ev] = (subs[ev] || []).filter(function (f) { return f !== fn; }); }; };
  EH.emit = function (ev, a) { (subs[ev] || []).slice().forEach(function (f) { try { f(a); } catch (e) { console.error(e); } }); };

  /* ───── account ───── */
  EH.token = EH.ls.get('eh_tok') || null;
  EH.user = EH.token ? EH.ls.json('eh_usr', null) : null;
  var HEX = { pink: '#ff2e93', blue: '#3b82f6', green: '#10b981', red: '#ef4444', purple: '#a855f7', orange: '#f97316', gold: '#f0b429', aurora: '#db2777' };
  EH.ACCENTS = HEX;
  EH.accent = function () {
    var u = EH.user, a = (u && u.accentColor) || EH.ls.get('eh_accent') || 'pink';
    if ((a === 'gold' || a === 'aurora') && !(u && u.isPremium)) a = 'pink';
    var h = HEX[a] || HEX.pink, n = parseInt(h.slice(1), 16), r = document.documentElement.style;
    r.setProperty('--p', h); r.setProperty('--p-rgb', ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255));
    return a;
  };
  EH.setUser = function (u) {
    EH.user = u; if (u) EH.ls.set('eh_usr', JSON.stringify(u)); else EH.ls.del('eh_usr');
    EH.accent(); EH.emit('user', u);
  };
  EH.setToken = function (t) { EH.token = t; if (t) EH.ls.set('eh_tok', t); else { EH.ls.del('eh_tok'); EH.ls.del('eh_usr'); EH.user = null; } };

  EH.api = function (path, o) {
    o = o || {};
    var headers = Object.assign({}, o.headers || {}), body;
    if (o.body instanceof FormData) body = o.body;
    else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
    if (o.auth !== false && EH.token) headers['x-auth-token'] = EH.token;
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, o.timeout || 20000);
    return fetch(path, { method: o.method || (body !== undefined ? 'POST' : 'GET'), headers: headers, body: body, signal: ctl.signal }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        clearTimeout(t);
        if (r.status === 401 && EH.token && o.auth !== false && !o.keepAuth) {
          var kicked = d && d.code === 'new_device';
          EH.setToken(null); EH.setUser(null); EH.emit('logout', { kicked: kicked });
          if (kicked) EH.alert('You were signed out', 'Your account was signed in on another device, so this one was signed out. Sign in again to continue.');
        }
        return { ok: r.ok, status: r.status, d: d || {} };
      });
    }).catch(function (e) { clearTimeout(t); return { ok: false, status: 0, net: true, d: { success: false, error: e && e.name === 'AbortError' ? 'The request timed out. Check your connection and try again.' : 'Network error. Check your connection and try again.' } }; });
  };
  var mePromise = null;
  EH.refreshUser = function () {
    if (!EH.token) { mePromise = Promise.resolve(null); return mePromise; }
    mePromise = EH.api('/api/me').then(function (r) { if (r.ok && r.d.success && r.d.user) { EH.setUser(r.d.user); return r.d.user; } return EH.user; });
    return mePromise;
  };
  EH.meReady = function () { return mePromise || EH.refreshUser(); };
  /* back in the app (for example after signing in on the page that opened on top): pick up the saved sign-in */
  EH.resync = function () {
    var t = EH.ls.get('eh_tok');
    if (t && t !== EH.token) { EH.token = t; EH.user = EH.ls.json('eh_usr', null); EH.accent(); EH.emit('user', EH.user); EH.refreshUser(); }
    else if (!t && EH.token) { EH.token = null; EH.user = null; EH.emit('user', null); EH.emit('logout', {}); }
  };
  EH.logout = function () {
    if (EH.pushForget) EH.pushForget();
    if (EH.token) EH.api('/api/logout', { method: 'POST', body: {}, keepAuth: true });
    var s = EH.ls.json('eh_sess', []).filter(function (x) { return !x.synced; }); EH.ls.set('eh_sess', JSON.stringify(s));
    EH.setToken(null); EH.setUser(null); EH.emit('logout', {}); EH.toast('Logged out');
  };

  /* ───── badges + avatar ───── */
  var seal = null;
  EH.vBadge = function (px) {
    if (!seal) { var pts = []; for (var i = 0; i < 96; i++) { var t = i / 96 * Math.PI * 2, r = 9.7 + 1.3 * Math.cos(8 * t); pts.push((12 + r * Math.cos(t)).toFixed(2) + ' ' + (12 + r * Math.sin(t)).toFixed(2)); } seal = 'M' + pts.join('L') + 'Z'; }
    return '<svg class="vseal" style="--bs:' + (px || 16) + 'px" viewBox="0 0 24 24" role="img" aria-label="Verified"><path d="' + seal + '" fill="#1d9bf0"/><path d="M7.4 12.4l3.1 3.1 6.1-6.5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  EH.pBadge = function (px) { return '<span class="pbadge" style="--bs:' + (px || 16) + 'px" role="img" aria-label="Premium"><span class="pb-c"><b>P</b></span></span>'; };
  EH.badges = function (u, px) {
    if (!u) return ''; var h = '';
    if (u.verified) h += EH.vBadge(px); if (u.isPremium || u.proPlan) h += EH.pBadge(px);
    if (u.isAdmin) h += '<span style="color:var(--wa);font-size:' + ((px || 16) - 1) + 'px;display:inline-flex">' + EH.ic('shield') + '</span>';
    return h ? '<span class="badges">' + h + '</span>' : '';
  };
  /* full-screen picture viewer (profile photo, cover): tap anywhere or Back to close */
  EH.viewImg = function (src) {
    if (!src) return; var v = document.createElement('div'); v.className = 'imgv';
    v.innerHTML = '<img src="' + EH.esc(src) + '" alt=""><button class="imgv-x tap" aria-label="Close">' + EH.ic('x') + '</button>';
    v.onclick = function () { v.remove(); }; document.body.appendChild(v);
  };
  EH.avatar = function (u, cls) {
    u = u || {}; var f = (u.firstName || u.username || '?')[0] || '?';
    var inner = u.photo ? '<img src="' + EH.esc(u.photo) + '" alt="" onerror="this.remove()">' : '';
    var letter = u.photo ? '' : EH.esc(String(f).toUpperCase());
    return '<div class="av ' + (cls || '') + (u.isPremium ? ' prem' : '') + '">' + inner + letter + '</div>';
  };

  /* ───── toast, sheet, dialogs ───── */
  var app, stack, tabsEl, toastEl, tt;
  EH.toast = function (msg, kind) {
    if (!toastEl) return; toastEl.textContent = msg; toastEl.className = 'toast on ' + (kind || '');
    clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  };
  var sheets = [];
  EH.sheet = function (o) {
    o = o || {}; var bg = document.createElement('div'), sh = document.createElement('div'), closed = false;
    bg.className = 'sheet-bg'; sh.className = 'sheet' + (o.full ? ' full' : '');
    sh.innerHTML = '<div class="sheet-grab"></div>' + (o.title ? '<div class="sheet-h"><span>' + EH.esc(o.title) + '</span><button class="ibtn tap" data-x aria-label="Close">' + EH.ic('x') + '</button></div>' : '') + '<div class="sheet-b"></div>';
    var b = $('.sheet-b', sh);
    if (typeof o.html === 'string') b.innerHTML = o.html; else if (o.el) b.appendChild(o.el);
    app.appendChild(bg); app.appendChild(sh);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('on'); sh.classList.add('on'); }); });
    var api = { el: b, sheet: sh, close: function () {
      if (closed) return; closed = true; sheets = sheets.filter(function (x) { return x !== api; });
      bg.classList.remove('on'); sh.classList.remove('on'); setTimeout(function () { bg.remove(); sh.remove(); }, 400); if (o.onClose) o.onClose();
    } };
    bg.addEventListener('click', api.close);
    var x = $('[data-x]', sh); if (x) x.addEventListener('click', api.close);
    var y0 = 0, dy = 0, drag = false, grab = $('.sheet-grab', sh), head = $('.sheet-h', sh);
    [grab, head].forEach(function (g) { if (!g) return;
      g.addEventListener('touchstart', function (e) { drag = true; y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; }, { passive: true });
      g.addEventListener('touchmove', function (e) { if (!drag) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
      g.addEventListener('touchend', function () { if (!drag) return; drag = false; sh.style.transition = ''; if (dy > 110) api.close(); else sh.style.transform = ''; });
    });
    sheets.push(api); if (o.onMount) o.onMount(b, api);
    return api;
  };
  EH.closeSheets = function () { sheets.slice().forEach(function (s) { s.close(); }); };
  EH.confirm = function (o) {
    return new Promise(function (res) {
      var bg = document.createElement('div'); bg.className = 'dlg-bg';
      bg.innerHTML = '<div class="dlg"><b>' + EH.esc(o.title || 'Are you sure?') + '</b><p>' + EH.esc(o.text || '') + '</p><div class="btns"><button class="btn alt tap" data-n>' + EH.esc(o.cancel || 'Cancel') + '</button><button class="btn ' + (o.danger ? 'danger' : '') + ' tap" data-y>' + EH.esc(o.ok || 'OK') + '</button></div></div>';
      app.appendChild(bg); requestAnimationFrame(function () { bg.classList.add('on'); });
      var end = function (v) { bg.classList.remove('on'); setTimeout(function () { bg.remove(); }, 220); res(v); };
      $('[data-n]', bg).onclick = function () { end(false); }; $('[data-y]', bg).onclick = function () { end(true); };
    });
  };
  EH.alert = function (title, text) { return EH.confirm({ title: title, text: text, ok: 'OK', cancel: 'Close' }); };

  /* ───── screens + router ───── */
  var routes = {}, cache = {}, cur = null, idx = 0, cleanups = [];
  EH.screen = function (name, def) { routes[name] = def; };
  var parse = function (h) { var m = String(h || '').replace(/^#\/?/, '').split('/'); return { name: m[0] || 'home', arg: decodeURIComponent(m.slice(1).join('/') || '') }; };
  EH.go = function (path, replace) {
    var h = '#/' + path;
    if (replace) history.replaceState({ i: idx }, '', h); else { idx++; history.pushState({ i: idx }, '', h); }
    render(parse(h), 'push');
  };
  EH.back = function () { if (idx > 0) history.back(); else EH.go('home', true); };
  /* Scroll ONE screen's list (its .body) so an element sits where you want it. element.scrollIntoView also scrolls every parent, and the shell around the
     screens (#app, #stack, .scr) is overflow:hidden but can still be scrolled that way: the header then slid up out of view. */
  EH.reveal = function (el, pos) {
    if (!el) return; var b = el.closest ? el.closest('.body') : null;
    if (!b) { try { el.scrollIntoView({ behavior: 'smooth', block: pos === 'start' ? 'start' : 'center' }); } catch (e) {} return; }
    var r = el.getBoundingClientRect(), br = b.getBoundingClientRect(), off = r.top - br.top + b.scrollTop, top;
    if (pos === 'nearest') { if (r.top >= br.top + 8 && r.bottom <= br.bottom - 8) return; top = r.top < br.top ? off - 12 : off - (b.clientHeight - r.height) + 12; }
    else if (pos === 'start') top = off - 12;
    else top = off - Math.max(12, (b.clientHeight - r.height) / 2);
    b.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };
  /* the shell never scrolls: if anything moves it (the keyboard opening, a focused field, a library), it goes straight back, so the header stays put */
  document.addEventListener('scroll', function (e) {
    var t = e.target; if (!t) return;
    if (t === document || t === document.documentElement || t === document.body) { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); return; }
    if (t.id === 'app' || t.id === 'stack' || (t.classList && t.classList.contains('scr'))) { if (t.scrollTop) t.scrollTop = 0; if (t.scrollLeft) t.scrollLeft = 0; }
  }, true);
  if (window.visualViewport) window.visualViewport.addEventListener('scroll', function () { if (window.scrollY) window.scrollTo(0, 0); });
  EH.tab = function (name) { if (cur && cur.name === name) { var b = $('.body', cur.scr); if (b) b.scrollTo({ top: 0, behavior: 'smooth' }); return; } EH.go(name, true); };
  window.addEventListener('popstate', function (e) { var i = (e.state && e.state.i) || 0, dir = i < idx ? 'back' : 'push'; idx = i; render(parse(location.hash), dir); });
  function flush() { cleanups.forEach(function (f) { f(); }); cleanups = []; }
  function render(r, dir) {
    EH.closeSheets(); flush();
    var def = routes[r.name] ? routes[r.name] : routes.home, name = routes[r.name] ? r.name : 'home', key = name + ':' + r.arg;
    if (cur && cur.key === key) return;
    var prev = cur, scr, inst;
    if (def.tab && cache[name]) { scr = cache[name].scr; inst = cache[name].inst; scr.classList.remove('hide'); }
    else { scr = document.createElement('div'); scr.className = 'scr'; stack.appendChild(scr); inst = def.mount(scr, r.arg) || {}; if (def.tab) cache[name] = { scr: scr, inst: inst }; }
    cur = { key: key, name: name, def: def, scr: scr, inst: inst };
    var mode = prev ? ((prev.def.tab && def.tab) ? 'fade' : dir) : 'fade';
    ['in-push', 'in-back', 'in-fade', 'out-push', 'out-back'].forEach(function (c) { scr.classList.remove(c); });
    void scr.offsetWidth; scr.classList.add('in-' + mode);
    if (prev && prev.scr !== scr) {
      var ps = prev.scr, pi = prev.inst, pd = prev.def;
      if (mode !== 'fade') ps.classList.add('out-' + mode);
      var done = function () { ps.classList.remove('out-push', 'out-back'); if (pd.tab) ps.classList.add('hide'); else { if (pi.destroy) pi.destroy(); ps.remove(); } };
      var t = setTimeout(function () { done(); cleanups = cleanups.filter(function (f) { return f !== run; }); }, mode === 'fade' ? 260 : 380), run = function () { clearTimeout(t); done(); };
      cleanups.push(run);
      if (pi.hide) pi.hide();
    }
    if (inst.show) inst.show(r.arg);
    tabsEl.classList.toggle('off', !def.tab);
    $$('.tab', tabsEl).forEach(function (t) { t.classList.toggle('on', t.dataset.tab === name); });
    document.body.classList.toggle('on-tab', !!def.tab); document.body.setAttribute('data-scr', name);
    setTimeout(EH.paintChatBadge, 30);
  }

  /* shared screen frame: top bar + scrolling body */
  EH.frame = function (scr, o) {
    o = o || {}; var bar = '';
    if (o.bar === 'brand') {
      bar = '<div class="bar"><div class="logo"><img src="/logo.png" alt=""></div><div class="brand"><b>KING MD</b><span>V4 · WhatsApp bot</span></div><div class="acts" data-hdr></div></div>';
    } else if (o.bar === 'push') {
      var ico = o.logo ? '<span class="bico lg"><img src="/logo.png" alt=""></span>' : o.icon ? '<span class="bico" style="--a:' + (o.ia || '#ff6aa8') + ';--b:' + (o.ib || '#e11d63') + '">' + EH.ic(o.icon) + '</span>' : '';
      bar = '<div class="bar"><button class="back tap" data-back aria-label="Back">' + EH.ic('chevL') + '</button>' + ico + '<div class="ttl">' + EH.esc(o.title || '') + (o.verified ? ' ' + EH.vBadge(15) : '') + (o.sub ? '<small>' + EH.esc(o.sub) + '</small>' : '') + '</div><div class="acts">' + (o.acts || '') + '</div></div>';
    } else {
      bar = '<div class="bar"><div class="ttl">' + EH.esc(o.title || '') + (o.sub ? '<small>' + EH.esc(o.sub) + '</small>' : '') + '</div><div class="acts">' + (o.acts || '') + '</div></div>';
    }
    scr.innerHTML = bar + '<div class="body' + (o.tab ? ' tabpad' : '') + '"></div>';
    var b = $('.body', scr), barEl = $('.bar', scr), bk = $('[data-back]', scr);
    if (bk) bk.addEventListener('click', function () { EH.buzz(6); EH.back(); });
    if (o.bar === 'brand') EH.header($('[data-hdr]', scr));
    return { bar: barEl, body: b };
  };

  /* header right-hand cluster on the home bar: bell, coins (+ top-up, hide-balance eye) or Sign in */
  EH.header = function (box) {
    var paint = function () {
      var u = EH.user, h = ''; var bar = box.closest('.bar'); if (bar) bar.classList.toggle('usr', !!u);
      if (u) {
        h += '<button class="hbell tap" data-go="notifs" aria-label="Notifications">' + EH.ic('bell') + (u.unreadNotifs > 0 ? '<i class="dot"></i>' : '') + '</button>' +
          '<div class="pill tap" data-buycoins role="button" aria-label="Add coins"><span class="coin">EH</span><span>' + (EH.bal ? EH.bal(u.coins) : EH.fmt(u.coins)) + '</span>' +
          '<button class="heye tap" data-eye aria-label="Show or hide balance" style="width:24px">' + EH.ic(u.hideBalance ? 'eyeoff' : 'eye') + '</button><span class="plus">' + EH.ic('plus') + '</span></div>';
      } else h = '<button class="signin tap" data-login>' + EH.ic('user') + ' Sign in</button>';
      box.innerHTML = h;
    };
    paint(); var off = EH.on('user', paint); EH.on('logout', paint); return off;
  };

  /* ───── navigation to the site (only the admin panel lives there) ───── */
  EH.openSite = function (url) {
    EH.ss.set('eh_site', '1'); EH.buzz(); document.body.classList.add('leaving');
    setTimeout(function () { location.href = url; }, 150);
  };
  EH.openAdmin = function () { EH.openSite('/app/s/admin'); };

  /* ───── global taps ───── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-go],[data-tab],[data-premium],[data-login],[data-site],[data-removeads],[data-eye],[data-buycoins],[data-admin]') : null; if (!t) return;
    if (t.hasAttribute('data-eye')) { e.stopPropagation(); if (EH.toggleBal) EH.toggleBal(); }
    else if (t.hasAttribute('data-buycoins')) { if (EH.openBuyCoins) EH.openBuyCoins(); }
    else if (t.hasAttribute('data-admin')) EH.openAdmin();
    else if (t.dataset.go) { EH.buzz(6); var g = t.dataset.go; if (routes[g] && routes[g].tab) EH.tab(g); else EH.go(g); }
    else if (t.dataset.tab) { EH.buzz(6); if (t.dataset.tab === 'deploy') EH.go('deploy'); else EH.tab(t.dataset.tab); }
    else if (t.hasAttribute('data-premium') || t.hasAttribute('data-removeads')) { if (EH.openPremium) EH.openPremium(); }
    else if (t.hasAttribute('data-login')) EH.login();
    else if (t.dataset.site) EH.openSite(t.dataset.site);
  });

  /* ───── sign-in sheet (Google / GitHub, same sign-in as the site) ───── */
  var GOOGLE = '<svg viewBox="0 0 48 48" width="22" height="22"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  var GITHUB = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>';
  EH.login = function (msg) {
    var s = EH.sheet({ title: 'Sign in', html:
      '<div style="text-align:center;padding:4px 0 6px"><img src="/logo.png" alt="" style="width:76px;height:76px;border-radius:50%;margin:0 auto 12px;box-shadow:0 0 30px rgba(40,110,255,.4)">' +
      '<div class="sub" style="margin-bottom:18px">' + EH.esc(msg || 'Sign in, or create your account in one tap.') + '</div></div>' +
      '<button class="btn block alt tap" data-p="google" style="background:#fff;color:#1a1a1a;margin-bottom:10px">' + GOOGLE + ' Continue with Google</button>' +
      '<button class="btn block alt tap" data-p="github">' + GITHUB + ' Continue with GitHub</button>' +
      '<div class="note" style="text-align:center">We never use passwords. By continuing you accept our <a data-terms style="color:var(--p);font-weight:700">Terms</a> and <a data-privacy style="color:var(--p);font-weight:700">Privacy Policy</a>.</div>' });
    $$('[data-p]', s.el).forEach(function (b) { b.addEventListener('click', function () {
      EH.ls.set('eh_last_provider', b.dataset.p); document.body.classList.add('leaving');
      location.href = '/api/auth/' + b.dataset.p + '/start?returnTo=app';
    }); });
    var tl = $('[data-terms]', s.el), pl = $('[data-privacy]', s.el);
    if (tl) tl.onclick = function () { s.close(); EH.go('terms'); }; if (pl) pl.onclick = function () { s.close(); EH.go('privacy'); };
    return s;
  };
  EH.needLogin = function (msg) { if (EH.token) return false; EH.login(msg); return true; };

  /* ───── tap sound: a short synthesized click (no sound file) on buttons, tabs and tappable rows ───── */
  (function () {
    var SELECTOR = 'button,[role="button"],.btn,.tap,.tab,a[data-go],a[data-tab],a[data-premium]', audioCtx = null;
    function playTapSound() {
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx(); if (audioCtx.state === 'suspended') audioCtx.resume();
        var t = audioCtx.currentTime, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(520, t); osc.frequency.linearRampToValueAtTime(680, t + 0.045); osc.frequency.linearRampToValueAtTime(340, t + 0.12);
        gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.16, t + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
      } catch (e) {}
    }
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
      if (!el || el.disabled) return; playTapSound();
    }, { capture: true, passive: true });
  })();

  /* ───── Community unread: "+N" on the Community icons (Home quick actions and the bottom bar), +99 at most ───── */
  var cuN = 0;
  EH.paintChatBadge = function () {
    $$('.qa [data-go="chat"], .tabs [data-go="chat"]').forEach(function (a) {
      var host = a.querySelector('.ic') || a, b = host.querySelector(':scope > .ub');
      if (!cuN) { if (b) b.parentNode.removeChild(b); return; }
      if (!b) { b = document.createElement('i'); b.className = 'ub'; host.appendChild(b); }
      b.textContent = '+' + Math.min(99, cuN);
    });
  };
  function chatUnreadPoll() {
    if (document.hidden || !EH.token || (cur && cur.name === 'chat')) return;
    var since = Number(EH.ls.get('eh_chat_seen')) || (Date.now() - 3 * 864e5);
    EH.api('/api/community/unread?since=' + since + '&me=' + encodeURIComponent((EH.user && EH.user.username) || ''), { timeout: 8000 }).then(function (r) {
      if (!r.d || !r.d.success) return; cuN = Math.max(0, Number(r.d.count) || 0); EH.paintChatBadge();
    });
  }
  setTimeout(chatUnreadPoll, 2500); setInterval(chatUnreadPoll, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) chatUnreadPoll(); });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-go="chat"]')) { cuN = 0; EH.paintChatBadge(); } }, true);
  EH.on('user', function () { setTimeout(function () { EH.paintChatBadge(); chatUnreadPoll(); }, 50); });

  /* ───── ads: app-style "Sponsored" cards (same ads as the site, switched on in Admin; never shown to Premium) ───── */
  var AD = { banner: '716df4b36bb8e53b55119220188f3082', bannerSrc: 'https://bauval.org/22/', popunder: 'https://abscloud.org/1/76e511066027517a8b6f133af73cbde2', socialbar: 'https://bauval.org/14/9444d82377843351ba154901f47cae03' };
  var adsCfg = null, adsReady = null, adSeq = 0, adMsg = false;
  EH.adCard = function () { return '<div class="adc" data-adc hidden></div>'; };
  var statusP = null, statusAt = 0;
  EH.status = function (fresh) {   // /api/pages/status, shared by ads + the app switches
    if (!statusP || fresh || Date.now() - statusAt > 45000) { statusAt = Date.now(); statusP = EH.api('/api/pages/status', { auth: false, timeout: 8000 }).then(function (r) { var d = r.d && r.d.success ? r.d : null; if (d) EH.emit('status', d); return d; }); }
    return statusP;
  };
  function loadAds() {
    if (adsReady) return adsReady;
    adsReady = EH.status().then(function (d) { adsCfg = (d && d.ads) || {}; return adsCfg; });
    return adsReady;
  }
  function adScript(kind, src) { if (document.querySelector('script[data-eh-ad="' + kind + '"]')) return; var s = document.createElement('script'); s.dataset.cfasync = 'false'; s.dataset.ehAd = kind; s.src = src; document.body.appendChild(s); }
  function mountBanner(slot) {
    if (slot.dataset.mounted) return;
    var id = 'adc' + (++adSeq); slot.dataset.mounted = id; slot.id = id; slot.hidden = false; slot.classList.add('wait');
    var first = $('[data-adc]', slot.closest('.scr') || document) === slot;   // the top ad of a screen also carries the "Stop seeing ads?" chip
    slot.innerHTML = '<div class="adc-h" style="justify-content:' + (first ? 'space-between' : 'center') + '"><span class="adc-tag">Advertisement</span>' + (first ? '<button type="button" class="adc-x tap" data-removeads>' + EH.ic('crown') + ' Stop seeing ads?</button>' : '') + '</div><div class="adc-w"><iframe title="Advertisement" width="320" height="50" scrolling="no" loading="eager"></iframe></div>';
    var f = $('iframe', slot);
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>'
      + '<scr' + 'ipt>atOptions={\'key\':\'' + AD.banner + '\',\'format\':\'iframe\',\'height\':50,\'width\':320,\'params\':{}};</scr' + 'ipt>'
      + '<scr' + 'ipt src="' + AD.bannerSrc + AD.banner + '"></scr' + 'ipt>'
      + '<scr' + 'ipt>(function(){var l=-1;function s(){var h=document.body.scrollHeight;if(h!==l){l=h;parent.postMessage({ehAd:' + JSON.stringify(id) + ',h:h},\'*\');}}try{new ResizeObserver(s).observe(document.body)}catch(e){}setInterval(s,1500);s();})();</scr' + 'ipt>'
      + '</body></html>';
    if (!adMsg) { adMsg = true; window.addEventListener('message', function (e) {
      var d = e.data; if (!d || typeof d.ehAd !== 'string') return;
      var sl = document.getElementById(d.ehAd), fr = sl && $('iframe', sl); if (!fr || e.source !== fr.contentWindow) return;
      sl.classList.toggle('wait', (Number(d.h) || 0) < 20);   // a banner that never filled stays hidden
    }); }
  }
  /* Pop-up ads (pop-under / social bar) put their own full-screen boxes on the page. In the installed app the status bar and notch sit on top of the page, so a
     close button at the very top could not be tapped. Any box of the ad scripts that is pinned to the top edge is moved down below the status bar. */
  function fixAdTop() {
    var kids = document.body ? document.body.children : [];
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i]; if (el.id === 'app' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.classList.contains('eh-adfix') || el.classList.contains('toast') || el.hasAttribute('data-eh-keep')) continue;
      var cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none') continue;
      var r = el.getBoundingClientRect(); if (r.height < 40 || r.top > 24 || r.top < -2) continue;   // only boxes pinned to the top edge
      el.classList.add('eh-adfix');
    }
  }
  var adFixT = null;
  function watchAdTop() { if (adFixT) return; var n = 0; adFixT = setInterval(function () { if (document.hidden) return; fixAdTop(); if (++n > 400) { clearInterval(adFixT); adFixT = null; } }, 1000); }
  EH.mountAds = function (root) {
    var slots = $$('[data-adc]', root || document).filter(function (s) { return !s.dataset.mounted; }); if (!slots.length) return;
    Promise.all([loadAds(), EH.meReady()]).then(function () {
      if (EH.user && EH.user.isPremium) return;
      if (adsCfg.banner) slots.forEach(mountBanner);
      if (adsCfg.popunder || adsCfg.socialbar) watchAdTop();
      if (adsCfg.popunder) adScript('popunder', AD.popunder);
      if (adsCfg.socialbar) adScript('socialbar', AD.socialbar);
    });
  };
  EH.on('user', function (u) { if (u && u.isPremium) $$('[data-adc]').forEach(function (s) { s.hidden = true; s.innerHTML = ''; delete s.dataset.mounted; }); });

  /* ───── app switches from the admin: "Disable app" and "Use site for app" ───── */
  var offEl = null;
  function showOff(on) {
    if (!on) { if (offEl) { offEl.remove(); offEl = null; } return; }
    if (offEl) return; offEl = document.createElement('div'); offEl.className = 'offscr';
    offEl.innerHTML = '<div class="off-in"><img src="/logo.png" alt="" width="84" height="84"><div class="off-ic">' + EH.ic('warn') + '</div><h2>App disabled</h2><p>The app is under maintenance right now. Please use the site until it is back.</p>' +
      '<button class="btn block tap" data-opensite>' + EH.ic('globe') + ' Open the site</button><button class="btn alt block tap" data-retry style="margin-top:10px">' + EH.ic('refresh') + ' Try again</button></div>';
    ($('#app') || document.body).appendChild(offEl);
    $('[data-opensite]', offEl).onclick = function () { EH.openSite('/app/s'); };
    $('[data-retry]', offEl).onclick = function () { document.body.classList.add('leaving'); EH.checkCfg(true).then(function () { document.body.classList.remove('leaving'); if (offEl) EH.toast('Still under maintenance'); }); };
  }
  EH.cfg = EH.ls.json('eh_app_cfg', { disabled: false, useSite: false });
  /* a new version was deployed: the open app loads it by itself (once per version, so it can never loop) */
  var meta = document.querySelector('meta[name=eh-build]'); EH.build = meta && !/^__/.test(meta.content) ? meta.content : '';
  EH.checkCfg = function (fresh) {
    return EH.status(fresh).then(function (d) {
      if (d && d.build && EH.build && d.build !== EH.build && EH.ss.get('eh_rl') !== d.build) { EH.ss.set('eh_rl', d.build); document.body.classList.add('leaving'); setTimeout(function () { location.reload(); }, 150); return EH.cfg; }
      if (d && d.app) { EH.cfg = { disabled: !!d.app.disabled, useSite: !!d.app.useSite }; EH.ls.set('eh_app_cfg', JSON.stringify(EH.cfg)); }
      if (EH.cfg.useSite) { EH.ls.set('eh_app_site', '1'); document.body.classList.add('leaving'); location.replace('/app/s'); return EH.cfg; }
      EH.ls.del('eh_app_site'); showOff(EH.cfg.disabled); return EH.cfg;
    }, function () { return EH.cfg; });
  };

  /* ───── boot ───── */
  EH.boot = function () {
    app = $('#app'); stack = $('#stack'); tabsEl = $('.tabs'); toastEl = $('#toast');
    document.body.insertAdjacentHTML('afterbegin', sprite);
    try { var lt = EH.ls.json('eh_lite', null); if (lt && lt.t > Date.now() && lt.v === 1) document.documentElement.classList.add('lite'); } catch (e) {}
    if (/Android/i.test(navigator.userAgent)) document.documentElement.classList.add('droid');
    applyTheme(); EH.accent();
    EH.ss.del('eh_site');
    window.addEventListener('pageshow', function () { document.body.classList.remove('leaving'); EH.ss.del('eh_site'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) return; EH.resync(); if (Date.now() - cfgAt > 60000) { cfgAt = Date.now(); EH.checkCfg(true); } });
    /* a tap on a phone notification while the app is open */
    try { if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) { var d = e.data; if (!d || d.type !== 'eh-open') return; try { var u = new URL(d.url, location.origin), o = u.searchParams.get('open'), r = u.searchParams.get('receipt'); if (r && EH.openReceipt) EH.openReceipt(r); else if (o === 'notifs') EH.go('notifs'); } catch (x) {} }); } catch (e) {}
    /* "You're offline": shown on top of the app only when the phone itself has no connection (airplane mode, data/Wi-Fi switched off). It goes away by itself
       when the connection is back. The small service worker shows the same page when the app is opened with no connection. A slow or failing connection, or an
       app that is down, is NOT treated as offline: the app and the browser behave as they normally do. */
    (function () {
      try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/push-sw.js').catch(function () {}); } catch (e) {}
      var html = null, ov = null, t = null;
      function loadHtml() {
        fetch('/offline.html', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(function (x) { html = x; })
          .catch(function () { try { caches.open('eh-offline-page-v1').then(function (c) { return c.match('/offline.html'); }).then(function (r) { return r && r.text(); }).then(function (x) { if (x) html = x; }); } catch (e) {} });
      }
      function hide() { clearInterval(t); if (ov) { ov.remove(); ov = null; try { EH.resync(); } catch (e) {} } }
      function show() {
        if (!html || ov || navigator.onLine !== false) return;
        ov = document.createElement('iframe'); ov.setAttribute('aria-label', 'You are offline');
        ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;border:0;z-index:99999;background:#0b0b12'; ov.srcdoc = html.replace('__MODE__', 'offline'); document.body.appendChild(ov);
        clearInterval(t); t = setInterval(function () { if (navigator.onLine !== false) hide(); }, 2000);   // back online: gone
      }
      window.addEventListener('message', function (e) { if (e.data && e.data.ehOffline === 'back') hide(); });
      window.addEventListener('offline', show);
      window.addEventListener('online', hide);
      loadHtml();
    })();
    var cfgAt = Date.now();

    var q = new URLSearchParams(location.search), code = q.get('authCode'), onb = q.get('onboardToken'), aerr = q.get('authError'), after = Promise.resolve();
    var pay = q.get('pay'), rec = q.get('receipt'), opn = q.get('open'), inst = q.get('install');
    if (code || onb || aerr || pay || rec || opn || inst) history.replaceState(null, '', location.pathname + location.hash);
    if (inst) EH.ss.set('eh_inst_force', '1');   // came from the site's Install button: show the Install card even if it was closed before
    if (onb) { EH.onbToken = onb; history.replaceState(null, '', location.pathname + '#/welcome'); }   // a new account finishes its details on its own app screen
    if (code) after = EH.api('/api/auth/exchange', { method: 'POST', body: { code: code, deviceId: EH.devId() }, auth: false }).then(function (r) {
      if (r.d && r.d.success && r.d.token) { EH.setToken(r.d.token); EH.ls.set('eh_last_login', JSON.stringify({ provider: EH.ls.get('eh_last_provider') || '' })); return EH.refreshUser().then(function (u) { if (u) setTimeout(function () { EH.toast('Welcome, ' + u.username + '! 👋', 'ok'); }, 900); }); }
      setTimeout(function () { EH.toast((r.d && r.d.error) || 'Your sign-in expired. Please sign in again.', 'er'); }, 900);
    });
    else if (aerr) setTimeout(function () { EH.toast(/cancel/i.test(aerr) ? 'Login cancelled.' : aerr, /cancel/i.test(aerr) ? '' : 'er'); }, 900);

    if (!location.hash) history.replaceState({ i: 0 }, '', '#/home'); else history.replaceState({ i: 0 }, '', location.hash);
    var cfgDone = Promise.race([EH.checkCfg(), new Promise(function (r) { setTimeout(r, 5000); })]);
    var userDone = after.then(function () { return code ? null : EH.refreshUser(); }).then(function () { return EH.meReady(); }).then(function () { return cfgDone; });
    EH.userDone = userDone;
    if (rec) userDone.then(function () { setTimeout(function () { if (EH.openReceipt) EH.openReceipt(rec); }, 1200); });
    if (opn === 'notifs') userDone.then(function () { setTimeout(function () { EH.go('notifs'); }, 700); });   // a tap on a phone notification while the app was closed
    var wl = EH.ss.get('eh_welcome'); if (wl) { EH.ss.del('eh_welcome'); setTimeout(function () { EH.toast('🎉 Account created! You got ' + wl + ' coins', 'ok'); }, 2200); }
    if (pay) userDone.then(function () { setTimeout(function () { if (EH.handlePayReturn) EH.handlePayReturn(pay); }, 1200); });
    render(parse(location.hash), 'push');

    var splash = $('#splash'), show = !EH.ss.get('eh_splash') || /[?&]splash=1/.test(location.search), t0 = Date.now(), done = false, ready = false;
    function enter() { if (done) return; done = true; if (splash) { splash.classList.add('out'); setTimeout(function () { splash.remove(); }, 800); } document.body.classList.add('ready'); EH.ss.set('eh_splash', '1'); EH.emit('ready'); }
    if (show) { var tick = function () { if (ready && Date.now() - t0 >= 1500) enter(); else if (!done) setTimeout(tick, 80); }; setTimeout(enter, 3200); tick(); userDone.then(function () { ready = true; }); }
    else { if (splash) splash.remove(); done = true; document.body.classList.add('ready'); EH.emit('ready'); }
  };
})();
