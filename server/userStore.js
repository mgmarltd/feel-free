const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'users.json');

// Common Turkish words that should never be persisted as a person's name.
// Defense-in-depth against client-side name extractors that misfire.
const NAME_BLACKLIST = new Set([
  'ben', 'sen', 'biz', 'siz', 'onlar', 'bu', 'şu',
  'evet', 'hayır', 'tamam', 'iyi', 'kötü', 'fena',
  'araba', 'ev', 'iş', 'işim', 'evim', 'okul',
  'canım', 'kardeş', 'anne', 'baba', 'abla', 'abi', 'eş',
  'bilmiyorum', 'merhaba', 'selam', 'günaydın',
  'şey', 'şimdi', 'sonra', 'önce', 'bugün',
  'bir', 'iki', 'üç', 'çok', 'az', 'biraz',
  'arkadaş', 'arkadaşım', 'calm', 'sakin',
]);

function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 2 || name.length > 20) return false;
  if (NAME_BLACKLIST.has(name.toLowerCase())) return false;
  return true;
}

function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  if ('name' in profile && profile.name != null && !isValidName(profile.name)) {
    console.warn(`Rejected invalid name "${profile.name}" — coerced to null`);
    return { ...profile, name: null };
  }
  return profile;
}

// Ensure data directory exists
function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadAll() {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveAll(data) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function getUser(userId) {
  const all = loadAll();
  return all[userId] || null;
}

function saveUser(userId, profile) {
  const clean = sanitizeProfile(profile);
  const all = loadAll();
  all[userId] = { ...all[userId], ...clean, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[userId];
}

function updateUser(userId, updates) {
  const clean = sanitizeProfile(updates);
  const all = loadAll();
  const current = all[userId] || {};

  // Handle array fields — append rather than replace
  if (clean.knownIssues && Array.isArray(clean.knownIssues)) {
    const existing = current.knownIssues || [];
    clean.knownIssues = [...new Set([...existing, ...clean.knownIssues])];
  }
  if (clean.preferences && Array.isArray(clean.preferences)) {
    const existing = current.preferences || [];
    clean.preferences = [...new Set([...existing, ...clean.preferences])];
  }

  all[userId] = { ...current, ...clean, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[userId];
}

module.exports = { getUser, saveUser, updateUser };
