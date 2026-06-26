import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/api';

const STORAGE_KEY = 'daily_tasks_state';
const CACHE_KEY = 'daily_tasks_list';
const FETCH_TIMEOUT_MS = 8000;

// Offline fallback — mirrors the server defaults (server/dailyTaskStore.js).
// Used only if the device has never reached the server. The admin dashboard is
// the source of truth; this just keeps Home populated with no network.
const FALLBACK_TASKS = [
  { id: 'morning-tapping', emoji: '🌅', title_en: 'Morning Tapping', title_tr: 'Sabah Tapping' },
  { id: 'gratitude-checkin', emoji: '🙏', title_en: 'Gratitude Check-in', title_tr: 'Şükür Anı' },
  { id: 'evening-winddown', emoji: '🌙', title_en: 'Evening Wind Down', title_tr: 'Akşam Sakinleşme' },
];

// Local date as YYYY-MM-DD — completion resets at local midnight.
function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function readState() {
  const today = todayKey();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today, completed: {} };
    const parsed = JSON.parse(raw);
    // New day → start fresh.
    if (parsed?.date !== today) return { date: today, completed: {} };
    return { date: today, completed: parsed.completed || {} };
  } catch (e) {
    return { date: today, completed: {} };
  }
}

async function writeState(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save daily tasks:', e);
  }
}

// Fetch the admin-managed task list. On any failure, fall back to the last
// cached list, then to the bundled defaults — Home always renders something.
async function fetchTaskList() {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/daily-tasks`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`daily-tasks ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.tasks) ? data.tasks : [];
    if (list.length) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
      return list;
    }
    return FALLBACK_TASKS;
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
    return FALLBACK_TASKS;
  } finally {
    clearTimeout(id);
  }
}

// Today's tasks with localized titles + completion flags.
export async function getDailyTasks(lang = 'tr') {
  const [list, state] = await Promise.all([fetchTaskList(), readState()]);
  // Persist any midnight reset so later toggles build on the right baseline.
  await writeState(state);
  return list.map((t) => ({
    id: t.id,
    emoji: t.emoji || '',
    title: (lang === 'en' ? t.title_en : t.title_tr) || t.title_en || t.title_tr || '',
    completed: !!state.completed[t.id],
  }));
}

// Flip a task's completion for today; returns the new completed state.
export async function toggleDailyTask(id) {
  const state = await readState();
  const next = !state.completed[id];
  state.completed = { ...state.completed, [id]: next };
  await writeState(state);
  return next;
}
