// ═══════════════════════════════════════════════════════════
//  TOO MANY BEATS — game.js
// ═══════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const cursor = document.getElementById('custom-cursor');
window.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

// Hide UI elements initially - they will only show during gameplay
document.getElementById('ui').style.display = 'none';
document.getElementById('powerup-bar').style.display = 'none';

const clickSound = new Audio("/audio/game/buttonClicked.mp3"); 

// Global click listener
document.addEventListener("click", function (event) {
    if (event.target.tagName === "BUTTON") {
        clickSound.currentTime = 0; 
        clickSound.play();
    }
});

// ──────────────────────────────────────────────────────────
//  LEVEL SYSTEM
// ──────────────────────────────────────────────────────────

const LEVEL_FILES = [
    'levels/level1.json', 'levels/level2.json', 'levels/level3.json',
    'levels/level4.json', 'levels/level5.json', 'levels/level6.json',
    'levels/level7.json', 'levels/level8.json', 'levels/level9.json',
    'levels/level10.json', 'levels/level11.json', 'levels/level12.json',
    'levels/level13.json', 'levels/level14.json', 'levels/level15.json',
    'levels/level16.json', 'levels/level17.json', 'levels/level18.json',
    'levels/level19.json', 'levels/level20.json', 'levels/level21.json',
    //For future references 
    'levels/level22.json', 'levels/level23.json', 'levels/level24.json',
    'levels/level25.json', 'levels/level26.json', 'levels/level27.json',
    'levels/level28.json', 'levels/level29.json', 'levels/level30.json',
    'levels/level31.json', 'levels/level32.json', 'levels/level33.json',
    'levels/level34.json', 'levels/level35.json', 'levels/level36.json',
    'levels/level37.json', 'levels/level38.json', 'levels/level39.json',
    'levels/level40.json'
];

const LEVEL_DEFAULTS = {
    name: 'CLASSIC RUN',
    song: null,
    color: '#00ffff',
    bpm: 120,
    obstacleSpeed: 5,
    spawnRate: 90,
    speedRampRate: 0.0008,
    numLanes: 3,
    laneTheme: 'neon',
};

let levels = [];
let currentLevel = null;
let currentLevelIndex = 0;

// ──────────────────────────────────────────────────────────
//  SCORE MULTIPLIERS
//
//  Example:
//    { level: 'BONUS STAGE', multiplier: 2.5 },
//    { level: 'HARD MODE',   multiplier: 3   },
// ──────────────────────────────────────────────────────────
const SCORE_MULTIPLIERS = [
    { level: 'Battle Against a True Hero - Falkkone', multiplier: 2 },
];

/**
 * Returns the score multiplier for the current level, or 1 if none is set.
 */
function getLevelScoreMultiplier() {
    if (!currentLevel || !currentLevel.name) return 1;
    const entry = SCORE_MULTIPLIERS.find(
        m => m.level.toLowerCase() === currentLevel.name.toLowerCase()
    );
    return entry ? entry.multiplier : 1;
}

// ──────────────────────────────────────────────────────────
//  AUDIO
// ──────────────────────────────────────────────────────────

let audio = null,
    audioReady = false;

function loadAudio(src) {
    if (!src) {
        audioReady = false;
        return;
    }
    audio = new Audio(src);
    audio.loop = false;
    audio.volume = 0.55;
    audioReady = true;
    audio.addEventListener('ended', () => {
        if (state === 'playing') completeLevel();
    });
}

function playAudio() {
    if (!audioReady || !audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
        window.addEventListener('keydown', retryAudio, {
            once: true
        });
        window.addEventListener('click', retryAudio, {
            once: true
        });
    });
}

function stopAudio() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
}

function retryAudio() {
    if (audio && audioReady) audio.play().catch(() => {});
}

// ──────────────────────────────────────────────────────────
//  CONTENT WARNING
// ──────────────────────────────────────────────────────────

function showContentWarning() {
    const cw = document.getElementById('content-warning');
    if (!cw) { showNewsScreen(); return; }
    setTimeout(() => cw.classList.add('visible'), 80);
}

function dismissContentWarning() {
    const cw = document.getElementById('content-warning');
    if (!cw) { showNewsScreen(); return; }
    cw.classList.remove('visible');
    cw.classList.add('hidden');
    setTimeout(() => showNewsScreen(), 480);
}

// ──────────────────────────────────────────────────────────
//  NEWS SCREEN
// ──────────────────────────────────────────────────────────

function showNewsScreen() {
    const ns = document.getElementById('news-screen');
    if (!ns) { showLevelSelect(); return; }
    setTimeout(() => ns.classList.add('visible'), 60);
}

function dismissNews() { // eslint-disable-line no-unused-vars
    const ns = document.getElementById('news-screen');
    if (!ns) { showMainMenu(); return; }
    ns.classList.remove('visible');
    ns.classList.add('hidden');
    setTimeout(() => showMainMenu(), 480);
}

// ──────────────────────────────────────────────────────────
//  MAIN MENU
// ──────────────────────────────────────────────────────────

const menuScreen  = document.getElementById('main-menu');
const menuCanvas  = document.getElementById('menu-canvas');
const menuCtx     = menuCanvas.getContext('2d');
const backBtn     = document.getElementById('back-btn');

// Keep menu canvas sized to window
function resizeMenuCanvas() {
    menuCanvas.width  = window.innerWidth;
    menuCanvas.height = window.innerHeight;
}
resizeMenuCanvas();
window.addEventListener('resize', resizeMenuCanvas);

// Idle player animation state
let menuPlayerY   = 0;
let menuPlayerHue = 0;
let menuAnimId    = null;

function drawMenuPlayer() {
    menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);

    const cx = menuCanvas.width  / 2;
    const cy = menuCanvas.height / 2;

    // gentle bob
    menuPlayerY  += 0.04;
    menuPlayerHue = (menuPlayerHue + 0.4) % 360;

    const bob = Math.sin(menuPlayerY) * 8;
    const [r, g, b] = hslToRgb(menuPlayerHue, 100, 60);
    const col = `rgb(${r},${g},${b})`;

    const pw = 44, ph = 30;
    const px = cx - pw / 2;
    const py = cy + bob - ph / 2;

    // glow
    menuCtx.shadowBlur  = 30;
    menuCtx.shadowColor = col;

    // body
    menuCtx.fillStyle = col;
    menuCtx.beginPath();
    roundRect(menuCtx, px, py, pw, ph, 6);
    menuCtx.fill();

    // white stripe
    menuCtx.fillStyle = 'rgba(255,255,255,0.6)';
    menuCtx.beginPath();
    roundRect(menuCtx, px + pw - 16, py + 4, 10, ph - 8, 4);
    menuCtx.fill();

    // engine glow
    const grad = menuCtx.createRadialGradient(px - 4, cy + bob, 0, px - 4, cy + bob, 22);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
    grad.addColorStop(1, 'transparent');
    menuCtx.fillStyle = grad;
    menuCtx.beginPath();
    menuCtx.arc(px - 4, cy + bob, 12, 0, Math.PI * 2);
    menuCtx.fill();

    menuCtx.shadowBlur = 0;

    menuAnimId = requestAnimationFrame(drawMenuPlayer);
}

function showMainMenu() {
    hideLevelSelect();
    menuScreen.classList.add('visible');
    backBtn.classList.remove('visible');

    const lb = document.getElementById('menu-btn-login');
    if (lb) lb.textContent = loggedInUser ? `👤  PROFILE` : '⚡  LOGIN';

    if (menuAnimId) cancelAnimationFrame(menuAnimId);
    drawMenuPlayer();
}

function hideMainMenu() {
    menuScreen.classList.remove('visible');
    if (menuAnimId) { cancelAnimationFrame(menuAnimId); menuAnimId = null; }
    menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
}

// Navigate from main menu to a sub-screen
function goToScreen(tab) {
    hideMainMenu();
    topNav.classList.add('visible');
    showTitleScreen(tab);
    backBtn.classList.add('visible');
}

// Back button — return to main menu from any sub-screen
function goToMainMenu() {
    // Explicitly hide every sub-screen so nothing lingers
    lsOverlay.classList.remove('visible');
    lbPanel.classList.remove('visible');
    linksPanel.classList.remove('visible');
    loginPanel.classList.remove('visible');
    lsLaunch.classList.remove('visible');
    topNav.classList.remove('visible');
    backBtn.classList.remove('visible');

    // Reset tab so startGame() can't fire until Levels is opened again
    currentTitleTab = '';

    showMainMenu();
}
//  LOADING
// ──────────────────────────────────────────────────────────


async function loadAllLevels() {
    const loadingEl = document.getElementById('loading-screen');
    const barEl = document.getElementById('loading-bar');
    const subEl = document.getElementById('loading-sub');
    const errorEl = document.getElementById('loading-error');
    let errors = [];

    for (let i = 0; i < LEVEL_FILES.length; i++) {
        const file = LEVEL_FILES[i];
        subEl.textContent = `LOADING LEVELS`;
        barEl.style.width = ((i / LEVEL_FILES.length) * 80) + '%';
        try {
            const res = await fetch(file);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            levels.push(Object.assign({}, LEVEL_DEFAULTS, await res.json()));
        } catch (err) {
            errors.push(`${file}: ${err.message}`);
        }
    }

    barEl.style.width = '100%';
    if (levels.length === 0) {
        levels.push(Object.assign({}, LEVEL_DEFAULTS, {
            name: 'DEFAULT'
        }));
        if (errors.length) {
            errorEl.style.display = 'block';
            errorEl.innerHTML = `No level files found. Using defaults.<br><br>Errors:<br>${errors.join('<br>')}`;
        }
    }

    await new Promise(r => setTimeout(r, 600));
    loadingEl.classList.add('hidden');
    setTimeout(() => {
        loadingEl.style.display = 'none';
    }, 700);

    activateLevel(0);
    showContentWarning();
    gameLoop();
}

function activateLevel(index) {
    currentLevelIndex = index % levels.length;
    currentLevel = levels[currentLevelIndex];
    NUM_LANES = currentLevel.numLanes;
    BASE_SPEED_LIVE = currentLevel.obstacleSpeed;
    spawnInterval = currentLevel.spawnRate;
    speedRampRate = currentLevel.speedRampRate;
    speed = BASE_SPEED_LIVE;

    const dotContainer = document.getElementById('lane-indicator');
    dotContainer.innerHTML = '';
    for (let i = 0; i < NUM_LANES; i++) {
        const dot = document.createElement('div');
        dot.className = 'lane-dot';
        dot.id = `dot-${i}`;
        dotContainer.appendChild(dot);
    }
    stopAudio();
    loadAudio(currentLevel.song);
}

// ──────────────────────────────────────────────────────────
//  RUNTIME CONFIG
// ──────────────────────────────────────────────────────────

const BASE_SPEED_CONST = 5;
let NUM_LANES = 3,
    BASE_SPEED_LIVE = 5,
    spawnInterval = 90,
    speedRampRate = 0.0008;

const PLAYER_X = 130,
    PLAYER_W = 64,
    PLAYER_H = 26,
    LANE_H = 60;

function getLaneY(lane) {
    const totalH = NUM_LANES * LANE_H + (NUM_LANES - 1) * 20;
    const startY = (canvas.height - totalH) / 2;
    return startY + lane * (LANE_H + 20) + LANE_H / 2;
}

// ──────────────────────────────────────────────────────────
//  GAME STATE
// ──────────────────────────────────────────────────────────

let state = 'title',
    playerLane = 1,
    playerY = 0,
    targetY = 0;
let score = 0,
    bestScore = parseInt(localStorage.getItem('neonshift_best') || '0');
// track the highest combo reached during a run for leaderboard metadata
let combo = 1,
    peakCombo = 1,
    comboTimer = 0,
    frame = 0,
    speed = 5;
let screenShake = 0,
    shakeX = 0,
    shakeY = 0,
    globalHue = 0;
let shield = false,
    shieldTimer = 0,
    magnet = false,
    magnetTimer = 0;
let obstacles = [],
    powerups = [],
    particles = [],
    trails = [],
    floatingTexts = [];
let spawnTimer = 0,
    puSpawnTimer = 0,
    puSpawnInterval = 300;
let gameStartTime = 0,
    beatDropPhase = 'pre',
    beatDropMult = 1;
let beatCountdownLast = 0,
    beatDropFlash = 0,
    beatCalmFlash = 0;
let levelCompleteTime = 0;
const LEVEL_COMPLETE_DELAY = 5;

const stars = [];
for (let i = 0; i < 200; i++)
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.2,
        speed: Math.random() * 1.5 + 0.2,
        bright: Math.random()
    });

// ──────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────

function hsl(h, s = 100, l = 50) {
    return `hsl(${h%360},${s}%,${l}%)`;
}

function rand(a, b) {
    return Math.random() * (b - a) + a;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const hue2 = t => {
        t = ((t % 1) + 1) % 1;
        if (t < 1/6) return p + (q-p)*6*t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q-p)*(2/3-t)*6;
        return p;
    };
    return [hue2(h+1/3), hue2(h), hue2(h-1/3)].map(v => Math.round(v*255));
}

function hexToRgb(hex) {
    const h = hex.replace('#','');
    if (h.length === 3) {
        return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    }
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// ── Ship color — defined here so drawPlayer can always call getShipColor() ──

const SHIP_COLORS = [
    { id: 'auto',   label: 'AUTO',   hex: null },
    { id: 'cyan',   label: 'CYAN',   hex: '#00ffff' },
    { id: 'pink',   label: 'PINK',   hex: '#ff44cc' },
    { id: 'green',  label: 'GREEN',  hex: '#00ff88' },
    { id: 'orange', label: 'ORANGE', hex: '#ff8800' },
    { id: 'red',    label: 'RED',    hex: '#ff2244' },
    { id: 'gold',   label: 'GOLD',   hex: '#ffcc00' },
    { id: 'white',  label: 'WHITE',  hex: '#ffffff' },
    { id: 'purple', label: 'PURPLE', hex: '#aa44ff' },
    { id: 'blue',   label: 'BLUE',   hex: '#2288ff' },
];

let playerShipColor = localStorage.getItem('tmb_ship_color') || 'auto';

function getShipColor() {
    if (shield) return '#00ff88';
    if (ghost)  return 'rgba(200,200,255,0.35)';
    const entry = SHIP_COLORS.find(c => c.id === playerShipColor);
    if (entry && entry.hex) return entry.hex;
    const ph = (globalHue + playerLane * 60) % 360;
    const [r, g, b] = hslToRgb(ph, 100, 60);
    return `rgb(${r},${g},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function getAccentColors() {
    return [hsl(globalHue), hsl((globalHue + 60) % 360), hsl((globalHue + 120) % 360), 'white'];
}

function spawnParticles(x, y, count, colors, spd = 6) {
    for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2),
            s = rand(1, spd);
        particles.push({
            x,
            y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            decay: rand(0.015, 0.04),
            color: colors[Math.floor(Math.random() * colors.length)],
            size: rand(2, 5)
        });
    }
}

function floatText(x, y, text, color) {
    floatingTexts.push({
        x,
        y,
        text,
        color,
        life: 1,
        vy: -1.5
    });
}

// ──────────────────────────────────────────────────────────
//  SPAWNING
// ──────────────────────────────────────────────────────────

function spawnObstacles() {
    const safeCount = Math.random() < 0.3 ? 2 : 1;
    const safeLanes = new Set();
    while (safeLanes.size < Math.min(safeCount, NUM_LANES - 1)) safeLanes.add(Math.floor(Math.random() * NUM_LANES));
    for (let lane = 0; lane < NUM_LANES; lane++) {
        if (safeLanes.has(lane)) continue;
        const cy = getLaneY(lane),
            h = LANE_H - 10;
        obstacles.push({
            x: canvas.width + 20,
            y: cy - h / 2,
            w: 28 + rand(-4, 8),
            h,
            lane,
            hue: globalHue,
            scored: false
        });
    }
}

function spawnPowerup() {
    const lane  = Math.floor(Math.random() * NUM_LANES);
    const types  = ['shield', 'magnet', 'ghost', 'double'];
    const type   = types[Math.floor(Math.random() * types.length)];
    const emojis = { shield: '🛡️', magnet: '⚡', ghost: '👻', double: '✖️' };
    powerups.push({ x: canvas.width + 20, y: getLaneY(lane), lane, type, emoji: emojis[type], hue: globalHue, pulse: 0 });
}

// ──────────────────────────────────────────────────────────
//  DRAW — BACKGROUND / STARS / LANES / PLAYER / OBJECTS
// ──────────────────────────────────────────────────────────

function drawBackground() {
    const theme = currentLevel ? currentLevel.laneTheme : 'neon';
    let c1 = '#000008',
        c2 = '#050015';
    if (theme === 'fire') {
        c1 = '#0a0000';
        c2 = '#150500';
    }
    if (theme === 'ice') {
        c1 = '#000a0f';
        c2 = '#000515';
    }
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);
}

function drawStars() {
    for (const s of stars) {
        s.x -= s.speed * (speed / BASE_SPEED_CONST) * 0.4;
        if (s.x < 0) {
            s.x = canvas.width;
            s.y = Math.random() * canvas.height;
        }
        ctx.fillStyle = `rgba(255,255,255,${0.3+s.bright*0.5+Math.sin(frame*0.05+s.y)*0.1})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLanes() {
    const theme = currentLevel ? currentLevel.laneTheme : 'neon';
    for (let lane = 0; lane < NUM_LANES; lane++) {
        const cy = getLaneY(lane),
            h = LANE_H,
            x = PLAYER_X - 30,
            w = canvas.width - x - 20;
        let hue;
        if (theme === 'fire') hue = [0, 25, 45][lane] ?? 45;
        else if (theme === 'ice') hue = (180 + lane * 15) % 360;
        else hue = (globalHue + lane * 60) % 360;
        const [r, g, b] = hslToRgb(hue, 80, 15);
        ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
        ctx.fillRect(x, cy - h / 2, w, h);
        const [r2, g2, b2] = hslToRgb(hue, 100, 55);
        ctx.strokeStyle = `rgba(${r2},${g2},${b2},0.25)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, cy - h / 2, w, h);
        ctx.setLineDash([12, 18]);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + w, cy);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawPlayer() {
    playerY = lerp(playerY, targetY, 0.2);
    trails.push({ x: PLAYER_X, y: playerY, life: 1 });
    if (trails.length > 18) trails.shift();
    for (let i = 0; i < trails.length; i++) {
        const t = i / trails.length,
            a = t * (ghost ? 0.15 : 0.35),
            tw = lerp(4, PLAYER_W, t),
            th = lerp(4, PLAYER_H, t);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        roundRect(ctx, PLAYER_X + (PLAYER_W - tw) / 2, trails[i].y - th / 2, tw, th, 4);
        ctx.fill();
    }
    const col = getShipColor();
    ctx.globalAlpha = ghost ? 0.35 : 1;
    ctx.shadowBlur  = shield ? 40 : 20;
    ctx.shadowColor = col;
    ctx.fillStyle   = col;
    ctx.beginPath();
    roundRect(ctx, PLAYER_X, playerY - PLAYER_H / 2, PLAYER_W, PLAYER_H, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    roundRect(ctx, PLAYER_X + PLAYER_W - 22, playerY - PLAYER_H / 2 + 5, 14, PLAYER_H - 10, 4);
    ctx.fill();
    const [r, g, b] = col.startsWith('rgb') ? [0,255,255] : hexToRgb(col);
    const grad = ctx.createRadialGradient(PLAYER_X - 4, playerY, 0, PLAYER_X - 4, playerY, 22);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(PLAYER_X - 4, playerY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur   = 0;
    ctx.globalAlpha  = 1;
}

function drawObstacles() {
    for (const o of obstacles) {
        const hue = (o.hue + frame * 0.5) % 360,
            [r, g, b] = hslToRgb(hue, 100, 55);
        ctx.shadowBlur = 25;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
        ctx.beginPath();
        roundRect(ctx, o.x, o.y, o.w, o.h, 4);
        ctx.fill();
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, o.x, o.y, o.w, o.h, 4);
        ctx.stroke();
        const scan = (frame * 3) % o.h;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(o.x + 2, o.y + scan);
        ctx.lineTo(o.x + o.w - 2, o.y + scan);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function drawPowerups() {
    for (const pu of powerups) {
        pu.pulse += 0.05;
        const scale = 1 + Math.sin(pu.pulse) * 0.12,
            hue = (pu.hue + frame * 0.8) % 360,
            [r, g, b] = hslToRgb(hue, 100, 60);
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.scale(scale, scale);
        ctx.shadowBlur = 30;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.emoji, 0, 1);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.02;
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = ft.life;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 22px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
}

// ──────────────────────────────────────────────────────────
//  DRAW — BEAT DROP OVERLAY
// ──────────────────────────────────────────────────────────

function drawBeatDropOverlay(elapsedSec) {
    if (!currentLevel || state !== 'playing') return;
    const dropAt = currentLevel.beatDrop,
        calmAt = currentLevel.beatCalms;
    if (!dropAt) return;
    const cx = canvas.width / 2,
        cy = canvas.height / 2;

    if (beatDropPhase === 'countdown') {
        const secsLeft = Math.ceil(dropAt - elapsedSec),
            progress = 1 - (secsLeft - (dropAt - elapsedSec));
        ctx.save();
        ctx.globalAlpha = 0.07 + Math.sin(frame * 0.15) * 0.03;
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 340px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(secsLeft, cx, cy);
        ctx.restore();
        const bannerY = getLaneY(0) - LANE_H - 28,
            pulse = 0.55 + Math.sin(frame * 0.2) * 0.3;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 28px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff00ff';
        ctx.fillStyle = '#ff88ff';
        ctx.fillText(`BEAT DROPS IN  ${secsLeft}`, cx, bannerY);
        const bw = 300,
            bh = 3,
            bx = cx - bw / 2,
            by = bannerY + 22;
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'white';
        ctx.fillRect(bx, by, bw, bh);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(bx, by, bw * progress, bh);
        ctx.restore();
    }

    if (beatDropFlash > 0) {
        ctx.save();
        ctx.globalAlpha = beatDropFlash * 0.7;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.8);
        g.addColorStop(0, 'white');
        g.addColorStop(0.4, '#ff00ff');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        beatDropFlash *= 0.88;
        if (beatDropFlash < 0.01) beatDropFlash = 0;
    }

    if (beatDropPhase === 'active') {
        const t = elapsedSec - dropAt,
            fadeIn = Math.min(t / 0.5, 1);
        const calmIn = calmAt ? Math.max(0, (elapsedSec - (calmAt - 2)) / 2) : 0,
            alpha = fadeIn * (1 - calmIn) * 0.06;
        /*if (alpha > 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff00aa';
            ctx.font = 'bold 220px Orbitron, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('DROP', cx, cy);
            ctx.restore();
        }*/
        const vAlpha = 0.12 + Math.sin(frame * 0.08) * 0.06;
        const vGrad = ctx.createRadialGradient(cx, cy, canvas.height * 0.2, cx, cy, canvas.height * 0.9);
        vGrad.addColorStop(0, 'transparent');
        vGrad.addColorStop(1, `rgba(180,0,80,${vAlpha})`);
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (beatCalmFlash > 0) {
        ctx.save();
        ctx.globalAlpha = beatCalmFlash * 0.55;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.8);
        g.addColorStop(0, 'white');
        g.addColorStop(0.4, '#00ffff');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        beatCalmFlash *= 0.9;
        if (beatCalmFlash < 0.01) beatCalmFlash = 0;
    }
}

// ──────────────────────────────────────────────────────────
//  DRAW — SCREENS
// ──────────────────────────────────────────────────────────

function drawTitle() {
    const cx = canvas.width / 2,
        cy = canvas.height / 2;
    for (let i = 0; i < 6; i++) {
        const r = 80 + i * 90 + Math.sin(frame * 0.016 + i * 0.9) * 22,
            hue = (globalHue + i * 44) % 360;
        ctx.strokeStyle = `hsla(${hue},100%,60%,${Math.max(0,0.055-i*0.007)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawDead() {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2,
        cy = canvas.height / 2;
    ctx.shadowBlur = 50;
    ctx.shadowColor = '#ff0044';
    ctx.fillStyle = '#ff2255';
    ctx.font = 'bold 80px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TERMINATED', cx, cy - 70);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '22px Share Tech Mono, monospace';
    ctx.fillText(`SCORE: ${Math.floor(score)}`, cx, cy - 10);
    if (Math.floor(score) >= bestScore) {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Orbitron, monospace';
        ctx.fillText('✦ NEW BEST ✦', cx, cy + 28);
    }
    if (currentLevel) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px Share Tech Mono, monospace';
        ctx.fillText(`LEVEL ${currentLevelIndex+1} · ${currentLevel.name}`, cx, cy + 60);
    }
    const pa = 0.4 + Math.sin(frame * 0.07) * 0.35;
    ctx.globalAlpha = pa;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 15px Orbitron, monospace';
    ctx.fillText('SPACE TO RETRY  ·  ESC TO SELECT LEVEL', cx, cy + 100);
    ctx.globalAlpha = 1;
}

function drawLevelComplete() {
    const cx = canvas.width / 2,
        cy = canvas.height / 2,
        hasNext = currentLevelIndex < levels.length - 1;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 4; i++) {
        const r = 60 + i * 55 + (frame % 90) * 1.2 + i * 30,
            alpha = Math.max(0, 0.25 - i * 0.05 - (frame % 90) * 0.003);
        ctx.strokeStyle = `hsla(${(globalHue+i*40)%360},100%,65%,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 30, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.save();
    for (let i = 2; i >= 0; i--) {
        ctx.shadowBlur = 50 - i * 12;
        ctx.shadowColor = hsl((globalHue + 60) % 360);
        ctx.fillStyle = i === 0 ? '#88ffcc' : hsl((globalHue + 60) % 360, 100, 65);
        ctx.font = 'bold 68px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LEVEL CLEAR', cx + i * 1.5, cy - 75 + i * 1.5);
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    if (currentLevel) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '13px Share Tech Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`LEVEL ${currentLevelIndex+1}  ·  ${currentLevel.name}`, cx, cy - 28);
    }
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 28px Orbitron, monospace';
    ctx.fillText(`${Math.floor(score)}  PTS`, cx, cy + 18);
    if (Math.floor(score) >= bestScore) {
        const pa2 = 0.7 + Math.sin(frame * 0.1) * 0.3;
        ctx.globalAlpha = pa2;
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillText('✦ NEW BEST ✦', cx, cy + 52);
        ctx.globalAlpha = 1;
    }
    if (hasNext) {
        const next = levels[currentLevelIndex + 1],
            boxW = 300,
            boxH = 72,
            boxX = cx - boxW / 2,
            boxY = cy + 72;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '9px Share Tech Mono, monospace';
        ctx.fillText('UP NEXT', cx, boxY + 16);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 15px Orbitron, monospace';
        ctx.fillText(`LVL ${currentLevelIndex+2}  ·  ${next.name}`, cx, boxY + 36);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px Share Tech Mono, monospace';
        ctx.fillText(`${next.numLanes||3} LANES  ·  ${spawnRateLabel(next.spawnRate||90)} DIFFICULTY`, cx, boxY + 56);
        const pa = 0.5 + Math.sin(frame * 0.06) * 0.35;
        ctx.globalAlpha = pa;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillText('SPACE TO CONTINUE NOW  ·  ESC FOR MENU', cx, cy + 195);
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = hsl((globalHue + 60) % 360, 100, 70);
        ctx.font = 'bold 18px Orbitron, monospace';
        ctx.fillText('ALL LEVELS COMPLETE!', cx, cy + 85);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '12px Share Tech Mono, monospace';
        ctx.fillText('YOU ARE THE CHAMPION', cx, cy + 112);
        const pa = 0.5 + Math.sin(frame * 0.06) * 0.35;
        ctx.globalAlpha = pa;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Orbitron, monospace';
        ctx.fillText('SPACE TO REPLAY  ·  ESC FOR MENU', cx, cy + 160);
        ctx.globalAlpha = 1;
    }
}

// ──────────────────────────────────────────────────────────
//  TITLE SCREEN MANAGEMENT  (levels / leaderboard / links)
// ──────────────────────────────────────────────────────────

let currentTitleTab = 'levels';

const topNav = document.getElementById('top-nav');
const lsOverlay = document.getElementById('level-select');
const lsLaunch = document.getElementById('ls-launch');
const lbPanel = document.getElementById('leaderboard-panel');
const linksPanel = document.getElementById('links-panel');
const loginPanel = document.getElementById('login-panel');

function showTitleScreen(tab) {
    currentTitleTab = tab;
    // Show/hide each panel
    lsOverlay.classList.toggle('visible', tab === 'levels');
    lbPanel.classList.toggle('visible', tab === 'leaderboard');
    linksPanel.classList.toggle('visible', tab === 'links');
    loginPanel.classList.toggle('visible', tab === 'login');
    // Launch bar only on level select
    lsLaunch.classList.toggle('visible', tab === 'levels');
    // Highlight active nav button
    document.getElementById('nav-btn-levels').classList.toggle('active-tab', tab === 'levels');
    document.getElementById('nav-btn-leaderboard').classList.toggle('active-tab', tab === 'leaderboard');
    document.getElementById('nav-btn-links').classList.toggle('active-tab', tab === 'links');
    document.getElementById('nav-btn-login').classList.toggle('active-tab', tab === 'login');
    // Lazy-load data for new tabs
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'links') buildLinksGrid();
    if (tab === 'login') refreshLoginPanel();
    if (tab === 'levels') {
        rebuildGrid();
        updateLsBest();
        // Only auto-focus search on non-touch devices
        if (window.matchMedia('(pointer: fine)').matches) {
            setTimeout(() => lsSearch.focus(), 80);
        }
    }
}

function showLevelSelect() {
    // After a game ends, return via goToScreen so Back button is visible
    goToScreen('levels');
}

// Called by the mobile ▶ LAUNCH LEVEL button
function mobileLaunch() {
    hideLevelSelect();
    startGame();
}

function hideLevelSelect() {
    topNav.classList.remove('visible');
    lsOverlay.classList.remove('visible');
    lbPanel.classList.remove('visible');
    linksPanel.classList.remove('visible');
    loginPanel.classList.remove('visible');
    lsLaunch.classList.remove('visible');
    lsSearch.blur();
}

// ──────────────────────────────────────────────────────────
//  LEVEL SELECT GRID
// ──────────────────────────────────────────────────────────

let searchQuery = '',
    filteredLevels = [];

const lsGrid = document.getElementById('ls-grid');
const lsSearch = document.getElementById('ls-search');
const lsCount = document.getElementById('ls-search-count');
const lsBest = document.getElementById('ls-best');

function updateLsBest() {
    lsBest.textContent = bestScore > 0 ? `ALL-TIME BEST: ${bestScore}` : '';
}


function rebuildGrid() {
    const q = searchQuery.toLowerCase().trim();
    filteredLevels = [];
    levels.forEach((lvl, idx) => {
        const songName = (lvl.song || '').replace(/^audio\//, '').replace(/\.[^.]+$/, '');
        const haystack = [lvl.name, songName, lvl.laneTheme || ''].join(' ').toLowerCase();
        if (!q || haystack.includes(q)) filteredLevels.push(idx);
    });

    lsCount.textContent = q ? `${filteredLevels.length} / ${levels.length}` : '';
    lsGrid.innerHTML = '';

    if (filteredLevels.length === 0) {
        lsGrid.innerHTML = `<div class="ls-no-results">NO RESULTS FOR "${searchQuery.toUpperCase()}"</div>`;
        return;
    }

    filteredLevels.forEach(idx => {
        const lvl = levels[idx],
            isSelected = idx === currentLevelIndex;
        const themeRgbMap = {
            fire: [255, 80, 20],
            ice: [80, 200, 255]
        };
        const rgb = themeRgbMap[lvl.laneTheme] || hslToRgb((idx * 73) % 360, 100, 60);
        const col = `rgb(${rgb.join(',')})`,
            colA = a => `rgba(${rgb.join(',')},${a})`;
        const numLanes = lvl.numLanes || 3,
            midLane = Math.floor(numLanes / 2);
        const laneHTML = Array.from({
                length: numLanes
            }, (_, i) =>
            `<div class="ls-lane-row" style="background:${colA(0.13)};border:1px solid ${colA(0.4)}">
        ${i===midLane?`<div class="ls-ship" style="background:${col};box-shadow:0 0 6px ${col}"></div>`:''}
      </div>`).join('');
        const songRaw = lvl.song || '',
            songName = songRaw ? songRaw.replace(/^audio\//, '').replace(/\.[^.]+$/, '') : '—';
        const card = document.createElement('div');
        card.className = 'ls-card' + (isSelected ? ' selected' : '');
        card.dataset.idx = idx;
        if (isSelected) {
            card.style.borderColor = col;
            card.style.boxShadow = `0 0 28px ${colA(0.45)}, inset 0 0 24px ${colA(0.06)}`;
        }
        card.innerHTML = `
      <div class="ls-card-name" style="${isSelected?`color:${col};text-shadow:0 0 10px ${col}`:''}">
        ${lvl.name}
      </div>
      <div class="ls-card-preview">${laneHTML}</div>
      <div class="ls-stats">
        <div class="ls-stat-row"><span class="ls-stat-label">Lanes</span><span class="ls-stat-val">${numLanes}</span></div>
        <div class="ls-stat-row"><span class="ls-stat-label">Speed</span><span class="ls-stat-val">${lvl.obstacleSpeed||5}</span></div>
        <div class="ls-stat-row"><span class="ls-stat-label">Song</span><span class="ls-stat-val ls-song-val" title="${songName}">${songName}</span></div>
      </div>
      ${lvl.beatDrop?`<div class="ls-beat-badge">⚡ DROP @ ${lvl.beatDrop}s</div>`:''}`;
        card.addEventListener('click', e => {
            e.stopPropagation();
            if (idx === currentLevelIndex) {
                // Second tap/click on the already-selected card → launch
                hideLevelSelect();
                startGame();
            } else {
                activateLevel(idx);
                rebuildGrid();
            }
        });
        card.addEventListener('dblclick', e => {
            e.stopPropagation();
            activateLevel(idx);
            hideLevelSelect();
            startGame();
        });
        lsGrid.appendChild(card);
    });

    const sel = lsGrid.querySelector('.ls-card.selected');
    if (sel) sel.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
    });
}

lsSearch.addEventListener('input', () => {
    searchQuery = lsSearch.value;
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = levels.findIndex(l => {
            const song = (l.song || '').replace(/^audio\//, '').replace(/\.[^.]+$/, '');
            return l.name.toLowerCase().includes(q) || song.toLowerCase().includes(q);
        });
        if (match !== -1 && match !== currentLevelIndex) activateLevel(match);
    }
    rebuildGrid();
});

lsSearch.addEventListener('keydown', e => {
    const cur = filteredLevels.indexOf(currentLevelIndex);
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
        e.preventDefault();
        const next = filteredLevels[(cur + 1) % filteredLevels.length];
        if (next !== undefined) {
            activateLevel(next);
            rebuildGrid();
        }
    }
    if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const prev = filteredLevels[(cur - 1 + filteredLevels.length) % filteredLevels.length];
        if (prev !== undefined) {
            activateLevel(prev);
            rebuildGrid();
        }
    }
    if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        hideLevelSelect();
        startGame();
    }
    if (e.code === 'Escape') {
        e.preventDefault();
        if (searchQuery) {
            lsSearch.value = '';
            searchQuery = '';
            rebuildGrid();
        }
    }
});

// ──────────────────────────────────────────────────────────
//  LEADERBOARD  (Next.js API backend)
// ──────────────────────────────────────────────────────────

let lbData        = null;

async function loadLeaderboard() {
    console.log("Fetching leaderboard data...");
    if (lbData) { renderLeaderboard(); refreshLeaderboard(); return; }
    document.getElementById('lb-list').innerHTML = '<div class="lb-msg">LOADING…</div>';
    await refreshLeaderboard();
    if (lbData) renderLeaderboard();
}

async function refreshLeaderboard() {
    console.log("Refreshing leaderboard data...");
    try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        lbData = await res.json();
        if (document.getElementById('leaderboard-panel').classList.contains('visible')) {
            renderLeaderboard();
        }
    } catch (e) {
        console.log('Failed to load leaderboard:', e.message);
        document.getElementById('lb-list').innerHTML =
            `<div class="lb-msg error">COULD NOT LOAD LEADERBOARD<br>
             <span style="font-size:9px;opacity:.5">${e.message}</span></div>`;
    }
}

async function submitScore(runScore, peakCombo) {
    if (!loggedInUser || runScore <= 0) return;
    try {
        const res = await fetch('/api/leaderboard', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                score: runScore,
                combo: peakCombo,
            }),
        });
        const data = await res.json();
        if (data.ok) {
            await refreshLeaderboard();
            showToast(`+${runScore.toLocaleString()} SAVED · TOTAL: ${(data.newTotal || runScore).toLocaleString()}`);
            console.log("Saving score succeeded:", data);
        }
    } catch (e) {
        console.warn('Score submit failed:', e.message);
    }
}

function getTitleBadgeHTML(entry) {
    const titleId = entry.title;
    if (!titleId) return '';

    let cls = 't-custom';
    let label = titleId;

    if (titleId === 'Top Player') {
        cls = 't-TopPlayer';
    } else if (titleId === 'Top 10') {
        cls = 't-top10';
    } else if (titleId.includes('Top 225') || titleId.includes('Top 100')) {
        cls = 't-top225';
    } else if (titleId.includes('world_record')) {
        cls = 't-wr';
        label = 'World Record';
    } else if (titleId.includes('season1_pioneer')) {
        cls = 't-new';
        label = 'Season 1 Pioneer';
    } else if (titleId.includes('custom')) {
        cls = 't-custom';
        label = 'Fan Favourite';
    } else if (titleId.includes('Owner')) {
        cls = 't-owner';
        label = 'Owner';
    } else if (titleId.includes('Orange')) {
        cls = 't-orange';
        label = 'Orange';
    }

    return `<span class="lb-title ${cls}">${label}</span>`;
}

function renderLeaderboard() {
    const listEl = document.getElementById('lb-list');
    const filterEl = document.getElementById('lb-filter-row');

    // Normalise — support array or {entries:[]} or {scores:[]}
    const raw = Array.isArray(lbData) ? lbData : (lbData.entries || lbData.scores || []);

    if (!raw.length) {
        listEl.innerHTML = '<div class="lb-msg">NO SCORES YET — BE THE FIRST!</div>';
        return;
    }

    // No level filtering since scores are global
    filterEl.innerHTML = '';

    // Sort descending by score
    const filtered = raw.slice().sort((a, b) => (b.score || 0) - (a.score || 0));

    const maxScore = filtered[0].score || 1;

    listEl.innerHTML = filtered.map((entry, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? ` rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const name = entry.name || entry.player || entry.username || 'ANONYMOUS';
        const sc = (entry.score || 0).toLocaleString();
        const lvl = entry.level || entry.levelName || '';
        const dateStr = (entry.date || entry.timestamp) ?
            new Date(entry.date || entry.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : '';
        const meta = [dateStr, entry.combo ? `x${entry.combo} COMBO` : ''].filter(Boolean).join('  ·  ');
        const barPct = Math.round(((entry.score || 0) / maxScore) * 100);
        const titleHTML = getTitleBadgeHTML(entry);

        return `
      <div class="lb-row${rankClass}">
        <div class="lb-bar" style="width:${barPct}%"></div>
        <div class="lb-rank">${medal}</div>
        <div class="lb-info">
          <div class="lb-name-row">
            <div class="lb-name">${name}</div>
            ${titleHTML}
          </div>
          ${meta ? `<div class="lb-meta">${meta}</div>` : ''}
        </div>
        <div class="lb-score">${sc}</div>
        ${lvl ? `<div class="lb-level-tag">${lvl}</div>` : '<div></div>'}
      </div>`;
    }).join('');
}

// ──────────────────────────────────────────────────────────
//  LINKS  —  Edit LINKS_DATA to customise your links page
// ──────────────────────────────────────────────────────────

const LINKS_DATA = [{
        icon: '💻',
        title: 'GITHUB',
        desc: 'See the source code of the game, add code, and send bug reports.',
        url: 'https://github.com/crashcourse14/TooManyBeats',
        color: '#fa5c5c'
    },
    {
        icon: '💬',
        title: 'STOAT CHAT',
        desc: 'Join the community, share scores, report bugs, and chat with us.',
        url: 'http://stt.gg/s5bp7DP0',
        color: '#5865f2'
    },
];

function buildLinksGrid() {
    const grid = document.getElementById('links-grid');
    if (grid.children.length) return; // already built

    grid.innerHTML = LINKS_DATA.map((link, i) => {
        const shortUrl = link.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `
      <a class="link-card" href="${link.url}" target="_blank" rel="noopener"
         style="border-color:${link.color}22" data-color="${link.color}">
        <span class="link-card-arrow">↗</span>
        <div class="link-card-icon">${link.icon}</div>
        <div class="link-card-title" style="color:${link.color};text-shadow:0 0 12px ${link.color}66">${link.title}</div>
        <div class="link-card-desc">${link.desc}</div>
        <div class="link-card-url">${shortUrl}</div>
      </a>`;
    }).join('');

    // Dynamic hover glow per card colour
    grid.querySelectorAll('.link-card').forEach(card => {
        const col = card.dataset.color || '#fff';
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = col + '55';
            card.style.boxShadow = `0 10px 32px ${col}22`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = col + '22';
            card.style.boxShadow = '';
        });
    });
}

// ──────────────────────────────────────────────────────────
//  AUTH + PROFILE  (Next.js API backend)
// ──────────────────────────────────────────────────────────

let loggedInUser  = null;  // username string or null
let loggedInTitle = null;  // active title id or null
let loginsData    = null;  // unused — kept so nothing else breaks

// ── Boot: restore session from server ──────────────────────
async function checkExistingSession() {
    try {
        const res  = await fetch('/api/auth?action=me');
        const data = await res.json();
        if (data.user) {
            loggedInUser  = data.user;
            loggedInTitle = data.title;
            startPresencePing();
            loadShipColor(); // load saved color from Supabase
        }
    } catch (_) {}
    refreshLoginPanel();
}

// ── Tab switcher ────────────────────────────────────────────
function showAuthTab(tab) {
    document.getElementById('login-card').style.display    = tab === 'login'    ? 'flex' : 'none';
    document.getElementById('register-card').style.display = tab === 'register' ? 'flex' : 'none';
    document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

// ── Login ───────────────────────────────────────────────────
async function attemptLogin() {
    const btn      = document.getElementById('login-submit');
    const errEl    = document.getElementById('login-error');
    const okEl     = document.getElementById('login-success');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    errEl.textContent = '';
    okEl.textContent  = '';
    if (!username || !password) { errEl.textContent = '⚠ PLEASE ENTER BOTH FIELDS.'; return; }

    btn.disabled = true; btn.textContent = 'CHECKING…';
    try {
        const res  = await fetch('/api/auth', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            errEl.textContent = `✗ ${data.error || 'Login failed.'}`;
        } else {
            loggedInUser  = data.user;
            loggedInTitle = data.title;
            okEl.textContent = `✓ WELCOME BACK, ${data.user.toUpperCase()}!`;
            document.getElementById('login-password').value = '';
            setTimeout(() => refreshLoginPanel(), 900);
        }
    } catch { errEl.textContent = '⚠ COULD NOT REACH SERVER.'; }
    finally { btn.disabled = false; btn.textContent = 'LOGIN'; }
}

// ── Register ────────────────────────────────────────────────
async function attemptRegister() {
    const btn      = document.getElementById('register-submit');
    const errEl    = document.getElementById('register-error');
    const okEl     = document.getElementById('register-success');
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;

    errEl.textContent = '';
    okEl.textContent  = '';
    if (!username || !password) { errEl.textContent = '⚠ PLEASE ENTER BOTH FIELDS.'; return; }

    btn.disabled = true; btn.textContent = 'CREATING…';
    try {
        const res  = await fetch('/api/auth', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'register', username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            errEl.textContent = `✗ ${data.error || 'Registration failed.'}`;
        } else {
            loggedInUser  = data.user;
            loggedInTitle = null;
            okEl.textContent = `✓ ACCOUNT CREATED! WELCOME, ${data.user.toUpperCase()}!`;
            document.getElementById('reg-password').value = '';
            setTimeout(() => refreshLoginPanel(), 1200);
        }
    } catch { errEl.textContent = '⚠ COULD NOT REACH SERVER.'; }
    finally { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
}

// ── Logout ──────────────────────────────────────────────────
async function logoutUser() {
    try {
        await fetch('/api/auth', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' }),
        });
    } catch (_) {}
    loggedInUser  = null;
    loggedInTitle = null;
    document.getElementById('login-error').textContent    = '';
    document.getElementById('login-success').textContent  = '';
    document.getElementById('login-username').value       = '';
    document.getElementById('login-password').value       = '';
    refreshLoginPanel();
}

// ── Title picker ────────────────────────────────────────────
async function loadTitlePicker() {
    const wrap = document.getElementById('profile-titles-wrap');
    const activeEl = document.getElementById('profile-active-title');
    if (!wrap) return;
    wrap.innerHTML = '<div style="font-size:10px;opacity:.35;letter-spacing:1px">LOADING…</div>';

    try {
        // Fetch user data including titles
        const res = await fetch('/api/auth?action=me');
        const data = await res.json();
        if (!data.user) throw new Error('Not logged in');

        // Update active title display
        activeEl.textContent = data.title || 'None';

        const available = JSON.parse(data.titles || '[]');
        if (available.length === 0) {
            wrap.innerHTML = '<div style="font-size:10px;opacity:.3;letter-spacing:1px">No titles unlocked yet.</div>';
            return;
        }

        const select = document.createElement('select');
        select.id = 'title-select';
        select.style.cssText = `
            width: 100%;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 6px;
            color: white;
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            padding: 8px 12px;
            margin-top: 8px;
        `;
        select.innerHTML = '<option value="">✕ Clear</option>' + available.map(t => `<option value="${t}"${t === data.title ? ' selected' : ''}>${t}</option>`).join('');
        select.addEventListener('change', () => pickTitle(select.value));
        wrap.innerHTML = '';
        wrap.appendChild(select);

    } catch (e) {
        wrap.innerHTML = `<div style="font-size:10px;color:#ff4466">Failed to load titles.</div>`;
    }

    // Build ship color picker every time profile opens
    await loadShipColor();
    buildShipColorPicker();
}

async function pickTitle(titleId) {
    try {
        const res  = await fetch('/api/titles', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'setTitle', title: titleId }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(`✗ ${data.error}`); return; }
        loggedInTitle = data.title;
        showToast(titleId ? `TITLE SET: ${titleId}` : 'TITLE CLEARED');
        loadTitlePicker();
    } catch { showToast('✗ Could not set title'); }
}

// ── Panel refresh ───────────────────────────────────────────
function refreshLoginPanel() {
    const navBtn     = document.getElementById('nav-btn-login');
    const menuBtnLogin = document.getElementById('menu-btn-login');

    if (loggedInUser) {
        navBtn.textContent = '👤 PROFILE';
        navBtn.classList.add('logged-in');
        if (menuBtnLogin) menuBtnLogin.textContent = '👤  PROFILE';

        document.getElementById('auth-tab-row').style.display  = 'none';
        document.getElementById('login-card').style.display    = 'none';
        document.getElementById('register-card').style.display = 'none';
        document.getElementById('profile-card').style.display  = 'flex';
        document.getElementById('profile-username').textContent = loggedInUser.toUpperCase();

        loadTitlePicker();
    } else {
        navBtn.textContent = '⚡ LOGIN';
        navBtn.classList.remove('logged-in');
        if (menuBtnLogin) menuBtnLogin.textContent = '⚡  LOGIN';

        document.getElementById('auth-tab-row').style.display  = 'flex';
        document.getElementById('login-card').style.display    = 'flex';
        document.getElementById('register-card').style.display = 'none';
        document.getElementById('profile-card').style.display  = 'none';
    }
}

// ── Toast notification ──────────────────────────────────────
function showToast(msg) {
    let t = document.getElementById('tmb-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'tmb-toast';
        Object.assign(t.style, {
            position:'fixed', bottom:'90px', left:'50%',
            transform:'translateX(-50%) translateY(14px)',
            background:'rgba(0,255,180,0.1)', border:'1px solid rgba(0,255,180,0.4)',
            color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace",
            fontSize:'11px', letterSpacing:'1.5px', padding:'10px 22px',
            borderRadius:'8px', zIndex:'9998', opacity:'0',
            pointerEvents:'none', whiteSpace:'nowrap',
            transition:'opacity 0.3s ease, transform 0.3s ease',
            textShadow:'0 0 10px rgba(0,255,180,0.6)',
        });
        document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => {
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(t._tmr);
    t._tmr = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(10px)';
    }, 3500);
}

// ── Enter-key shortcuts ─────────────────────────────────────
document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.code === 'Enter') { e.preventDefault(); attemptLogin(); }
});
document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.code === 'Enter') { e.preventDefault(); document.getElementById('login-password').focus(); }
});
document.getElementById('reg-password').addEventListener('keydown', e => {
    if (e.code === 'Enter') { e.preventDefault(); attemptRegister(); }
});
document.getElementById('reg-username').addEventListener('keydown', e => {
    if (e.code === 'Enter') { e.preventDefault(); document.getElementById('reg-password').focus(); }
});

// ──────────────────────────────────────────────────────────
//  COLLISION
// ──────────────────────────────────────────────────────────

function collides(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ──────────────────────────────────────────────────────────
//  MAIN LOOP
// ──────────────────────────────────────────────────────────

function gameLoop() {
    try {
    frame++;
    globalHue = (globalHue + 0.6) % 360;
    if (screenShake > 0) {
        shakeX = (Math.random() - 0.5) * screenShake * 2;
        shakeY = (Math.random() - 0.5) * screenShake * 2;
        screenShake *= 0.85;
        if (screenShake < 0.5) screenShake = shakeX = shakeY = 0;
    }
    ctx.setTransform(1, 0, 0, 1, shakeX, shakeY);
    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);
    drawBackground();
    drawStars();

    if (state === 'title') {
        drawTitle();
        requestAnimationFrame(gameLoop);
        return;
    }
    if (state === 'dead') {
        drawLanes();
        drawObstacles();
        drawPowerups();
        drawPlayer();
        drawParticles();
        drawDead();
        requestAnimationFrame(gameLoop);
        return;
    }
    if (state === 'levelcomplete') {
        drawLanes();
        drawObstacles();
        drawPowerups();
        drawPlayer();
        drawParticles();
        drawLevelComplete();
        requestAnimationFrame(gameLoop);
        return;
    }

    drawLanes();

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= speed;
        if (!o.scored && o.x + o.w < PLAYER_X) {
            o.scored = true;
            score += combo * 10 * (doubleScore ? 2 : 1);
            comboTimer = 120;
        }
        const px = PLAYER_X,
            py = playerY - PLAYER_H / 2;
        if (collides(px + 6, py + 3, PLAYER_W - 12, PLAYER_H - 6, o.x, o.y, o.w, o.h)) {
            if (ghost) {
                // Phase through — flash and continue
                spawnParticles(o.x + o.w / 2, o.y + o.h / 2, 12, ['#ccccff', '#ffffff'], 5);
                obstacles.splice(i, 1);
                continue;
            }
            if (shield) {
                shield = false;
                shieldTimer = 0;
                document.getElementById('pu-shield').classList.remove('active');
                spawnParticles(PLAYER_X + PLAYER_W / 2, playerY, 30, ['#00ff88', '#fff'], 8);
                floatText(PLAYER_X + PLAYER_W / 2, playerY - 40, 'BLOCKED!', '#00ff88');
                screenShake = 8;
                obstacles.splice(i, 1);
                continue;
            }
            die();
            break;
        }
        if (o.x + o.w < -20) {
            obstacles.splice(i, 1);
        }
    }

    // Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.x -= speed;
        if (Math.hypot(pu.x - (PLAYER_X + PLAYER_W / 2), pu.y - playerY) < 36) {
            activatePowerup(pu.type);
            spawnParticles(pu.x, pu.y, 25, getAccentColors(), 7);
            floatText(pu.x, pu.y - 30, pu.emoji + ' ' + pu.type.toUpperCase(), 'white');
            powerups.splice(i, 1);
            continue;
        }
        if (pu.x < -40) {
            powerups.splice(i, 1);
        }
    }

    // Timers
    if (shieldTimer > 0) {
        shieldTimer--;
        if (!shieldTimer) {
            shield = false;
            document.getElementById('pu-shield').classList.remove('active');
        }
    }
    if (magnetTimer > 0) {
        magnetTimer--;
        if (!magnetTimer) {
            magnet = false;
            document.getElementById('pu-magnet').classList.remove('active');
        }
    }
    if (ghostTimer > 0) {
        ghostTimer--;
        if (!ghostTimer) {
            ghost = false;
            document.getElementById('pu-ghost').classList.remove('active');
        }
    }
    if (doubleTimer > 0) {
        doubleTimer--;
        if (!doubleTimer) {
            doubleScore = false;
            document.getElementById('pu-double').classList.remove('active');
        }
    }
    if (comboTimer > 0) {
        comboTimer--;
        if (!comboTimer && combo > 1) {
            combo = Math.max(1, combo - 1);
            comboTimer = combo > 1 ? 100 : 0;
        }
    }

    // Beat drop
    const elapsedSec = (performance.now() - gameStartTime) / 1000;
    const dropAt = currentLevel && currentLevel.beatDrop,
        calmAt = currentLevel && currentLevel.beatCalms;
    const dropMult = (currentLevel && currentLevel.BeatDropTimeMultiplyer) || 1;
    if (dropAt) {
        const secsUntilDrop = dropAt - elapsedSec;
        if (beatDropPhase === 'pre' && secsUntilDrop <= 3 && secsUntilDrop > 0) beatDropPhase = 'countdown';
        if (beatDropPhase === 'countdown') {
            const sl = Math.ceil(secsUntilDrop);
            if (sl !== beatCountdownLast && sl >= 1 && sl <= 3) {
                beatCountdownLast = sl;
                screenShake = 5;
            }
        }
        if ((beatDropPhase === 'pre' || beatDropPhase === 'countdown') && elapsedSec >= dropAt) {
            beatDropPhase = 'active';
            beatDropFlash = 1;
            screenShake = 22;
            for (let i = 0; i < 5; i++) spawnParticles(rand(0, canvas.width), rand(0, canvas.height), 20, ['#ff00ff', '#ff0088', '#ffffff', '#ffaaff'], 9);
        }
        if (calmAt && beatDropPhase === 'active' && elapsedSec >= calmAt) {
            beatDropPhase = 'calming';
            beatCalmFlash = 1;
            screenShake = 10;
            spawnParticles(canvas.width / 2, canvas.height / 2, 40, ['#00ffff', '#88ffff', '#ffffff'], 8);
        }
        const targetMult = beatDropPhase === 'active' ? dropMult : 1;
        beatDropMult = lerp(beatDropMult, targetMult, beatDropPhase === 'calming' ? 0.02 : 0.06);
        if (beatDropPhase === 'calming' && Math.abs(beatDropMult - 1) < 0.01) {
            beatDropMult = 1;
            beatDropPhase = 'done';
        }
    }

    const levelDur = currentLevel && currentLevel.levelDuration;
    if (levelDur && elapsedSec >= levelDur && state === 'playing') {
        completeLevel();
        return;
    }

    speed = (BASE_SPEED_LIVE + score * speedRampRate) * beatDropMult;
    spawnTimer++;
    const si = Math.max(40, spawnInterval - score * 0.03);
    if (spawnTimer >= si) {
        spawnObstacles();
        spawnTimer = 0;
    }
    puSpawnTimer++;
    if (puSpawnTimer >= puSpawnInterval) {
        spawnPowerup();
        puSpawnTimer = 0;
        puSpawnInterval = 250 + Math.random() * 150;
    }
    if (magnet) score += combo * 0.5 * (doubleScore ? 2 : 1);

    drawObstacles();
    drawPowerups();
    drawBeatDropOverlay(elapsedSec);
    drawPlayer();
    drawParticles();
    drawFloatingTexts();

    for (let i = 0; i < NUM_LANES; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.classList.toggle('active', i === playerLane);
    }
    document.getElementById('score-val').textContent = Math.floor(score);
    document.getElementById('best-val').textContent = Math.max(bestScore, Math.floor(score));

    const comboEl = document.getElementById('combo-val');
    const newComboText = 'x' + combo;
    if (comboEl.textContent !== newComboText) {
        comboEl.textContent = newComboText;
        comboEl.classList.remove('combo-pop');
        void comboEl.offsetWidth;
        comboEl.classList.add('combo-pop');
    }
    comboEl.classList.remove('tier2', 'tier3', 'tier4');
    if (combo >= 50) comboEl.classList.add('tier4');
    else if (combo >= 25) comboEl.classList.add('tier3');
    else if (combo >= 10) comboEl.classList.add('tier2');
    comboEl.style.fontSize = Math.min(28 + Math.floor(combo / 5) * 3, 56) + 'px';

    // Show/hide UI elements only during gameplay
    const uiVisible = state === 'playing';
    document.getElementById('ui').style.display = uiVisible ? 'flex' : 'none';
    document.getElementById('powerup-bar').style.display = uiVisible ? 'flex' : 'none';

    requestAnimationFrame(gameLoop);

    } catch (err) {
        console.error('[TMB] Game loop crashed:', err);
        // Show visible error banner so we can actually see what broke
        const banner = document.getElementById('tmb-crash-banner') || (() => {
            const b = document.createElement('div');
            b.id = 'tmb-crash-banner';
            Object.assign(b.style, {
                position:'fixed', bottom:'10px', left:'10px', right:'10px',
                background:'rgba(180,0,0,0.9)', color:'white', padding:'12px 16px',
                fontFamily:'monospace', fontSize:'12px', borderRadius:'8px',
                zIndex:'99999', whiteSpace:'pre-wrap', wordBreak:'break-all',
            });
            document.body.appendChild(b);
            return b;
        })();
        banner.textContent = '⚠ GAME LOOP ERROR (music keeps playing but rendering stopped):\n' + err.stack;
        requestAnimationFrame(gameLoop); // keep trying so it self-recovers if possible
    }
}

// ──────────────────────────────────────────────────────────
//  ACTIONS
// ──────────────────────────────────────────────────────────

function movePlayer(dir) {
    if (state !== 'playing') return;
    const nl = playerLane + dir;
    if (nl < 0 || nl >= NUM_LANES) return;
    playerLane = nl;
    targetY = getLaneY(playerLane);
    combo++;
    // update peak combo so we can report it later
    if (combo > peakCombo) peakCombo = combo;
    comboTimer = 140 + Math.min(combo * 2, 80);
    spawnParticles(PLAYER_X, playerY, 8, getAccentColors(), 4);
    const milestones = [10, 25, 50, 100, 500];
    if (milestones.includes(combo)) {
        const msgs = {
            10: 'HEATING UP!',
            25: 'ON FIRE!',
            50: 'UNSTOPPABLE!',
            100: '✦ LEGENDARY ✦',
            500: 'ARE YOU HACKING?'
        };
        floatText(canvas.width / 2, canvas.height / 2 - 60, msgs[combo], '#ffffff');
        screenShake = combo >= 50 ? 10 : 5;
        for (let i = 0; i < 3; i++) spawnParticles(rand(PLAYER_X, canvas.width * 0.6), rand(canvas.height * 0.3, canvas.height * 0.7), 15, getAccentColors(), 7);
    }
}

function die() {
    state = 'dead';
    const mult = getLevelScoreMultiplier();
    const fs   = Math.floor(score * mult);
    if (mult > 1) floatText(canvas.width / 2, canvas.height / 2 - 80, `×${mult} SCORE BONUS!`, '#ffff00');
    if (fs > bestScore) {
        bestScore = fs;
        localStorage.setItem('neonshift_best', bestScore);
    }
    screenShake = 20;
    spawnParticles(PLAYER_X + PLAYER_W / 2, playerY, 60, ['#ff0044', '#ff6600', '#ffff00', '#ff00aa', 'white'], 10);
    stopAudio();

    if (mmInMatch) {
        // In a match — report death, show results instead of normal leaderboard submit
        mmOnDie(fs).catch(e => console.warn('MM die error:', e));
    } else {
        // Normal game — submit to leaderboard
        submitScore(fs, peakCombo).catch(e => console.warn('Score submit failed:', e.message));
    }
}

function completeLevel() {
    state = 'levelcomplete';
    levelCompleteTime = performance.now();
    const mult = getLevelScoreMultiplier();
    const fs   = Math.floor(score * mult);
    if (mult > 1) floatText(canvas.width / 2, canvas.height / 2 - 80, `×${mult} SCORE BONUS!`, '#ffff00');
    if (fs > bestScore) {
        bestScore = fs;
        localStorage.setItem('neonshift_best', bestScore);
    }
    stopAudio();

    // also submit score on level completion (just in case)
    submitScore(fs, peakCombo).catch(e => console.warn('Score submit failed:', e.message));

    for (let i = 0; i < 8; i++) spawnParticles(rand(0, canvas.width), rand(0, canvas.height), 18, ['#00ffcc', '#00ffff', '#88ff88', '#ffffff', '#ffff00'], 10);
    screenShake = 14;
}

function advanceToNextLevel() {
    if (currentLevelIndex < levels.length - 1) {
        activateLevel(currentLevelIndex + 1);

        Logger.info("Advancing to next level:", currentLevel.name);
        startGame();
    } else {
        state = 'title';
        activateLevel(0);
        showLevelSelect();
    }
}

function startGame() {
    // Never start if main menu is showing
    if (menuScreen.classList.contains('visible')) return;
    // Allow matchmaking to bypass tab check
    if (!mmInMatch) {
        // Only allow starting from levels screen, death screen, or level complete screen
        if (!(currentTitleTab === 'levels' || state === 'dead' || state === 'levelcomplete')) return;
    }

    state = 'playing';
    score = 0;
    combo = 1;
    peakCombo = 1;
    comboTimer = 0;
    speed = BASE_SPEED_LIVE;
    playerLane = Math.floor(NUM_LANES / 2);
    targetY = getLaneY(playerLane);
    playerY = targetY;
    obstacles = [];
    powerups = [];
    particles = [];
    trails = [];
    floatingTexts = [];
    spawnTimer = 0;
    puSpawnTimer = 0;
    shield = false; shieldTimer = 0;
    magnet = false; magnetTimer = 0;
    ghost  = false; ghostTimer  = 0;
    doubleScore = false; doubleTimer = 0;
    ['pu-shield','pu-magnet','pu-ghost','pu-double'].forEach(id => document.getElementById(id).classList.remove('active'));
    const ce = document.getElementById('combo-val');
    ce.textContent = 'x1';
    ce.style.fontSize = '28px';
    ce.classList.remove('tier2', 'tier3', 'tier4', 'combo-pop');
    gameStartTime = performance.now();
    beatDropPhase = 'pre';
    beatDropMult = 1;
    beatCountdownLast = 0;
    beatDropFlash = 0;
    beatCalmFlash = 0;
    hideLevelSelect();
    playAudio();
}

function activatePowerup(type) {
    if (type === 'shield') {
        shield = true; shieldTimer = 400;
        document.getElementById('pu-shield').classList.add('active');
    }
    if (type === 'magnet') {
        magnet = true; magnetTimer = 480;
        document.getElementById('pu-magnet').classList.add('active');
    }
    if (type === 'ghost') {
        ghost = true; ghostTimer = 360;
        document.getElementById('pu-ghost').classList.add('active');
        floatText(canvas.width / 2, canvas.height / 2 - 60, '👻 GHOST!', '#ccccff');
    }
    if (type === 'double') {
        doubleScore = true; doubleTimer = 480;
        document.getElementById('pu-double').classList.add('active');
        floatText(canvas.width / 2, canvas.height / 2 - 60, '✖️ 2× SCORE!', '#ffff00');
    }
}

// ──────────────────────────────────────────────────────────
//  CONTROLS
// ──────────────────────────────────────────────────────────

window.addEventListener('keydown', e => {
    // V — push to talk (only during a match)
    if (e.code === 'KeyV' && mmInMatch && !e.repeat) {
        vcPushToTalkOn();
        return;
    }
    if (e.code === 'Escape') {
        e.preventDefault();
        if (state === 'playing' || state === 'dead' || state === 'levelcomplete') {
            stopAudio();
            combo = 0;
            score = 0;
            state = 'title';
            document.getElementById('ui').style.display = 'none';
            document.getElementById('powerup-bar').style.display = 'none';
            showLevelSelect();
        }
        return;
    }
    if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'title' && currentTitleTab === 'levels') {
            startGame();
            return;
        }
        if (state === 'dead') {
            stopAudio();
            loadAudio(currentLevel && currentLevel.song);
            startGame();
            return;
        }
        if (state === 'levelcomplete') {
            advanceToNextLevel();
            return;
        }
        return;
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (state === 'playing') {
            e.preventDefault();
            movePlayer(-1);
        }
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (state === 'playing') {
            e.preventDefault();
            movePlayer(1);
        }
    }

    // Grid navigation (title screen, search not focused, on levels tab)
    if (state === 'title' && document.activeElement !== lsSearch && currentTitleTab === 'levels') {
        const cur = filteredLevels.indexOf(currentLevelIndex);
        const cols = Math.max(1, Math.round(Math.min(960, window.innerWidth * 0.96) / 204));
        let next = cur;
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            next = (cur + 1) % filteredLevels.length;
        }
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            next = (cur - 1 + filteredLevels.length) % filteredLevels.length;
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            next = Math.min(cur + cols, filteredLevels.length - 1);
        }
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            next = Math.max(cur - cols, 0);
        }
        if (next !== cur) {
            activateLevel(filteredLevels[next]);
            rebuildGrid();
        }
    }
});

let touchStartY = null,
    touchStartX = null,
    touchStartTime = null;

window.addEventListener('touchstart', e => {
    touchStartY    = e.touches[0].clientY;
    touchStartX    = e.touches[0].clientX;
    touchStartTime = Date.now();
}, { passive: true });

window.addEventListener('touchend', e => {
    // If the touch target is inside a UI panel or button, let it handle itself
    const target = e.target;
    const isUI = target.closest('#top-nav, #level-select, #leaderboard-panel, #links-panel, #login-panel, #ls-launch, #news-screen, #content-warning, #loading-screen');
    if (isUI) { touchStartY = touchStartX = touchStartTime = null; return; }

    if (state === 'title') { touchStartY = touchStartX = touchStartTime = null; return; }

    const dy       = e.changedTouches[0].clientY - (touchStartY ?? 0);
    const dx       = e.changedTouches[0].clientX - (touchStartX ?? 0);
    const elapsed  = Date.now() - (touchStartTime ?? 0);
    const isTap    = Math.abs(dy) < 12 && Math.abs(dx) < 12 && elapsed < 300;
    const isSwipe  = Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 22;

    if (state === 'dead') {
        stopAudio();
        loadAudio(currentLevel && currentLevel.song);
        startGame();
    } else if (state === 'levelcomplete') {
        advanceToNextLevel();
    } else if (state === 'playing') {
        if (isSwipe)      movePlayer(dy > 0 ? 1 : -1);
        else if (isTap)   movePlayer(e.changedTouches[0].clientY > canvas.height / 2 ? 1 : -1);
    }

    touchStartY = touchStartX = touchStartTime = null;
}, { passive: true });

canvas.addEventListener('click', e => {
    if (state === 'title') return;
    if (state === 'dead') {
        stopAudio();
        loadAudio(currentLevel && currentLevel.song);
        startGame();
        return;
    }
    if (state === 'levelcomplete') {
        advanceToNextLevel();
        return;
    }
    movePlayer(e.clientY > canvas.height / 2 ? 1 : -1);
});

window.addEventListener('keyup', e => {
    if (e.code === 'KeyV' && mmInMatch) {
        vcPushToTalkOff();
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    targetY = getLaneY(playerLane);
    playerY = targetY;
});

// ──────────────────────────────────────────────────────────
//  MATCHMAKING SYSTEM
// ──────────────────────────────────────────────────────────

let mmMatchId        = null;
let mmOpponent       = null;
let mmLevelIndex     = null;
let mmPollTimer      = null;
let mmScoreTimer     = null;
let mmOnlineTimer    = null; // polls /api/online while searching
let mmInMatch        = false;
let mmMyFinalScore   = 0;
let mmOppFinalScore  = 0;

// ── Presence ping (keeps player counted as online) ─────────
let presencePingTimer = null;
function startPresencePing() {
    if (presencePingTimer) return;
    mmPingPresence();
    presencePingTimer = setInterval(mmPingPresence, 20_000);
}
function mmPingPresence() {
    if (!loggedInUser) return;
    fetch('/api/online', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping' }),
    }).catch(() => {});
}

// ── Fetch and display online counts ───────────────────────
async function mmRefreshOnlineCounts() {
    try {
        const res  = await fetch('/api/online');
        const data = await res.json();
        const onlineEl = document.getElementById('mm-online-count');
        const mmEl     = document.getElementById('mm-mm-count');
        if (onlineEl) onlineEl.textContent = data.online      ?? '—';
        if (mmEl)     mmEl.textContent     = data.matchmaking ?? '—';
    } catch { /* ignore */ }
}

// ── Show / hide helpers ────────────────────────────────────
function mmShowScreen(id) {
    ['mm-searching', 'mm-pregame', 'mm-results'].forEach(s => {
        document.getElementById(s).classList.toggle('visible', s === id);
    });
}
function mmHideAll() {
    ['mm-searching', 'mm-pregame', 'mm-results'].forEach(s =>
        document.getElementById(s).classList.remove('visible')
    );
    document.getElementById('mm-opponent-hud').classList.remove('visible');
}

// ── Log helper — writes a line to the on-screen search log ─
function mmLog(msg, type = '') {
    console.log('[MM]', msg);
    const log = document.getElementById('mm-search-log');
    if (!log) return;
    const line = document.createElement('div');
    line.className = `mm-log-line ${type}`;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    line.textContent = `[${time}] ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

// ── Entry point — called from menu button ──────────────────
async function startMatchmaking() {
    if (!loggedInUser) {
        showToast('⚠ YOU MUST BE LOGGED IN TO MATCH MAKE');
        return;
    }

    hideMainMenu();
    mmShowScreen('mm-searching');

    // Clear previous log
    const log = document.getElementById('mm-search-log');
    if (log) log.innerHTML = '';

    // Start presence ping + online counter refresh
    startPresencePing();
    mmRefreshOnlineCounts();
    mmOnlineTimer = setInterval(mmRefreshOnlineCounts, 5000);

    mmLog('Searching for a match. This could take a while due to low player count...', 'warn');
    mmLog('Joining matchmaking queue...', 'info');

    try {
        const res  = await fetch('/api/matchmaking', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join' }),
        });
        const data = await res.json();

        if (data.status === 'matched') {
            mmLog(`Opponent found: ${data.opponent}!`, 'ok');
            await mmOnMatched(data);
        } else if (data.error) {
            mmLog(`Error: ${data.error}`, 'error');
        } else {
            mmLog('Added to queue. Waiting for opponent...', 'info');
            mmPollTimer = setInterval(mmPoll, 800);
        }
    } catch (e) {
        mmLog('Connection error — check your network.', 'error');
        showToast('⚠ MATCHMAKING ERROR — CHECK CONNECTION');
        mmReturnToMenu();
    }
}

async function mmPoll() {
    try {
        const res  = await fetch('/api/matchmaking', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'poll' }),
        });
        const data = await res.json();

        if (data.status === 'matched') {
            clearInterval(mmPollTimer);
            mmPollTimer = null;
            mmLog(`Opponent found: ${data.opponent}!`, 'ok');
            await mmOnMatched(data);
        } else if (data.status === 'expired') {
            clearInterval(mmPollTimer);
            mmPollTimer = null;
            mmLog('Queue expired. Try again.', 'warn');
            showToast('QUEUE EXPIRED — TRY AGAIN');
            mmReturnToMenu();
        }
    } catch { 
        mmLog('Connection error while searching.', 'error');
    }
}

async function cancelMatchmaking() {
    clearInterval(mmPollTimer);
    clearInterval(mmOnlineTimer);
    mmPollTimer   = null;
    mmOnlineTimer = null;
    mmLog('Cancelled matchmaking.', 'warn');
    await fetch('/api/matchmaking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
    }).catch(() => {});
    mmReturnToMenu();
}

// ── Web Audio beep for countdown ──────────────────────────
function mmPlayBeep(freq = 880, duration = 0.12, vol = 0.35) {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type      = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
        osc.onended = () => ctx.close();
    } catch (e) { /* browser may block without interaction */ }
}

// ── Match found — show search-screen countdown then load pre-game ─
async function mmOnMatched(data) {
    mmMatchId    = data.matchId;
    mmOpponent   = data.opponent;
    mmLevelIndex = data.levelIndex;

    // Stay on searching screen and count down 3→0 with beeps
    mmLog(`Opponent found: ${mmOpponent}!`, 'ok');

    for (let i = 3; i >= 0; i--) {
        if (i === 0) {
            mmPlayBeep(1200, 0.25, 0.5); // higher final beep
            mmLog('Joining!', 'join');
        } else {
            mmPlayBeep(660, 0.12, 0.35);
            mmLog(`Joining in ${i}...`, 'join');
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    // Now switch to pre-game cards
    mmShowScreen('mm-pregame');

    // Load player info for both sides in parallel
    const [myInfo, oppInfo] = await Promise.all([
        mmFetchPlayerInfo(loggedInUser),
        mmFetchPlayerInfo(mmOpponent),
    ]);

    // Populate YOU card
    document.getElementById('mm-you-name').textContent = loggedInUser.toUpperCase();
    mmPopulateCard('mm-you-title', 'mm-you-stats', myInfo);

    // Populate OPPONENT card
    document.getElementById('mm-opp-name-pre').textContent = mmOpponent.toUpperCase();
    mmPopulateCard('mm-opp-title', 'mm-opp-stats', oppInfo);

    // Show level name
    const lvl = levels[mmLevelIndex];
    const levelDisplayName = lvl ? lvl.name : `Level ${mmLevelIndex + 1}`;
    document.getElementById('mm-level-name').textContent = `LEVEL: ${levelDisplayName}`;

    // Pre-game countdown 3→0
    await mmCountdown();

    mmStartMatchGame();
}

async function mmFetchPlayerInfo(username) {
    try {
        const res  = await fetch('/api/match', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'playerInfo', matchId: mmMatchId, username }),
        });
        return await res.json();
    } catch { return {}; }
}

function mmPopulateCard(titleElId, statsElId, info) {
    const titleEl = document.getElementById(titleElId);
    const statsEl = document.getElementById(statsElId);

    if (info.titleLabel) {
        titleEl.textContent  = info.titleLabel;
        titleEl.className    = `mm-card-title ${info.titleClass || ''}`;
        titleEl.style.display = '';
    } else {
        titleEl.style.display = 'none';
    }

    statsEl.innerHTML =
        `<strong>#${info.rank ?? '—'}</strong> LEADERBOARD<br>` +
        `BEST: <strong>${(info.bestScore ?? 0).toLocaleString()}</strong>`;
}

function mmCountdown() {
    return new Promise(resolve => {
        const el = document.getElementById('mm-countdown');
        let count = 3;
        el.textContent = count;

        const tick = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(tick);
                el.textContent = 'GO!';
                setTimeout(resolve, 600);
            } else {
                el.textContent = count;
            }
        }, 1000);
    });
}

// ── Start the match game ───────────────────────────────────
function mmStartMatchGame() {
    mmHideAll();
    mmInMatch = true;
    mmMyFinalScore  = 0;
    mmOppFinalScore = 0;

    if (levels[mmLevelIndex]) {
        activateLevel(mmLevelIndex);
    }

    document.getElementById('mm-opp-name').textContent  = mmOpponent.toUpperCase();
    document.getElementById('mm-opp-score').textContent = '0';
    document.getElementById('mm-opponent-hud').classList.add('visible');

    document.getElementById('ui').style.display          = '';
    document.getElementById('powerup-bar').style.display = '';

    // Init voice chat — player1 is the offerer
    const isOfferer = true; // will be overridden below based on match data
    fetch(`/api/match?id=${mmMatchId}`).then(r => r.json()).then(match => {
        const amP1 = match.player1.toLowerCase() === loggedInUser.toLowerCase();
        vcInit(mmMatchId, loggedInUser, mmOpponent, amP1);
    }).catch(() => {
        vcInit(mmMatchId, loggedInUser, mmOpponent, true);
    });

    startGame();
    mmScoreTimer = setInterval(mmSyncMatch, 2000);
}

async function mmSyncMatch() {
    if (!mmMatchId || !mmInMatch) return;

    // Push my current score
    const myScore = Math.floor(score);
    fetch('/api/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'score', matchId: mmMatchId, score: myScore }),
    }).catch(() => {});

    // Poll match state for opponent score
    try {
        const res   = await fetch(`/api/match?id=${mmMatchId}`);
        const match = await res.json();
        if (!match) return;

        const isP1      = match.player1.toLowerCase() === loggedInUser.toLowerCase();
        const oppScore  = isP1 ? match.p2_score : match.p1_score;
        const oppDead   = isP1 ? match.p2_dead  : match.p1_dead;

        document.getElementById('mm-opp-score').textContent = oppScore.toLocaleString();

        if (oppDead && mmInMatch) {
            // Opponent died — we win (but keep playing, result shown when we die too)
            mmOppFinalScore = oppScore;
        }
    } catch { /* ignore */ }
}

// ── Called from die() when in a match ─────────────────────
async function mmOnDie(myFinalScore) {
    if (!mmInMatch) return;
    mmInMatch      = false;
    mmMyFinalScore = myFinalScore;

    clearInterval(mmScoreTimer);
    mmScoreTimer = null;

    document.getElementById('mm-opponent-hud').classList.remove('visible');

    // Submit score to leaderboard just like a normal level death
    submitScore(myFinalScore, peakCombo).catch(e => console.warn('MM score submit failed:', e.message));

    // Report death to server
    let winner = null;
    try {
        const res  = await fetch('/api/match', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'die', matchId: mmMatchId, score: myFinalScore }),
        });
        const data = await res.json();
        winner = data.winner;
    } catch { /* ignore */ }

    // Fetch final match state for opponent's score
    try {
        const res   = await fetch(`/api/match?id=${mmMatchId}`);
        const match = await res.json();
        if (match) {
            const isP1 = match.player1.toLowerCase() === loggedInUser.toLowerCase();
            mmOppFinalScore = isP1 ? match.p2_score : match.p1_score;
        }
    } catch { /* ignore */ }

    mmShowResults(winner);
}

// ── Results screen ─────────────────────────────────────────
function mmShowResults(winner) {
    const iWon = winner && winner.toLowerCase() === loggedInUser.toLowerCase();
    const isDraw = !winner;

    const banner = document.getElementById('mm-result-banner');
    if (isDraw) {
        banner.textContent = 'DRAW';
        banner.className   = 'mm-result-banner draw';
    } else if (iWon) {
        banner.textContent = '🏆 YOU WON!';
        banner.className   = 'mm-result-banner win';
    } else {
        banner.textContent = 'YOU LOST';
        banner.className   = 'mm-result-banner lose';
    }

    document.getElementById('mm-res-you-name').textContent  = loggedInUser.toUpperCase();
    document.getElementById('mm-res-you-score').textContent = mmMyFinalScore.toLocaleString();
    document.getElementById('mm-res-you-stat').innerHTML    =
        `SCORE: <strong>${mmMyFinalScore.toLocaleString()}</strong>`;

    document.getElementById('mm-res-opp-name').textContent  = (mmOpponent || '?').toUpperCase();
    document.getElementById('mm-res-opp-score').textContent = mmOppFinalScore.toLocaleString();
    document.getElementById('mm-res-opp-stat').innerHTML    =
        `SCORE: <strong>${mmOppFinalScore.toLocaleString()}</strong>`;

    mmShowScreen('mm-results');
}

function mmReturnToMenu() {
    mmHideAll();
    mmInMatch     = false;
    mmMatchId     = null;
    mmOpponent    = null;
    mmLevelIndex  = null;
    clearInterval(mmPollTimer);
    clearInterval(mmScoreTimer);
    clearInterval(mmOnlineTimer);
    mmPollTimer   = null;
    mmScoreTimer  = null;
    mmOnlineTimer = null;
    // Destroy voice chat
    vcDestroy();

    // Hide all game HUD elements so they don't bleed through the main menu
    document.getElementById('ui').style.display          = 'none';
    document.getElementById('powerup-bar').style.display = 'none';

    // Reset game state so the canvas draws idle (no dead/playing overlay)
    state = 'title';
    stopAudio();

    showMainMenu();
}

// ──────────────────────────────────────────────────────────
//  VOICE CHAT (WebRTC push-to-talk)
// ──────────────────────────────────────────────────────────

let vcPeer            = null;
let vcLocalStream     = null;
let vcAudioEl         = null;
let vcMicActive       = false;
let vcConnected       = false;
let vcSignalTimer     = null;
let vcIsOfferer       = false;
let vcRemoteReady     = false;
let vcIceQueue        = [];
let vcMatchId         = null;

const VC_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

async function vcInit(matchId, myName, oppName, isOfferer) {
    vcIsOfferer   = isOfferer;
    vcMatchId     = matchId;
    vcRemoteReady = false;
    vcIceQueue    = [];

    console.log('[VC] init — offerer:', isOfferer, 'match:', matchId);

    document.getElementById('mm-voice-you-name').textContent = myName.toUpperCase();
    document.getElementById('mm-voice-opp-name').textContent = oppName.toUpperCase();
    document.getElementById('mm-voice-bar').classList.add('visible');
    document.getElementById('mm-voice-hint').classList.add('visible');

    vcSetTalking('you', false);
    vcSetTalking('opp', false);
    document.getElementById('mm-voice-you').classList.add('muted');

    try {
        vcLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        vcLocalStream.getAudioTracks().forEach(t => { t.enabled = false; });
        console.log('[VC] mic acquired');
    } catch (e) {
        console.warn('[VC] mic access denied:', e);
        return;
    }

    // Create and unlock audio element before track arrives
    vcAudioEl = document.createElement('audio');
    vcAudioEl.autoplay = true;
    vcAudioEl.volume   = 1.0;
    document.body.appendChild(vcAudioEl);
    const unlockSrc = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    vcAudioEl.src = unlockSrc;
    vcAudioEl.play().catch(() => {});
    vcAudioEl.src = '';
    vcAudioEl.srcObject = null;

    vcPeer = new RTCPeerConnection({ iceServers: VC_ICE_SERVERS });
    vcLocalStream.getTracks().forEach(t => vcPeer.addTrack(t, vcLocalStream));

    vcPeer.ontrack = (e) => {
        console.log('[VC] ontrack fired, streams:', e.streams.length);
        const stream = e.streams && e.streams[0];
        if (!stream) return;
        vcAudioEl.srcObject = stream;
        vcAudioEl.play().catch(err => {
            console.warn('[VC] audio play blocked, waiting for interaction:', err);
            const retry = () => { vcAudioEl.play().catch(() => {}); };
            window.addEventListener('keydown', retry, { once: true });
            window.addEventListener('click',   retry, { once: true });
        });
    };

    vcPeer.onicecandidate = (e) => {
        if (!e.candidate) { console.log('[VC] ICE gathering complete'); return; }
        console.log('[VC] sending ICE candidate');
        fetch('/api/signal', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ice', matchId, candidate: e.candidate.toJSON() }),
        }).catch(() => {});
    };

    vcPeer.oniceconnectionstatechange = () => console.log('[VC] ICE state:', vcPeer.iceConnectionState);
    vcPeer.onconnectionstatechange    = () => {
        vcConnected = vcPeer.connectionState === 'connected';
        console.log('[VC] connection state:', vcPeer.connectionState);
    };

    if (isOfferer) {
        try {
            const offer = await vcPeer.createOffer({ offerToReceiveAudio: true });
            await vcPeer.setLocalDescription(offer);
            console.log('[VC] offer sent');
            await fetch('/api/signal', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'offer', matchId, sdp: vcPeer.localDescription }),
            });
        } catch (e) { console.error('[VC] offer failed:', e); }
    }

    vcSignalTimer = setInterval(vcPollSignals, 1000);
}

async function vcApplyQueuedIce() {
    while (vcIceQueue.length > 0) {
        const c = vcIceQueue.shift();
        try { await vcPeer.addIceCandidate(new RTCIceCandidate(c)); console.log('[VC] applied queued ICE'); }
        catch (e) { console.warn('[VC] queued ICE failed:', e); }
    }
}

async function vcPollSignals() {
    if (!vcMatchId || !vcPeer) return;
    try {
        const res     = await fetch('/api/signal?matchId=' + vcMatchId);
        const data    = await res.json();
        const signals = data.signals || [];

        for (const sig of signals) {
            let parsed;
            try { parsed = JSON.parse(sig.payload); } catch { continue; }

            // Talking indicator piggyback
            if (sig.type === 'ice' && parsed._talking !== undefined) {
                vcSetTalking('opp', !!parsed._talking);
                continue;
            }

            if (sig.type === 'offer' && !vcIsOfferer) {
                console.log('[VC] received offer, creating answer');
                try {
                    await vcPeer.setRemoteDescription(new RTCSessionDescription(parsed));
                    vcRemoteReady = true;
                    await vcApplyQueuedIce();
                    const answer = await vcPeer.createAnswer();
                    await vcPeer.setLocalDescription(answer);
                    console.log('[VC] answer sent');
                    await fetch('/api/signal', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'answer', matchId: vcMatchId, sdp: vcPeer.localDescription }),
                    });
                } catch (e) { console.error('[VC] answer failed:', e); }

            } else if (sig.type === 'answer' && vcIsOfferer) {
                console.log('[VC] received answer');
                try {
                    await vcPeer.setRemoteDescription(new RTCSessionDescription(parsed));
                    vcRemoteReady = true;
                    await vcApplyQueuedIce();
                } catch (e) { console.error('[VC] setRemoteDesc (answer) failed:', e); }

            } else if (sig.type === 'ice') {
                if (vcRemoteReady) {
                    try { await vcPeer.addIceCandidate(new RTCIceCandidate(parsed)); console.log('[VC] ICE applied'); }
                    catch (e) { console.warn('[VC] ICE apply failed:', e); }
                } else {
                    console.log('[VC] queuing ICE (remote not ready)');
                    vcIceQueue.push(parsed);
                }
            }
        }
    } catch (e) { console.warn('[VC] poll error:', e); }
}

// ── Audio ducking ──────────────────────────────────────────
const VC_DUCK_VOLUME   = 0.12;  // volume while someone is speaking
const VC_NORMAL_VOLUME = 0.55;  // normal game music volume
let   vcDuckTimer      = null;
let   vcYouTalking     = false;
let   vcOppTalking     = false;

function vcUpdateDucking() {
    const anyoneTalking = vcYouTalking || vcOppTalking;
    const target = anyoneTalking ? VC_DUCK_VOLUME : VC_NORMAL_VOLUME;

    clearInterval(vcDuckTimer);
    if (!audio) return;

    // Smooth fade over ~300ms in 30 steps
    const start     = audio.volume;
    const diff      = target - start;
    const steps     = 30;
    let   step      = 0;
    vcDuckTimer = setInterval(() => {
        step++;
        if (!audio) { clearInterval(vcDuckTimer); return; }
        audio.volume = Math.min(1, Math.max(0, start + diff * (step / steps)));
        if (step >= steps) clearInterval(vcDuckTimer);
    }, 10);
}

function vcSetTalking(who, talking) {
    const pill = document.getElementById(who === 'you' ? 'mm-voice-you' : 'mm-voice-opp');
    if (!pill) return;
    pill.classList.toggle('talking', talking);
    if (who === 'you') {
        vcYouTalking = talking;
        pill.classList.toggle('muted', !talking);
        const i = document.getElementById('mm-voice-you-icon');
        if (i) i.textContent = talking ? '🔊' : '🎙';
    } else {
        vcOppTalking = talking;
    }
    vcUpdateDucking();
}

function vcPushToTalkOn() {
    if (!vcLocalStream) return;
    vcMicActive = true;
    vcLocalStream.getAudioTracks().forEach(t => { t.enabled = true; });
    vcSetTalking('you', true);
    if (vcMatchId) fetch('/api/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ice', matchId: vcMatchId, candidate: { _talking: true } }),
    }).catch(() => {});
}

function vcPushToTalkOff() {
    if (!vcLocalStream) return;
    vcMicActive = false;
    vcLocalStream.getAudioTracks().forEach(t => { t.enabled = false; });
    vcSetTalking('you', false);
    if (vcMatchId) fetch('/api/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ice', matchId: vcMatchId, candidate: { _talking: false } }),
    }).catch(() => {});
}

function vcDestroy() {
    clearInterval(vcSignalTimer);
    clearInterval(vcDuckTimer);
    vcSignalTimer = null;
    vcDuckTimer   = null;
    vcMatchId     = null;
    vcRemoteReady = false;
    vcIceQueue    = [];
    vcYouTalking  = false;
    vcOppTalking  = false;
    if (audio) audio.volume = VC_NORMAL_VOLUME;
    if (vcLocalStream) { vcLocalStream.getTracks().forEach(t => t.stop()); vcLocalStream = null; }
    if (vcPeer)        { vcPeer.close(); vcPeer = null; }
    if (vcAudioEl)     { vcAudioEl.srcObject = null; vcAudioEl.remove(); vcAudioEl = null; }
    vcConnected = false;
    vcMicActive = false;
    document.getElementById('mm-voice-bar').classList.remove('visible');
    document.getElementById('mm-voice-hint').classList.remove('visible');
}
// ──────────────────────────────────────────────────────────
//  SHIP CUSTOMIZATION  (picker/save functions defined below)
// ──────────────────────────────────────────────────────────

function buildShipColorPicker() {
    const wrap = document.getElementById('ship-colors-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    SHIP_COLORS.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'ship-color-btn' + (color.id === playerShipColor ? ' active' : '');
        btn.title     = color.label;
        btn.style.background = color.hex
            ? color.hex
            : 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
        btn.onclick = async () => {
            playerShipColor = color.id;
            wrap.querySelectorAll('.ship-color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            drawShipPreview();
            await saveShipColor(color.id);
        };
        wrap.appendChild(btn);
    });

    drawShipPreview();
}

function drawShipPreview() {
    const canvas = document.getElementById('ship-preview-canvas');
    if (!canvas) return;
    const ctx2 = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = 'rgba(0,0,0,0.5)';
    ctx2.fillRect(0, 0, W, H);

    const entry = SHIP_COLORS.find(c => c.id === playerShipColor);
    const col   = (entry && entry.hex) ? entry.hex : '#00ffff';

    const px = W * 0.18, py = H / 2, pw = 60, ph = 22;

    // Trail
    for (let i = 0; i < 8; i++) {
        const t = i / 8;
        ctx2.fillStyle = `rgba(255,255,255,${t * 0.25})`;
        ctx2.beginPath();
        const tw = pw * t, th = ph * t;
        ctx2.roundRect(px + (pw - tw) / 2, py - th / 2, tw, th, 3);
        ctx2.fill();
    }

    // Body
    ctx2.shadowBlur  = 18;
    ctx2.shadowColor = col;
    ctx2.fillStyle   = col;
    ctx2.beginPath();
    ctx2.roundRect(px, py - ph / 2, pw, ph, 5);
    ctx2.fill();

    // Cockpit
    ctx2.fillStyle = 'rgba(255,255,255,0.55)';
    ctx2.beginPath();
    ctx2.roundRect(px + pw - 18, py - ph / 2 + 4, 11, ph - 8, 3);
    ctx2.fill();
    ctx2.shadowBlur = 0;
}

// ──────────────────────────────────────────────────────────
//  GHOST & 2× SCORE POWERUPS
// ──────────────────────────────────────────────────────────

let ghost       = false;
let ghostTimer  = 0;
let doubleScore = false;
let doubleTimer = 0;

// Hook into the existing game loop tick — called from updatePowerupTimers
function updateNewPowerups() {
    if (ghost && --ghostTimer <= 0) {
        ghost = false;
        document.getElementById('pu-ghost').classList.remove('active');
    }
    if (doubleScore && --doubleTimer <= 0) {
        doubleScore = false;
        document.getElementById('pu-double').classList.remove('active');
    }
}

// ──────────────────────────────────────────────────────────
//  VERSION CHECK
// ──────────────────────────────────────────────────────────

async function checkVersion() {
    try {
        const res  = await fetch('/api/version');
        const data = await res.json();
        if (data.version && data.version !== GAME_VERSION) {
            showUpdateBanner(data.version);
        }
    } catch { /* silently ignore network errors */ }
}

function showUpdateBanner(newVersion) {
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
        <div id="update-banner-inner">
            <span id="update-banner-icon">🚀</span>
            <div id="update-banner-text">
                <div id="update-banner-title">GAME UPDATED</div>
                <div id="update-banner-sub">${newVersion} is available — refresh to get the latest</div>
            </div>
            <button id="update-banner-refresh" onclick="location.reload()">REFRESH</button>
            <button id="update-banner-close" onclick="document.getElementById('update-banner').remove()">✕</button>
        </div>`;
    Object.assign(banner.style, {
        position:   'fixed',
        bottom:     '80px',
        left:       '50%',
        transform:  'translateX(-50%) translateY(20px)',
        zIndex:     '9999',
        opacity:    '0',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: 'auto',
    });
    document.body.appendChild(banner);

    // Slide in
    requestAnimationFrame(() => requestAnimationFrame(() => {
        banner.style.opacity   = '1';
        banner.style.transform = 'translateX(-50%) translateY(0)';
    }));
}

// Inject banner styles once
(function() {
    const s = document.createElement('style');
    s.textContent = `
    #update-banner-inner {
        display: flex; align-items: center; gap: 14px;
        background: rgba(0,0,0,0.85);
        border: 1px solid rgba(0,255,200,0.35);
        border-radius: 12px;
        padding: 14px 18px;
        box-shadow: 0 0 30px rgba(0,255,180,0.15);
        backdrop-filter: blur(10px);
        white-space: nowrap;
    }
    #update-banner-icon { font-size: 22px; }
    #update-banner-title {
        font-family: 'Orbitron', monospace; font-size: 11px;
        font-weight: 700; letter-spacing: 3px; color: #00ffc8;
    }
    #update-banner-sub {
        font-family: 'Share Tech Mono', monospace; font-size: 10px;
        letter-spacing: 1px; color: rgba(255,255,255,0.45);
        margin-top: 3px;
    }
    #update-banner-refresh {
        font-family: 'Orbitron', monospace; font-size: 10px;
        font-weight: 700; letter-spacing: 2px;
        background: #00ffc8; color: #000; border: none;
        border-radius: 6px; padding: 8px 16px; cursor: pointer;
        transition: background 0.15s, transform 0.1s;
    }
    #update-banner-refresh:hover { background: #66ffe0; transform: scale(1.04); }
    #update-banner-close {
        background: none; border: none;
        color: rgba(255,255,255,0.3); font-size: 14px;
        cursor: pointer; padding: 4px 6px; line-height: 1;
        transition: color 0.15s;
    }
    #update-banner-close:hover { color: white; }
    `;
    document.head.appendChild(s);
})();

checkVersion();

// ──────────────────────────────────────────────────────────

loadAllLevels();