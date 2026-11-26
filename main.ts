// Merapi Ridge Run — the hand-in program (Node 22, standard library only).
//
// The game lives in game/ beside this file: plain static files that any
// desktop browser opens offline (game/index.html plus its ES modules, no
// library, no network request). This program hands the game in: it copies
// game/ and screenshots/ into the output directory and writes
// dossier.json there, using the vendored make.fun library to build it.
//
// The grader runs this program twice in a fresh container with /output
// writable; outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The dossier must come out byte-identical on both runs, so this program
// does nothing time-dependent: it copies files and lets buildDossier
// summarise them.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Directory this file sits in: the repository root.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Where the handed-in entry goes: the grader's /output, or the override
// a developer sets when running the program by hand.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps come from the competition's gate: game/ may hold at most 993
// files and directories and 48 MiB, screenshots/ at most 4 files of at
// most 256 KiB each, and the dossier's text at most 160 KiB. Passing them
// here makes the program fail locally exactly where the scorer would
// refuse the entry, instead of handing in something invalid.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });

  // The playable game, whole.
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

  // The screenshots, when the repository holds any.
  const shotsDir = join(repoRoot, 'screenshots');
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  }

  // The judge's summary of the game and its screenshots.
  const dossier = buildDossier(outputDir, dossierCaps);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
