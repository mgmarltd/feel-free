import { API_BASE } from '../constants/api';

class AnalysisService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.conversationId = null;
    this.isConnected = false;
  }

  async _getSignedUrl(userProfile, userId = 'default', language) {
    const url = `${API_BASE}/api/analysis/start`;
    const t0 = Date.now();
    console.log('[analysis] POST', url);
    // Hard 10s fetch timeout — otherwise an unreachable host (e.g. dev's
    // Tailscale IP from a device not on the tailnet) hangs at TCP-connect
    // for the OS default (60-120s on iOS), looking like "stuck on connecting".
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, userId, language }),
        signal: ctrl.signal,
      });
    } catch (e) {
      const isAbort = e?.name === 'AbortError';
      console.error(
        '[analysis] fetch FAILED',
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
    console.log('[analysis] fetch responded', res.status, `(${Date.now() - t0}ms)`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ details: res.statusText }));
      console.error('[analysis] server error body:', err);
      throw new Error(err.details || `start failed: ${res.status}`);
    }
    const json = await res.json();
    console.log('[analysis] signedUrl received, len:', String(json?.signedUrl || '').length);
    return json;
  }

  async connect(userProfile, { language } = {}) {
    const tConnect = Date.now();
    console.log('[analysis] connect() start');
    const { signedUrl } = await this._getSignedUrl(userProfile, 'default', language);
    console.log('[analysis] opening WS…');

    const WS_OPEN_TIMEOUT_MS = 15000;

    return new Promise((resolve, reject) => {
      let settled = false;
      const tWs = Date.now();
      this.ws = new WebSocket(signedUrl);

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.error(
          '[analysis] WS open TIMEOUT after',
          `${Date.now() - tWs}ms`,
          `readyState=${this.ws?.readyState}`,
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
          '[analysis] WS OPEN',
          `(ws=${Date.now() - tWs}ms,`,
          `total=${Date.now() - tConnect}ms)`,
        );
        this.isConnected = true;
        this._emit('connected');
        resolve();
      };
      this.ws.onerror = (err) => {
        console.error(
          '[analysis] WS ERROR',
          `(after ${Date.now() - tWs}ms)`,
          'readyState=',
          this.ws?.readyState,
          err?.message || JSON.stringify(err) || err,
        );
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          this.isConnected = false;
          this._emit('error', { message: err?.message || 'Connection error' });
          reject(err);
        }
      };
      this.ws.onclose = (event) => {
        console.log(
          '[analysis] WS CLOSE',
          `code=${event.code}`,
          `reason="${event.reason || ''}"`,
          `wasClean=${event.wasClean}`,
          `(after ${Date.now() - tWs}ms)`,
        );
        this.isConnected = false;
        this._emit('disconnected');
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error(`WS closed before open (code=${event.code})`));
        }
      };
      this.ws.onmessage = (e) => this._handleMessage(e.data);
    });
  }

  _handleMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'conversation_initiation_metadata': {
          this.conversationId =
            msg.conversation_initiation_metadata_event?.conversation_id || msg.conversation_id;
          this._emit('session_started', { conversationId: this.conversationId });
          break;
        }
        case 'audio': {
          const audioB64 =
            msg.audio_event?.audio_base_64 ||
            msg.audio?.chunk ||
            msg.audio?.audio_base_64;
          if (audioB64) this._emit('ai_audio', { audio: audioB64 });
          break;
        }
        case 'agent_response': {
          const text = msg.agent_response_event?.agent_response || msg.agent_response;
          if (text) this._emit('ai_text', { text });
          break;
        }
        case 'user_transcript': {
          const text = msg.user_transcription_event?.user_transcript || msg.user_transcript;
          if (text) this._emit('user_transcript', { text });
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
          if (text) this._emit('ai_text_correction', { text });
          break;
        }
        case 'internal_tentative_agent_response':
        case 'internal_vad':
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Analysis msg parse error:', err);
    }
  }

  sendAudioChunk(base64Audio) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ user_audio_chunk: base64Audio }));
    }
  }

  sendTextMessage(text) {
    if (!text || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'user_message', text }));
  }

  on(eventType, cb) {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, []);
    this.listeners.get(eventType).push(cb);
    return () => {
      const cbs = this.listeners.get(eventType);
      if (cbs) {
        const i = cbs.indexOf(cb);
        if (i > -1) cbs.splice(i, 1);
      }
    };
  }

  _emit(eventType, data = {}) {
    const cbs = this.listeners.get(eventType);
    if (cbs) cbs.forEach((cb) => cb(data));
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.listeners.clear();
    this.isConnected = false;
    this.conversationId = null;
  }
}

export default new AnalysisService();
