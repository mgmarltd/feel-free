// Send push notifications via the Expo Push API.
//
// No SDK dependency — a thin fetch wrapper. Chunks to 100 messages/request,
// reads back tickets, and prunes tokens Expo reports as DeviceNotRegistered.

const pushStore = require('./pushStore');
const affirmations = require('./affirmations');

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
// Optional — raises rate limits. Set EXPO_ACCESS_TOKEN in .env if you have one.
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN || '';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function postChunk(messages) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${EXPO_ACCESS_TOKEN}`;
  const res = await fetch(EXPO_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Expo push HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

// Send one title/body to an explicit list of tokens. Returns counts and prunes
// dead tokens. `data` is an optional payload delivered with the notification.
async function sendToTokens(tokens, { title, body, data } = {}) {
  const valid = [...new Set((tokens || []).filter((t) => pushStore.isExpoToken(t)))];
  if (!valid.length) return { sent: 0, failed: 0, removed: 0 };
  if (!title && !body) return { sent: 0, failed: 0, removed: 0, error: 'Empty notification' };

  const messages = valid.map((to) => ({
    to,
    title: title || '',
    body: body || '',
    sound: 'default',
    ...(data ? { data } : {}),
  }));

  let sent = 0;
  let failed = 0;
  const dead = [];

  const batches = chunk(messages, 100);
  for (let b = 0; b < batches.length; b += 1) {
    let tickets = [];
    try {
      tickets = await postChunk(batches[b]);
    } catch (e) {
      console.error('[push] chunk send failed:', e.message || e);
      failed += batches[b].length;
      continue;
    }
    tickets.forEach((ticket, idx) => {
      if (ticket?.status === 'ok') {
        sent += 1;
      } else {
        failed += 1;
        const err = ticket?.details?.error;
        if (err === 'DeviceNotRegistered') dead.push(batches[b][idx].to);
      }
    });
  }

  if (dead.length) pushStore.removeMany(dead);
  return { sent, failed, removed: dead.length };
}

// Localized broadcast: pick title/body per subscription language. `payload` is
// { title_en, body_en, title_tr, body_tr, data }.
async function broadcast(payload = {}) {
  const subs = pushStore.list();
  if (!subs.length) return { sent: 0, failed: 0, removed: 0, audience: 0 };

  const en = subs.filter((s) => s.language === 'en').map((s) => s.token);
  const tr = subs.filter((s) => s.language !== 'en').map((s) => s.token);

  const results = await Promise.all([
    sendToTokens(en, { title: payload.title_en || payload.title_tr, body: payload.body_en || payload.body_tr, data: payload.data }),
    sendToTokens(tr, { title: payload.title_tr || payload.title_en, body: payload.body_tr || payload.body_en, data: payload.data }),
  ]);

  return results.reduce(
    (acc, r) => ({
      sent: acc.sent + (r.sent || 0),
      failed: acc.failed + (r.failed || 0),
      removed: acc.removed + (r.removed || 0),
      audience: subs.length,
    }),
    { sent: 0, failed: 0, removed: 0, audience: subs.length },
  );
}

// Build the broadcast payload for an automation. For 'affirmation' type, pick
// one random library entry (optionally topic-biased) and use the SAME entry for
// both languages so a single send is coherent. Falls back to a fixed line if
// the library is empty.
function resolvePayload(automation) {
  if (automation.type === 'affirmation') {
    const entry = affirmations.randomEntry({ issues: automation.topic ? [automation.topic] : [] });
    const en = entry?.affirmation_en || entry?.affirmation_tr || 'I love and approve of myself.';
    const tr = entry?.affirmation_tr || entry?.affirmation_en || 'Kendimi seviyorum ve onaylıyorum.';
    return {
      title_en: automation.title_en || 'Daily affirmation',
      title_tr: automation.title_tr || 'Günün olumlaması',
      body_en: en,
      body_tr: tr,
      data: { type: 'affirmation', id: automation.id, affirmationId: entry?.id || null },
    };
  }
  return {
    title_en: automation.title_en,
    title_tr: automation.title_tr,
    body_en: automation.body_en,
    body_tr: automation.body_tr,
    data: { type: 'automation', id: automation.id },
  };
}

module.exports = { sendToTokens, broadcast, resolvePayload };
