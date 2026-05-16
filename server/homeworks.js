const crypto = require('crypto');
const affirmations = require('./affirmations');
const userStore = require('./userStore');

// Real-life practice suggestions per common topic. Generic if no match.
// Each line is one short, concrete action the user can try this week.
const PRACTICE_BY_TOPIC = {
  anxiety: 'When you notice anxiety rising, pause, place a hand on your chest, and tap softly through the 7 points while breathing slowly. Even one minute counts.',
  stress: 'Pick one stressful moment this week (a meeting, a commute, an email). Tap on the side of your hand for 60 seconds before going in.',
  fear: 'Choose one small thing the fear has been holding back. Do it this week, and notice afterward: "Did I survive that?"',
  rejection: 'Send one message, request, or boundary that risks being declined. Tap on your chest right after, regardless of the reply.',
  anger: 'Next time anger rises, walk to a quiet spot, tap on top of your head and breathe out long. Repeat: "I am a calm expression of love."',
  sadness: 'Each evening, name one small thing that nourished you today — out loud or in a note. Tap once gently on your chest.',
  shame: 'Speak one kind sentence to the mirror each morning, hand on heart. Then tap softly: "I am worthy of love just as I am."',
  guilt: 'Write one thing you forgive yourself for. Tap on the chest and read it back. Once a day this week.',
  sleep: 'Before bed, tap once through all 7 points with: "My body is safe. My mind can rest." Three slow rounds.',
  confidence: 'Once a day, stand tall, hands on heart, and say: "I am safe to be fully myself." Tap on the chest as you say it.',
  trauma: 'When a flashback or memory rises, gently tap on the chest while repeating: "That was then. I am safe now." Do not push deeper alone.',
  default: 'Each morning and evening, tap softly through the 7 points (about 2 minutes) while saying the affirmation aloud. Notice what shifts.',
};

const TOPIC_KEYWORDS = {
  anxiety: ['anxiety', 'anxious', 'kaygı', 'kaygi', 'kaygili', 'panik', 'worry', 'worried'],
  stress: ['stress', 'stresli', 'overwhelm', 'bunalmis', 'baskı', 'pressure'],
  fear: ['fear', 'korku', 'korkuyorum', 'scared', 'phobia', 'fobi'],
  rejection: ['rejection', 'reject', 'reddedil', 'reddedilme', 'unloved', 'unwanted'],
  anger: ['anger', 'angry', 'öfke', 'sinir', 'rage', 'kızgın', 'frustration'],
  sadness: ['sad', 'sadness', 'üzgün', 'üzüntü', 'grief', 'depression', 'depresyon'],
  shame: ['shame', 'utanç', 'embarrassed', 'humiliated'],
  guilt: ['guilt', 'guilty', 'suçluluk', 'suçlu', 'regret', 'pişman'],
  sleep: ['sleep', 'insomnia', 'uyku', 'uyuyamıyorum', 'tired'],
  confidence: ['confidence', 'self-doubt', 'özgüven', 'inadequate', 'yetersiz'],
  trauma: ['trauma', 'travma', 'flashback', 'ptsd', 'çocukluk'],
};

function detectTopic(text) {
  if (!text || typeof text !== 'string') return 'default';
  const lower = text.toLowerCase();
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return topic;
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
// No LLM needed — deterministic + reliable, can be upgraded to real LLM later.
function buildHomework({ topic, language = 'tr', userText = '' }) {
  const lang = language === 'en' ? 'en' : 'tr';
  const resolvedTopic = topic && topic !== 'default'
    ? topic
    : detectTopic(userText) || 'default';

  const issuesSearch = [resolvedTopic, ...(userText ? [userText.slice(0, 200)] : [])];
  const matched = affirmations.findByIssues(issuesSearch, { perIssue: 3 }).slice(0, 4);

  const lines = matched
    .map((e) => (lang === 'en' ? e.affirmation_en : e.affirmation_tr))
    .filter(Boolean);

  // Fallback set if no library hits
  const fallbackLines = lang === 'en'
    ? [
        'I love and approve of myself.',
        'I trust the flow of life. I am safe.',
        'I am worthy of love, respect and kindness, just as I am.',
      ]
    : [
        'Kendimi seviyorum ve onaylıyorum.',
        'Hayatın akışına güveniyorum. Güvendeyim.',
        'Olduğum gibi sevgiye, saygıya ve şefkate layığım.',
      ];

  const affs = lines.length >= 2 ? lines : fallbackLines;

  const title = lang === 'en'
    ? `Daily ${resolvedTopic} release`
    : `Günlük ${resolvedTopic} bırakma`;

  const tappingScript = affs[0];
  const realLifeAction = PRACTICE_BY_TOPIC[resolvedTopic] || PRACTICE_BY_TOPIC.default;

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
    durationMinutes: 3,
    frequency: lang === 'en' ? 'Morning and evening' : 'Sabah ve akşam',
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
