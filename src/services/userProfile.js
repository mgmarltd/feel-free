import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'user_profile';

// Detect device locale on first launch so an English-device user doesn't
// get dropped into a Turkish session by default. Safe in RN — Intl is
// available everywhere modern (Hermes ICU is on by default in RN 0.74+).
function detectDeviceLanguage() {
  try {
    const locale = Intl?.DateTimeFormat?.().resolvedOptions?.()?.locale || '';
    return locale.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

const DEFAULT_PROFILE = {
  name: null,
  age: null,
  gender: null,
  dailyRoutine: null,
  feeling: null,
  knowsEFT: null,
  language: detectDeviceLanguage(),  // 'tr' | 'en' — derived from device locale on first launch
  // AI-populated fields
  sessionCount: 0,
  lastSessionDate: null,
  knownIssues: [],       // things the user has mentioned (stress triggers, fears, etc.)
  preferences: [],       // what the user likes/dislikes in sessions
  emotionalHistory: [],  // [{date, before, after, notes}]
  notes: null,           // free-form AI notes about the user
};

export async function getLanguage() {
  const p = await getUserProfile();
  // Accept whichever explicit value is stored; never silently override the
  // user's choice. Only fall back to device locale if somehow nothing is set.
  if (p?.language === 'en' || p?.language === 'tr') return p.language;
  return detectDeviceLanguage();
}

// Re-exported so callers (e.g. AnalysisDrawer when storage is empty) can
// resolve the device-locale fallback without re-implementing the check.
export { detectDeviceLanguage };

export async function setLanguage(lang) {
  const code = lang === 'en' ? 'en' : 'tr';
  return updateUserProfile({ language: code });
}

// Common Turkish words that should never appear as a person's name.
// Used to clean up bad entries written by an earlier loose name extractor.
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

export async function getUserProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.name && !isValidName(parsed.name)) {
        parsed.name = null;
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
      }
      return { ...DEFAULT_PROFILE, ...parsed };
    }
    return { ...DEFAULT_PROFILE };
  } catch (e) {
    console.error('Failed to load profile:', e);
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveUserProfile(profile) {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile:', e);
  }
}

export async function updateUserProfile(updates) {
  const current = await getUserProfile();
  const updated = { ...current, ...updates };
  await saveUserProfile(updated);
  return updated;
}

export async function addSessionToHistory(entry) {
  const profile = await getUserProfile();
  profile.sessionCount = (profile.sessionCount || 0) + 1;
  profile.lastSessionDate = new Date().toISOString();
  profile.emotionalHistory = [
    ...(profile.emotionalHistory || []).slice(-19), // keep last 20
    entry,
  ];
  await saveUserProfile(profile);
  return profile;
}

export async function clearUserProfile() {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
