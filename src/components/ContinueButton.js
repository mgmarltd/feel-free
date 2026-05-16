import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';

export default function ContinueButton({ onPress, title = 'Continue Next', disabled = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.wrapper, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={['#1e1e3a', '#2a2a4e']}
        style={styles.button}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 30,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
  button: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  text: {
    ...FONTS.button,
    color: COLORS.white,
  },
});
