'use client';

import { useState, type ReactNode } from 'react';

type Sample = {
  id: string;
  title: string;
  audio: string;
  midi: string;
  audioNoMelody?: string;
  midiNoMelody?: string;
};

const continuation: Sample[] = [
  { id:'pop1k7-645', title:'Continuation / Pop1k7 / 645', audio:'/audio/continuation-pop1k7-645.flac', midi:'/midi/continuation-pop1k7-645.mid' },
  { id:'pop909-671', title:'Continuation / Pop909 / 671', audio:'/audio/continuation-pop909-671.flac', midi:'/midi/continuation-pop909-671.mid' },
  { id:'pop909-319', title:'Continuation / Pop909 / 319', audio:'/audio/continuation-pop909-319.flac', midi:'/midi/continuation-pop909-319.mid' },
  { id:'pop909-053', title:'Continuation / Pop909 / 053', audio:'/audio/continuation-pop909-053.flac', midi:'/midi/continuation-pop909-053.mid' },
  { id:'pop1k7-1485', title:'Continuation / Pop1k7 / 1485', audio:'/audio/continuation-pop1k7-1485.flac', midi:'/midi/continuation-pop1k7-1485.mid' },
  { id:'pop909-705', title:'Continuation / Pop909 / 705', audio:'/audio/continuation-pop909-705.flac', midi:'/midi/continuation-pop909-705.mid' },
  { id:'pop909-558', title:'Continuation / Pop909 / 558', audio:'/audio/continuation-pop909-558.flac', midi:'/midi/continuation-pop909-558.mid' },
  { id:'pop909-874', title:'Continuation / Pop909 / 874', audio:'/audio/continuation-pop909-874.flac', midi:'/midi/continuation-pop909-874.mid' },
  { id:'pop909-662', title:'Continuation / Pop909 / 662', audio:'/audio/continuation-pop909-662.flac', midi:'/midi/continuation-pop909-662.mid' },
  { id:'pop1k7-1486', title:'Continuation / Pop1k7 / 1486', audio:'/audio/continuation-pop1k7-1486.flac', midi:'/midi/continuation-pop1k7-1486.mid' },
  { id:'pop1k7-1452', title:'Continuation / Pop1k7 / 1452', audio:'/audio/continuation-pop1k7-1452.flac', midi:'/midi/continuation-pop1k7-1452.mid' },
  { id:'pop1k7-149', title:'Continuation / Pop1k7 / 149', audio:'/audio/continuation-pop1k7-149.flac', midi:'/midi/continuation-pop1k7-149.mid' },
  { id:'pop1k7-851', title:'Continuation / Pop1k7 / 851', audio:'/audio/continuation-pop1k7-851.flac', midi:'/midi/continuation-pop1k7-851.mid' },
  { id:'pop1k7-673', title:'Continuation / Pop1k7 / 673', audio:'/audio/continuation-pop1k7-673.flac', midi:'/midi/continuation-pop1k7-673.mid' },
  { id:'pop1k7-916', title:'Continuation / Pop1k7 / 916', audio:'/audio/continuation-pop1k7-916.flac', midi:'/midi/continuation-pop1k7-916.mid' },
  { id:'pop1k7-1680', title:'Continuation / Pop1k7 / 1680', audio:'/audio/continuation-pop1k7-1680.flac', midi:'/midi/continuation-pop1k7-1680.mid' },
];

const chord: Sample[] = [
  { id:'283', title:'Chord-to-Music / 283', audio:'/audio/chord-283.flac', midi:'/midi/chord-283.mid' },
  { id:'346', title:'Chord-to-Music / 346', audio:'/audio/chord-346.flac', midi:'/midi/chord-346.mid' },
];

const accompaniment: Sample[] = [
  { id:'057', title:'Accompaniment / 057', audio:'/audio/accompaniment-057.flac', midi:'/midi/057.mid', audioNoMelody:'/audio/accompaniment-057-no-melody.flac', midiNoMelody:'/midi/057-no-melody.mid' },
  { id:'125', title:'Accompaniment / 125', audio:'/audio/accompaniment-125.flac', midi:'/midi/125.mid', audioNoMelody:'/audio/accompaniment-125-no-melody.flac', midiNoMelody:'/midi/125-no-melody.mid' },
  { id:'129', title:'Accompaniment / 129', audio:'/audio/accompaniment-129.flac', midi:'/midi/129.mid', audioNoMelody:'/audio/accompaniment-129-no-melody.flac', midiNoMelody:'/midi/129-no-melody.mid' },
  { id:'264', title:'Accompaniment / 264', audio:'/audio/accompaniment-264.flac', midi:'/midi/264.mid', audioNoMelody:'/audio/accompaniment-264-no-melody.flac', midiNoMelody:'/midi/264-no-melody.mid' },
  { id:'283', title:'Accompaniment / 283', audio:'/audio/accompaniment-283.flac', midi:'/midi/283.mid', audioNoMelody:'/audio/accompaniment-283-no-melody.flac', midiNoMelody:'/midi/283-no-melody.mid' },
  { id:'290', title:'Accompaniment / 290', audio:'/audio/accompaniment-290.flac', midi:'/midi/290.mid', audioNoMelody:'/audio/accompaniment-290-no-melody.flac', midiNoMelody:'/midi/290-no-melody.mid' },
  { id:'346', title:'Accompaniment / 346', audio:'/audio/accompaniment-346.flac', midi:'/midi/346.mid', audioNoMelody:'/audio/accompaniment-346-no-melody.flac', midiNoMelody:'/midi/346-no-melody.mid' },
  { id:'720', title:'Accompaniment / 720', audio:'/audio/accompaniment-720.flac', midi:'/midi/720.mid', audioNoMelody:'/audio/accompaniment-720-no-melody.flac', midiNoMelody:'/midi/720-no-melody.mid' },
  { id:'748', title:'Accompaniment / 748', audio:'/audio/accompaniment-748.flac', midi:'/midi/748.mid', audioNoMelody:'/audio/accompaniment-748-no-melody.flac', midiNoMelody:'/midi/748-no-melody.mid' },
];

function AudioRow({ sample, removeMelody=false }: { sample: Sample; removeMelody?: boolean }) {
  const audio = removeMelody && sample.audioNoMelody ? sample.audioNoMelody : sample.audio;
  const audioUrl = `${audio}?v=continuation-remove-133-837-1`;
  const midi = removeMelody && sample.midiNoMelody ? sample.midiNoMelody : sample.midi;
  return (
    <article className="audio-case">
      <div className="audio-case-head">
        <h3>{sample.title}</h3>
        <div className="row-meta">
          {sample.audioNoMelody && <span className="mix-state">{removeMelody ? 'Piano + bridge' : 'Full mix'}</span>}
          <span>32 bars</span><span>♩ 90 BPM</span>
        </div>
      </div>
      <audio key={audioUrl} className="native-audio" controls preload="metadata" src={audioUrl} />
      <div className="row-meta"><a className="download" href={audioUrl} download>FLAC</a><a className="download" href={midi} download>MIDI</a></div>
    </article>
  );
}

function TaskGroup({ index, eyebrow, title, description, samples, removeMelody=false, children }: { index:string; eyebrow:string; title:string; description:string; samples:Sample[]; removeMelody?:boolean; children?:ReactNode }) {
  return (
    <section className="task-group">
      <div className="task-heading">
        <div><p className="case-label">{index} / {eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
        <div className="task-actions">{children}<div className="chips"><span>32 BARS</span><span>♩ 90 BPM</span><span>FLAC · LOSSLESS</span></div></div>
      </div>
      <div className="case-list">{samples.map(sample => <AudioRow key={sample.id} sample={sample} removeMelody={removeMelody} />)}</div>
    </section>
  );
}

export default function Home() {
  const [removeMelody, setRemoveMelody] = useState(false);
  return (
    <>
      <header className="site-header"><nav className="site-nav" aria-label="Page navigation"><a className="wordmark" href="#top">DID</a><div className="nav-links"><a href="#cases">Case studies</a></div></nav></header>
      <main>
        <section className="hero" id="top">
          <p className="kicker">SYMBOLIC MUSIC GENERATION · INTERACTIVE CASE STUDY</p>
          <h1>DID: <em>2D Autoregressive Modeling with a Decoder-in-Decoder Architecture</em></h1>
          <p className="hero-summary">Accompaniment generation, chord-conditioned generation, and continuation presented as compact audio case studies.</p>
        </section>
        <section className="paper-section cases" id="cases">
          <TaskGroup index="01" eyebrow="ACCOMPANIMENT" title="Accompaniment Generation" description="Melody-conditioned piano and bridge accompaniment." samples={accompaniment} removeMelody={removeMelody}>
            <label className="isolation-toggle"><input type="checkbox" checked={removeMelody} onChange={event => setRemoveMelody(event.target.checked)} /><span><strong>Remove melody</strong><small>Piano + bridge only</small></span></label>
          </TaskGroup>
          <TaskGroup index="02" eyebrow="CHORD-CONDITIONED" title="Chord-to-Music" description="Music generated from a given chord progression." samples={chord} />
          <TaskGroup index="03" eyebrow="CONTINUATION" title="Music Continuation" description="The first 4 bars are the prompt; bars 5–32 are generated by DID." samples={continuation} />
        </section>
      </main>
      <footer><span>DID · Symbolic Music Generation</span><span>Interactive case studies</span></footer>
    </>
  );
}
