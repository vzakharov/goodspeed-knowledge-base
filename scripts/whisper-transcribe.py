"""Transcribe one recording with faster-whisper on the CPU, a segment per line.

Run by `scripts/transcribe.ts` from the virtualenv it keeps under `tmp/`, which
is where `faster_whisper` is installed; the model downloads on first use.
"""

from __future__ import annotations

import argparse

from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument("file")
parser.add_argument("--language")
parser.add_argument("--prompt")
args = parser.parse_args()

model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
segments, _ = model.transcribe(
    args.file,
    language=args.language,
    beam_size=5,
    vad_filter=True,
    initial_prompt=args.prompt,
)
for segment in segments:
    print(segment.text.strip(), flush=True)
