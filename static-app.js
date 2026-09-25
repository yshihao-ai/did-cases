const continuationCases = window.CONTINUATION_CASES || {};
const chordCases = window.CHORD_CASES || {};
const accompanimentCases = window.ACCOMPANIMENT_CASES || {};
const players = [];
const AUDIO_REVISION = 'd3pia-sgm-1';

const versionedAudio = source => `${source}${source.includes('?') ? '&' : '?'}v=${AUDIO_REVISION}`;

const format = value => {
  const safe = Number.isFinite(value) ? value : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2,'0')}:${seconds.toFixed(1).padStart(4,'0')}`;
};

function createPlayer(key, data, type) {
  const isAccompaniment = type === 'accompaniment';
  const audioSrc = isAccompaniment ? data.audioFull : data.audio;
  const audioUrl = versionedAudio(audioSrc);
  const midiSrc = isAccompaniment ? data.midiFull : data.midi;
  const article = document.createElement('article');
  article.className = 'audio-case';
  article.innerHTML = `
    <div class="audio-case-head">
      <h3>${data.title || key}</h3>
      <div class="row-meta">
        ${isAccompaniment ? '<span class="mix-state">Full mix</span>' : ''}
        <span>${data.bars || 32} bars</span><span>♩ ${data.bpm || 120} BPM</span>
      </div>
    </div>
    <div class="transport audio-only-player">
      <audio preload="metadata" src="${audioUrl}"></audio>
      <button class="play" type="button" aria-label="Play ${data.title || key}">▶</button>
      <span class="time current-time">00:00.0</span>
      <input class="progress" aria-label="Playback progress for ${data.title || key}" type="range" min="0" max="${data.duration || 64}" step="0.01" value="0" />
      <span class="time duration">${format(data.duration || 64)}</span>
      <a class="download audio-download" href="${audioUrl}" download>FLAC</a>
      <a class="download midi-download" href="${midiSrc}" download>MIDI</a>
    </div>`;

  const audio = article.querySelector('audio');
  const play = article.querySelector('.play');
  const progress = article.querySelector('.progress');
  const currentTime = article.querySelector('.current-time');
  const durationLabel = article.querySelector('.duration');
  const player = { article, audio, play, progress, currentTime, durationLabel, data, type };
  players.push(player);

  const updateTime = () => {
    const time = audio.currentTime || 0;
    progress.value = time;
    currentTime.textContent = format(time);
  };

  play.addEventListener('click', async () => {
    if (audio.paused) {
      players.forEach(item => { if (item.audio !== audio) item.audio.pause(); });
      try { await audio.play(); } catch (error) { console.error('Playback failed', error); }
    } else {
      audio.pause();
    }
  });
  audio.addEventListener('play', () => { play.textContent = 'Ⅱ'; play.setAttribute('aria-label', `Pause ${data.title || key}`); });
  audio.addEventListener('pause', () => { play.textContent = '▶'; play.setAttribute('aria-label', `Play ${data.title || key}`); });
  audio.addEventListener('loadedmetadata', () => {
    const duration = audio.duration || data.duration || 64;
    progress.max = duration;
    durationLabel.textContent = format(duration);
    updateTime();
  });
  audio.addEventListener('timeupdate', updateTime);
  audio.addEventListener('ended', () => { audio.currentTime = 0; updateTime(); });
  progress.addEventListener('input', () => { audio.currentTime = Number(progress.value); updateTime(); });
  return article;
}

function renderCases(targetId, cases, type) {
  const target = document.querySelector(targetId);
  Object.entries(cases)
    .sort(([first], [second]) => Number(first) - Number(second))
    .forEach(([key, data]) => target.appendChild(createPlayer(key, data, type)));
}

renderCases('#continuation-list', continuationCases, 'continuation');
renderCases('#chord-list', chordCases, 'chord');
renderCases('#accompaniment-list', accompanimentCases, 'accompaniment');

document.querySelector('#remove-melody').addEventListener('change', event => {
  const removeMelody = event.target.checked;
  players.filter(player => player.type === 'accompaniment').forEach(player => {
    const currentTime = player.audio.currentTime || 0;
    const wasPlaying = !player.audio.paused;
    player.audio.pause();
    const audioSrc = removeMelody ? player.data.audioNoMelody : player.data.audioFull;
    const midiSrc = removeMelody ? player.data.midiNoMelody : player.data.midiFull;
    const audioUrl = versionedAudio(audioSrc);
    player.audio.src = audioUrl;
    player.article.querySelector('.audio-download').href = audioUrl;
    player.article.querySelector('.midi-download').href = midiSrc;
    player.article.querySelector('.mix-state').textContent = removeMelody ? 'Piano + bridge' : 'Full mix';
    player.audio.load();
    player.audio.addEventListener('loadedmetadata', async () => {
      player.audio.currentTime = Math.min(currentTime, player.audio.duration || currentTime);
      if (wasPlaying) {
        try { await player.audio.play(); } catch (error) { console.error('Playback failed', error); }
      }
    }, { once:true });
  });
});
