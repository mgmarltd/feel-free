import { API_BASE } from '../constants/api';

const FETCH_TIMEOUT_MS = 10000;

async function withTimeout(promise, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promise(ctrl.signal);
  } finally {
    clearTimeout(id);
  }
}

export async function endSession({ userId = 'default', sessionType, topic, messages, language } = {}) {
  return withTimeout(async (signal) => {
    const res = await fetch(`${API_BASE}/api/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionType, topic, messages, language }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `session/end failed: ${res.status}`);
    }
    return res.json();
  });
}

export async function listHomeworks(userId = 'default') {
  return withTimeout(async (signal) => {
    const res = await fetch(`${API_BASE}/api/homeworks/${encodeURIComponent(userId)}`, {
      signal,
    });
    if (!res.ok) throw new Error(`homeworks list failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.homeworks) ? data.homeworks : [];
  });
}

export async function completeHomework(id, userId = 'default') {
  return withTimeout(async (signal) => {
    const res = await fetch(
      `${API_BASE}/api/homework/${encodeURIComponent(id)}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        signal,
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `homework complete failed: ${res.status}`);
    }
    const data = await res.json();
    return data.homework || null;
  });
}
