// Solmar Bay: boot, the fixed-step loop, screen changes, entering and
// stealing cars, shooting, and the save. The world advances in fixed 1/60 s
// steps; the renderer paints what is there. ?shot=cover|drive|chase|mission|
// title stages that scene instead of running the loop, paints it, and sets
// window.__shotReady for a screenshot.

import { buildCity } from './city.js';
import { createInput, ACT_ENTER, ACT_PAUSE, ACT_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { writeSave, readSave, clearSave } from './save.js';
import {
  makeCar, spawnTraffic, spawnPeds, updatePlayerOnFoot, updatePlayerDriving,
  updateTraffic, updatePeds, updatePolice, updateEnemies, updateBullets,
  updateParticles, updateWanted, addParticles, addShake,
} from './entities.js';
import { MISSIONS, currentMission, startMission, updateMissions, missionTarget } from './missions.js';
import { drawWorld, drawMinimap, updateHud, showToast } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const SHOOT_COOLDOWN = 0.22;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function createState() {
  const city = buildCity(seed);
  const garage = city.landmarks.garage;
  const state = {
    city,
    mode: 'title',
    time: 0,
    seed,
    player: {
      x: garage.x, y: garage.y - 60, angle: -Math.PI / 2, aim: 0, speed: 0,
      health: 100, cash: 250, ammo: 60, wanted: 0, onFoot: true, car: null,
      lastCrime: -999, coolTimer: 0, arrestTimer: 0, moving: false,
    },
    cars: [],
    peds: [],
    police: [],
    enemies: [],
    bullets: [],
    particles: [],
    drops: null,
    missionCar: null,
    missionIndex: 0,
    mission: MISSIONS[0],
    missionTarget: null,
    camera: { x: garage.x, y: garage.y - 60 },
    view: { w: 1280, h: 800, x: 0, y: 0, scale: 1 },
    shake: 0,
    shotsFired: 0,
    shootTimer: 0,
    stats: { carsStolen: 0, missionsDone: 0 },
    audio: null,
    toastTimer: 0,
  };
  state.audio = createAudio();
  state.cars = spawnTraffic(city, 14);
  for (const parked of city.parked) {
    const car = makeCar(parked.x, parked.y, parked.angle, parked.color, 'traffic');
    car.sporty = parked.sporty;
    car.cruise = 0;
    state.cars.push(car);
  }
  state.peds = spawnPeds(city, 26);
  state.toast = (msg) => showToast(state, msg);
  return state;
}

function resize(state) {
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(window.innerWidth * ratio);
  const h = Math.round(window.innerHeight * ratio);
  canvas.width = w;
  canvas.height = h;
  state.view.w = w;
  state.view.h = h;
  state.view.scale = ratio;
}

// One fixed step of the game, whatever screen it is on.
function stepGame(state, input, dt) {
  state.time += dt;
  const p = state.player;
  if (state.mode !== 'playing') return;
  const actions = input.takeActions();
  if (actions & ACT_MUTE) {
    const muted = state.audio.toggleMute();
    state.toast(muted ? 'Sound off' : 'Sound on');
  }
  if (actions & ACT_PAUSE) {
    showPause(state);
    return;
  }
  if (actions & ACT_ENTER) enterOrExitCar(state);
  if (p.onFoot) updatePlayerOnFoot(state, state.city, input, dt);
  else updatePlayerDriving(state, state.city, input, dt);

  // Shooting: click (or hold) fires toward the mouse, on foot or from a car.
  state.shootTimer -= dt;
  if ((input.mouse.down || input.takeClick()) && state.shootTimer <= 0 && p.ammo > 0) {
    state.shootTimer = SHOOT_COOLDOWN;
    p.ammo -= 1;
    state.shotsFired += 1;
    const aim = p.onFoot ? p.aim : p.angle;
    const ox = p.x + Math.cos(aim) * 22;
    const oy = p.y + Math.sin(aim) * 22;
    state.bullets.push({ x: ox, y: oy, vx: Math.cos(aim) * 640, vy: Math.sin(aim) * 640, from: 'player', life: 0.9 });
    state.audio.shoot();
    addParticles(state, ox, oy, 3, '#ffe27a');
    if (state.time - p.lastCrime > 1.5) {
      p.wanted = Math.min(5, p.wanted + 1);
      p.lastCrime = state.time;
    }
  }

  updateTraffic(state, state.city, dt);
  updatePeds(state, state.city, dt);
  updatePolice(state, state.city, dt);
  updateEnemies(state, dt);
  updateBullets(state, state.city, dt);
  updateParticles(state, dt);
  updateWanted(state, dt);
  state.mission = currentMission(state);
  state.missionTarget = missionTarget(state);
  if (updateMissions(state)) {
    writeSave(state);
    if (state.mode === 'complete') showEnd(state, true);
  }
  if (state.mode === 'busted') showEnd(state, false, 'BUSTED');
  else if (state.mode === 'wasted') showEnd(state, false, 'WASTED');
  if (p.health <= 0 && state.mode === 'playing') {
    state.mode = 'wasted';
    showEnd(state, false, 'WASTED');
  }
  state.audio.update(dt, p.wanted);

  // Camera follows Rook, clamped to the city.
  const tx = Math.max(state.view.w / 2, Math.min(state.city.width - state.view.w / 2, p.x));
  const ty = Math.max(state.view.h / 2, Math.min(state.city.height - state.view.h / 2, p.y));
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
  state.shake = Math.max(0, state.shake - dt * 22);
}

function nearestCar(state, maxDist) {
  const p = state.player;
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of state.cars) {
    if (car.kind === 'police') continue;
    const dx = car.x - p.x;
    const dy = car.y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterOrExitCar(state) {
  const p = state.player;
  if (p.onFoot) {
    const car = nearestCar(state, 70);
    if (!car) { state.toast('No car close enough — walk up to one and press E.'); return; }
    if (car.kind === 'traffic') {
      state.stats.carsStolen += 1;
      p.wanted = Math.min(5, Math.max(1, p.wanted));
      p.lastCrime = state.time;
      state.audio.steal();
      state.toast(car.sporty ? 'Sports car stolen! The owner will not be pleased.' : 'Car stolen. Lose the heat.');
    }
    car.kind = 'player';
    p.car = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = car.angle;
  } else {
    const car = p.car;
    car.kind = 'traffic';
    car.cruise = 0;
    car.speed = 0;
    p.car = null;
    p.onFoot = true;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  }
}

function showScreen(id) {
  for (const el of ['title-screen', 'pause-screen', 'end-screen', 'hud']) {
    const node = document.getElementById(el);
    if (node) node.classList.toggle('hidden', el !== id);
  }
}

function showPause(state) {
  state.mode = 'paused';
  const info = document.getElementById('pause-info');
  if (info) {
    info.textContent = `Cash $${state.player.cash.toLocaleString('en-US')} · Jobs done ${state.stats.missionsDone} of ${MISSIONS.length} · Cars stolen ${state.stats.carsStolen} · Wanted ${state.player.wanted}★`;
  }
  showScreen('pause-screen');
  announce('Paused.');
}

function showEnd(state, won, kind) {
  const title = document.getElementById('end-title');
  const text = document.getElementById('end-text');
  if (won) {
    if (title) title.textContent = 'DEBT PAID';
    if (text) text.textContent = `All five jobs done. Mara shakes your hand, the Gull syndicate crosses your name off, and Solmar Bay is yours now — $ ${state.player.cash.toLocaleString('en-US')} in your pocket.`;
    announce('Story complete. Debt paid.');
  } else if (kind === 'BUSTED') {
    state.audio.busted();
    if (title) title.textContent = 'BUSTED';
    if (text) text.textContent = 'The Bay City Police dragged you out of the car. You lose $500 in fines and wake up at the station — the jobs are still waiting.';
    state.player.cash = Math.max(0, state.player.cash - 500);
    state.player.wanted = 0;
    state.player.health = 100;
    state.player.arrestTimer = 0;
    announce('Busted. You lost $500.');
  } else {
    if (title) title.textContent = 'WASTED';
    if (text) text.textContent = 'Rook went down in the streets of Solmar Bay. Mara will find someone else — unless you try again.';
    announce('Wasted.');
  }
  showScreen('end-screen');
}

function startPlaying(state, fromSave) {
  state.audio.unlock();
  if (fromSave) {
    const save = readSave();
    if (save) {
      state.player.cash = save.cash;
      state.player.health = save.health;
      state.player.ammo = save.ammo;
      state.player.x = save.x;
      state.player.y = save.y;
      state.stats.carsStolen = save.carsStolen || 0;
      state.stats.missionsDone = save.missionsDone || 0;
      startMission(state, Math.min(save.missionIndex, MISSIONS.length - 1));
      state.camera.x = save.x;
      state.camera.y = save.y;
    }
  } else {
    startMission(state, 0);
  }
  state.mode = 'playing';
  showScreen('hud');
  announce('Playing. Follow the gold marker.');
}

function runGame() {
  const state = createState();
  const input = createInput(canvas);
  resize(state);
  window.addEventListener('resize', () => resize(state));

  const startBtn = document.getElementById('start-btn');
  const continueBtn = document.getElementById('continue-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const saveBtn = document.getElementById('save-btn');
  const restartBtn = document.getElementById('restart-btn');
  const againBtn = document.getElementById('again-btn');
  if (startBtn) startBtn.addEventListener('click', () => startPlaying(state, false));
  if (continueBtn) {
    if (readSave()) continueBtn.classList.remove('hidden');
    continueBtn.addEventListener('click', () => startPlaying(state, true));
  }
  if (resumeBtn) resumeBtn.addEventListener('click', () => { state.mode = 'playing'; showScreen('hud'); });
  if (saveBtn) saveBtn.addEventListener('click', () => {
    state.toast(writeSave(state) ? 'Game saved.' : 'Save failed — storage is off.');
  });
  if (restartBtn) restartBtn.addEventListener('click', () => {
    clearSave();
    const fresh = createState();
    Object.assign(state, fresh);
    state.mode = 'title';
    showScreen('title-screen');
  });
  if (againBtn) againBtn.addEventListener('click', () => {
    const fresh = createState();
    Object.assign(state, fresh);
    startPlaying(state, false);
  });

  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (state.mode === 'playing' || state.mode === 'title') {
      while (accumulator >= STEP) {
        stepGame(state, input, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    if (state.mode === 'title') {
      // A slow drift over the city behind the title screen.
      state.camera.x = state.city.width / 2 + Math.sin(state.time * 0.05) * 300;
      state.camera.y = state.city.height / 2 + Math.cos(state.time * 0.04) * 200;
      state.time += STEP;
    }
    ctx.setTransform(state.view.scale, 0, 0, state.view.scale, 0, 0);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, state.view.w, state.view.h);
    drawWorld(ctx, state, state.city);
    if (state.mode === 'playing') {
      drawMinimap(ctx, state, state.city);
      updateHud(state);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') showPause(state);
  });

  showScreen('title-screen');
  announce('Solmar Bay. Press Start Engine to play.');
  requestAnimationFrame(frame);
}

function runShot(name) {
  const state = createState();
  resize(state);
  stageShot(state, stepGame, name);
  // A staged scene fires its job-intro toast while it plays forward; hide it
  // so the frame shows the city, not a banner.
  const toast = document.getElementById('toast');
  if (toast) { clearTimeout(state.toastTimer); toast.style.opacity = '0'; }
  state.mission = currentMission(state);
  state.missionTarget = missionTarget(state);
  ctx.setTransform(state.view.scale, 0, 0, state.view.scale, 0, 0);
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 0, state.view.w, state.view.h);
  drawWorld(ctx, state, state.city);
  if (state.mode === 'playing') {
    drawMinimap(ctx, state, state.city);
    updateHud(state);
  }
  showScreen(state.mode === 'title' ? 'title-screen' : 'hud');
  window.__shotReady = true;
}

if (shot) runShot(shot);
else runGame();
