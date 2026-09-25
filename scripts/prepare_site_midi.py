"""Prepare website MIDI files at a fixed 90 BPM and 4/4 length."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import mido


def prepare_midi(source: Path, destination: Path, target_bpm: float, bars: int) -> dict[str, Any]:
    midi = mido.MidiFile(source)
    target_ticks = bars * midi.ticks_per_beat * 4
    tempo_events: list[int] = []
    velocities: list[int] = []

    for track_index, track in enumerate(midi.tracks):
        absolute = 0
        kept: list[tuple[int, Any]] = []
        active_notes: dict[tuple[int, int], int] = {}
        for message in track:
            absolute += message.time
            if message.type == "set_tempo":
                tempo_events.append(message.tempo)
            if message.type == "note_on" and message.velocity > 0:
                velocities.append(message.velocity)
            if message.type in {"set_tempo", "time_signature", "end_of_track"}:
                continue
            is_note_on = message.type == "note_on" and message.velocity > 0
            is_note_off = message.type == "note_off" or (message.type == "note_on" and message.velocity == 0)
            note_key = (message.channel, message.note) if message.type in {"note_on", "note_off"} else None
            if absolute <= target_ticks:
                kept.append((absolute, message.copy(time=0)))
                if is_note_on and note_key is not None:
                    active_notes[note_key] = active_notes.get(note_key, 0) + 1
                elif is_note_off and note_key is not None and active_notes.get(note_key, 0):
                    active_notes[note_key] -= 1
            elif is_note_off and note_key is not None and active_notes.get(note_key, 0):
                kept.append((target_ticks, message.copy(time=0)))
                active_notes[note_key] -= 1

        for (channel, note), count in active_notes.items():
            for _ in range(count):
                kept.append((target_ticks, mido.Message("note_off", channel=channel, note=note, velocity=0, time=0)))

        if track_index == 0:
            kept.append((0, mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(target_bpm), time=0)))
            kept.append((0, mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0)))
        for channel in range(16):
            kept.append((target_ticks, mido.Message("control_change", channel=channel, control=123, value=0, time=0)))

        priority = {"time_signature": 0, "set_tempo": 1}
        kept.sort(key=lambda item: (item[0], priority.get(item[1].type, 2)))
        previous = 0
        rebuilt = mido.MidiTrack()
        for tick, message in kept:
            rebuilt.append(message.copy(time=max(0, tick - previous)))
            previous = tick
        midi.tracks[track_index] = rebuilt

    destination.parent.mkdir(parents=True, exist_ok=True)
    midi.save(destination)
    original_bpm = 60_000_000 / tempo_events[0] if tempo_events else 120.0
    return {
        "source": str(source.resolve()),
        "destination": str(destination.resolve()),
        "original_bpm": round(original_bpm, 3),
        "target_bpm": target_bpm,
        "bars": bars,
        "time_signature": "4/4",
        "velocity_override": None,
        "velocity_min": min(velocities) if velocities else None,
        "velocity_max": max(velocities) if velocities else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", nargs=2, metavar=("TASK", "MIDI"), required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--bars", type=int, default=32)
    parser.add_argument("--bpm", type=float, default=90.0)
    args = parser.parse_args()

    report = []
    for task, source_value in args.source:
        if task not in {"continuation", "chord", "accompaniment"}:
            raise ValueError(f"Unknown task: {task}")
        source = Path(source_value).resolve()
        destination = args.output_dir.resolve() / task / source.name
        row = prepare_midi(source, destination, args.bpm, args.bars)
        row["task"] = task
        report.append(row)
        print(f"Prepared {task}/{source.name}: {row['original_bpm']} -> {args.bpm} BPM")

    report_path = args.output_dir.resolve() / "preprocessing-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
