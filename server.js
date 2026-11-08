// KING MD V4 — FULL FIXED server.js - Admin + Public Blue Tick ✔️
// No word "Verified" - frontend only draws blue tick next to name
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '');
const JWT_SECRET = process.env.JWT_SECRET || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('CONFIG ERROR: Set JWT_SECRET to a random secret of at least 32 characters in Render.');
}
const SECRET = JWT_SECRET || crypto.randomBytes(48).toString('hex');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== YOUR ADMIN - EMAIL + NUMBER + USERNAME =====
const ADMIN_EMAILS = ['affiliateguru547@gmail.com'];
const ADMIN_PHONES = ['254726476468', '+254726476468', '0726476468', '726476468'];
const ADMIN_USERNAMES = ['affiliateguru54', 'affiliateguru547', 'denzel1968', 'denzel', 'denzeladmin', 'kingmd', 'king_md'];
function normalizePhone(p){
  let s = String(p||'').replace(/[\s\-\(\)\+]/g,'');
  if(s.startsWith('0')) s = '254' + s.slice(1);
  return s;
}
function isOwner(email, phone, username){
  const e = String(email||'').toLowerCase().trim();
  const ph = normalizePhone(phone||'');
  const u = String(username||'').toLowerCase().trim();
  if(ADMIN_EMAILS.includes(e)) return true;
  if(ADMIN_PHONES.includes(ph) || ADMIN_PHONES.includes(String(phone||'').trim())) return true;
  if(ADMIN_USERNAMES.includes(u)) return true;
  return false;
}

function loadUsers() {
  try { const d = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); return Array.isArray(d) ? d : []; }
  catch (_) { return []; }
}
let users = loadUsers();
// Auto-fix old accounts on startup
users.forEach(u=>{
  if(isOwner(u.email, u.phone, u.username)){
    u.isAdmin = true; u.isVerified = true;
  }
  if(!u.avatar && u.photo) u.avatar = u.photo;
  if(!u.cover) u.cover = '';
});
let messages = [{ _id: 'welcome1', username: 'KING MD', text: 'Welcome to KING MD V4 Community! 👑', createdAt: new Date().toISOString(), reactions: [], pinned: true, isAdmin: true, isVerified: true }];
let communityMessages = messages;
let typingUsers = new Map();
let onlineUsers = new Map();
function saveUsers() {
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE);
}

// ===== PUBLIC USER - BLUE TICK PUBLIC, EVERYONE CAN SEE IT =====
function publicUser(u) {
  if (!u) return null;
  const x = { ...u };
  delete x.password; delete x.providerId; delete x.email; delete x.phone;
  x.avatar = u.avatar || u.photo || '';
  x.photo = u.photo || u.avatar || '';
  x.cover = u.cover || '';
  // Public blue tick: admin always gets tick, visible to everyone
  x.isAdmin = !!(u.isAdmin || isOwner(u.email, u.phone, u.username));
  x.isVerified = !!(u.isVerified || x.isAdmin);
  x.verified = x.isVerified;
  x.followersCount = (u.followers || []).length;
  x.followingCount = (u.following || []).length;
  x.likesCount = Number(u.likes || 0);
  return x;
}
function tokenFor(u) {
  return jwt.sign({ id: u.id, username: u.username, isAdmin: !!u.isAdmin, isVerified: !!(u.isVerified || u.isAdmin) }, SECRET, { expiresIn: '30d' });
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = req.headers['x-auth-token'] || h.replace(/^Bearer\s+/i, '');
  req.user = null;
  if (token) { try { req.user = jwt.verify(token, SECRET); } catch (_) {} }
  next();
}
app.use(auth);
function currentUser(req) { return req.user && users.find(u => u.id === req.user.id); }
function requireUser(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ success: false, error: 'Please sign in again.' });
  req.account = u; next();
}
function slugOK(s) { return /^[a-zA-Z0-9_]{3,20}$/.test(s || ''); }
function findUsername(s) { return users.find(u => u.username.toLowerCase() === String(s || '').toLowerCase()); }
function oauth(provider) {
  const p = provider.toUpperCase();
  return { id: process.env[p + '_CLIENT_ID'], secret: process.env[p + '_CLIENT_SECRET'],
    callback: APP_URL + '/api/auth/' + provider + '/callback' };
}
const pending = new Map();
const onboarding = new Map();
const resetTokens = new Map();

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'KING MD V4' }));

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
  try {
    const b = req.body || {}, email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || ''), name = String(b.name || '').trim();
    const phone = normalizePhone(b.phone || b.number || b.whatsapp || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success:false, error:'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ success:false, error:'Password must be at least 8 characters.' });
    if (name.length < 2 || name.length > 60) return res.status(400).json({ success:false, error:'Enter your name (2–60 characters).' });
    if (users.some(u => (u.email || '').toLowerCase() === email)) return res.status(409).json({ success:false, error:'An account with this email already exists. Please sign in.' });
    const parts = name.split(/\s+/), firstName = parts.shift(), lastName = parts.join(' ');
    let base = (email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,15) || 'kinguser');
    if (base.length < 3) base = 'user' + base;
    let username = base, n = 1; while (findUsername(username)) { username = (base.slice(0,16) + n++).slice(0,20); }
    const owner = isOwner(email, phone, username);
    const u = { id: crypto.randomUUID(), username, email, phone, password: await bcrypt.hash(password, 12), provider:'email', firstName, lastName, name, photo:'', avatar:'', cover:'', bio:'', accentColor:'pink', isAdmin: owner, isVerified: owner, followers:[], following:[], likes:0, coins:3, bots:[], createdAt:new Date().toISOString(), hideBalance:false, hideFollowers:false, hideFollowing:false, hideLikes:false, apiKeys:[] };
    users.push(u); saveUsers(); res.status(201).json({ success:true, token:tokenFor(u), user:publicUser(u), signupBonusCoins:3 });
  } catch (e) { console.error('Registration error:', e); res.status(500).json({ success:false, error:'Could not create your account. Please try again.' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const b = req.body || {}, email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
  const phone = normalizePhone(b.phone || '');
  const u = users.find(x => (x.email || '').toLowerCase() === email);
  if (!u || !u.password || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ success:false, error:'Incorrect email or password.' });
  if(isOwner(u.email, u.phone || phone, u.username)){
    u.isAdmin = true; u.isVerified = true;
    if(phone && !u.phone) u.phone = phone;
    saveUsers();
  }
  res.json({ success:true, token:tokenFor(u), user:publicUser(u) });
});
app.post('/api/make-me-admin', async (req,res)=>{
  const b = req.body||{};
  const email = String(b.email||'').trim().toLowerCase();
  const phone = normalizePhone(b.phone || b.number || '');
  let u = null;
  if(email) u = users.find(x=>(x.email||'').toLowerCase()===email);
  if(!u && phone) u = users.find(x=> normalizePhone(x.phone||'')===phone);
  if(!u) return res.json({ success:false, error:'Account not found.' });
  if(!isOwner(u.email, u.phone || phone, u.username) && email!=='affiliateguru547@gmail.com' && phone!=='254726476468') return res.json({ success:false, error:'Only owner can be admin' });
  u.isAdmin = true; u.isVerified = true; if(phone) u.phone = phone; saveUsers();
  res.json({ success:true, message:'Now ADMIN + Blue Tick', user: publicUser(u) });
});
app.get('/api/auth/check-email', (req,res)=>{
  const email = String(req.query.email||'').trim().toLowerCase();
  res.json({ success:true, exists: users.some(u=>(u.email||'').toLowerCase()===email) });
});
app.post('/api/auth/forgot-password', async (req,res)=>{
  const email = String((req.body||{}).email||'').trim().toLowerCase();
  const u = users.find(x=>(x.email||'').toLowerCase()===email);
  if(!u) return res.json({ success:false, error:'No account with that email. Please create a new account.' });
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, { email, at: Date.now() });
  res.json({ success:true, resetToken: token, message:'Reset code created' });
});
app.post('/api/auth/reset-password', async (req,res)=>{
  const { resetToken, newPassword } = req.body||{};
  const item = resetTokens.get(String(resetToken||''));
  if(!item || Date.now()-item.at > 15*60*1000) return res.json({ success:false, error:'Reset code expired. Try again.' });
  if(!newPassword || String(newPassword).length < 8) return res.json({ success:false, error:'New password must be at least 8 characters.' });
  const u = users.find(x=>(x.email||'').toLowerCase()===item.email);
  if(!u) return res.json({ success:false, error:'Account not found.' });
  u.password = await bcrypt.hash(String(newPassword), 12);
  saveUsers(); resetTokens.delete(String(resetToken));
  res.json({ success:true, message:'Password reset. Now sign in with new password.' });
});
app.get('/api/auth/:provider/start', (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!['google', 'github'].includes(provider)) return res.status(404).send('Unsupported provider');
  const cfg = oauth(provider);
  if (!APP_URL || !cfg.id || !cfg.secret) {
    const names = ['APP_URL', provider.toUpperCase() + '_CLIENT_ID', provider.toUpperCase() + '_CLIENT_SECRET'];
    return res.status(503).type('text').send('Login is not configured. Add ' + names.join(', ') + ' in Render environment variables.');
  }
  const state = jwt.sign({ provider, nonce: crypto.randomBytes(16).toString('hex'), returnTo: req.query.returnTo === 'app' ? 'app' : 'site' }, SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({ client_id: cfg.id, redirect_uri: cfg.callback, state });
  let url;
  if (provider === 'google') {
    params.set('response_type', 'code'); params.set('scope', 'openid email profile'); params.set('prompt', 'select_account');
    url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
  } else {
    params.set('scope', 'read:user user:email');
    url = 'https://github.com/login/oauth/authorize?' + params;
  }
  res.redirect(url);
});
app.get('/api/auth/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const fail = msg => res.redirect('/?authError=' + encodeURIComponent(msg));
  try {
    if (!['google', 'github'].includes(provider)) return res.status(404).send('Unsupported provider');
    const st = jwt.verify(String(req.query.state || ''), SECRET);
    if (st.provider !== provider) return fail('Sign-in state mismatch. Try again.');
    if (req.query.error || !req.query.code) return fail('Sign-in was cancelled.');
    const cfg = oauth(provider);
    const tr = await fetch(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: cfg.id, client_secret: cfg.secret, code: req.query.code, redirect_uri: cfg.callback, grant_type: 'authorization_code' })
    });
    const td = await tr.json();
    if (!tr.ok || !td.access_token) return fail('OAuth token exchange failed. Check the provider credentials and callback URL.');
    const headers = { Authorization: 'Bearer ' + td.access_token, Accept: 'application/json', 'User-Agent': 'KING-MD-V4' };
    let profile, email, picture = '';
    if (provider === 'google') {
      const pr = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers });
      profile = await pr.json();
      if (!pr.ok || !profile.id || !profile.email || profile.verified_email === false) return fail('Google did not return a verified email.');
      email = profile.email.toLowerCase(); picture = profile.picture || '';
    } else {
      const pr = await fetch('https://api.github.com/user', { headers });
      profile = await pr.json();
      if (!pr.ok || !profile.id) return fail('Could not read your GitHub profile.');
      email = profile.email && profile.email.toLowerCase();
      if (!email) {
        const er = await fetch('https://api.github.com/user/emails', { headers });
        const es = er.ok ? await er.json() : [];
        const e = Array.isArray(es) && (es.find(x => x.primary && x.verified) || es.find(x => x.verified));
        email = e && e.email && e.email.toLowerCase();
      }
      picture = profile.avatar_url || '';
    }
    if (!email) return fail('Your provider account needs a verified email address.');
    let u = users.find(x => x.email && x.email.toLowerCase() === email);
    if (u) {
      u.provider = provider; u.providerId = String(profile.id);
      if (!u.photo && picture) { u.photo = picture; u.avatar = picture; }
      if(isOwner(email, u.phone, u.username)){ u.isAdmin = true; u.isVerified = true; }
      saveUsers();
      const code = crypto.randomBytes(32).toString('hex');
      pending.set(code, { token: tokenFor(u), at: Date.now() });
      return res.redirect((st.returnTo === 'app' ? '/app.html' : '/') + '?authCode=' + encodeURIComponent(code));
    }
    const onb = crypto.randomBytes(32).toString('hex');
    onboarding.set(onb, { provider, providerId: String(profile.id), email, picture,
      suggestedFirstName: String(profile.given_name || profile.name || profile.login || '').split(/\s+/)[0],
      suggestedLastName: String(profile.family_name || (profile.name || '').split(/\s+/).slice(1).join(' ')),
      at: Date.now() });
    res.redirect((st.returnTo === 'app' ? '/app.html' : '/') + '?onboardToken=' + encodeURIComponent(onb));
  } catch (e) {
    console.error('OAuth callback error:', e.message);
    return fail('Sign-in failed. Check your OAuth settings and try again.');
  }
});
app.post('/api/auth/exchange', (req, res) => {
  const code = String((req.body || {}).code || '');
  const item = pending.get(code); pending.delete(code);
  if (!item || Date.now() - item.at > 5 * 60 * 1000) return res.status(401).json({ success: false, error: 'Sign-in code expired. Please sign in again.' });
  let decoded;
  try { decoded = jwt.verify(item.token, SECRET); } catch (_) { return res.status(401).json({ success: false, error: 'Sign-in expired.' }); }
  const u = users.find(x => x.id === decoded.id);
  if (!u) return res.status(401).json({ success: false, error: 'Account not found.' });
  res.json({ success: true, token: item.token, user: publicUser(u) });
});
app.post('/api/logout', (req, res) => res.json({ success: true }));
app.get('/api/me', requireUser, (req, res) => res.json({ success: true, user: publicUser(req.account) }));

// ===== ONBOARDING =====
app.get('/api/onboarding/info', (req, res) => {
  const x = onboarding.get(String(req.query.token || ''));
  if (!x || Date.now() - x.at > 30 * 60 * 1000) return res.status(401).json({ success: false, error: 'Your sign-up session expired. Please sign in again.' });
  res.json({ success: true, email: x.email, provider: x.provider, picture: x.picture,
    suggestedFirstName: x.suggestedFirstName, suggestedLastName: x.suggestedLastName });
});
app.get('/api/onboarding/check-username', (req, res) => {
  const u = String(req.query.u || '');
  if (!slugOK(u)) return res.json({ available: false, reason: 'Use 3–20 letters, numbers or underscores.' });
  const taken = !!findUsername(u);
  const suggestions = taken ? [u + '1', u + '_md', u + 'official'].filter(slugOK).filter(s => !findUsername(s)).slice(0, 3) : [];
  res.json({ available: !taken, reason: taken ? 'Username already taken' : '', suggestions });
});
app.get('/api/onboarding/check-number', (req, res) => res.json({ state: 'free' }));
app.post('/api/onboarding/complete', upload.single('photo'), (req, res) => {
  const key = String(req.body.token || ''), x = onboarding.get(key);
  if (!x || Date.now() - x.at > 30 * 60 * 1000) return res.status(401).json({ success: false, error: 'Your sign-up session expired. Please sign in again.' });
  const username = String(req.body.username || '').trim();
  const firstName = String(req.body.firstName || '').trim(), lastName = String(req.body.lastName || '').trim();
  if (!firstName || !lastName || !slugOK(username)) return res.json({ success: false, error: 'Enter your name and a valid username.' });
  if (findUsername(username)) return res.json({ success: false, error: 'That username is already taken.' });
  const photoChoice = req.body.photoChoice || 'none';
  let photo = photoChoice === 'provider' ? x.picture : '';
  if (photoChoice === 'upload' && req.file) photo = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
  const owner = isOwner(x.email, req.body.phone || '', username);
  const u = { id: crypto.randomUUID(), username, email: x.email, phone: normalizePhone(req.body.phone||''), provider: x.provider, providerId: x.providerId,
    firstName, lastName, name: firstName + ' ' + lastName, photo, avatar: photo, cover:'', bio: '', accentColor: req.body.accentColor || 'pink',
    isAdmin: owner, isVerified: owner, followers: [], following: [], likes: 0, coins: 3, bots: [], createdAt: new Date().toISOString(),
    hideBalance: false, hideFollowers: false, hideFollowing: false, hideLikes: false, apiKeys: [] };
  users.push(u); saveUsers(); onboarding.delete(key);
  res.json({ success: true, token: tokenFor(u), signupBonusCoins: 3, numberLinked: false });
});

// ===== PROFILE =====
app.post('/api/profile/edit', requireUser, (req, res) => {
  const u = req.account, b = req.body || {}, nm = String(b.username || u.username).trim();
  if (!slugOK(nm)) return res.json({ success: false, error: 'Username must be 3–20 letters, numbers or underscores.' });
  const other = findUsername(nm);
  if (other && other.id !== u.id) return res.json({ success: false, error: 'Username already taken.' });
  u.username = nm; u.firstName = String(b.firstName || '').trim(); u.lastName = String(b.lastName || '').trim();
  u.name = (u.firstName + ' ' + u.lastName).trim(); saveUsers();
  res.json({ success: true, user: publicUser(u) });
});
app.post('/api/profile/update', requireUser, (req, res) => { req.account.bio = String((req.body || {}).bio || '').slice(0, 500); saveUsers(); res.json({ success: true }); });
app.post('/api/profile/accent', requireUser, (req, res) => { req.account.accentColor = String((req.body || {}).accentColor || 'pink'); saveUsers(); res.json({ success: true }); });
app.post('/api/profile/privacy', requireUser, (req, res) => { Object.keys(req.body || {}).forEach(k => { if (['hideBalance','hideFollowers','hideFollowing','hideLikes'].includes(k)) req.account[k] = !!req.body[k]; }); saveUsers(); res.json({ success: true }); });
app.post('/api/profile/photo', requireUser, upload.single('photo'), (req, res) => {
  if (!req.file) return res.json({ success: false, error: 'Choose an image first.' });
  const url = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
  req.account.photo = url; req.account.avatar = url; saveUsers();
  res.json({ success: true, photo: url, avatar: url });
});
app.post('/api/profile/cover', requireUser, upload.single('cover'), (req, res) => {
  if (!req.file) return res.json({ success: false, error: 'Choose an image first.' });
  req.account.cover = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64'); saveUsers();
  res.json({ success: true, cover: req.account.cover });
});
app.delete('/api/profile/cover', requireUser, (req, res) => {
  req.account.cover = ''; saveUsers(); res.json({ success: true });
});
app.get('/api/users/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const found = users.filter(u => u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)).slice(0, 25).map(publicUser);
  res.json({ success: true, users: found });
});
app.get('/api/users/:username', (req, res) => {
  const u = findUsername(req.params.username);
  if (!u) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user: publicUser(u) });
});
app.post('/api/users/:username/follow', requireUser, (req, res) => {
  const target = findUsername(req.params.username), me = req.account;
  if (!target || target.id === me.id) return res.json({ success: false, error: 'User not found.' });
  target.followers = target.followers || []; me.following = me.following || [];
  const i = target.followers.indexOf(me.id);
  if (i >= 0) { target.followers.splice(i, 1); me.following = me.following.filter(id => id !== target.id); }
  else { target.followers.push(me.id); me.following.push(target.id); }
  saveUsers(); res.json({ success: true });
});
app.post('/api/users/:username/like', requireUser, (req, res) => {
  const target = findUsername(req.params.username);
  if (!target) return res.json({ success: false, error: 'User not found.' });
  target.likes = (target.likes || 0) + 1; saveUsers(); res.json({ success: true });
});

// ===== COMMUNITY CHAT - FIXED ADMIN - ONLY ONE CHAT SYSTEM =====
app.get('/api/community/status', (req, res) => res.json({ success: true, enabled: true, locked: false, lockedAdminOnly: false }));
app.get('/api/community/messages', (req, res) => {
  const before = Number(req.query.before) || Date.now();
  const limit = Math.min(Number(req.query.limit) || 40, 40);
  let list = communityMessages.filter(m => new Date(m.createdAt).getTime() < before).slice(-limit);
  list = list.map(m => {
    if(isOwner('', '', m.username)){ m.isAdmin = true; m.isVerified = true; m.verified = true; }
    return m;
  });
  res.json({ success: true, messages: list, pinnedCount: communityMessages.filter(m=>m.pinned).length, hasMore: false });
});
app.get('/api/community/since', (req, res) => res.json({ success: true, messages: communityMessages.filter(m => new Date(m.createdAt).getTime() > (Number(req.query.after) || 0)) }));
app.get('/api/community/pinned', (req, res) => res.json({ success: true, messages: communityMessages.filter(m => m.pinned) }));
app.get('/api/community/live', (req, res) => {
  const now = Date.now();
  for(let [k,v] of typingUsers){ if(now - v > 5000) typingUsers.delete(k); }
  res.json({ success: true, online: onlineUsers.size || 1, typing: [...typingUsers.keys()] });
});
app.post('/api/community/typing', (req, res) => {
  const u = currentUser(req);
  if(u) typingUsers.set(u.username, Date.now());
  res.json({ success: true });
});
app.post('/api/community/message', requireUser, (req, res) => {
  const b = req.body || {}; if (!b.text && !b.image && !b.sticker) return res.json({ success: false, error: 'Empty message' });
  if(b.text && b.text.length > 1000) return res.json({ success: false, error: 'Too long' });
  const mentions = [];
  if(b.text){ const mm = b.text.match(/@([A-Za-z0-9_]{3,20})/g); if(mm) mm.forEach(x=>mentions.push(x.slice(1))); }
  let replyObj = null;
  if(b.replyTo){ const orig = communityMessages.find(m=>m._id===b.replyTo); if(orig) replyObj = { username: orig.username, text: orig.text || '[media]' }; }
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone, req.account.username));
  const isVerified = !!(req.account.isVerified || isAdmin);
  const m = { _id: crypto.randomUUID(), username: req.account.username, photo: req.account.avatar || req.account.photo || null, text: b.text || null, image: b.image || null, sticker: b.sticker || null, mentions, replyTo: replyObj, reactions: [], pinned: false, edited: false, isAdmin, isVerified, verified: isVerified, createdAt: new Date().toISOString() };
  communityMessages.push(m);
  if(communityMessages.length > 500) communityMessages.splice(0, communityMessages.length - 500);
  onlineUsers.set(req.account.username, Date.now());
  res.json({ success: true, message: m });
});
app.post('/api/community/react', requireUser, (req, res) => {
  const m = communityMessages.find(x => x._id === (req.body || {}).id); if (!m) return res.json({ success: false });
  m.reactions = (m.reactions || []).filter(x => x.n !== req.account.username); m.reactions.push({ e: req.body.emoji, n: req.account.username, u: req.account.username });
  res.json({ success: true, reactions: m.reactions });
});
app.put('/api/community/message/:id', requireUser, (req, res) => {
  const m = communityMessages.find(x => x._id === req.params.id); if(!m) return res.json({ success: false });
  if(m.username !== req.account.username) return res.json({ success: false, error: 'Not yours' });
  m.text = req.body.text; m.edited = true; res.json({ success: true, text: m.text, edited: true });
});
app.delete('/api/community/message/:id', requireUser, (req, res) => {
  const idx = communityMessages.findIndex(m => m._id === req.params.id); if(idx===-1) return res.json({ success: false });
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone, req.account.username));
  if(communityMessages[idx].username !== req.account.username && !isAdmin) return res.json({ success: false, error: 'Not allowed' });
  communityMessages.splice(idx, 1); res.json({ success: true });
});
app.post('/api/community/read', (req, res) => res.json({ success: true }));
app.get('/api/community/stickers', (req, res) => res.json({ success: true, stickers: [{ id: 'thanks', name: 'Thank you', src: '/stickers/thanks.svg?v=1' }, { id: 'ok', name: 'Okay', src: '/stickers/ok.svg?v=1' }, { id: 'lol', name: 'LOL', src: '/stickers/lol.svg?v=1' }, { id: 'sorry', name: 'Sorry', src: '/stickers/sorry.svg?v=1' }, { id: 'congrats', name: 'Congrats', src: '/stickers/congrats.svg?v=1' }] }));
app.post('/api/admin/community/pin/:id', requireUser, (req, res) => {
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone, req.account.username));
  if(!isAdmin) return res.json({ success: false, error: 'Admin only' });
  const m = communityMessages.find(x => x._id === req.params.id); if(!m) return res.json({ success: false });
  m.pinned = !m.pinned; res.json({ success: true, pinned: m.pinned });
});
app.delete('/api/admin/community/message/:id', requireUser, (req, res) => {
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone, req.account.username));
  if(!isAdmin) return res.json({ success: false, error: 'Admin only' });
  const idx = communityMessages.findIndex(m => m._id === req.params.id); if(idx!==-1) communityMessages.splice(idx,1);
  res.json({ success: true });
});
app.get('/api/avatar/:user', (req, res) => {
  res.redirect('https://ui-avatars.com/api/?name=' + encodeURIComponent(req.params.user) + '&background=ec4899&color=fff');
});

app.post('/api/ai/chat', (req, res) => {
  const q = String((req.body || {}).message || (req.body || {}).prompt || '').toLowerCase();
  let reply = 'I am KING MD V4 AI. Ask me how to pair your bot, deploy it, or fix an error!';
  if (q.includes('pair') || q.includes('link')) reply = 'To pair: Go to Deploy a Bot > Enter WhatsApp number > Get Pairing Code > WhatsApp > Linked Devices > Link with code.';
  else if (q.includes('deploy')) reply = 'To deploy: Go to Deploy a Bot, choose plan, enter number, tap Deploy.';
  else if (q.includes('hello') || q.includes('hi')) reply = 'Hello King! 👑 Welcome to KING MD V4. How can I help?';
  res.json({ success: true, reply, response: reply });
});
app.post('/api/chat', (req, res) => res.redirect(307, '/api/ai/chat'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use((err, req, res, next) => {
  console.error('Request error:', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Server error' });
});
app.listen(PORT, () => console.log('KING MD V4 server listening on ' + PORT));
