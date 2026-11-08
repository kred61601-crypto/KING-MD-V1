// ===== KING MD V4 - COMMUNITY CHAT BACKEND - FIXED ADMIN + PUBLIC BLUE TICK =====
// Put this in server.js AFTER: const app = express(); app.use(express.json());
// And BEFORE: app.listen(...)

const communityMessages = []; // fallback if no MongoDB
let pinnedCount = 0;
let onlineUsers = new Map(); // username -> lastSeen
let typingUsers = new Map(); // username -> time

// ===== YOUR ADMIN - SAME AS server.js =====
const ADMIN_EMAILS_CHAT = ['affiliateguru547@gmail.com'];
const ADMIN_PHONES_CHAT = ['254726476468', '+254726476468', '0726476468', '726476468'];
const ADMIN_USERNAMES_CHAT = ['affiliateguru54', 'affiliateguru547', 'denzel', 'kingmd', 'king_md'];
function normalizePhoneChat(p){
  let s = String(p||'').replace(/[\s\-\(\)\+]/g,'');
  if(s.startsWith('0')) s = '254' + s.slice(1);
  return s;
}
function isOwnerChat(email, phone, username){
  const e = String(email||'').toLowerCase().trim();
  const ph = normalizePhoneChat(phone||'');
  const u = String(username||'').toLowerCase().trim();
  if(ADMIN_EMAILS_CHAT.includes(e)) return true;
  if(ADMIN_PHONES_CHAT.includes(ph) || ADMIN_PHONES_CHAT.includes(String(phone||'').trim())) return true;
  if(ADMIN_USERNAMES_CHAT.includes(u)) return true;
  return false;
}
function isAdminChatUser(account, username){
  if(!account && !username) return false;
  // 1. From server.js login - req.account is the real user
  if(account){
    if(account.isAdmin || account.isVerified) return true;
    if(isOwnerChat(account.email, account.phone, account.username)) return true;
  }
  // 2. Fallback by username header
  if(username && isOwnerChat('', '', username)) return true;
  return false;
}

// Helper - get user from your login (uses req.account from server.js auth)
function getChatUser(req){
  // Real login from server.js: req.account is set by auth middleware
  if(req.account) return req.account;
  // Fallback: find by username header / body
  const username = req.headers['x-username'] || (req.body && req.body.username) || null;
  if(username){
    // Try to find real user in users array from server.js
    try{
      const found = (typeof users !== 'undefined' ? users.find(u => u.username.toLowerCase() === String(username).toLowerCase()) : null);
      if(found) return found;
    }catch(_){}
    return { username, email: '', phone: '' };
  }
  return null;
}
function getChatUsername(req){
  const u = getChatUser(req);
  return u ? (u.username || u.name || 'Guest') : 'Guest';
}
function getChatIsAdmin(req){
  const u = getChatUser(req);
  const username = getChatUsername(req);
  return isAdminChatUser(u, username);
}
function getChatIsVerified(req){
  const u = getChatUser(req);
  if(u && (u.isVerified || u.isAdmin)) return true;
  return getChatIsAdmin(req);
}

// 1. Is chat enabled?
app.get('/api/community/status', (req, res) => {
  res.json({ success: true, enabled: true, locked: false, lockedAdminOnly: false });
});

// 2. Get messages - this is the one that was failing for you
app.get('/api/community/messages', async (req, res) => {
  try {
    const before = Number(req.query.before) || Date.now();
    const limit = Math.min(Number(req.query.limit) || 40, 40);
    let list = communityMessages.filter(m => new Date(m.createdAt).getTime() < before);
    list = list.slice(-limit);
    // Force PUBLIC blue tick for admin messages even if old message
    list = list.map(m => {
      if(isOwnerChat('', '', m.username)) { m.isAdmin = true; m.isVerified = true; m.verified = true; }
      return m;
    });
    const pinned = communityMessages.filter(m => m.pinned).length;
    res.json({ success: true, messages: list, pinnedCount: pinned, hasMore: communityMessages.length > list.length });
  } catch(e){ res.json({ success: false, error: e.message }); }
});

// 3. New messages since a time - for "N new messages" line
app.get('/api/community/since', (req, res) => {
  const after = Number(req.query.after) || 0;
  const list = communityMessages.filter(m => new Date(m.createdAt).getTime() > after);
  res.json({ success: true, messages: list, hasMore: false });
});

// 4. Pinned messages
app.get('/api/community/pinned', (req, res) => {
  const list = communityMessages.filter(m => m.pinned);
  res.json({ success: true, messages: list });
});

// 5. Who is online / typing? - like WhatsApp "John typing..."
app.get('/api/community/live', (req, res) => {
  const now = Date.now();
  for(let [k,v] of typingUsers){ if(now - v > 5000) typingUsers.delete(k); }
  const typing = [...typingUsers.keys()];
  const online = onlineUsers.size || 1;
  res.json({ success: true, online, typing });
});

app.post('/api/community/typing', express.json(), (req, res) => {
  const u = getChatUsername(req);
  if(u && u !== 'Guest') typingUsers.set(u, Date.now());
  res.json({ success: true });
});

// 6. SEND message - with reply, sticker, image - YOU ARE ADMIN HERE
app.post('/api/community/message', express.json({limit:'5mb'}), (req, res) => {
  const account = getChatUser(req);
  const username = getChatUsername(req);
  if(!username || username === 'Guest') return res.json({ success: false, error: 'Sign in to chat' });
  const { text, image, sticker, replyTo } = req.body || {};
  if(!text && !image && !sticker) return res.json({ success: false, error: 'Empty message' });
  if(text && text.length > 1000) return res.json({ success: false, error: 'Too long' });

  const isAdmin = getChatIsAdmin(req);
  const isVerified = getChatIsVerified(req);

  // mentions: find @username
  const mentions = [];
  if(text){
    const m = text.match(/@([A-Za-z0-9_]{3,20})/g);
    if(m) m.forEach(x => mentions.push(x.slice(1)));
  }

  let replyObj = null;
  if(replyTo){
    const orig = communityMessages.find(m => m._id === replyTo);
    if(orig) replyObj = { username: orig.username, text: orig.text || '[media]' };
  }

  const msg = {
    _id: Date.now().toString() + Math.random().toString(36).slice(2,6),
    username,
    photo: (account && (account.avatar || account.photo)) || null,
    text: text || null,
    image: image || null,
    sticker: sticker || null,
    mentions,
    replyTo: replyObj,
    reactions: [],
    pinned: false,
    edited: false,
    // FIXED: you are admin by email + number + username, not just "admin"
    isAdmin: isAdmin,
    isVerified: isVerified,
    verified: isVerified,
    proPlan: null,
    createdAt: new Date().toISOString()
  };
  communityMessages.push(msg);
  if(communityMessages.length > 500) communityMessages.splice(0, communityMessages.length - 500);
  onlineUsers.set(username, Date.now());
  res.json({ success: true, message: msg });
});

// 7. React ❤️ 👍 😂 - sits BELOW message like his
app.post('/api/community/react', express.json(), (req, res) => {
  const username = getChatUsername(req);
  const { id, emoji } = req.body || {};
  const msg = communityMessages.find(m => m._id === id);
  if(!msg) return res.json({ success: false, error: 'Not found' });
  if(!msg.reactions) msg.reactions = [];
  msg.reactions = msg.reactions.filter(r => r.n !== username);
  msg.reactions.push({ e: emoji, n: username, u: username });
  res.json({ success: true, reactions: msg.reactions });
});

// 8. Edit my message - shows "edited"
app.put('/api/community/message/:id', express.json(), (req, res) => {
  const username = getChatUsername(req);
  const msg = communityMessages.find(m => m._id === req.params.id);
  if(!msg) return res.json({ success: false, error: 'Not found' });
  if(msg.username !== username) return res.json({ success: false, error: 'Not yours' });
  msg.text = req.body.text;
  msg.edited = true;
  res.json({ success: true, text: msg.text, mentions: msg.mentions, edited: true });
});

// 9. Delete - owner or ADMIN can delete any
app.delete('/api/community/message/:id', (req, res) => {
  const username = getChatUsername(req);
  const isAdmin = getChatIsAdmin(req);
  const idx = communityMessages.findIndex(m => m._id === req.params.id);
  if(idx === -1) return res.json({ success: false });
  if(communityMessages[idx].username !== username && !isAdmin){
    return res.json({ success: false, error: 'Not allowed' });
  }
  communityMessages.splice(idx, 1);
  res.json({ success: true });
});

// 10. Mark as read
app.post('/api/community/read', express.json(), (req, res) => {
  res.json({ success: true });
});

// 11. Stickers - same 5 as his
app.get('/api/community/stickers', (req, res) => {
  res.json({ success: true, stickers: [
    { id: 'thanks', name: 'Thank you', src: '/stickers/thanks.svg?v=1' },
    { id: 'ok', name: 'Okay', src: '/stickers/ok.svg?v=1' },
    { id: 'lol', name: 'LOL', src: '/stickers/lol.svg?v=1' },
    { id: 'sorry', name: 'Sorry', src: '/stickers/sorry.svg?v=1' },
    { id: 'congrats', name: 'Congrats', src: '/stickers/congrats.svg?v=1' },
  ]});
});

// 12. Admin pin / unpin - ONLY YOU CAN DO THIS
app.post('/api/admin/community/pin/:id', express.json(), (req, res) => {
  if(!getChatIsAdmin(req)) return res.json({ success: false, error: 'Admin only' });
  const msg = communityMessages.find(m => m._id === req.params.id);
  if(!msg) return res.json({ success: false });
  msg.pinned = !msg.pinned;
  res.json({ success: true, pinned: msg.pinned });
});

// 13. Admin delete any message - ONLY YOU
app.delete('/api/admin/community/message/:id', (req, res) => {
  if(!getChatIsAdmin(req)) return res.json({ success: false, error: 'Admin only' });
  const idx = communityMessages.findIndex(m => m._id === req.params.id);
  if(idx !== -1) communityMessages.splice(idx, 1);
  res.json({ success: true });
});

// 14. Avatar for reactions
app.get('/api/avatar/:user', (req, res) => {
  res.redirect('https://ui-avatars.com/api/?name=' + encodeURIComponent(req.params.user) + '&background=ec4899&color=fff');
});
