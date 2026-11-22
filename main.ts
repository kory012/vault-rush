// VAULT RUSH — hand-in program for the make.fun "best card game" bounty (Node 22, standard
// library only). The game itself is the static site in this directory's game/ folder:
// game/index.html plus its ES modules, with no build step and no network requests, so the
// grader (or any static file server) can open it offline in a desktop browser.
//
// What running this file does, in order:
//   1. Copies game/ and screenshots/ from beside this file into the output directory
//      (/output inside the grader's container; set MAKEFUN_OUTPUT_DIR to redirect it,
//      which is what a local dry run does).
//   2. Writes <output>/dossier.json via buildDossier from the vendored make.fun library
//      (./vendor/makefun-game.ts, shipped unchanged) — that JSON is the summary the judge
//      reads alongside the screenshots.
//   3. Prints a short report of what actually landed in the output: file counts and byte
//      totals for game/, screenshots/ and dossier.json, so a bad or partial copy is
//      obvious at a glance instead of surfacing later as a scorer refusal.
//
// Extra: pass --verify to self-check the hand-in right after writing it. It confirms that
// dossier.json exists and is non-empty and that game/index.html was copied, prints one
// PASS/FAIL line per check, and exits non-zero when anything fails — handy in a shell
// pipeline before submitting.
//
// Local dry run:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --verify
// Play the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The dossier caps mirror the scorer's gate (reference/gate.json). Only text_max_bytes
// changes the bytes buildDossier emits; the rest are tripwires that refuse an entry the
// scorer would refuse anyway: more than 4 screenshots or a single one over 256 KiB, more
// than 993 files or 48 MiB in total under game/, or any one game/ path over 1000 bytes.
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

// --- Output report -----------------------------------------------------------

// Recursively total the files and bytes under one directory. A missing directory counts
// as zero of both, so the report can describe a partial hand-in instead of crashing on it.
function measureTree(dir: string): { files: number; bytes: number } {
  if (!existsSync(dir)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = measureTree(full);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

// Print one line per top-level section of the output (game/, screenshots/, dossier.json)
// with its file count and byte total, then a combined total line.
function reportOutput(outDir: string): void {
  const sections: Array<{ label: string; files: number; bytes: number }> = [];
  for (const name of ['game', 'screenshots']) {
    const totals = measureTree(join(outDir, name));
    sections.push({ label: `${name}/`, files: totals.files, bytes: totals.bytes });
  }
  const dossierPath = join(outDir, 'dossier.json');
  const dossierPresent = existsSync(dossierPath);
  sections.push({
    label: 'dossier.json',
    files: dossierPresent ? 1 : 0,
    bytes: dossierPresent ? statSync(dossierPath).size : 0,
  });

  console.log(`VAULT RUSH hand-in written to ${outDir}:`);
  let allFiles = 0;
  let allBytes = 0;
  for (const section of sections) {
    allFiles += section.files;
    allBytes += section.bytes;
    console.log(`  ${section.label.padEnd(14)} ${section.files} file(s), ${section.bytes} byte(s)`);
  }
  console.log(`  ${'total'.padEnd(14)} ${allFiles} file(s), ${allBytes} byte(s)`);
}

// --- Optional --verify self-check --------------------------------------------

// With --verify, sanity-check the two artifacts the gate cannot do without: a non-empty
// dossier.json and the game's entry page. Returns true only when every check passes.
function verifyOutput(outDir: string): boolean {
  const dossierPath = join(outDir, 'dossier.json');
  const checks: Array<{ label: string; ok: boolean }> = [
    {
      label: 'dossier.json exists and is non-empty',
      ok: existsSync(dossierPath) && statSync(dossierPath).size > 0,
    },
    {
      label: 'game/index.html was copied',
      ok: existsSync(join(outDir, 'game', 'index.html')),
    },
  ];
  let allOk = true;
  for (const check of checks) {
    console.log(`  ${check.ok ? 'PASS' : 'FAIL'}  ${check.label}`);
    if (!check.ok) allOk = false;
  }
  return allOk;
}

reportOutput(out);

if (process.argv.includes('--verify')) {
  console.log('Verifying hand-in:');
  if (!verifyOutput(out)) {
    console.error('Verification failed: the hand-in is incomplete.');
    process.exit(1);
  }
}
