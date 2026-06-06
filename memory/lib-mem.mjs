// forge memory engine — shared helpers (ESM, because the embedder is ESM).
// Local-only semantic memory: facts/preferences/decisions + a chat catalog with
// source-session references so the user can `claude --resume <id>` and go deeper.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

export const BASE = process.env.FORGE_DATA_DIR || path.join(os.homedir(), '.claude', 'forge-data');
export const MEMDIR = path.join(BASE, 'memory');
export const memoriesFile = () => path.join(MEMDIR, 'memories.jsonl');
export const chatsFile = () => path.join(MEMDIR, 'chats.jsonl');
export const profileFile = () => path.join(MEMDIR, 'profile.md');
export const stateFile = () => path.join(MEMDIR, 'indexed.json');
export const projectsRoot = () => path.join(os.homedir(), '.claude', 'projects');

export function ensureDir(f) { fs.mkdirSync(path.dirname(f), { recursive: true }); }
export function readJsonl(f) {
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
export function appendJsonl(f, obj) { ensureDir(f); fs.appendFileSync(f, JSON.stringify(obj) + '\n'); }
export function writeJsonl(f, arr) { ensureDir(f); fs.writeFileSync(f, arr.map(o => JSON.stringify(o)).join('\n') + (arr.length ? '\n' : '')); }
export function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } }
export function writeJson(f, o) { ensureDir(f); fs.writeFileSync(f, JSON.stringify(o)); }

export function cosine(a, b) {
  if (!a || !b || !a.length || a.length !== b.length) return 0;
  let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d; // vectors are L2-normalized at embed time → dot product == cosine
}

// --- local embeddings (lazy-loaded ONNX model) ---
let _embedder = null;
export async function getEmbedder() {
  if (_embedder) return _embedder;
  const { pipeline } = await import('@huggingface/transformers');
  _embedder = await pipeline('feature-extraction', process.env.FORGE_EMBED_MODEL || 'Xenova/all-MiniLM-L6-v2');
  return _embedder;
}
export async function embed(text) {
  const ex = await getEmbedder();
  const out = await ex(String(text || '').slice(0, 2000), { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

// --- Generative-Agents-style retrieval scoring (recency + importance + relevance) ---
export function recencyScore(iso, now) {
  const days = Math.max(0, (now - new Date(iso).getTime()) / 86400000);
  return Math.pow(0.97, days); // gentle daily decay
}
export function scoreMemory(m, qvec, now) {
  const rel = qvec ? (cosine(m.embedding || [], qvec) + 1) / 2 : 0.5; // [-1,1] -> [0,1]
  const rec = recencyScore(m.lastAccessed || m.created, now);
  const imp = Math.min(1, (Number(m.importance) || 5) / 10);
  return { score: rel * 1.0 + rec * 0.5 + imp * 0.5, rel, rec, imp };
}

// --- transcript flattening (defensive against schema variation) ---
export function flattenTranscript(file, maxMsgs = 140, maxChars = 16000) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const msgs = [];
  for (const ln of lines) { try { msgs.push(JSON.parse(ln)); } catch {} }
  const out = [];
  for (const m of msgs.slice(-maxMsgs)) {
    const role = m.role || (m.message && m.message.role) || m.type || '';
    let c = (m.message && m.message.content) ?? m.content ?? m.text ?? '';
    if (Array.isArray(c)) c = c.map(b => typeof b === 'string' ? b
      : (b.text || (b.type === 'tool_use' ? `[tool ${b.name || ''}]` : b.type === 'tool_result' ? '[result]' : ''))).join(' ');
    c = String(c == null ? '' : c).replace(/\s+/g, ' ').trim();
    if (c && (role === 'user' || role === 'assistant')) out.push(`${role}: ${c.slice(0, 800)}`);
  }
  return out.join('\n').slice(-maxChars);
}

// --- call Claude headless for extraction/summarization; returns parsed JSON or null ---
export function claudeJSON(prompt, model) {
  const r = spawnSync('claude', ['-p', '--model', model || process.env.FORGE_LEARN_MODEL || 'claude-sonnet-4-6', '--output-format', 'json'], {
    input: prompt, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === 'win32', env: { ...process.env, FORGE_DISTILLER: '1' }
  });
  if (r.status !== 0) return null;
  let text = r.stdout;
  try { const o = JSON.parse(r.stdout); if (o && typeof o.result === 'string') text = o.result; } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
