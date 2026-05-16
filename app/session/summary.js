import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import GradientBackground from '../../src/components/GradientBackground';
import Character from '../../src/components/Character';
import FeelingSpectrum from '../../src/components/FeelingSpectrum';
import ContinueButton from '../../src/components/ContinueButton';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const feelingBefore = parseInt(params.feelingBefore) || 5;
  const duration = parseInt(params.duration) || 0;

  const [feelingAfter, setFeelingAfter] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getImprovement = () => {
    if (!feelingAfter) return 0;
    return feelingAfter - feelingBefore;
  };

  const getEncouragement = () => {
    const diff = getImprovement();
    if (diff >= 3) return "Amazing progress! You're really connecting with the practice.";
    if (diff >= 1) return "Great session! Even small shifts add up over time.";
    if (diff === 0) return "Sometimes the benefits unfold slowly. Keep practicing!";
    return "That's okay — some sessions are about processing, not instant relief. You did great.";
  };

  if (!showResults) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.characterWrap}>
            <Character size={120} mood="happy" />
          </View>
          <Text style={styles.title}>Session Complete!</Text>
          <Text style={styles.subtitle}>
            How do you feel now? Let's compare with before.
          </Text>
          <View style={styles.spectrum}>
            <FeelingSpectrum value={feelingAfter} onChange={setFeelingAfter} />
          </View>
          <ContinueButton
            onPress={() => setShowResults(true)}
            title="See Results"
            disabled={!feelingAfter}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const improvement = getImprovement();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.characterWrap}>
          <Character size={120} mood="wink" />
        </View>
        <Text style={styles.title}>Your Progress</Text>

        {/* Before / After comparison */}
        <View style={styles.comparisonRow}>
          <LinearGradient
            colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.03)']}
            style={styles.compCard}
          >
            <Text style={styles.compLabel}>Before</Text>
            <Text style={styles.compValue}>{feelingBefore}/10</Text>
          </LinearGradient>

          <View style={styles.arrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>

          <LinearGradient
            colors={['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.03)']}
            style={styles.compCard}
          >
            <Text style={styles.compLabel}>After</Text>
            <Text style={styles.compValue}>{feelingAfter}/10</Text>
          </LinearGradient>
        </View>

        {/* Improvement badge */}
        <View style={[styles.badge, improvement > 0 ? styles.badgePositive : styles.badgeNeutral]}>
          <Text style={styles.badgeText}>
            {improvement > 0 ? `+${improvement}` : improvement === 0 ? '=' : improvement} points
          </Text>
        </View>

        {/* Encouragement */}
        <Text style={styles.encouragement}>{getEncouragement()}</Text>

        {/* Session stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatTime(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{params.sessionType || 'General'}</Text>
            <Text style={styles.statLabel}>Session Type</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <ContinueButton
            onPress={() => router.replace('/home')}
            title="Back to Home"
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  characterWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...FONTS.title,
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    ...FONTS.subtitle,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  spectrum: {
    flex: 1,
    justifyContent: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  compCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  compLabel: {
    color: COLORS.whiteMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  compValue: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },
  arrow: {
    width: 30,
    alignItems: 'center',
  },
  arrowText: {
    color: COLORS.purpleLight,
    fontSize: 24,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgePositive: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  badgeNeutral: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  encouragement: {
    ...FONTS.subtitle,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 30,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  statLabel: {
    color: COLORS.whiteMuted,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
});
