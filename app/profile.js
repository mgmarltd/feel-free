import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import GradientBackground from '../src/components/GradientBackground';
import BottomDock, { DOCK_HEIGHT } from '../src/components/BottomDock';
import { useOnboarding } from '../src/context/OnboardingContext';
import {
  getUserProfile,
  updateUserProfile,
  clearUserProfile,
} from '../src/services/userProfile';
import { COLORS } from '../src/constants/theme';

const PRIVACY_URL = 'https://feelfree.app/privacy';
const CONTACT_EMAIL = 'hello@feelfree.app';

const LANGUAGE_LABELS = { tr: 'Türkçe', en: 'English' };

const GENDER_LABELS = { Male: 'Male', Female: 'Female', Other: 'Other' };

function getInitials(name, email, fallback = 'FF') {
  const source = name || (email ? email.split('@')[0] : '');
  if (!source) return fallback;
  const parts = String(source).trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function handleFromEmail(email) {
  if (!email || typeof email !== 'string') return '@you';
  const prefix = email.split('@')[0] || 'you';
  return '@' + prefix.slice(0, 24);
}

// Deterministic 4-hex referral code derived from the user identity. Stable
// per-user without needing a server-assigned code yet.
function deriveReferralCode(email, name) {
  const seed = (email || name || 'feelfree').toLowerCase();
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const hex = (Math.abs(h) % 0x10000).toString(16).toUpperCase().padStart(4, '0');
  return `FF-${hex}`;
}

function formatDob(dob) {
  if (!dob || typeof dob !== 'object') return null;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const m = months[dob.monthIndex] || '';
  return `${m} ${dob.day}, ${dob.year}`;
}

function relativeDate(iso) {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  const days = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: onboarding } = useOnboarding();
  const [profile, setProfile] = useState({});
  const [notifGranted, setNotifGranted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const p = await getUserProfile();
      setProfile(p || {});
    } catch (e) {}
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotifGranted(status === 'granted');
    } catch (e) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Derived data ─────────────────────────────────────────────────────
  const name = profile.name || null;
  const email = profile.email || null;
  const displayName = name || (email ? email.split('@')[0] : 'Welcome to Feel Free');
  const initials = getInitials(name, email);
  const handle = email ? handleFromEmail(email) : '@new_user';
  const referralCode = deriveReferralCode(email, name);

  const language = profile.language === 'en' ? 'en' : 'tr';
  const languageLabel = LANGUAGE_LABELS[language];

  const goal = onboarding?.goal || null;
  const dobValue = profile?.dob || onboarding?.dob;
  const dob = formatDob(dobValue);
  const genderValue = profile?.gender || onboarding?.gender;
  const gender = GENDER_LABELS[genderValue] || genderValue || null;
  const dailyRoutine = onboarding?.dailyRoutine || null;
  const knowsEFT = onboarding?.knowsEFT || null;
  const dailyCheckin = onboarding?.dailyCheckin || null;
  const meditates = onboarding?.meditates || null;
  const hasCoach = onboarding?.hasEFTCoach || null;

  const sessionCount = profile.sessionCount || 0;
  const lastSession = relativeDate(profile.lastSessionDate);
  const subscription = profile.subscription || 'Free';
  const healthConnected = profile.healthConnected ? 'On' : 'Off';

  // ─── Actions ──────────────────────────────────────────────────────────
  const tap = () => Haptics.selectionAsync();

  const handleLanguage = () => {
    tap();
    const options = ['Türkçe', 'English', 'Cancel'];
    const cancel = 2;
    const setLang = async (idx) => {
      if (idx === cancel || idx == null) return;
      const next = idx === 0 ? 'tr' : 'en';
      if (next === language) return;
      await updateUserProfile({ language: next });
      refresh();
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancel, title: 'Choose language' },
        setLang,
      );
    } else {
      Alert.alert('Choose language', null, [
        { text: 'Türkçe', onPress: () => setLang(0) },
        { text: 'English', onPress: () => setLang(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleShareReferral = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Try Feel Free — guided EFT tapping for stress & anxiety. Use my code ${referralCode} when you sign up to get a free month. https://feelfree.app/i/${referralCode}`,
      });
    } catch (e) {}
  };

  const handleContact = () => {
    tap();
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Feel%20Free%20support`).catch(() =>
      Alert.alert('No mail app', `Email us at ${CONTACT_EMAIL}`),
    );
  };

  const handlePrivacy = () => {
    tap();
    Linking.openURL(PRIVACY_URL).catch(() => {});
  };

  const handleDailyCheckin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (notifGranted) {
      Alert.alert(
        'Daily check-in',
        'Notifications are on. To turn them off, open iOS Settings → Feel Free → Notifications.',
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifGranted(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Notifications blocked',
        'Enable them in iOS Settings → Feel Free → Notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const handleAppleHealth = () => {
    tap();
    Alert.alert(
      'Apple Health',
      'Health sync isn\'t set up yet. We\'ll be able to read your sleep + heart-rate data once HealthKit is wired up.',
    );
  };

  const handleStreak = () => {
    tap();
    Alert.alert(
      'Streak & stats',
      `Sessions completed: ${sessionCount}\nLast session: ${lastSession}`,
    );
  };

  const handleGoal = () => {
    tap();
    Alert.alert(
      'Tapping goals',
      goal
        ? `Your current goal is "${goal}". Goal editing screen is coming soon.`
        : 'Set a goal during onboarding. Goal editing screen is coming soon.',
    );
  };

  const handleSubscription = () => {
    tap();
    Alert.alert(
      'Subscription',
      `Current plan: ${subscription}. Plan management is coming soon.`,
    );
  };

  const handlePersonalDetails = () => {
    tap();
    router.push('/personal-details');
  };

  const handlePreferences = () => {
    tap();
    const lines = [
      `Daily routine: ${dailyRoutine || '—'}`,
      `Meditates: ${meditates || '—'}`,
      `Knows EFT: ${knowsEFT || '—'}`,
      `Has coach: ${hasCoach || '—'}`,
      `Daily check-in: ${dailyCheckin || '—'}`,
    ];
    Alert.alert('Preferences', lines.join('\n'));
  };

  const handleHelp = () => {
    tap();
    Linking.openURL('https://feelfree.app/help').catch(() => {});
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign out',
      'Sign out of Feel Free? Your progress is saved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await clearUserProfile();
            router.replace('/onboarding/welcome');
          },
        },
      ],
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Text style={styles.title}>Profile</Text>

          {/* User card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePersonalDetails}
            style={styles.userCard}
          >
            <LinearGradient
              colors={['#34d399', '#10b981']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.userHandle} numberOfLines={1}>{handle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.whiteMuted} />
          </TouchableOpacity>

          {/* Invite Friends */}
          <Text style={styles.sectionLabel}>Invite Friends</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShareReferral}
            style={styles.bigCard}
          >
            <View style={styles.bigCardIcon}>
              <Ionicons name="person-add-outline" size={22} color={COLORS.white} />
            </View>
            <View style={styles.bigCardText}>
              <Text style={styles.bigCardTitle}>Refer a friend, get a free month</Text>
              <Text style={styles.bigCardDesc}>
                Share your code <Text style={styles.code}>{referralCode}</Text> — both of you get a month free.
              </Text>
            </View>
            <Ionicons name="share-outline" size={20} color={COLORS.whiteMuted} />
          </TouchableOpacity>

          {/* Account */}
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.menuGroup}>
            <Row icon="card-outline" label="Personal Details" value={name || email || 'Tap to view'} onPress={handlePersonalDetails} />
            <Divider />
            <Row icon="options-outline" label="Preferences" value={dailyRoutine ? 'Saved' : 'Empty'} onPress={handlePreferences} />
            <Divider />
            <Row icon="language-outline" label="Language" value={languageLabel} onPress={handleLanguage} />
            <Divider />
            <Row icon="diamond-outline" label="Subscription" value={subscription} onPress={handleSubscription} />
          </View>

          {/* Goals & Wellness */}
          <Text style={styles.sectionLabel}>Goals & Wellness</Text>
          <View style={styles.menuGroup}>
            <Row icon="heart-outline" label="Apple Health" value={healthConnected} onPress={handleAppleHealth} />
            <Divider />
            <Row icon="locate-outline" label="Tapping goal" value={goal || 'Not set'} onPress={handleGoal} />
            <Divider />
            <Row icon="flame-outline" label="Streak & stats" value={`${sessionCount} session${sessionCount === 1 ? '' : 's'}`} onPress={handleStreak} />
            <Divider />
            <Row icon="notifications-outline" label="Daily check-in" value={notifGranted ? 'On' : 'Off'} onPress={handleDailyCheckin} />
          </View>

          {/* Support */}
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.menuGroup}>
            <Row icon="help-circle-outline" label="Help & FAQ" onPress={handleHelp} />
            <Divider />
            <Row icon="mail-outline" label="Contact us" value={CONTACT_EMAIL} onPress={handleContact} />
            <Divider />
            <Row icon="shield-checkmark-outline" label="Privacy" onPress={handlePrivacy} />
            <Divider />
            <Row icon="log-out-outline" label="Sign out" onPress={handleSignOut} danger />
          </View>

          <Text style={styles.versionText}>Feel Free v1.0.0</Text>
          <View style={{ height: DOCK_HEIGHT + 30 }} />
        </ScrollView>
      </SafeAreaView>
      <BottomDock />
    </GradientBackground>
  );
}

function Row({ icon, label, value, onPress, danger }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? '#ef4444' : COLORS.white}
        style={{ marginRight: 14 }}
      />
      <Text
        style={[styles.rowLabel, danger && styles.rowLabelDanger]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!!value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={COLORS.whiteMuted} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 18,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userInfo: { flex: 1 },
  userName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  userHandle: {
    color: COLORS.whiteMuted,
    fontSize: 14,
    marginTop: 2,
  },

  sectionLabel: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  bigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  bigCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCardText: { flex: 1 },
  bigCardTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bigCardDesc: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  code: {
    color: COLORS.purpleLight,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  menuGroup: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowLabel: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  rowLabelDanger: {
    color: '#ef4444',
  },
  rowValue: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 140,
    marginRight: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginLeft: 50,
  },

  versionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
