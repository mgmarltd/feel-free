import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '../constants/theme';

// A small drifting particle that floats upward and fades, on a loop.
function Particle({ delay, startX, size, drift }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 4200 + drift * 600,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [40, -120],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, drift * 14, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0, 0.7, 0.5, 0],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

export default function OnboardingInfo({ icon = 'sparkles', headline, body, points = [] }) {
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  // One value per bullet point for the staggered reveal.
  const pointAnims = useRef(points.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Headline + icon entrance.
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Staggered bullet reveal.
    Animated.stagger(
      140,
      pointAnims.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 420,
          delay: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();

    // Ambient pulsing glow ring behind the icon.
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // Gentle bobbing of the icon.
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, []);

  const headlineTranslate = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const iconScale = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });
  const floatTranslate = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.container}>
      <View style={styles.particleField} pointerEvents="none">
        <Particle delay={0} startX={40} size={8} drift={1} />
        <Particle delay={900} startX={130} size={5} drift={-1} />
        <Particle delay={1700} startX={220} size={10} drift={1} />
        <Particle delay={500} startX={290} size={6} drift={-1} />
      </View>

      <Animated.View
        style={[styles.iconArea, { transform: [{ translateY: floatTranslate }] }]}
      >
        <Animated.View
          style={[
            styles.pulseRing,
            { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
        />
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: iconScale }] }]}>
          <Ionicons name={icon} size={52} color={COLORS.white} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: enter,
          transform: [{ translateY: headlineTranslate }],
        }}
      >
        <Text style={styles.headline}>{headline}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </Animated.View>

      {points.length > 0 && (
        <View style={styles.points}>
          {points.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                styles.pointRow,
                {
                  opacity: pointAnims[i],
                  transform: [
                    {
                      translateX: pointAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.pointDot}>
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              </View>
              <Text style={styles.pointText}>{p}</Text>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  particleField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    bottom: '38%',
    backgroundColor: COLORS.purpleSoft,
  },
  iconArea: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(167,139,250,0.35)',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.purpleLight,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  headline: {
    ...FONTS.title,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    ...FONTS.subtitle,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  points: {
    marginTop: 32,
    alignSelf: 'stretch',
    gap: 16,
    paddingHorizontal: 8,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pointDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    ...FONTS.option,
    fontSize: 16,
    flexShrink: 1,
    lineHeight: 22,
  },
});
