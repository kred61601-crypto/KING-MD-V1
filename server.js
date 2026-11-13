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
const ENGINE_URL = (process.env.ENGINE_URL || 'https://king-md-engine-t49k.onrender.com').replace(/\/+$/, '');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('CONFIG ERROR: Set JWT_SECRET to a random secret of at least 32 characters in Render.');
}
const SECRET = JWT_SECRET || crypto.randomBytes(48).toString('hex');

// ===== KING MD - REAL GLOBAL SLOTS 👑 - NO FAKE =====
// REAL: You have 1 Engine. Do NOT set TOTAL_SERVERS=270 in Render - that was fake.
// TOTAL_SLOTS = 1 Engine * SLOTS_PER_SERVER. When REAL bots reach TOTAL_SLOTS, slots = 0 -> time to upgrade / add Engine.
const TOTAL_SERVERS = 1;
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
async function engineFetch(route, options) {
  const base = ENGINE_URL;
  const response = await fetch(base + route, { ...(options || {}), headers: { 'content-type': 'application/json', 'x-pair-bridge-key': PAIR_BRIDGE_KEY, ...((options || {}).headers || {}) }, signal: (options || {}).signal || AbortSignal.timeout(30000) });
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
let messages = [{ _id: 'welcome1', username: 'KING MD', text: 'Welcome to KING MD V4 Community! 👑', createdAt: new Date().toISOString(), reactions: [], pinned: true, isAdmin: true, isVerified: true, isPremium: true }];
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

    const rawCode = data.pairingCode || data.kingCode || data.displayCode || '';
    const code = String(rawCode).trim();

    if (!code || !/^[A-Z0-9]{6,20}$/i.test(code.replace(/\s+/g, ''))) {
      return res.status(502).json({ success: false, error: 'Engine returned an invalid pairing code.' });
    }

    if (req.user && req.user.id) {
      const existing = botRecords.find(b => b.ownerId === req.user.id && normalizePhone(b.number) === phoneNumber);
      const record = { ownerId: req.user.id, username: req.user.username || '', number: phoneNumber, deviceId: String(body.deviceId || '').slice(0, 100), state: 'pairing', createdAt: existing ? existing.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (existing) Object.assign(existing, record); else botRecords.push(record);
      dedupeBotRecords(); saveJsonFile(BOTS_FILE, botRecords);
    }
    res.json({ success:true, pairingCode: code, kingCode: code, displayCode: code, serverInfo: { serverUsed: 'KING MD Engine' } });
  } catch (error) {
    console.error('Pairing engine request failed:', error.message);
    res.status(502).json({ success:false, error:'Pairing engine is offline or still starting. Please try again shortly.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'KING MD V4' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'KING MD V4' }));
