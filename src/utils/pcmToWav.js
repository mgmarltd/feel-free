/**
 * Wraps raw PCM base64 audio from ElevenLabs into a playable WAV base64 string.
 * ElevenLabs Conversational AI outputs: PCM 16-bit signed LE, mono, 16kHz
 */

function encodeBase64(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

function decodeBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function pcmToWavBase64(pcmBase64, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
  return pcmChunksToWavBase64([pcmBase64], sampleRate, numChannels, bitsPerSample);
}

// Concatenate multiple raw PCM base64 chunks into a single WAV base64.
// One Sound load instead of N — eliminates inter-chunk playback gaps that
// otherwise sound like stutters on slow / jittery networks.
export function pcmChunksToWavBase64(pcmBase64Chunks, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
  const chunks = pcmBase64Chunks.map(decodeBase64);
  const dataSize = chunks.reduce((sum, c) => sum + c.length, 0);
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  let offset = headerSize;
  for (const chunk of chunks) {
    wavBytes.set(chunk, offset);
    offset += chunk.length;
  }

  return encodeBase64(wavBytes);
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
