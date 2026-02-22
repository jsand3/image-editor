import os
import sys
import io
import requests
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

SUPPORTED_FORMATS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"]
REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg"


def get_image_path():
    while True:
        path = input("\nEnter the path to your image: ").strip().strip("'\"")
        if os.path.isfile(path):
            return Path(path)
        print(f"  File not found: {path}. Please try again.")


def get_output_path(input_path: Path, suffix: str, ext: str) -> Path:
    return input_path.parent / f"{input_path.stem}{suffix}.{ext}"


def convert_format(input_path: Path):
    print("\nSupported formats:", ", ".join(SUPPORTED_FORMATS))
    target_fmt = input("Convert to format: ").strip().lower().lstrip(".")

    if target_fmt not in SUPPORTED_FORMATS:
        print(f"  Unsupported format '{target_fmt}'. Choose from: {', '.join(SUPPORTED_FORMATS)}")
        return

    output_path = get_output_path(input_path, "_converted", target_fmt)

    img = Image.open(input_path)

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


def remove_background(input_path: Path):
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

    with open(input_path, "rb") as f:
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

    output_path = get_output_path(input_path, "_nobg", output_fmt)

    if output_fmt == "webp":
        img.save(output_path, format="WEBP", lossless=True)
    else:
        img.save(output_path, format="PNG")

    print(f"\n  Saved: {output_path}")


def main():
    print("=== Image Editor ===")

    input_path = get_image_path()

    print("\nWhat would you like to do?")
    print("  [1] Convert format")
    print("  [2] Remove background")
    choice = input("\nEnter choice (1 or 2): ").strip()

    if choice == "1":
        convert_format(input_path)
    elif choice == "2":
        remove_background(input_path)
    else:
        print("  Invalid choice. Please enter 1 or 2.")
        sys.exit(1)


if __name__ == "__main__":
    main()
