import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import GradientBackground from '../../src/components/GradientBackground';
import Character from '../../src/components/Character';
import ContinueButton from '../../src/components/ContinueButton';
import { COLORS, FONTS } from '../../src/constants/theme';

const points = [
  {
    icon: '👆',
    title: 'What is EFT Tapping?',
    description:
      'EFT (Emotional Freedom Technique) combines gentle tapping on specific body points with focused attention on emotions.',
  },
  {
    icon: '🧠',
    title: 'How does it work?',
    description:
      'Tapping sends calming signals to the brain\'s stress center, reducing cortisol and helping you process difficult emotions.',
  },
  {
    icon: '✨',
    title: 'What can it help with?',
    description:
      'Anxiety, stress, pain, cravings, phobias, and more. Studies show it can reduce cortisol levels by up to 43%.',
  },
  {
    icon: '⏱️',
    title: 'How long does it take?',
    description:
      'Just 5-10 minutes a day can make a difference. Our guided sessions fit easily into your routine.',
  },
];

export default function EFTIntroScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.characterWrap}>
            <Character size={120} mood="happy" />
          </View>
          <Text style={styles.title}>Meet EFT Tapping</Text>
          <Text style={styles.subtitle}>Your new tool for emotional freedom</Text>

          {points.map((point, index) => (
            <View key={index} style={styles.card}>
              <LinearGradient
                colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.03)']}
                style={styles.cardInner}
              >
                <Text style={styles.cardIcon}>{point.icon}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{point.title}</Text>
                  <Text style={styles.cardDesc}>{point.description}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>
        <ContinueButton
          onPress={() => router.push('/onboarding/paywall')}
          title="I'm Ready!"
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
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
    marginBottom: 28,
  },
  card: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.whiteMuted,
    lineHeight: 20,
  },
});
