const tasks = {
  continue: { index:'01', label:'音乐续写', en:'CONTINUATION', color:'#ff6b4a', title:'Nocturne in C', description:'给定前 8 小节，模型续写后 8 小节。竖线处是条件与生成结果的边界。', audio:'./public/audio/continuation.wav', bpm:96, bars:16, prompt:'8-bar piano prompt', seed:1 },
  chord: { index:'02', label:'和弦生成', en:'CHORD → MUSIC', color:'#b9ff66', title:'Neon After Rain', description:'仅输入和弦走向，模型完成旋律、织体与声部安排。和弦标签保持在时间轴顶部。', audio:'./public/audio/chord-to-music.wav', bpm:108, bars:12, prompt:'Cm⁹ · A♭maj7 · E♭ · B♭sus4', seed:2 },
  accomp: { index:'03', label:'伴奏生成', en:'ACCOMPANIMENT', color:'#70c8ff' }
};
const defaultTracks = [
  { name:'Piano', cn:'钢琴', color:'#ff6b4a' },
  { name:'Strings', cn:'弦乐', color:'#b9ff66' },
  { name:'Bass', cn:'贝斯', color:'#70c8ff' }
];
const trackNames = { MELODY:'主旋律', BRIDGE:'桥接声部', PIANO:'钢琴伴奏' };
const accompanimentCases = window.ACCOMPANIMENT_CASES || {};
const audio = document.querySelector('#audio');
const play = document.querySelector('#play');
const progress = document.querySelector('#progress');
const waterfall = document.querySelector('#waterfall');
const timeline = document.querySelector('#timeline');
const playhead = document.querySelector('#playhead');
const sampleSwitch = document.querySelector('#sample-switch');
const visible = [true,true,true];
let active = 'continue';
let selectedAccomp = '283';
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
  if (id !== 'accomp') return tasks[id];
  const caseData = accompanimentCases[selectedAccomp] || Object.values(accompanimentCases)[0];
  return { ...tasks.accomp, ...caseData, title:caseData?.title || `POP909 / ${selectedAccomp}` };
}
function makeDemoNotes(seed) {
  return Array.from({length:72},(_,i)=>({ id:i, pitch:43+((i*7+i%9+seed*3)%39), start:((i*1.37+seed)%15), length:.22+(i%5)*.16, velocity:96, track:i%3 }));
}
function buildNotes(task) {
  notes = (task.notes || makeDemoNotes(task.seed)).map((note,id)=>({...note,id}));
  activeTracks = task.tracks?.map((track,index)=>({
    name:track.name,
    cn:trackNames[track.name] || `轨道 ${index+1}`,
    color:track.color
  })) || defaultTracks;
  const pitches = notes.map(note=>note.pitch);
  pitchMin = Math.max(0,Math.min(...pitches)-2);
  const pitchMax = Math.min(127,Math.max(...pitches)+2);
  pitchSpan = Math.max(12,pitchMax-pitchMin);
  waterfall.querySelectorAll('.fall-note').forEach(note=>note.remove());
  timeline.querySelectorAll('.note').forEach(note=>note.remove());
  notes.forEach(note=>{
    const color = activeTracks[note.track]?.color || '#70c8ff';
    const fall=document.createElement('i');
    fall.className='fall-note';
    fall.dataset.track=note.track;
    fall.style.left=`${((note.pitch-pitchMin)/pitchSpan)*100}%`;
    fall.style.height=`${Math.max(7,note.length*54)}px`;
    fall.style.background=color;
    fall.style.opacity=String(.35 + (note.velocity || 90)/127*.65);
    waterfall.appendChild(fall);
    note.fallEl=fall;
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
  document.querySelectorAll('[data-track]').forEach((button,index)=>{
    const track=activeTracks[index] || defaultTracks[index];
    button.querySelector('i').style.background=track.color;
    button.querySelector('strong').textContent=track.cn;
    button.querySelector('small').textContent=track.name;
    button.classList.toggle('disabled',!visible[index]);
    button.querySelector('b').textContent=visible[index]?'显示':'隐藏';
  });
}
function render(){
  const time=audio.currentTime||0;
  notes.forEach(note=>{
    const y=270-(note.start-time)*54;
    if(note.fallEl){
      note.fallEl.style.top=`${y}px`;
      note.fallEl.style.visibility=(visible[note.track]&&y>-80&&y<350)?'visible':'hidden';
    }
    if(note.timelineEl) note.timelineEl.style.display=visible[note.track]?'block':'none';
  });
  playhead.style.left=`${Math.min(100,(time/duration)*100)}%`;
  playhead.querySelector('b').textContent=`${time.toFixed(1)}s`;
  progress.value=time;
  document.querySelector('#current-time').textContent=format(time);
  if(!audio.paused) requestAnimationFrame(render);
}
function updateCase(task){
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
  sampleSwitch.hidden=id!=='accomp';
  updateCase(getTask(id));
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
document.querySelectorAll('[data-accomp-case]').forEach(button=>button.addEventListener('click',()=>selectAccompCase(button.dataset.accompCase)));
document.querySelectorAll('[data-track]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.track);visible[i]=!visible[i];renderTrackPanel();render();}));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{const isWaterfall=button.dataset.view==='waterfall';waterfall.hidden=!isWaterfall;timeline.hidden=isWaterfall;document.querySelectorAll('[data-view]').forEach(item=>item.classList.toggle('active',item===button));}));
play.addEventListener('click',()=>audio.paused?audio.play():audio.pause());
audio.addEventListener('play',()=>{play.textContent='Ⅱ';play.setAttribute('aria-label','暂停');render();});
audio.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','播放');});
audio.addEventListener('loadedmetadata',()=>{duration=audio.duration||duration;progress.max=duration;document.querySelector('#duration').textContent=format(duration);buildNotes(getTask());});
audio.addEventListener('timeupdate',render);
audio.addEventListener('ended',()=>{audio.currentTime=0;render();});
progress.addEventListener('input',()=>{audio.currentTime=Number(progress.value);render();});
document.querySelector('#keyboard').innerHTML=Array.from({length:28},(_,i)=>`<i class="${[1,3,6].includes(i%7)?'black':''}"></i>`).join('');
selectAccompCase(selectedAccomp);
selectTask('continue');
