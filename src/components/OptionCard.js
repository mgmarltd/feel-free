import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '../constants/theme';

export default function OptionCard({ label, description, icon, selected, onPress }) {
  const isRich = description || icon;

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.card,
        isRich ? styles.cardRich : styles.cardSimple,
        selected && styles.selectedCard,
      ]}
    >
      {isRich ? (
        <>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <View style={styles.textCol}>
            <Text style={[styles.richLabel, selected && styles.selectedLabel]}>
              {label}
            </Text>
            {description && (
              <Text style={styles.description}>{description}</Text>
            )}
          </View>
        </>
      ) : (
        <Text style={[styles.label, selected && styles.selectedLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardSimple: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  cardRich: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  selectedCard: {
    borderColor: COLORS.purpleLight,
    backgroundColor: 'rgba(139,92,246,0.18)',
  },
  iconWrap: {
    marginRight: 16,
  },
  textCol: {
    flex: 1,
  },
  label: {
    ...FONTS.option,
    textAlign: 'center',
  },
  richLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: COLORS.whiteMuted,
    lineHeight: 19,
  },
  selectedLabel: {
    color: COLORS.purpleLight,
  },
});
