#!/usr/bin/env node
'use strict';
// Stop hook: fires when the agent finishes a turn. Two cheap, detached, fail-open jobs:
//   1. forge:graph  — patch the live code map (only reparses changed files; FORGE_GRAPH=off disables).
//   2. forge:learn  — throttled: once enough new work has accumulated, spawn the background distiller.
// Both run DETACHED so they never block the user. Disable learning with FORGE_AUTOLEARN=off.
const fs = require('fs');
function main() {
  if (process.env.FORGE_DISTILLER === '1') return;                         // we're inside a forge background child
  let raw = ''; try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  let d = {}; try { d = JSON.parse(raw || '{}'); } catch { return; }
  if (d.stop_hook_active === true) return;                                 // avoid continuation loops
  const transcript = d.transcript_path;
  const cwd = d.cwd || process.cwd();
  const path = require('path');
  const { spawn } = require('child_process');

  // 1. Keep the live code map fresh as work happens (cheap: mtime-diff, only changed files reparsed).
  if ((process.env.FORGE_GRAPH || 'on').toLowerCase() !== 'off') {
    try {
      spawn(process.execPath, [path.join(__dirname, 'graph.js'), 'update', cwd],
        { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } catch { /* fail-open */ }
  }

  // 2. Auto-learn distiller (throttled).
  if ((process.env.FORGE_AUTOLEARN || 'on').toLowerCase() === 'off') return;
  if (!transcript || !fs.existsSync(transcript)) return;
  const L = require('./lib.js');
  const every = parseInt(process.env.FORGE_LEARN_EVERY || '8', 10);
  const obs = L.countLines(L.obsFile(cwd));
  const st = L.readJson(L.stateFile(cwd));
  const last = Number(st.lastObs || 0);
  if (obs - last < every) return;                                          // not enough new work yet

  // Mark BEFORE spawning so a rapid second Stop doesn't double-fire.
  L.writeJson(L.stateFile(cwd), { lastObs: obs, lastDistillTs: new Date().toISOString() });

  if (process.env.FORGE_DISTILL_DRYRUN === '1') {
    console.error(`[forge autolearn] would distill (obs=${obs}, delta=${obs - last}, every=${every})`);
    return;
  }
  spawn(process.execPath, [path.join(__dirname, 'distill.js'), transcript, cwd],
    { detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, FORGE_DISTILLER: '1' } }).unref();
}
try { main(); } catch { /* swallow */ }
process.exit(0);
