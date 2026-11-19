// The story: five jobs from Mara Voss, each with a named target on the map,
// a reward, and a check that runs every frame. Finishing a job pays cash,
// clears a little heat, and opens the next one. The last job ends the story.

import { makeCar } from './entities.js';

const L = (city, key) => city.landmarks[key];

export const MISSIONS = [
  {
    id: 'pickup',
    title: 'JOB 1 — THE PICKUP',
    text: 'Drive to the Marina Pier and collect the package. Any car will do — borrow one.',
    reward: 1200,
    target(city) { return { x: L(city, 'marina').x, y: L(city, 'marina').y, r: 70, label: 'Marina Pier' }; },
    setup(state) { state.toast('Mara: package is waiting at the pier. No fuss, no police.'); },
  },
  {
    id: 'drop',
    title: 'JOB 2 — THE DROP',
    text: 'Take the package to Bay Market downtown. The Gull crew is watching the clock — be quick.',
    reward: 2000,
    target(city) { return { x: L(city, 'market').x, y: L(city, 'market').y, r: 70, label: 'Bay Market' }; },
    setup(state) { state.toast('Mara: market, downtown. Move.'); },
  },
  {
    id: 'steal',
    title: 'JOB 3 — HOT WHEELS',
    text: 'A crimson sports car is parked near Solmar Tower. Steal it and bring it to your garage.',
    reward: 3500,
    target(city) { return { x: L(city, 'garage').x, y: L(city, 'garage').y, r: 80, label: "Rook's Garage" }; },
    setup(state) {
      const c = state.city;
      const sporty = makeCar(L(c, 'tower').x + 60, L(c, 'tower').y + 30, 0, '#d41f2e', 'traffic');
      sporty.sporty = true;
      sporty.cruise = 0;
      state.cars.push(sporty);
      state.missionCar = sporty;
      state.toast('Mara: the red one by the tower. Bring it home in one piece.');
    },
    done(state) {
      return state.player.car === state.missionCar && state.player.car !== null;
    },
  },
  {
    id: 'cashrun',
    title: 'JOB 4 — CASH RUN',
    text: 'Three cash drops are hidden around the city. Grab them all — the crew guarding them will not be friendly.',
    reward: 5000,
    target(city) { return { x: 700, y: 600, r: 60, label: 'Cash drop' }; },
    setup(state) {
      state.drops = [
        { x: 700, y: 600, taken: false },
        { x: 1900, y: 950, taken: false },
        { x: 1100, y: 1650, taken: false },
      ];
      state.enemies.push(
        { x: 700, y: 660, health: 100, aim: 0, cool: 1 },
        { x: 1900, y: 1010, health: 100, aim: 0, cool: 1 },
        { x: 1100, y: 1710, health: 100, aim: 0, cool: 1 },
      );
      state.player.wanted = Math.max(state.player.wanted, 2);
      state.player.lastCrime = state.time;
      state.toast('Mara: three drops, three guards. Keep your head down.');
    },
    done(state) {
      return state.drops && state.drops.every((d) => d.taken);
    },
  },
  {
    id: 'getaway',
    title: 'JOB 5 — THE GETAWAY',
    text: 'The heat is on. Lose the police and reach the Beach Hideout. Finish this and the debt is gone.',
    reward: 8000,
    target(city) { return { x: L(city, 'hideout').x, y: L(city, 'hideout').y, r: 90, label: 'Beach Hideout' }; },
    setup(state) {
      state.player.wanted = 3;
      state.player.lastCrime = state.time;
      state.toast('Mara: they know your face now. Run — and do not stop at the beach.');
    },
  },
];

export function currentMission(state) {
  return MISSIONS[state.missionIndex] || null;
}

export function startMission(state, index) {
  state.missionIndex = index;
  const mission = MISSIONS[index];
  state.missionStage = 'active';
  if (mission && mission.setup) mission.setup(state);
  state.audio.missionDone();
}

export function missionTarget(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  if (mission.id === 'cashrun' && state.drops) {
    const next = state.drops.find((d) => !d.taken);
    if (next) return { x: next.x, y: next.y, r: 60, label: 'Cash drop' };
  }
  return mission.target(state.city);
}

// Returns true when a job was just completed.
export function updateMissions(state) {
  const mission = currentMission(state);
  if (!mission || state.mode !== 'playing') return false;
  const p = state.player;
  // Cash drops are collected on foot or in a car, just by driving over them.
  if (state.drops) {
    for (const d of state.drops) {
      if (!d.taken) {
        const dx = p.x - d.x;
        const dy = p.y - d.y;
        if (dx * dx + dy * dy < 50 * 50) {
          d.taken = true;
          p.cash += 800;
          state.audio.pickup();
          state.toast('Cash drop collected! $800');
        }
      }
    }
  }
  const target = missionTarget(state);
  if (!target) return false;
  const dx = p.x - target.x;
  const dy = p.y - target.y;
  const reached = dx * dx + dy * dy < target.r * target.r;
  const ok = mission.done ? mission.done(state) && reached : reached;
  if (!ok) return false;
  p.cash += mission.reward;
  state.stats.missionsDone += 1;
  state.audio.missionDone();
  state.toast(`Job complete! +$${mission.reward}`);
  if (state.missionIndex + 1 >= MISSIONS.length) {
    state.mode = 'complete';
    state.audio.missionDone();
    return true;
  }
  startMission(state, state.missionIndex + 1);
  return true;
}
