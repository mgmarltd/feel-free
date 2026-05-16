import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../../src/components/GradientBackground';
import Character from '../../src/components/Character';
import StressLines from '../../src/components/StressLines';
import ProgressDots from '../../src/components/ProgressDots';
import ContinueButton from '../../src/components/ContinueButton';
import { COLORS, FONTS } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Find Your Calm',
    description: 'Take small steps every day to improve your mind and mood.',
    mood: 'happy',
    showStress: true,
  },
  {
    id: '2',
    title: 'Tap Into Peace',
    description: 'EFT tapping helps release stress and negative emotions with simple techniques.',
    mood: 'wink',
    showStress: false,
  },
  {
    id: '3',
    title: 'Your Journey Starts',
    description: 'Personalized sessions designed just for you. Let\'s get to know you better.',
    mood: 'happy',
    showStress: false,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleContinue = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push('/onboarding/age');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      {item.showStress && (
        <View style={styles.stressContainer}>
          <StressLines width={220} height={100} />
        </View>
      )}
      <View style={styles.characterContainer}>
        <Character size={240} mood={item.mood} />
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          style={styles.list}
        />
        <View style={styles.bottomSection}>
          <ProgressDots total={slides.length} current={currentIndex} />
          <View style={{ height: 24 }} />
          <ContinueButton onPress={handleContinue} title="Continue Next" />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  slide: {
    width,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    ...FONTS.title,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    ...FONTS.subtitle,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  stressContainer: {
    marginTop: 24,
  },
  characterContainer: {
    marginTop: 20,
    flex: 1,
    justifyContent: 'center',
  },
  bottomSection: {
    paddingBottom: 10,
  },
});
