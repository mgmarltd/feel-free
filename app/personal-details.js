import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../src/components/GradientBackground';
import OnboardingHeader from '../src/components/OnboardingHeader';
import ContinueButton from '../src/components/ContinueButton';
import WheelPicker from '../src/components/WheelPicker';
import { useOnboarding } from '../src/context/OnboardingContext';
import { getUserProfile, updateUserProfile } from '../src/services/userProfile';
import { COLORS, FONTS } from '../src/constants/theme';

const GENDERS = ['Male', 'Female', 'Other'];
const DEFAULT_DOB = { monthIndex: 0, day: 1, year: 1995 };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
function formatDob(d) {
  if (!d) return '';
  return `${MONTHS[d.monthIndex] || ''} ${d.day}, ${d.year}`;
}

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { data: onboarding, updateData } = useOnboarding();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState(null);
  const [dob, setDob] = useState(DEFAULT_DOB);
  const [dobOpen, setDobOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getUserProfile()
      .then((p) => {
        if (!alive) return;
        setName(p?.name || '');
        setEmail(p?.email || '');
        setGender(p?.gender || onboarding?.gender || null);
        setDob(p?.dob || onboarding?.dob || DEFAULT_DOB);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateUserProfile({
        name: name.trim() || null,
        gender,
        dob,
      });
      // Mirror to the in-memory onboarding context so the Profile screen
      // and the rest of the app see the change immediately.
      if (gender !== onboarding?.gender) updateData('gender', gender);
      if (dob && dob !== onboarding?.dob) updateData('dob', dob);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <OnboardingHeader currentStep={1} totalSteps={1} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Personal Details</Text>
            <Text style={styles.subtitle}>Update what we know about you.</Text>

            {/* Name */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="words"
              maxLength={60}
              editable={loaded && !saving}
            />

            {/* Email (read-only) */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.emailText} numberOfLines={1}>
                {email || 'Not set'}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.whiteMuted} />
            </View>
            <Text style={styles.helper}>
              Email is tied to your login. Sign out and sign in again to change it.
            </Text>

            {/* Gender */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segmentRow}>
              {GENDERS.map((g) => {
                const selected = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setGender(g);
                    }}
                    activeOpacity={0.8}
                    style={[styles.segment, selected && styles.segmentActive]}
                  >
                    <Text
                      style={[styles.segmentText, selected && styles.segmentTextActive]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* DOB */}
            <Text style={styles.label}>Date of birth</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setDobOpen((v) => !v);
              }}
              activeOpacity={0.8}
              style={[styles.input, styles.dobRow]}
            >
              <Text style={styles.dobText}>{formatDob(dob) || 'Tap to set'}</Text>
              <Ionicons
                name={dobOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.whiteMuted}
              />
            </TouchableOpacity>
            {dobOpen && (
              <View style={styles.pickerWrap}>
                <WheelPicker value={dob} onChange={setDob} />
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
          <ContinueButton
            onPress={handleSave}
            disabled={!loaded || saving}
            title={saving ? 'Saving…' : 'Save'}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    ...FONTS.title,
    fontSize: 30,
    marginBottom: 8,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginBottom: 28,
  },
  label: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  emailText: {
    flex: 1,
    color: COLORS.whiteMuted,
    fontSize: 16,
  },
  helper: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderColor: COLORS.purpleLight,
  },
  segmentText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.purpleLight,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dobText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  pickerWrap: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
