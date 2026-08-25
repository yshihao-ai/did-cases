const tasks = {
  continue: { index:'01', label:'音乐续写', en:'CONTINUATION', color:'#ff6b4a', title:'Nocturne in C', description:'给定前 8 小节，模型续写后 8 小节。竖线处是条件与生成结果的边界。', audio:'./public/audio/continuation.wav', bpm:96, bars:16, prompt:'8-bar piano prompt', seed:1 },
  chord: { index:'02', label:'和弦生成', en:'CHORD → MUSIC', color:'#b9ff66', title:'Neon After Rain', description:'仅输入和弦走向，模型完成旋律、织体与声部安排。和弦标签保持在时间轴顶部。', audio:'./public/audio/chord-to-music.wav', bpm:108, bars:12, prompt:'Cm⁹ · A♭maj7 · E♭ · B♭sus4', seed:2 },
  accomp: { index:'03', label:'伴奏生成', en:'ACCOMPANIMENT', color:'#70c8ff', title:'Blue Hour', description:'锁定主旋律轨道，生成钢琴、弦乐与贝斯伴奏；不同轨道使用固定颜色区分。', audio:'./public/audio/accompaniment.wav', bpm:82, bars:12, prompt:'Lead melody · 12 bars', seed:3 }
};
const colors = ['#ff6b4a','#b9ff66','#70c8ff'];
const audio = document.querySelector('#audio');
const play = document.querySelector('#play');
const progress = document.querySelector('#progress');
const waterfall = document.querySelector('#waterfall');
const timeline = document.querySelector('#timeline');
const playhead = document.querySelector('#playhead');
const visible = [true,true,true];
let active = 'continue';
let duration = 15.5;
let notes = [];

const format = value => `00:${(Number.isFinite(value) ? value : 0).toFixed(1).padStart(4,'0')}`;
function buildNotes(seed) {
  notes = Array.from({length:72},(_,i)=>({ id:i, pitch:43+((i*7+i%9+seed*3)%39), start:((i*1.37+seed)%15), length:.22+(i%5)*.16, track:i%3 }));
  waterfall.querySelectorAll('.fall-note').forEach(n=>n.remove());
  timeline.querySelectorAll('.note').forEach(n=>n.remove());
  notes.forEach(note=>{
    const fall=document.createElement('i'); fall.className='fall-note'; fall.dataset.id=note.id; fall.dataset.track=note.track; fall.style.left=`${((note.pitch-40)/48)*100}%`; fall.style.height=`${Math.max(8,note.length*54)}px`; fall.style.background=colors[note.track]; waterfall.appendChild(fall);
    const bar=document.createElement('i'); bar.className='note'; bar.dataset.track=note.track; bar.style.left=`${(note.start/duration)*100}%`; bar.style.top=`${100-((note.pitch-40)/48)*88}%`; bar.style.width=`${Math.max(1.2,(note.length/duration)*100)}%`; bar.style.background=colors[note.track]; timeline.appendChild(bar);
  });
  render();
}
function render(){
  const time=audio.currentTime||0;
  notes.forEach(note=>{ const el=waterfall.querySelector(`[data-id="${note.id}"]`); if(!el)return; const y=270-(note.start-time)*54; el.style.top=`${y}px`; el.style.opacity=(visible[note.track]&&y>-60&&y<340)?'1':'0'; });
  timeline.querySelectorAll('.note').forEach(el=>el.style.display=visible[Number(el.dataset.track)]?'block':'none');
  playhead.style.left=`${(time/duration)*100}%`; playhead.querySelector('b').textContent=`${time.toFixed(1)}s`; progress.value=time; document.querySelector('#current-time').textContent=format(time);
  if(!audio.paused) requestAnimationFrame(render);
}
function selectTask(id){
  active=id; const task=tasks[id]; audio.pause(); audio.src=task.audio; audio.load(); play.textContent='▶';
  document.querySelectorAll('[data-task]').forEach(button=>{const on=button.dataset.task===id;button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on));});
  document.querySelector('#case-eyebrow').textContent=`CASE ${task.index} / ${task.en}`; document.querySelector('#case-title').textContent=`${task.label} · ${task.title}`; document.querySelector('#case-description').textContent=task.description; document.querySelector('#case-bars').textContent=`${task.bars} BARS`; document.querySelector('#case-bpm').textContent=`♩ ${task.bpm} BPM`; document.querySelector('#case-prompt').textContent=task.prompt; document.querySelector('#download').href=task.audio; document.querySelector('#visualizer').style.setProperty('--accent',task.color); buildNotes(task.seed);
}
document.querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',()=>selectTask(button.dataset.task)));
document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{selectTask(button.dataset.jump);document.querySelector('#cases').scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('[data-track]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.track);visible[i]=!visible[i];button.classList.toggle('disabled',!visible[i]);button.querySelector('b').textContent=visible[i]?'显示':'隐藏';render();}));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{const isWaterfall=button.dataset.view==='waterfall';waterfall.hidden=!isWaterfall;timeline.hidden=isWaterfall;document.querySelectorAll('[data-view]').forEach(item=>item.classList.toggle('active',item===button));}));
play.addEventListener('click',()=>audio.paused?audio.play():audio.pause()); audio.addEventListener('play',()=>{play.textContent='Ⅱ';play.setAttribute('aria-label','暂停');render();}); audio.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','播放');}); audio.addEventListener('loadedmetadata',()=>{duration=audio.duration||15.5;progress.max=duration;document.querySelector('#duration').textContent=format(duration);buildNotes(tasks[active].seed);}); audio.addEventListener('timeupdate',render); audio.addEventListener('ended',()=>{audio.currentTime=0;render();}); progress.addEventListener('input',()=>{audio.currentTime=Number(progress.value);render();});
document.querySelector('#keyboard').innerHTML=Array.from({length:28},(_,i)=>`<i class="${[1,3,6].includes(i%7)?'black':''}"></i>`).join('');
selectTask('continue');
