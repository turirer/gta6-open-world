// Save and load through localStorage (this browser only). Only the story
// progress is kept: cash, health, the job you are on, where you stand, and the
// running totals. A save from another version is ignored, never trusted.

const KEY = 'solmar-bay.save.v1';

export function writeSave(state) {
  try {
    const data = {
      version: 1,
      cash: state.player.cash,
      health: state.player.health,
      ammo: state.player.ammo,
      missionIndex: state.missionIndex,
      x: state.player.x,
      y: state.player.y,
      carsStolen: state.stats.carsStolen,
      missionsDone: state.stats.missionsDone,
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(KEY); } catch { /* storage can be off */ }
}
