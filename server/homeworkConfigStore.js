// Editable Homework generation config.
//
// Homeworks are built server-side at the end of every session (see
// homeworks.buildHomework). This store holds the knobs that shape them —
// per-topic real-life practice text, the keywords that detect a topic, plus
// global settings (duration, frequency, title template, fallback affirmations).
//
// Defaults live here; admin edits persist to data/homeworkConfig.json (survives
// deploys — deploy.sh excludes data/). The admin dashboard edits the whole
// config; homeworks.js reads the effective config via getConfig().

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'homeworkConfig.json');
const MAX_TOPICS = 40;
const MAX_SHORT = 200;
const MAX_LONG = 2000;

// Built-in defaults. Practice text is now bilingual (the old code shipped only
// English, so Turkish users got English practice — fixed here).
const DEFAULT_TOPICS = [
  {
    key: 'anxiety', label_en: 'Anxiety', label_tr: 'Kaygı',
    keywords: ['anxiety', 'anxious', 'kaygı', 'kaygi', 'kaygili', 'panik', 'worry', 'worried'],
    practice_en: 'When you notice anxiety rising, pause, place a hand on your chest, and tap softly through the 7 points while breathing slowly. Even one minute counts.',
    practice_tr: 'Kaygının yükseldiğini fark ettiğinde dur, elini göğsüne koy ve yavaşça nefes alırken 7 noktaya nazikçe vur. Bir dakika bile sayılır.',
  },
  {
    key: 'stress', label_en: 'Stress', label_tr: 'Stres',
    keywords: ['stress', 'stresli', 'overwhelm', 'bunalmis', 'baskı', 'pressure'],
    practice_en: 'Pick one stressful moment this week (a meeting, a commute, an email). Tap on the side of your hand for 60 seconds before going in.',
    practice_tr: 'Bu hafta stresli bir an seç (toplantı, yolculuk, e-posta). İçeri girmeden önce elinin kenarına 60 saniye vur.',
  },
  {
    key: 'fear', label_en: 'Fear', label_tr: 'Korku',
    keywords: ['fear', 'korku', 'korkuyorum', 'scared', 'phobia', 'fobi'],
    practice_en: 'Choose one small thing the fear has been holding back. Do it this week, and notice afterward: "Did I survive that?"',
    practice_tr: 'Korkunun seni alıkoyduğu küçük bir şey seç. Bu hafta yap ve sonra fark et: "Bunu atlattım mı?"',
  },
  {
    key: 'rejection', label_en: 'Rejection', label_tr: 'Reddedilme',
    keywords: ['rejection', 'reject', 'reddedil', 'reddedilme', 'unloved', 'unwanted'],
    practice_en: 'Send one message, request, or boundary that risks being declined. Tap on your chest right after, regardless of the reply.',
    practice_tr: 'Reddedilme riski taşıyan bir mesaj, istek ya da sınır ilet. Cevap ne olursa olsun hemen ardından göğsüne vur.',
  },
  {
    key: 'anger', label_en: 'Anger', label_tr: 'Öfke',
    keywords: ['anger', 'angry', 'öfke', 'sinir', 'rage', 'kızgın', 'frustration'],
    practice_en: 'Next time anger rises, walk to a quiet spot, tap on top of your head and breathe out long. Repeat: "I am a calm expression of love."',
    practice_tr: 'Öfke yükseldiğinde sessiz bir köşeye git, başının tepesine vur ve uzun uzun nefes ver. Tekrarla: "Ben sakin bir sevgi ifadesiyim."',
  },
  {
    key: 'sadness', label_en: 'Sadness', label_tr: 'Üzüntü',
    keywords: ['sad', 'sadness', 'üzgün', 'üzüntü', 'grief', 'depression', 'depresyon'],
    practice_en: 'Each evening, name one small thing that nourished you today — out loud or in a note. Tap once gently on your chest.',
    practice_tr: 'Her akşam bugün seni besleyen küçük bir şeyi adlandır — sesli ya da bir notta. Göğsüne bir kez nazikçe vur.',
  },
  {
    key: 'shame', label_en: 'Shame', label_tr: 'Utanç',
    keywords: ['shame', 'utanç', 'embarrassed', 'humiliated'],
    practice_en: 'Speak one kind sentence to the mirror each morning, hand on heart. Then tap softly: "I am worthy of love just as I am."',
    practice_tr: 'Her sabah aynaya, elin kalbinde, bir nazik cümle söyle. Sonra nazikçe vur: "Olduğum gibi sevilmeye layığım."',
  },
  {
    key: 'guilt', label_en: 'Guilt', label_tr: 'Suçluluk',
    keywords: ['guilt', 'guilty', 'suçluluk', 'suçlu', 'regret', 'pişman'],
    practice_en: 'Write one thing you forgive yourself for. Tap on the chest and read it back. Once a day this week.',
    practice_tr: 'Kendini affettiğin bir şey yaz. Göğsüne vur ve geri oku. Bu hafta günde bir kez.',
  },
  {
    key: 'sleep', label_en: 'Sleep', label_tr: 'Uyku',
    keywords: ['sleep', 'insomnia', 'uyku', 'uyuyamıyorum', 'tired'],
    practice_en: 'Before bed, tap once through all 7 points with: "My body is safe. My mind can rest." Three slow rounds.',
    practice_tr: 'Yatmadan önce 7 noktaya bir tur vur: "Bedenim güvende. Zihnim dinlenebilir." Üç yavaş tur.',
  },
  {
    key: 'confidence', label_en: 'Confidence', label_tr: 'Özgüven',
    keywords: ['confidence', 'self-doubt', 'özgüven', 'inadequate', 'yetersiz'],
    practice_en: 'Once a day, stand tall, hands on heart, and say: "I am safe to be fully myself." Tap on the chest as you say it.',
    practice_tr: 'Günde bir kez dik dur, ellerin kalbinde, söyle: "Tamamen kendim olmakta güvendeyim." Söylerken göğsüne vur.',
  },
  {
    key: 'trauma', label_en: 'Trauma', label_tr: 'Travma',
    keywords: ['trauma', 'travma', 'flashback', 'ptsd', 'çocukluk'],
    practice_en: 'When a flashback or memory rises, gently tap on the chest while repeating: "That was then. I am safe now." Do not push deeper alone.',
    practice_tr: 'Bir geri dönüş ya da anı yükseldiğinde göğsüne nazikçe vururken tekrarla: "O geçmişti. Şimdi güvendeyim." Tek başına derine inme.',
  },
  {
    key: 'default', label_en: 'General', label_tr: 'Genel',
    keywords: [],
    practice_en: 'Each morning and evening, tap softly through the 7 points (about 2 minutes) while saying the affirmation aloud. Notice what shifts.',
    practice_tr: 'Her sabah ve akşam 7 noktaya nazikçe vur (yaklaşık 2 dakika), olumlamayı sesli söyleyerek. Neyin değiştiğini fark et.',
  },
];

const DEFAULT_CONFIG = {
  durationMinutes: 3,
  affirmationCount: 4,
  frequency_en: 'Morning and evening',
  frequency_tr: 'Sabah ve akşam',
  titleTemplate_en: 'Daily {topic} release',
  titleTemplate_tr: 'Günlük {topic} bırakma',
  fallback_en: [
    'I love and approve of myself.',
    'I trust the flow of life. I am safe.',
    'I am worthy of love, respect and kindness, just as I am.',
  ],
  fallback_tr: [
    'Kendimi seviyorum ve onaylıyorum.',
    'Hayatın akışına güveniyorum. Güvendeyim.',
    'Olduğum gibi sevgiye, saygıya ve şefkate layığım.',
  ],
  topics: DEFAULT_TOPICS,
};

function defaults() {
  // Deep clone so callers can't mutate the module defaults.
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' && Array.isArray(parsed.topics) ? parsed : null;
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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'topic';
}

const str = (v, max, fallback = '') => {
  const s = String(v == null ? '' : v).trim();
  return (s || fallback).slice(0, max);
};

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function toLines(v, max = 12) {
  let arr = v;
  if (typeof v === 'string') arr = v.split('\n');
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x || '').trim()).filter(Boolean).slice(0, max);
}

function toKeywords(v) {
  let arr = v;
  if (typeof v === 'string') arr = v.split(',');
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 30);
}

// Effective config (override merged over defaults so new default fields appear
// even on older saved files).
function getConfig() {
  const data = load();
  if (!data) return defaults();
  const d = defaults();
  return {
    durationMinutes: clampInt(data.durationMinutes, 1, 60, d.durationMinutes),
    affirmationCount: clampInt(data.affirmationCount, 1, 8, d.affirmationCount),
    frequency_en: str(data.frequency_en, MAX_SHORT, d.frequency_en),
    frequency_tr: str(data.frequency_tr, MAX_SHORT, d.frequency_tr),
    titleTemplate_en: str(data.titleTemplate_en, MAX_SHORT, d.titleTemplate_en),
    titleTemplate_tr: str(data.titleTemplate_tr, MAX_SHORT, d.titleTemplate_tr),
    fallback_en: data.fallback_en?.length ? toLines(data.fallback_en) : d.fallback_en,
    fallback_tr: data.fallback_tr?.length ? toLines(data.fallback_tr) : d.fallback_tr,
    topics: Array.isArray(data.topics) && data.topics.length ? data.topics : d.topics,
  };
}

function getAdminView() {
  const data = load();
  return {
    config: getConfig(),
    defaults: defaults(),
    isCustomized: !!data,
    updatedAt: data?.updatedAt || null,
  };
}

// Validate + persist the whole config. Returns { config } or { error }.
function setConfig(raw, isoTime) {
  if (!raw || typeof raw !== 'object') return { error: 'Expected a config object' };
  if (!Array.isArray(raw.topics) || !raw.topics.length) return { error: 'At least one topic is required' };
  if (raw.topics.length > MAX_TOPICS) return { error: `Too many topics (max ${MAX_TOPICS})` };

  const d = defaults();
  const usedKeys = new Set();
  const topics = [];
  for (const t of raw.topics) {
    if (!t || typeof t !== 'object') continue;
    const label_en = str(t.label_en, MAX_SHORT);
    const label_tr = str(t.label_tr, MAX_SHORT);
    if (!label_en && !label_tr) return { error: 'Each topic needs an English or Turkish label' };

    let key = t.key && String(t.key).trim() ? slugify(t.key) : slugify(label_en || label_tr);
    const base = key; let n = 2;
    while (usedKeys.has(key)) key = `${base}-${n++}`;
    usedKeys.add(key);

    topics.push({
      key,
      label_en,
      label_tr,
      keywords: toKeywords(t.keywords),
      practice_en: str(t.practice_en, MAX_LONG),
      practice_tr: str(t.practice_tr, MAX_LONG),
    });
  }

  // Guarantee a 'default' topic exists (the generation fallback).
  if (!topics.some((t) => t.key === 'default')) {
    topics.push(d.topics.find((t) => t.key === 'default'));
  }

  const fallback_en = toLines(raw.fallback_en);
  const fallback_tr = toLines(raw.fallback_tr);

  const config = {
    durationMinutes: clampInt(raw.durationMinutes, 1, 60, d.durationMinutes),
    affirmationCount: clampInt(raw.affirmationCount, 1, 8, d.affirmationCount),
    frequency_en: str(raw.frequency_en, MAX_SHORT, d.frequency_en),
    frequency_tr: str(raw.frequency_tr, MAX_SHORT, d.frequency_tr),
    titleTemplate_en: str(raw.titleTemplate_en, MAX_SHORT, d.titleTemplate_en),
    titleTemplate_tr: str(raw.titleTemplate_tr, MAX_SHORT, d.titleTemplate_tr),
    fallback_en: fallback_en.length ? fallback_en : d.fallback_en,
    fallback_tr: fallback_tr.length ? fallback_tr : d.fallback_tr,
    topics,
    updatedAt: isoTime || null,
  };

  save(config);
  return { config };
}

function reset() {
  try {
    if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
  } catch (e) {
    /* ignore */
  }
  return defaults();
}

module.exports = { getConfig, getAdminView, setConfig, reset, DEFAULT_CONFIG };
