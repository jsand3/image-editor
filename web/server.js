require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express  = require('express');
const multer   = require('multer');
const FormData = require('form-data');
const fetch    = require('node-fetch');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Remove background ─────────────────────────────────────────────────────────
app.post('/api/remove-bg', upload.single('image'), async (req, res) => {
  try {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({ error: 'REMOVE_BG_API_KEY is not configured.' });
    }

    const form = new FormData();
    form.append('size', 'auto');

    if (req.file) {
      form.append('image_file', req.file.buffer, {
        filename: req.file.originalname || 'upload.png',
        contentType: req.file.mimetype,
      });
    } else if (req.body && req.body.imageUrl) {
      form.append('image_url', req.body.imageUrl);
    } else {
      return res.status(400).json({ error: 'No image or URL provided.' });
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, ...form.getHeaders() },
      body: form,
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      const msg  = json.errors?.[0]?.title || `Remove.bg error (${response.status})`;
      return res.status(response.status).json({ error: msg });
    }

    const buffer = await response.buffer();
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Image proxy (for client-side canvas conversion of cross-origin URLs) ─────
app.get('/api/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid URL.' });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch image (${response.status})` });
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    response.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  CutBot running → http://localhost:${PORT}\n`);
});
