"""Render the website MIDI files with the evaluation audio toolchain."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
from typing import Any

import mido


EXPECTED_SOUNDFONT_SHA256 = "6643a007e594caefe8e09941f0dd04398f0b592320421fa5747dbf81ab9b791d"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def tool_version(command: Path, flag: str) -> str:
    result = subprocess.run([str(command), flag], capture_output=True, text=True, check=True)
    return (result.stdout or result.stderr).splitlines()[0].strip()


def render_midi(source: Path, destination: Path, fluidsynth: Path, soundfont: Path) -> None:
    subprocess.run(
        [
            str(fluidsynth), "-ni", "-F", str(destination), "-r", "44100",
            "-T", "wav", "-O", "s16", str(soundfont), str(source),
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def integrated_loudness(path: Path, ffmpeg: Path) -> float:
    result = subprocess.run(
        [str(ffmpeg), "-hide_banner", "-i", str(path), "-filter_complex", "ebur128", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=False,
    )
    matches = re.findall(r"I:\s*(-?[\d.]+) LUFS", result.stderr)
    if not matches:
        raise RuntimeError(f"Could not measure integrated loudness for {path}")
    return float(matches[-1])


def normalize_audio(source: Path, destination: Path, ffmpeg: Path, gain_db: float) -> None:
    audio_filter = (
        f"volume={gain_db:.6f}dB,"
        "alimiter=limit=0.841395:attack=5:release=50:level=false"
    )
    subprocess.run(
        [
            str(ffmpeg), "-y", "-i", str(source), "-af", audio_filter,
            "-ar", "44100", "-ac", "2", "-sample_fmt", "s16", str(destination),
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def encode_flac(source: Path, destination: Path, ffmpeg: Path) -> None:
    subprocess.run(
        [
            str(ffmpeg), "-y", "-i", str(source), "-codec:a", "flac",
            "-compression_level", "8", "-ar", "44100", "-ac", "2",
            "-sample_fmt", "s16", str(destination),
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def output_name(midi: Path) -> str:
    if midi.stem.startswith(("continuation-", "chord-")):
        return f"{midi.stem}.flac"
    return f"accompaniment-{midi.stem}.flac"


def validate_accompaniment_velocity(midi_files: list[Path], expected: int) -> None:
    for midi_path in midi_files:
        if midi_path.stem.startswith(("continuation-", "chord-")):
            continue
        velocities = {
            message.velocity
            for track in mido.MidiFile(midi_path).tracks
            for message in track
            if message.type == "note_on" and message.velocity > 0
        }
        if velocities != {expected}:
            raise RuntimeError(
                f"Expected every note-on velocity in {midi_path.name} to be {expected}, "
                f"got {sorted(velocities)}"
            )


def validate_tempo(midi_files: list[Path], expected_bpm: float) -> None:
    expected_tempo = mido.bpm2tempo(expected_bpm)
    for midi_path in midi_files:
        tempos = {
            message.tempo
            for track in mido.MidiFile(midi_path).tracks
            for message in track
            if message.type == "set_tempo"
        }
        if tempos != {expected_tempo}:
            actual_bpms = sorted(round(mido.tempo2bpm(tempo), 6) for tempo in tempos)
            raise RuntimeError(
                f"Expected {midi_path.name} to use only {expected_bpm:g} BPM, "
                f"got {actual_bpms}"
            )


def process_one(
    midi: Path,
    output_dir: Path,
    work_dir: Path,
    fluidsynth: Path,
    ffmpeg: Path,
    soundfont: Path,
) -> dict[str, Any]:
    raw = work_dir / f"{midi.stem}.raw.wav"
    normalized = work_dir / f"{midi.stem}.normalized.wav"
    destination = output_dir / output_name(midi)
    render_midi(midi, raw, fluidsynth, soundfont)
    input_lufs = integrated_loudness(raw, ffmpeg)
    gain_db = -16.0 - input_lufs
    normalize_audio(raw, normalized, ffmpeg, gain_db)
    normalized_lufs = integrated_loudness(normalized, ffmpeg)
    encode_flac(normalized, destination, ffmpeg)
    final_lufs = integrated_loudness(destination, ffmpeg)
    return {
        "midi": midi.name,
        "audio": destination.name,
        "input_lufs": input_lufs,
        "gain_db": round(gain_db, 3),
        "normalized_lufs": normalized_lufs,
        "encoded_lufs": final_lufs,
        "audio_sha256": file_sha256(destination),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--midi-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--work-dir", required=True, type=Path)
    parser.add_argument("--fluidsynth", required=True, type=Path)
    parser.add_argument("--ffmpeg", required=True, type=Path)
    parser.add_argument("--soundfont", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--target-bpm", type=float, default=90.0)
    parser.add_argument("--accompaniment-velocity", type=int)
    parser.add_argument("--append-manifest", action="store_true")
    parser.add_argument(
        "--replace-prefix",
        action="append",
        default=[],
        help="When appending, remove existing manifest entries whose audio filename starts with this prefix.",
    )
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    soundfont_hash = file_sha256(args.soundfont)
    if soundfont_hash != EXPECTED_SOUNDFONT_SHA256:
        raise RuntimeError(f"Unexpected SoundFont SHA-256: {soundfont_hash}")
    fluidsynth_version = tool_version(args.fluidsynth, "--version")
    ffmpeg_version = tool_version(args.ffmpeg, "-version")
    if "2.5.7" not in fluidsynth_version:
        raise RuntimeError(f"Expected FluidSynth 2.5.7, got: {fluidsynth_version}")
    if "9.0.1" not in ffmpeg_version:
        raise RuntimeError(f"Expected FFmpeg 9.0.1, got: {ffmpeg_version}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    if args.work_dir.exists():
        shutil.rmtree(args.work_dir)
    args.work_dir.mkdir(parents=True, exist_ok=True)
    midi_files = sorted(args.midi_dir.glob("*.mid"), key=lambda item: item.name.casefold())
    if not midi_files:
        raise RuntimeError("No MIDI files found")
    validate_tempo(midi_files, args.target_bpm)
    if args.accompaniment_velocity is not None:
        if not 1 <= args.accompaniment_velocity <= 127:
            raise ValueError("Accompaniment velocity must be between 1 and 127")
        validate_accompaniment_velocity(midi_files, args.accompaniment_velocity)

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        results = list(
            executor.map(
                lambda midi: process_one(
                    midi,
                    args.output_dir,
                    args.work_dir,
                    args.fluidsynth,
                    args.ffmpeg,
                    args.soundfont,
                ),
                midi_files,
            )
        )
    for result in results:
        print(
            f"Rendered {result['audio']}: {result['input_lufs']:.1f} LUFS, "
            f"gain {result['gain_db']:+.1f} dB, final {result['encoded_lufs']:.1f} LUFS"
        )

    manifest = {
        "target_bpm": args.target_bpm,
        "target_lufs": -16.0,
        "sample_rate": 44100,
        "channels": 2,
        "bit_depth": 16,
        "time_signature": "4/4",
        "normalization": "whole-file EBU R128 integrated loudness fixed gain; -1.5 dBFS peak limiter",
        "encoding": "FLAC lossless, compression level 8",
        "velocity_override": {
            "continuation": None,
            "chord": None,
            "accompaniment": args.accompaniment_velocity,
        },
        "fluidsynth_version": fluidsynth_version,
        "ffmpeg_version": ffmpeg_version,
        "soundfont": args.soundfont.name,
        "soundfont_sha256": soundfont_hash,
        "soundfont_reference": "Magenta sgm_plus / D3PIA-aligned SGM v2.01 Sal-Guit-Bass v1.3",
        "reference_demo": "https://jech2.github.io/D3PIA/",
        "files": results,
    }
    if args.append_manifest and args.manifest.exists():
        existing = json.loads(args.manifest.read_text(encoding="utf-8"))
        existing_files = {
            item["audio"]: item
            for item in existing.get("files", [])
            if not any(item["audio"].startswith(prefix) for prefix in args.replace_prefix)
        }
        existing_files.update({item["audio"]: item for item in results})
        manifest["files"] = [existing_files[name] for name in sorted(existing_files, key=str.casefold)]
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
