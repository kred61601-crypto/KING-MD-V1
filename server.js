// KING MD V4 — FULL FIXED server.js - Admin + Public Blue Tick ✔️
// APP SIDE - This file does NOT connect to WhatsApp directly.
// It only forwards pairing to the Engine.
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
// FIXED: Use env first so App and Engine always match. Fallback to same default as bridge.js
const PAIR_BRIDGE_KEY = process.env.PAIR_BRIDGE_KEY || 'uFOg2BeCn3EJV6tf1fdXbsMSwshScKuzFDQwvoh68jx59ftO';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('CONFIG ERROR: Set JWT_SECRET to a random secret of at least 32 characters in Render.');
}
const SECRET = JWT_SECRET || crypto.randomBytes(48).toString('hex');
fs.mkdirSync(DATA_DIR, { recursive: true });
function loadJsonFile(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; } }
function saveJsonFile(file, value) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(tmp, file); }
let botRecords = loadJsonFile(BOTS_FILE, []); if (!Array.isArray(botRecords)) botRecords = [];
const notificationList = user => Array.isArray(user.notifications) ? user.notifications : [];
function addUserNotification(user, type, title, body, meta) {
  if (!Array.isArray(user.notifications)) user.notifications = [];
  user.notifications.unshift({ _id: crypto.randomBytes(9).toString('hex'), type, title, body, meta: meta || {}, read: false, createdAt: new Date().toISOString() });
  user.notifications = user.notifications.slice(0, 100);
  user.unreadNotifs = user.notifications.filter(n => !n.read).length;
}
async function engineFetch(route, options) {
  const base = (process.env.ENGINE_URL || 'https://king-md-engine.onrender.com').replace(/\/+$/, '');
  const response = await fetch(base + route, { ...(options || {}), headers: { 'content-type': 'application/json', 'x-pair-bridge-key': PAIR_BRIDGE_KEY, ...((options || {}).headers || {}) }, signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) { const error = new Error(data.error || 'WhatsApp engine request failed'); error.status = response.status || 502; throw error; }
  return data;
}

// ===== OWNER ACCOUNT =====
const ADMIN_EMAILS = ['affiliateguru547@gmail.com'];
const ADMIN_PHONES = ['254726476468'];
function normalizePhone(p){
  let s = String(p||'').replace(/[\s\-\(\)\+]/g,'');
  if(s.startsWith('0')) s = '254' + s.slice(1);
  return s;
}
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
  x.botSpaces = Number(u.botSpaces || (x.isPremium ? 6 : 3));
  x.usedSpaces = botRecords.filter(b => b.ownerId === u.id).length;
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
// DO NOT put sessions/Safari here. This file has no Baileys.
// It only forwards to Engine.
const ENGINE_URL = (process.env.ENGINE_URL || 'https://king-md-engine.onrender.com').replace(/\/+$/, '');
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
  const phoneNumber = String(body.phoneNumber || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(phoneNumber)) return res.status(400).json({ success:false, error:'Enter a valid phone number with country code.' });
  const account = currentUser(req);
  if (account) {
    const alreadyOwned = botRecords.some(b => b.ownerId === account.id && b.number === phoneNumber);
    const allowed = Math.max(3, Number(account.botSpaces || (isPremiumUser(account) ? 6 : 3)));
    const used = botRecords.filter(b => b.ownerId === account.id).length;
    if (!alreadyOwned && used >= allowed) return res.status(403).json({ success:false, code:'NO_BOT_SPACE', error:'You have used all ' + allowed + ' bot spaces.' });
  }
  try {
    const upstream = await fetch(ENGINE_URL + '/api/pair', {
      method: 'POST', headers: { 'content-type':'application/json', 'x-pair-bridge-key':PAIR_BRIDGE_KEY },
      body: JSON.stringify({ phoneNumber }) , signal: AbortSignal.timeout(90000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.status === 409 && data.code === 'ALREADY_CONNECTED') {
      if (req.user && req.user.id) {
        const existing = botRecords.find(b => b.ownerId === req.user.id && b.number === phoneNumber);
        const record = { ownerId: req.user.id, username: req.user.username || '', number: phoneNumber, deviceId: String(body.deviceId || '').slice(0, 100), state: 'online', createdAt: existing ? existing.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (existing) Object.assign(existing, record); else botRecords.push(record); saveJsonFile(BOTS_FILE, botRecords);
      }
      return res.json({ success: true, alreadyConnected: true, state: 'online', serverInfo: { serverUsed: 'KING MD Engine' } });
    }
    if (!upstream.ok || !data.success) return res.status(upstream.status || 502).json({ success:false, error:data.error || 'The bot engine could not generate a pairing code.' });
    if (req.user && req.user.id) {
      const existing = botRecords.find(b => b.ownerId === req.user.id && b.number === phoneNumber);
      const record = { ownerId: req.user.id, username: req.user.username || '', number: phoneNumber, deviceId: String(body.deviceId || '').slice(0, 100), state: 'pairing', createdAt: existing ? existing.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (existing) Object.assign(existing, record); else botRecords.push(record);
      saveJsonFile(BOTS_FILE, botRecords);
    }
    res.json({ success:true, pairingCode:data.pairingCode, state:data.state || 'pairing', serverInfo:{ serverUsed:'KING MD Engine' } });
  } catch (error) {
    console.error('Pairing engine request failed:', error.message);
    res.status(502).json({ success:false, error:'Pairing engine is offline or still starting. Please try again shortly.' });
  }
});

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
    const owner = isOwner(email, phone);
    const u = { id: crypto.randomUUID(), username, email, phone, password: await bcrypt.hash(password, 12), provider:'email', firstName, lastName, name, photo:'', avatar:'', cover:'', bio:'', accentColor:'pink', isAdmin: owner, isVerified: owner, isPremium: owner, followers:[], following:[], likes:0, coins:3, bots:[], createdAt:new Date().toISOString(), hideBalance:false, hideFollowers:false, hideFollowing:false, hideLikes:false, apiKeys:[] };
    users.push(u); saveUsers(); res.status(201).json({ success:true, token:tokenFor(u), user:publicUser(u), signupBonusCoins:3 });
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
    console.error('O
