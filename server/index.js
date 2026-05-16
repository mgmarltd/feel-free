require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { createAgent, getOrCreateAgent, getSignedUrl, updateAgent } = require('./elevenlabs');
const { buildDynamicPrompt, getFirstMessage, resolveLanguage } = require('./eftPrompt');
const affirmations = require('./affirmations');
const userStore = require('./userStore');

const app = express();
app.use(cors());
app.use(express.json());

let agentId = null;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agentId, timestamp: Date.now() });
});

// Start a session — updates the agent prompt with user context, returns signed URL
app.post('/api/session/start', async (req, res) => {
  try {
    const { userProfile, userId = 'default' } = req.body;

    // Ensure agent exists
    if (!agentId) {
      agentId = await getOrCreateAgent();
    }

    // Merge client-side profile with server-side stored data
    const storedProfile = userStore.getUser(userId) || {};
    const mergedProfile = { ...storedProfile, ...userProfile };

    // Save merged profile
    userStore.saveUser(userId, mergedProfile);

    // Resolve session language: explicit body override → profile → 'tr'
    const language = resolveLanguage(mergedProfile, { language: req.body.language });

    // Build personalized prompt and first message in the chosen language
    const dynamicPrompt = buildDynamicPrompt(mergedProfile, { language });
    const firstMessage = getFirstMessage(mergedProfile, { language });

    // Update the agent with the personalized prompt + smooth-conversation settings
    try {
      await updateAgent(agentId, {
        conversation_config: {
          agent: {
            prompt: {
              prompt: dynamicPrompt,
              llm: 'gpt-4o',
              temperature: 0.5,
            },
            first_message: firstMessage,
            language,
          },
          tts: {
            voice_id: process.env.ELEVENLABS_VOICE_ID,
            // English agents must use flash_v2 / turbo_v2; multilingual flash_v2_5 for Turkish.
            model_id: language === 'en' ? 'eleven_flash_v2' : 'eleven_flash_v2_5',
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0,
            use_speaker_boost: true,
            speed: 1.0,
            optimize_streaming_latency: 1,
          },
          turn: {
            mode: 'turn',
            turn_timeout: 1.5,
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

// Get user profile
app.get('/api/user/:userId', (req, res) => {
  const profile = userStore.getUser(req.params.userId);
  res.json({ profile: profile || {} });
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
  console.log(`FEEL FREE server running on http://0.0.0.0:${PORT}`);
  console.log(`Tailscale: http://100.111.223.87:${PORT}`);
  init();
});
server.on('error', (err) => {
  console.error('Server error:', err);
});
