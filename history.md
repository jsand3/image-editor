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
