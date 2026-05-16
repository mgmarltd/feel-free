import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '../constants/theme';

export default function ContinueButton({ onPress, title = 'Continue', disabled = false }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.85}
      style={styles.wrapper}
    >
      {disabled ? (
        <View style={[styles.button, styles.disabledButton]}>
          <Text style={[styles.text, styles.disabledText]}>{title}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={['#3a2a6e', '#2a1d52']}
          style={styles.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.text}>{title}</Text>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 32,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 32,
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  text: {
    ...FONTS.button,
    color: COLORS.white,
  },
  disabledText: {
    color: 'rgba(255,255,255,0.45)',
  },
});
