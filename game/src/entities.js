// Everyone who moves in Solmar Bay: Rook on foot and behind the wheel, the
// traffic that fills the streets, the pedestrians on the sidewalks, the Bay
// City Police who chase you, rival crew members, bullets and particles.
// All movement is plain circle / rectangle checks against the city layout.

import { hitBuilding, nearestRoadPoint, onRoad } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8c33a', '#e8e8e8', '#4dd07a', '#8a5fd0', '#e08a3d'];
const PED_COLORS = ['#f2c94c', '#7ec8f2', '#f28ab2', '#9be07a', '#e8e8e8', '#d0a35f'];
const STEP = 1 / 60;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function moveWithCollisions(city, body, nx, ny, radius) {
  // Try the full step, then each axis alone, so a car slides along a wall
  // instead of stopping dead on it.
  if (!hitBuilding(city, nx, ny, radius) && nx > 20 && nx < city.width - 20 && ny > 20 && ny < city.height - 20) {
    body.x = nx; body.y = ny;
    return;
  }
  if (!hitBuilding(city, nx, body.y, radius)) body.x = nx;
  else if (!hitBuilding(city, body.x, ny, radius)) body.y = ny;
}

export function makeCar(x, y, angle, color, kind) {
  return { x, y, angle, speed: 0, color, kind: kind || 'traffic', target: null, wait: 0, honk: 0 };
}

export function makePed(x, y) {
  return { x, y, angle: Math.random() * Math.PI * 2, speed: 34 + Math.random() * 22, color: PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)], flee: 0 };
}

export function spawnTraffic(city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = Math.random() < 0.5;
    const road = vertical
      ? city.roadsV[Math.floor(Math.random() * city.roadsV.length)]
      : city.roadsH[Math.floor(Math.random() * city.roadsH.length)];
    const along = 150 + Math.random() * (vertical ? city.height - 300 : city.width - 300);
    const car = makeCar(vertical ? road + (Math.random() < 0.5 ? -22 : 22) : along, vertical ? along : road + (Math.random() < 0.5 ? -22 : 22), vertical ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI), CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
    car.speed = 90 + Math.random() * 50;
    cars.push(car);
  }
  return cars;
}

export function spawnPeds(city, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const x = 120 + Math.random() * (city.width - 240);
    const y = 120 + Math.random() * (city.height - 240);
    peds.push(makePed(x, y));
  }
  return peds;
}

// The player on foot: WASD moves, Shift sprints, the mouse aims.
export function updatePlayerOnFoot(state, city, input, dt) {
  const p = state.player;
  const drive = input.drive();
  const speed = input.sprint() ? 250 : 165;
  const mx = drive.steer;
  const my = -drive.fwd;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    p.angle = Math.atan2(my, mx);
    moveWithCollisions(city, p, p.x + (mx / len) * speed * dt, p.y + (my / len) * speed * dt, 12);
    p.moving = true;
  } else {
    p.moving = false;
  }
  // Aim at the mouse, in world coordinates: the mouse is in CSS pixels,
  // the canvas is in device pixels, and the camera is centred on the view.
  const rect = state.view;
  const wx = state.camera.x + input.mouse.x * rect.scale - rect.w / 2;
  const wy = state.camera.y + input.mouse.y * rect.scale - rect.h / 2;
  p.aim = Math.atan2(wy - p.y, wx - p.x);
  p.speed = len > 0 ? speed : 0;
}

// The player driving: W/S throttle and brake, A/D steer, faster on roads.
export function updatePlayerDriving(state, city, input, dt) {
  const p = state.player;
  const car = p.car;
  const drive = input.drive();
  const boost = input.sprint() ? 1.35 : 1;
  const top = (car.sporty ? 420 : 320) * boost;
  if (drive.fwd > 0) car.speed = Math.min(top, car.speed + 420 * dt);
  else if (drive.fwd < 0) car.speed = Math.max(-140, car.speed - 520 * dt);
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 260 * dt);
  if (Math.abs(car.speed) > 8) {
    car.angle += drive.steer * (car.speed > 0 ? 1 : -1) * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 120);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  moveWithCollisions(city, car, nx, ny, 16);
  if (Math.abs(car.x - before.x) < 0.01 && Math.abs(car.y - before.y) < 0.01 && Math.abs(car.speed) > 60) {
    car.speed *= 0.4;
    state.audio.crash();
    addShake(state, 5);
  }
  p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = Math.abs(car.speed);
  if (!onRoad(city, car.x, car.y)) car.speed *= (1 - 0.5 * dt);
}

// Traffic keeps to its lane, turns at intersections, and stops for the car ahead.
export function updateTraffic(state, city, dt) {
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    const ahead = { x: car.x + Math.cos(car.angle) * 46, y: car.y + Math.sin(car.angle) * 46 };
    let blocked = false;
    for (const other of state.cars) {
      if (other === car) continue;
      if (dist2(ahead, other) < 30 * 30) { blocked = true; break; }
    }
    if (blocked) { car.wait += dt; car.speed = Math.max(0, car.speed - 300 * dt); }
    else {
      car.wait = 0;
      car.speed = Math.min(car.cruise || 120, car.speed + 120 * dt);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (hitBuilding(city, nx, ny, 14)) {
      // Reached the end of a road: pick a turn at the nearest intersection.
      const turn = (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2;
      car.angle += turn;
      car.x = nearestRoadPoint(city, car.x, car.y).x;
      car.y = nearestRoadPoint(city, car.x, car.y).y;
    } else {
      car.x = nx; car.y = ny;
    }
    // Keep traffic on the roads: nudge a drifting car back toward its lane.
    const rp = nearestRoadPoint(city, car.x, car.y);
    if (Math.abs(car.x - rp.x) > 60 && Math.abs(car.y - rp.y) > 60) {
      car.angle = angleTo(car, rp);
    }
  }
}

export function updatePeds(state, city, dt) {
  for (const ped of state.peds) {
    const player = state.player;
    const d = dist2(ped, player);
    const scared = state.player.wanted > 0 || state.shotsFired > 0;
    if (scared && d < 220 * 220) {
      ped.flee = 1.2;
      ped.angle = angleTo(player, ped);
    } else if (ped.flee > 0) {
      ped.flee -= dt;
    } else if (Math.random() < dt * 0.08) {
      ped.angle += (Math.random() - 0.5) * 2.4;
    }
    const speed = ped.flee > 0 ? 150 : ped.speed;
    const nx = ped.x + Math.cos(ped.angle) * speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * speed * dt;
    if (!hitBuilding(city, nx, ny, 8) && nx > 10 && nx < city.width - 10 && ny > 10 && ny < city.height - 10) {
      ped.x = nx; ped.y = ny;
    } else {
      ped.angle += Math.PI / 2;
    }
  }
}

// Police: spawn up to the wanted level's count, chase and ram the player.
// On foot they close in and arrest; in a car they try to spin you out.
export function updatePolice(state, city, dt) {
  const p = state.player;
  const want = Math.min(5, p.wanted);
  const target = want * 2;
  while (state.police.length < target) {
    const a = Math.random() * Math.PI * 2;
    const car = makeCar(p.x + Math.cos(a) * 620, p.y + Math.sin(a) * 620, 0, '#1c2f6e', 'police');
    car.speed = 200;
    state.police.push(car);
    state.cars.push(car);
  }
  while (state.police.length > target) {
    const car = state.police.pop();
    const i = state.cars.indexOf(car);
    if (i >= 0) state.cars.splice(i, 1);
  }
  for (const car of state.police) {
    car.cruise = 300 + want * 26;
    const desired = angleTo(car, p);
    let diff = desired - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    car.speed = Math.min(car.cruise, car.speed + 200 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!hitBuilding(city, nx, ny, 14)) { car.x = nx; car.y = ny; }
    else car.speed *= 0.5;
    if (dist2(car, p) < 46 * 46) {
      if (p.onFoot) {
        p.arrestTimer = (p.arrestTimer || 0) + dt;
        if (p.arrestTimer > 1.6) state.mode = 'busted';
      } else {
        p.car.speed *= (1 - 2.2 * dt);
        p.health -= 6 * dt;
        addShake(state, 4);
      }
    }
  }
  if (p.onFoot && state.police.every((c) => dist2(c, p) > 120 * 120)) p.arrestTimer = 0;
}

// Rival crew members: they stand their ground and shoot at Rook.
export function updateEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    if (e.health <= 0) continue;
    const d = Math.sqrt(dist2(e, p));
    e.aim = angleTo(e, p);
    if (d > 260) {
      e.x += Math.cos(e.aim) * 70 * dt;
      e.y += Math.sin(e.aim) * 70 * dt;
    }
    e.cool -= dt;
    if (d < 420 && e.cool <= 0) {
      e.cool = 1.1 + Math.random() * 0.7;
      state.bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.aim) * 520, vy: Math.sin(e.aim) * 520, from: 'enemy', life: 1.2 });
      state.audio.shoot();
    }
  }
  state.enemies = state.enemies.filter((e) => e.health > 0);
}

export function updateBullets(state, city, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (hitBuilding(city, b.x, b.y, 2)) b.life = 0;
    if (b.from === 'player') {
      for (const e of state.enemies) {
        if (e.health > 0 && dist2(b, e) < 16 * 16) {
          e.health -= 34;
          b.life = 0;
          state.audio.hit();
          addParticles(state, b.x, b.y, 6, '#ffd75e');
          if (e.health <= 0) {
            state.player.cash += 150;
            state.player.wanted = Math.min(5, state.player.wanted + 1);
            state.player.lastCrime = state.time;
          }
        }
      }
      for (const car of state.police) {
        if (dist2(b, car) < 22 * 22) {
          b.life = 0;
          state.player.wanted = Math.min(5, state.player.wanted + 1);
          state.player.lastCrime = state.time;
        }
      }
    } else if (b.from === 'enemy') {
      const p = state.player;
      if (dist2(b, p) < 14 * 14) {
        b.life = 0;
        p.health -= 9;
        state.audio.hit();
        addShake(state, 3);
        if (p.health <= 0) state.mode = 'wasted';
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

export function addParticles(state, x, y, n, color) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    state.particles.push({ x, y, vx: Math.cos(a) * (40 + Math.random() * 90), vy: Math.sin(a) * (40 + Math.random() * 90), life: 0.4 + Math.random() * 0.4, color });
  }
}

export function updateParticles(state, dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}

export function addShake(state, amount) {
  state.shake = Math.min(10, (state.shake || 0) + amount);
}

// Wanted level cools off when Rook stays clean and out of sight.
export function updateWanted(state, dt) {
  const p = state.player;
  if (p.wanted === 0) return;
  const seen = state.police.some((c) => dist2(c, p) < 420 * 420);
  if (state.time - p.lastCrime > 22 && !seen) {
    p.coolTimer = (p.coolTimer || 0) + dt;
    if (p.coolTimer > 6) {
      p.wanted -= 1;
      p.coolTimer = 0;
    }
  } else {
    p.coolTimer = 0;
  }
}

export { STEP };
