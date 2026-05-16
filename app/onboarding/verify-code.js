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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../../src/components/GradientBackground';
import OnboardingHeader from '../../src/components/OnboardingHeader';
import ContinueButton from '../../src/components/ContinueButton';
import { API_BASE } from '../../src/constants/api';
import { updateUserProfile } from '../../src/services/userProfile';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function VerifyCodeScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const digitsOnly = code.replace(/\D/g, '').slice(0, 6);
  const ready = digitsOnly.length === 6;

  const handleVerify = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: digitsOnly }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }
      await updateUserProfile({
        email: data.email,
        authToken: data.token,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/onboarding/paywall');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Verification failed', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    Haptics.selectionAsync();
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed');
      Alert.alert('Code resent', `A new code is on its way to ${email}.`);
    } catch (e) {
      Alert.alert('Could not resend', 'Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <OnboardingHeader currentStep={20} totalSteps={20} />
          <View style={styles.content}>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>Sent to {email}</Text>

            <TextInput
              style={styles.input}
              value={digitsOnly}
              onChangeText={setCode}
              placeholder="••••••"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              editable={!submitting}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={resending}
              style={styles.resendRow}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.resendText}>
                {resending ? 'Sending…' : "Didn't get it? Resend code"}
              </Text>
            </TouchableOpacity>
          </View>
          <ContinueButton
            onPress={handleVerify}
            disabled={!ready || submitting}
            title={submitting ? 'Verifying…' : 'Verify'}
          />
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
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resendText: {
    color: COLORS.whiteMuted,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
