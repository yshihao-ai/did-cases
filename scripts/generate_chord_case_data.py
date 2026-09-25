"""Prepare fixed-length chord-conditioned MIDI files and piano-roll data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from generate_midi_case_data import TRACK_COLORS, tick_to_seconds, trim_midi


QUALITY_NAMES = {
    "M": "major",
    "m": "minor",
    "7": "7",
    "M7": "major 7",
    "m7": "minor 7",
    "dim": "diminished",
    "aug": "augmented",
}


def format_chord(marker: str) -> str:
    value = marker.removeprefix("Chord_")
    if value.endswith("_0"):
        value = value[:-2]
    root, _, quality = value.partition("_")
    quality_name = QUALITY_NAMES.get(quality, quality.replace("_", " "))
    return f"{root} {quality_name}".strip()


def chord_prompt(midi) -> str:
    labels = [format_chord(marker.text) for marker in sorted(midi.markers, key=lambda item: item.time)]
    compact = []
    for label in labels:
        if not compact or compact[-1] != label:
            compact.append(label)
        if len(compact) == 8:
            break
    if not compact:
        return "Chord-conditioned generation · first 32 bars"
    suffix = " · …" if len(labels) > len(compact) else ""
    return " · ".join(compact) + suffix


def build_case(midi, limit_tick: int, bars: int, case_id: str) -> dict:
    tempo_changes = sorted(midi.tempo_changes, key=lambda item: item.time)
    ticks_per_beat = int(midi.ticks_per_beat)
    notes = []
    tracks = []
    for track_index, instrument in enumerate(midi.instruments):
        name = (instrument.name or f"TRACK {track_index + 1}").strip().upper()
        tracks.append(
            {
                "name": name,
                "program": int(instrument.program),
                "isDrum": bool(instrument.is_drum),
                "noteCount": len(instrument.notes),
                "color": TRACK_COLORS[track_index % len(TRACK_COLORS)],
            }
        )
        for note in instrument.notes:
            start = tick_to_seconds(int(note.start), tempo_changes, ticks_per_beat)
            end = tick_to_seconds(int(note.end), tempo_changes, ticks_per_beat)
            notes.append(
                {
                    "pitch": int(note.pitch),
                    "start": round(start, 4),
                    "length": round(max(0.02, end - start), 4),
                    "velocity": int(note.velocity),
                    "track": track_index,
                }
            )
    notes.sort(key=lambda item: (item["start"], item["pitch"], item["track"]))
    initial_bpm = round(float(tempo_changes[0].tempo if tempo_changes else 120.0))
    return {
        "id": case_id,
        "title": f"Chord-to-Music / {case_id}",
        "description": f"Chord-conditioned generation case {case_id}, limited to the first {bars} bars and standardized to 120 BPM for evaluation.",
        "audio": f"./public/audio/chord-{case_id}.flac",
        "midi": f"./public/midi/chord-{case_id}.mid",
        "bpm": initial_bpm,
        "bars": bars,
        "duration": round(tick_to_seconds(limit_tick, tempo_changes, ticks_per_beat), 4),
        "prompt": chord_prompt(midi),
        "tracks": tracks,
        "notes": notes,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", required=True, type=Path)
    parser.add_argument("--public-dir", required=True, type=Path)
    parser.add_argument("--bars", type=int, default=32)
    args = parser.parse_args()
    public_dir = args.public_dir.resolve()
    midi_dir = public_dir / "midi"
    data_dir = public_dir / "data"
    midi_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    cases = {}
    for source in args.source:
        case_id = source.stem
        midi, limit_tick = trim_midi(source.resolve(), args.bars)
        midi.dump(str(midi_dir / f"chord-{case_id}.mid"))
        cases[case_id] = build_case(midi, limit_tick, args.bars, case_id)
    payload = json.dumps(cases, ensure_ascii=False, separators=(",", ":"))
    (data_dir / "chord-cases.js").write_text(
        f"window.CHORD_CASES={payload};\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
