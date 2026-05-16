import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const ICON_SIZE = 40;
const DOT_SIZE = 5;
const CENTER = ICON_SIZE / 2 - DOT_SIZE / 2;

const DOT_PATTERNS = {
  1: [{ top: CENTER, left: CENTER }],
  3: [
    { top: 9, left: 17 },
    { top: 21, left: 9 },
    { top: 25, left: 24 },
  ],
  6: [
    { top: 9, left: 11 }, { top: 9, left: 24 },
    { top: 18, left: 11 }, { top: 18, left: 24 },
    { top: 27, left: 11 }, { top: 27, left: 24 },
  ],
};

export default function IntensityIcon({ level = 1, selected = false }) {
  const dots = DOT_PATTERNS[level] || DOT_PATTERNS[1];
  return (
    <View style={[styles.circle, selected && styles.circleSelected]}>
      {dots.map((pos, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            pos,
            selected && styles.dotSelected,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  circleSelected: {
    backgroundColor: 'rgba(167,139,250,0.25)',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.white,
  },
  dotSelected: {
    backgroundColor: COLORS.purpleLight,
  },
});
