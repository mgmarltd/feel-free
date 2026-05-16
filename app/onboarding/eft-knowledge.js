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

const options = [
  { label: "Never heard of it", emoji: '🤔' },
  { label: "I've heard of it but never tried", emoji: '👂' },
  { label: "I've tried it a few times", emoji: '👋' },
  { label: "I practice it regularly", emoji: '🧘' },
];

export default function EFTKnowledgeScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    updateData('knowsEFT', selected);
    router.push('/onboarding/eft-intro');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.characterWrap}>
          <Character size={100} mood="wink" />
        </View>
        <Text style={styles.title}>Do you know EFT?</Text>
        <Text style={styles.subtitle}>Emotional Freedom Technique — also known as "tapping"</Text>
        <View style={styles.options}>
          {options.map((item) => (
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
