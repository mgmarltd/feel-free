import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../src/components/GradientBackground';
import BottomDock from '../src/components/BottomDock';
import { COLORS, FONTS } from '../src/constants/theme';

export default function HomeworkScreen() {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>Homework</Text>
          <Text style={styles.subtitle}>Coming soon</Text>
        </View>
      </SafeAreaView>
      <BottomDock />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { ...FONTS.title, fontSize: 32, marginBottom: 8 },
  subtitle: { ...FONTS.subtitle },
});
