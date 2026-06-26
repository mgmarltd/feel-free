import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../../src/constants/theme';
import GradientBackground from '../../src/components/GradientBackground';
import OnboardingHeader from '../../src/components/OnboardingHeader';
import OptionCard from '../../src/components/OptionCard';
import IntensityIcon from '../../src/components/IntensityIcon';
import SourceIcon from '../../src/components/SourceIcon';
import WheelPicker from '../../src/components/WheelPicker';
import Character from '../../src/components/Character';
import AnalysisDrawer from '../../src/components/AnalysisDrawer';
import OptimizingProgress from '../../src/components/OptimizingProgress';
import ContinueButton from '../../src/components/ContinueButton';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { FONTS } from '../../src/constants/theme';

const DEFAULT_DOB = { monthIndex: 0, day: 1, year: 1995 };

const STEPS = [
  {
    key: 'gender',
    type: 'options',
    title: 'Choose your sex',
    subtitle: 'This helps personalize your experience.',
    options: [
      { label: 'Male' },
      { label: 'Female' },
      { label: 'Other' },
    ],
  },
  {
    key: 'stress',
    type: 'options',
    title: 'How much stress do you carry?',
    subtitle: 'This will help shape your tapping plan.',
    options: [
      { label: 'Low', description: 'Mostly calm', intensity: 1 },
      { label: 'Moderate', description: 'Some pressure most days', intensity: 3 },
      { label: 'High', description: 'Often overwhelmed', intensity: 6 },
    ],
  },
  {
    key: 'dob',
    type: 'datepicker',
    title: 'When were you born?',
    subtitle: 'This will be used to calibrate your custom plan.',
    default: DEFAULT_DOB,
  },
  {
    key: 'source',
    type: 'options',
    title: 'Where did you hear about us?',
    options: [
      { label: 'Youtube', source: 'youtube' },
      { label: 'App Store', source: 'appstore' },
      { label: 'X', source: 'x' },
      { label: 'Google', source: 'google' },
      { label: 'Facebook', source: 'facebook' },
      { label: 'Instagram', source: 'instagram' },
      { label: 'Friend or family', source: 'friends' },
      { label: 'TikTok', source: 'tiktok' },
      { label: 'TV', source: 'tv' },
      { label: 'Other', source: 'other' },
    ],
  },
  {
    key: 'triedOtherApps',
    type: 'options',
    title: 'Have you used other tapping or NLP apps?',
    options: [
      { label: 'Yes', source: 'thumbsup' },
      { label: 'No', source: 'thumbsdown' },
    ],
  },
  {
    key: 'animation1',
    type: 'placeholder',
    title: '',
    placeholder: 'animation here will be added later 1',
  },
  {
    key: 'selfAnalysis',
    type: 'analysis',
    title: "Let's do a quick self analysis",
    subtitle: 'Tap start and tell me what feels off — I\'ll listen and reflect back.',
    chips: ['Thoughts', 'Emotions', 'Body'],
    question: 'Hayatında düzeltmek istediğin ne var?',
  },
  {
    key: 'optimizing',
    type: 'optimizing',
    title: 'Setting up your Calmutopia system',
    subtitle: 'Hang tight — tuning a few things to you.',
    // '__AI_TOPIC__' is the dynamic 2–3 word topic the agent named for the user.
    // buildOptimizingSteps replaces it at render time.
    template: [
      'Analyzing your emotions',
      'Analyzing your voice',
      'Analyzing the words you used',
      '__AI_TOPIC__',
      'Personalizing your experience',
    ],
  },
  {
    key: 'hasEFTCoach',
    type: 'options',
    title: 'Do you currently work with an EFT coach?',
    options: [
      { label: 'Yes', source: 'thumbsup' },
      { label: 'No', source: 'thumbsdown' },
    ],
  },
  {
    key: 'goal',
    type: 'options',
    title: "What's your main goal?",
    subtitle: "We'll shape your tapping sessions around this.",
    options: [
      { label: 'Reduce stress & anxiety' },
      { label: 'Improve sleep & rest' },
      { label: 'Build emotional resilience' },
    ],
  },
  {
    key: 'blocker',
    type: 'options',
    title: "What's stopping you from reaching it?",
    subtitle: "Pick what feels strongest — we'll help you work through it.",
    options: [
      { label: 'Not enough time' },
      { label: 'Self-doubt or fear' },
      { label: 'Stress & overwhelm' },
      { label: 'Past experiences' },
      { label: 'Not knowing where to start' },
    ],
  },
  {
    key: 'meditates',
    type: 'options',
    title: 'Do you do any kind of meditation?',
    options: [
      { label: 'Yes', source: 'thumbsup' },
      { label: 'No', source: 'thumbsdown' },
    ],
  },
  {
    key: 'dailyRoutine',
    type: 'options',
    title: 'Your daily routine?',
    subtitle: 'How would you describe your typical day?',
    options: [
      { label: 'Very busy & stressful' },
      { label: 'Moderately active' },
      { label: 'Calm & relaxed' },
      { label: 'Mostly sedentary' },
      { label: 'Unpredictable' },
    ],
  },
  {
    key: 'animation2',
    type: 'placeholder',
    title: '',
    placeholder: 'animation 2 — thank you for trusting us',
  },
  {
    key: 'dailyCheckin',
    type: 'yesno',
    title: 'Do you want Calmutopia to check in on you daily?',
  },
  {
    key: 'wantsDailyRelief',
    type: 'yesno',
    title: 'Do you want to feel relieved every day?',
  },
  {
    key: 'socialProof',
    type: 'testimonials',
    title: 'Join over 500 thousand people like you',
    stats: {
      rating: '4.8',
      ratingsCount: '250K+ App Ratings',
      usersCount: '500K+ Calmutopia Users',
    },
    reviews: [
      {
        name: 'Emre',
        date: 'April 4, 2026',
        text: "Calmutopia has completely changed how I handle stress. The tapping sessions are surprisingly effective and the AI guide feels like a real friend who knows exactly what to say. I use it before every big meeting and it actually works. Highly recommend for anyone with anxiety.",
      },
      {
        name: 'Selin',
        date: 'March 12, 2026',
        text: 'Best mental wellness app I have used. Calmer in just a few weeks.',
      },
      {
        name: 'K',
        date: 'May 2, 2025',
        text: "I love this app. It's quickly become my go-to whenever I feel overwhelmed. The voice analysis is really insightful and the daily check-ins keep me consistent.",
      },
    ],
  },
  {
    key: 'notifications',
    type: 'notifications',
    title: 'Stay on track with Calmutopia notifications',
  },
  {
    key: 'referralCode',
    type: 'referral',
    title: 'Enter referral code (optional)',
    subtitle: 'You can skip this step',
  },
  {
    key: 'feeling',
    type: 'options',
    title: 'How are you feeling?',
    subtitle: "Be honest — there's no wrong answer here.",
    options: [
      { label: 'Stressed & overwhelmed' },
      { label: 'Anxious & worried' },
      { label: 'Sad & low energy' },
      { label: 'Frustrated & angry' },
      { label: 'Okay, but could be better' },
      { label: 'Pretty good actually!' },
    ],
  },
  {
    key: 'knowsEFT',
    type: 'options',
    title: 'Do you know EFT?',
    subtitle: 'Emotional Freedom Technique — also known as "tapping".',
    options: [
      { label: 'Never heard of it' },
      { label: "I've heard of it but never tried" },
      { label: "I've tried it a few times" },
      { label: 'I practice it regularly' },
    ],
  },
];

const FADE_OUT_MS = 160;
const FADE_IN_MS = 220;

const MAX_TOPIC_LEN = 60;

// Pull the named concern out of the agent's closing summary, e.g.
//   EN: "Got it — the stress around work meetings. I'm optimizing your Calmutopia system for you now."
//   TR: "Anladım — iş toplantılarındaki stres. Calmutopia sistemini şimdi senin için optimize ediyorum."
function extractConcernTopic(summary) {
  if (!summary || typeof summary !== 'string') return null;
  const cleaned = summary.replace(/\s+/g, ' ').trim();

  const patterns = [
    /got it[^.?!]*?[—–-]\s*(.+?)(?:\.\s*i'?m optimizing|$)/i,
    /anladım[^.?!]*?[—–-]\s*(.+?)(?:\.\s*calmutopia|$)/i,
  ];
  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m?.[1]) {
      let t = m[1].trim().replace(/^you want to work on\s+/i, '');
      t = t.replace(/[.!?]+$/, '');
      if (t.length > MAX_TOPIC_LEN) t = t.slice(0, MAX_TOPIC_LEN - 1).trim() + '…';
      return t;
    }
  }
  return null;
}

function detectLanguage(...sources) {
  for (const src of sources) {
    if (!src) continue;
    if (/anladım|calmutopia sistemini|problemini|düzeltiyorum/i.test(src)) return 'tr';
    if (/got it|i'?m optimizing|fixing your/i.test(src)) return 'en';
    if (/[ğıöşüçĞİÖŞÜÇ]/.test(src)) return 'tr';
  }
  return 'en';
}

// Strip common Turkish/English determiners + leading filler so the topic
// reads cleanly when wrapped in the action sentence.
function tidyTopic(topic) {
  if (!topic) return topic;
  let t = topic.replace(/\s+/g, ' ').trim();
  t = t.replace(/^(the|a|an|some|that|your|my|this)\s+/i, '');
  t = t.replace(/^(bu|şu|bir|bazı|senin|benim)\s+/i, '');
  t = t.replace(/[.,;:!?]+$/, '');
  return t;
}

// Cap to 5 words so the row stays readable, but don't chop so hard that
// the meaning is lost.
function trimToWords(topic, maxWords = 5) {
  if (!topic) return topic;
  const words = topic.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return topic;
  return words.slice(0, maxWords).join(' ');
}

function capitalizeFirst(s, language) {
  if (!s) return s;
  if (language === 'tr') {
    return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Wrap the topic in a real, action-oriented problem sentence, e.g.
//   TR: "Araba sürme korkusu problemini düzeltiyorum"
//   EN: "Working on your fear of driving"
function composeProblemSentence(topic, language) {
  if (!topic) return null;
  const tidy = trimToWords(tidyTopic(topic), 5);
  if (language === 'tr') {
    return `${capitalizeFirst(tidy, 'tr')} problemini düzeltiyorum`;
  }
  return `Working on your ${tidy}`;
}

// Replace '__AI_TOPIC__' in the template with the AI's distilled problem
// wrapped in a real-sentence label. Falls back to a generic action line if
// we couldn't extract a clean topic (better than a messy transcript fragment).
function buildOptimizingSteps(analysisAnswer, template) {
  const aiTopic = extractConcernTopic(analysisAnswer?.summary);
  const language = detectLanguage(analysisAnswer?.summary, analysisAnswer?.transcript);
  let dynamicLabel = composeProblemSentence(aiTopic, language);
  if (!dynamicLabel) {
    dynamicLabel = language === 'tr'
      ? 'Senin için sistemi düzenliyorum'
      : 'Tuning the system to your reflection';
  }
  return (template || []).map((s) => (s === '__AI_TOPIC__' ? dynamicLabel : s));
}

const initialAnswers = () => {
  const init = {};
  STEPS.forEach((s) => {
    if (s.type === 'datepicker' && s.default) init[s.key] = s.default;
  });
  return init;
};

export default function QuestionsScreen() {
  const router = useRouter();
  const { updateData } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const fade = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.Value(0)).current;
  const animatingRef = useRef(false);

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('voice');
  const [referralDraft, setReferralDraft] = useState('');

  const step = STEPS[stepIndex];
  const value = answers[step.key] ?? null;
  const isAnswered =
    step.type === 'placeholder' ||
    step.type === 'testimonials' ||
    step.type === 'notifications' ||
    step.type === 'referral'
      ? true
      : step.type === 'analysis' || step.type === 'optimizing' || step.type === 'yesno'
        ? !!answers[step.key]
        : !!value;

  const transitionTo = (nextIndex, direction) => {
    if (animatingRef.current || nextIndex === stepIndex) return;
    animatingRef.current = true;
    const outOffset = direction === 'forward' ? -24 : 24;
    const inOffset = direction === 'forward' ? 24 : -24;

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: outOffset,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStepIndex(nextIndex);
      translate.setValue(inOffset);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: FADE_IN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: FADE_IN_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        animatingRef.current = false;
      });
    });
  };

  const handleContinue = () => {
    if (!isAnswered) return;
    if (
      step.type !== 'placeholder' &&
      step.type !== 'testimonials' &&
      step.type !== 'notifications' &&
      step.type !== 'referral' &&
      step.type !== 'analysis' &&
      step.type !== 'optimizing' &&
      step.type !== 'yesno'
    ) {
      updateData(step.key, value);
    }
    if (stepIndex < STEPS.length - 1) {
      transitionTo(stepIndex + 1, 'forward');
    } else {
      router.push('/onboarding/eft-intro');
    }
  };

  const handleSubmitReferral = () => {
    const code = referralDraft.trim();
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateData('referralCode', code);
    setAnswers((prev) => ({ ...prev, [step.key]: code }));
    setReferralDraft('');
    setTimeout(() => {
      if (stepIndex < STEPS.length - 1) transitionTo(stepIndex + 1, 'forward');
      else router.push('/onboarding/eft-intro');
    }, 160);
  };

  const handleSkipReferral = () => {
    Haptics.selectionAsync();
    setReferralDraft('');
    if (stepIndex < STEPS.length - 1) transitionTo(stepIndex + 1, 'forward');
    else router.push('/onboarding/eft-intro');
  };

  const handleNotificationChoice = async (allow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let granted = false;
    if (allow) {
      try {
        const res = await Notifications.requestPermissionsAsync();
        granted = res.granted || res.status === 'granted';
      } catch (e) {
        granted = false;
      }
    }
    updateData('notificationsGranted', granted);
    setAnswers((prev) => ({ ...prev, [step.key]: granted ? 'allowed' : 'declined' }));
    setTimeout(() => {
      if (stepIndex < STEPS.length - 1) {
        transitionTo(stepIndex + 1, 'forward');
      } else {
        router.push('/onboarding/eft-intro');
      }
    }, 160);
  };

  const handleYesNo = (answer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnswers((prev) => ({ ...prev, [step.key]: answer }));
    updateData(step.key, answer);
    setTimeout(() => {
      if (stepIndex < STEPS.length - 1) {
        transitionTo(stepIndex + 1, 'forward');
      } else {
        router.push('/onboarding/eft-intro');
      }
    }, 140);
  };

  const handleAnalysisComplete = (result) => {
    const payload = typeof result === 'string'
      ? { transcript: result }
      : result || { transcript: 'completed' };
    setAnswers((prev) => ({ ...prev, [step.key]: payload }));
    updateData(step.key, payload);
    setAnalysisOpen(false);
    // Wait for the drawer's slide-down animation, then move into the optimizing step.
    setTimeout(() => {
      if (stepIndex < STEPS.length - 1) {
        transitionTo(stepIndex + 1, 'forward');
      }
    }, 380);
  };

  const handleOptimizingComplete = () => {
    setAnswers((prev) => ({ ...prev, [step.key]: 'optimized' }));
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      router.back();
    } else {
      transitionTo(stepIndex - 1, 'backward');
    }
  };

  const handleSelect = (label) => {
    setAnswers((prev) => ({ ...prev, [step.key]: label }));
  };

  const handleDateChange = (date) => {
    setAnswers((prev) => ({ ...prev, [step.key]: date }));
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <OnboardingHeader
          currentStep={stepIndex + 1}
          totalSteps={STEPS.length}
          onBack={handleBack}
        />
        <Animated.View
          style={[
            styles.content,
            { opacity: fade, transform: [{ translateX: translate }] },
          ]}
        >
          {step.type !== 'placeholder' && (
            <>
              <Text style={styles.title}>{step.title}</Text>
              {step.subtitle ? (
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              ) : (
                <View style={styles.subtitleSpacer} />
              )}
            </>
          )}
          {step.type === 'placeholder' ? (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderText}>{step.placeholder}</Text>
            </View>
          ) : step.type === 'analysis' ? (
            <View style={styles.analysisWrap}>
              <View style={styles.analysisCharacter}>
                <Character size={200} mood="happy" />
              </View>
              <View style={styles.chipsRow}>
                {(step.chips || []).map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : step.type === 'yesno' ? (
            <View style={styles.yesNoVisual}>
              <Character size={220} mood="happy" />
            </View>
          ) : step.type === 'referral' ? (
            <View style={styles.referralWrap}>
              <View style={styles.referralInputRow}>
                <TextInput
                  value={referralDraft}
                  onChangeText={setReferralDraft}
                  placeholder="Referral Code"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={32}
                  style={styles.referralInput}
                  onSubmitEditing={handleSubmitReferral}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={handleSubmitReferral}
                  disabled={!referralDraft.trim()}
                  activeOpacity={0.85}
                  style={[
                    styles.referralSubmit,
                    !referralDraft.trim() && styles.referralSubmitDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.referralSubmitText,
                      !referralDraft.trim() && styles.referralSubmitTextDisabled,
                    ]}
                  >
                    Submit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : step.type === 'notifications' ? (
            <View style={styles.notifWrap}>
              <View style={styles.notifDialog}>
                <View style={styles.notifDialogBody}>
                  <Text style={styles.notifDialogText}>
                    Calmutopia would like to send you Notifications
                  </Text>
                </View>
                <View style={styles.notifDialogDivider} />
                <View style={styles.notifDialogBtnRow}>
                  <TouchableOpacity
                    onPress={() => handleNotificationChoice(false)}
                    activeOpacity={0.7}
                    style={[styles.notifDialogBtn, styles.notifDialogBtnLeft]}
                  >
                    <Text style={styles.notifDialogBtnText}>Don't Allow</Text>
                  </TouchableOpacity>
                  <View style={styles.notifDialogBtnDivider} />
                  <TouchableOpacity
                    onPress={() => handleNotificationChoice(true)}
                    activeOpacity={0.7}
                    style={[styles.notifDialogBtn, styles.notifDialogBtnAllow]}
                  >
                    <Text style={[styles.notifDialogBtnText, styles.notifDialogBtnTextAllow]}>
                      Allow
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.notifPointer}>👆</Text>
            </View>
          ) : step.type === 'testimonials' ? (
            <View style={{ flex: 1 }}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.ratingRow}>
                    <Text style={styles.laurel}>❦</Text>
                    <View style={styles.ratingCenter}>
                      <View style={styles.ratingInline}>
                        <Text style={styles.ratingNumber}>{step.stats?.rating}</Text>
                        <Text style={styles.ratingStar}>★</Text>
                      </View>
                      <Text style={styles.statLabel}>avg rating</Text>
                    </View>
                    <Text style={[styles.laurel, styles.laurelFlip]}>❦</Text>
                  </View>
                  <Text style={styles.statCaption}>{step.stats?.ratingsCount}</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.avatarsRow}>
                    {['#f59e0b', '#ec4899', '#8b5cf6'].map((bg, i) => (
                      <View
                        key={i}
                        style={[
                          styles.avatar,
                          { backgroundColor: bg, marginLeft: i === 0 ? 0 : -12 },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.statCaption}>{step.stats?.usersCount}</Text>
                </View>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.reviewsList}
              >
                {(step.reviews || []).map((r, i) => (
                  <View key={i} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.stars}>★★★★★</Text>
                      <Text style={styles.reviewMeta}>{r.name}, {r.date}</Text>
                    </View>
                    <Text style={styles.reviewText}>{r.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : step.type === 'optimizing' ? (
            <OptimizingProgress
              key={step.key}
              steps={buildOptimizingSteps(answers.selfAnalysis, step.template)}
              onComplete={handleOptimizingComplete}
            />
          ) : step.type === 'datepicker' ? (
            <View style={styles.pickerWrap}>
              <WheelPicker
                value={value || DEFAULT_DOB}
                onChange={handleDateChange}
              />
            </View>
          ) : (
            <ScrollView
              style={styles.optionsScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.options}
            >
              {step.options.map((opt) => {
                const isSelected = value === opt.label;
                let icon = null;
                if (opt.intensity) {
                  icon = <IntensityIcon level={opt.intensity} selected={isSelected} />;
                } else if (opt.source) {
                  icon = <SourceIcon source={opt.source} />;
                }
                return (
                  <OptionCard
                    key={opt.label}
                    label={opt.label}
                    description={opt.description}
                    icon={icon}
                    selected={isSelected}
                    onPress={() => handleSelect(opt.label)}
                  />
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
        {step.type === 'analysis' && !isAnswered ? (
          <View>
            <ContinueButton
              onPress={() => { setAnalysisMode('voice'); setAnalysisOpen(true); }}
              title="Start analysis"
            />
            <TouchableOpacity
              onPress={() => { setAnalysisMode('text'); setAnalysisOpen(true); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.cantSpeakRow}
            >
              <Text style={styles.cantSpeakText}>I can't speak right now</Text>
            </TouchableOpacity>
          </View>
        ) : step.type === 'yesno' ? (
          <View style={styles.yesNoRow}>
            <TouchableOpacity
              onPress={() => handleYesNo('No')}
              activeOpacity={0.85}
              style={styles.yesNoBtn}
            >
              <Text style={styles.yesNoText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleYesNo('Yes')}
              activeOpacity={0.85}
              style={styles.yesNoBtn}
            >
              <Text style={styles.yesNoText}>Yes</Text>
            </TouchableOpacity>
          </View>
        ) : step.type === 'notifications' ? null : step.type === 'referral' ? (
          <ContinueButton onPress={handleSkipReferral} title="Skip" />
        ) : (
          <ContinueButton onPress={handleContinue} disabled={!isAnswered} />
        )}
      </SafeAreaView>
      </KeyboardAvoidingView>
      {step.type === 'analysis' && (
        <AnalysisDrawer
          visible={analysisOpen}
          question={step.question}
          mode={analysisMode}
          onClose={() => setAnalysisOpen(false)}
          onComplete={handleAnalysisComplete}
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    ...FONTS.title,
    fontSize: 30,
    marginBottom: 10,
  },
  subtitle: {
    ...FONTS.subtitle,
    marginBottom: 28,
  },
  subtitleSpacer: {
    height: 28,
  },
  optionsScroll: {
    flex: 1,
  },
  options: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  pickerWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...FONTS.subtitle,
    textAlign: 'center',
  },
  analysisWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisCharacter: {
    marginBottom: 28,
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  yesNoVisual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  yesNoBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 32,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  yesNoText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
  cantSpeakRow: {
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 16,
  },
  cantSpeakText: {
    color: COLORS.whiteMuted,
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  laurel: {
    color: '#d4a35a',
    fontSize: 22,
  },
  laurelFlip: {
    transform: [{ scaleX: -1 }],
  },
  ratingCenter: {
    alignItems: 'center',
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  ratingStar: {
    color: '#d4a35a',
    fontSize: 18,
  },
  statLabel: {
    color: COLORS.whiteMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statCaption: {
    color: COLORS.whiteMuted,
    fontSize: 12.5,
    marginTop: 10,
    textAlign: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2d1b4e',
  },
  reviewsList: {
    paddingBottom: 16,
    gap: 12,
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stars: {
    color: '#d4a35a',
    fontSize: 14,
    letterSpacing: 1,
  },
  reviewMeta: {
    color: COLORS.whiteMuted,
    fontSize: 12,
  },
  reviewText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 21,
  },
  notifWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  notifDialog: {
    width: '88%',
    backgroundColor: 'rgba(245,245,250,0.95)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  notifDialogBody: {
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  notifDialogText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  notifDialogDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  notifDialogBtnRow: {
    flexDirection: 'row',
  },
  notifDialogBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDialogBtnLeft: {
    backgroundColor: 'transparent',
  },
  notifDialogBtnAllow: {
    backgroundColor: '#0a0a14',
  },
  notifDialogBtnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  notifDialogBtnText: {
    fontSize: 16,
    color: '#0a0a0a',
    fontWeight: '500',
  },
  notifDialogBtnTextAllow: {
    color: '#ffffff',
    fontWeight: '700',
  },
  notifPointer: {
    fontSize: 28,
    marginTop: 16,
    marginRight: -120,
  },
  referralWrap: {
    paddingTop: 8,
  },
  referralInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
  },
  referralInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
  },
  referralSubmit: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.purple,
  },
  referralSubmitDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  referralSubmitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  referralSubmitTextDisabled: {
    color: 'rgba(255,255,255,0.45)',
  },
});
