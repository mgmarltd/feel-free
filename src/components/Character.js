import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

export default function Character({ size = 220, mood = 'happy' }) {
  const half = size / 2;

  const getExpression = () => {
    switch (mood) {
      case 'wink':
        return (
          <>
            {/* Left eye - winking (arc) */}
            <Path
              d={`M ${half - 30} ${half - 15} Q ${half - 22} ${half - 25} ${half - 14} ${half - 15}`}
              stroke="#333"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Right eye */}
            <Circle cx={half + 22} cy={half - 12} r={5} fill="#333" />
            {/* Smile */}
            <Path
              d={`M ${half - 18} ${half + 12} Q ${half} ${half + 30} ${half + 18} ${half + 12}`}
              stroke="#333"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
      case 'happy':
      default:
        return (
          <>
            {/* Left eye */}
            <Circle cx={half - 25} cy={half - 12} r={5} fill="#333" />
            {/* Right eye */}
            <Circle cx={half + 25} cy={half - 12} r={5} fill="#333" />
            {/* Left eyebrow arc */}
            <Path
              d={`M ${half - 35} ${half - 28} Q ${half - 25} ${half - 38} ${half - 15} ${half - 28}`}
              stroke="#333"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Right eyebrow arc */}
            <Path
              d={`M ${half + 15} ${half - 28} Q ${half + 25} ${half - 38} ${half + 35} ${half - 28}`}
              stroke="#333"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Smile */}
            <Path
              d={`M ${half - 18} ${half + 12} Q ${half} ${half + 28} ${half + 18} ${half + 12}`}
              stroke="#333"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.glow, { width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7 }]} />
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="bodyGrad" cx="50%" cy="40%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="70%" stopColor="#e8e0ff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.8" />
          </RadialGradient>
        </Defs>
        <Circle cx={half} cy={half} r={half - 5} fill="url(#bodyGrad)" />
        {getExpression()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(167,139,250,0.2)',
  },
});
