"""Prepare fixed-length continuation MIDI files and piano-roll data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from generate_midi_case_data import tick_to_seconds, trim_midi


PROMPT_BARS = 4


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
                "color": "#ff6b4a",
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
    prompt_tick = min(PROMPT_BARS * 4 * ticks_per_beat, limit_tick)
    prompt_duration = round(tick_to_seconds(prompt_tick, tempo_changes, ticks_per_beat), 4)
    return {
        "id": case_id,
        "title": f"Continuation / {case_id}",
        "description": f"The first {PROMPT_BARS} bars are the prompt; bars {PROMPT_BARS + 1}–{bars} are generated continuation, rendered with the original tempo curve.",
        "audio": f"./public/audio/continuation-{case_id}.wav",
        "midi": f"./public/midi/continuation-{case_id}.mid",
        "bpm": initial_bpm,
        "bars": bars,
        "duration": round(tick_to_seconds(limit_tick, tempo_changes, ticks_per_beat), 4),
        "promptBars": PROMPT_BARS,
        "promptDuration": prompt_duration,
        "prompt": f"Bars 1–{PROMPT_BARS}: prompt · bars {PROMPT_BARS + 1}–{bars}: continuation",
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
        midi.dump(str(midi_dir / f"continuation-{case_id}.mid"))
        cases[case_id] = build_case(midi, limit_tick, args.bars, case_id)
    payload = json.dumps(cases, ensure_ascii=False, separators=(",", ":"))
    (data_dir / "continuation-cases.js").write_text(
        f"window.CONTINUATION_CASES={payload};\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
