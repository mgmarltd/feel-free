import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../src/components/GradientBackground';
import BottomDock, { DOCK_HEIGHT } from '../src/components/BottomDock';
import { getUserProfile } from '../src/services/userProfile';
import { COLORS } from '../src/constants/theme';

const MINUTES_PER_SESSION = 6; // rough average for stat display

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function diffInDays(a, b) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

// Streak = number of consecutive days back from today that have at least one
// session entry. If today has none but yesterday does, streak starts at 1
// (so missing today doesn't immediately break the streak).
function calcStreak(history, lastSessionDate) {
  const dates = new Set();
  (history || []).forEach((e) => {
    if (!e?.date) return;
    dates.add(startOfDay(e.date).getTime());
  });
  if (lastSessionDate) dates.add(startOfDay(lastSessionDate).getTime());
  if (dates.size === 0) return 0;

  const today = startOfDay(new Date()).getTime();
  const yesterday = today - 86400000;
  // Start the chain at whichever of today/yesterday has an entry.
  let cursor = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null;
  if (cursor === null) return 0;
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor -= 86400000;
  }
  return streak;
}

function buildLast7Days(history, lastSessionDate) {
  const dates = new Set();
  (history || []).forEach((e) => {
    if (!e?.date) return;
    dates.add(startOfDay(e.date).getTime());
  });
  if (lastSessionDate) dates.add(startOfDay(lastSessionDate).getTime());

  const today = new Date();
  // Build 7 days ending today, oldest first.
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      date: d,
      active: dates.has(startOfDay(d).getTime()),
      isToday: i === 0,
    });
  }
  return out;
}

function relativeDate(iso) {
  if (!iso) return '';
  const days = diffInDays(new Date(), new Date(iso));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function moodDelta(entry) {
  const before = Number(entry?.before);
  const after = Number(entry?.after);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return after - before;
}

export default function ProgressScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const p = await getUserProfile();
      setProfile(p || {});
    } catch (e) {
      setProfile({});
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { refresh(); }, [refresh]);

  if (!profile) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={['top']} />
        <BottomDock />
      </GradientBackground>
    );
  }

  const sessionCount = profile.sessionCount || 0;
  const history = profile.emotionalHistory || [];
  const knownIssues = (profile.knownIssues || []).slice(0, 6);
  const minutes = sessionCount * MINUTES_PER_SESSION;
  const streak = calcStreak(history, profile.lastSessionDate);
  const week = buildLast7Days(history, profile.lastSessionDate);
  const daysThisWeek = week.filter((d) => d.active).length;
  const recent = [...history].reverse().slice(0, 5);

  const isEmpty = sessionCount === 0 && history.length === 0;

  const startNewSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/session/feeling');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Text style={styles.title}>Progress</Text>

          {/* Streak hero */}
          <LinearGradient
            colors={['rgba(245,158,11,0.28)', 'rgba(239,68,68,0.18)']}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>CURRENT STREAK</Text>
              <View style={styles.heroNumberRow}>
                <Text style={styles.heroNumber}>{streak}</Text>
                <Text style={styles.heroUnit}>{streak === 1 ? 'day' : 'days'}</Text>
              </View>
              <Text style={styles.heroSub}>
                {streak > 0
                  ? `Keep it going — you've shown up ${streak === 1 ? 'today' : `${streak} days in a row`}.`
                  : 'Tap into your first session to start a streak.'}
              </Text>
            </View>
            <Text style={styles.heroFlame}>{streak >= 7 ? '🔥' : streak > 0 ? '🌱' : '💤'}</Text>
          </LinearGradient>

          {/* Stat cards */}
          <View style={styles.statsRow}>
            <StatCard
              icon="checkmark-circle-outline"
              value={sessionCount}
              label={sessionCount === 1 ? 'Session' : 'Sessions'}
              tint="rgba(139,92,246,0.22)"
            />
            <StatCard
              icon="time-outline"
              value={minutes}
              label="Minutes"
              tint="rgba(59,130,246,0.22)"
            />
            <StatCard
              icon="calendar-outline"
              value={daysThisWeek}
              label="This week"
              tint="rgba(34,197,94,0.22)"
            />
          </View>

          {/* This week */}
          <Text style={styles.sectionTitle}>This week</Text>
          <View style={styles.weekCard}>
            <View style={styles.weekRow}>
              {week.map((d, i) => (
                <View key={i} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayDot,
                      d.active && styles.dayDotActive,
                      d.isToday && styles.dayDotToday,
                    ]}
                  >
                    {d.active && (
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.dayLabel,
                      d.isToday && styles.dayLabelToday,
                    ]}
                  >
                    {DAY_LABELS[i]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.weekSummary}>
              {daysThisWeek === 0
                ? 'No sessions logged yet this week.'
                : daysThisWeek === 7
                  ? 'A full week — incredible consistency.'
                  : `${daysThisWeek} of 7 days active.`}
            </Text>
          </View>

          {/* Recent activity */}
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {isEmpty ? (
            <View style={styles.emptyCard}>
              <Ionicons name="leaf-outline" size={26} color={COLORS.purpleLight} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyDesc}>
                Once you complete your first tapping session, your stats and mood-shift history will show up here.
              </Text>
              <TouchableOpacity
                onPress={startNewSession}
                activeOpacity={0.85}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Start your first session</Text>
              </TouchableOpacity>
            </View>
          ) : recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyDesc}>
                Sessions completed: {sessionCount}. Detailed history will appear here as you log more sessions.
              </Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recent.map((entry, i) => {
                const delta = moodDelta(entry);
                const improved = delta != null && delta < 0; // before − after, lower=better
                const tagColor = delta == null
                  ? 'rgba(255,255,255,0.08)'
                  : improved
                    ? 'rgba(34,197,94,0.22)'
                    : 'rgba(239,68,68,0.22)';
                const tagText = delta == null
                  ? '—'
                  : improved
                    ? `−${Math.abs(delta)}`
                    : `+${delta}`;
                const tagFg = delta == null
                  ? COLORS.whiteMuted
                  : improved
                    ? '#86efac'
                    : '#fca5a5';
                return (
                  <View key={i} style={styles.activityCard}>
                    <View style={styles.activityLeft}>
                      <Text style={styles.activityTitle} numberOfLines={2}>
                        {entry?.notes || entry?.sessionType || 'Tapping session'}
                      </Text>
                      <Text style={styles.activitySub}>
                        {relativeDate(entry?.date)}
                        {Number.isFinite(Number(entry?.before)) &&
                          Number.isFinite(Number(entry?.after)) &&
                          ` · felt ${entry.before} → ${entry.after}`}
                      </Text>
                    </View>
                    <View style={[styles.activityTag, { backgroundColor: tagColor }]}>
                      <Text style={[styles.activityTagText, { color: tagFg }]}>
                        {tagText}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Top concerns */}
          {knownIssues.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>What you've worked on</Text>
              <View style={styles.chipsWrap}>
                {knownIssues.map((issue, i) => (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipText}>{issue}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: DOCK_HEIGHT + 30 }} />
        </ScrollView>
      </SafeAreaView>
      <BottomDock />
    </GradientBackground>
  );
}

function StatCard({ icon, value, label, tint }) {
  return (
    <View style={[styles.statCard, { backgroundColor: tint }]}>
      <Ionicons name={icon} size={22} color={COLORS.white} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 18,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  heroNumber: {
    color: COLORS.white,
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 50,
  },
  heroUnit: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    fontWeight: '600',
    paddingBottom: 6,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroFlame: {
    fontSize: 48,
    marginLeft: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },

  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 26,
    marginBottom: 12,
  },

  weekCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purpleLight,
  },
  dayDotToday: {
    borderColor: COLORS.purpleLight,
    borderWidth: 2,
  },
  dayLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  dayLabelToday: {
    color: COLORS.purpleLight,
  },
  weekSummary: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  activityLeft: { flex: 1 },
  activityTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  activitySub: {
    color: COLORS.whiteMuted,
    fontSize: 12,
  },
  activityTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  activityTagText: {
    fontSize: 13,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    gap: 10,
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
  emptyBtn: {
    marginTop: 8,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
