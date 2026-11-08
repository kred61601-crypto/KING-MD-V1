// KING MD V4 - SERVER
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const SECRET = process.env.JWT_SECRET || 'kingmdv4secret123';

let users = [
  { id: '1', username: 'admin', password: bcrypt.hashSync('admin123', 10), isAdmin: true, followers: [], following: [], likes: 0, coins: 100, bots: [] }
];

let communityMessages = [
  { _id: 'welcome1', username: 'admin', text: 'Welcome to KING MD V4 Community! 👑', createdAt: new Date().toISOString(), reactions: [], pinned: true, isAdmin: true }
];

function auth(req, res, next){
  const h = req.headers.authorization || '';
  const token = h.replace('Bearer ', '');
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

app.get('/api/auth/google', (req, res) => res.redirect('/?login=google'));
app.get('/api/auth/github', (req, res) => res.redirect('/?login=github'));

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
