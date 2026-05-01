const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const muteButton = document.getElementById('muteButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const overlayStats = document.getElementById('overlayStats');
const leaderboardPanel = document.getElementById('leaderboardPanel');
const restartButton = document.getElementById('restartButton');
const scoreDisplay = document.getElementById('scoreDisplay');

const GAME_WIDTH = 288;
const GAME_HEIGHT = 512;
const GROUND_HEIGHT = 112;
const PIPE_WIDTH = 56;
const PIPE_GAP = 120;const PIPE_HOLE_SPACING = 100;const PIPE_SPACING = 150;
const PIPE_SPEED_BASE = 2.2;
const SPEED_INCREMENT = 0.12;
const GRAVITY = 0.35;
const FLAP_VELOCITY = -7.0;
const MAX_DROP_SPEED = 12;
const STORAGE_KEY = 'flappyLeaderboard';
const MUTE_KEY = 'flappyMute';
const APP_VERSION = '1.0.0';

const CHARACTERS = [
  { id: 'bird', name: 'Bird', colors: { body: '#f5d84f', head: '#f5d84f', wing: '#e8c23f', tail: '#d4a835', beak: '#ffb042' } },
  { id: 'cat', name: 'Cat', colors: { body: '#ff9f43', head: '#ff9f43', wing: '#e67e22', tail: '#d35400', beak: '#ffeaa7' } },
  { id: 'dog', name: 'Dog', colors: { body: '#a29bfe', head: '#a29bfe', wing: '#8e7aff', tail: '#6c5ce7', beak: '#fd79a8' } },
  { id: 'frog', name: 'Frog', colors: { body: '#00b894', head: '#00b894', wing: '#00a383', tail: '#00856d', beak: '#55efc4' } },
  { id: 'bat', name: 'Bat', colors: { body: '#636e72', head: '#636e72', wing: '#2d3436', tail: '#1e272e', beak: '#d63031' } },
  { id: 'penguin', name: 'Penguin', colors: { body: '#2d3436', head: '#2d3436', wing: '#636e72', tail: '#000', beak: '#fdcb6e' } },
  { id: 'parrot', name: 'Parrot', colors: { body: '#e17055', head: '#e17055', wing: '#00b894', tail: '#fdcb6e', beak: '#fff' } },
  { id: 'owl', name: 'Owl', colors: { body: '#a0522d', head: '#a0522d', wing: '#8b4513', tail: '#654321', beak: '#ffa500' } },
  { id: 'eagle', name: 'Eagle', colors: { body: '#4a3728', head: '#fff', wing: '#4a3728', tail: '#2c1810', beak: '#f39c12' } },
  { id: 'bluebird', name: 'Bluebird', colors: { body: '#3498db', head: '#3498db', wing: '#2980b9', tail: '#1abc9c', beak: '#2c3e50' } },
  { id: 'cardinal', name: 'Cardinal', colors: { body: '#c0392b', head: '#c0392b', wing: '#922b21', tail: '#7b241c', beak: '#d35400' } },
  { id: 'goldfinch', name: 'Goldfinch', colors: { body: '#f1c40f', head: '#f1c40f', wing: '#f39c12', tail: '#f1c40f', beak: '#7f8c8d' } },
  { id: 'robin', name: 'Robin', colors: { body: '#e74c3c', head: '#e74c3c', wing: '#2c3e50', tail: '#1a252f', beak: '#f1c40f' } },
  { id: 'jay', name: 'Jay', colors: { body: '#3498db', head: '#fff', wing: '#2980b9', tail: '#1abc9c', beak: '#000' } },
  { id: 'finch', name: 'Finch', colors: { body: '#e67e22', head: '#e67e22', wing: '#d35400', tail: '#a04000', beak: '#95a5a6' } },
  { id: 'wren', name: 'Wren', colors: { body: '#8b4513', head: '#8b4513', wing: '#654321', tail: '#4a300d', beak: '#2c1810' } },
  { id: 'swan', name: 'Swan', colors: { body: '#fff', head: '#fff', wing: '#ecf0f1', tail: '#bdc3c7', beak: '#e74c3c' } },
  { id: 'peacock', name: 'Peacock', colors: { body: '#27ae60', head: '#27ae60', wing: '#2980b9', tail: '#9b59b6', beak: '#f39c12' } },
];

const CHARACTER_KEY = 'flappyCharacter';

const gameState = {
  TITLE: 'TITLE',
  READY: 'READY',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

let state = gameState.TITLE;
let lastFrameTime = 0;
let bird = { x: 72, y: GAME_HEIGHT / 2, vy: 0, radius: 18, angle: 0 };
let pipes = [];
let score = 0;
let level = 1;
let bestScore = 0;
let leaderboard = [];
let speed = PIPE_SPEED_BASE;
let distanceSinceLastPipe = 0;
let explosionParticles = [];
let isMuted = false;
let selectedCharacter = CHARACTERS[0];
let musicNode = null;
let audioContext = null;
let audioInitialized = false;

// Version tracking - available in console via `APP_VERSION`
console.log(`%c Flappy Bird v${APP_VERSION}`, 'color: #666; font-style: italic;');

function resizeCanvas() {
  const ratio = GAME_WIDTH / GAME_HEIGHT;
  const maxWidth = Math.min(window.innerWidth - 32, 360);
  const width = maxWidth;
  const height = Math.round(width / ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function loadStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.entries)) {
      leaderboard = data.entries.slice(0, 10);
      bestScore = Number(data.bestScore) || 0;
    } else {
      leaderboard = [];
      bestScore = 0;
    }
  } catch (error) {
    leaderboard = [];
    bestScore = 0;
  }
  try {
    const muteRaw = window.localStorage.getItem(MUTE_KEY);
    if (muteRaw !== null) {
      isMuted = muteRaw === 'true';
    }
  } catch (error) {
    isMuted = false;
  }
  try {
    const charRaw = window.localStorage.getItem(CHARACTER_KEY);
    if (charRaw) {
      const found = CHARACTERS.find(c => c.id === charRaw);
      if (found) selectedCharacter = found;
    }
  } catch (error) {
    // use default
  }
  updateMuteButton();
}

function saveStorage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bestScore, entries: leaderboard }));
  } catch (error) {
    // ignore storage errors
  }
  try {
    window.localStorage.setItem(MUTE_KEY, String(isMuted));
  } catch (error) {
    // ignore storage errors
  }
  try {
    window.localStorage.setItem(CHARACTER_KEY, selectedCharacter.id);
  } catch (error) {
    // ignore storage errors
  }
}

function addScoreEntry(value) {
  const entry = { score: value, date: new Date().toISOString() };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  bestScore = Math.max(bestScore, value);
  saveStorage();
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderLeaderboard() {
  if (!leaderboard.length) {
    leaderboardPanel.innerHTML = '<p>No saved leaderboard entries yet.</p>';
    return;
  }
  const rows = leaderboard.slice(0, 5).map((entry, index) => {
    return `<li>${index + 1}. ${entry.score} - ${formatDate(entry.date)}</li>`;
  });
  leaderboardPanel.innerHTML = `<h2>Top Scores</h2><ul>${rows.join('')}</ul>`;
}

function renderCharacterSelector() {
  const chars = CHARACTERS.map(c => {
    const isSelected = c.id === selectedCharacter.id;
    return `<button class="char-btn ${isSelected ? 'selected' : ''}" data-id="${c.id}" style="background:${c.colors.body}">${c.name[0]}</button>`;
  }).join('');
  return `<div id="charSelector"><h3>Choose Character</h3><div class="char-grid">${chars}</div></div>`;
}

function selectCharacter(id) {
  const found = CHARACTERS.find(c => c.id === id);
  if (found) {
    selectedCharacter = found;
    saveStorage();
    renderCharacterButtons();
  }
}

function renderCharacterButtons() {
  const container = document.getElementById('charSelector');
  if (!container) return;
  const btns = container.querySelectorAll('.char-btn');
  btns.forEach(btn => {
    const isSelected = btn.dataset.id === selectedCharacter.id;
    btn.classList.toggle('selected', isSelected);
    btn.style.border = isSelected ? '3px solid #fff' : '3px solid transparent';
  });
}

function attachCharacterListeners() {
  const container = document.getElementById('charSelector');
  if (!container) return;
  container.querySelectorAll('.char-btn').forEach(btn => {
    btn.onclick = () => selectCharacter(btn.dataset.id);
  });
}

function updateMuteButton() {
  muteButton.textContent = isMuted ? '🔇' : '🔊';
}

function initAudio() {
  if (audioInitialized) return;
  audioInitialized = true;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  startBackgroundMusic();
}

function createSound(type) {
  if (!audioContext || isMuted) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);

  const now = audioContext.currentTime;
  if (type === 'flap') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(520, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  } else if (type === 'point') {
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(660, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  } else if (type === 'crash') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  }
  oscillator.start(now);
  oscillator.stop(now + 0.5);
}

function startBackgroundMusic() {
  if (!audioContext || isMuted) return;
  stopBackgroundMusic();
  
  // Main oscillator - energetic square wave
  musicNode = audioContext.createOscillator();
  const musicGain = audioContext.createGain();
  musicNode.connect(musicGain);
  musicGain.connect(audioContext.destination);
  musicNode.type = 'square';
  musicNode.frequency.setValueAtTime(330, audioContext.currentTime);
  musicGain.gain.setValueAtTime(0.06, audioContext.currentTime);
  musicNode.start();
  
  // Second oscillator for harmony
  const musicNode2 = audioContext.createOscillator();
  const musicGain2 = audioContext.createGain();
  musicNode2.connect(musicGain2);
  musicGain2.connect(audioContext.destination);
  musicNode2.type = 'square';
  musicNode2.frequency.setValueAtTime(165, audioContext.currentTime);
  musicGain2.gain.setValueAtTime(0.04, audioContext.currentTime);
  musicNode2.start();
  
  let step = 0;
  // Upbeat sequence - higher energy notes
  const sequence = [330, 392, 440, 494, 523, 494, 440, 392];
  const interval = setInterval(() => {
    if (!musicNode) {
      clearInterval(interval);
      return;
    }
    musicNode.frequency.linearRampToValueAtTime(sequence[step % sequence.length], audioContext.currentTime + 0.08);
    musicNode2.frequency.linearRampToValueAtTime(sequence[step % sequence.length] / 2, audioContext.currentTime + 0.08);
    step += 1;
  }, 200); // Faster tempo
  musicNode._intervalId = interval;
  musicNode._secondOsc = musicNode2;
}

function stopBackgroundMusic() {
  if (!musicNode) return;
  clearInterval(musicNode._intervalId);
  try {
    musicNode.stop();
  } catch (err) {
    // ignore already stopped
  }
  if (musicNode._secondOsc) {
    try {
      musicNode._secondOsc.stop();
    } catch (err) {
      // ignore
    }
  }
  musicNode = null;
}

function setMute(value) {
  isMuted = value;
  updateMuteButton();
  if (audioContext) {
    if (isMuted) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  }
  saveStorage();
}

function resetGame() {
  state = gameState.TITLE;
  bird = { x: 72, y: GAME_HEIGHT / 2, vy: 0, radius: 10, angle: 0 };
  pipes = [];
  score = 0;
  level = 1;
  speed = PIPE_SPEED_BASE;
  distanceSinceLastPipe = 0;  explosionParticles = [];  overlayTitle.textContent = 'FLAPPY BIRD';
  overlaySubtitle.textContent = 'Tap or press Space / Arrow Up';
  overlayStats.innerHTML = `<p>Best score: ${bestScore}</p>${renderCharacterSelector()}`;
  restartButton.textContent = 'TAP TO START';
  renderLeaderboard();
  attachCharacterListeners();
  overlay.classList.remove('hidden');
  scoreDisplay.textContent = '0';
}

function startReady() {
  if (state === gameState.TITLE || state === gameState.GAME_OVER) {
    state = gameState.READY;
    overlayTitle.textContent = 'GET READY';
    overlaySubtitle.textContent = 'Tap or press Space / Arrow Up';
    overlayStats.innerHTML = '<p>Flap to begin.</p>';
    restartButton.textContent = 'TAP TO FLAP';
    overlay.classList.remove('hidden');
    bird.vy = 0;
    bird.angle = 0;
    pipes = [];
    distanceSinceLastPipe = 0;
    score = 0;
    speed = PIPE_SPEED_BASE;
    scoreDisplay.textContent = '0';
  }
}

function startPlaying() {
  if (state !== gameState.READY) return;
  state = gameState.PLAYING;
  overlay.classList.add('hidden');
  overlayStats.innerHTML = '';
  spawnPipe();
}

function startGameOver() {
  state = gameState.GAME_OVER;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'GAME OVER';
  overlaySubtitle.textContent = 'Tap or press any key to restart';
  overlayStats.innerHTML = `<p>Score: ${score}</p><p>Best: ${bestScore}</p>`;
  restartButton.textContent = 'RESTART';
  addScoreEntry(score);
  renderLeaderboard();
  createSound('crash');
  createExplosion(bird.x, bird.y);
}

function createExplosion(x, y) {
  explosionParticles = [];
  const colors = ['#ffcb45', '#ff8c00', '#f55d2d'];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.8 + Math.random() * 2.5;
    explosionParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.05 + Math.random() * 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function drawExplosion() {
  for (const p of explosionParticles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
}

function spawnPipe() {
  const minGapY1 = 70;
  const maxGapY1 = GAME_HEIGHT - GROUND_HEIGHT - PIPE_GAP * 2 - PIPE_HOLE_SPACING - 40;
  const gapY1 = Math.random() * (maxGapY1 - minGapY1) + minGapY1;
  const gapY2 = gapY1 + PIPE_GAP + PIPE_HOLE_SPACING;
  pipes.push({ x: GAME_WIDTH, gapY1, gapY2, passed: false });
}

function flap() {
  if (!audioInitialized) initAudio();
  if (state === gameState.TITLE) {
    startReady();
    return;
  }
  if (state === gameState.READY) {
    startPlaying();
  }
  if (state === gameState.PLAYING || state === gameState.READY) {
    bird.vy = FLAP_VELOCITY;
    bird.angle = -0.5;
    createSound('flap');
  }
  if (state === gameState.GAME_OVER) {
    resetGame();
  }
}

function update(delta) {
  if (state === gameState.READY) {
    bird.y = GAME_HEIGHT / 2 + Math.sin(Date.now() / 250) * 8;
    bird.angle = Math.sin(Date.now() / 300) * 0.1;
    return;
  }
  if (state === gameState.GAME_OVER) {
    updateExplosion(delta);
    return;
  }
  if (state !== gameState.PLAYING) return;

  bird.vy = Math.min(bird.vy + GRAVITY, MAX_DROP_SPEED);
  bird.y += bird.vy;
  bird.angle = Math.min((bird.vy / 14) * 0.8, 0.9);

  const frameSpeed = speed * (delta / 16.7);
  distanceSinceLastPipe += frameSpeed;
  if (distanceSinceLastPipe > PIPE_SPACING) {
    distanceSinceLastPipe = 0;
    spawnPipe();
  }

  for (const pipe of pipes) {
    pipe.x -= frameSpeed;
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += 1;
      createSound('point');
      speed = PIPE_SPEED_BASE + score * SPEED_INCREMENT;
      scoreDisplay.textContent = String(score);
      // Level changes every 10 points
      level = Math.min(Math.floor(score / 10) + 1, 10);
    }
  }

  pipes = pipes.filter(pipe => pipe.x > -PIPE_WIDTH);

  if (checkCollision()) {
    startGameOver();
  }
}

function updateExplosion(delta) {
  const dt = delta / 16.7;
  explosionParticles = explosionParticles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.08 * dt;
    p.life -= p.decay * dt;
    return p.life > 0;
  });
}

function checkCollision() {
  const birdTop = bird.y - bird.radius;
  const birdBottom = bird.y + bird.radius;
  if (birdTop <= 0 || birdBottom >= GAME_HEIGHT - GROUND_HEIGHT) {
    return true;
  }

  for (const pipe of pipes) {
    if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + PIPE_WIDTH) {
      const inTopHole = birdTop >= pipe.gapY1 && birdBottom <= pipe.gapY1 + PIPE_GAP;
      const inBottomHole = birdTop >= pipe.gapY2 && birdBottom <= pipe.gapY2 + PIPE_GAP;
      if (!inTopHole && !inBottomHole) {
        return true;
      }
    }
  }
  return false;
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Gradient sky - changes every 10 points
  const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  const skyColors = {
    1: ['#87CEEB', '#70c5ce', '#70c5ce', '#98D8E8'], // Blue
    2: ['#a29bfe', '#6c5ce7', '#6c5ce7', '#2c2150'], // Purple
    3: ['#55efc4', '#00b894', '#00a383', '#00684d'], // Green
    4: ['#ff6b6b', '#ee5a24', '#d63031', '#8c1a1a'], // Red
    5: ['#fd79a8', '#e84393', '#d63384', '#a32b5e'], // Pink
    6: ['#ffeaa7', '#fdcb6e', '#f39c12', '#d68910'], // Orange
    7: ['#81ecec', '#00cec9', '#00b5a8', '#008b8b'], // Cyan
    8: ['#dfe6e9', '#b2bec3', '#636e72', '#2d3436'], // Gray
    9: ['#55efc4', '#00b894', '#0984e3', '#2c2150'], // Teal
    10: ['#ff7675', '#d63031', '#e17055', '#6c1a1a'], // Dark Red
  };
  const colors = skyColors[level] || skyColors[10];
  skyGradient.addColorStop(0, colors[0]);
  skyGradient.addColorStop(0.33, colors[1]);
  skyGradient.addColorStop(0.66, colors[2]);
  skyGradient.addColorStop(1, colors[3]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground();
  drawPipes();
  drawGround();
  if (state === gameState.GAME_OVER && explosionParticles.length > 0) {
    drawExplosion();
  } else {
    drawBird();
  }

  if (state === gameState.TITLE) {
    drawTitleHint();
  }
  if (state === gameState.READY) {
    drawReadyHint();
  }
  if (state === gameState.GAME_OVER) {
    drawGameOverHint();
  }
}

function drawBackground() {
  // City skyline - far buildings
  const buildingColors = ['#2d3436', '#636e72', '#4a5568', '#5a6577', '#3d4852'];
  const buildings = [
    { x: -20, w: 40, h: 120, color: 0 },
    { x: 10, w: 30, h: 90, color: 1 },
    { x: 35, w: 50, h: 140, color: 2 },
    { x: 75, w: 35, h: 100, color: 3 },
    { x: 105, w: 45, h: 130, color: 4 },
    { x: 140, w: 55, h: 150, color: 0 },
    { x: 185, w: 30, h: 85, color: 1 },
    { x: 210, w: 40, h: 115, color: 2 },
    { x: 245, w: 50, h: 135, color: 3 },
    { x: 290, w: 35, h: 95, color: 4 },
  ];
  
  const baseY = GAME_HEIGHT - GROUND_HEIGHT;
  for (const b of buildings) {
    ctx.fillStyle = buildingColors[b.color];
    ctx.fillRect(b.x, baseY - b.h, b.w, b.h);
    
    // Windows - use deterministic pattern based on position
    ctx.fillStyle = 'rgba(255, 255, 150, 0.6)';
    const windowRows = Math.floor(b.h / 16);
    const windowCols = Math.floor(b.w / 12);
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        // Use building position and window position to create consistent pattern
        const isLit = ((b.x + row + col) % 3) !== 0;
        if (isLit) {
          ctx.fillRect(b.x + 4 + col * 12, baseY - b.h + 8 + row * 16, 6, 8);
        }
      }
    }
  }
  
  // Closer buildings (darker silhouette)
  const nearBuildings = [
    { x: -10, w: 35, h: 80 },
    { x: 60, w: 45, h: 100 },
    { x: 130, w: 40, h: 70 },
    { x: 200, w: 50, h: 90 },
    { x: 270, w: 30, h: 60 },
  ];
  ctx.fillStyle = '#1a1a2e';
  for (const b of nearBuildings) {
    ctx.fillRect(b.x, baseY - b.h, b.w, b.h);
  }
  
  // Cloud shadows on ground
  for (let x = 0; x < GAME_WIDTH; x += 48) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT - 16, 24, 8);
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.arc(15, -5, 15, 0, Math.PI * 2);
  ctx.arc(30, 0, 18, 0, Math.PI * 2);
  ctx.arc(12, 8, 12, 0, Math.PI * 2);
  ctx.arc(25, 10, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  // Ground base with gradient
  const groundGradient = ctx.createLinearGradient(0, GAME_HEIGHT - GROUND_HEIGHT, 0, GAME_HEIGHT);
  groundGradient.addColorStop(0, '#d2b04c');
  groundGradient.addColorStop(0.3, '#cea741');
  groundGradient.addColorStop(1, '#a88632');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
  
  // Ground texture lines
  ctx.fillStyle = '#b8953d';
  for (let x = 0; x < GAME_WIDTH; x += 16) {
    ctx.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT + 24, 14, 10);
  }
  
  // Ground top edge highlight
  ctx.fillStyle = '#e8c76a';
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, 4);
  
  // Ground bottom shadow
  ctx.fillStyle = '#8a6a28';
  ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
}

function drawPipes() {
  for (const pipe of pipes) {
    // Pipe body with gradient for 3D effect
    const pipeGradientLeft = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    pipeGradientLeft.addColorStop(0, '#1e7a2e');
    pipeGradientLeft.addColorStop(0.3, '#299b3b');
    pipeGradientLeft.addColorStop(0.7, '#299b3b');
    pipeGradientLeft.addColorStop(1, '#166b1f');
    
    ctx.fillStyle = pipeGradientLeft;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY1);
    ctx.fillRect(pipe.x, pipe.gapY1 + PIPE_GAP, PIPE_WIDTH, pipe.gapY2 - (pipe.gapY1 + PIPE_GAP));
    ctx.fillRect(pipe.x, pipe.gapY2 + PIPE_GAP, PIPE_WIDTH, GAME_HEIGHT - GROUND_HEIGHT - pipe.gapY2 - PIPE_GAP);
    
    // Pipe caps with 3D highlight
    const capGradientTop = ctx.createLinearGradient(pipe.x - 2, pipe.gapY1 - 10, pipe.x + PIPE_WIDTH + 2, pipe.gapY1);
    capGradientTop.addColorStop(0, '#166b1f');
    capGradientTop.addColorStop(0.5, '#2da843');
    capGradientTop.addColorStop(1, '#1e7a2e');
    
    ctx.fillStyle = capGradientTop;
    ctx.fillRect(pipe.x - 2, pipe.gapY1 - 10, PIPE_WIDTH + 4, 10);
    ctx.fillRect(pipe.x - 2, pipe.gapY1 + PIPE_GAP, PIPE_WIDTH + 4, 10);
    ctx.fillRect(pipe.x - 2, pipe.gapY2 - 10, PIPE_WIDTH + 4, 10);
    ctx.fillRect(pipe.x - 2, pipe.gapY2 + PIPE_GAP, PIPE_WIDTH + 4, 10);
    
    // Pipe edge highlights
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(pipe.x, pipe.gapY1 - 10, 3, 10);
    ctx.fillRect(pipe.x, pipe.gapY1 + PIPE_GAP, 3, 10);
    ctx.fillRect(pipe.x, pipe.gapY2 - 10, 3, 10);
    ctx.fillRect(pipe.x, pipe.gapY2 + PIPE_GAP, 3, 10);
  }
}

function drawBird() {
  const c = selectedCharacter.colors;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);
  
  // Body shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(2, 2, 9, 0, Math.PI * 2);
  ctx.fill();
  
  // Main body with gradient
  const bodyGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, 9);
  bodyGradient.addColorStop(0, c.body);
  bodyGradient.addColorStop(1, shadeColor(c.body, -20));
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  const headGradient = ctx.createRadialGradient(-2, -10, 0, 0, -8, 5.5);
  headGradient.addColorStop(0, c.head);
  headGradient.addColorStop(1, shadeColor(c.head, -20));
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.arc(0, -8, 5.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Wing with gradient
  const wingGradient = ctx.createRadialGradient(-8, 0, 0, -6, 0, 6);
  wingGradient.addColorStop(0, c.wing);
  wingGradient.addColorStop(1, shadeColor(c.wing, -15));
  ctx.fillStyle = wingGradient;
  ctx.beginPath();
  ctx.arc(-6, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Wing feather detail
  ctx.strokeStyle = shadeColor(c.wing, -25);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-6, 0, -2, -1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.quadraticCurveTo(-5, 2, -2, 1);
  ctx.stroke();
  
  // Tail
  const tailGradient = ctx.createLinearGradient(-14, 0, -6, 0);
  tailGradient.addColorStop(0, shadeColor(c.tail, -10));
  tailGradient.addColorStop(1, c.tail);
  ctx.fillStyle = tailGradient;
  ctx.beginPath();
  ctx.arc(-10, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak with gradient
  const beakGradient = ctx.createLinearGradient(6, -4, 14, 4);
  beakGradient.addColorStop(0, shadeColor(c.beak, -10));
  beakGradient.addColorStop(0.5, c.beak);
  beakGradient.addColorStop(1, shadeColor(c.beak, 10));
  ctx.fillStyle = beakGradient;
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.quadraticCurveTo(14, 0, 8, 4);
  ctx.quadraticCurveTo(10, 0, 8, -4);
  ctx.fill();
  
  // Eye white
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(2, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupil
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(3, -7, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(4, -8, 0.75, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Helper to darken/lighten colors
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function drawTitleHint() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(36, 150, 216, 120);
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Tap or press Space / Arrow Up', GAME_WIDTH / 2, 190);
}

function drawReadyHint() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(56, 150, 176, 92);
  ctx.fillStyle = '#fff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GET READY', GAME_WIDTH / 2, 190);
}

function drawGameOverHint() {
  // no canvas overlay when using DOM overlay
}

function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function handleInput(event) {
  if (event.type === 'keydown') {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    event.preventDefault();
  }
  flap();
}

muteButton.addEventListener('click', () => {
  setMute(!isMuted);
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.getElementById('game-shell').requestFullscreen().catch(err => {
      console.log('Fullscreen error:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

fullscreenButton.addEventListener('click', toggleFullscreen);
overlay.addEventListener('pointerdown', (event) => {
  if (event.target === overlay) {
    handleInput(event);
  }
});
canvas.addEventListener('pointerdown', handleInput);
restartButton.addEventListener('click', handleInput);
window.addEventListener('keydown', handleInput);
window.addEventListener('resize', resizeCanvas);

loadStorage();
resizeCanvas();
resetGame();
requestAnimationFrame(gameLoop);
