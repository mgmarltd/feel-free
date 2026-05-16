import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(monthIndex, year) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function WheelColumn({ values, selectedIndex, onChange, width }) {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const userScrollingRef = useRef(false);

  useEffect(() => {
    setCurrentIndex(selectedIndex);
    if (!userScrollingRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      });
    }
  }, [selectedIndex, values.length]);

  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    if (clamped !== currentIndex) {
      if (userScrollingRef.current) Haptics.selectionAsync();
      setCurrentIndex(clamped);
    }
  };

  const handleMomentumEnd = (event) => {
    userScrollingRef.current = false;
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    onChange(clamped);
  };

  return (
    <View style={[styles.columnWrap, { width }]}>
      <View style={styles.pill} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScrollBeginDrag={() => { userScrollingRef.current = true; }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: PADDING }}
        nestedScrollEnabled
      >
        {values.map((value, i) => {
          const distance = Math.abs(i - currentIndex);
          const opacity = Math.max(0.18, 1 - distance * 0.32);
          const isSelected = i === currentIndex;
          return (
            <View key={i} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  { opacity },
                  isSelected && styles.itemTextSelected,
                ]}
              >
                {value}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function WheelPicker({ value, onChange, minYear, maxYear }) {
  const currentYear = new Date().getFullYear();
  const yMax = maxYear ?? currentYear;
  const yMin = minYear ?? currentYear - 100;

  const years = useMemo(() => {
    const list = [];
    for (let y = yMax; y >= yMin; y--) list.push(y);
    return list;
  }, [yMin, yMax]);

  const dayCount = daysInMonth(value.monthIndex, value.year);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount],
  );

  const clampedDay = Math.min(value.day, dayCount);
  const monthIndex = value.monthIndex;
  const dayIndex = clampedDay - 1;
  const yearIndex = years.indexOf(value.year);

  return (
    <View style={styles.row}>
      <WheelColumn
        values={MONTHS}
        selectedIndex={monthIndex}
        width={140}
        onChange={(i) => {
          const newDayCount = daysInMonth(i, value.year);
          onChange({
            monthIndex: i,
            day: Math.min(value.day, newDayCount),
            year: value.year,
          });
        }}
      />
      <WheelColumn
        values={days}
        selectedIndex={dayIndex}
        width={70}
        onChange={(i) => onChange({ ...value, day: i + 1 })}
      />
      <WheelColumn
        values={years}
        selectedIndex={yearIndex >= 0 ? yearIndex : 0}
        width={100}
        onChange={(i) => {
          const newYear = years[i];
          const newDayCount = daysInMonth(value.monthIndex, newYear);
          onChange({
            monthIndex: value.monthIndex,
            day: Math.min(value.day, newDayCount),
            year: newYear,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
  },
  columnWrap: {
    height: PICKER_HEIGHT,
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    left: 6,
    right: 6,
    height: ITEM_HEIGHT,
    borderRadius: ITEM_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '500',
  },
  itemTextSelected: {
    fontWeight: '700',
    color: COLORS.white,
  },
});
