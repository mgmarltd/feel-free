import { API_BASE } from '../constants/api';

class SessionService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.conversationId = null;
    this.isConnected = false;
  }

  async getSignedUrl(userProfile, userId = 'default') {
    const res = await fetch(`${API_BASE}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, userId }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ details: res.statusText }));
      throw new Error(error.details || 'Failed to start session');
    }

    return await res.json();
  }

  // Update user profile on the server (name, notes, etc.)
  async updateUserProfile(userId = 'default', updates) {
    try {
      const res = await fetch(`${API_BASE}/api/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Profile update failed:', e);
    }
    return null;
  }

  async connect(userProfile) {
    const { signedUrl, userProfile: serverProfile } = await this.getSignedUrl(userProfile);
    this.serverProfile = serverProfile;
    console.log('Got signed URL, connecting to ElevenLabs...');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(signedUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to ElevenLabs');
        this.isConnected = true;
        this._emit('connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error.message || error);
        this.isConnected = false;
        this._emit('error', { message: 'Connection error' });
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this._emit('disconnected');
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };
    });
  }

  _handleMessage(rawData) {
    try {
      const msg = JSON.parse(rawData);
      console.log('ElevenLabs msg type:', msg.type);

      switch (msg.type) {
        case 'conversation_initiation_metadata': {
          this.conversationId = msg.conversation_initiation_metadata_event?.conversation_id
            || msg.conversation_id;
          console.log('Conversation ID:', this.conversationId);
          this._emit('session_started', { conversationId: this.conversationId });
          break;
        }

        case 'audio': {
          // ElevenLabs sends audio as base64 in audio_event.audio_base_64
          const audioB64 = msg.audio_event?.audio_base_64
            || msg.audio?.chunk
            || msg.audio?.audio_base_64;
          if (audioB64) {
            this._emit('ai_audio', { audio: audioB64 });
          }
          break;
        }

        case 'agent_response': {
          const text = msg.agent_response_event?.agent_response
            || msg.agent_response;
          if (text) {
            this._emit('ai_text', { text });
          }
          break;
        }

        case 'user_transcript': {
          const text = msg.user_transcription_event?.user_transcript
            || msg.user_transcript;
          if (text) {
            this._emit('user_transcript', { text });
          }
          break;
        }

        case 'interruption':
          this._emit('interruption');
          break;

        case 'ping': {
          const eventId = msg.ping_event?.event_id || msg.event_id;
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'pong', event_id: eventId }));
          }
          break;
        }

        case 'agent_response_correction': {
          const text = msg.agent_response_correction_event?.agent_response;
          if (text) {
            this._emit('ai_text_correction', { text });
          }
          break;
        }

        case 'internal_tentative_agent_response':
        case 'internal_vad':
          // internal events, ignore
          break;

        default:
          console.log('Unhandled ElevenLabs event:', msg.type, JSON.stringify(msg).slice(0, 200));
      }
    } catch (err) {
      console.error('Message parse error:', err, rawData?.slice?.(0, 200));
    }
  }

  sendAudioChunk(base64Audio) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        user_audio_chunk: base64Audio,
      }));
    }
  }

  endSession() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    return () => {
      const cbs = this.listeners.get(eventType);
      if (cbs) {
        const idx = cbs.indexOf(callback);
        if (idx > -1) cbs.splice(idx, 1);
      }
    };
  }

  _emit(eventType, data = {}) {
    const cbs = this.listeners.get(eventType);
    if (cbs) cbs.forEach((cb) => cb(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.isConnected = false;
    this.conversationId = null;
  }
}

export default new SessionService();
