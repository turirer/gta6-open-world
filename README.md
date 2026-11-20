# Solmar Bay — An Original Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/turirer/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/turirer/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for the [make.fun](https://make.fun/bounty/gta6-01) bounty **gta6-01** ("Make GTA 6").
Referral: https://make.fun/r/d6btpjsv

Solmar Bay is a top-down open-world crime game made from scratch — no
Rockstar assets, no libraries, no network calls. Everything is plain static
files under `game/`, so there is nothing to build: open `game/index.html` in a
desktop browser, or run `node serve.ts` and visit http://localhost:8080.

## Story

You play **Rook**, freshly arrived in Solmar Bay and already $40,000 in debt
to the Gull syndicate. **Mara Voss** offers you a way out: five jobs, and the
debt is wiped clean. The work takes you from a pickup at the Marina Pier to a
drop at Bay Market, a stolen sports car, a three-stop cash run watched by a
rival crew, and a final getaway to the Beach Hideout.

## What is in the game

- A living city: drive and walk through streets full of traffic and
  pedestrians, past a park, a beach and the marina.
- Steal any car — traffic or parked — with **E**. Drive with **WASD**, aim and
  fire with the **mouse**.
- A police wanted level from **0 to 5 stars**. The Bay City Police chase and
  ram your car, and arrest you on foot if they catch you. Lie low and the heat
  fades.
- A HUD showing cash, health, wanted stars and the current job, plus a live
  minimap that follows you.
- Pause with **P**, save from the pause menu (progress lives in
  localStorage), mute with **M**.
- All sound is synthesized live with the Web Audio API — there are no audio
  files in the repo.

## Layout

- `game/index.html`, `game/style.css` — the page and the HUD styling.
- `game/src/main.js` — boot, fixed-step game loop, screens, entering cars,
  shooting.
- `game/src/city.js` — street grid, buildings, beach, marina, park.
- `game/src/entities.js` — player, traffic, pedestrians, police, rival crew,
  bullets.
- `game/src/missions.js` — the five-job story arc.
- `game/src/render.js` — world drawing, minimap and HUD.
- `game/src/input.js`, `game/src/audio.js`, `game/src/save.js` — keyboard and
  mouse input, synthesized sound, saving.
- `game/src/shots.js` — staged screenshot scenes
  (`?shot=cover|drive|chase|mission|title`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local play.
- `screenshots/` — four real gameplay screenshots.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d6btpjsv&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
