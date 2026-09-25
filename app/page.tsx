'use client';

import { useEffect, useRef, useState } from 'react';

type Task = {
  id: string;
  index: string;
  label: string;
  en: string;
  color: string;
  title: string;
  description: string;
  audio: string;
  bpm: number;
  bars: number;
  prompt: string;
};

const tasks: Task[] = [
  { id: 'continue', index: '01', label: 'Music Continuation', en: 'Continuation', color: '#000', title: 'Continuation / 041', description: 'The first 4 bars are the prompt; bars 5–32 are generated continuation, standardized to 120 BPM for evaluation.', audio: '/audio/continuation-041.mp3', bpm: 120, bars: 32, prompt: 'Bars 1–4: prompt · bars 5–32: continuation' },
  { id: 'chord', index: '02', label: 'Chord-to-Music', en: 'Chord-conditioned', color: '#000', title: 'Chord-to-Music / 283', description: 'Chord-conditioned generation standardized to 120 BPM for evaluation.', audio: '/audio/chord-283.mp3', bpm: 120, bars: 32, prompt: 'Chord-conditioned generation · first 32 bars' },
  { id: 'accomp', index: '03', label: 'Accompaniment', en: 'Accompaniment generation', color: '#000', title: 'Accompaniment / 057', description: 'Accompaniment generation with synchronized MELODY, BRIDGE, and PIANO tracks.', audio: '/audio/accompaniment-057.mp3', bpm: 120, bars: 32, prompt: 'Case 057 · first 32 bars' },
];

function formatTime(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
}

export default function Home() {
  const [active, setActive] = useState('continue');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(18);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selected = tasks.find((task) => task.id === active)!;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setTime(0);
    audio.load();
  }, [active]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setTime(value);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DID Music home"><span className="brand-mark">D/</span><span>DID MUSIC</span></a>
        <nav aria-label="Page navigation"><a href="#cases">Case studies</a></nav>
        <span className="status"><i /> MODEL SHOWCASE · 2026</span>
      </header>

      <section className="hero" id="top">
        <div><p className="eyebrow">DID / SYMBOLIC MUSIC GENERATION</p><h1 className="model-title">DID: <em>2D Autoregressive Modeling with a Decoder-in-Decoder Architecture</em></h1></div>
        <div className="hero-copy"><p>Continuation, chord-conditioned generation, and accompaniment generation presented as compact audio case studies.</p><span>↓ SELECT A TASK TO LISTEN</span></div>
      </section>

      <section className="workspace" id="cases">
        <div className="task-tabs" role="tablist" aria-label="Generation tasks">
          {tasks.map((task) => <button key={task.id} role="tab" aria-selected={active === task.id} className={active === task.id ? 'active' : ''} onClick={() => setActive(task.id)}><span>{task.index}</span><strong>{task.label}</strong><small>{task.en}</small></button>)}
        </div>

        <div className="case-head">
          <div><p className="eyebrow">CASE {selected.index} / {selected.en.toUpperCase()}</p><h2>{selected.label} · {selected.title}</h2><p className="case-description">{selected.description}</p></div>
          <div className="chips"><span>{selected.bars} BARS</span><span>♩ {selected.bpm} BPM</span><span>MP3 · 192 KBPS</span></div>
        </div>

        <div className="transport audio-only-player">
          <audio ref={audioRef} src={selected.audio} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); }} />
          <button className="play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Ⅱ' : '▶'}</button>
          <span className="time">{formatTime(time)}</span>
          <input aria-label="Playback progress" type="range" min="0" max={duration || 64} step="0.01" value={time} onChange={(e) => seek(Number(e.target.value))} />
          <span className="time">{formatTime(duration)}</span>
          <a className="download" href={selected.audio} download>↓ MP3</a>
        </div>

        <div className="case-index">
          {tasks.map((task) => <button key={task.id} onClick={() => { setActive(task.id); document.querySelector('#cases')?.scrollIntoView({ behavior: 'smooth' }); }}><span style={{ background: task.color }}>{task.index}</span><div><strong>{task.label}</strong><small>{task.en}</small></div><b>→</b></button>)}
        </div>
      </section>

      <footer><span>DID MUSIC MODEL / CASE STUDIES</span><span>THREE TASKS · ONE LISTENING SYSTEM</span></footer>
    </main>
  );
}
