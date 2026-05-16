import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

export default function StressLines({ width = 200, height = 100 }) {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 200 100">
        {/* Tangled scribble lines */}
        <Path
          d="M 40 50 C 60 20, 80 80, 100 50 S 140 20, 160 50"
          stroke="rgba(167,139,250,0.5)"
          strokeWidth="2"
          fill="none"
        />
        <Path
          d="M 50 40 C 70 70, 90 10, 110 40 S 150 70, 170 40"
          stroke="rgba(196,181,253,0.4)"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d="M 30 55 C 55 25, 75 75, 95 45 S 135 25, 155 55"
          stroke="rgba(139,92,246,0.4)"
          strokeWidth="2"
          fill="none"
        />
        <Path
          d="M 60 45 Q 80 15, 100 45 T 140 45"
          stroke="rgba(167,139,250,0.6)"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d="M 45 60 C 65 30, 85 70, 105 40 S 145 60, 165 35"
          stroke="rgba(196,181,253,0.35)"
          strokeWidth="1.8"
          fill="none"
        />
        {/* Horizontal line underneath */}
        <Line
          x1="20"
          y1="85"
          x2="180"
          y2="85"
          stroke="rgba(167,139,250,0.3)"
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
