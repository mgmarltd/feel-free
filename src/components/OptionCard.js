import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

export default function OptionCard({ label, selected, onPress, emoji }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, selected && styles.selectedCard]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: COLORS.purpleLight,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  emoji: {
    fontSize: 24,
    marginRight: 14,
  },
  label: {
    ...FONTS.option,
    flex: 1,
  },
  selectedLabel: {
    color: COLORS.purpleLight,
  },
});
