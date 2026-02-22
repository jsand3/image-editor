/* ── CutBot chat app ─────────────────────────────────────────── */

const chatMessages  = document.getElementById('chatMessages');
const urlInput      = document.getElementById('urlInput');
const fileInput     = document.getElementById('fileInput');
const sendBtn       = document.getElementById('sendBtn');
const dropOverlay   = document.getElementById('dropOverlay');

// State
let state = 'waiting';   // waiting | choosing | processing | done
let pendingFile = null;
let pendingUrl  = null;
let pendingStem = null;

// ── Stars ─────────────────────────────────────────────────────────
(function generateStars() {
  const g = document.getElementById('stars');
  if (!g) return;
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 1440;
    const y = Math.random() * 500;
    const r = Math.random() * 1.6 + 0.3;
    const op = (Math.random() * 0.6 + 0.2).toFixed(2);
    const delay = (Math.random() * 4).toFixed(2);
    const dur   = (Math.random() * 3 + 2).toFixed(2);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r);
    c.setAttribute('fill', 'white'); c.setAttribute('opacity', op);
    c.style.animation = `twinkle ${dur}s ${delay}s ease-in-out infinite`;
    g.appendChild(c);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes twinkle {
      0%,100% { opacity: var(--op, 0.4); }
      50%      { opacity: 0.05; }
    }`;
  document.head.appendChild(style);
})();

// ── Helpers ────────────────────────────────────────────────────────
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function stemFromFilename(name) {
  return name.replace(/\.[^.]+$/, '');
}

function stemFromUrl(url) {
  try {
    const p = new URL(url).pathname.split('/').pop() || 'image';
    return p.replace(/\.[^.]+$/, '') || 'image';
  } catch { return 'image'; }
}

function isUrl(str) {
  return /^https?:\/\//i.test(str.trim());
}

// ── Message builders ───────────────────────────────────────────────
function addBotMessage(content, extraClass = '') {
  const row = document.createElement('div');
  row.className = `msg-row bot ${extraClass}`;
  row.innerHTML = `
    <div class="msg-avatar">
      <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
        <rect x="7" y="2" width="14" height="12" rx="3" fill="#e87a2a"/>
        <circle cx="11" cy="7" r="1.8" fill="#00e5ff"/>
        <circle cx="17" cy="7" r="1.8" fill="#00e5ff"/>
      </svg>
    </div>
    <div class="msg-bubble">${content}</div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
  return row;
}

function addUserMessage(content) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `
    <div class="msg-bubble">${content}</div>
    <div class="msg-avatar" style="background:rgba(200,85,20,0.2);border-color:rgba(200,85,20,0.4);">👤</div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
  return row;
}

function addUserImageMessage(src, label) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `
    <div class="msg-bubble" style="padding:6px;">
      <img class="msg-image-thumb" src="${src}" alt="${label}" />
      <div style="margin-top:5px;font-size:0.78rem;opacity:0.7;">${label}</div>
    </div>
    <div class="msg-avatar" style="background:rgba(200,85,20,0.2);border-color:rgba(200,85,20,0.4);">👤</div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function addTyping() {
  const row = document.createElement('div');
  row.className = 'msg-row bot typing-row';
  row.innerHTML = `
    <div class="msg-avatar">
      <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
        <rect x="7" y="2" width="14" height="12" rx="3" fill="#e87a2a"/>
        <circle cx="11" cy="7" r="1.8" fill="#00e5ff"/>
        <circle cx="17" cy="7" r="1.8" fill="#00e5ff"/>
      </svg>
    </div>
    <div class="typing-bubble"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
  return row;
}

function removeTyping(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function addActionButtons(buttons) {
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  const inner = document.createElement('div');
  inner.className = 'action-row';
  buttons.forEach(({ label, id }) => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = label;
    btn.dataset.action = id;
    inner.appendChild(btn);
  });
  row.appendChild(inner);
  chatMessages.appendChild(row);
  scrollToBottom();
  return inner;
}

function addResultMessage(blobUrl, filename) {
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.innerHTML = `
    <div class="msg-avatar">
      <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
        <rect x="7" y="2" width="14" height="12" rx="3" fill="#e87a2a"/>
        <circle cx="11" cy="7" r="1.8" fill="#00e5ff"/>
        <circle cx="17" cy="7" r="1.8" fill="#00e5ff"/>
      </svg>
    </div>
    <div class="msg-bubble" style="padding:8px;">
      <div class="msg-result">
        <img src="${blobUrl}" alt="Result" />
        <a class="download-btn" href="${blobUrl}" download="${filename}">
          ↓ Download
        </a>
      </div>
    </div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

// ── Delay helper ───────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── API calls ──────────────────────────────────────────────────────
async function apiRemoveBg(file, url) {
  const form = new FormData();
  if (file)      form.append('image', file);
  else if (url)  form.append('imageUrl', url);
  const res = await fetch('/api/remove-bg', { method: 'POST', body: form });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Server error ${res.status}`);
  }
  return res.blob();
}

// Format conversion runs entirely in the browser via Canvas API
async function apiConvert(file, url, format) {
  // Get an object URL we can draw — proxy cross-origin URLs through the server
  let srcUrl;
  if (file) {
    srcUrl = URL.createObjectURL(file);
  } else {
    const proxyRes = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    if (!proxyRes.ok) throw new Error(`Could not fetch image (${proxyRes.status})`);
    const blob = await proxyRes.blob();
    srcUrl = URL.createObjectURL(blob);
  }

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload  = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load image'));
    i.src = srcUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (format === 'jpg' || format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                    webp: 'image/webp', gif: 'image/gif' };
  const mime = mimeMap[format] || 'image/png';

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas conversion failed')), mime);
  });
}

// ── Main chat flow ─────────────────────────────────────────────────
async function handleImageReceived(file, url, stem) {
  state = 'choosing';
  pendingFile = file;
  pendingUrl  = url;
  pendingStem = stem;

  // Show user's image
  const preview = file ? URL.createObjectURL(file) : url;
  addUserImageMessage(preview, stem);

  // Bot types
  const typing = addTyping();
  await delay(1000);
  removeTyping(typing);

  addBotMessage(`Nice! I've got <strong>${stem}</strong>.<br/>What would you like me to do?`);
  const actionEl = addActionButtons([
    { label: '✂️  Remove Background', id: 'remove-bg' },
    { label: '🔄  Convert Format',    id: 'convert'   },
  ]);

  actionEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || state !== 'choosing') return;
    const action = btn.dataset.action;
    // Disable all buttons
    actionEl.querySelectorAll('.action-btn').forEach(b => b.classList.add('disabled'));
    if (action === 'remove-bg') startRemoveBg();
    if (action === 'convert')   startConvert();
  });
}

async function startRemoveBg() {
  state = 'processing';
  addUserMessage('✂️ Remove the background');
  const typing = addTyping();
  await delay(700);
  addBotMessage('On it! Removing the background now…');
  await delay(300);

  try {
    const blob    = await apiRemoveBg(pendingFile, pendingUrl);
    const blobUrl = URL.createObjectURL(blob);
    removeTyping(typing);
    const typing2 = addTyping();
    await delay(600);
    removeTyping(typing2);
    addBotMessage('Done! Here\'s your image with the background removed:');
    addResultMessage(blobUrl, `${pendingStem}_nobg.png`);
    await delay(400);
    offerAnother();
  } catch (err) {
    removeTyping(typing);
    addBotMessage(`Hmm, something went wrong: <em>${err.message}</em>`);
    offerAnother();
  }
  state = 'done';
}

async function startConvert() {
  state = 'choosing-format';
  addUserMessage('🔄 Convert the format');
  const typing = addTyping();
  await delay(800);
  removeTyping(typing);

  addBotMessage('Sure! Which format do you want?');
  const formatEl = addActionButtons([
    { label: 'PNG',  id: 'png'  },
    { label: 'JPG',  id: 'jpg'  },
    { label: 'WebP', id: 'webp' },
    { label: 'GIF',  id: 'gif'  },
  ]);

  formatEl.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || state !== 'choosing-format') return;
    state = 'processing';
    const fmt = btn.dataset.action;
    formatEl.querySelectorAll('.action-btn').forEach(b => b.classList.add('disabled'));
    addUserMessage(`${fmt.toUpperCase()}`);

    const typing2 = addTyping();
    await delay(600);
    addBotMessage(`Converting to ${fmt.toUpperCase()}…`);

    try {
      const blob    = await apiConvert(pendingFile, pendingUrl, fmt);
      const blobUrl = URL.createObjectURL(blob);
      removeTyping(typing2);
      const typing3 = addTyping();
      await delay(500);
      removeTyping(typing3);
      addBotMessage(`Converted! Here's your ${fmt.toUpperCase()} file:`);
      addResultMessage(blobUrl, `${pendingStem}_converted.${fmt}`);
      await delay(400);
      offerAnother();
    } catch (err) {
      removeTyping(typing2);
      addBotMessage(`Uh oh: <em>${err.message}</em>`);
      offerAnother();
    }
    state = 'done';
  });
}

async function offerAnother() {
  await delay(800);
  addBotMessage('Got another image to edit? Drop it in! 🚀');
  state = 'waiting';
  pendingFile = null; pendingUrl = null; pendingStem = null;
}

// ── Input handling ─────────────────────────────────────────────────
function handleSend() {
  if (state !== 'waiting') return;
  const val = urlInput.value.trim();
  if (!val) return;
  if (isUrl(val)) {
    urlInput.value = '';
    handleImageReceived(null, val, stemFromUrl(val));
  } else {
    addBotMessage("That doesn't look like a valid URL. Try pasting a direct image URL, or click the 📎 to upload a file.");
  }
}

sendBtn.addEventListener('click', handleSend);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

fileInput.addEventListener('change', () => {
  if (!fileInput.files.length || state !== 'waiting') return;
  const file = fileInput.files[0];
  urlInput.value = '';
  handleImageReceived(file, null, stemFromFilename(file.name));
  fileInput.value = '';
});

// ── Drag & drop ────────────────────────────────────────────────────
let dragCounter = 0;
document.addEventListener('dragenter', e => {
  if (!e.dataTransfer.types.includes('Files')) return;
  dragCounter++;
  dropOverlay.classList.add('active');
});
document.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('active'); }
});
document.addEventListener('dragover',  e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('active');
  if (state !== 'waiting') return;
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  handleImageReceived(file, null, stemFromFilename(file.name));
});

// ── Boot greeting ──────────────────────────────────────────────────
(async function boot() {
  await delay(400);
  addBotMessage("Hey! I'm <strong>CutBot</strong> 👋");
  await delay(900);
  const t = addTyping();
  await delay(1200);
  removeTyping(t);
  addBotMessage("Drop in an image or paste a URL and I'll remove the background or convert the format for you — in seconds.");
})();
