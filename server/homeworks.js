const crypto = require('crypto');
const affirmations = require('./affirmations');
const userStore = require('./userStore');
const homeworkConfig = require('./homeworkConfigStore');

// Topic detection uses the admin-managed keyword lists. First topic whose
// keyword appears in the text wins; 'default' if none match.
function detectTopic(text) {
  if (!text || typeof text !== 'string') return 'default';
  const lower = text.toLowerCase();
  const { topics } = homeworkConfig.getConfig();
  for (const t of topics) {
    if (t.key === 'default') continue;
    if ((t.keywords || []).some((w) => w && lower.includes(w))) return t.key;
  }
  return 'default';
}

function pickFromText(messages) {
  if (!Array.isArray(messages)) return '';
  const userText = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'self'))
    .map((m) => m.text || '')
    .join(' ');
  return userText.slice(0, 2000);
}

// Build a homework JSON from the session's topic + the affirmation library.
// Deterministic + reliable; every knob (practice text, title, duration,
// frequency, fallback affirmations, how many to pull) comes from the
// admin-managed homework config.
function buildHomework({ topic, language = 'tr', userText = '' }) {
  const lang = language === 'en' ? 'en' : 'tr';
  const cfg = homeworkConfig.getConfig();
  const resolvedTopic = topic && topic !== 'default'
    ? topic
    : detectTopic(userText) || 'default';

  const topicCfg = cfg.topics.find((t) => t.key === resolvedTopic)
    || cfg.topics.find((t) => t.key === 'default')
    || {};

  const issuesSearch = [resolvedTopic, ...(userText ? [userText.slice(0, 200)] : [])];
  const matched = affirmations.findByIssues(issuesSearch, { perIssue: 3 }).slice(0, cfg.affirmationCount);

  const lines = matched
    .map((e) => (lang === 'en' ? e.affirmation_en : e.affirmation_tr))
    .filter(Boolean);

  // Admin-configured fallback set if the library returns too few hits.
  const fallbackLines = lang === 'en' ? cfg.fallback_en : cfg.fallback_tr;
  const affs = lines.length >= 2 ? lines : fallbackLines;

  const label = (lang === 'en' ? topicCfg.label_en : topicCfg.label_tr) || resolvedTopic;
  const template = lang === 'en' ? cfg.titleTemplate_en : cfg.titleTemplate_tr;
  const title = template.replace(/\{topic\}/gi, label);

  const tappingScript = affs[0];
  const defaultCfg = cfg.topics.find((t) => t.key === 'default') || {};
  const realLifeAction = (lang === 'en' ? topicCfg.practice_en : topicCfg.practice_tr)
    || (lang === 'en' ? defaultCfg.practice_en : defaultCfg.practice_tr)
    || '';

  return {
    id: 'hw_' + crypto.randomBytes(6).toString('hex'),
    createdAt: new Date().toISOString(),
    completedAt: null,
    topic: resolvedTopic,
    language: lang,
    title,
    affirmations: affs,
    tappingScript,
    realLifeAction,
    durationMinutes: cfg.durationMinutes,
    frequency: lang === 'en' ? cfg.frequency_en : cfg.frequency_tr,
  };
}

function listForUser(userId = 'default') {
  const profile = userStore.getUser(userId) || {};
  return Array.isArray(profile.homeworks) ? profile.homeworks : [];
}

function addForUser(userId = 'default', homework) {
  const profile = userStore.getUser(userId) || {};
  const existing = Array.isArray(profile.homeworks) ? profile.homeworks : [];
  const updated = [homework, ...existing].slice(0, 50); // keep last 50
  userStore.updateUser(userId, { homeworks: updated });
  return homework;
}

function completeForUser(userId = 'default', homeworkId) {
  const profile = userStore.getUser(userId) || {};
  const list = Array.isArray(profile.homeworks) ? profile.homeworks : [];
  let changed = null;
  const updated = list.map((h) => {
    if (h.id === homeworkId && !h.completedAt) {
      changed = { ...h, completedAt: new Date().toISOString() };
      return changed;
    }
    return h;
  });
  if (!changed) return null;
  userStore.updateUser(userId, { homeworks: updated });
  return changed;
}

module.exports = {
  buildHomework,
  detectTopic,
  pickFromText,
  listForUser,
  addForUser,
  completeForUser,
};
