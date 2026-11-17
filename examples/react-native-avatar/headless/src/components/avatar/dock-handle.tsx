import { useEffect, useLayoutEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet } from 'react-native';
import ChevronDownIcon from '../../../assets/chevron-down.svg';
import SparklesIcon from '../../../assets/sparkles.svg';
import { BRAND } from '../../theme';
import { DockSide } from '../draggable';

export const HANDLE_WIDTH = 44;
export const HANDLE_HEIGHT = 96;

const FADE_DURATION = 200;
const ICON_SIZE = 24;
const RADIUS = 18;
const BORDER_WIDTH = 2;
const DRAG_SLOP = 8;

type Props = {
  side: DockSide;
  bottom: number;
  y: number;
  minY: number;
  onYChange: (y: number) => void;
  onPress: () => void;
};

export function DockHandle({
  side,
  bottom,
  y,
  minY,
  onYChange,
  onPress,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const latest = useRef({ y, minY, onYChange });
  latest.current = { y, minY, onYChange };

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  // The committed position replaces the temporary drag offset in the same frame.
  useLayoutEffect(() => {
    offset.setValue(0);
  }, [bottom, offset]);

  const clampDy = (dy: number) =>
    Math.min(
      Math.max(dy, latest.current.minY - latest.current.y),
      -latest.current.y,
    );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        Math.hypot(dx, dy) > DRAG_SLOP,
      onPanResponderMove: (_, { dy }) => offset.setValue(clampDy(dy)),
      onPanResponderRelease: (_, { dy }) =>
        latest.current.onYChange(latest.current.y + clampDy(dy)),
      onPanResponderTerminate: (_, { dy }) =>
        latest.current.onYChange(latest.current.y + clampDy(dy)),
    }),
  ).current;

  const right = side === 'right';

  return (
    <Animated.View
      style={[
        styles.wrap,
        right ? styles.wrapRight : styles.wrapLeft,
        { bottom, opacity, transform: [{ translateY: offset }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        accessibilityLabel="Show assistant"
        style={[styles.handle, right ? styles.handleRight : styles.handleLeft]}
        onPress={onPress}
      >
        <ChevronDownIcon
          width={ICON_SIZE}
          height={ICON_SIZE}
          fill={BRAND}
          style={{ transform: [{ rotate: right ? '90deg' : '-90deg' }] }}
        />
        <SparklesIcon width={ICON_SIZE} height={ICON_SIZE} fill={BRAND} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    zIndex: 120,
    elevation: 120,
    backgroundColor: '#fff',
    borderWidth: BORDER_WIDTH,
    borderColor: BRAND,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  wrapRight: {
    right: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: RADIUS,
    borderBottomLeftRadius: RADIUS,
  },
  wrapLeft: {
    left: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
  handle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  handleRight: {
    borderTopLeftRadius: RADIUS,
    borderBottomLeftRadius: RADIUS,
  },
  handleLeft: {
    borderTopRightRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
});
