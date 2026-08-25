import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rate = 48000;
const seconds = 15.5;
const frames = Math.floor(rate * seconds);
const outDir = fileURLToPath(new URL('../public/audio/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const progressions = [
  [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]],
  [[48, 51, 55, 62], [44, 48, 51, 55], [51, 55, 58, 63], [46, 51, 53, 58]],
  [[45, 48, 52, 57], [41, 45, 48, 52], [43, 47, 50, 55], [40, 43, 47, 52]],
];
const melodies = [
  [72, 74, 76, 79, 76, 74, 71, 72, 67, 69, 71, 74, 72, 71, 69, 67],
  [75, 79, 82, 79, 77, 75, 72, 70, 67, 70, 72, 75, 77, 75, 72, 70],
  [69, 72, 76, 74, 72, 69, 67, 64, 65, 69, 72, 71, 69, 67, 64, 62],
];

function frequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

function addNote(left, right, midi, start, duration, gain, instrument, pan = 0) {
  const begin = Math.max(0, Math.floor(start * rate));
  const end = Math.min(frames, Math.floor((start + duration) * rate));
  const freq = frequency(midi);
  const leftGain = Math.sqrt((1 - pan) / 2) * gain;
  const rightGain = Math.sqrt((1 + pan) / 2) * gain;
  for (let i = begin; i < end; i++) {
    const t = (i - begin) / rate;
    const rel = t / duration;
    let env;
    let sample = 0;
    if (instrument === 'piano') {
      env = Math.min(1, t / .008) * Math.exp(-3.25 * rel);
      sample = Math.sin(2 * Math.PI * freq * t) + .42 * Math.sin(2 * Math.PI * freq * 2.004 * t) + .18 * Math.sin(2 * Math.PI * freq * 3.01 * t) + .08 * Math.sin(2 * Math.PI * freq * 5.02 * t);
    } else if (instrument === 'strings') {
      env = Math.min(1, t / .24) * Math.min(1, (duration - t) / .32);
      for (let h = 1; h <= 6; h++) sample += Math.sin(2 * Math.PI * freq * h * t + h * .17) / (h * 1.45);
      sample *= .72;
    } else {
      env = Math.min(1, t / .015) * Math.min(1, (duration - t) / .12) * (.85 + .15 * Math.exp(-4 * rel));
      sample = Math.sin(2 * Math.PI * freq * t) + .24 * Math.sin(2 * Math.PI * freq * 2 * t);
    }
    left[i] += sample * env * leftGain;
    right[i] += sample * env * rightGain;
  }
}

function addReverb(left, right) {
  const delays = [[.037, .18], [.061, .13], [.089, .09], [.127, .06]];
  for (const [delay, gain] of delays) {
    const offset = Math.floor(delay * rate);
    for (let i = offset; i < frames; i++) {
      const l = left[i - offset];
      const r = right[i - offset];
      left[i] += (l * .72 + r * .28) * gain;
      right[i] += (r * .72 + l * .28) * gain;
    }
  }
}

function encodeWav(left, right) {
  let peak = .001;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const scale = .91 / peak;
  const dataBytes = frames * 4;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataBytes, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 4, 28); buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < frames; i++) {
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(left[i] * scale * 32767))), 44 + i * 4);
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(right[i] * scale * 32767))), 46 + i * 4);
  }
  return buffer;
}

function render(index, filename) {
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const progression = progressions[index];
  const melody = melodies[index];
  const beat = .78 - index * .055;
  progression.forEach((chord, chordIndex) => {
    const start = chordIndex * beat * 4;
    chord.forEach((note, voice) => addNote(left, right, note + 12, start, beat * 4.35, .047, 'strings', (voice - 1.5) * .32));
    addNote(left, right, chord[0] - 12, start, beat * 3.7, .11, 'bass', -.12);
    [0, 1, 2, 3].forEach((step) => chord.forEach((note, voice) => addNote(left, right, note + 12, start + step * beat, beat * .82, .038, 'piano', (voice - 1.5) * .2)));
  });
  melody.forEach((note, i) => addNote(left, right, note, i * beat, beat * (i % 4 === 3 ? 1.45 : .74), .085, 'piano', .22));
  addReverb(left, right);
  writeFileSync(join(outDir, filename), encodeWav(left, right));
}

render(0, 'continuation.wav');
render(1, 'chord-to-music.wav');
render(2, 'accompaniment.wav');
