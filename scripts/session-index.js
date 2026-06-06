#!/usr/bin/env node
'use strict';
// SessionEnd hook: when a session ends, index its transcript into shunya memory in the
// BACKGROUND (detached) so cross-session memory stays fresh hands-free. No-ops silently
// unless the memory subsystem's deps are installed (npm install in shunya/memory/).
// Never blocks the user; always exits 0. Disable with SHUNYA_AUTOINDEX=off.
const fs = require('fs');
const path = require('path');
function main() {
  if (process.env.SHUNYA_DISTILLER === '1') return;                         // inside a shunya background child
  if ((process.env.SHUNYA_AUTOINDEX || 'on').toLowerCase() === 'off') return;
  let raw = ''; try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  let d = {}; try { d = JSON.parse(raw || '{}'); } catch { return; }
  const transcript = d.transcript_path;
  if (!transcript || !fs.existsSync(transcript)) return;
  const memDir = path.join(__dirname, '..', 'memory');
  // memory subsystem must be installed; otherwise stay silent (feature is opt-in)
  if (!fs.existsSync(path.join(memDir, 'node_modules', '@huggingface'))) return;
  const { spawn } = require('child_process');
  const child = spawn(process.execPath, [path.join(memDir, 'shunya-mem.mjs'), 'autoindex', '--session', transcript], {
    detached: true, stdio: 'ignore', windowsHide: true,
    env: { ...process.env, SHUNYA_DISTILLER: '1' }
  });
  child.unref();
}
try { main(); } catch { /* swallow */ }
process.exit(0);
