import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../src/constants/theme';
import Character from '../src/components/Character';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const titleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/onboarding/welcome');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Character size={180} mood="happy" />
      </Animated.View>
      <Animated.View style={{ opacity: titleFade, marginTop: 30 }}>
        <Text style={styles.title}>FEEL FREE</Text>
        <Text style={styles.subtitle}>Your EFT Tapping Companion</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.whiteMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
