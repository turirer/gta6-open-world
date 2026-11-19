// Drawing only: the city, the cars, the people and the minimap, painted onto
// the canvas from the state. The camera follows Rook; the HUD itself lives in
// the DOM (index.html) and is updated here once a frame.

const MINIMAP = { x: 0, y: 0, w: 220, h: 160 };

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-24, -10, 48, 24);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-24, -12, 48, 24, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(2, -10, 10, 20);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(22, -10, 3, 4);
  ctx.fillRect(22, 6, 3, 4);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(-8, -14, 7, 4);
    ctx.fillStyle = '#2d6bff';
    ctx.fillRect(1, -14, 7, 4);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(2, 3, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 16);
  }
}

export function drawWorld(ctx, state, city) {
  const cam = state.camera;
  const vw = state.view.w;
  const vh = state.view.h;
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.translate(-cam.x + vw / 2 + shakeX, -cam.y + vh / 2 + shakeY);

  // Ground: grass, then sand at the beach, then water at the marina.
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(0, 0, city.width, city.height);
  ctx.fillStyle = '#e8d28a';
  ctx.fillRect(0, city.beach.y0, city.width, city.height - city.beach.y0);
  ctx.fillStyle = '#3d8fd1';
  ctx.fillRect(city.water.x0, city.water.y0, city.width - city.water.x0, city.water.y1 - city.water.y0);
  // Park lawn.
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(city.park.x0, city.park.y0, city.park.x1 - city.park.x0, city.park.y1 - city.park.y0);

  // Roads.
  ctx.fillStyle = '#3a3f47';
  for (const rx of city.roadsV) ctx.fillRect(rx - city.roadW / 2, 0, city.roadW, city.height);
  for (const ry of city.roadsH) ctx.fillRect(0, ry - city.roadW / 2, city.width, city.roadW);
  // Lane dashes.
  ctx.fillStyle = '#e8d44d';
  for (const rx of city.roadsV) {
    for (let y = 20; y < city.height; y += 60) ctx.fillRect(rx - 2, y, 4, 28);
  }
  for (const ry of city.roadsH) {
    for (let x = 20; x < city.width; x += 60) ctx.fillRect(x, ry - 2, 28, 4);
  }
  // Sidewalk edges.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  for (const rx of city.roadsV) {
    ctx.beginPath(); ctx.moveTo(rx - city.roadW / 2, 0); ctx.lineTo(rx - city.roadW / 2, city.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + city.roadW / 2, 0); ctx.lineTo(rx + city.roadW / 2, city.height); ctx.stroke();
  }

  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = '#2f7a33';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4da34d';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }

  // Buildings, with a drop shadow on the sunny side.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + b.tall * 0.5, b.y + b.tall * 0.5, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 26) {
      for (let wy = b.y + 14; wy < b.y + b.h - 14; wy += 24) ctx.fillRect(wx, wy, 10, 12);
    }
  }

  // Landmark labels.
  ctx.fillStyle = '#10203a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const key of Object.keys(city.landmarks)) {
    const lm = city.landmarks[key];
    ctx.fillText(lm.name, lm.x, lm.y - 12);
  }

  // Mission target marker: a pulsing ring and a beam of light.
  const target = state.missionTarget;
  if (target && state.mode === 'playing') {
    const pulse = 1 + 0.25 * Math.sin(state.time * 4);
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(target.x, target.y, target.r * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,94,0.18)';
    ctx.beginPath(); ctx.arc(target.x, target.y, target.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(target.label, target.x, target.y - target.r - 8);
  }
  // Cash drops.
  if (state.drops) {
    for (const d of state.drops) {
      if (d.taken) continue;
      ctx.fillStyle = '#2fae4e';
      ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('$', d.x, d.y + 5);
    }
  }

  // Parked cars, traffic, police and the player's car.
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    drawCar(ctx, car);
  }
  if (state.player.car) drawCar(ctx, state.player.car);

  // Pedestrians and rivals.
  for (const ped of state.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color);
  for (const e of state.enemies) {
    if (e.health <= 0) continue;
    drawPerson(ctx, e.x, e.y, e.aim, '#c22f2f', 'GULL');
    ctx.fillStyle = '#c22f2f';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * (e.health / 100), 4);
  }

  // Bullets and particles.
  for (const b of state.bullets) {
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rook on foot, with an aim line when shooting.
  const p = state.player;
  if (p.onFoot) {
    drawPerson(ctx, p.x, p.y, p.aim, '#2f6fd0', 'ROOK');
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.aim) * 34, p.y + Math.sin(p.aim) * 34); ctx.stroke();
  }
  ctx.restore();
}

export function drawMinimap(ctx, state, city) {
  const m = MINIMAP;
  const scaleX = m.w / city.width;
  const scaleY = m.h / city.height;
  const x = state.view.w - m.w - 16;
  const y = state.view.h - m.h - 16;
  m.x = x; m.y = y;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,24,0.82)';
  ctx.fillRect(x - 4, y - 4, m.w + 8, m.h + 8);
  ctx.strokeStyle = '#ffffff44';
  ctx.strokeRect(x - 4, y - 4, m.w + 8, m.h + 8);
  ctx.fillStyle = '#5da24a';
  ctx.fillRect(x, y, m.w, m.h);
  ctx.fillStyle = '#3d8fd1';
  ctx.fillRect(x + city.water.x0 * scaleX, y + city.water.y0 * scaleY, m.w - city.water.x0 * scaleX, (city.water.y1 - city.water.y0) * scaleY);
  ctx.fillStyle = '#e8d28a';
  ctx.fillRect(x, y + city.beach.y0 * scaleY, m.w, m.h - city.beach.y0 * scaleY);
  ctx.fillStyle = '#3a3f47';
  for (const rx of city.roadsV) ctx.fillRect(x + rx * scaleX - 2, y, 4, m.h);
  for (const ry of city.roadsH) ctx.fillRect(x, y + ry * scaleY - 2, m.w, 4);
  ctx.fillStyle = '#ffffff';
  for (const b of city.buildings) ctx.fillRect(x + b.x * scaleX, y + b.y * scaleY, Math.max(1, b.w * scaleX), Math.max(1, b.h * scaleY));
  if (state.missionTarget) {
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(x + state.missionTarget.x * scaleX, y + state.missionTarget.y * scaleY, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const car of state.police) {
    ctx.fillStyle = '#4d7dff';
    ctx.beginPath(); ctx.arc(x + car.x * scaleX, y + car.y * scaleY, 3, 0, Math.PI * 2); ctx.fill();
  }
  // The player is a white dot with a direction tick; the view rectangle shows the camera.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.strokeRect(x + state.camera.x * scaleX - state.view.w * scaleX / 2, y + state.camera.y * scaleY - state.view.h * scaleY / 2, state.view.w * scaleX, state.view.h * scaleY);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + state.player.x * scaleX, y + state.player.y * scaleY, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', x, y - 8);
  ctx.restore();
}

// The DOM HUD: cash, health, wanted stars, the current job, speed.
export function updateHud(state) {
  const p = state.player;
  const cash = document.getElementById('cash');
  if (cash) cash.textContent = '$' + p.cash.toLocaleString('en-US');
  const fill = document.getElementById('healthfill');
  if (fill) fill.style.width = Math.max(0, p.health) + '%';
  const wanted = document.getElementById('wanted');
  if (wanted) wanted.textContent = '★'.repeat(p.wanted) + '☆'.repeat(Math.max(0, 5 - p.wanted));
  const speed = document.getElementById('speed');
  if (speed) speed.textContent = p.onFoot ? 'ON FOOT' : Math.round(Math.abs(p.speed) * 0.28) + ' mph';
  const title = document.getElementById('mission-title');
  const text = document.getElementById('mission-text');
  const mission = state.mission;
  if (title) title.textContent = mission ? mission.title : 'FREE ROAM';
  if (text) text.textContent = mission ? mission.text : 'Explore Solmar Bay. Steal cars, lose the heat, have fun.';
}

export function showToast(state, message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2600);
}
