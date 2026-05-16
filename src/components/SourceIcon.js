import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome, FontAwesome6 } from '@expo/vector-icons';

const ICON_SIZE = 40;
const RADIUS = 10;

const SOURCES = {
  youtube: {
    bg: '#FF0033',
    render: () => <Ionicons name="logo-youtube" size={22} color="#fff" />,
  },
  appstore: {
    bg: '#0A84FF',
    render: () => <Ionicons name="logo-apple-appstore" size={22} color="#fff" />,
  },
  x: {
    bg: '#000000',
    render: () => <FontAwesome6 name="x-twitter" size={18} color="#fff" />,
  },
  google: {
    bg: '#ffffff',
    render: () => <FontAwesome name="google" size={20} color="#4285F4" />,
  },
  facebook: {
    bg: '#1877F2',
    render: () => <FontAwesome name="facebook-f" size={20} color="#fff" />,
  },
  instagram: {
    bg: '#E4405F',
    render: () => <FontAwesome name="instagram" size={22} color="#fff" />,
  },
  friends: {
    bg: '#ffffff',
    render: () => <Ionicons name="people" size={20} color="#1a1a1a" />,
  },
  tiktok: {
    bg: '#000000',
    render: () => <FontAwesome6 name="tiktok" size={20} color="#fff" />,
  },
  tv: {
    bg: '#a78bfa',
    render: () => <Ionicons name="tv" size={20} color="#fff" />,
  },
  other: {
    bg: 'rgba(255,255,255,0.22)',
    render: () => <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />,
  },
  thumbsup: {
    bg: 'rgba(255,255,255,0.14)',
    shape: 'circle',
    render: () => <Ionicons name="thumbs-up" size={20} color="#fff" />,
  },
  thumbsdown: {
    bg: 'rgba(255,255,255,0.14)',
    shape: 'circle',
    render: () => <Ionicons name="thumbs-down" size={20} color="#fff" />,
  },
};

export default function SourceIcon({ source }) {
  const entry = SOURCES[source] || SOURCES.other;
  const radius = entry.shape === 'circle' ? ICON_SIZE / 2 : RADIUS;
  return (
    <View style={[styles.box, { backgroundColor: entry.bg, borderRadius: radius }]}>
      {entry.render()}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
