import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../src/components/GradientBackground';
import BottomDock, { DOCK_HEIGHT } from '../src/components/BottomDock';
import { listHomeworks, completeHomework } from '../src/services/homeworkService';
import { COLORS } from '../src/constants/theme';

function relativeDate(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function HomeworkScreen() {
  const [homeworks, setHomeworks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listHomeworks();
      setHomeworks(list);
    } catch (e) {
      console.warn('[homework] list failed:', e?.message || e);
      setHomeworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { refresh(); }, [refresh]);

  const handleComplete = async (hw) => {
    if (hw.completedAt || completing === hw.id) return;
    setCompleting(hw.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const updated = await completeHomework(hw.id);
      setHomeworks((prev) =>
        (prev || []).map((h) => (h.id === hw.id ? (updated || h) : h)),
      );
    } catch (e) {
      Alert.alert('Could not mark complete', e?.message || 'Please try again.');
    } finally {
      setCompleting(null);
    }
  };

  const open = (hw) => {
    Haptics.selectionAsync();
    setExpandedId((cur) => (cur === hw.id ? null : hw.id));
  };

  const pending = (homeworks || []).filter((h) => !h.completedAt);
  const done = (homeworks || []).filter((h) => h.completedAt);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Text style={styles.title}>Homework</Text>
          <Text style={styles.subtitle}>
            Tap each morning and evening for a couple of minutes.
          </Text>

          {loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator color={COLORS.purpleLight} />
            </View>
          ) : (homeworks || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="leaf-outline" size={26} color={COLORS.purpleLight} />
              <Text style={styles.emptyTitle}>No homework yet</Text>
              <Text style={styles.emptyDesc}>
                After your first tapping session, your guide will leave a homework here.
              </Text>
            </View>
          ) : (
            <>
              {pending.length > 0 && (
                <Text style={styles.sectionLabel}>Active</Text>
              )}
              {pending.map((hw) => (
                <HomeworkCard
                  key={hw.id}
                  hw={hw}
                  expanded={expandedId === hw.id}
                  completing={completing === hw.id}
                  onPress={() => open(hw)}
                  onComplete={() => handleComplete(hw)}
                />
              ))}
              {done.length > 0 && (
                <Text style={styles.sectionLabel}>Completed</Text>
              )}
              {done.map((hw) => (
                <HomeworkCard
                  key={hw.id}
                  hw={hw}
                  expanded={expandedId === hw.id}
                  completing={false}
                  onPress={() => open(hw)}
                  onComplete={() => {}}
                />
              ))}
            </>
          )}

          <View style={{ height: DOCK_HEIGHT + 30 }} />
        </ScrollView>
      </SafeAreaView>
      <BottomDock />
    </GradientBackground>
  );
}

function HomeworkCard({ hw, expanded, completing, onPress, onComplete }) {
  const isDone = !!hw.completedAt;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, isDone && styles.cardDone]}
    >
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]} numberOfLines={2}>
            {hw.title}
          </Text>
          <Text style={styles.cardMeta}>
            {isDone
              ? `Completed ${relativeDate(hw.completedAt)}`
              : `Created ${relativeDate(hw.createdAt)} · ${hw.durationMinutes ?? 3} min · ${hw.frequency || 'Morning and evening'}`}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.whiteMuted}
        />
      </View>

      {expanded && (
        <View style={styles.cardBody}>
          {Array.isArray(hw.affirmations) && hw.affirmations.length > 0 && (
            <>
              <Text style={styles.bodyLabel}>Affirmations</Text>
              {hw.affirmations.map((line, i) => (
                <Text key={i} style={styles.bodyText}>“{line}”</Text>
              ))}
            </>
          )}
          {!!hw.tappingScript && (
            <>
              <Text style={[styles.bodyLabel, { marginTop: 12 }]}>Daily tapping</Text>
              <Text style={styles.bodyText}>“{hw.tappingScript}”</Text>
            </>
          )}
          {!!hw.realLifeAction && (
            <>
              <Text style={[styles.bodyLabel, { marginTop: 12 }]}>Real-life practice</Text>
              <Text style={styles.bodyText}>{hw.realLifeAction}</Text>
            </>
          )}

          {!isDone && (
            <TouchableOpacity
              onPress={onComplete}
              activeOpacity={0.85}
              disabled={completing}
              style={[styles.doneBtn, completing && styles.doneBtnDisabled]}
            >
              {completing ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  <Text style={styles.doneBtnText}>Mark complete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.whiteMuted,
    fontSize: 14,
    marginBottom: 18,
  },
  sectionLabel: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  centerWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyDesc: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardDone: {
    opacity: 0.7,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeadLeft: { flex: 1 },
  cardTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.whiteMuted,
  },
  cardMeta: {
    color: COLORS.whiteMuted,
    fontSize: 12,
  },
  cardBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  bodyLabel: {
    color: COLORS.purpleLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bodyText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  doneBtn: {
    marginTop: 16,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
  },
  doneBtnDisabled: { opacity: 0.7 },
  doneBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
