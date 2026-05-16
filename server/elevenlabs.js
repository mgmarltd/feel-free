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
          temperature: 0.5,
        },
        first_message:
          'Merhaba… Ben Calm. Sana nasıl seslenmemi istersin?',
        language: 'tr',
      },
      tts: {
        voice_id: VOICE_ID,
        model_id: 'eleven_flash_v2_5',
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0,
        use_speaker_boost: true,
        speed: 1.0,
        optimize_streaming_latency: 1,
      },
      asr: {
        quality: 'high',
        provider: 'elevenlabs',
        user_input_audio_format: 'pcm_16000',
      },
      turn: {
        mode: 'turn',
        turn_timeout: 1.5,
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

module.exports = { createAgent, getOrCreateAgent, getSignedUrl, updateAgent, listAgents };
