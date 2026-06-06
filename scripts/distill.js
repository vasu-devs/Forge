#!/usr/bin/env node
'use strict';
// Background distiller (spawned by stop-autolearn.js). Reads the session transcript,
// asks a small model (Haiku) to extract ONLY high-quality lessons, runs a strict
// code-side quality gate, and appends survivors to the project + global stores.
// Runs with --bare so the child loads no plugins/hooks (no recursion). Never throws.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const LOG = path.join(L.BASE, 'distiller.log');
function log(m) { try { L.ensureDir(LOG); fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`); } catch {} }

function readTranscript(p, maxMsgs) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  const msgs = [];
  for (const ln of lines) { try { msgs.push(JSON.parse(ln)); } catch {} }
  return msgs.slice(-maxMsgs);
}
function flatten(msgs) {
  const out = [];
  for (const m of msgs) {
    const role = m.role || m.type || '?';
    let c = m.content;
    if (Array.isArray(c)) c = c.map(b => typeof b === 'string' ? b
      : (b.text || (b.type === 'tool_use' ? `[tool ${b.name || ''}]` : b.type === 'tool_result' ? '[tool_result]' : ''))).join(' ');
    c = String(c == null ? '' : c).replace(/\s+/g, ' ').slice(0, 600);
    if (c) out.push(`${role}: ${c}`);
  }
  return out.join('\n').slice(0, 12000);
}

function buildPrompt(convo) {
  return `You are shunya's learning distiller. Read this work session and extract ONLY high-value, durable lessons worth remembering next time. The quality bar is STRICT: a lesson must be correct, specific, evidence-backed, and non-obvious. If nothing clears the bar, return empty arrays — that is the expected, common outcome. NEVER invent generic platitudes like "write clean code" or "follow best practices"; those are rejected.

Return two kinds:
- "project": lessons specific to THIS codebase — its conventions, build/test quirks, domain rules, concrete gotchas.
- "global": ANONYMIZED, transferable behavioral lessons that would help on ANY project. They MUST contain no project, file, path, company, framework-version, or domain names. Best for mistakes and their corrections.

Each lesson is an object: {"trigger":"<the situation>","action":"<what to do>","confidence":<0.3-0.95>,"evidence":"<brief why>"}.
Confidence: 0.8-0.95 only if the user stated it explicitly or it was clearly proven; 0.5-0.7 if observed once; below 0.5 omit entirely.
At most 4 project and 3 global. Fewer and sharper is better.

Output STRICT JSON only, no prose, no code fences: {"project":[...],"global":[...]}

SESSION TRANSCRIPT:
${convo}`;
}

function callModel(prompt) {
  if (process.env.SHUNYA_DISTILL_MOCK) { try { return fs.readFileSync(process.env.SHUNYA_DISTILL_MOCK, 'utf8'); } catch { return null; } }
  const { spawnSync } = require('child_process');
  const model = process.env.SHUNYA_LEARN_MODEL || 'claude-haiku-4-5-20251001';
  // NOTE: do NOT use --bare — it strips authentication ("Not logged in"). Recursion is
  // prevented instead by the SHUNYA_DISTILLER=1 env guard that stop-autolearn.js checks.
  const r = spawnSync('claude', ['-p', '--model', model, '--output-format', 'json'], {
    input: prompt, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
    env: { ...process.env, SHUNYA_DISTILLER: '1' }
  });
  if (r.status !== 0) { log('claude -p failed: status=' + r.status + ' err=' + String(r.stderr || '').slice(0, 300)); return null; }
  return r.stdout;
}

// Pull the lessons JSON out of `claude --output-format json` (which wraps model text in .result).
function extractJson(s) {
  if (!s) return null;
  let text = s;
  try { const outer = JSON.parse(s); if (outer && typeof outer.result === 'string') text = outer.result; } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// --- the quality gate ---
const PLATITUDE = /\b(write clean code|clean code|follow best practices|best practices|be careful|do your best|use good|write good|make sure to test|test thoroughly|be thorough|pay attention|keep it simple|don'?t overcomplicate)\b/i;
function looksIdentifying(s) { return /[\\/]/.test(s) || /\.(ts|tsx|js|jsx|mjs|py|rs|go|java|rb|php|cs|kt|swift|vue|svelte)\b/i.test(s); }
function valid(o, minConf) {
  if (!o || typeof o.trigger !== 'string' || typeof o.action !== 'string') return false;
  if ((Number(o.confidence) || 0) < minConf) return false;
  if (o.trigger.trim().length < 8 || o.action.trim().length < 12) return false;
  if (PLATITUDE.test(o.trigger) || PLATITUDE.test(o.action)) return false;
  return true;
}

function main() {
  const transcript = process.argv[2];
  const cwd = process.argv[3] || process.cwd();
  if (!transcript || !fs.existsSync(transcript)) { log('no transcript at ' + transcript); return; }
  const minConf = parseFloat(process.env.SHUNYA_LEARN_MIN_CONF || '0.6');
  const convo = flatten(readTranscript(transcript, 50));
  if (convo.length < 200) { log('transcript too short; skip'); return; }

  const parsed = extractJson(callModel(buildPrompt(convo)));
  if (!parsed) { log('no parseable lessons JSON'); return; }

  const proj = (Array.isArray(parsed.project) ? parsed.project : []).filter(o => valid(o, minConf)).slice(0, 4);
  const glob = (Array.isArray(parsed.global) ? parsed.global : [])
    .filter(o => valid(o, minConf) && !looksIdentifying(o.trigger) && !looksIdentifying(o.action)).slice(0, 3);

  for (const o of proj) L.appendRecord(L.instinctsFile(cwd), o);
  if (glob.length) { for (const o of glob) L.appendRecord(L.globalFile(), o); L.renderGlobalMd(); }
  log(`distilled: kept ${proj.length} project + ${glob.length} global`);
}
try { main(); } catch (e) { log('error: ' + (e && e.message)); }
process.exit(0);
