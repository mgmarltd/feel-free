const { EFT_SYSTEM_PROMPT } = require('./eftPrompt');

const API_BASE = 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

const headers = {
  'xi-api-key': API_KEY,
  'Content-Type': 'application/json',
};

// List existing agents to check if one already exists
async function listAgents() {
  const res = await fetch(`${API_BASE}/convai/agents`, { headers });
  if (!res.ok) throw new Error(`List agents failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.agents || [];
}

// Create a new EFT tapping conversational AI agent
async function createAgent() {
  const agentConfig = {
    name: 'FEEL FREE - EFT Tapping Guide',
    conversation_config: {
      agent: {
        prompt: {
          prompt: EFT_SYSTEM_PROMPT,
          llm: 'gpt-4o',
          temperature: 0.75,
        },
        first_message:
          'Merhaba… Ben Calm. Sana nasıl seslenmemi istersin?',
        language: 'tr',
      },
      tts: {
        voice_id: VOICE_ID,
        model_id: 'eleven_turbo_v2_5',
        // Energy tuning — see server/index.js per-request PATCH for context.
        stability: 0.4,
        similarity_boost: 0.85,
        style: 0.2,
        use_speaker_boost: true,
        speed: 1.05,
        optimize_streaming_latency: 0,
      },
      asr: {
        quality: 'high',
        provider: 'elevenlabs',
        user_input_audio_format: 'pcm_16000',
      },
      turn: {
        mode: 'turn',
        turn_timeout: 1.2,
        silence_end_call_timeout: 30,
      },
      conversation: {
        max_duration_seconds: 1800,
      },
    },
  };

  console.log('Creating ElevenLabs Conversational AI agent...');

  const res = await fetch(`${API_BASE}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(agentConfig),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Create agent failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  console.log(`Agent created: ${data.agent_id}`);
  return data.agent_id;
}

// Get or create — reuse existing agent if one with our name exists
async function getOrCreateAgent() {
  try {
    const agents = await listAgents();
    const existing = agents.find((a) => a.name === 'FEEL FREE - EFT Tapping Guide');

    if (existing) {
      console.log(`Reusing existing agent: ${existing.agent_id}`);
      return existing.agent_id;
    }
  } catch (e) {
    console.log('Could not list agents, will create new one:', e.message);
  }

  return createAgent();
}

// Get a signed URL for client-side WebSocket connection
async function getSignedUrl(agentId) {
  const res = await fetch(
    `${API_BASE}/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Signed URL failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data.signed_url;
}

// Update an existing agent's config
async function updateAgent(agentId, updates) {
  const res = await fetch(`${API_BASE}/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Update agent failed: ${res.status} ${errorText}`);
  }

  return await res.json();
}

const ANALYSIS_AGENT_NAME = 'FEEL FREE - Self Analysis';

const ANALYSIS_PROMPT = `You're a warm, grounded human friend doing a quick check-in with someone who just opened FEEL FREE for the first time. You're not a script and you're not a chatbot — talk the way a calm, caring friend would on the phone.

WHAT YOU'RE TRYING TO DO
Understand the one main thing they'd like to work on. Keep the whole conversation short — usually 1 to 3 of their turns.

HOW YOU SPEAK
- Sound like a real person. Use contractions ("I'm", "you're", "that's"). Short sentences. Natural pauses with commas and the occasional "...".
- One thought per turn. Never lecture. Never read a list.
- Light, low-key warmth — a small "mm-hm", "okay", or "got it" at the start of a turn is fine when it fits, but don't overdo it.
- No therapy disclaimers. No "as an AI". No long preambles.
- Mirror their language. If they speak Turkish, reply in Turkish; if English, reply in English. Match their energy and tone — gentle if they're gentle, brisker if they're brisker.

WHAT TO DO
1. Your opening line is already set. Wait for them.
2. If what they said is clear and specific, jump to step 4.
3. If it's vague, ask ONE short, curious follow-up. Examples (EN): "Mm, tell me a little more." / "When does that come up most?" / "What does that look like day to day?" (TR): "Biraz daha anlatır mısın?" / "Bu en çok ne zaman ortaya çıkıyor?" / "Gününde nasıl beliriyor?" Then return to step 2.
4. Once you've got it, name the concern as a **clean noun phrase (2–5 words)** that reads like a real problem name — never a sentence fragment, never the user's exact verbatim words. Then say the EXACT closing line. Then stop — don't open a new topic.

NAMING THE CONCERN — STRICT
- A short, well-formed noun phrase that completes the sentence "[X] problemini düzeltiyorum" in Turkish or "your [X]" in English.
- Good (TR): "Araba sürme korkusu", "İş toplantısı stresi", "Derslere odaklanamama", "Uyku kaygısı", "Sosyal kaygı".
- Good (EN): "fear of driving", "work meeting stress", "trouble focusing in class", "sleep anxiety", "social anxiety".
- BAD: fragments like "araba sürerken biraz" or "I get nervous" — these are user speech, not a problem name. Always reframe into a clean noun phrase.
- Never use generic placeholders like "your concern" or "your problem".

CLOSING LINE — MANDATORY, VERBATIM
EN: "I'm optimizing your Feel Free system for you now."
TR: "Feel Free sistemini şimdi senin için optimize ediyorum."

EXAMPLES OF A GOOD FINAL TURN
EN: "Got it — fear of driving. I'm optimizing your Feel Free system for you now."
TR: "Anladım — araba sürme korkusu. Feel Free sistemini şimdi senin için optimize ediyorum."`;

const ANALYSIS_FIRST_MESSAGE_EN = "How has life been lately? Is there anything you'd like to fix?";
const ANALYSIS_FIRST_MESSAGE_TR = "Son zamanlarda hayat nasıl gidiyor? Düzeltmek istediğin bir şey var mı?";

async function createAnalysisAgent(language = 'en') {
  const isTurkish = language === 'tr';
  const agentConfig = {
    name: ANALYSIS_AGENT_NAME,
    conversation_config: {
      agent: {
        prompt: { prompt: ANALYSIS_PROMPT, llm: 'gpt-4o', temperature: 0.75 },
        first_message: isTurkish ? ANALYSIS_FIRST_MESSAGE_TR : ANALYSIS_FIRST_MESSAGE_EN,
        language,
      },
      tts: {
        voice_id: VOICE_ID,
        // Turbo / multilingual voice is noticeably more expressive than Flash;
        // worth the extra ~100ms for an onboarding moment that has to feel human.
        model_id: 'eleven_turbo_v2_5',
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
        speed: 1.05,
        optimize_streaming_latency: 0,
      },
      asr: {
        quality: 'high',
        provider: 'elevenlabs',
        user_input_audio_format: 'pcm_16000',
      },
      turn: {
        mode: 'turn',
        turn_timeout: 1.2,
        silence_end_call_timeout: 20,
      },
      conversation: { max_duration_seconds: 240 },
    },
  };

  console.log('Creating ElevenLabs self-analysis agent...');
  const res = await fetch(`${API_BASE}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(agentConfig),
  });
  if (!res.ok) throw new Error(`Create analysis agent failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  console.log(`Analysis agent created: ${data.agent_id}`);
  return data.agent_id;
}

async function getOrCreateAnalysisAgent(language = 'en') {
  try {
    const agents = await listAgents();
    const existing = agents.find((a) => a.name === ANALYSIS_AGENT_NAME);
    if (existing) {
      console.log(`Reusing existing analysis agent: ${existing.agent_id}`);
      return existing.agent_id;
    }
  } catch (e) {
    console.log('Could not list agents:', e.message);
  }
  return createAnalysisAgent(language);
}

async function textToSpeech(text, voiceId = VOICE_ID, languageCode) {
  const body = {
    text,
    model_id: 'eleven_flash_v2_5',
    voice_settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  };
  if (languageCode) body.language_code = languageCode;

  const res = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`TTS failed: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

module.exports = {
  createAgent,
  getOrCreateAgent,
  getSignedUrl,
  updateAgent,
  listAgents,
  textToSpeech,
  getOrCreateAnalysisAgent,
  ANALYSIS_PROMPT,
  ANALYSIS_FIRST_MESSAGE_EN,
  ANALYSIS_FIRST_MESSAGE_TR,
};
