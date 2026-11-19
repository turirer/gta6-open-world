// Screenshot scenes behind ?shot=cover|drive|chase|mission|title. Each one sets
// up a real game state — a car, traffic, police, a live job — then plays the
// real update loop forward for a fixed number of steps with a simple autopilot
// (drive forward, steer toward the road ahead), so the frame is what a short
// game really looks like, and the same scene always gives the same frame.

import { makeCar } from './entities.js';
import { startMission } from './missions.js';

const TICKS = 150;

function fakeInput(steer) {
  return {
    drive() { return { fwd: 1, steer }; },
    sprint() { return false; },
    mouse: { x: 900, y: 300, down: false, clicked: false },
    takeActions() { return 0; },
    takeClick() { return false; },
  };
}

function putPlayerInCar(state, x, y, angle, color, sporty) {
  const car = makeCar(x, y, angle, color, 'player');
  car.sporty = sporty;
  car.speed = 180;
  state.cars.push(car);
  state.player.car = car;
  state.player.onFoot = false;
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  return car;
}

function addChasers(state, n, wanted) {
  state.player.wanted = wanted;
  state.player.lastCrime = state.time;
  for (let i = 0; i < n; i += 1) {
    const a = Math.PI + (i - n / 2) * 0.5;
    const car = makeCar(state.player.x + Math.cos(a) * 260, state.player.y + Math.sin(a) * 200, 0, '#1c2f6e', 'police');
    car.speed = 240;
    state.police.push(car);
    state.cars.push(car);
  }
}

export function stageShot(state, stepFn, name) {
  const city = state.city;
  state.mode = 'playing';
  state.time = 0;
  if (name === 'title') {
    state.mode = 'title';
    return;
  }
  if (name === 'mission') {
    startMission(state, 3);
    state.player.x = 760;
    state.player.y = 660;
    state.player.onFoot = true;
    state.player.aim = 0.6;
    state.player.wanted = 2;
    state.player.lastCrime = state.time;
    for (let i = 0; i < TICKS; i += 1) stepFn(state, fakeInput(0), 1 / 60);
    return;
  }
  if (name === 'drive') {
    startMission(state, 1);
    putPlayerInCar(state, 700, 950, 0, '#3d7dd9', false);
    for (let i = 0; i < TICKS; i += 1) stepFn(state, fakeInput(i % 90 < 45 ? 0.12 : -0.12), 1 / 60);
    return;
  }
  if (name === 'chase') {
    startMission(state, 4);
    putPlayerInCar(state, 1100, 600, 0, '#e8c33a', true);
    addChasers(state, 3, 4);
    for (let i = 0; i < TICKS; i += 1) stepFn(state, fakeInput(i % 60 < 30 ? 0.2 : -0.2), 1 / 60);
    return;
  }
  // cover: the getaway, downtown, police behind, wanted 3.
  startMission(state, 4);
  putPlayerInCar(state, 1100, 950, 0, '#d41f2e', true);
  addChasers(state, 2, 3);
  for (let i = 0; i < TICKS; i += 1) stepFn(state, fakeInput(i % 80 < 40 ? 0.15 : -0.15), 1 / 60);
}
