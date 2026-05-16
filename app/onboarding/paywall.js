import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import GradientBackground from '../../src/components/GradientBackground';
import Character from '../../src/components/Character';
import ContinueButton from '../../src/components/ContinueButton';
import { COLORS, FONTS } from '../../src/constants/theme';

const plans = [
  {
    id: 'weekly',
    label: 'Weekly',
    price: '$4.99',
    period: '/week',
    tag: null,
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$39.99',
    period: '/year',
    tag: 'BEST VALUE',
    savings: 'Save 85%',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$9.99',
    period: '/month',
    tag: 'POPULAR',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('annual');

  const features = [
    'Unlimited guided EFT sessions',
    'Personalized tapping routines',
    'Progress tracking & insights',
    'New content added weekly',
    'Offline access',
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.characterWrap}>
            <Character size={100} mood="wink" />
          </View>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>Start your 7-day free trial</Text>

          <View style={styles.features}>
            {features.map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.checkmark}>&#10003;</Text>
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>

          <View style={styles.plans}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.8}
                onPress={() => setSelected(plan.id)}
                style={[
                  styles.planCard,
                  selected === plan.id && styles.planCardSelected,
                ]}
              >
                {plan.tag && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{plan.tag}</Text>
                  </View>
                )}
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={styles.planPrice}>
                  {plan.price}
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </Text>
                {plan.savings && (
                  <Text style={styles.savings}>{plan.savings}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ContinueButton
          onPress={() => router.replace('/home')}
          title="Start Free Trial"
        />
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.skip}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  characterWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...FONTS.title,
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 6,
  },
  subtitle: {
    ...FONTS.subtitle,
    textAlign: 'center',
    marginBottom: 20,
  },
  features: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkmark: {
    color: COLORS.purpleLight,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  featureText: {
    color: COLORS.white,
    fontSize: 15,
  },
  plans: {
    flexDirection: 'row',
    gap: 10,
  },
  planCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: COLORS.purpleLight,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  tag: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planLabel: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  planPrice: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.whiteMuted,
  },
  savings: {
    color: COLORS.purpleLight,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  skip: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  skipText: {
    color: COLORS.whiteMuted,
    fontSize: 14,
  },
});
