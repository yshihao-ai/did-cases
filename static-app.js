const tasks = {
  continue: { index:'01', label:'Music Continuation', en:'CONTINUATION' },
  chord: { index:'02', label:'Chord-to-Music', en:'CHORD-CONDITIONED' },
  accomp: { index:'03', label:'Accompaniment', en:'ACCOMPANIMENT' }
};

const continuationCases = window.CONTINUATION_CASES || {};
const chordCases = window.CHORD_CASES || {};
const accompanimentCases = window.ACCOMPANIMENT_CASES || {};
const audio = document.querySelector('#audio');
const play = document.querySelector('#play');
const progress = document.querySelector('#progress');
const continuationSwitch = document.querySelector('#continuation-switch');
const chordSwitch = document.querySelector('#chord-switch');
const accompanimentSwitch = document.querySelector('#accompaniment-switch');

let active = 'continue';
let selectedContinuation = '041';
let selectedChord = '283';
let selectedAccomp = '057';
let removeMelody = false;
let pendingSeek = 0;
let duration = 64;

const format = value => {
  const safe = Number.isFinite(value) ? value : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2,'0')}:${seconds.toFixed(1).padStart(4,'0')}`;
};

function getTask(id=active) {
  if (id === 'continue') {
    const caseData = continuationCases[selectedContinuation] || Object.values(continuationCases)[0];
    return { ...tasks.continue, ...caseData, title:caseData?.title || `Continuation / ${selectedContinuation}` };
  }
  if (id === 'chord') {
    const caseData = chordCases[selectedChord] || Object.values(chordCases)[0];
    return { ...tasks.chord, ...caseData, title:caseData?.title || `Chord-to-Music / ${selectedChord}` };
  }
  const caseData = accompanimentCases[selectedAccomp] || Object.values(accompanimentCases)[0];
  const mixDescription = removeMelody
    ? ' Melody is removed; only PIANO and BRIDGE remain.'
    : ' The full mix includes MELODY, BRIDGE, and PIANO.';
  return {
    ...tasks.accomp,
    ...caseData,
    title:caseData?.title || `Accompaniment / ${selectedAccomp}`,
    description:`${caseData.description}${mixDescription}`,
    audio:removeMelody ? caseData.audioNoMelody : caseData.audioFull,
    midi:removeMelody ? caseData.midiNoMelody : caseData.midiFull
  };
}

function updateTime() {
  const time = audio.currentTime || 0;
  progress.value = time;
  document.querySelector('#current-time').textContent = format(time);
}

function updateCase(task, preserveTime=false) {
  pendingSeek = preserveTime ? audio.currentTime : 0;
  audio.pause();
  audio.src = task.audio;
  audio.load();
  duration = task.duration || 64;
  progress.max = duration;
  play.textContent = '▶';
  document.querySelector('#case-eyebrow').textContent = `CASE ${task.index} / ${task.en}`;
  document.querySelector('#case-title').textContent = `${task.label} · ${task.title}`;
  document.querySelector('#case-description').textContent = task.description;
  document.querySelector('#case-bars').textContent = `${task.bars} BARS`;
  document.querySelector('#case-bpm').textContent = `♩ ${task.bpm} BPM`;
  document.querySelector('#download').href = task.audio;
  const midiDownload = document.querySelector('#midi-download');
  midiDownload.hidden = !task.midi;
  if (task.midi) midiDownload.href = task.midi;
  document.querySelector('#duration').textContent = format(duration);
  updateTime();
}

function selectTask(id) {
  active = id;
  document.querySelectorAll('[data-task]').forEach(button => {
    const on = button.dataset.task === id;
    button.classList.toggle('active', on);
    button.setAttribute('aria-selected', String(on));
  });
  continuationSwitch.hidden = id !== 'continue';
  chordSwitch.hidden = id !== 'chord';
  accompanimentSwitch.hidden = id !== 'accomp';
  updateCase(getTask(id));
}

function selectCase(selector, datasetKey, id) {
  document.querySelectorAll(selector).forEach(button => {
    const on = button.dataset[datasetKey] === id;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
}

function selectContinuationCase(id) {
  selectedContinuation = id;
  selectCase('[data-continuation-case]', 'continuationCase', id);
  if (active === 'continue') updateCase(getTask('continue'));
}

function selectChordCase(id) {
  selectedChord = id;
  selectCase('[data-chord-case]', 'chordCase', id);
  if (active === 'chord') updateCase(getTask('chord'));
}

function selectAccompCase(id) {
  selectedAccomp = id;
  selectCase('[data-accomp-case]', 'accompCase', id);
  if (active === 'accomp') updateCase(getTask('accomp'));
}

document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => selectTask(button.dataset.task)));
document.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => {
  selectTask(button.dataset.jump);
  document.querySelector('#cases').scrollIntoView({ behavior:'smooth' });
}));
document.querySelectorAll('[data-continuation-case]').forEach(button => button.addEventListener('click', () => selectContinuationCase(button.dataset.continuationCase)));
document.querySelectorAll('[data-chord-case]').forEach(button => button.addEventListener('click', () => selectChordCase(button.dataset.chordCase)));
document.querySelectorAll('[data-accomp-case]').forEach(button => button.addEventListener('click', () => selectAccompCase(button.dataset.accompCase)));
document.querySelector('#remove-melody').addEventListener('change', event => {
  removeMelody = event.target.checked;
  if (active === 'accomp') updateCase(getTask('accomp'), true);
});

play.addEventListener('click', () => audio.paused ? audio.play() : audio.pause());
audio.addEventListener('play', () => {
  play.textContent = 'Ⅱ';
  play.setAttribute('aria-label', 'Pause');
});
audio.addEventListener('pause', () => {
  play.textContent = '▶';
  play.setAttribute('aria-label', 'Play');
});
audio.addEventListener('loadedmetadata', () => {
  duration = audio.duration || duration;
  progress.max = duration;
  if (pendingSeek) {
    audio.currentTime = Math.min(pendingSeek, duration);
    pendingSeek = 0;
  }
  document.querySelector('#duration').textContent = format(duration);
  updateTime();
});
audio.addEventListener('timeupdate', updateTime);
audio.addEventListener('ended', () => {
  audio.currentTime = 0;
  updateTime();
});
progress.addEventListener('input', () => {
  audio.currentTime = Number(progress.value);
  updateTime();
});

selectContinuationCase(selectedContinuation);
selectChordCase(selectedChord);
selectAccompCase(selectedAccomp);
selectTask('continue');
