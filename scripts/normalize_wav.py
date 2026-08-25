"""Peak-normalize 16-bit PCM WAV files without changing their sample rate."""

from __future__ import annotations

import argparse
import math
import wave
from pathlib import Path

import numpy as np


def normalize(path: Path, target_db: float) -> None:
    with wave.open(str(path), "rb") as source:
        params = source.getparams()
        if params.sampwidth != 2:
            raise ValueError(f"{path}: expected 16-bit PCM WAV")
        samples = np.frombuffer(source.readframes(params.nframes), dtype="<i2").astype(np.float64)
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak == 0:
        return
    target = 32767.0 * math.pow(10.0, target_db / 20.0)
    normalized = np.clip(np.rint(samples * target / peak), -32768, 32767).astype("<i2")
    temporary = path.with_suffix(".normalized.wav")
    with wave.open(str(temporary), "wb") as output:
        output.setparams(params)
        output.writeframes(normalized.tobytes())
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--target-db", type=float, default=-1.0)
    args = parser.parse_args()
    for path in args.paths:
        normalize(path.resolve(), args.target_db)


if __name__ == "__main__":
    main()
