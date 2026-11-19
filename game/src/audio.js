// All sound is synthesized with the Web Audio API — no audio files, no network.
// Short blips for shots and pickups, a two-tone siren while the police are after
// you, and a little jingle when a job is done.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let sirenTimer = 0;
  let sirenHigh = false;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { blip(900, 0.09, 'square', 0.07, 180); },
    hit() { blip(160, 0.15, 'sawtooth', 0.09, 60); },
    pickup() { blip(660, 0.1, 'sine', 0.09); setTimeout(() => blip(990, 0.14, 'sine', 0.09), 90); },
    crash() { blip(120, 0.25, 'sawtooth', 0.1, 40); },
    steal() { blip(440, 0.08, 'square', 0.07); setTimeout(() => blip(550, 0.08, 'square', 0.07), 80); },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'sine', 0.09), i * 110));
    },
    busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'triangle', 0.09), i * 160)); },
    // Called every frame while playing; wails while the wanted level is up.
    update(dt, wanted) {
      if (muted || wanted === 0) return;
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 0.45;
        sirenHigh = !sirenHigh;
        blip(sirenHigh ? 750 : 520, 0.4, 'sine', 0.03);
      }
    },
  };
}
