require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const {
  createAgent,
  getOrCreateAgent,
  getSignedUrl,
  updateAgent,
  textToSpeech,
  getOrCreateAnalysisAgent,
  ANALYSIS_PROMPT,
  ANALYSIS_FIRST_MESSAGE_EN,
  ANALYSIS_FIRST_MESSAGE_TR,
} = require('./elevenlabs');
const { buildDynamicPrompt, getFirstMessage, resolveLanguage } = require('./eftPrompt');
const affirmations = require('./affirmations');
const userStore = require('./userStore');
const homeworks = require('./homeworks');
const promptStore = require('./promptStore');
const dailyTaskStore = require('./dailyTaskStore');
const quickSessionStore = require('./quickSessionStore');
const pushStore = require('./pushStore');
const scheduler = require('./scheduler');
const { createAdminRouter } = require('./admin');

const app = express();
app.use(cors());
app.use(express.json());

// Admin dashboard API (auth + read-only aggregation)
app.use('/api/admin', createAdminRouter());

let agentId = null;
let analysisAgentId = null;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agentId, timestamp: Date.now() });
});

// ─── Email magic-code auth ──────────────────────────────────────────────
// In-memory store, fine for dev. Swap for Redis/DB in production.
const pendingCodes = new Map();
const CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendCodeEmail(email, code) {
  // If RESEND_API_KEY is set, actually send the email. Otherwise just log.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Calmutopia <onboarding@resend.dev>';
  if (!apiKey) {
    console.log(`[auth] (dev) verification code for ${email}: ${code}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Calmutopia verification code',
      text: `Your code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your Calmutopia verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes.</p>`,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend failed: ${res.status} ${errText}`);
  }
}

app.post('/api/auth/email/request', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    const code = newCode();
    pendingCodes.set(email, { code, expiresAt: Date.now() + CODE_TTL_MS });
    await sendCodeEmail(email, code);
    res.json({ success: true });
  } catch (e) {
    console.error('Auth request error:', e.message || e);
    res.status(500).json({ error: 'Failed to send code', details: e.message });
  }
});

app.post('/api/auth/email/verify', (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    if (!email || !code) return res.status(400).json({ error: 'Missing fields' });

    const entry = pendingCodes.get(email);
    if (!entry) return res.status(400).json({ error: 'No code requested' });
    if (Date.now() > entry.expiresAt) {
      pendingCodes.delete(email);
      return res.status(400).json({ error: 'Code expired' });
    }
    if (entry.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    pendingCodes.delete(email);

    // Minimal token — replace with real JWT/session when ready
    const token = `tk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    res.json({ success: true, token, email });
  } catch (e) {
    console.error('Auth verify error:', e.message || e);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// One-shot TTS — used by the onboarding self-analysis scripted flow
app.post('/api/tts', async (req, res) => {
  try {
    const { text, language } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const audio = await textToSpeech(text, undefined, language);
    res.json({ audio, mimeType: 'audio/mpeg' });
  } catch (e) {
    console.error('TTS error:', e.message || e);
    res.status(500).json({ error: e.message || 'TTS failed' });
  }
});

// Start the onboarding self-analysis session — short bidirectional convo
// that ends with a fixed closing phrase the client uses as the auto-close signal.
app.post('/api/analysis/start', async (req, res) => {
  try {
    const { userProfile = {}, userId = 'default' } = req.body || {};
    const language = resolveLanguage(userProfile, { language: req.body?.language }) || 'en';
    console.log(
      `[analysis/start] language=${language}`,
      `(body=${req.body?.language || 'none'},`,
      `profile=${userProfile?.language || 'none'})`,
    );

    if (!analysisAgentId) {
      analysisAgentId = await getOrCreateAnalysisAgent(language);
    }

    // Refresh per-request so language + first_message stay correct
    try {
      await updateAgent(analysisAgentId, {
        conversation_config: {
          agent: {
            prompt: { prompt: promptStore.get('analysis_prompt'), llm: 'gpt-4o', temperature: 0.75 },
            first_message: language === 'tr'
              ? promptStore.get('analysis_first_tr')
              : promptStore.get('analysis_first_en'),
            language,
          },
          tts: {
            voice_id: process.env.ELEVENLABS_VOICE_ID,
            // English agents must use turbo_v2/flash_v2; v2.5 is multilingual.
            model_id: language === 'en' ? 'eleven_turbo_v2' : 'eleven_turbo_v2_5',
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
            speed: 1.05,
            optimize_streaming_latency: 0,
          },
          turn: { mode: 'turn', turn_timeout: 1.2, silence_end_call_timeout: 20 },
          asr: { quality: 'high', provider: 'elevenlabs', user_input_audio_format: 'pcm_16000' },
        },
      });
    } catch (e) {
      console.error('Analysis agent update failed:', e.message);
    }

    const signedUrl = await getSignedUrl(analysisAgentId);
    res.json({ agentId: analysisAgentId, signedUrl, language });
  } catch (error) {
    console.error('Analysis start error:', error.message);
    res.status(500).json({ error: 'Failed to start analysis', details: error.message });
  }
});

// Start a session — updates the agent prompt with user context, returns signed URL
app.post('/api/session/start', async (req, res) => {
  try {
    const { userProfile = {}, userId = 'default' } = req.body;

    // Ensure agent exists
    if (!agentId) {
      agentId = await getOrCreateAgent();
    }

    // Quick-session context (chosen topic + the SUD captured on the feeling
    // screen) is transient per-call data, not profile data. Pull it aside so
    // it shapes the prompt but never gets persisted onto the stored profile.
    const sessionType = req.body.sessionType ?? userProfile.sessionType;
    const feelingIntensity = req.body.feelingIntensity ?? userProfile.feelingIntensity;
    const { sessionType: _st, feelingIntensity: _fi, ...cleanProfile } = userProfile;

    // Merge client-side profile with server-side stored data
    const storedProfile = userStore.getUser(userId) || {};
    const mergedProfile = { ...storedProfile, ...cleanProfile };

    // Save merged profile
    userStore.saveUser(userId, mergedProfile);

    // Resolve session language: explicit body override → profile → 'tr'
    const language = resolveLanguage(mergedProfile, { language: req.body.language });
    console.log(
      `[session/start] language=${language}`,
      `(body=${req.body?.language || 'none'},`,
      `profile=${mergedProfile?.language || 'none'})`,
      sessionType ? `quick=${sessionType} sud=${feelingIntensity ?? '?'}` : '',
    );

    // Build personalized prompt and first message in the chosen language
    const promptOpts = { language, sessionType, feelingIntensity };
    const dynamicPrompt = buildDynamicPrompt(mergedProfile, promptOpts);
    const firstMessage = getFirstMessage(mergedProfile, promptOpts);

    // Update the agent with the personalized prompt + smooth-conversation settings
    try {
      await updateAgent(agentId, {
        conversation_config: {
          agent: {
            prompt: {
              prompt: dynamicPrompt,
              llm: 'gpt-4o',
              // Bumped from 0.5 → 0.75 — less formulaic, warmer phrasing.
              temperature: 0.75,
            },
            first_message: firstMessage,
            language,
          },
          tts: {
            voice_id: process.env.ELEVENLABS_VOICE_ID,
            // ElevenLabs rule: English agents MUST use turbo_v2 / flash_v2;
            // turbo_v2_5 / flash_v2_5 are multilingual (TR + others).
            model_id: language === 'en' ? 'eleven_turbo_v2' : 'eleven_turbo_v2_5',
            // Energy tuning: low stability gives dynamic range (peaks/valleys
            // instead of monotone), a small style nudge brings warmth and
            // expression without the speed drift that 0.4 caused, speaker_boost
            // keeps presence high. Speed slightly up for a brighter feel.
            stability: 0.4,
            similarity_boost: 0.85,
            style: 0.2,
            use_speaker_boost: true,
            speed: 1.05,
            optimize_streaming_latency: 0,
          },
          turn: {
            mode: 'turn',
            // Snappier turn-taking.
            turn_timeout: 1.2,
            silence_end_call_timeout: 30,
          },
          asr: {
            quality: 'high',
            provider: 'elevenlabs',
            user_input_audio_format: 'pcm_16000',
          },
        },
      });
      console.log(`Agent updated for user: ${mergedProfile.name || 'new user'}`);
    } catch (e) {
      console.error('Agent update failed, using default prompt:', e.message);
    }

    // Get signed URL
    const signedUrl = await getSignedUrl(agentId);

    res.json({
      agentId,
      signedUrl,
      userProfile: mergedProfile,
    });
  } catch (error) {
    console.error('Session start error:', error.message);
    res.status(500).json({ error: 'Failed to start session', details: error.message });
  }
});

// Update user profile — called by the app after session or when AI learns something
app.post('/api/user/update', (req, res) => {
  try {
    const { userId = 'default', updates } = req.body;
    const updated = userStore.updateUser(userId, updates);
    res.json({ success: true, profile: updated });
  } catch (error) {
    console.error('User update error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Homework — created at the end of every session ─────────────────────
// Client posts here when the user ends a session. The server picks a topic
// from the session payload, pulls matching affirmations from the library,
// and saves a homework on the user profile.
app.post('/api/session/end', (req, res) => {
  try {
    const {
      userId = 'default',
      sessionType,
      topic: explicitTopic,
      messages = [],
      language,
    } = req.body || {};
    const userText = homeworks.pickFromText(messages);
    const topic = explicitTopic
      || (sessionType ? homeworks.detectTopic(sessionType) : null)
      || homeworks.detectTopic(userText)
      || 'default';

    const profile = userStore.getUser(userId) || {};
    const lang = language || profile.language || 'tr';

    const hw = homeworks.buildHomework({ topic, language: lang, userText });
    homeworks.addForUser(userId, hw);
    console.log(`[homework] created for ${userId}: ${hw.title} (topic=${hw.topic})`);
    res.json({ success: true, homework: hw });
  } catch (e) {
    console.error('Session end error:', e.message || e);
    res.status(500).json({ error: 'Failed to end session', details: e.message });
  }
});

app.get('/api/homeworks/:userId', (req, res) => {
  try {
    const list = homeworks.listForUser(req.params.userId);
    res.json({ homeworks: list });
  } catch (e) {
    console.error('Homework list error:', e.message || e);
    res.status(500).json({ error: 'Failed to load homeworks' });
  }
});

app.post('/api/homework/:id/complete', (req, res) => {
  try {
    const { userId = 'default' } = req.body || {};
    const updated = homeworks.completeForUser(userId, req.params.id);
    if (!updated) return res.status(404).json({ error: 'Homework not found' });
    res.json({ success: true, homework: updated });
  } catch (e) {
    console.error('Homework complete error:', e.message || e);
    res.status(500).json({ error: 'Failed to complete homework' });
  }
});

// Get user profile
app.get('/api/user/:userId', (req, res) => {
  const profile = userStore.getUser(req.params.userId);
  res.json({ profile: profile || {} });
});

// Public: register/refresh a device's Expo push token. Called by the app on
// launch once notification permission is granted.
app.post('/api/push/register', (req, res) => {
  try {
    const { token, language, userId, platform } = req.body || {};
    const result = pushStore.upsert(
      { token, language, userId, platform },
      new Date().toISOString(),
    );
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  } catch (e) {
    console.error('Push register error:', e.message || e);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Public: the live Daily Tasks list for the app Home screen (enabled only).
// Completion is tracked locally on-device, keyed by task id.
app.get('/api/daily-tasks', (req, res) => {
  try {
    res.json({ tasks: dailyTaskStore.getTasks() });
  } catch (e) {
    console.error('Daily tasks error:', e.message || e);
    res.status(500).json({ error: 'Failed to load daily tasks' });
  }
});

// Public: the live Quick Sessions for the app Home screen (enabled only).
// Only display fields are exposed — prompt internals (focus/instructions/etc.)
// stay server-side and are applied at /api/session/start by sessionType.
app.get('/api/quick-sessions', (req, res) => {
  try {
    const modes = quickSessionStore.getModes().map((m) => ({
      id: m.id,
      emoji: m.emoji,
      color: m.color,
      duration: m.duration,
      featured: m.featured,
      label_en: m.label_en,
      label_tr: m.label_tr,
      description_en: m.description_en,
      description_tr: m.description_tr,
    }));
    res.json({ modes });
  } catch (e) {
    console.error('Quick sessions error:', e.message || e);
    res.status(500).json({ error: 'Failed to load quick sessions' });
  }
});

// Search the Problem → Cause → Affirmation library
app.get('/api/affirmations/search', (req, res) => {
  const q = (req.query.q || '').toString();
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 25);
  if (!q.trim()) return res.json({ count: 0, results: [] });
  const results = affirmations.search(q, { limit });
  res.json({ count: results.length, results });
});

// Lookup affirmations by a list of issues (comma-separated)
app.get('/api/affirmations/by-issues', (req, res) => {
  const raw = (req.query.issues || '').toString();
  const issues = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const perIssue = Math.min(parseInt(req.query.perIssue, 10) || 2, 10);
  const results = affirmations.findByIssues(issues, { perIssue });
  res.json({ count: results.length, results });
});

// Single entry by id
app.get('/api/affirmations/:id', (req, res) => {
  const entry = affirmations.getById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// Library stats / debug
app.get('/api/affirmations', (req, res) => {
  res.json({ count: affirmations.count() });
});

// Force recreate agent
app.post('/api/agent/recreate', async (req, res) => {
  try {
    agentId = await createAgent();
    res.json({ agentId, message: 'Agent recreated successfully' });
  } catch (error) {
    console.error('Agent recreate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Initialize
async function init() {
  try {
    agentId = await getOrCreateAgent();
    console.log(`EFT Agent ready: ${agentId}`);
  } catch (error) {
    console.error('Failed to initialize agent:', error.message);
  }
}

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`CALMUTOPIA server running on http://0.0.0.0:${PORT}`);
  console.log(`Tailscale: http://100.111.223.87:${PORT}`);
  init();
  scheduler.start();
});
server.on('error', (err) => {
  console.error('Server error:', err);
});
