const tasks = {
  continue: { index:'01', label:'Music Continuation', en:'CONTINUATION', color:'#000' },
  chord: { index:'02', label:'Chord-to-Music', en:'CHORD-CONDITIONED', color:'#000', title:'Neon After Rain', description:'Given only a chord progression, the model generates melody, texture, and voice arrangement.', audio:'./public/audio/chord-to-music.wav', bpm:108, bars:12, prompt:'Cm⁹ · A♭maj7 · E♭ · B♭sus4', seed:2 },
  accomp: { index:'03', label:'Accompaniment', en:'ACCOMPANIMENT', color:'#000' }
};
const trackPalette = ['#ff6b4a','#b9ff66','#70c8ff'];
const continuationColors = { prompt:'#ff6b4a', generated:'#70c8ff' };
const defaultTracks = [
  { name:'PIANO', detail:'Piano', color:trackPalette[0] },
  { name:'STRINGS', detail:'Strings', color:trackPalette[1] },
  { name:'BASS', detail:'Bass', color:trackPalette[2] }
];
const trackDetails = { MELODY:'Source melody', BRIDGE:'Bridge track', PIANO:'Generated accompaniment' };
const continuationCases = window.CONTINUATION_CASES || {};
const accompanimentCases = window.ACCOMPANIMENT_CASES || {};
const audio = document.querySelector('#audio');
const play = document.querySelector('#play');
const progress = document.querySelector('#progress');
const waterfall = document.querySelector('#waterfall');
const timeline = document.querySelector('#timeline');
const playhead = document.querySelector('#playhead');
const pianoLegend = document.querySelector('#piano-legend');
const continuationSwitch = document.querySelector('#continuation-switch');
const accompanimentSwitch = document.querySelector('#accompaniment-switch');
const visible = [true,true,true];
let active = 'continue';
let selectedContinuation = '634';
let selectedAccomp = '283';
let removeMelody = false;
let pendingSeek = 0;
let animationFrameId = 0;
let duration = 15.5;
let notes = [];
let activeTracks = defaultTracks;
let pitchMin = 40;
let pitchSpan = 48;

const format = value => {
  const safe = Number.isFinite(value) ? value : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2,'0')}:${seconds.toFixed(1).padStart(4,'0')}`;
};
function getTask(id=active) {
  if (id === 'continue') {
    const caseData = continuationCases[selectedContinuation] || Object.values(continuationCases)[0];
    return {
      ...tasks.continue,
      ...caseData,
      title:caseData?.title || `Continuation / ${selectedContinuation}`
    };
  }
  if (id !== 'accomp') return tasks[id];
  const caseData = accompanimentCases[selectedAccomp] || Object.values(accompanimentCases)[0];
  const mixDescription = removeMelody ? ' Melody is removed from both audio and visualization; only PIANO and BRIDGE remain.' : ' The full mix includes MELODY, BRIDGE, and PIANO.';
  return {
    ...tasks.accomp,
    ...caseData,
    title:caseData?.title || `POP909 / ${selectedAccomp}`,
    description:`${caseData.description}${mixDescription}`,
    audio:removeMelody ? caseData.audioNoMelody : caseData.audioFull,
    midi:removeMelody ? caseData.midiNoMelody : caseData.midiFull,
    notes:removeMelody ? caseData.notes.filter(note=>note.track!==0) : caseData.notes
  };
}
function makeDemoNotes(seed) {
  return Array.from({length:72},(_,i)=>({ id:i, pitch:43+((i*7+i%9+seed*3)%39), start:((i*1.37+seed)%15), length:.22+(i%5)*.16, velocity:96, track:i%3 }));
}
function buildNotes(task) {
  notes = (task.notes || makeDemoNotes(task.seed)).map((note,id)=>({...note,id}));
  activeTracks = task.tracks?.map((track,index)=>({
    name:track.name,
    detail:active === 'continue' && track.name === 'PIANO' ? 'Prompt + continuation' : trackDetails[track.name] || `Track ${index+1}`,
    color:trackPalette[index%trackPalette.length]
  })) || defaultTracks;
  const pitches = notes.map(note=>note.pitch);
  pitchMin = Math.max(0,Math.min(...pitches)-2);
  const pitchMax = Math.min(127,Math.max(...pitches)+2);
  pitchSpan = Math.max(12,pitchMax-pitchMin);
  waterfall.querySelectorAll('.fall-note').forEach(note=>note.remove());
  timeline.querySelectorAll('.note').forEach(note=>note.remove());
  notes.forEach(note=>{
    const color = active === 'continue'
      ? (note.start < (task.promptDuration || 0) ? continuationColors.prompt : continuationColors.generated)
      : (activeTracks[note.track]?.color || trackPalette[0]);
    const fall=document.createElement('i');
    fall.className='fall-note';
    fall.dataset.track=note.track;
    fall.style.left=`${((note.pitch-pitchMin)/pitchSpan)*100}%`;
    fall.style.height=`${Math.max(7,note.length*54)}px`;
    fall.style.background=color;
    fall.style.opacity=String(.35 + (note.velocity || 90)/127*.65);
    fall.style.visibility='hidden';
    waterfall.appendChild(fall);
    note.fallEl=fall;
    note.fallVisible=false;
    const bar=document.createElement('i');
    bar.className='note';
    bar.dataset.track=note.track;
    bar.style.left=`${(note.start/duration)*100}%`;
    bar.style.top=`${100-((note.pitch-pitchMin)/pitchSpan)*88}%`;
    bar.style.width=`${Math.max(.12,(note.length/duration)*100)}%`;
    bar.style.background=color;
    bar.style.opacity=String(.4 + (note.velocity || 90)/127*.6);
    timeline.appendChild(bar);
    note.timelineEl=bar;
  });
  renderTrackPanel();
  render();
}
function renderTrackPanel(){
  document.querySelectorAll('.track-button[data-track]').forEach((button,index)=>{
    const track=activeTracks[index] || defaultTracks[index];
    button.hidden=index>=activeTracks.length || (active==='accomp'&&removeMelody&&track.name==='MELODY');
    button.querySelector('i').style.background=track.color;
    button.querySelector('strong').textContent=track.name;
    button.querySelector('small').textContent=track.detail;
    button.classList.toggle('disabled',!visible[index]);
    button.querySelector('b').textContent=visible[index]?'ON':'OFF';
  });
  notes.forEach(note=>{if(note.timelineEl)note.timelineEl.style.display=visible[note.track]?'block':'none';});
}
function render(){
  const time=audio.currentTime||0;
  if(!waterfall.hidden) notes.forEach(note=>{
    const y=270-(note.start-time)*54;
    const shouldShow=visible[note.track]&&y>-80&&y<350;
    if(shouldShow){
      note.fallEl.style.transform=`translate3d(0,${y}px,0)`;
      if(!note.fallVisible){note.fallEl.style.visibility='visible';note.fallVisible=true;}
    }else if(note.fallVisible){
      note.fallEl.style.visibility='hidden';
      note.fallVisible=false;
    }
  });
  playhead.style.left=`${Math.min(100,(time/duration)*100)}%`;
  playhead.querySelector('b').textContent=`${time.toFixed(1)}s`;
  progress.value=time;
  document.querySelector('#current-time').textContent=format(time);
}
function animationLoop(){render();animationFrameId=requestAnimationFrame(animationLoop);}
function startAnimation(){if(!animationFrameId)animationFrameId=requestAnimationFrame(animationLoop);}
function stopAnimation(){if(animationFrameId)cancelAnimationFrame(animationFrameId);animationFrameId=0;render();}
function updateCase(task,preserveTime=false){
  pendingSeek=preserveTime ? audio.currentTime : 0;
  audio.pause();
  audio.src=task.audio;
  audio.load();
  duration=task.duration||15.5;
  progress.max=duration;
  play.textContent='▶';
  document.querySelector('#case-eyebrow').textContent=`CASE ${task.index} / ${task.en}`;
  document.querySelector('#case-title').textContent=`${task.label} · ${task.title}`;
  document.querySelector('#case-description').textContent=task.description;
  document.querySelector('#case-bars').textContent=`${task.bars} BARS`;
  document.querySelector('#case-bpm').textContent=`♩ ${task.bpm} BPM`;
  document.querySelector('#case-prompt').textContent=task.prompt;
  document.querySelector('#download').href=task.audio;
  const midiDownload=document.querySelector('#midi-download');
  midiDownload.hidden=!task.midi;
  if(task.midi) midiDownload.href=task.midi;
  document.querySelector('#visualizer').style.setProperty('--accent',task.color);
  pianoLegend.hidden=active!=='continue';
  document.querySelector('#duration').textContent=format(duration);
  buildNotes(task);
}
function selectTask(id){
  active=id;
  document.querySelectorAll('[data-task]').forEach(button=>{
    const on=button.dataset.task===id;
    button.classList.toggle('active',on);
    button.setAttribute('aria-selected',String(on));
  });
  continuationSwitch.hidden=id!=='continue';
  accompanimentSwitch.hidden=id!=='accomp';
  updateCase(getTask(id));
}
function selectContinuationCase(id){
  selectedContinuation=id;
  document.querySelectorAll('[data-continuation-case]').forEach(button=>{
    const on=button.dataset.continuationCase===id;
    button.classList.toggle('active',on);
    button.setAttribute('aria-pressed',String(on));
  });
  if(active==='continue') updateCase(getTask('continue'));
}
function selectAccompCase(id){
  selectedAccomp=id;
  document.querySelectorAll('[data-accomp-case]').forEach(button=>{
    const on=button.dataset.accompCase===id;
    button.classList.toggle('active',on);
    button.setAttribute('aria-pressed',String(on));
  });
  if(active==='accomp') updateCase(getTask('accomp'));
}
document.querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',()=>selectTask(button.dataset.task)));
document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{selectTask(button.dataset.jump);document.querySelector('#cases').scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('[data-continuation-case]').forEach(button=>button.addEventListener('click',()=>selectContinuationCase(button.dataset.continuationCase)));
document.querySelectorAll('[data-accomp-case]').forEach(button=>button.addEventListener('click',()=>selectAccompCase(button.dataset.accompCase)));
document.querySelector('#remove-melody').addEventListener('change',event=>{removeMelody=event.target.checked;if(active==='accomp')updateCase(getTask('accomp'),true);});
document.querySelectorAll('.track-button[data-track]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.track);visible[i]=!visible[i];renderTrackPanel();render();}));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{const isWaterfall=button.dataset.view==='waterfall';waterfall.hidden=!isWaterfall;timeline.hidden=isWaterfall;document.querySelectorAll('[data-view]').forEach(item=>item.classList.toggle('active',item===button));}));
play.addEventListener('click',()=>audio.paused?audio.play():audio.pause());
audio.addEventListener('play',()=>{play.textContent='Ⅱ';play.setAttribute('aria-label','Pause');startAnimation();});
audio.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','Play');stopAnimation();});
audio.addEventListener('loadedmetadata',()=>{duration=audio.duration||duration;progress.max=duration;if(pendingSeek){audio.currentTime=Math.min(pendingSeek,duration);pendingSeek=0;}document.querySelector('#duration').textContent=format(duration);buildNotes(getTask());});
audio.addEventListener('timeupdate',()=>{if(audio.paused)render();});
audio.addEventListener('ended',()=>{audio.currentTime=0;render();});
progress.addEventListener('input',()=>{audio.currentTime=Number(progress.value);render();});
document.querySelector('#keyboard').innerHTML=Array.from({length:28},(_,i)=>`<i class="${[1,3,6].includes(i%7)?'black':''}"></i>`).join('');
selectContinuationCase(selectedContinuation);
selectAccompCase(selectedAccomp);
selectTask('continue');
