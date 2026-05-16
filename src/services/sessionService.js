import { API_BASE } from '../constants/api';

class SessionService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.conversationId = null;
    this.isConnected = false;
  }

  async getSignedUrl(userProfile, userId = 'default') {
    const url = `${API_BASE}/api/session/start`;
    const t0 = Date.now();
    console.log('[session] POST', url);
    // Hard 10s fetch timeout — see analysisService for rationale.
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, userId }),
        signal: ctrl.signal,
      });
    } catch (e) {
      const isAbort = e?.name === 'AbortError';
      console.error(
        '[session] fetch FAILED',
        `(${Date.now() - t0}ms)`,
        isAbort ? 'TIMEOUT — host unreachable?' : (e?.message || e),
      );
      throw new Error(
        isAbort
          ? `Cannot reach server at ${API_BASE} (10s timeout). Check the device can route to that IP.`
          : `Cannot reach server at ${API_BASE} — ${e?.message || e}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
    console.log('[session] fetch responded', res.status, `(${Date.now() - t0}ms)`);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ details: res.statusText }));
      console.error('[session] server error body:', error);
      throw new Error(error.details || `start failed: ${res.status}`);
    }

    const json = await res.json();
    console.log('[session] signedUrl received, len:', String(json?.signedUrl || '').length);
    return json;
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
    const tConnectStart = Date.now();
    console.log('[session] connect() start');
    const { signedUrl, userProfile: serverProfile } = await this.getSignedUrl(userProfile);
    this.serverProfile = serverProfile;
    console.log('[session] opening WS to ElevenLabs…');

    const WS_OPEN_TIMEOUT_MS = 15000;

    return new Promise((resolve, reject) => {
      let settled = false;
      const tWsStart = Date.now();
      this.ws = new WebSocket(signedUrl);

      // Hard timeout — if onopen / onerror never fires, the user would stay
      // stuck on "Connecting" forever. Reject loudly instead.
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        const readyState = this.ws?.readyState;
        console.error(
          '[session] WS open TIMEOUT after',
          `${Date.now() - tWsStart}ms`,
          `readyState=${readyState}`,
        );
        try { this.ws?.close(); } catch (e) {}
        this._emit('error', { message: 'WebSocket open timeout' });
        reject(new Error(`WebSocket never opened (timeout ${WS_OPEN_TIMEOUT_MS}ms)`));
      }, WS_OPEN_TIMEOUT_MS);

      this.ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.log(
          '[session] WS OPEN',
          `(ws=${Date.now() - tWsStart}ms,`,
          `total=${Date.now() - tConnectStart}ms)`,
        );
        this.isConnected = true;
        this._emit('connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error(
          '[session] WS ERROR',
          `(after ${Date.now() - tWsStart}ms)`,
          'readyState=',
          this.ws?.readyState,
          'message:',
          error?.message || JSON.stringify(error) || error,
        );
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          this.isConnected = false;
          this._emit('error', { message: error?.message || 'Connection error' });
          reject(error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(
          '[session] WS CLOSE',
          `code=${event.code}`,
          `reason="${event.reason || ''}"`,
          `wasClean=${event.wasClean}`,
          `(after ${Date.now() - tWsStart}ms)`,
        );
        this.isConnected = false;
        this._emit('disconnected');
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error(`WS closed before open (code=${event.code})`));
        }
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };
    });
  }

  _handleMessage(rawData) {
    try {
      const msg = JSON.parse(rawData);
      if (msg.type === 'conversation_initiation_metadata') {
        console.log('[session] convo started — first message inbound');
      } else if (msg.type === 'audio') {
        if (!this._loggedFirstAudio) {
          this._loggedFirstAudio = true;
          console.log('[session] first audio chunk received');
        }
      } else if (msg.type !== 'ping' && msg.type !== 'audio') {
        console.log('[session] msg:', msg.type);
      }

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
    this._loggedFirstAudio = false;
  }
}

export default new SessionService();
