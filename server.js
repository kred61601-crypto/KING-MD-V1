// KING MD V4 - SERVER
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');
const pendingCodes = new Map();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('Data directory:', e.message); }
function loadUsers() { try { const x = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); return Array.isArray(x) ? x : []; } catch (_) { return []; } }
function saveUsers() { try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), { mode: 0o600 }); } catch (e) { console.error('Could not save users:', e.message); } }

let users = loadUsers(); // User accounts persist on Render when DATA_DIR is mounted on a disk.

let communityMessages = [
  { _id: 'welcome1', username: 'admin', text: 'Welcome to KING MD V4 Community! 👑', createdAt: new Date().toISOString(), reactions: [], pinned: true, isAdmin: true }
];

function auth(req, res, next){
  const h = req.headers.authorization || '';
  const token = (req.headers['x-auth-token'] || h.replace(/^Bearer\s+/i, '') || '').trim();
  if(!token){ req.user = null; return next(); }
  try{ req.user = jwt.verify(token, SECRET); } catch(e){ req.user = null; }
  next();
}
app.use(auth);

// --- AUTH ---
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.json({ success: false, error: 'Username + password needed' });
  if(users.find(u => u.username.toLowerCase() === username.toLowerCase())) return res.json({ success: false, error: 'Username taken' });
  const user = { id: Date.now().toString(), username, password: bcrypt.hashSync(password, 10), isAdmin: false, followers: [], following: [], likes: 0, coins: 10, bots: [] };
  users.push(user);
  saveUsers();
  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: false }, SECRET);
  res.json({ success: true, token, user: { username, isAdmin: false, coins: 10 } });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username.toLowerCase() === (username||'').toLowerCase());
  if(!user) return res.json({ success: false, error: 'User not found' });
  if(!bcrypt.compareSync(password, user.password)) return res.json({ success: false, error: 'Wrong password' });
  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, SECRET);
  res.json({ success: true, token, user: { username: user.username, isAdmin: user.isAdmin, coins: user.coins } });
});

// Google/GitHub OAuth routes used by the frontend. Configure credentials in Render.
function oauthSettings(provider) {
  const prefix = provider.toUpperCase();
  return { id: process.env[prefix + '_CLIENT_ID'], secret: process.env[prefix + '_CLIENT_SECRET'], callback: APP_URL + '/api/auth/' + provider + '/callback' };
}
app.get('/api/auth/:provider/start', (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!['google', 'github'].includes(provider)) return res.status(404).send('Unsupported provider');
  const cfg = oauthSettings(provider);
  if (!APP_URL || !cfg.id || !cfg.secret) return res.status(503).send('Login is not configured. Add APP_URL, ' + provider.toUpperCase() + '_CLIENT_ID and ' + provider.toUpperCase() + '_CLIENT_SECRET in Render environment variables.');
  const state = jwt.sign({ provider }, SECRET, { expiresIn: '10m' });
  const url = provider === 'google'
    ? 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: cfg.id, redirect_uri: cfg.callback, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' })
    : 'https://github.com/login/oauth/authorize?' + new URLSearchParams({ client_id: cfg.id, redirect_uri: cfg.callback, scope: 'read:user user:email', state });
  res.redirect(url);
});
app.get('/api/auth/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const fail = msg => res.redirect('/?authError=' + encodeURIComponent(msg));
  try {
    if (!['google', 'github'].includes(provider)) return res.status(404).send('Unsupported provider');
    const state = jwt.verify(String(req.query.state || ''), SECRET);
    if (state.provider !== provider || !req.query.code) return fail('Login verification failed. Please try again.');
    const cfg = oauthSettings(provider);
    const tr = await fetch(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: cfg.id, client_secret: cfg.secret, code: req.query.code, redirect_uri: cfg.callback }) });
    const td = await tr.json();
    if (!tr.ok || !td.access_token) return fail('OAuth credentials or callback URL are incorrect.');
    const headers = { Authorization: 'Bearer ' + td.access_token, Accept: 'application/json', 'User-Agent': 'KING-MD' };
    let profile;
    if (provider === 'google') {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers }); profile = await r.json();
      if (!r.ok || !profile.id || !profile.email || profile.verified_email === false) return fail('Google did not provide a verified email.');
    } else {
      const r = await fetch('https://api.github.com/user', { headers }); profile = await r.json();
      if (!r.ok || !profile.id) return fail('Could not read GitHub profile.');
      if (!profile.email) { const er = await fetch('https://api.github.com/user/emails', { headers }); const emails = er.ok ? await er.json() : []; const e = Array.isArray(emails) && (emails.find(x => x.primary && x.verified) || emails.find(x => x.verified)); profile.email = e && e.email; }
    }
    const email = String(profile.email || '').toLowerCase().trim();
    if (!email) return fail('Add a verified email address to your provider account and try again.');
    let user = users.find(u => u.email && u.email.toLowerCase() === email);
    if (!user) {
      let username = String(profile.name || profile.login || email.split('@')[0]).replace(/[^a-z0-9_.-]/gi, '').slice(0, 24) || 'member';
      let base = username, n = 1; while (users.some(u => u.username.toLowerCase() === username.toLowerCase())) username = base.slice(0, 20) + (++n);
      user = { id: crypto.randomUUID(), username, email, provider, isAdmin: false, followers: [], following: [], likes: 0, coins: 10, bots: [] }; users.push(user);
    } else { user.email = email; user.provider = provider; }
    saveUsers();
    const code = crypto.randomBytes(32).toString('hex');
    pendingCodes.set(code, { token: jwt.sign({ id: user.id, username: user.username, isAdmin: !!user.isAdmin }, SECRET, { expiresIn: '30d' }), time: Date.now() });
    res.redirect('/?authCode=' + encodeURIComponent(code));
  } catch (e) { console.error('OAuth callback:', e.message); return fail('Could not complete login. Check Render logs and OAuth settings.'); }
});
app.post('/api/auth/exchange', (req, res) => {
  const code = String(req.body && req.body.code || ''); const item = pendingCodes.get(code); pendingCodes.delete(code);
  if (!item || Date.now() - item.time > 300000) return res.status(401).json({ success: false, error: 'Login code expired. Please try again.' });
  let payload; try { payload = jwt.verify(item.token, SECRET); } catch (_) { return res.status(401).json({ success: false, error: 'Login expired.' }); }
  const user = users.find(u => u.id === payload.id); if (!user) return res.status(401).json({ success: false, error: 'Account not found.' });
  const clean = { ...user }; delete clean.password; res.json({ success: true, token: item.token, user: clean });
});
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Please sign in.' });
  const user = users.find(u => u.id === req.user.id); if (!user) return res.status(401).json({ success: false, error: 'Account not found.' });
  const clean = { ...user }; delete clean.password; res.json({ success: true, user: clean });
});
app.post('/api/logout', (req, res) => res.json({ success: true }));

app.get('/api/health', (req, res) => res.json({ success: true, service: 'KING MD', status: 'ok' }));

// --- COMMUNITY ---
app.get('/api/community/status', (req, res) => res.json({ success: true, enabled: true, locked: false }));
app.get('/api/community/messages', (req, res) => res.json({ success: true, messages: communityMessages.slice(-40), pinnedCount: 1, hasMore: false }));
app.get('/api/community/since', (req, res) => {
  const after = Number(req.query.after) || 0;
  res.json({ success: true, messages: communityMessages.filter(m => new Date(m.createdAt).getTime() > after) });
});
app.get('/api/community/pinned', (req, res) => res.json({ success: true, messages: communityMessages.filter(m=>m.pinned) }));
app.get('/api/community/live', (req, res) => res.json({ success: true, online: 1, typing: [] }));
app.post('/api/community/typing', (req, res) => res.json({ success: true }));
app.post('/api/community/message', (req, res) => {
  if(!req.user) return res.json({ success: false, error: 'Sign in to chat' });
  const { text, image, sticker } = req.body || {};
  if(!text && !image && !sticker) return res.json({ success: false, error: 'Empty' });
  const msg = { _id: Date.now().toString(), username: req.user.username, text: text||null, image: image||null, sticker: sticker||null, reactions: [], pinned: false, edited: false, isAdmin: !!req.user.isAdmin, createdAt: new Date().toISOString() };
  communityMessages.push(msg);
  res.json({ success: true, message: msg });
});
app.post('/api/community/react', (req, res) => {
  const msg = communityMessages.find(m=>m._id===req.body.id);
  if(!msg) return res.json({ success: false });
  msg.reactions = (msg.reactions||[]).filter(r=>r.n!==req.user?.username);
  msg.reactions.push({ e: req.body.emoji, n: req.user?.username });
  res.json({ success: true, reactions: msg.reactions });
});
app.get('/api/community/stickers', (req, res) => res.json({ success: true, stickers: [{id:'thanks',name:'Thank you'},{id:'ok',name:'Okay'},{id:'lol',name:'LOL'}] }));

// --- AI CHAT ---
app.post('/api/ai/chat', (req, res) => {
  const q = (req.body?.message || req.body?.prompt || '').toLowerCase();
  let reply = "I am KING MD V4 AI. Ask me how to pair your bot, deploy it, or fix an error!";
  if(q.includes('pair') || q.includes('link')) reply = "To pair: Go to Deploy a Bot > Enter WhatsApp number > Get Pairing Code > WhatsApp > Linked Devices > Link with code. Code expires in 60 seconds!";
  else if(q.includes('deploy')) reply = "To deploy: Go to Deploy a Bot, choose plan, enter number, tap Deploy. Bot comes online in 1-2 minutes.";
  else if(q.includes('hello') || q.includes('hi')) reply = "Hello King! 👑 Welcome to KING MD V4. How can I help?";
  res.json({ success: true, reply, response: reply });
});
app.post('/api/chat', (req, res) => res.redirect(307, '/api/ai/chat'));

// --- PROFILE ---
app.get('/api/users/:username', (req, res) => {
  const u = users.find(x=>x.username.toLowerCase()===req.params.username.toLowerCase());
  if(!u) return res.json({ success: false, error: 'User not found' });
  res.json({ success: true, user: { username: u.username, isAdmin: u.isAdmin, followers: 0, following: 0, likes: 0, coins: u.coins, bots: [] } });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('KING MD V4 running on ' + PORT));
