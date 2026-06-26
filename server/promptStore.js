// Editable LLM prompts.
//
// The canonical default prompt texts live as constants in eftPrompt.js and
// elevenlabs.js. This store holds optional *overrides* in data/prompts.json
// (alongside users.json, so they survive deploys — deploy.sh excludes data/).
//
// Consumers call get(key) to read the effective value (override or default).
// The admin dashboard lists/edits them via the registry below.
//
// Defaults are pulled lazily (require inside the getter) to avoid a circular
// dependency: eftPrompt/elevenlabs require this module at load time.

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'prompts.json');
const MAX_LEN = 24000;

// Registry of editable prompts. `getDefault` lazily resolves the canonical
// constant so we never duplicate the (large) prompt text.
const REGISTRY = [
  {
    key: 'eft_system_en',
    label: 'EFT session — system prompt (English)',
    description: 'Core instructions for the live EFT tapping voice guide, English sessions.',
    lang: 'en',
    group: 'EFT Session',
    getDefault: () => require('./eftPrompt').EFT_SYSTEM_PROMPT_EN,
  },
  {
    key: 'eft_system_tr',
    label: 'EFT session — system prompt (Turkish)',
    description: 'Core instructions for the live EFT tapping voice guide, Turkish sessions.',
    lang: 'tr',
    group: 'EFT Session',
    getDefault: () => require('./eftPrompt').EFT_SYSTEM_PROMPT,
  },
  {
    key: 'eft_greeting_en',
    label: 'EFT session — first message, new user (English)',
    description: 'Opening line when a first-time user with no name starts an English session.',
    lang: 'en',
    group: 'EFT Session',
    getDefault: () => require('./eftPrompt').EFT_GREETING_EN,
  },
  {
    key: 'eft_greeting_tr',
    label: 'EFT session — first message, new user (Turkish)',
    description: 'Opening line when a first-time user with no name starts a Turkish session.',
    lang: 'tr',
    group: 'EFT Session',
    getDefault: () => require('./eftPrompt').EFT_GREETING_TR,
  },
  {
    key: 'analysis_prompt',
    label: 'Self-analysis — system prompt',
    description: 'Instructions for the short onboarding intake conversation that names the user\'s main concern.',
    lang: 'both',
    group: 'Self-analysis (intake)',
    getDefault: () => require('./elevenlabs').ANALYSIS_PROMPT,
  },
  {
    key: 'analysis_first_en',
    label: 'Self-analysis — first message (English)',
    description: 'Opening question for the English onboarding intake.',
    lang: 'en',
    group: 'Self-analysis (intake)',
    getDefault: () => require('./elevenlabs').ANALYSIS_FIRST_MESSAGE_EN,
  },
  {
    key: 'analysis_first_tr',
    label: 'Self-analysis — first message (Turkish)',
    description: 'Opening question for the Turkish onboarding intake.',
    lang: 'tr',
    group: 'Self-analysis (intake)',
    getDefault: () => require('./elevenlabs').ANALYSIS_FIRST_MESSAGE_TR,
  },
];

const BY_KEY = new Map(REGISTRY.map((r) => [r.key, r]));

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadOverrides() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveOverrides(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function isKnown(key) {
  return BY_KEY.has(key);
}

// Effective value: override if present and non-empty, else the canonical default.
function get(key) {
  const entry = BY_KEY.get(key);
  if (!entry) return null;
  const overrides = loadOverrides();
  const ov = overrides[key];
  if (typeof ov === 'string' && ov.trim().length > 0) return ov;
  return entry.getDefault();
}

// Full listing for the dashboard.
function getAll() {
  const overrides = loadOverrides();
  return REGISTRY.map((r) => {
    const def = r.getDefault();
    const ov = overrides[r.key];
    const isOverridden = typeof ov === 'string' && ov.trim().length > 0;
    return {
      key: r.key,
      label: r.label,
      description: r.description,
      lang: r.lang,
      group: r.group,
      value: isOverridden ? ov : def,
      default: def,
      isOverridden,
      updatedAt: isOverridden && overrides.__meta?.[r.key] ? overrides.__meta[r.key] : null,
    };
  });
}

// Apply a map of { key: value }. Returns { applied, errors }.
function setMany(updates, isoTime) {
  const overrides = loadOverrides();
  if (!overrides.__meta) overrides.__meta = {};
  const applied = [];
  const errors = [];
  for (const [key, raw] of Object.entries(updates || {})) {
    if (key === '__meta') continue;
    if (!isKnown(key)) {
      errors.push({ key, error: 'Unknown prompt' });
      continue;
    }
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      errors.push({ key, error: 'Value must be a non-empty string' });
      continue;
    }
    if (raw.length > MAX_LEN) {
      errors.push({ key, error: `Too long (max ${MAX_LEN} chars)` });
      continue;
    }
    overrides[key] = raw;
    overrides.__meta[key] = isoTime || null;
    applied.push(key);
  }
  if (applied.length) saveOverrides(overrides);
  return { applied, errors };
}

// Remove an override → revert to canonical default.
function reset(key) {
  if (!isKnown(key)) return false;
  const overrides = loadOverrides();
  let changed = false;
  if (key in overrides) {
    delete overrides[key];
    changed = true;
  }
  if (overrides.__meta && key in overrides.__meta) {
    delete overrides.__meta[key];
    changed = true;
  }
  if (changed) saveOverrides(overrides);
  return changed;
}

module.exports = { get, getAll, setMany, reset, isKnown, REGISTRY };
