// ===== KING MD V4 - COMMUNITY CHAT BACKEND =====
// Put this in server.js AFTER: const app = express(); app.use(express.json());
// And BEFORE: app.listen(...)

const communityMessages = []; // fallback if no MongoDB
let pinnedCount = 0;
let onlineUsers = new Map(); // username -> lastSeen
let typingUsers = new Map(); // username -> time

// Helper - get user from your login (adapt to your auth)
function getChatUser(req){
  // If you use JWT: decode it here
  // For now, use header or body username
  return req.headers['x-username'] || (req.body && req.body.username) || 'Guest';
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
  // clean old typing
  for(let [k,v] of typingUsers){ if(now - v > 5000) typingUsers.delete(k); }
  const typing = [...typingUsers.keys()];
  const online = onlineUsers.size || 1;
  res.json({ success: true, online, typing });
});

app.post('/api/community/typing', express.json(), (req, res) => {
  const u = getChatUser(req);
  if(u && u !== 'Guest') typingUsers.set(u, Date.now());
  res.json({ success: true });
});

// 6. SEND message - with reply, sticker, image
app.post('/api/community/message', express.json({limit:'5mb'}), (req, res) => {
  const username = getChatUser(req);
  if(!username || username === 'Guest') return res.json({ success: false, error: 'Sign in to chat' });
  const { text, image, sticker, replyTo } = req.body || {};
  if(!text && !image && !sticker) return res.json({ success: false, error: 'Empty message' });
  if(text && text.length > 1000) return res.json({ success: false, error: 'Too long' });

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
    photo: null,
    text: text || null,
    image: image || null,
    sticker: sticker || null,
    mentions,
    replyTo: replyObj,
    reactions: [],
    pinned: false,
    edited: false,
    isAdmin: username.toLowerCase() === 'admin' || username.toLowerCase() === 'king',
    verified: false,
    proPlan: null,
    createdAt: new Date().toISOString()
  };
  communityMessages.push(msg);
  // auto-clean: keep last 500, older removed automatically like his
  if(communityMessages.length > 500) communityMessages.splice(0, communityMessages.length - 500);
  onlineUsers.set(username, Date.now());
  res.json({ success: true, message: msg });
});

// 7. React ❤️ 👍 😂 - sits BELOW message like his
app.post('/api/community/react', express.json(), (req, res) => {
  const username = getChatUser(req);
  const { id, emoji } = req.body || {};
  const msg = communityMessages.find(m => m._id === id);
  if(!msg) return res.json({ success: false, error: 'Not found' });
  if(!msg.reactions) msg.reactions = [];
  // remove my old reaction
  msg.reactions = msg.reactions.filter(r => r.n !== username);
  // if I clicked same emoji again, it removes (toggle)
  // else add new
  msg.reactions.push({ e: emoji, n: username, u: username });
  res.json({ success: true, reactions: msg.reactions });
});

// 8. Edit my message - shows "edited"
app.put('/api/community/message/:id', express.json(), (req, res) => {
  const username = getChatUser(req);
  const msg = communityMessages.find(m => m._id === req.params.id);
  if(!msg) return res.json({ success: false, error: 'Not found' });
  if(msg.username !== username) return res.json({ success: false, error: 'Not yours' });
  msg.text = req.body.text;
  msg.edited = true;
  res.json({ success: true, text: msg.text, mentions: msg.mentions, edited: true });
});

// 9. Delete
app.delete('/api/community/message/:id', (req, res) => {
  const username = getChatUser(req);
  const idx = communityMessages.findIndex(m => m._id === req.params.id);
  if(idx === -1) return res.json({ success: false });
  // only owner or admin can delete - like his
  if(communityMessages[idx].username !== username && username.toLowerCase() !== 'admin'){
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

// 12. Admin pin / unpin
app.post('/api/admin/community/pin/:id', express.json(), (req, res) => {
  const msg = communityMessages.find(m => m._id === req.params.id);
  if(!msg) return res.json({ success: false });
  msg.pinned = !msg.pinned;
  res.json({ success: true, pinned: msg.pinned });
});

// 13. Admin delete any message
app.delete('/api/admin/community/message/:id', (req, res) => {
  const idx = communityMessages.findIndex(m => m._id === req.params.id);
  if(idx !== -1) communityMessages.splice(idx, 1);
  res.json({ success: true });
});

// 14. Avatar for reactions
app.get('/api/avatar/:user', (req, res) => {
  res.redirect('https://ui-avatars.com/api/?name=' + encodeURIComponent(req.params.user) + '&background=ec4899&color=fff');
});
