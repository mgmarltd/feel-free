import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../../src/components/GradientBackground';
import OptionCard from '../../src/components/OptionCard';
import ContinueButton from '../../src/components/ContinueButton';
import Character from '../../src/components/Character';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { FONTS } from '../../src/constants/theme';

const feelings = [
  { label: 'Stressed & overwhelmed', emoji: '😰' },
  { label: 'Anxious & worried', emoji: '😟' },
  { label: 'Sad & low energy', emoji: '😢' },
  { label: 'Frustrated & angry', emoji: '😤' },
  { label: 'Okay, but could be better', emoji: '😐' },
  { label: 'Pretty good actually!', emoji: '😊' },
];

export default function FeelingScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    updateData('feeling', selected);
    router.push('/onboarding/eft-knowledge');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.characterWrap}>
          <Character size={100} mood="happy" />
        </View>
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.subtitle}>Be honest — there's no wrong answer here</Text>
        <View style={styles.options}>
          {feelings.map((item) => (
            <OptionCard
              key={item.label}
              label={item.label}
              emoji={item.emoji}
              selected={selected === item.label}
              onPress={() => setSelected(item.label)}
            />
          ))}
        </View>
        <View style={styles.bottom}>
          <ContinueButton onPress={handleContinue} disabled={!selected} />
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
    marginBottom: 28,
    paddingHorizontal: 40,
  },
  options: {
    paddingHorizontal: 24,
    flex: 1,
  },
  bottom: {
    paddingBottom: 10,
  },
});
