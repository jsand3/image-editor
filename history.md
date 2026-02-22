# Build History & Context

## 2026-02-21 — Initial Build

### What was built
A Python interactive CLI script (`image_editor.py`) for quick image editing with two core features:
1. **Format conversion** — convert any image between common formats (PNG, JPG, WebP, GIF, BMP, TIFF)
2. **Background removal** — remove image backgrounds via the Remove.bg API, outputting as PNG or WebP

### Key decisions

**Language: Python**
Chosen for its mature image processing ecosystem (Pillow) and straightforward scripting. Node.js was considered but Python is better suited for image work.

**Background removal: Remove.bg API**
The user chose a cloud API over a local model (`rembg`) to avoid the ~170MB model download and local inference overhead. Remove.bg produces high-quality results and has a free tier (50 calls/month at preview resolution).

**Interface: Interactive prompts**
Rather than CLI flags (`--input`, `--convert`), the script walks the user through choices step-by-step. This makes it accessible without memorizing argument syntax.

**Output naming convention**
- Format conversion → `<name>_converted.<ext>`
- Background removal → `<name>_nobg.<ext>`

Files are saved alongside the original so the user always knows where to find them without specifying an output path.

**JPG transparency handling**
JPEG does not support an alpha channel. When converting a transparent image (RGBA) to JPG, the script composites it onto a white background rather than throwing an error or silently corrupting the output.

**WebP background removal**
Remove.bg always returns PNG bytes. When the user requests WebP output, Pillow converts the PNG response to lossless WebP, preserving the transparency.

### Files
| File | Role |
|---|---|
| `image_editor.py` | Main script |
| `requirements.txt` | Pillow, requests, python-dotenv |
| `.env.copy` | Safe-to-commit API key template |
| `.env` | Local secrets (gitignored) |
| `.gitignore` | Ignores .env, pycache, venv, .DS_Store |
| `instructions.md` | End-user setup and usage guide |
| `history.md` | This file — build context and decisions |

### Environment variables
- `REMOVE_BG_API_KEY` — Remove.bg API key, loaded from `.env` via python-dotenv

---

## 2026-02-21 — URL Support & First Successful Test

### URL input added
Both operations now accept an image URL in addition to a local file path:
- **Background removal**: URL passed directly to Remove.bg via `image_url` param — no download needed
- **Format conversion**: image downloaded into memory via `requests`, then processed
- Output saves to current working directory when source is a URL, named from the URL filename stem

### Setup issues encountered
- macOS Xcode Command Line Tools were broken (xcrun missing), blocking git and Python entirely. Fixed by reinstalling via `xcode-select --install`.
- Dependencies (`requests`, `Pillow`, `python-dotenv`) were not pre-installed. Resolved with `pip3 install -r requirements.txt`.
- Remove.bg API key was initially truncated/incorrect, returning a 403. Resolved by copying the full key directly from the Remove.bg dashboard.

### First successful run
Background removal confirmed working end-to-end with a valid API key.

---

## 2026-02-21 — Web App Build

### Prompt context
User requested a browser-based web app (Node.js) wrapping the image editor with:
- A modern tech-site design inspired by a screenshot showing a twilight/sunset landscape, mountain silhouettes, and an orange/copper robot
- An SVG landscape and SVG robot (matching the screenshot aesthetic)
- A fake-AI chat UI: looks like an AI assistant, uses interactive prompts to walk users through removing backgrounds or converting formats
- Image input via file upload or URL
- Chat animations (typing indicator, message slide-in, result fade-in)
- Branding created using the `/marketing` knowledge-work-plugins skill (brand-voice framework)

### Screenshot reference
`Screenshot 2026-02-21 at 9.47.47 PM.png` — shows a SaaS hero page with:
- Deep purple-to-warm-orange sunset sky gradient
- Layered mountain silhouettes at bottom
- Scattered white stars in the upper sky
- An orange/copper boxy robot (right side, partially behind a floating card)
- A glassmorphism floating UI card

### Brand decision: CutBot
Applied the brand-voice framework from the marketing plugin:
- **Brand personality**: Friendly, efficient robot colleague. Handles image tasks instantly. Approachable but capable.
- **Name**: CutBot — "cut" (background removal + format cutting) + "bot" (the chat robot interface and the SVG robot character). Simple, memorable, describes both the function and the UX.
- **Tagline**: "Smart image editing. Just chat."
- **Voice attributes**: Approachable, precise, playful — the bot talks in short friendly sentences, never technical jargon
- **Color palette**: Deep space purple (#0d0124), mid purple (#3d1060), sunset orange (#e85d20), robot copper (#e87a2a)

### Web app architecture
- Node.js + Express server (`web/server.js`)
- `multer` for file uploads (memory storage)
- `sharp` for server-side format conversion
- `node-fetch` + `form-data` to proxy Remove.bg API calls (keeps API key server-side)
- Vanilla HTML/CSS/JS frontend — no framework
- SVG landscape: full-screen fixed background with sky gradient, generated stars, 3 mountain layers
- SVG robot: inline SVG, copper/orange, floating animation
- Chat state machine: waiting → imageReceived → choosing → processing → done
- Result images returned as blobs, displayed in chat with download button
