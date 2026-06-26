import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Character from './Character';
import analysisService from '../services/analysisService';
import { useOnboarding } from '../context/OnboardingContext';
import { getLanguage } from '../services/userProfile';
import { pcmChunksToWavBase64 } from '../utils/pcmToWav';
import { playReadyCue } from '../utils/cueChime';
import { COLORS } from '../constants/theme';

const DRAWER_HEIGHT = Dimensions.get('window').height * 0.85;

const CLOSING_PHRASES = [
  'optimizing your calmutopia system',
  'calmutopia sistemini şimdi senin için optimize',
];

const INITIAL_BUFFER_CHUNKS = 3;
const INITIAL_BUFFER_TIMEOUT_MS = 350;

const PLAYBACK_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
};

const RECORDING_MODE = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
};

export default function AnalysisDrawer({ visible, onClose, onComplete, mode = 'voice' }) {
  const { data: onboardingData } = useOnboarding();
  const isTextMode = mode === 'text';

  // connecting → conversing → wrapping → done
  const [phase, setPhase] = useState('connecting');
  const [latestAi, setLatestAi] = useState('');
  const [latestUser, setLatestUser] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [hasHeardFirstAI, setHasHeardFirstAI] = useState(false);
  const [textDraft, setTextDraft] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const prebufferTimerRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingLoopRef = useRef(false);
  const mountedRef = useRef(false);
  const wrappingRef = useRef(false);
  const transcriptRef = useRef('');
  const finalSummaryRef = useRef('');

  // Track keyboard so the input row lifts above it inside the fixed-height
  // drawer (KeyboardAvoidingView is unreliable inside a Modal with a custom
  // height container).
  useEffect(() => {
    if (!isTextMode) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      const h = e?.endCoordinates?.height || 280;
      Animated.timing(keyboardOffset, {
        toValue: h,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e?.duration || 220,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [isTextMode]);

  useEffect(() => {
    if (isAISpeaking) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [isAISpeaking]);

  useEffect(() => {
    if (!visible) return;
    mountedRef.current = true;
    wrappingRef.current = false;
    transcriptRef.current = '';
    finalSummaryRef.current = '';
    setPhase('connecting');
    setLatestAi('');
    setLatestUser('');
    setHasHeardFirstAI(false);
    setTextDraft('');
    start();
    return () => {
      mountedRef.current = false;
      teardown();
    };
  }, [visible]);

  const start = async () => {
    try {
      if (!isTextMode) {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Mic permission required', 'Enable microphone access to do the analysis.');
          onClose?.();
          return;
        }
      }
      await Audio.setAudioModeAsync(PLAYBACK_MODE);

      analysisService.on('ai_text', (data) => {
        if (!mountedRef.current || !data.text) return;
        setLatestAi(data.text);
        const lower = data.text.toLowerCase();
        if (!wrappingRef.current && CLOSING_PHRASES.some((p) => lower.includes(p))) {
          wrappingRef.current = true;
          finalSummaryRef.current = data.text;
          setPhase('wrapping');
        }
      });

      analysisService.on('ai_audio', (data) => {
        if (!mountedRef.current || !data.audio) return;
        if (!hasHeardFirstAI) setHasHeardFirstAI(true);
        queueAudioChunk(data.audio);
      });

      analysisService.on('user_transcript', (data) => {
        if (!mountedRef.current || !data.text) return;
        setLatestUser(data.text);
        transcriptRef.current = transcriptRef.current
          ? transcriptRef.current + ' ' + data.text
          : data.text;
      });

      analysisService.on('interruption', () => {
        stopAudioPlayback();
        setIsAISpeaking(false);
      });

      // Resolve language from the stored user profile (set by the home
       // TR/EN toggle and the profile screen). Defaults pick up device
       // locale on first launch — see userProfile.js DEFAULT_PROFILE.
      const language = await getLanguage();
      console.log('[analysisDrawer] connecting with language =', language);
      await analysisService.connect(onboardingData || {}, { language });
      if (!mountedRef.current) return;
      setPhase('conversing');

      if (!isTextMode) {
        setTimeout(() => {
          if (mountedRef.current) startRecordingLoop();
        }, 800);
      }
    } catch (e) {
      console.error('Analysis start error:', e);
      if (mountedRef.current) {
        Alert.alert('Connection error', 'Could not start the analysis. Please try again.');
        onClose?.();
      }
    }
  };

  const teardown = async () => {
    stopRecordingLoop();
    analysisService.disconnect();
    stopAudioPlayback();
  };

  // ─── Voice mode: recording loop ───
  const startRecordingLoop = async () => {
    recordingLoopRef.current = true;
    recordChunkLoop();
  };
  const stopRecordingLoop = async () => {
    recordingLoopRef.current = false;
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
  };
  const recordChunkLoop = async () => {
    while (recordingLoopRef.current && mountedRef.current) {
      if (isPlayingRef.current) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      try {
        await Audio.setAudioModeAsync(RECORDING_MODE);
        if (isPlayingRef.current || !recordingLoopRef.current || !mountedRef.current) continue;

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
        await new Promise((r) => setTimeout(r, 1000));
        if (!recordingLoopRef.current || !mountedRef.current) {
          if (recordingRef.current === recording) {
            try { await recording.stopAndUnloadAsync(); } catch (e) {}
            recordingRef.current = null;
          }
          break;
        }
        if (isPlayingRef.current) {
          if (recordingRef.current === recording) {
            try { await recording.stopAndUnloadAsync(); } catch (e) {}
            recordingRef.current = null;
          }
          continue;
        }
        // Another path (e.g. playNextChunk) may have already unloaded this
        // recording during the await above. Only unload if we still own it.
        if (recordingRef.current !== recording) {
          continue;
        }
        let uri = null;
        try {
          await recording.stopAndUnloadAsync();
          uri = recording.getURI();
        } catch (e) {
          // Recording was unloaded by another path between our check and now —
          // benign, just skip this chunk.
          recordingRef.current = null;
          continue;
        }
        recordingRef.current = null;
        if (uri) {
          const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          analysisService.sendAudioChunk(base64Audio);
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      } catch (e) {
        const msg = String(e?.message || e);
        if (msg.includes('Recording not allowed')) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        console.error('Analysis recording chunk error:', e);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  };

  // ─── Playback queue ───
  const queueAudioChunk = (base64Audio) => {
    audioQueueRef.current.push(base64Audio);
    if (isPlayingRef.current) return;
    if (audioQueueRef.current.length >= INITIAL_BUFFER_CHUNKS) {
      if (prebufferTimerRef.current) {
        clearTimeout(prebufferTimerRef.current);
        prebufferTimerRef.current = null;
      }
      playNextChunk();
      return;
    }
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
    const chunks = audioQueueRef.current.splice(0, audioQueueRef.current.length);
    if (chunks.length === 0) {
      if (mountedRef.current && !wrappingRef.current && !isTextMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await playReadyCue();
        if (audioQueueRef.current.length > 0) {
          playNextChunk();
          return;
        }
      }
      isPlayingRef.current = false;
      setIsAISpeaking(false);
      if (wrappingRef.current && mountedRef.current) {
        await finishAndClose();
      }
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
      const fileUri = FileSystem.cacheDirectory + `analysis_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, volume: 1.0 },
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          playNextChunk();
        }
      });
    } catch (e) {
      console.error('Analysis playback error:', e);
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
      try { await soundRef.current.stopAsync(); } catch (e) {}
      try { await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null;
    }
  };

  const finishAndClose = async () => {
    if (!mountedRef.current) return;
    setPhase('done');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await teardown();
    onComplete?.({
      transcript: transcriptRef.current,
      summary: finalSummaryRef.current,
    });
  };

  const handleClose = async () => {
    Haptics.selectionAsync();
    await teardown();
    onClose?.();
  };

  const handleSendText = () => {
    const text = textDraft.trim();
    if (!text) return;
    Haptics.selectionAsync();
    setLatestUser(text);
    transcriptRef.current = transcriptRef.current
      ? transcriptRef.current + ' ' + text
      : text;
    analysisService.sendTextMessage(text);
    setTextDraft('');
  };

  const statusFor = (p) => {
    switch (p) {
      case 'connecting':
        return 'Connecting…';
      case 'conversing':
        if (isAISpeaking) return 'Reflecting…';
        if (!hasHeardFirstAI) return 'Hold on… your guide is about to speak.';
        return isTextMode ? 'Your turn to type.' : 'Listening…';
      case 'wrapping':
        return 'Optimizing your system…';
      case 'done':
        return 'All set.';
      default:
        return '';
    }
  };

  const hint =
    phase === 'conversing' && !hasHeardFirstAI
      ? isTextMode
        ? 'Wait for the guide, then type below.'
        : 'Wait for the chime, then speak.'
      : phase === 'conversing' && !isAISpeaking && hasHeardFirstAI && !isTextMode
        ? "Pause when you're done — I'll respond."
        : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.drawer}>
          <LinearGradient
            colors={['#1a0a2e', '#2d1b4e', '#4c1d95']}
            style={styles.gradient}
          >
            <SafeAreaView style={styles.safe} edges={['bottom']}>
                <View style={styles.topBar}>
                  <View style={styles.grabber} />
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.characterWrap}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Character size={160} mood={isAISpeaking ? 'wink' : 'happy'} />
                  </Animated.View>
                  <Text style={styles.status}>{statusFor(phase)}</Text>
                  {hint && <Text style={styles.hint}>{hint}</Text>}
                </View>

                <View style={styles.bubblesWrap}>
                  {phase === 'connecting' ? (
                    <View style={styles.centerWrap}>
                      <ActivityIndicator color={COLORS.purpleLight} />
                    </View>
                  ) : (
                    <>
                      {!!latestAi && (
                        <View style={[styles.bubble, styles.aiBubble]}>
                          <Text style={styles.bubbleText}>{latestAi}</Text>
                        </View>
                      )}
                      {!!latestUser && (
                        <View style={[styles.bubble, styles.userBubble]}>
                          <Text style={styles.bubbleText}>{latestUser}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {isTextMode && phase === 'conversing' && (
                  <Animated.View style={[styles.inputRow, { marginBottom: keyboardOffset }]}>
                    <TextInput
                      style={styles.input}
                      value={textDraft}
                      onChangeText={setTextDraft}
                      placeholder="Type your reply…"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      multiline
                      maxLength={500}
                      editable={!isAISpeaking}
                      onSubmitEditing={handleSendText}
                      returnKeyType="send"
                      blurOnSubmit
                    />
                    <TouchableOpacity
                      onPress={handleSendText}
                      disabled={!textDraft.trim() || isAISpeaking}
                      activeOpacity={0.85}
                      style={[
                        styles.sendBtn,
                        (!textDraft.trim() || isAISpeaking) && styles.sendBtnDisabled,
                      ]}
                    >
                      <Ionicons name="arrow-up" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </SafeAreaView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  drawer: {
    height: DRAWER_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  gradient: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 8,
  },
  grabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginLeft: '46%',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  characterWrap: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 18,
  },
  status: {
    color: COLORS.whiteMuted,
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bubblesWrap: {
    flex: 1,
    gap: 10,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    padding: 14,
    borderRadius: 18,
    maxWidth: '92%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
