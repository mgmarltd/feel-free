import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/api';

const CACHE_KEY = 'quick_sessions_list';
const FETCH_TIMEOUT_MS = 8000;

// Offline fallback — display fields only, mirrors server defaults
// (server/quickSessionStore.js). The admin dashboard is the source of truth.
const FALLBACK_MODES = [
  { id: 'release', emoji: '🍃', color: 'rgba(139,92,246,0.2)', duration: '8 min', featured: true, label_en: 'Release & Let Go', label_tr: 'Bırak ve Salıver', description_en: "A guided tapping session to release what's weighing you down.", description_tr: 'Seni ağırlaştıran ne varsa bırakman için rehberli bir tapping seansı.' },
  { id: 'stress-relief', emoji: '🧘', color: 'rgba(139,92,246,0.2)', duration: '5 min', featured: false, label_en: 'Stress Relief', label_tr: 'Stres Rahatlama', description_en: '', description_tr: '' },
  { id: 'anxiety-calm', emoji: '🌊', color: 'rgba(59,130,246,0.2)', duration: '7 min', featured: false, label_en: 'Anxiety Calm', label_tr: 'Kaygıyı Yatıştır', description_en: '', description_tr: '' },
  { id: 'morning-energy', emoji: '☀️', color: 'rgba(245,158,11,0.2)', duration: '5 min', featured: false, label_en: 'Morning Energy', label_tr: 'Sabah Enerjisi', description_en: '', description_tr: '' },
  { id: 'better-sleep', emoji: '🌙', color: 'rgba(99,102,241,0.2)', duration: '10 min', featured: false, label_en: 'Better Sleep', label_tr: 'Daha İyi Uyku', description_en: '', description_tr: '' },
];

// Fetch the admin-managed quick sessions. On failure, fall back to the last
// cached list, then to bundled defaults — Home always renders something.
async function fetchModes() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/quick-sessions`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`quick-sessions ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.modes) ? data.modes : [];
    if (list.length) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
      return list;
    }
    return FALLBACK_MODES;
  } catch (e) {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length) return list;
      }
    } catch (_) {
      /* ignore */
    }
    return FALLBACK_MODES;
  } finally {
    clearTimeout(id);
  }
}

// Localized quick sessions split into the featured card(s) and the quick row.
export async function getQuickSessions(lang = 'tr') {
  const modes = await fetchModes();
  const mapped = modes.map((m) => ({
    id: m.id,
    emoji: m.emoji || '',
    color: m.color || 'rgba(139,92,246,0.2)',
    duration: m.duration || '',
    featured: !!m.featured,
    title: (lang === 'en' ? m.label_en : m.label_tr) || m.label_en || m.label_tr || '',
    description: (lang === 'en' ? m.description_en : m.description_tr) || m.description_en || m.description_tr || '',
  }));
  return {
    featured: mapped.filter((m) => m.featured),
    quick: mapped.filter((m) => !m.featured),
  };
}
