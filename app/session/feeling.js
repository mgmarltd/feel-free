import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../../src/components/GradientBackground';
import Character from '../../src/components/Character';
import ContinueButton from '../../src/components/ContinueButton';
import FeelingSpectrum from '../../src/components/FeelingSpectrum';
import { FONTS } from '../../src/constants/theme';

export default function SessionFeelingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [intensity, setIntensity] = useState(null);

  const handleStart = () => {
    router.push({
      pathname: '/session/call',
      params: {
        feelingIntensity: intensity,
        sessionType: params.sessionType || 'general',
      },
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.characterWrap}>
          <Character size={100} mood="happy" />
        </View>
        <Text style={styles.title}>Before we begin...</Text>
        <Text style={styles.subtitle}>
          How are you feeling right now? This helps me guide your session.
        </Text>

        <View style={styles.spectrum}>
          <FeelingSpectrum value={intensity} onChange={setIntensity} />
        </View>

        <ContinueButton
          onPress={handleStart}
          title="Start Session"
          disabled={!intensity}
        />
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
});
