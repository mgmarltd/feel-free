import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';

const TABS = [
  { key: 'home',     label: 'Home',     icon: 'home-outline',     activeIcon: 'home',     route: '/home' },
  { key: 'progress', label: 'Progress', icon: 'trending-up-outline', activeIcon: 'trending-up', route: '/progress' },
  { key: 'homework', label: 'Homework', icon: 'list-outline',     activeIcon: 'list',     route: '/homework' },
  { key: 'profile',  label: 'Profile',  icon: 'person-outline',   activeIcon: 'person',   route: '/profile' },
];

// Approx height of the dock (used to add safe bottom padding to scrollable
// content so the last items aren't hidden behind it).
export const DOCK_HEIGHT = 76;

export default function BottomDock() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleTap = (route) => {
    if (pathname === route) return;
    Haptics.selectionAsync();
    router.replace(route);
  };

  return (
    <View style={[styles.outer, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <BlurView intensity={60} tint="dark" style={styles.dock}>
        <View style={styles.row}>
          {TABS.map((tab) => {
            const isActive = pathname === tab.route;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTap(tab.route)}
                activeOpacity={0.7}
                style={styles.tab}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? COLORS.purpleLight : COLORS.whiteMuted}
                />
                <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  dock: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(20,10,40,0.55)',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    color: COLORS.whiteMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: COLORS.purpleLight,
  },
});
