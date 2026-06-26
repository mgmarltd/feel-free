// Editable Quick Sessions (modes).
//
// Quick sessions are the focused tapping themes behind the app Home screen's
// featured card + "Quick Sessions" row. Each mode carries display info (emoji,
// color, duration, labels) AND its prompt shaping (focus line, extra
// instructions, opening message, affirmation keywords).
//
// Defaults live here; admin edits persist to data/quickSessions.json (survives
// deploys — deploy.sh excludes data/). The app fetches enabled modes via the
// public GET /api/quick-sessions; eftPrompt.js resolves a mode by id to build
// the focused session prompt.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join(__dirname, 'data', 'quickSessions.json');
const MAX_MODES = 24;
const MAX_SHORT = 120; // labels, durations, focus
const MAX_LONG = 4000; // instructions, first message, description

// Built-in defaults. `featured` modes render as the big card; the rest fill the
// horizontal quick row.
const DEFAULT_MODES = [
  {
    id: 'release',
    emoji: '🍃',
    color: 'rgba(139,92,246,0.2)',
    duration: '8 min',
    featured: true,
    enabled: true,
    label_en: 'Release & Let Go',
    label_tr: 'Bırak ve Salıver',
    description_en: "A guided tapping session to release what's weighing you down.",
    description_tr: 'Seni ağırlaştıran ne varsa bırakman için rehberli bir tapping seansı.',
    focus_en: 'releasing whatever feels heavy right now and letting it flow out of the body',
    focus_tr: 'şu an ağır gelen ne varsa onu bırakmak ve bedenden akıp gitmesine izin vermek',
    instructions_en: '',
    instructions_tr: '',
    firstMessage_en: '',
    firstMessage_tr: '',
    issues: ['stress', 'overwhelm', 'sadness', 'kaygı', 'stres'],
  },
  {
    id: 'stress-relief',
    emoji: '🧘',
    color: 'rgba(139,92,246,0.2)',
    duration: '5 min',
    featured: false,
    enabled: true,
    label_en: 'Stress Relief',
    label_tr: 'Stres Rahatlama',
    description_en: '',
    description_tr: '',
    focus_en: 'easing the built-up stress and pressure sitting in the body',
    focus_tr: 'bedende biriken stresi ve baskıyı hafifletmek',
    instructions_en: '',
    instructions_tr: '',
    firstMessage_en: '',
    firstMessage_tr: '',
    issues: ['stress', 'overwhelm', 'pressure', 'stres', 'baskı'],
  },
  {
    id: 'anxiety-calm',
    emoji: '🌊',
    color: 'rgba(59,130,246,0.2)',
    duration: '7 min',
    featured: false,
    enabled: true,
    label_en: 'Anxiety Calm',
    label_tr: 'Kaygıyı Yatıştır',
    description_en: '',
    description_tr: '',
    focus_en: 'calming anxious, racing energy and coming back to a sense of safety',
    focus_tr: 'kaygılı, hızlanan enerjiyi yatıştırmak ve güven hissine geri dönmek',
    instructions_en: '',
    instructions_tr: '',
    firstMessage_en: '',
    firstMessage_tr: '',
    issues: ['anxiety', 'worry', 'panic', 'kaygı', 'panik'],
  },
  {
    id: 'morning-energy',
    emoji: '☀️',
    color: 'rgba(245,158,11,0.2)',
    duration: '5 min',
    featured: false,
    enabled: true,
    label_en: 'Morning Energy',
    label_tr: 'Sabah Enerjisi',
    description_en: '',
    description_tr: '',
    focus_en: 'clearing morning heaviness and inviting fresh, motivated energy for the day',
    focus_tr: 'sabah ağırlığını dağıtmak ve güne taze, motive bir enerji davet etmek',
    instructions_en: '',
    instructions_tr: '',
    firstMessage_en: '',
    firstMessage_tr: '',
    issues: ['motivation', 'tired', 'sadness', 'isteksizlik', 'yorgun'],
  },
  {
    id: 'better-sleep',
    emoji: '🌙',
    color: 'rgba(99,102,241,0.2)',
    duration: '10 min',
    featured: false,
    enabled: true,
    label_en: 'Better Sleep',
    label_tr: 'Daha İyi Uyku',
    description_en: '',
    description_tr: '',
    focus_en: 'releasing the tension that keeps the mind awake so the body can rest',
    focus_tr: 'zihni uyanık tutan gerginliği bırakıp bedenin dinlenmesine izin vermek',
    instructions_en: '',
    instructions_tr: '',
    firstMessage_en: '',
    firstMessage_tr: '',
    issues: ['sleep', 'insomnia', 'tired', 'uyku', 'gerginlik'],
  },
];

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return Array.isArray(parsed?.modes) ? parsed : null;
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
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `mode-${crypto.randomBytes(3).toString('hex')}`;
}

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function normalizeIssues(v) {
  let arr = v;
  if (typeof v === 'string') arr = v.split(','); // accept comma-separated
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeMode(m, usedIds) {
  const label_en = str(m.label_en, MAX_SHORT);
  const label_tr = str(m.label_tr, MAX_SHORT);

  let id = m.id && String(m.id).trim() ? slugify(m.id) : slugify(label_en || label_tr);
  const base = id;
  let n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);

  return {
    id,
    emoji: str(m.emoji, 8),
    color: str(m.color, 40) || 'rgba(139,92,246,0.2)',
    duration: str(m.duration, MAX_SHORT),
    featured: m.featured === true,
    enabled: m.enabled !== false,
    label_en,
    label_tr,
    description_en: str(m.description_en, MAX_LONG),
    description_tr: str(m.description_tr, MAX_LONG),
    focus_en: str(m.focus_en, MAX_LONG),
    focus_tr: str(m.focus_tr, MAX_LONG),
    instructions_en: str(m.instructions_en, MAX_LONG),
    instructions_tr: str(m.instructions_tr, MAX_LONG),
    firstMessage_en: str(m.firstMessage_en, MAX_LONG),
    firstMessage_tr: str(m.firstMessage_tr, MAX_LONG),
    issues: normalizeIssues(m.issues),
  };
}

// Effective list. App passes includeDisabled:false; admin passes true.
function getModes({ includeDisabled = false } = {}) {
  const data = load();
  const modes = data?.modes || DEFAULT_MODES;
  return (includeDisabled ? modes : modes.filter((m) => m.enabled !== false)).map((m) => ({ ...m }));
}

// Resolve a single mode by id (used by eftPrompt to build the prompt). Looks at
// the full saved set (incl. disabled) so a session already in flight still
// works if an admin disables the mode mid-session.
function resolveMode(id) {
  if (!id) return null;
  const key = String(id).toLowerCase();
  const data = load();
  const modes = data?.modes || DEFAULT_MODES;
  return modes.find((m) => m.id === key) || null;
}

function getAdminView() {
  const data = load();
  return {
    modes: data?.modes ? data.modes.map((m) => ({ ...m })) : DEFAULT_MODES.map((m) => ({ ...m })),
    defaults: DEFAULT_MODES.map((m) => ({ ...m })),
    isCustomized: !!data,
    updatedAt: data?.updatedAt || null,
  };
}

// Replace the whole list. Returns { modes } or { error }.
function setModes(rawModes, isoTime) {
  if (!Array.isArray(rawModes)) return { error: 'Expected an array of modes' };
  if (rawModes.length > MAX_MODES) return { error: `Too many modes (max ${MAX_MODES})` };

  const usedIds = new Set();
  const modes = [];
  for (const m of rawModes) {
    if (!m || typeof m !== 'object') continue;
    const norm = normalizeMode(m, usedIds);
    if (!norm.label_en && !norm.label_tr) {
      return { error: 'Each mode needs an English or Turkish title' };
    }
    if (!norm.focus_en && !norm.focus_tr) {
      return { error: `Mode "${norm.label_en || norm.label_tr}" needs a focus line in at least one language` };
    }
    modes.push(norm);
  }
  if (!modes.length) return { error: 'At least one mode is required' };

  save({ modes, updatedAt: isoTime || null });
  return { modes };
}

function reset() {
  try {
    if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_MODES.map((m) => ({ ...m }));
}

module.exports = { getModes, resolveMode, getAdminView, setModes, reset, DEFAULT_MODES };
