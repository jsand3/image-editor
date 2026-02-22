# Image Editor — Setup & Usage

A Python script for quick image editing: format conversion and background removal.

---

## Prerequisites

- Python 3.8 or newer
- A [Remove.bg API key](https://www.remove.bg/api) (free tier: 50 previews/month, paid for full resolution)

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure your API key

Copy the example env file and fill in your key:

```bash
cp .env.copy .env
```

Open `.env` and replace `your_api_key_here` with your Remove.bg API key:

```
REMOVE_BG_API_KEY=abc123yourkey
```

> **Important:** Never commit `.env` to git. Add it to your `.gitignore`.

---

## Usage

Run the script:

```bash
python image_editor.py
```

The script will guide you interactively:

1. Enter the path to your image (drag-and-drop the file into the terminal works on most systems)
2. Choose an operation:
   - **[1] Convert format** — convert to a different image format
   - **[2] Remove background** — remove the image background using the Remove.bg API

### Convert Format

Supported formats: `png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`, `tiff`

Output file is saved alongside the original with a `_converted` suffix.
Example: `photo.jpg` → `photo_converted.png`

> Note: Converting to JPG will flatten any transparency to a white background, since JPG does not support transparency.

### Remove Background

Output format options: `png`, `webp`

Output file is saved alongside the original with a `_nobg` suffix.
Example: `photo.jpg` → `photo_nobg.png`

PNG preserves full transparency. WebP is saved losslessly and also preserves transparency.

---

## Remove.bg API — Free Tier Notes

- Free tier provides **50 API calls/month** at preview resolution (up to 0.25 megapixels)
- Full-resolution processing requires a paid plan
- Sign up and manage your key at [remove.bg/api](https://www.remove.bg/api)

---

## File Overview

| File | Description |
|---|---|
| `image_editor.py` | Main script |
| `requirements.txt` | Python dependencies |
| `.env.copy` | Template for environment variables |
| `.env` | Your local API key (do not commit) |
