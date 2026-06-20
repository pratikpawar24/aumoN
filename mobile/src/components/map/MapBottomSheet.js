import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/theme';

const SCREEN_H = Dimensions.get('window').height;

// Simple two-snap sheet (collapsed shows the header; expanded shows content).
// Avoids extra native deps — drag the handle to toggle.
const MapBottomSheet = ({ collapsedHeight = 150, expandedHeight = SCREEN_H * 0.62, children }) => {
  const insets = useSafeAreaInsets();
  const [, setExpanded] = useState(true);
  const height = useRef(new Animated.Value(expandedHeight)).current;

  const snap = (toExpanded) => {
    setExpanded(toExpanded);
    Animated.spring(height, { toValue: toExpanded ? expandedHeight : collapsedHeight, useNativeDriver: false, bounciness: 4 }).start();
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderRelease: (_, g) => { if (g.dy > 30) snap(false); else if (g.dy < -30) snap(true); },
  })).current;

  return (
    <Animated.View style={[styles.sheet, { height, paddingBottom: insets.bottom + 64 }]}>
      <View {...pan.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg,
  },
  handleArea: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
});

export default MapBottomSheet;
