const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const muteButton = document.getElementById('muteButton');
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
const GRAVITY = 0.3;
const FLAP_VELOCITY = -7.0;
const MAX_DROP_SPEED = 12;
const STORAGE_KEY = 'flappyLeaderboard';
const MUTE_KEY = 'flappyMute';

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
let bestScore = 0;
let leaderboard = [];
let speed = PIPE_SPEED_BASE;
let distanceSinceLastPipe = 0;
let explosionParticles = [];
let isMuted = false;
let musicNode = null;
let audioContext = null;
let audioInitialized = false;

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
  musicNode = audioContext.createOscillator();
  const musicGain = audioContext.createGain();
  musicNode.connect(musicGain);
  musicGain.connect(audioContext.destination);
  musicNode.type = 'triangle';
  musicNode.frequency.setValueAtTime(220, audioContext.currentTime);
  musicGain.gain.setValueAtTime(0.08, audioContext.currentTime);
  musicNode.start();
  let step = 0;
  const sequence = [220, 247, 262, 294, 330, 294, 262, 247];
  const interval = setInterval(() => {
    if (!musicNode) {
      clearInterval(interval);
      return;
    }
    musicNode.frequency.linearRampToValueAtTime(sequence[step % sequence.length], audioContext.currentTime + 0.1);
    step += 1;
  }, 420);
  musicNode._intervalId = interval;
}

function stopBackgroundMusic() {
  if (!musicNode) return;
  clearInterval(musicNode._intervalId);
  try {
    musicNode.stop();
  } catch (err) {
    // ignore already stopped
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
  speed = PIPE_SPEED_BASE;
  distanceSinceLastPipe = 0;  explosionParticles = [];  overlayTitle.textContent = 'FLAPPY BIRD';
  overlaySubtitle.textContent = 'Tap or press Space / Arrow Up';
  overlayStats.innerHTML = `<p>Best score: ${bestScore}</p>`;
  restartButton.textContent = 'TAP TO START';
  renderLeaderboard();
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

  ctx.fillStyle = '#70c5ce';
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
  for (let x = 0; x < GAME_WIDTH; x += 48) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT - 16, 24, 8);
  }
}

function drawGround() {
  ctx.fillStyle = '#cea741';
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
  ctx.fillStyle = '#d2b04c';
  for (let x = 0; x < GAME_WIDTH; x += 16) {
    ctx.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT + 24, 14, 10);
  }
}

function drawPipes() {
  for (const pipe of pipes) {
    ctx.fillStyle = '#299b3b';
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY1);
    ctx.fillRect(pipe.x, pipe.gapY1 + PIPE_GAP, PIPE_WIDTH, pipe.gapY2 - (pipe.gapY1 + PIPE_GAP));
    ctx.fillRect(pipe.x, pipe.gapY2 + PIPE_GAP, PIPE_WIDTH, GAME_HEIGHT - GROUND_HEIGHT - pipe.gapY2 - PIPE_GAP);
    ctx.fillStyle = '#196b23';
    ctx.fillRect(pipe.x - 2, pipe.gapY1 - 10, PIPE_WIDTH + 4, 10);
    ctx.fillRect(pipe.x - 2, pipe.gapY1 + PIPE_GAP, PIPE_WIDTH + 4, 10);
    ctx.fillRect(pipe.x - 2, pipe.gapY2 - 10, PIPE_WIDTH + 4, 10);
    ctx.fillRect(pipe.x - 2, pipe.gapY2 + PIPE_GAP, PIPE_WIDTH + 4, 10);
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);
  
  // Main body - large circle
  ctx.fillStyle = '#f5d84f';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  
  // Head - medium circle
  ctx.fillStyle = '#f5d84f';
  ctx.beginPath();
  ctx.arc(0, -8, 5.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Wing - circle overlay
  ctx.fillStyle = '#e8c23f';
  ctx.beginPath();
  ctx.arc(-6, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail - small circle
  ctx.fillStyle = '#d4a835';
  ctx.beginPath();
  ctx.arc(-10, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak - triangle but more rounded
  ctx.fillStyle = '#ffb042';
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.quadraticCurveTo(14, 0, 8, 4);
  ctx.quadraticCurveTo(10, 0, 8, -4);
  ctx.fill();
  
  // Eye white - circle
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(2, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupil - small circle
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
