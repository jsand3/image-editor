import os
import sys
import io
import requests
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

SUPPORTED_FORMATS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"]
REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg"


def is_url(s: str) -> bool:
    return s.startswith("http://") or s.startswith("https://")


def get_image_input():
    """Prompt for a file path or URL. Returns (source, stem, is_url)."""
    while True:
        raw = input("\nEnter image path or URL: ").strip().strip("'\"")
        if is_url(raw):
            stem = PurePosixPath(urlparse(raw).path).stem or "image"
            return raw, stem, True
        if os.path.isfile(raw):
            p = Path(raw)
            return p, p.stem, False
        print(f"  File not found: {raw}. Please try again.")


def get_output_path(source, stem: str, suffix: str, ext: str) -> Path:
    if isinstance(source, Path):
        return source.parent / f"{stem}{suffix}.{ext}"
    # URL — save to current working directory
    return Path.cwd() / f"{stem}{suffix}.{ext}"


def load_image_from_url(url: str) -> Image.Image:
    print("  Downloading image...")
    r = requests.get(url, timeout=30)
    if r.status_code != 200:
        print(f"  Failed to download image (HTTP {r.status_code})")
        sys.exit(1)
    return Image.open(io.BytesIO(r.content))


def convert_format(source, stem: str, from_url: bool):
    print("\nSupported formats:", ", ".join(SUPPORTED_FORMATS))
    target_fmt = input("Convert to format: ").strip().lower().lstrip(".")

    if target_fmt not in SUPPORTED_FORMATS:
        print(f"  Unsupported format '{target_fmt}'. Choose from: {', '.join(SUPPORTED_FORMATS)}")
        return

    output_path = get_output_path(source, stem, "_converted", target_fmt)

    img = load_image_from_url(source) if from_url else Image.open(source)

    # JPEG does not support transparency — flatten to white background
    if target_fmt in ("jpg", "jpeg") and img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = background
    elif target_fmt not in ("jpg", "jpeg"):
        img = img.convert("RGBA") if img.mode not in ("RGB", "RGBA", "L", "LA") else img

    save_format = "JPEG" if target_fmt in ("jpg", "jpeg") else target_fmt.upper()
    img.save(output_path, format=save_format)
    print(f"\n  Saved: {output_path}")


def remove_background(source, stem: str, from_url: bool):
    api_key = os.getenv("REMOVE_BG_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        print("\n  Error: REMOVE_BG_API_KEY is not set.")
        print("  Copy .env.copy to .env and add your API key from https://www.remove.bg/api")
        return

    print("\nOutput format options: png, webp")
    output_fmt = input("Save as format: ").strip().lower().lstrip(".")
    if output_fmt not in ("png", "webp"):
        print("  Invalid choice. Choose 'png' or 'webp'.")
        return

    print("\n  Removing background...")

    if from_url:
        # Remove.bg accepts image_url directly — no download needed
        response = requests.post(
            REMOVE_BG_URL,
            headers={"X-Api-Key": api_key},
            data={"image_url": source, "size": "auto"},
        )
    else:
        with open(source, "rb") as f:
            response = requests.post(
                REMOVE_BG_URL,
                headers={"X-Api-Key": api_key},
                files={"image_file": f},
                data={"size": "auto"},
            )

    if response.status_code != 200:
        try:
            error = response.json().get("errors", [{}])[0].get("title", response.text)
        except Exception:
            error = response.text
        print(f"  API error ({response.status_code}): {error}")
        return

    # Response is always PNG bytes
    img = Image.open(io.BytesIO(response.content))

    output_path = get_output_path(source, stem, "_nobg", output_fmt)

    if output_fmt == "webp":
        img.save(output_path, format="WEBP", lossless=True)
    else:
        img.save(output_path, format="PNG")

    print(f"\n  Saved: {output_path}")


def main():
    print("=== Image Editor ===")

    source, stem, from_url = get_image_input()

    print("\nWhat would you like to do?")
    print("  [1] Convert format")
    print("  [2] Remove background")
    choice = input("\nEnter choice (1 or 2): ").strip()

    if choice == "1":
        convert_format(source, stem, from_url)
    elif choice == "2":
        remove_background(source, stem, from_url)
    else:
        print("  Invalid choice. Please enter 1 or 2.")
        sys.exit(1)


if __name__ == "__main__":
    main()
