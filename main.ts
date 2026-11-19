// Solmar Bay — a gta6-01 entry, Node 22, standard library only.
//
// The game is the game/ folder beside this file: plain static files that a
// desktop browser loads offline (index.html plus its ES modules, no library,
// no network request). This program hands it in: it copies game/ and
// screenshots/ into /output and writes /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library in vendor/makefun-game.ts.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps from reference/gate.json. text_max_bytes shapes the
// dossier's text; the other limits refuse an entry the scorer would refuse:
// more than 4 screenshots, one over 256 KiB, more than 993 files or 48 MiB
// under game/, or a path under game/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
