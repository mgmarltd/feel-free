import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../constants/theme';

export default function GradientBackground({ children, style }) {
  return (
    <LinearGradient colors={GRADIENTS.background} style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
