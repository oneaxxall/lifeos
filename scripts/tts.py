#!/usr/bin/env python3
"""TTS hook via edge-tts (Microsoft neural, gratis tanpa API key).

Usage: python tts.py "<text>" <out.mp3> [voice]
Voices: id-ID-GadisNeural (wanita) | id-ID-ArdiNeural (pria)
"""
import asyncio
import sys

import edge_tts


async def main(text: str, out: str, voice: str = "id-ID-GadisNeural") -> None:
    comm = edge_tts.Communicate(text, voice, rate="+8%")
    await comm.save(out)


if __name__ == "__main__":
    text = sys.argv[1] if len(sys.argv) > 1 else ""
    out = sys.argv[2] if len(sys.argv) > 2 else "hook.mp3"
    voice = sys.argv[3] if len(sys.argv) > 3 else "id-ID-GadisNeural"
    if not text.strip():
        print("ERROR: teks kosong", file=sys.stderr)
        sys.exit(1)
    asyncio.run(main(text, out, voice))
    print(f"OK {out}")
