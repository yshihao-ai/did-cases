"""Convert accompaniment MIDI files into browser-ready piano-roll data."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import miditoolkit


TRACK_COLORS = ("#ff6b4a", "#b9ff66", "#70c8ff")


def tick_to_seconds(tick: int, tempo_changes, ticks_per_beat: int) -> float:
    elapsed = 0.0
    cursor = 0
    tempo = 120.0
    for change in tempo_changes:
        change_tick = int(change.time)
        if change_tick > tick:
            break
        elapsed += (change_tick - cursor) / ticks_per_beat * 60.0 / tempo
        cursor = change_tick
        tempo = float(change.tempo)
    return elapsed + (tick - cursor) / ticks_per_beat * 60.0 / tempo


def convert(path: Path, audio_path: str) -> dict:
    midi = miditoolkit.MidiFile(str(path))
    tempo_changes = sorted(midi.tempo_changes, key=lambda item: item.time)
    ticks_per_beat = int(midi.ticks_per_beat)
    max_tick = max(
        (int(note.end) for instrument in midi.instruments for note in instrument.notes),
        default=int(midi.max_tick),
    )
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
    duration = tick_to_seconds(max_tick, tempo_changes, ticks_per_beat)
    initial_bpm = round(float(tempo_changes[0].tempo if tempo_changes else 120.0))
    bars = math.ceil(max_tick / ticks_per_beat / 4)
    case_id = path.stem
    return {
        "id": case_id,
        "title": f"POP909 / {case_id}",
        "description": f"完整预测样例 {case_id}：主旋律、桥接声部与模型生成钢琴伴奏同步展示。",
        "audio": audio_path,
        "midi": f"./public/midi/{path.name}",
        "bpm": initial_bpm,
        "bars": bars,
        "duration": round(duration, 4),
        "prompt": f"POP909 song {case_id} · full prediction",
        "tracks": tracks,
        "notes": notes,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--midi", action="append", required=True)
    parser.add_argument("--audio", action="append", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if len(args.midi) != len(args.audio):
        parser.error("--midi and --audio must be supplied in matching pairs")
    cases = {
        Path(midi_path).stem: convert(Path(midi_path), audio_path)
        for midi_path, audio_path in zip(args.midi, args.audio)
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(cases, ensure_ascii=False, separators=(",", ":"))
    output.write_text(f"window.ACCOMPANIMENT_CASES={payload};\n", encoding="utf-8")


if __name__ == "__main__":
    main()
