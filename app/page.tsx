'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  { id: 'continue', index: '01', label: 'Music Continuation', en: 'Continuation', color: '#ff6b4a', title: 'Continuation / 634', description: 'A DID music continuation case, presented as the first 32 bars with its original tempo curve.', audio: '/audio/continuation-634.wav', bpm: 95, bars: 32, prompt: 'Continuation case 634 · first 32 bars' },
  { id: 'chord', index: '02', label: 'Chord-to-Music', en: 'Chord-conditioned', color: '#b9ff66', title: 'Neon After Rain', description: 'Given only a chord progression, the model generates melody, texture, and voice arrangement.', audio: '/audio/chord-to-music.wav', bpm: 108, bars: 12, prompt: 'Cm⁹ · A♭maj7 · E♭ · B♭sus4' },
  { id: 'accomp', index: '03', label: 'Accompaniment', en: 'Accompaniment generation', color: '#70c8ff', title: 'POP909 Cases', description: 'Accompaniment generation with synchronized MELODY, BRIDGE, and PIANO tracks.', audio: '/audio/accompaniment-283.wav', bpm: 77, bars: 32, prompt: 'POP909 · first 32 bars' },
];

const tracks = [
  { name: 'Piano', label: 'PIANO', color: '#ff6b4a' },
  { name: 'Strings', label: 'STRINGS', color: '#b9ff66' },
  { name: 'Bass', label: 'BASS', color: '#70c8ff' },
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
  const [view, setView] = useState<'waterfall' | 'timeline'>('waterfall');
  const [visibleTracks, setVisibleTracks] = useState([true, true, true]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selected = tasks.find((task) => task.id === active)!;

  const notes = useMemo(() => Array.from({ length: 72 }, (_, i) => ({
    id: i,
    pitch: 43 + ((i * 7 + i % 9) % 39),
    start: ((i * 1.37 + (active.charCodeAt(0) % 4)) % 17.2),
    length: .22 + (i % 5) * .16,
    track: i % 3,
  })), [active]);

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
        <div className="hero-copy"><p>Continuation, chord-conditioned generation, and accompaniment generation, presented through one synchronized listening and visualization system.</p><span>↓ SELECT A TASK TO LISTEN</span></div>
      </section>

      <section className="workspace" id="cases">
        <div className="task-tabs" role="tablist" aria-label="Generation tasks">
          {tasks.map((task) => <button key={task.id} role="tab" aria-selected={active === task.id} className={active === task.id ? 'active' : ''} onClick={() => setActive(task.id)}><span>{task.index}</span><strong>{task.label}</strong><small>{task.en}</small></button>)}
        </div>

        <div className="case-head">
          <div><p className="eyebrow">CASE {selected.index} / {selected.en.toUpperCase()}</p><h2>{selected.label} · {selected.title}</h2><p className="case-description">{selected.description}</p></div>
          <div className="chips"><span>{selected.bars} BARS</span><span>♩ {selected.bpm} BPM</span><span>WAV · 48 KHZ</span></div>
        </div>

        <div className="studio-grid">
          <aside className="track-panel">
            <p className="panel-label">TRACKS</p>
            {tracks.map((track, index) => <button key={track.name} className={visibleTracks[index] ? '' : 'disabled'} onClick={() => setVisibleTracks((value) => value.map((item, i) => i === index ? !item : item))}><i style={{ background: track.color }} /><span><strong>{track.label}</strong><small>{track.name}</small></span><b>{visibleTracks[index] ? 'ON' : 'OFF'}</b></button>)}
            <div className="prompt-card"><span>CONDITION</span><p>{selected.prompt}</p></div>
          </aside>

          <div>
            <div className="visualizer" style={{ '--accent': selected.color } as React.CSSProperties}>
              <div className="visualizer-top"><span>REAL-TIME PIANO ROLL</span><div className="view-switch"><button className={view === 'waterfall' ? 'active' : ''} onClick={() => setView('waterfall')}>FALLING NOTES</button><button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>TIMELINE</button></div></div>
              {view === 'waterfall' ? (
                <div className="waterfall">
                  <div className="now-line"><span>NOW</span></div>
                  {notes.filter((note) => visibleTracks[note.track]).map((note) => {
                    const y = 270 - (note.start - time) * 54;
                    return <i key={note.id} className="fall-note" style={{ left: `${((note.pitch - 40) / 48) * 100}%`, top: y, height: Math.max(8, note.length * 54), background: tracks[note.track].color, opacity: y < -60 || y > 340 ? 0 : 1 }} />;
                  })}
                </div>
              ) : (
                <div className="roll">
                  <div className="bar-numbers"><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span></div>
                  <div className="playhead" style={{ left: `${(time / duration) * 100}%` }}><b>{time.toFixed(1)}s</b></div>
                  {notes.filter((note) => visibleTracks[note.track]).map((note) => <i key={note.id} className="note" style={{ left: `${(note.start / duration) * 100}%`, top: `${100 - ((note.pitch - 40) / 48) * 88}%`, width: `${Math.max(1.2, (note.length / duration) * 100)}%`, background: tracks[note.track].color }} />)}
                </div>
              )}
              <div className="keyboard" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} className={i % 7 === 1 || i % 7 === 3 || i % 7 === 6 ? 'black' : ''} />)}</div>
            </div>

            <div className="transport">
              <audio ref={audioRef} src={selected.audio} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); }} />
              <button className="play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Ⅱ' : '▶'}</button>
              <span className="time">{formatTime(time)}</span>
              <input aria-label="Playback progress" type="range" min="0" max={duration || 18} step="0.01" value={time} onChange={(e) => seek(Number(e.target.value))} />
              <span className="time">{formatTime(duration)}</span>
              <a className="download" href={selected.audio} download>↓ WAV</a>
            </div>
          </div>
        </div>

        <div className="case-index">
          {tasks.map((task) => <button key={task.id} onClick={() => { setActive(task.id); document.querySelector('#cases')?.scrollIntoView({ behavior: 'smooth' }); }}><span style={{ background: task.color }}>{task.index}</span><div><strong>{task.label}</strong><small>{task.en}</small></div><b>→</b></button>)}
        </div>
      </section>

      <footer><span>DID MUSIC MODEL / CASE STUDIES</span><span>THREE TASKS · ONE LISTENING SYSTEM</span></footer>
    </main>
  );
}
