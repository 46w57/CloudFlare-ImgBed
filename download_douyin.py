#!/usr/bin/env python3
"""Download a Douyin video using yt-dlp."""

import sys
from pathlib import Path

import yt_dlp


URL = "https://v.douyin.com/pcEjEix4cIs/"
OUT_DIR = Path("/workspace/downloads")


def progress_hook(d: dict) -> None:
    if d.get("status") == "downloading":
        pct = d.get("_percent_str", "").strip()
        speed = d.get("_speed_str", "").strip()
        eta = d.get("_eta_str", "").strip()
        print(f"\r  {pct}  speed={speed}  eta={eta}", end="", flush=True)
    elif d.get("status") == "finished":
        print("\n  download finished, finalizing...")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    ydl_opts = {
        "outtmpl": str(OUT_DIR / "%(title).80B [%(id)s].%(ext)s"),
        "noplaylist": True,
        "concurrent_fragment_downloads": 4,
        "progress_hooks": [progress_hook],
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Referer": "https://www.douyin.com/",
        },
    }

    print(f"Fetching: {URL}")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(URL, download=True)
        if info is None:
            print("Failed to extract video info.", file=sys.stderr)
            return 1
        filename = ydl.prepare_filename(info)
        print(f"\nSaved to: {filename}")
        print(f"Title:    {info.get('title')}")
        print(f"Duration: {info.get('duration')}s")
        print(f"Uploader: {info.get('uploader')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
