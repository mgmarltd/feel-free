const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data', 'affirmations.json');

let cache = null;

function loadAll() {
  if (cache) return cache;
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  cache = JSON.parse(raw);
  return cache;
}

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return normalize(str).split(' ').filter((t) => t.length >= 2);
}

function scoreEntry(entry, queryTokens) {
  const haystack = normalize(
    [entry.symptom_en, entry.symptom_tr, entry.cause_en, entry.cause_tr]
      .filter(Boolean)
      .join(' ')
  );
  let score = 0;
  for (const t of queryTokens) {
    if (!t) continue;
    if (haystack.includes(t)) {
      // Higher weight when token appears in symptom
      const symHaystack = normalize(
        [entry.symptom_en, entry.symptom_tr].filter(Boolean).join(' ')
      );
      score += symHaystack.includes(t) ? 3 : 1;
    }
  }
  return score;
}

function search(query, { limit = 5 } = {}) {
  const data = loadAll();
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const scored = data.entries
    .map((e) => ({ entry: e, score: scoreEntry(e, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);
  return scored;
}

function findByIssues(issues, { perIssue = 2 } = {}) {
  if (!Array.isArray(issues) || !issues.length) return [];
  const seen = new Set();
  const result = [];
  for (const issue of issues) {
    const hits = search(issue, { limit: perIssue });
    for (const h of hits) {
      if (!seen.has(h.id)) {
        seen.add(h.id);
        result.push(h);
      }
    }
  }
  return result;
}

function getById(id) {
  const data = loadAll();
  return data.entries.find((e) => e.id === id) || null;
}

// Pick a random entry, optionally biased to a topic/issue. Only entries with at
// least one affirmation text are eligible. Returns null if the library is empty.
function randomEntry({ issues = [] } = {}) {
  let pool = [];
  if (Array.isArray(issues) && issues.filter(Boolean).length) {
    pool = findByIssues(issues.filter(Boolean), { perIssue: 12 });
  }
  if (!pool.length) pool = loadAll().entries;
  // Prefer fully bilingual entries so each language gets its own text; fall
  // back to entries with at least one affirmation.
  const both = pool.filter((e) => e && e.affirmation_en && e.affirmation_tr);
  const either = pool.filter((e) => e && (e.affirmation_en || e.affirmation_tr));
  const chosen = both.length ? both : either;
  if (!chosen.length) return null;
  return chosen[Math.floor(Math.random() * chosen.length)];
}

function count() {
  return loadAll().count;
}

module.exports = { search, findByIssues, getById, count, loadAll, randomEntry };
