// Notification automations.
//
// Each automation is a scheduled localized push: fires at a local time on
// chosen weekdays and broadcasts to all push subscriptions. The scheduler
// (scheduler.js) evaluates these every minute. Persisted to
// data/automations.json (survives deploys — deploy.sh excludes data/).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join(__dirname, 'data', 'automations.json');
const MAX = 50;
const MAX_SHORT = 200;
const DEFAULT_TZ = 'Europe/Istanbul';

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2));
}

const str = (v, max, fallback = '') => {
  const s = String(v == null ? '' : v).trim();
  return (s || fallback).slice(0, max);
};

// "9:5" → "09:05"; invalid → "09:00".
function normTime(v) {
  const m = String(v || '').match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return '09:00';
  let h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  let min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function normDays(v) {
  if (!Array.isArray(v)) return [];
  const set = new Set();
  for (const d of v) {
    const n = parseInt(d, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 6) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

// Normalize the editable fields from an admin payload.
// type: 'custom' (fixed body) | 'affirmation' (body picked from the library at
// send time). topic: optional issue filter for affirmation type.
function normalizeInput(input = {}) {
  return {
    type: input.type === 'affirmation' ? 'affirmation' : 'custom',
    name: str(input.name, MAX_SHORT, 'Untitled automation'),
    enabled: input.enabled !== false,
    title_en: str(input.title_en, MAX_SHORT),
    title_tr: str(input.title_tr, MAX_SHORT),
    body_en: str(input.body_en, 500),
    body_tr: str(input.body_tr, 500),
    topic: str(input.topic, MAX_SHORT),
    time: normTime(input.time),
    days: normDays(input.days),
    timezone: str(input.timezone, 64, DEFAULT_TZ),
  };
}

function validate(n) {
  if (!n.title_en && !n.title_tr) return 'Needs a title in at least one language';
  // Affirmation notifications generate their body from the library at send time.
  if (n.type !== 'affirmation' && !n.body_en && !n.body_tr) {
    return 'Needs a body in at least one language';
  }
  return null;
}

function list() {
  return load();
}

function get(id) {
  return load().find((a) => a.id === id) || null;
}

function create(input, isoTime) {
  const list = load();
  if (list.length >= MAX) return { error: `Too many automations (max ${MAX})` };
  const n = normalizeInput(input);
  const err = validate(n);
  if (err) return { error: err };
  const automation = {
    id: 'auto_' + crypto.randomBytes(6).toString('hex'),
    ...n,
    lastSentDate: null,
    lastRunAt: null,
    createdAt: isoTime || null,
  };
  list.push(automation);
  save(list);
  return { automation };
}

function update(id, input, isoTime) {
  const list = load();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return { error: 'Not found' };
  const n = normalizeInput(input);
  const err = validate(n);
  if (err) return { error: err };
  // Preserve runtime fields (lastSentDate/lastRunAt/createdAt/id).
  list[idx] = { ...list[idx], ...n, updatedAt: isoTime || null };
  save(list);
  return { automation: list[idx] };
}

function remove(id) {
  const list = load();
  const next = list.filter((a) => a.id !== id);
  if (next.length === list.length) return false;
  save(next);
  return true;
}

// Scheduler-only: record that an automation fired (guards against re-send).
function markSent(id, dateStr, isoTime) {
  const list = load();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return;
  list[idx].lastSentDate = dateStr;
  list[idx].lastRunAt = isoTime || null;
  save(list);
}

module.exports = { list, get, create, update, remove, markSent, DEFAULT_TZ };
