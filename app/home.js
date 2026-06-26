import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../src/components/GradientBackground';
import BottomDock, { DOCK_HEIGHT } from '../src/components/BottomDock';
import { COLORS, FONTS } from '../src/constants/theme';
import { useOnboarding } from '../src/context/OnboardingContext';
import { getLanguage, setLanguage } from '../src/services/userProfile';
import { getDailyTasks, toggleDailyTask } from '../src/services/dailyTasks';

// `key` must match a slug in server/eftPrompt.js QUICK_SESSION_TOPICS so the
// session opens with the right focused prompt.
const quickSessions = [
  { key: 'stress-relief', title: 'Stress Relief', duration: '5 min', emoji: '🧘', color: 'rgba(139,92,246,0.2)' },
  { key: 'anxiety-calm', title: 'Anxiety Calm', duration: '7 min', emoji: '🌊', color: 'rgba(59,130,246,0.2)' },
  { key: 'morning-energy', title: 'Morning Energy', duration: '5 min', emoji: '☀️', color: 'rgba(245,158,11,0.2)' },
  { key: 'better-sleep', title: 'Better Sleep', duration: '10 min', emoji: '🌙', color: 'rgba(99,102,241,0.2)' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useOnboarding();
  const [lang, setLang] = useState('tr');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    getLanguage().then(setLang).catch(() => {});
  }, []);

  // Reload tasks on focus (also handles the midnight reset) and on language
  // change — the localized titles depend on `lang`.
  useFocusEffect(
    useCallback(() => {
      getDailyTasks(lang).then(setTasks).catch(() => {});
    }, [lang])
  );

  const handleToggleTask = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Optimistic flip; revert if persistence fails.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    try {
      await toggleDailyTask(id);
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  const switchLang = async (next) => {
    if (next === lang) return;
    setLang(next);
    try { await setLanguage(next); } catch (e) {}
  };

  const startSession = (sessionType) => {
    router.push({
      pathname: '/session/feeling',
      params: { sessionType },
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.tagline}>Ready to tap into calm?</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.langToggle}>
                <TouchableOpacity
                  onPress={() => switchLang('tr')}
                  style={[styles.langPill, lang === 'tr' && styles.langPillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langPillText, lang === 'tr' && styles.langPillTextActive]}>TR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => switchLang('en')}
                  style={[styles.langPill, lang === 'en' && styles.langPillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langPillText, lang === 'en' && styles.langPillTextActive]}>EN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Featured Session */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => startSession('release')}>
            <LinearGradient
              colors={['rgba(139,92,246,0.35)', 'rgba(139,92,246,0.1)']}
              style={styles.featured}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.featuredLabel}>TODAY'S SESSION</Text>
              <Text style={styles.featuredTitle}>Release & Let Go</Text>
              <Text style={styles.featuredDesc}>
                A guided tapping session to release what's weighing you down
              </Text>
              <View style={styles.featuredButton}>
                <Text style={styles.featuredButtonText}>Start Session  &#9654;</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Sessions */}
          <Text style={styles.sectionTitle}>Quick Sessions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {quickSessions.map((session, i) => (
              <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => startSession(session.key)} style={[styles.quickCard, { backgroundColor: session.color }]}>
                <Text style={styles.quickEmoji}>{session.emoji}</Text>
                <Text style={styles.quickTitle}>{session.title}</Text>
                <Text style={styles.quickDuration}>{session.duration}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Daily Tasks */}
          <View style={styles.tasksHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {lang === 'en' ? 'Daily Tasks' : 'Günlük Görevler'}
            </Text>
            {tasks.length > 0 && (
              <Text style={styles.tasksProgress}>{completedCount}/{tasks.length}</Text>
            )}
          </View>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              activeOpacity={0.7}
              style={[styles.taskCard, task.completed && styles.taskCardDone]}
              onPress={() => handleToggleTask(task.id)}
            >
              <View style={[styles.taskCheck, task.completed && styles.taskCheckDone]}>
                {task.completed && <Text style={styles.taskCheckMark}>✓</Text>}
              </View>
              <Text style={styles.taskEmoji}>{task.emoji}</Text>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                {task.title}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: DOCK_HEIGHT + 30 }} />
        </ScrollView>
      </SafeAreaView>
      <BottomDock />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 11,
  },
  langPillActive: {
    backgroundColor: COLORS.purple,
  },
  langPillText: {
    color: COLORS.whiteMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  langPillTextActive: {
    color: COLORS.white,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.whiteMuted,
    marginTop: 4,
  },
  featured: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.purpleLight,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
  },
  featuredDesc: {
    fontSize: 14,
    color: COLORS.whiteMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  featuredButton: {
    backgroundColor: COLORS.purple,
    alignSelf: 'flex-start',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 25,
  },
  featuredButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 16,
  },
  quickRow: {
    gap: 12,
    paddingBottom: 24,
  },
  quickCard: {
    width: 130,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  quickDuration: {
    fontSize: 12,
    color: COLORS.whiteMuted,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksProgress: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.purpleLight,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  taskCardDone: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  taskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.purpleLight,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  taskCheckMark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  taskEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  taskTitleDone: {
    color: COLORS.whiteMuted,
    textDecorationLine: 'line-through',
  },
});
