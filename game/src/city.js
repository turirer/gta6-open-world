// Solmar Bay itself: the street grid, the blocks between them, the buildings,
// the beach, the marina water and the park. Everything is laid out from one
// seeded generator, so the same seed always builds the same city.

export const WORLD = { width: 2600, height: 1900 };

const ROADS_V = [300, 700, 1100, 1500, 1900, 2300];
const ROADS_H = [250, 600, 950, 1300, 1650];
const ROAD_W = 96;

function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

const WALL_COLORS = ['#c98f5f', '#b57a6e', '#7fa3b8', '#9aa78a', '#c2a878', '#8d7fb0', '#d0b48a', '#6f8f7a'];
const ROOF_COLORS = ['#5d6b7a', '#7a5d5d', '#4d5e6e', '#6e6a4d'];

export function buildCity(seed) {
  const rnd = mulberry32(seed);
  const buildings = [];
  const trees = [];
  const landmarks = {};
  // Landmark spots, fixed so missions can point at them by name.
  landmarks.garage = { x: 1150, y: 1380, name: "Rook's Garage" };
  landmarks.marina = { x: 2420, y: 700, name: 'Marina Pier' };
  landmarks.hideout = { x: 500, y: 1780, name: 'Beach Hideout' };
  landmarks.market = { x: 1500, y: 950, name: 'Bay Market' };
  landmarks.tower = { x: 1100, y: 600, name: 'Solmar Tower' };
  landmarks.club = { x: 1900, y: 1300, name: 'The Gull Club' };

  const edgesV = [0, ...ROADS_V, WORLD.width];
  const edgesH = [0, ...ROADS_H, WORLD.height];
  for (let bi = 0; bi < edgesV.length - 1; bi += 1) {
    for (let bj = 0; bj < edgesH.length - 1; bj += 1) {
      const x0 = edgesV[bi] + ROAD_W / 2 + 14;
      const x1 = edgesV[bi + 1] - ROAD_W / 2 - 14;
      const y0 = edgesH[bj] + ROAD_W / 2 + 14;
      const y1 = edgesH[bj + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // The south strip is the beach, the east strip is the marina water.
      if (bj === edgesH.length - 2) continue;
      if (bi === edgesV.length - 2 && bj < 3) continue;
      // One block of green in the north-west: Coral Park.
      if (bi === 0 && bj === 0) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: x0 + 20 + rnd() * (x1 - x0 - 40), y: y0 + 20 + rnd() * (y1 - y0 - 40), r: 12 + rnd() * 10 });
        }
        continue;
      }
      const count = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < count; k += 1) {
        const w = 70 + rnd() * 90;
        const h = 60 + rnd() * 80;
        const x = x0 + 8 + rnd() * Math.max(1, x1 - x0 - w - 16);
        const y = y0 + 8 + rnd() * Math.max(1, y1 - y0 - h - 16);
        const downtown = bi >= 2 && bi <= 3 && bj >= 1 && bj <= 2;
        buildings.push({
          x, y, w, h,
          color: pick(rnd, WALL_COLORS),
          roof: pick(rnd, ROOF_COLORS),
          tall: downtown ? 26 + rnd() * 22 : 8 + rnd() * 10,
        });
      }
      if (rnd() < 0.6) {
        trees.push({ x: x0 + 16 + rnd() * (x1 - x0 - 32), y: y0 + 16 + rnd() * (y1 - y0 - 32), r: 10 + rnd() * 8 });
      }
    }
  }
  // Parked cars along a few streets, for the player to steal.
  const parked = [];
  const parkedColors = ['#d94f3d', '#3d7dd9', '#e8c33a', '#e8e8e8', '#4dd07a', '#8a5fd0'];
  for (let i = 0; i < 10; i += 1) {
    const vertical = rnd() < 0.5;
    const road = vertical ? pick(rnd, ROADS_V) : pick(rnd, ROADS_H);
    const along = 200 + rnd() * 1500;
    parked.push({
      x: vertical ? road + 30 : along,
      y: vertical ? along : road + 30,
      angle: vertical ? Math.PI / 2 : 0,
      color: pick(rnd, parkedColors),
      sporty: rnd() < 0.25,
    });
  }
  return {
    width: WORLD.width,
    height: WORLD.height,
    roadsV: ROADS_V,
    roadsH: ROADS_H,
    roadW: ROAD_W,
    buildings,
    trees,
    parked,
    landmarks,
    beach: { y0: 1680 },
    water: { x0: 2340, y0: 150, y1: 1000 },
    park: { x0: 60, y0: 60, x1: 250, y1: 200 },
  };
}

// Is this point on a road (drivable), or inside a building (solid)?
export function onRoad(city, x, y) {
  for (const rx of city.roadsV) if (Math.abs(x - rx) < city.roadW / 2) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) < city.roadW / 2) return true;
  return false;
}

export function hitBuilding(city, x, y, pad) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// Nearest point on the road network to (x, y): traffic and pedestrians use it to stay on streets.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsV) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y: Math.max(0, Math.min(city.height, y)) }; }
  }
  for (const ry of city.roadsH) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x: Math.max(0, Math.min(city.width, x)), y: ry }; }
  }
  return best;
}
