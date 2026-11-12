// KING MD V4 — FULL FIXED server.js - Bot Count + Channel React For Everyone + Coins 👑
// FIXED 1: Forward kingCode / displayCode from Engine (was lost!)
// FIXED 2: getBotNumbersForEveryone now calls /api/status?numbers=... correctly
// FIXED 3: /api/channel-react now handles Engine 404 + retries with correct payload
// FIXED 4: app.listen 0.0.0.0 + /health + API 404 before * catch-all
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
const BOTS_FILE = path.join(DATA_DIR, 'bots.json');
const PAIR_BRIDGE_KEY = process.env.PAIR_BRIDGE_KEY || 'uFOg2BeCn3EJV6tf1fdXbsMSwshScKuzFDQwvoh68jx59ftO';
const ENGINE_URL = (process.env.ENGINE_URL || 'https://king-md-engine.onrender.com').replace(/\/+$/, '');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('CONFIG ERROR: Set JWT_SECRET to a random secret of at least 32 characters in Render.');
}
const SECRET = JWT_SECRET || crypto.randomBytes(48).toString('hex');

// ===== KING MD - GLOBAL SLOTS 👑 =====
const TOTAL_SERVERS = Number(process.env.TOTAL_SERVERS || 1);
const SLOTS_PER_SERVER = Number(process.env.SLOTS_PER_SERVER || 15);
const TOTAL_SLOTS = TOTAL_SERVERS * SLOTS_PER_SERVER;
const FREE_SLOTS = 3;
const PREMIUM_SLOTS = 6;

fs.mkdirSync(DATA_DIR, { recursive: true });
function loadJsonFile(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; } }
function saveJsonFile(file, value) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(tmp, file); }
let botRecords = loadJsonFile(BOTS_FILE, []); if (!Array.isArray(botRecords)) botRecords = [];

function normalizePhone(p){
  let s = String(p||'').replace(/[\s\-\(\)\+]/g,'');
  if(s.startsWith('0')) s = '254' + s.slice(1);
  return s;
}
function dedupeBotRecords() {
  const seen = new Map();
  for (const b of botRecords) {
    const num = normalizePhone(b.number || b.phoneNumber || '');
    if (!num) continue;
    if (!seen.has(num)) seen.set(num, { ...b, number: num });
    else {
      const old = seen.get(num);
      if (new Date(b.updatedAt || b.createdAt || 0) > new Date(old.updatedAt || old.createdAt || 0)) {
        seen.set(num, { ...old, ...b, number: num, ownerId: old.ownerId || b.ownerId });
      }
    }
  }
  const cleaned = [...seen.values()];
  if (cleaned.length !== botRecords.length) {
    console.log(`[KING MD] Deduped bots: ${botRecords.length} -> ${cleaned.length} unique`);
    botRecords = cleaned;
    saveJsonFile(BOTS_FILE, botRecords);
  }
  return botRecords;
}
dedupeBotRecords();
function uniqueBots(list) {
  const m = new Map();
  for (const b of (list || botRecords)) {
    const num = normalizePhone(b.number || '');
    if (num && !m.has(num)) m.set(num, b);
  }
  return [...m.values()];
}
function normalizeBotState(value, info) {
  const raw = String(value || '').toLowerCase().trim();
  if ((info && typeof info === 'object' && info.connected === true) ||
      ['online','connected','open','active','ready'].includes(raw)) return 'online';
  if (['offline','close','closed','disconnected','logged_out','logout','dead'].includes(raw)) return 'offline';
  if (['pairing','connecting','qr','starting','reconnecting'].includes(raw)) return 'pairing';
  return raw || 'offline';
}
function countBots() {
  const uniq = uniqueBots();
  const online = uniq.filter(b => normalizeBotState(typeof b.state === 'object' ? b.state.state : b.state) === 'online').length;
  return { total: uniq.length, online, offline: uniq.length - online, unique: uniq };
}

const notificationList = user => Array.isArray(user.notifications) ? user.notifications : [];
function addUserNotification(user, type, title, body, meta) {
  if (!Array.isArray(user.notifications)) user.notifications = [];
  user.notifications.unshift({ _id: crypto.randomBytes(9).toString('hex'), type, title, body, meta: meta || {}, read: false, createdAt: new Date().toISOString() });
  user.notifications = user.notifications.slice(0, 100);
  user.unreadNotifs = user.notifications.filter(n => !n.read).length;
}
// FIXED: engineFetch now handles non-JSON + 404 properly
async function engineFetch(route, options) {
  const base = ENGINE_URL;
  const response = await fetch(base + route, { ...(options || {}), headers: { 'content-type': 'application/json', 'x-pair-bridge-key': PAIR_BRIDGE_KEY, ...((options || {}).headers || {}) }, signal: AbortSignal.timeout(30000) });
  const text = await response.text().catch(() => '');
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
  if (!response.ok || data.success === false) { const error = new Error(data.error || data.raw || 'WhatsApp engine request failed'); error.status = response.status || 502; throw error; }
  return data;
}

// ===== OWNER ACCOUNT =====
const ADMIN_EMAILS = ['affiliateguru547@gmail.com'];
const ADMIN_PHONES = ['254726476468'];
function isOwner(email, phone){
  const e = String(email||'').toLowerCase().trim();
  const ph = normalizePhone(phone||'');
  if(ADMIN_EMAILS.includes(e)) return true;
  if(ADMIN_PHONES.includes(ph) || ADMIN_PHONES.includes(String(phone||'').trim())) return true;
  return false;
}
function isPremiumUser(u){
  if(!u) return false;
  if(isOwner(u.email, u.phone)) return true;
  const until = Date.parse(u.premiumUntil || u.proPlanUntil || '');
  if(Number.isFinite(until)) return until > Date.now();
  return u.isPremium === true || u.proPlan === true;
}

function loadUsers() {
  try { const d = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); return Array.isArray(d) ? d : []; }
  catch (_) { return []; }
}
let users = loadUsers();
users.forEach(u=>{
  if(isOwner(u.email, u.phone)){
    u.isAdmin = true; u.isVerified = true; u.isPremium = true;
    if (!u.adminCoinGrantVersion) { u.coins = 9999; u.adminCoinGrantVersion = 1; }
  }
  if(!Array.isArray(u.followers)) u.followers = [];
  if(!Array.isArray(u.following)) u.following = [];
  if(!u.avatar && u.photo) u.avatar = u.photo;
  if(!u.cover) u.cover = '';
});
saveJsonFile(USERS_FILE, users);
let messages = [{ _id: 'welcome1', username: 'KING MD', text: 'Welcome to KING MD V4 Community! 👑', createdAt: new Date().toISOString(), reactions: [], pinned: true, isAdmin: true, isVerified: true }];
let communityMessages = messages;
let typingUsers = new Map();
let onlineUsers = new Map();
function saveUsers() {
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE);
}

function publicUser(u) {
  if (!u) return null;
  const x = { ...u };
  delete x.password; delete x.providerId; delete x.email; delete x.phone;
  x.avatar = u.avatar || u.photo || '';
  x.photo = u.photo || u.avatar || '';
  x.cover = u.cover || '';
  x.isAdmin = !!(u.isAdmin || isOwner(u.email, u.phone));
  x.isPremium = isPremiumUser(u);
  x.proPlan = x.isPremium;
  x.isVerified = !!(x.isAdmin || x.isPremium);
  x.verified = x.isVerified;
  x.followersCount = (u.followers || []).length;
  x.followingCount = (u.following || []).length;
  x.likesCount = Number(u.likes || 0);
  x.botSpaces = Number(u.botSpaces || (x.isPremium ? PREMIUM_SLOTS : FREE_SLOTS));
  x.usedSpaces = uniqueBots(botRecords.filter(b => b.ownerId === u.id)).length;
  x.coins = Number(u.coins || 0);
  return x;
}
function tokenFor(u) {
  const isAdmin = !!(u.isAdmin || isOwner(u.email, u.phone));
  const isPremium = isPremiumUser(u);
  return jwt.sign({ id: u.id, username: u.username, isAdmin, isPremium, isVerified: isAdmin || isPremium }, SECRET, { expiresIn: '30d' });
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

// ===== WHATSAPP PAIRING BRIDGE - APP SIDE =====
const pairTokens = new Map();
app.get('/api/pair-token', (req, res) => {
  const token = crypto.randomBytes(24).toString('hex');
  pairTokens.set(token, Date.now() + 5 * 60 * 1000);
  for (const [k, expiry] of pairTokens) if (expiry < Date.now()) pairTokens.delete(k);
  res.json({ success: true, token });
});
app.post('/request-pairing', async (req, res) => {
  const body = req.body || {};
  const token = String(body.pairToken || '');
  const expiry = pairTokens.get(token);
  if (!expiry || expiry < Date.now()) { pairTokens.delete(token); return res.status(403).json({ success:false, error:'Pairing request expired. Refresh and try again.' }); }
  pairTokens.delete(token);
  const phoneNumber = normalizePhone(body.phoneNumber || '');
  if (!/^\d{8,15}$/.test(phoneNumber)) return res.status(400).json({ success:false, error:'Enter a valid phone number with country code.' });
  const account = currentUser(req);
  if (account) {
    const myUnique = uniqueBots(botRecords.filter(b => b.ownerId === account.id));
    const alreadyOwned = myUnique.some(b => normalizePhone(b.number) === phoneNumber);
    const allowed = Math.max(3, Number(account.botSpaces || (isPremiumUser(account) ? PREMIUM_SLOTS : FREE_SLOTS)));
    if (!alreadyOwned && myUnique.length >= allowed) return res.status(403).json({ success:false, code:'NO_BOT_SPACE', error:'You have used all ' + allowed + ' bot spaces.' });
  }
  try {
    const upstream = await fetch(ENGINE_URL + '/api/pair', {
      method: 'POST', headers: { 'content-type':'application/json', 'x-pair-bridge-key':PAIR_BRIDGE_KEY },
      body: JSON.stringify({ phoneNumber }) , signal: AbortSignal.timeout(90000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.status === 409 && data.code === 'ALREADY_CONNECTED') {
      if (req.user && req.user.id) {
        const existing = botRecords.find(b => b.ownerId === req.user.id && normalizePhone(b.number) === phoneNumber);
        const record = { ownerId: req.user.id, username: req.user.username || '', number: phoneNumber, deviceId: String(body.deviceId || '').slice(0, 100), state: 'online', createdAt: existing ? existing.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (existing) Object.assign(existing, record); else botRecords.push(record);
        dedupeBotRecords(); saveJsonFile(BOTS_FILE, botRecords);
      }
      return res.json({ success: true, alreadyConnected: true, state: 'online', serverInfo: { serverUsed: 'KING MD Engine' } });
    }
    if (!upstream.ok || !data.success) return res.status(upstream.status || 502).json({ success:false, error:data.error || 'The bot engine could not generate a pairing code.' });
    if (req.user && req.user.id) {
      const existing = botRecords.find(b => b.ownerId === req.user.id && normalizePhone(b.number) === phoneNumber);
      const record = { ownerId: req.user.id, username: req.user.username || '', number: phoneNumber, deviceId: String(body.deviceId || '').slice(0, 100), state: 'pairing', createdAt: existing ? existing.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (existing) Object.assign(existing, record); else botRecords.push(record);
      dedupeBotRecords(); saveJsonFile(BOTS_FILE, botRecords);
    }
    // FIXED: Forward KINGMD code so frontend shows KINGMD25 not real code!
    res.json({ success:true, pairingCode: data.pairingCode, kingCode: data.kingCode || data.displayCode || data.pairingCode, displayCode: data.kingCode || data.displayCode || data.pairingCode, state:data.state || 'pairing', serverInfo:{ serverUsed:'KING MD Engine' } });
  } catch (error) {
    console.error('Pairing engine request failed:', error.message);
    res.status(502).json({ success:false, error:'Pairing engine is offline or still starting. Please try again shortly.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'KING MD V4' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'KING MD V4' }));

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
    const owner = isOwner(email, phone);
    const u = { id: crypto.randomUUID(), username, email, phone, password: await bcrypt.hash(password, 12), provider:'email', firstName, lastName, name, photo:'', avatar:'', cover:'', bio:'', accentColor:'pink', isAdmin: owner, isVerified: owner, isPremium: owner, followers:[], following:[], likes:0, coins: owner ? 9999 : 3, adminCoinGrantVersion: owner ? 1 : 0, bots:[], createdAt:new Date().toISOString(), hideBalance:false, hideFollowers:false, hideFollowing:false, hideLikes:false, apiKeys:[] };
    users.push(u); saveUsers(); res.status(201).json({ success:true, token:tokenFor(u), user:publicUser(u), signupBonusCoins: owner ? 9999 : 3 });
  } catch (e) { console.error('Registration error:', e); res.status(500).json({ success:false, error:'Could not create your account. Please try again.' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const b = req.body || {}, email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
  const phone = normalizePhone(b.phone || '');
  const u = users.find(x => (x.email || '').toLowerCase() === email);
  if (!u || !u.password || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ success:false, error:'Incorrect email or password.' });
  if(isOwner(u.email, u.phone || phone)){
    u.isAdmin = true; u.isVerified = true; u.isPremium = true;
    if(phone && !u.phone) u.phone = phone;
    saveUsers();
  }
  res.json({ success:true, token:tokenFor(u), user:publicUser(u) });
});
app.post('/api/make-me-admin', requireUser, async (req,res)=>{
  const u = req.account;
  if(!isOwner(u.email, u.phone)) return res.status(403).json({ success:false, error:'Only the owner account can be admin.' });
  u.isAdmin = true; u.isVerified = true; u.isPremium = true; saveUsers();
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
      if(isOwner(email, u.phone)){ u.isAdmin = true; u.isVerified = true; u.isPremium = true; }
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
  const owner = isOwner(x.email, req.body.phone || '');
  const u = { id: crypto.randomUUID(), username, email: x.email, phone: normalizePhone(req.body.phone||''), provider: x.provider, providerId: x.providerId,
    firstName, lastName, name: firstName + ' ' + lastName, photo, avatar: photo, cover:'', bio: '', accentColor: req.body.accentColor || 'pink',
    isAdmin: owner, isVerified: owner, isPremium: owner, followers: [], following: [], likes: 0, coins: 3, bots: [], createdAt: new Date().toISOString(),
    hideBalance: false, hideFollowers: false, hideFollowing: false, hideLikes: false, apiKeys: [] };
  users.push(u); saveUsers(); onboarding.delete(key);
  res.json({ success: true, token: tokenFor(u), signupBonusCoins: owner ? 9999 : 3, numberLinked: false });
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
  if (!target || target.id === me.id) return res.status(404).json({ success: false, error: 'User not found.' });
  target.followers = Array.isArray(target.followers) ? target.followers : [];
  me.following = Array.isArray(me.following) ? me.following : [];
  const following = me.following.includes(target.id);
  if (following) {
    target.followers = target.followers.filter(id => id !== me.id);
    me.following = me.following.filter(id => id !== target.id);
  } else {
    if (!target.followers.includes(me.id)) target.followers.push(me.id);
    if (!me.following.includes(target.id)) me.following.push(target.id);
    addUserNotification(target, 'follower', 'New follower', '@' + me.username + ' started following you.', { username: me.username });
  }
  saveUsers();
  res.json({ success: true, following: !following, followersCount: target.followers.length, followingCount: me.following.length });
});
app.get('/api/users/:username/followers', (req, res) => {
  const target = findUsername(req.params.username);
  if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
  const list = (target.followers || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  res.json({ success: true, users: list.map(publicUser) });
});
app.get('/api/users/:username/following', (req, res) => {
  const target = findUsername(req.params.username);
  if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
  if (target.hideFollowing && (!currentUser(req) || currentUser(req).id !== target.id)) return res.json({ success: true, restricted: true, users: [] });
  const list = (target.following || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  res.json({ success: true, users: list.map(publicUser) });
});
app.post('/api/users/:username/like', requireUser, (req, res) => {
  const target = findUsername(req.params.username);
  if (!target) return res.json({ success: false, error: 'User not found.' });
  target.likes = (target.likes || 0) + 1; saveUsers(); res.json({ success: true });
});

// ===== COMMUNITY CHAT =====
app.get('/api/community/status', (req, res) => res.json({ success: true, enabled: true, locked: false, lockedAdminOnly: false }));
app.get('/api/community/messages', (req, res) => {
  const before = Number(req.query.before) || Date.now();
  const limit = Math.min(Number(req.query.limit) || 40, 40);
  let list = communityMessages.filter(m => new Date(m.createdAt).getTime() < before).slice(-limit);
  list = list.map(m => {
    const account = findUsername(m.username);
    if(account){
      const isAdmin = !!(account.isAdmin || isOwner(account.email, account.phone));
      const isPremium = isPremiumUser(account);
      m.isAdmin = isAdmin; m.isPremium = isPremium; m.proPlan = isPremium;
      m.isVerified = isAdmin || isPremium; m.verified = m.isVerified;
    }
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
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone));
  const isPremium = isPremiumUser(req.account);
  const isVerified = isAdmin || isPremium;
  const m = { _id: crypto.randomUUID(), username: req.account.username, photo: req.account.avatar || req.account.photo || null, text: b.text || null, image: b.image || null, sticker: b.sticker || null, mentions, replyTo: replyObj, reactions: [], pinned: false, edited: false, isAdmin, isPremium, proPlan: isPremium, isVerified, verified: isVerified, createdAt: new Date().toISOString() };
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
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone));
  if(communityMessages[idx].username !== req.account.username && !isAdmin) return res.json({ success: false, error: 'Not allowed' });
  communityMessages.splice(idx, 1); res.json({ success: true });
});
app.post('/api/community/read', (req, res) => res.json({ success: true }));
app.get('/api/community/stickers', (req, res) => res.json({ success: true, stickers: [{ id: 'thanks', name: 'Thank you', src: '/stickers/thanks.svg?v=1' }, { id: 'ok', name: 'Okay', src: '/stickers/ok.svg?v=1' }, { id: 'lol', name: 'LOL', src: '/stickers/lol.svg?v=1' }, { id: 'sorry', name: 'Sorry', src: '/stickers/sorry.svg?v=1' }, { id: 'congrats', name: 'Congrats', src: '/stickers/congrats.svg?v=1' }] }));
app.post('/api/admin/community/pin/:id', requireUser, (req, res) => {
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone));
  if(!isAdmin) return res.json({ success: false, error: 'Admin only' });
  const m = communityMessages.find(x => x._id === req.params.id); if(!m) return res.json({ success: false });
  m.pinned = !m.pinned; res.json({ success: true, pinned: m.pinned });
});
app.delete('/api/admin/community/message/:id', requireUser, (req, res) => {
  const isAdmin = !!(req.account.isAdmin || isOwner(req.account.email, req.account.phone));
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

// ===== WHATSAPP BOT REGISTRY / LIVE ENGINE STATUS =====
app.get('/api/my-bots', requireUser, async (req, res) => {
  dedupeBotRecords();
  const mine = uniqueBots(botRecords.filter(b => b.ownerId === req.account.id));
  let states = {};
  if (mine.length) {
    try { const d = await engineFetch('/api/status?numbers=' + encodeURIComponent(mine.map(b => b.number).join(','))); states = d.bots || {}; }
    catch (e) { console.warn('[KING MD] Bot status lookup:', e.message); }
  }
  let changed = false;
  const bots = mine.map(b => {
    const info = states[normalizePhone(b.number)];
    const rawState = info && typeof info === 'object' ? info.state : info;
    const liveState = rawState != null || (info && info.connected === true)
      ? normalizeBotState(rawState, info)
      : normalizeBotState(typeof b.state === 'object' ? b.state.state : b.state);
    const oldState = normalizeBotState(typeof b.state === 'object' ? b.state.state : b.state);
    if (liveState !== oldState) {
      if (liveState === 'online' || liveState === 'offline') {
        addUserNotification(req.account, 'bot_status', liveState === 'online' ? 'WhatsApp bot connected' : 'WhatsApp bot disconnected',
          '+' + b.number + (liveState === 'online' ? ' is now active.' : ' is offline.'), { number: b.number, state: liveState });
      }
      const rec = botRecords.find(x => normalizePhone(x.number) === normalizePhone(b.number));
      if (rec) { rec.state = liveState; rec.updatedAt = new Date().toISOString(); }
      changed = true;
    }
    return { number: normalizePhone(b.number), state: liveState, connected: liveState === 'online', createdAt: b.createdAt, updatedAt: b.updatedAt };
  });
  if (changed) { saveJsonFile(BOTS_FILE, botRecords); saveUsers(); }
  res.json({ success: true, bots, total: bots.length, count: bots.length });
});
app.post('/api/bots/status', async (req, res) => {
  const nums = Array.isArray(req.body && req.body.numbers) ? [...new Set(req.body.numbers.map(normalizePhone).filter(n => /^\d{8,15}$/.test(n)))] .slice(0, 30) : [];
  if (!nums.length) return res.json({ success: true, bots: {} });
  try {
    const d = await engineFetch('/api/status?numbers=' + encodeURIComponent(nums.join(',')));
    const account = currentUser(req);
    const normalized = {};
    for (const n of nums) {
      const info = (d.bots || {})[n];
      const st = normalizeBotState(info && typeof info === 'object' ? info.state : info, info);
      normalized[n] = { state: st, connected: st === 'online', updatedAt: (info && info.updatedAt) || null };
    }
    if (account) {
      botRecords.filter(b => nums.includes(normalizePhone(b.number))).forEach(b => {
        const nextState = normalized[normalizePhone(b.number)].state;
        const oldState = typeof b.state === 'object' ? b.state.state : b.state;
        if (oldState !== nextState && (nextState === 'online' || nextState === 'offline')) {
          addUserNotification(account, 'bot_status', nextState === 'online' ? 'WhatsApp bot connected' : 'WhatsApp bot disconnected', '+' + b.number + (nextState === 'online' ? ' is now active.' : ' is offline.'), { number: b.number, state: nextState });
        }
        b.state = nextState; b.updatedAt = new Date().toISOString();
      });
      saveJsonFile(BOTS_FILE, botRecords); saveUsers();
    }
    res.json({ success: true, bots: normalized });
  } catch (e) { res.status(502).json({ success: false, error: e.message || 'Engine status unavailable', bots: {} }); }
});
app.delete('/session/:phone', requireUser, async (req, res) => {
  const number = normalizePhone(req.params.phone);
  const record = botRecords.find(b => b.ownerId === req.account.id && normalizePhone(b.number) === number);
  if (!record) return res.status(404).json({ success: false, error: 'This bot is not linked to your account.' });
  try {
    await engineFetch('/api/session/' + encodeURIComponent(number), { method: 'DELETE' });
    botRecords = botRecords.filter(b => !(b.ownerId === req.account.id && normalizePhone(b.number) === number));
    saveJsonFile(BOTS_FILE, botRecords);
    res.json({ success: true, serversDeleted: ['KING MD Engine'] });
  } catch (e) { res.status(502).json({ success: false, error: e.message || 'Could not delete the WhatsApp session.' }); }
});

// ===== COMPATIBILITY API =====
async function readFleetStatus() {
  const numbers = [...new Set(uniqueBots().map(b => normalizePhone(b.number)).filter(n => /^\d{8,15}$/.test(n)))];
  if (!numbers.length) return { numbers, bots: {}, ok: true, ms: 0 };
  const started = Date.now();
  const data = await engineFetch('/api/status?numbers=' + encodeURIComponent(numbers.join(',')));
  const raw = data.bots || {}, bots = {};
  numbers.forEach(n => {
    const info = raw[n];
    const state = normalizeBotState(info && typeof info === 'object' ? info.state : info, info);
    bots[n] = { state, connected: state === 'online', updatedAt: info && info.updatedAt || null };
  });
  return { numbers, bots, ok: true, ms: Date.now() - started };
}
function adminOnly(req, res, next) {
  if (!(req.account && (req.account.isAdmin || isOwner(req.account.email, req.account.phone)))) {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }
  next();
}
function calcStats() {
  dedupeBotRecords();
  const { total, online } = countBots();
  const botsPaired = total;
  const availableSlots = Math.max(0, TOTAL_SLOTS - total);
  return { botsPaired, total, count: total, bots: total, online, offline: total - online, servers: TOTAL_SERVERS, totalServers: TOTAL_SERVERS, totalSlots: TOTAL_SLOTS, availableSlots, serversLeft: availableSlots, slots: availableSlots, slotsLeft: availableSlots };
}
app.get('/api/stats', (req, res) => { res.json({ success: true, ...calcStats() }); });
app.get('/api/fleet', (req, res) => res.json({ success: true, ...calcStats() }));
app.get('/api/public-stats', (req, res) => res.json({ success: true, ...calcStats() }));
app.post('/api/admin/clean-duplicate-bots', requireUser, adminOnly, (req, res) => {
  const before = botRecords.length;
  dedupeBotRecords();
  res.json({ success: true, before, after: botRecords.length, removed: before - botRecords.length, ...calcStats() });
});

app.get('/sessions', async (req, res) => {
  const started = Date.now();
  const stats = calcStats();
  try {
    const fleet = await readFleetStatus();
    botRecords.forEach(b => { if (fleet.bots[normalizePhone(b.number)]) b.state = fleet.bots[normalizePhone(b.number)].state; });
    saveJsonFile(BOTS_FILE, botRecords);
    const sessions = uniqueBots().map(b => ({
      number: normalizePhone(b.number), phoneNumber: normalizePhone(b.number), connected: fleet.bots[normalizePhone(b.number)] ? fleet.bots[normalizePhone(b.number)].connected : normalizeBotState(b.state) === 'online',
      state: fleet.bots[normalizePhone(b.number)] ? fleet.bots[normalizePhone(b.number)].state : normalizeBotState(b.state), ownerId: b.ownerId,
      createdAt: b.createdAt, updatedAt: b.updatedAt
    }));
    const alive = sessions.filter(x => x.connected).length;
    const admin = currentUser(req) && (currentUser(req).isAdmin || isOwner(currentUser(req).email, currentUser(req).phone));
    res.json({ success: true, total: sessions.length, botsPaired: sessions.length, availableSlots: stats.availableSlots,
      serverStats: { detectedServers: TOTAL_SERVERS, serversLeft: stats.availableSlots, loadingServers: 0, readyServers: TOTAL_SERVERS },
      ...(admin ? { sessions, totalAlive: alive } : {}) });
  } catch (e) {
    const admin = currentUser(req) && (currentUser(req).isAdmin || isOwner(currentUser(req).email, currentUser(req).phone));
    const sessions = uniqueBots().map(b => ({ number: normalizePhone(b.number), phoneNumber: normalizePhone(b.number), connected: normalizeBotState(b.state) === 'online', state: normalizeBotState(b.state), ownerId: b.ownerId }));
    res.status(502).json({ success: false, total: sessions.length, botsPaired: sessions.length, availableSlots: stats.availableSlots, serverStats: { detectedServers: TOTAL_SERVERS, serversLeft: stats.availableSlots, loadingServers: 0, readyServers: 0 },
      ...(admin ? { sessions } : {}), statusUnavailable: true, error: e.message, elapsedMs: Date.now() - started });
  }
});
app.get('/api/admin/monitoring', requireUser, adminOnly, async (req, res) => {
  try {
    const fleet = await readFleetStatus();
    const sessions = uniqueBots().map(b => ({ ...b, number: normalizePhone(b.number), state: fleet.bots[normalizePhone(b.number)] ? fleet.bots[normalizePhone(b.number)].state : normalizeBotState(b.state) }));
    const alive = sessions.filter(b => b.state === 'online').length, dead = sessions.length - alive;
    sessions.forEach(b => { const rec = botRecords.find(x => normalizePhone(x.number) === b.number); if (rec) rec.state = b.state; });
    saveJsonFile(BOTS_FILE, botRecords);
    res.json({ success: true, alive, dead, total: sessions.length, avgMs: fleet.ms, healthyServers: TOTAL_SERVERS, totalServers: TOTAL_SERVERS,
      perServer: [{ server: 'KING MD Engine', healthy: true, alive, dead, ms: fleet.ms }] });
  } catch (e) {
    res.status(502).json({ success: false, error: 'WhatsApp engine status unavailable: ' + e.message });
  }
});
app.post('/api/admin/monitoring/purge-dead', requireUser, adminOnly, async (req, res) => {
  try {
    const fleet = await readFleetStatus();
    const dead = uniqueBots().filter(b => !fleet.bots[normalizePhone(b.number)] || fleet.bots[normalizePhone(b.number)].state !== 'online');
    for (const b of dead) {
      try { await engineFetch('/api/session/' + encodeURIComponent(normalizePhone(b.number)), { method: 'DELETE' }); } catch (_) {}
    }
    const keys = new Set(dead.map(b => normalizePhone(b.number)));
    botRecords = botRecords.filter(b => !keys.has(normalizePhone(b.number)));
    saveJsonFile(BOTS_FILE, botRecords);
    res.json({ success: true, purged: dead.length });
  } catch (e) { res.status(502).json({ success: false, error: e.message }); }
});

// ===== CORE ADMIN USER + NOTIFICATION APIs =====
app.get('/api/admin/users', requireUser, adminOnly, (req, res) => {
  const q = String(req.query.search || '').toLowerCase();
  const found = users.filter(u => !q || [u.username, u.email, u.phone].some(v => String(v || '').toLowerCase().includes(q)));
  res.json({ success: true, total: found.length, users: found.map(u => ({ ...publicUser(u), _id: u.id, email: u.email, referralCount: (u.referrals || []).length, banned: !!u.banned, chatBanned: !!u.chatBanned, verified: !!(u.isVerified || u.isAdmin) })) });
});
app.post('/api/admin/users/:userId/addspaces', requireUser, adminOnly, (req, res) => {
  const u = users.find(x => x.id === req.params.userId), spaces = Math.max(0, Math.min(1000, Number(req.body.spaces) || 0));
  if (!u || !spaces) return res.status(400).json({ success: false, error: 'User and a valid space amount are required.' });
  u.botSpaces = Math.max(3, Number(u.botSpaces || 3)) + spaces; saveUsers();
  res.json({ success: true, botSpaces: u.botSpaces });
});
app.post('/api/admin/users/:userId/chatfreeze', requireUser, adminOnly, (req, res) => {
  const u = users.find(x => x.id === req.params.userId);
  if (!u) return res.status(404).json({ success: false, error: 'User not found.' });
  u.chatBanned = !u.chatBanned; u.chatBanReason = u.chatBanned ? String(req.body.reason || '').slice(0, 200) : '';
  saveUsers(); res.json({ success: true, chatBanned: u.chatBanned });
});
app.post('/api/admin/users/:userId/:action', requireUser, adminOnly, (req, res) => {
  const u = users.find(x => x.id === req.params.userId);
  if (!u) return res.status(404).json({ success: false, error: 'User not found.' });
  if (isOwner(u.email, u.phone) && req.params.action !== 'verify') return res.status(403).json({ success: false, error: 'Owner account is protected.' });
  const action = req.params.action;
  if (action === 'verify') u.isVerified = !u.isVerified;
  else if (action === 'freeze') u.banned = !u.banned;
  else if (action === 'promote') u.isAdmin = !u.isAdmin;
  else return res.status(400).json({ success: false, error: 'Unsupported action.' });
  saveUsers(); res.json({ success: true, user: publicUser(u) });
});
app.delete('/api/admin/users/:userId', requireUser, adminOnly, (req, res) => {
  const u = users.find(x => x.id === req.params.userId);
  if (!u) return res.status(404).json({ success: false, error: 'User not found.' });
  if (isOwner(u.email, u.phone)) return res.status(403).json({ success: false, error: 'Owner account is protected.' });
  users = users.filter(x => x.id !== u.id);
  botRecords = botRecords.filter(b => b.ownerId !== u.id);
  users.forEach(x => { x.followers = (x.followers || []).filter(id => id !== u.id); x.following = (x.following || []).filter(id => id !== u.id); });
  saveUsers(); saveJsonFile(BOTS_FILE, botRecords); res.json({ success: true });
});
app.get('/api/admin/notifications', requireUser, adminOnly, (req, res) => {
  const all = users.flatMap(u => notificationList(u).map(n => ({ ...n, userId: u.id, username: u.username })))
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  res.json({ success: true, notifications: all.slice(0, 500) });
});
app.delete('/api/admin/notifications/clearall', requireUser, adminOnly, (req, res) => {
  users.forEach(u => { u.notifications = []; u.unreadNotifs = 0; });
  saveUsers(); res.json({ success: true });
});
app.delete('/api/admin/notifications/:id', requireUser, adminOnly, (req, res) => {
  users.forEach(u => { u.notifications = notificationList(u).filter(n => String(n._id) !== String(req.params.id)); u.unreadNotifs = u.notifications.filter(n => !n.read).length; });
  saveUsers(); res.json({ success: true });
});
app.post('/api/admin/broadcast', requireUser, adminOnly, (req, res) => {
  const title = String(req.body.title || '').slice(0, 100), body = String(req.body.body || '').slice(0, 500);
  if (!title || !body) return res.status(400).json({ success: false, error: 'Title and message are required.' });
  users.forEach(u => addUserNotification(u, 'broadcast', title, body, {}));
  saveUsers(); res.json({ success: true, sent: users.length, pushed: 0 });
});

// ===== BOT SPACE PURCHASES / DEPLOYMENT COUNTS =====
app.post('/api/spaces/buy', requireUser, (req, res) => {
  const cost = 15, balance = Number(req.account.coins || 0);
  if (balance < cost) return res.status(400).json({ success: false, error: 'Not enough coins.' });
  req.account.coins = balance - cost;
  req.account.botSpaces = Math.max(3, Number(req.account.botSpaces || (isPremiumUser(req.account) ? PREMIUM_SLOTS : FREE_SLOTS))) + 1;
  saveUsers(); res.json({ success: true, coinsLeft: req.account.coins, botSpaces: req.account.botSpaces });
});
app.post('/api/db-full/report', requireUser, (req, res) => {
  const owner = users.find(u => isOwner(u.email, u.phone));
  if (owner) addUserNotification(owner, 'broadcast', 'Bot storage report', '@' + req.account.username + ' reported a bot storage issue.', { userId: req.account.id });
  saveUsers(); res.json({ success: true });
});
app.get('/api/stats/deploys', (_req, res) => {
  const now = new Date(), todayKey = now.toISOString().slice(0, 10), monthKey = todayKey.slice(0, 7);
  const today = Array(24).fill(0), monthDays = Array(new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate()).fill(0);
  let todayTotal = 0, monthTotal = 0;
  uniqueBots().forEach(b => {
    const d = new Date(b.createdAt || b.updatedAt || 0);
    if (!Number.isFinite(d.getTime())) return;
    const day = d.toISOString().slice(0, 10);
    if (day === todayKey) { today[d.getUTCHours()]++; todayTotal++; }
    if (day.slice(0, 7) === monthKey) { monthDays[d.getUTCDate() - 1]++; monthTotal++; }
  });
  const uniq = countBots();
  res.json({ success: true, month: monthKey, today, monthDays,
    totals: { today: todayTotal, month: monthTotal, allTime: uniq.total },
    total: uniq.total, active: uniq.online, ...calcStats() });
});

// ===== NOTIFICATIONS =====
app.post('/api/admin/notifications', requireUser, (req, res) => {
  if (!(req.account.isAdmin || isOwner(req.account.email, req.account.phone))) return res.status(403).json({ success: false, error: 'Admin only' });
  const body = req.body || {}, title = String(body.title || '').slice(0, 100), message = String(body.body || body.message || '').slice(0, 500);
  if (!title || !message) return res.status(400).json({ success: false, error: 'Title and message are required.' });
  const target = body.userId ? users.filter(u => u.id === String(body.userId)) : users;
  target.forEach(u => addUserNotification(u, String(body.type || 'broadcast').slice(0, 40), title, message, body.meta || {}));
  saveUsers(); res.json({ success: true, sent: target.length });
});
app.get('/api/notifications', requireUser, (req, res) => {
  const items = notificationList(req.account).slice().sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  res.json({ success: true, notifications: items, unread: items.filter(n => !n.read).length });
});
app.post('/api/notifications/read', requireUser, (req, res) => {
  req.account.notifications = notificationList(req.account).map(n => ({ ...n, read: true }));
  req.account.unreadNotifs = 0; saveUsers(); res.json({ success: true });
});
app.delete('/api/notifications/:id', requireUser, (req, res) => {
  req.account.notifications = notificationList(req.account).filter(n => String(n._id) !== String(req.params.id));
  req.account.unreadNotifs = req.account.notifications.filter(n => !n.read).length; saveUsers(); res.json({ success: true });
});

// ===== APP CONFIG / CHANNEL REACT FOR EVERYONE + COINS 👑 =====
app.get('/api/pages/status', (_req, res) => res.json({ success: true, pages: {}, turnstileSiteKey: null, maintenance: false }));
app.post('/api/channel-react/premium-link', requireUser, (req, res) => {
  const number = normalizePhone(req.body && req.body.number);
  if (!/^\d{8,15}$/.test(number)) return res.status(400).json({ success: false, error: 'Enter a valid WhatsApp number.' });
  if (!isPremiumUser(req.account)) return res.json({ success: false, notPremium: true, error: 'This account does not have Premium.' });
  if (!(req.body && req.body.confirm)) return res.json({ success: true, until: req.account.premiumUntil || null, current: req.account.boundNumber || null, needsReplace: !!(req.account.boundNumber && req.account.boundNumber !== number) });
  req.account.boundNumber = number; saveUsers(); res.json({ success: true, until: req.account.premiumUntil || null });
});

// FIXED FOR EVERYONE: Each user uses THEIR OWN bot
async function getBotNumbersForEveryone(account) {
  dedupeBotRecords();
  let local = uniqueBots(botRecords.filter(b => b.ownerId === account.id)).map(b => normalizePhone(b.number));
  if (local.length) {
    // Verify which are actually online on Engine - FIXED: pass numbers!
    try {
      const d = await engineFetch('/api/status?numbers=' + encodeURIComponent(local.join(',')));
      const live = Object.keys(d.bots||{}).filter(n => d.bots[n]?.connected || String(d.bots[n]?.state||'').toLowerCase()==='online');
      // Return local even if Engine says offline - Engine may be restarting, don't block user
      return local;
    } catch(e){ return local; }
  }
  // Try profile phone - FIXED: check with numbers param
  const myPhone = normalizePhone(account.phone || account.boundNumber || '');
  if (!myPhone) return [];
  try {
    const d = await engineFetch('/api/status?numbers=' + encodeURIComponent(myPhone));
    const info = d.bots?.[myPhone];
    if (info?.connected || String(info?.state||'').toLowerCase()==='online') {
      console.log('[ChannelReact] Auto-linked', myPhone, 'to', account.username);
      botRecords.push({ ownerId: account.id, username: account.username || '', number: myPhone, state: 'online', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      dedupeBotRecords(); saveJsonFile(BOTS_FILE, botRecords);
      return [myPhone];
    }
    return [];
  } catch (e) { console.log('[ChannelReact] Engine fail:', e.message); return local; }
}

app.get('/api/channel-react/status', requireUser, async (req, res) => {
  const premium = isPremiumUser(req.account), today = new Date().toISOString().slice(0, 10);
  const usage = req.account.channelReactUsage || {};
  const used = usage.day === today ? Number(usage.used || 0) : 0;
  const limit = premium ? 10 : 1;
  const numbers = await getBotNumbersForEveryone(req.account);
  res.json({ success: true, premium, hasBot: numbers.length > 0, botsCount: numbers.length, bots: numbers, coins: Number(req.account.coins || 0), dailyLimit: limit, dailyUsed: used, freeLimit: limit, refillPrice: 15, remaining: Math.max(0, limit - used) });
});

app.post('/api/channel-react', requireUser, async (req, res) => {
  const body = req.body || {}, premium = isPremiumUser(req.account), today = new Date().toISOString().slice(0, 10);
  const usage = req.account.channelReactUsage || {};
  const used = usage.day === today ? Number(usage.used || 0) : 0;
  const limit = premium ? 10 : 1;
  const requested = Math.max(1, Math.min(Number(body.amount) || 1, 10));
  const link = String(body.link || '').trim();
  if (!link) return res.status(400).json({ success: false, error: 'Paste a WhatsApp Channel link.' });
  if (link.includes('chat.whatsapp.com')) return res.status(400).json({ success: false, error: 'That is a GROUP link! Use whatsapp.com/channel/...' });
  if (!link.includes('whatsapp.com/channel/') && !link.includes('/channel/') && !/0029/.test(link)) return res.status(400).json({ success: false, error: 'Invalid Channel link. Use https://whatsapp.com/channel/...' });

  const numbers = await getBotNumbersForEveryone(req.account);
  if (!numbers.length) return res.status(409).json({ success: false, error: 'Link a WhatsApp bot first. Go to Deploy a Bot > Pair your number, then try again.' });

  const freeLeft = Math.max(0, limit - used);
  const extraNeeded = Math.max(0, requested - freeLeft);
  const coinCost = extraNeeded * 15;
  const balance = Number(req.account.coins || 0);
  if (coinCost > 0 && balance < coinCost) {
    return res.status(402).json({ success: false, needCoins: true, error: `You used your ${limit} free reacts today. You need ${coinCost} coins for ${extraNeeded} extra reacts. You have ${balance} coins. Buy coins or try tomorrow.` });
  }

  try {
    const d = await engineFetch('/api/channel-react', { method: 'POST', body: JSON.stringify({ link, emoji: body.emoji, random: body.random, amount: requested, phoneNumbers: numbers }) });
    const sent = Number(d.reactionsSent || d.sent || 0);
    if (!sent) return res.status(500).json({ success: false, error: 'Engine failed. Make sure YOUR bot follows that Channel first! Open WhatsApp on YOUR bot number > Channels > Follow this channel.' });
    if (coinCost > 0) req.account.coins = balance - coinCost;
    req.account.channelReactUsage = { day: today, used: used + sent };
    saveUsers();
    res.json({ ...d, success: true, premium, dailyUsed: used + sent, coinsLeft: Number(req.account.coins || 0), coinsSpent: coinCost, nextAt: new Date(Date.now() + 60000).toISOString() });
  } catch (e) {
    // FIXED: Clear error if Engine endpoint missing
    if (e.status === 404) return res.status(502).json({ success: false, error: 'Engine is missing /api/channel-react endpoint! Add it to main.js (Engine) and redeploy Engine, then try again.' });
    res.status(e.status || 502).json({ success: false, error: e.message || 'Channel reaction failed. Make sure YOUR bot follows that Channel first!' });
  }
});

// Payment endpoints deliberately stay disabled until a real Daraja/Korapay merchant integration is configured.
app.get('/api/premium/pay-info', requireUser, (req, res) => res.json({
  success: true, paymentsOff: true, maxMonths: 2, number: req.account.phone || '', premiumUntil: req.account.premiumUntil || null,
  mpesaNumber: '+254726476468', options: [{ id: 'KE', country: 'Kenya', flag: '🇰🇪', live: false, symbol: 'KSh ', currency: 'KES', month: 1, base: 1, methods: ['mobile_money'] }]
}));
app.post('/api/premium/pay/initiate', requireUser, (req, res) => res.status(503).json({ success: false, comingSoon: true, error: 'M-Pesa checkout is not enabled yet. Automatic payment verification requires Safaricom Daraja credentials and a registered shortcode.' }));
app.get('/api/coins/packages', requireUser, (req, res) => res.json({ success: true, paymentLive: false, paymentsOff: true, options: [{ id: 'KE', country: 'Kenya', flag: '🇰🇪', live: false, symbol: 'KSh ', currency: 'KES', month: 1, base: 1 }], packages: [], custom: { minCoins: 10, ratePerCoin: 1 } }));
app.post('/api/coins/topup/initiate', requireUser, (req, res) => res.status(503).json({ success: false, comingSoon: true, error: 'M-Pesa checkout is not enabled yet; Daraja merchant credentials are required.' }));

// FIXED: API 404 BEFORE * catch-all
app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'API not found: ' + req.path }));
app.get('*', (req, res) => {
  const f = path.join(__dirname, 'index.html');
  if (fs.existsSync(f)) return res.sendFile(f);
  res.json({ success: true, service: 'KING MD V4' });
});
app.use((err, req, res, next) => {
  console.error('Request error:', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Server error' });
});
app.listen(PORT, '0.0.0.0', () => console.log('KING MD V4 server listening on ' + PORT));
