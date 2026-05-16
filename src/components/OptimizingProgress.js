import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '../constants/theme';

const MAX_LABEL_WIDTH = Dimensions.get('window').width * 0.78;

const STEP_DURATION_MS = 1600;
const COMPLETE_DELAY_MS = 350;

export default function OptimizingProgress({ steps, onComplete }) {
  // currentIdx points at the step actively in progress.
  // When currentIdx === steps.length, every step is done.
  const [currentIdx, setCurrentIdx] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    // Kick off the first step
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const timers = [];
    for (let i = 1; i <= steps.length; i++) {
      const isFinal = i === steps.length;
      const timer = setTimeout(() => {
        Haptics.impactAsync(
          isFinal
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
        setCurrentIdx(i);
        if (isFinal && !completedRef.current) {
          completedRef.current = true;
          const doneTimer = setTimeout(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete?.();
          }, COMPLETE_DELAY_MS);
          timers.push(doneTimer);
        }
      }, i * STEP_DURATION_MS);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  // Only render up to (and including) the currently-active step.
  // Pending items don't appear until their tick — gives each row breathing
  // room and time for any async work behind the next label.
  const visibleCount = Math.min(steps.length, currentIdx + 1);

  return (
    <View style={styles.container}>
      {steps.slice(0, visibleCount).map((label, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <View key={`${i}-${label}`} style={styles.row}>
            <View style={styles.iconWrap}>
              {isCompleted ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                </View>
              ) : isCurrent ? (
                <ActivityIndicator color={COLORS.purpleLight} />
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                isCompleted && styles.labelDone,
                isCurrent && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  label: {
    ...FONTS.option,
    fontSize: 17,
    flexShrink: 1,
    maxWidth: MAX_LABEL_WIDTH,
    lineHeight: 22,
  },
  labelDone: {
    color: COLORS.white,
  },
  labelActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  labelPending: {
    color: 'rgba(255,255,255,0.4)',
  },
});
