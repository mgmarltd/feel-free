// Editable Daily Tasks.
//
// The recurring habit list shown on the app Home screen. Defaults live here;
// admin edits are persisted to data/dailyTasks.json (alongside users.json, so
// they survive deploys — deploy.sh excludes data/).
//
// The app fetches the enabled tasks via the public GET /api/daily-tasks and
// keeps per-day completion locally. The admin dashboard lists/edits the full
// set (incl. disabled) via the /api/admin/daily-tasks routes.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join(__dirname, 'data', 'dailyTasks.json');
const MAX_TASKS = 12;
const MAX_TITLE = 80;

// Built-in defaults — mirror the app's original list. Used until an admin
// saves a custom set.
const DEFAULT_TASKS = [
  { id: 'morning-tapping', emoji: '🌅', title_en: 'Morning Tapping', title_tr: 'Sabah Tapping', enabled: true },
  { id: 'gratitude-checkin', emoji: '🙏', title_en: 'Gratitude Check-in', title_tr: 'Şükür Anı', enabled: true },
  { id: 'evening-winddown', emoji: '🌙', title_en: 'Evening Wind Down', title_tr: 'Akşam Sakinleşme', enabled: true },
];

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Returns the persisted object ({ tasks, updatedAt }) or null if none/invalid.
function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return Array.isArray(parsed?.tasks) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function slugify(s) {
  const base = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (ş→s, ğ→g, …)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `task-${crypto.randomBytes(3).toString('hex')}`;
}

function normalizeTask(t, usedIds) {
  const emoji = typeof t.emoji === 'string' ? t.emoji.trim().slice(0, 8) : '';
  const title_en = String(t.title_en || '').trim().slice(0, MAX_TITLE);
  const title_tr = String(t.title_tr || '').trim().slice(0, MAX_TITLE);

  let id = typeof t.id === 'string' && t.id.trim() ? slugify(t.id) : slugify(title_en || title_tr);
  const base = id;
  let n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);

  return { id, emoji, title_en, title_tr, enabled: t.enabled !== false };
}

// Effective list. includeDisabled: app sends false (only live tasks), admin
// sends true (full set for editing).
function getTasks({ includeDisabled = false } = {}) {
  const data = load();
  const tasks = data?.tasks || DEFAULT_TASKS;
  return includeDisabled ? tasks.map((t) => ({ ...t })) : tasks.filter((t) => t.enabled !== false);
}

// Full editor view for the dashboard.
function getAdminView() {
  const data = load();
  return {
    tasks: data?.tasks ? data.tasks.map((t) => ({ ...t })) : DEFAULT_TASKS.map((t) => ({ ...t })),
    defaults: DEFAULT_TASKS.map((t) => ({ ...t })),
    isCustomized: !!data,
    updatedAt: data?.updatedAt || null,
  };
}

// Replace the whole list. Returns { tasks } on success or { error }.
function setTasks(rawTasks, isoTime) {
  if (!Array.isArray(rawTasks)) return { error: 'Expected an array of tasks' };
  if (rawTasks.length > MAX_TASKS) return { error: `Too many tasks (max ${MAX_TASKS})` };

  const usedIds = new Set();
  const tasks = [];
  for (const t of rawTasks) {
    if (!t || typeof t !== 'object') continue;
    const norm = normalizeTask(t, usedIds);
    if (!norm.title_en && !norm.title_tr) {
      return { error: 'Each task needs at least an English or Turkish title' };
    }
    tasks.push(norm);
  }
  if (!tasks.length) return { error: 'At least one task is required' };

  save({ tasks, updatedAt: isoTime || null });
  return { tasks };
}

// Drop the override → revert to built-in defaults.
function reset() {
  try {
    if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_TASKS.map((t) => ({ ...t }));
}

module.exports = { getTasks, getAdminView, setTasks, reset, DEFAULT_TASKS };
