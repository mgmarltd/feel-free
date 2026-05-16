import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

const spectrumData = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😰', label: 'Very Bad' },
  { value: 3, emoji: '😟', label: 'Bad' },
  { value: 4, emoji: '😕', label: 'Not Great' },
  { value: 5, emoji: '😐', label: 'Okay' },
  { value: 6, emoji: '🙂', label: 'Decent' },
  { value: 7, emoji: '😊', label: 'Good' },
  { value: 8, emoji: '😄', label: 'Great' },
  { value: 9, emoji: '🤩', label: 'Amazing' },
  { value: 10, emoji: '🥳', label: 'Fantastic' },
];

const gradientColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#06b6d4',
  '#3b82f6', '#8b5cf6',
];

export default function FeelingSpectrum({ value, onChange }) {
  return (
    <View style={styles.container}>
      {/* Big emoji display */}
      <View style={styles.emojiDisplay}>
        <Text style={styles.bigEmoji}>
          {value ? spectrumData[value - 1].emoji : '🤔'}
        </Text>
        <Text style={styles.label}>
          {value ? spectrumData[value - 1].label : 'How do you feel?'}
        </Text>
        {value && (
          <Text style={styles.valueText}>{value}/10</Text>
        )}
      </View>

      {/* Spectrum bar */}
      <View style={styles.spectrumBar}>
        {spectrumData.map((item, index) => (
          <TouchableOpacity
            key={item.value}
            activeOpacity={0.7}
            onPress={() => onChange(item.value)}
            style={[
              styles.spectrumItem,
              value === item.value && styles.spectrumItemActive,
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: gradientColors[index] },
                value === item.value && styles.dotActive,
              ]}
            />
            {value === item.value && (
              <Text style={styles.dotEmoji}>{item.emoji}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Labels */}
      <View style={styles.labels}>
        <Text style={styles.endLabel}>Terrible</Text>
        <Text style={styles.endLabel}>Fantastic</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emojiDisplay: {
    alignItems: 'center',
    marginBottom: 40,
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    color: COLORS.purpleLight,
    fontWeight: '600',
  },
  spectrumBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 60,
    paddingHorizontal: 8,
  },
  spectrumItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  spectrumItemActive: {
    zIndex: 10,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.5,
  },
  dotActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 1,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  dotEmoji: {
    position: 'absolute',
    top: -30,
    fontSize: 24,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  endLabel: {
    color: COLORS.whiteMuted,
    fontSize: 12,
  },
});
