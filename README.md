# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/turirer/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/turirer/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for [make.fun](https://make.fun/bounty/gta6-01)'s **gta6-01** bounty ("Make GTA 6").
Referral: https://make.fun/r/d6btpjsv
Top-down, single-file-free: plain static files under `game/`, no build step, no
network request. Open `game/index.html` in a desktop browser (or run
`node serve.ts` and open http://localhost:8080).

## The game

You are **Rook**, new in Solmar Bay with a $40,000 debt to the Gull syndicate.
**Mara Voss** hands you five jobs — a pickup at the Marina Pier, a drop at Bay
Market, a stolen sports car, a three-stop cash run guarded by rival crew, and a
final getaway to the Beach Hideout. Finish all five and the debt is gone.

- A city to explore on foot and by car: streets, traffic, pedestrians, a park,
  a beach and the marina.
- Steal any car with **E** (traffic cars and parked cars), drive with **WASD**,
  aim and shoot with the **mouse**.
- A wanted level (0–5 stars): the Bay City Police chase and ram you, and arrest
  you on foot if they catch you. Stay clean and out of sight and the heat cools.
- HUD with cash, health, wanted stars, the current job and a live minimap.
- Pause with **P**, save with the pause menu (localStorage), mute with **M**.
- Sound is synthesized with the Web Audio API — no audio files.

## Files

- `game/index.html`, `game/style.css` — the page and the HUD.
- `game/src/main.js` — boot, the fixed-step loop, screens, entering cars, shooting.
- `game/src/city.js` — the street grid, buildings, beach, marina and park.
- `game/src/entities.js` — the player, traffic, pedestrians, police, rivals, bullets.
- `game/src/missions.js` — the five-job story.
- `game/src/render.js` — drawing the world, the minimap and the HUD.
- `game/src/input.js`, `game/src/audio.js`, `game/src/save.js` — input, synth sound, saves.
- `game/src/shots.js` — the staged screenshot scenes (`?shot=cover|drive|chase|mission|title`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d6btpjsv&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
