// Push notification subscriptions.
//
// Keyed by the device's Expo push token (not userId) so multiple devices never
// collide and broadcasts reach every device. Persisted to data/pushTokens.json
// (survives deploys — deploy.sh excludes data/).

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'pushTokens.json');

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadAll() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveAll(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

// Basic shape check for an Expo push token.
function isExpoToken(token) {
  return typeof token === 'string' && /^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/.test(token.trim());
}

// Create/update a subscription by token.
function upsert({ token, language, userId, platform } = {}, isoTime) {
  if (!isExpoToken(token)) return { error: 'Invalid Expo push token' };
  const all = loadAll();
  const t = token.trim();
  const prev = all[t] || {};
  all[t] = {
    token: t,
    language: language === 'en' ? 'en' : language === 'tr' ? 'tr' : prev.language || 'tr',
    userId: userId || prev.userId || 'default',
    platform: platform || prev.platform || null,
    createdAt: prev.createdAt || isoTime || null,
    updatedAt: isoTime || null,
  };
  saveAll(all);
  return { subscription: all[t] };
}

function remove(token) {
  const all = loadAll();
  if (all[token]) {
    delete all[token];
    saveAll(all);
    return true;
  }
  return false;
}

function removeMany(tokens = []) {
  const all = loadAll();
  let changed = false;
  for (const t of tokens) {
    if (all[t]) {
      delete all[t];
      changed = true;
    }
  }
  if (changed) saveAll(all);
  return changed;
}

function list() {
  return Object.values(loadAll());
}

function count() {
  return Object.keys(loadAll()).length;
}

// Stats for the dashboard: total + by language.
function stats() {
  const subs = list();
  const byLanguage = subs.reduce((acc, s) => {
    const k = s.language || 'tr';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  return { total: subs.length, byLanguage };
}

module.exports = { upsert, remove, removeMany, list, count, stats, isExpoToken };
