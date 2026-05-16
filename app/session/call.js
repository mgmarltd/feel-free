import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { pcmChunksToWavBase64 } from '../../src/utils/pcmToWav';
import { playReadyCue } from '../../src/utils/cueChime';

// Initial buffer before starting playback — smooths out network jitter so the
// agent's voice doesn't stutter on slow connections. Start as soon as we have
// enough chunks OR the timeout elapses (whichever comes first).
const INITIAL_BUFFER_CHUNKS = 3;
const INITIAL_BUFFER_TIMEOUT_MS = 350;
import GradientBackground from '../../src/components/GradientBackground';
import Character from '../../src/components/Character';
import { COLORS } from '../../src/constants/theme';
import { useOnboarding } from '../../src/context/OnboardingContext';
import sessionService from '../../src/services/sessionService';
import { getUserProfile, updateUserProfile } from '../../src/services/userProfile';
import { endSession as endSessionApi } from '../../src/services/homeworkService';

// Audio modes
const PLAYBACK_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
};

const RECORDING_MODE = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
};

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data: onboardingData } = useOnboarding();

  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiText, setAiText] = useState('Rehberine bağlanılıyor...');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messages, setMessages] = useState([]);

  const soundRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const prebufferTimerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const listenPulse = useRef(new Animated.Value(0.4)).current;
  const timerRef = useRef(null);
  const scrollRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingLoopRef = useRef(false);
  const mountedRef = useRef(true);

  // Pulse animation when AI speaks
  useEffect(() => {
    if (isAISpeaking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isAISpeaking]);

  // Listening indicator pulse
  useEffect(() => {
    if (isListening && !isMuted) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(listenPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(listenPulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isListening, isMuted]);

  // Session timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Main session lifecycle
  useEffect(() => {
    mountedRef.current = true;
    initSession();
    return () => {
      mountedRef.current = false;
      stopRecordingLoop();
      sessionService.disconnect();
      stopAudioPlayback();
    };
  }, []);

  const initSession = async () => {
    const t0 = Date.now();
    console.log('[call] initSession start');
    try {
      console.log('[call] requesting mic permission…');
      const { granted } = await Audio.requestPermissionsAsync();
      console.log('[call] mic permission =', granted, `(${Date.now() - t0}ms)`);
      if (!granted) {
        Alert.alert('İzin gerekli', 'Seans için mikrofon erişimi gereklidir');
        setAiText('Mikrofon izni reddedildi.');
        return;
      }

      console.log('[call] setting playback mode…');
      await Audio.setAudioModeAsync(PLAYBACK_MODE);

      // Set up event handlers
      sessionService.on('session_started', () => {
        if (!mountedRef.current) return;
        console.log('[call] session_started event received');
        setAiText('Bağlandı! Calm burada...');
      });

      sessionService.on('ai_text', (data) => {
        if (!mountedRef.current || !data.text) return;
        setAiText(data.text);
        setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
      });

      sessionService.on('ai_audio', (data) => {
        if (!mountedRef.current || !data.audio) return;
        queueAudioChunk(data.audio);
      });

      sessionService.on('user_transcript', (data) => {
        if (!mountedRef.current || !data.text) return;
        setMessages((prev) => [...prev, { role: 'user', text: data.text }]);
      });

      sessionService.on('interruption', () => {
        stopAudioPlayback();
        setIsAISpeaking(false);
      });

      sessionService.on('error', (data) => {
        console.error('[call] session error event:', data?.message);
        if (mountedRef.current) {
          setAiText(`Bağlantı hatası: ${data?.message || 'bilinmiyor'}`);
        }
      });

      sessionService.on('disconnected', () => {
        console.log('[call] disconnected event received');
        if (mountedRef.current) setIsConnected(false);
      });

      // Load persistent user profile and merge with onboarding data
      console.log('[call] loading user profile…');
      const storedProfile = await getUserProfile();
      const fullProfile = {
        ...storedProfile,
        ...onboardingData,
        feelingIntensity: params.feelingIntensity,
        sessionType: params.sessionType,
      };
      console.log('[call] profile ready, name:', fullProfile?.name || '(new)');

      console.log('[call] calling sessionService.connect…');
      await sessionService.connect(fullProfile);
      console.log('[call] sessionService.connect resolved', `(total ${Date.now() - t0}ms)`);

      if (!mountedRef.current) return;
      setIsConnected(true);
      setAiText('Bağlandı! Rehberin hazırlanıyor...');

      // Start listening after a short delay
      setTimeout(() => {
        if (mountedRef.current) startRecordingLoop();
      }, 1500);
    } catch (error) {
      console.error('[call] initSession FAILED:', error?.message || error);
      if (mountedRef.current) {
        setAiText(`Bağlanılamadı: ${error?.message || 'bağlantı hatası'}`);
      }
    }
  };

  // ─── Continuous mic streaming ───
  // Pauses while AI is speaking, resumes after.

  const startRecordingLoop = async () => {
    recordingLoopRef.current = true;
    setIsListening(true);
    recordChunkLoop();
  };

  const stopRecordingLoop = async () => {
    recordingLoopRef.current = false;
    setIsListening(false);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
  };

  const recordChunkLoop = async () => {
    while (recordingLoopRef.current && mountedRef.current) {
      // Wait while AI is speaking — don't record
      if (isPlayingRef.current) {
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      try {
        // Switch to recording mode
        await Audio.setAudioModeAsync(RECORDING_MODE);

        const { recording } = await Audio.Recording.createAsync({
          isMeteringEnabled: true,
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          },
        });

        recordingRef.current = recording;

        // Record for ~1 second
        await new Promise((r) => setTimeout(r, 1000));

        if (!recordingLoopRef.current || !mountedRef.current) {
          try { await recording.stopAndUnloadAsync(); } catch (e) {}
          break;
        }

        // If AI started speaking mid-recording, stop and discard
        if (isPlayingRef.current) {
          try { await recording.stopAndUnloadAsync(); } catch (e) {}
          recordingRef.current = null;
          continue;
        }

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;

        if (uri && !isMuted) {
          const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          sessionService.sendAudioChunk(base64Audio);
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      } catch (error) {
        console.error('Recording chunk error:', error);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  // ─── Audio playback queue ───

  const queueAudioChunk = (base64Audio) => {
    audioQueueRef.current.push(base64Audio);

    // Already playing — finish handler will drain the queue
    if (isPlayingRef.current) return;

    // Start as soon as the prebuffer is full
    if (audioQueueRef.current.length >= INITIAL_BUFFER_CHUNKS) {
      if (prebufferTimerRef.current) {
        clearTimeout(prebufferTimerRef.current);
        prebufferTimerRef.current = null;
      }
      playNextChunk();
      return;
    }

    // Or after the prebuffer timeout, even if only one chunk arrived
    if (!prebufferTimerRef.current) {
      prebufferTimerRef.current = setTimeout(() => {
        prebufferTimerRef.current = null;
        if (!isPlayingRef.current && audioQueueRef.current.length > 0) {
          playNextChunk();
        }
      }, INITIAL_BUFFER_TIMEOUT_MS);
    }
  };

  const playNextChunk = async () => {
    // Drain ALL pending chunks into one combined WAV — one Sound load per
    // playback eliminates per-chunk gaps that sound like stutters.
    const chunks = audioQueueRef.current.splice(0, audioQueueRef.current.length);
    if (chunks.length === 0) {
      // AI just finished its turn — cue the user that it's their turn to speak
      // (matches the AnalysisDrawer flow).
      if (mountedRef.current) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await playReadyCue();
        // A new AI chunk could have streamed in during the cue — drain it
        // instead of stopping the playback session.
        if (audioQueueRef.current.length > 0) {
          playNextChunk();
          return;
        }
      }
      isPlayingRef.current = false;
      setIsAISpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsAISpeaking(true);

    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync(PLAYBACK_MODE);

      const wavBase64 = pcmChunksToWavBase64(chunks);
      const fileUri = FileSystem.cacheDirectory + `chunk_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          playNextChunk();
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      isPlayingRef.current = false;
      setIsAISpeaking(false);
    }
  };

  const stopAudioPlayback = async () => {
    if (prebufferTimerRef.current) {
      clearTimeout(prebufferTimerRef.current);
      prebufferTimerRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleEndSession = () => {
    Alert.alert(
      'Seansı Bitir?',
      'Bu tapping seansını bitirmek istediğinize emin misiniz?',
      [
        { text: 'Devam Et', style: 'cancel' },
        {
          text: 'Bitir',
          style: 'destructive',
          onPress: async () => {
            stopRecordingLoop();
            sessionService.endSession();
            stopAudioPlayback();

            // Try to extract user name from conversation if we don't have it
            const currentProfile = await getUserProfile();
            if (!currentProfile.name) {
              const nameFromChat = extractNameFromMessages(messages);
              if (nameFromChat) {
                await updateUserProfile({ name: nameFromChat });
                // Also update on server
                sessionService.updateUserProfile('default', { name: nameFromChat });
              }
            }

            // Increment session count locally
            await updateUserProfile({
              sessionCount: (currentProfile.sessionCount || 0) + 1,
              lastSessionDate: new Date().toISOString(),
            });

            // Ask the server to generate + save a homework based on this
            // session. Best-effort: don't block the user's exit if it fails.
            try {
              const res = await endSessionApi({
                sessionType: params.sessionType,
                messages,
                language: currentProfile.language || 'tr',
              });
              console.log('[call] homework created:', res?.homework?.title);
            } catch (e) {
              console.warn('[call] homework creation failed:', e?.message || e);
            }

            router.replace({
              pathname: '/session/summary',
              params: {
                feelingBefore: params.feelingIntensity,
                duration: sessionDuration,
                sessionType: params.sessionType,
              },
            });
          },
        },
      ]
    );
  };

  // Try to extract user's name from the conversation.
  // Conservative — only fires on explicit self-introductions, never on a bare "ben"
  // (which is just Turkish for "I" and appears in almost every sentence).
  const extractNameFromMessages = (msgs) => {
    // Common Turkish words that are never names — guards against the agent or user
    // saying things like "ben araba sürerken…" being parsed as name = "araba".
    const BLACKLIST = new Set([
      'ben', 'sen', 'biz', 'siz', 'onlar', 'bu', 'şu', 'o',
      'evet', 'hayır', 'tamam', 'iyi', 'kötü', 'fena',
      'araba', 'ev', 'iş', 'işim', 'evim', 'okul', 'okulum',
      'canım', 'kardeş', 'anne', 'baba', 'abla', 'abi', 'eş',
      'bilmiyorum', 'merhaba', 'selam', 'günaydın', 'sağol',
      'şey', 'şimdi', 'sonra', 'önce', 'bugün', 'dün', 'yarın',
      'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on',
      'çok', 'az', 'biraz', 'fazla',
      'efendim', 'hocam', 'usta', 'arkadaş', 'arkadaşım',
      'calm', 'sakin',
    ]);

    const isPlausibleName = (raw) => {
      if (!raw) return false;
      if (raw.length < 2 || raw.length > 20) return false;
      if (!/^[A-ZÇĞİÖŞÜa-zçğıöşü]+$/.test(raw)) return false;
      if (BLACKLIST.has(raw.toLowerCase())) return false;
      return true;
    };

    const normalize = (raw) => raw.charAt(0).toLocaleUpperCase('tr-TR') + raw.slice(1).toLocaleLowerCase('tr-TR');

    for (const msg of msgs) {
      if (msg.role === 'user' && msg.text) {
        // Only EXPLICIT self-introduction patterns. No bare "ben X".
        const patterns = [
          /\bbenim adım\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
          /\bbenim ismim\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
          /\badım\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
          /\bismim\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
          /\bbana\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s+(?:de|diyebilirsin|diyorlar|derler)\b/i,
        ];
        for (const p of patterns) {
          const match = msg.text.match(p);
          if (match?.[1] && isPlausibleName(match[1])) {
            return normalize(match[1]);
          }
        }
      }
      if (msg.role === 'ai' && msg.text) {
        // AI confirming the name — must start with uppercase and not be a generic filler.
        const aiPattern = /(?:merhaba|hoş geldin|tanıştığım[a-z]*\s+memnun[a-z]*\s+oldum)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/;
        const match = msg.text.match(aiPattern);
        if (match?.[1] && isPlausibleName(match[1])) {
          return match[1];
        }
      }
    }
    return null;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.sessionInfo}>
            <View style={[styles.liveDot, isConnected && styles.liveDotActive]} />
            <Text style={styles.sessionTime}>{formatTime(sessionDuration)}</Text>
          </View>
          <TouchableOpacity onPress={handleEndSession} style={styles.endButton}>
            <Text style={styles.endButtonText}>Bitir</Text>
          </TouchableOpacity>
        </View>

        {/* Character */}
        <View style={styles.characterSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Character size={180} mood={isAISpeaking ? 'wink' : 'happy'} />
          </Animated.View>
          {isAISpeaking && (
            <View style={styles.speakingIndicator}>
              <View style={[styles.soundBar, styles.bar1]} />
              <View style={[styles.soundBar, styles.bar2]} />
              <View style={[styles.soundBar, styles.bar3]} />
              <View style={[styles.soundBar, styles.bar4]} />
              <View style={[styles.soundBar, styles.bar3]} />
              <View style={[styles.soundBar, styles.bar2]} />
              <View style={[styles.soundBar, styles.bar1]} />
            </View>
          )}
          {!isAISpeaking && isListening && !isMuted && (
            <Animated.View style={[styles.listeningBadge, { opacity: listenPulse }]}>
              <Text style={styles.listeningText}>Dinleniyor...</Text>
            </Animated.View>
          )}
        </View>

        {/* Conversation */}
        <View style={styles.textSection}>
          <ScrollView
            ref={scrollRef}
            style={styles.messageScroll}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
          >
            {messages.slice(-6).map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === 'user' && styles.userMessageText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}
            {messages.length === 0 && (
              <Text style={styles.aiTextDisplay}>{aiText}</Text>
            )}
          </ScrollView>
        </View>

        {/* Controls */}
        <View style={styles.controlSection}>
          <TouchableOpacity
            onPress={toggleMute}
            activeOpacity={0.8}
            style={styles.micButtonOuter}
          >
            <View style={[styles.micButton, isMuted && styles.micButtonMuted]}>
              <Text style={styles.micIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.micHint}>
            {isMuted ? 'Sesi aç' : isAISpeaking ? 'Calm konuşuyor...' : 'Seni dinliyor...'}
          </Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 12,
  },
  sessionInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#666' },
  liveDotActive: { backgroundColor: '#22c55e' },
  sessionTime: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  endButton: {
    backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  endButtonText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  characterSection: { alignItems: 'center', paddingVertical: 20 },
  speakingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 16, height: 30 },
  soundBar: { width: 4, borderRadius: 2, backgroundColor: COLORS.purpleLight },
  bar1: { height: 8 }, bar2: { height: 16 }, bar3: { height: 24 }, bar4: { height: 30 },
  listeningBadge: {
    marginTop: 16, backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  listeningText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  textSection: { flex: 1, paddingHorizontal: 24 },
  messageScroll: { flex: 1 },
  messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 18, marginBottom: 10 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(139,92,246,0.15)', borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.1)', borderBottomRightRadius: 4 },
  messageText: { color: COLORS.white, fontSize: 15, lineHeight: 22 },
  userMessageText: { color: COLORS.whiteMuted },
  aiTextDisplay: { color: COLORS.white, fontSize: 16, lineHeight: 24, textAlign: 'center', fontStyle: 'italic' },
  controlSection: { alignItems: 'center', paddingBottom: 30, paddingTop: 16 },
  micButtonOuter: { alignItems: 'center', justifyContent: 'center' },
  micButton: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.purpleLight,
  },
  micButtonMuted: { backgroundColor: 'rgba(100,100,100,0.3)', borderColor: '#666' },
  micIcon: { fontSize: 28 },
  micHint: { color: COLORS.whiteMuted, fontSize: 13, marginTop: 10 },
});
