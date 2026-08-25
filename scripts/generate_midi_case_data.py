"""Prepare fixed-length accompaniment MIDI files and piano-roll data."""

from __future__ import annotations

import argparse
import copy
import json
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


def trim_midi(source: Path, bars: int) -> tuple[miditoolkit.MidiFile, int]:
    midi = miditoolkit.MidiFile(str(source))
    limit_tick = bars * 4 * int(midi.ticks_per_beat)
    for instrument in midi.instruments:
        kept_notes = []
        for note in instrument.notes:
            if int(note.start) >= limit_tick:
                continue
            note.end = min(int(note.end), limit_tick)
            kept_notes.append(note)
        instrument.notes = kept_notes
        instrument.control_changes = [item for item in instrument.control_changes if int(item.time) < limit_tick]
        instrument.pitch_bends = [item for item in instrument.pitch_bends if int(item.time) < limit_tick]
        kept_pedals = []
        for pedal in instrument.pedals:
            if int(pedal.start) >= limit_tick:
                continue
            pedal.end = min(int(pedal.end), limit_tick)
            kept_pedals.append(pedal)
        instrument.pedals = kept_pedals
    midi.tempo_changes = [item for item in midi.tempo_changes if int(item.time) < limit_tick]
    midi.time_signature_changes = [item for item in midi.time_signature_changes if int(item.time) < limit_tick]
    midi.key_signature_changes = [item for item in midi.key_signature_changes if int(item.time) < limit_tick]
    midi.lyrics = [item for item in midi.lyrics if int(item.time) < limit_tick]
    midi.markers = [item for item in midi.markers if int(item.time) < limit_tick]
    midi.max_tick = limit_tick
    return midi, limit_tick


def build_case(midi: miditoolkit.MidiFile, limit_tick: int, bars: int, case_id: str) -> dict:
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
        "title": f"POP909 / {case_id}",
        "description": f"Case {case_id}, limited to the first {bars} bars, with synchronized melody, bridge, and generated piano accompaniment.",
        "audioFull": f"./public/audio/accompaniment-{case_id}.wav",
        "audioNoMelody": f"./public/audio/accompaniment-{case_id}-no-melody.wav",
        "midiFull": f"./public/midi/{case_id}.mid",
        "midiNoMelody": f"./public/midi/{case_id}-no-melody.mid",
        "bpm": initial_bpm,
        "bars": bars,
        "duration": round(tick_to_seconds(limit_tick, tempo_changes, ticks_per_beat), 4),
        "prompt": f"POP909 song {case_id} · first {bars} bars",
        "tracks": tracks,
        "notes": notes,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", required=True, type=Path)
    parser.add_argument("--public-dir", required=True, type=Path)
    parser.add_argument("--bars", type=int, default=64)
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
        midi.dump(str(midi_dir / f"{case_id}.mid"))
        no_melody = copy.deepcopy(midi)
        no_melody.instruments = [
            instrument for instrument in no_melody.instruments
            if (instrument.name or "").strip().upper() != "MELODY"
        ]
        no_melody.dump(str(midi_dir / f"{case_id}-no-melody.mid"))
        cases[case_id] = build_case(midi, limit_tick, args.bars, case_id)
    payload = json.dumps(cases, ensure_ascii=False, separators=(",", ":"))
    (data_dir / "accompaniment-cases.js").write_text(
        f"window.ACCOMPANIMENT_CASES={payload};\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
