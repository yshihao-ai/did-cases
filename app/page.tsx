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
  { id: 'continue', index: '01', label: '音乐续写', en: 'Continuation', color: '#ff6b4a', title: 'Nocturne in C', description: '给定前 8 小节，模型续写后 8 小节。竖线处是条件与生成结果的边界。', audio: '/audio/continuation.wav', bpm: 96, bars: 16, prompt: '8-bar piano prompt' },
  { id: 'chord', index: '02', label: '和弦生成', en: 'Chord → Music', color: '#b9ff66', title: 'Neon After Rain', description: '仅输入和弦走向，模型完成旋律、织体与声部安排。和弦标签保持在时间轴顶部。', audio: '/audio/chord-to-music.wav', bpm: 108, bars: 12, prompt: 'Cm⁹ · A♭maj7 · E♭ · B♭sus4' },
  { id: 'accomp', index: '03', label: '伴奏生成', en: 'Accompaniment', color: '#70c8ff', title: 'Blue Hour', description: '锁定主旋律轨道，生成钢琴、弦乐与贝斯伴奏；不同轨道使用固定颜色区分。', audio: '/audio/accompaniment.wav', bpm: 82, bars: 12, prompt: 'Lead melody · 12 bars' },
];

const tracks = [
  { name: 'Piano', cn: '钢琴', color: '#ff6b4a' },
  { name: 'Strings', cn: '弦乐', color: '#b9ff66' },
  { name: 'Bass', cn: '贝斯', color: '#70c8ff' },
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
        <a className="brand" href="#top" aria-label="DID Music 首页"><span className="brand-mark">D/</span><span>DID MUSIC MODEL</span></a>
        <nav aria-label="页面导航"><a href="#cases">Case studies</a><a href="#method">Pipeline</a></nav>
        <span className="status"><i /> MODEL SHOWCASE · 2026</span>
      </header>

      <section className="hero" id="top">
        <div><p className="eyebrow">GENERATIVE MUSIC / THREE TASKS</p><h1>听见模型<br/><em>如何思考。</em></h1></div>
        <div className="hero-copy"><p>三个任务，一套统一的听觉与视觉语言。播放高质量离线渲染音频，同时检查结构、生成边界与每一条轨道。</p><span>↓ 选择任务开始试听</span></div>
      </section>

      <section className="workspace" id="cases">
        <div className="task-tabs" role="tablist" aria-label="生成任务">
          {tasks.map((task) => <button key={task.id} role="tab" aria-selected={active === task.id} className={active === task.id ? 'active' : ''} onClick={() => setActive(task.id)}><span>{task.index}</span><strong>{task.label}</strong><small>{task.en}</small></button>)}
        </div>

        <div className="case-head">
          <div><p className="eyebrow">CASE {selected.index} / {selected.en.toUpperCase()}</p><h2>{selected.label} · {selected.title}</h2><p className="case-description">{selected.description}</p></div>
          <div className="chips"><span>{selected.bars} BARS</span><span>♩ {selected.bpm} BPM</span><span>WAV · 48 KHZ</span></div>
        </div>

        <div className="studio-grid">
          <aside className="track-panel">
            <p className="panel-label">TRACKS / 轨道</p>
            {tracks.map((track, index) => <button key={track.name} className={visibleTracks[index] ? '' : 'disabled'} onClick={() => setVisibleTracks((value) => value.map((item, i) => i === index ? !item : item))}><i style={{ background: track.color }} /><span><strong>{track.cn}</strong><small>{track.name}</small></span><b>{visibleTracks[index] ? '显示' : '隐藏'}</b></button>)}
            <div className="prompt-card"><span>CONDITION</span><p>{selected.prompt}</p></div>
          </aside>

          <div>
            <div className="visualizer" style={{ '--accent': selected.color } as React.CSSProperties}>
              <div className="visualizer-top"><span>REAL-TIME PIANO ROLL</span><div className="view-switch"><button className={view === 'waterfall' ? 'active' : ''} onClick={() => setView('waterfall')}>瀑布</button><button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>时间轴</button></div></div>
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
              <button className="play" onClick={togglePlay} aria-label={playing ? '暂停' : '播放'}>{playing ? 'Ⅱ' : '▶'}</button>
              <span className="time">{formatTime(time)}</span>
              <input aria-label="播放进度" type="range" min="0" max={duration || 18} step="0.01" value={time} onChange={(e) => seek(Number(e.target.value))} />
              <span className="time">{formatTime(duration)}</span>
              <a className="download" href={selected.audio} download>↓ WAV</a>
            </div>
          </div>
        </div>

        <div className="case-index">
          {tasks.map((task) => <button key={task.id} onClick={() => { setActive(task.id); document.querySelector('#cases')?.scrollIntoView({ behavior: 'smooth' }); }}><span style={{ background: task.color }}>{task.index}</span><div><strong>{task.label}</strong><small>{task.en}</small></div><b>→</b></button>)}
        </div>
      </section>

      <section className="method" id="method">
        <div className="method-title"><p className="eyebrow">RECOMMENDED FOUNDATION</p><h2>高质量音频留在后端，<br/><em>浏览器只负责忠实呈现。</em></h2></div>
        <div className="pipeline">
          <article><span>01 / PARSE</span><h3>MIDI 时间轴</h3><p>用 @tonejs/midi 解析音符、速度、乐器与轨道信息，生成前端钢琴卷所需的统一 JSON。</p><a href="https://github.com/Tonejs/Midi" target="_blank" rel="noreferrer">Tonejs/Midi ↗</a></article>
          <article><span>02 / RENDER</span><h3>采样级音色</h3><p>FluidSynth 加载 SF2/SF3，以 48 kHz 离线渲染 WAV；音质由所选 SoundFont、动态与混响共同决定。</p><a href="https://github.com/FluidSynth/fluidsynth" target="_blank" rel="noreferrer">FluidSynth ↗</a></article>
          <article><span>03 / SYNC</span><h3>音频主时钟</h3><p>网页以真实音频 currentTime 为唯一时钟驱动瀑布钢琴卷，不让动画与最终听到的音频漂移。</p><a href="https://github.com/cifkao/html-midi-player" target="_blank" rel="noreferrer">Visualizer reference ↗</a></article>
        </div>
        <div className="quality-note"><strong>音色策略</strong><p>完整 GM 多乐器可从 FluidR3 或 GeneralUser GS 起步；论文展示建议为钢琴、弦乐等重点轨道配置更好的专用采样库，再统一做响度与峰值归一化。不要使用浏览器振荡器作为最终 case study 音频。</p><span>FLUIDSYNTH → 48 KHZ WAV → OPTIONAL MP3 → WEB AUDIO MASTER CLOCK</span></div>
      </section>

      <footer><span>DID MUSIC MODEL / CASE STUDIES</span><span>THREE TASKS · ONE LISTENING SYSTEM</span></footer>
    </main>
  );
}
