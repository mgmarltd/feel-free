import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { pcmChunksToWavBase64 } from './pcmToWav';

let cachedUri = null;

const SAMPLE_RATE = 16000;

// Two ascending soft tones (A5 → C#6), each ~140 ms with exponential decay.
// Lands as a friendly "your turn" cue, similar to AirPods earcons.
function generateChimePcmBase64() {
  const segmentMs = 140;
  const gapMs = 20;
  const segmentSamples = Math.floor((SAMPLE_RATE * segmentMs) / 1000);
  const gapSamples = Math.floor((SAMPLE_RATE * gapMs) / 1000);
  const totalSamples = segmentSamples * 2 + gapSamples;

  const samples = new Int16Array(totalSamples);
  const tones = [880, 1108.73]; // A5, C#6

  for (let seg = 0; seg < 2; seg++) {
    const baseOffset = seg === 0 ? 0 : segmentSamples + gapSamples;
    const freq = tones[seg];
    for (let i = 0; i < segmentSamples; i++) {
      const t = i / SAMPLE_RATE;
      const envelope = Math.exp(-t * 9); // quick bell-like decay
      const amplitude = 0.45;
      const value = Math.sin(2 * Math.PI * freq * t) * envelope * amplitude;
      samples[baseOffset + i] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
    }
  }

  const bytes = new Uint8Array(samples.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function ensureChimeFile() {
  if (cachedUri) return cachedUri;
  const pcmB64 = generateChimePcmBase64();
  const wavB64 = pcmChunksToWavBase64([pcmB64], SAMPLE_RATE, 1, 16);
  const uri = FileSystem.cacheDirectory + 'calmutopia_ready_chime.wav';
  await FileSystem.writeAsStringAsync(uri, wavB64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  cachedUri = uri;
  return uri;
}

// Plays the cue and resolves when playback finishes (or fails silently).
// Caller is responsible for being in playback-capable audio mode.
export async function playReadyCue() {
  try {
    const uri = await ensureChimeFile();
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 0.6 });
    await new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish || status.error) {
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      });
    });
  } catch (e) {
    // Non-fatal — UX nicety only
    console.warn('Ready cue playback failed:', e?.message || e);
  }
}
