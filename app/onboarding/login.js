import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../../src/components/GradientBackground';
import OnboardingHeader from '../../src/components/OnboardingHeader';
import { updateUserProfile } from '../../src/services/userProfile';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  const handleAuth = async (provider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (provider === 'email') {
      router.push('/onboarding/email');
      return;
    }
    // TODO: wire Apple (expo-apple-authentication) + Google (expo-auth-session).
    // For now, mark the user as logged in with a placeholder token so the
    // splash gate skips onboarding on subsequent launches.
    await updateUserProfile({
      authToken: `${provider}_stub_${Date.now()}`,
      authProvider: provider,
    });
    router.push('/onboarding/paywall');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={19} totalSteps={20} />
        <View style={styles.content}>
          <Text style={styles.title}>Save your progress</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={() => handleAuth('apple')}
              activeOpacity={0.85}
              style={styles.appleBtn}
            >
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={styles.appleText}>Sign in with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAuth('google')}
              activeOpacity={0.85}
              style={styles.googleBtn}
            >
              <View style={styles.googleIconWrap}>
                <FontAwesome name="google" size={18} color="#4285F4" />
              </View>
              <Text style={styles.googleText}>Sign in with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAuth('email')}
              activeOpacity={0.85}
              style={styles.emailBtn}
            >
              <Ionicons name="mail-outline" size={20} color={COLORS.white} />
              <Text style={styles.emailText}>Continue with email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
  buttons: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 80,
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0a0a14',
    borderRadius: 32,
    paddingVertical: 18,
  },
  appleText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingVertical: 18,
  },
  googleIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: '#0a0a14',
    fontSize: 17,
    fontWeight: '700',
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderRadius: 32,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  emailText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
