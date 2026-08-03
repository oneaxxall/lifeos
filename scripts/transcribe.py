#!/usr/bin/env python3
"""Transcribe video via faster-whisper — output JSON + progress ke stderr.
Usage: python transcribe.py --input video.mp4 --output out.json [--model small] [--language id]
"""
import argparse
import json
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", default=None)
    args = ap.parse_args()

    from faster_whisper import WhisperModel

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(args.input, language=args.language, vad_filter=True)

    segs = []
    duration = max(float(info.duration or 1), 1)
    for seg in segments:
        segs.append({"start": round(float(seg.start), 2), "end": round(float(seg.end), 2), "text": str(seg.text).strip()})
        pct = min(99, int(float(seg.end) / duration * 100))
        print(f"progress:{pct}", flush=True)

    text = " ".join(s["text"] for s in segs)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({"lang": str(info.language or ""), "text": text, "segments": segs, "duration": duration}, f, ensure_ascii=False)
    print("done", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"error:{e}", flush=True)
        sys.exit(1)
