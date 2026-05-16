import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../../src/components/GradientBackground';
import OnboardingHeader from '../../src/components/OnboardingHeader';
import { API_BASE } from '../../src/constants/api';
import { COLORS, FONTS } from '../../src/constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = email.trim();
  const isValid = EMAIL_RE.test(trimmed);

  const handleSend = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send code');
      }
      router.push({
        pathname: '/onboarding/verify-code',
        params: { email: trimmed },
      });
    } catch (e) {
      Alert.alert('Could not send code', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <OnboardingHeader currentStep={19} totalSteps={20} />
          <View style={styles.content}>
            <Text style={styles.title}>What's your email?</Text>
            <Text style={styles.subtitle}>
              We'll send you a 6-digit code to verify it.
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!submitting}
              maxLength={120}
            />
          </View>

          <View style={styles.dockOuter}>
            <BlurView intensity={60} tint="dark" style={styles.dock}>
              <View style={styles.dockInner}>
                <View style={styles.dockMeta}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.whiteMuted} />
                  <Text style={styles.dockMetaText} numberOfLines={1}>
                    {trimmed || 'Enter your email'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!isValid || submitting}
                  activeOpacity={0.85}
                  style={[
                    styles.dockBtn,
                    (!isValid || submitting) && styles.dockBtnDisabled,
                  ]}
                >
                  <Text style={styles.dockBtnText}>
                    {submitting ? 'Sending…' : 'Send'}
                  </Text>
                  {!submitting && (
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    ...FONTS.title,
    fontSize: 30,
    marginBottom: 10,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginBottom: 28,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '500',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  dockOuter: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dock: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(20,10,40,0.45)',
  },
  dockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
  },
  dockMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dockMetaText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  dockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  dockBtnDisabled: {
    opacity: 0.5,
  },
  dockBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
