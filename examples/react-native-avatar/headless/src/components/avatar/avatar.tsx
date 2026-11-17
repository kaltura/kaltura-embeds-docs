import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  EdgeInsetsValue,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  NavigationContainerRefWithCurrent,
  ParamListBase,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import SparklesIcon from '../../../assets/sparkles.svg';
import { BRAND } from '../../theme';
import { DockSide, Draggable } from '../draggable';
import { DockHandle, HANDLE_HEIGHT } from './dock-handle';
import { useAvatar } from './use-avatar';

const AVATAR_WIDTH = 180;
const AVATAR_HEIGHT = 180;
const LAUNCHER_SIZE = 56;
const WINDOW_RADIUS = 18;
const GUTTER = 12;
const EXPAND_DURATION = 260;

type AvatarProps = {
  draggableArea: EdgeInsetsValue;
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
  sheetVisibleHeight: Animated.Value;
};

export function Avatar({
  draggableArea,
  navigationRef,
  sheetVisibleHeight,
}: AvatarProps) {
  const [active, setActive] = useState(false);
  const [dock, setDock] = useState<{ side: DockSide; y: number }>();
  const progress = useRef(new Animated.Value(0)).current;

  const handleEnd = useCallback(() => {
    setActive(false);
    setDock(undefined);
    Animated.timing(progress, {
      toValue: 0,
      duration: EXPAND_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const { source, webViewRef, onMessage } = useAvatar({
    navigationRef,
    onEnd: handleEnd,
  });

  const insets = useSafeAreaInsets();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const regionStyle = useMemo(
    () => ({
      top: insets.top + draggableArea.top + GUTTER,
      right: insets.right + draggableArea.right + GUTTER,
      bottom: insets.bottom + draggableArea.bottom + GUTTER,
      left: insets.left + draggableArea.left + GUTTER,
    }),
    [insets, draggableArea],
  );

  const obstacle = useMemo(() => {
    const regionBottom = insets.bottom + draggableArea.bottom + GUTTER;

    return sheetVisibleHeight.interpolate({
      inputRange: [0, regionBottom, regionBottom + 1],
      outputRange: [0, 0, 1],
      extrapolateRight: 'extend',
    });
  }, [sheetVisibleHeight, insets.bottom, draggableArea.bottom]);

  const windowStyle = useMemo(
    () => ({
      width: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [LAUNCHER_SIZE, AVATAR_WIDTH],
      }),
      height: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [LAUNCHER_SIZE, AVATAR_HEIGHT],
      }),
      borderRadius: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [LAUNCHER_SIZE / 2, WINDOW_RADIUS],
      }),
    }),
    [progress],
  );

  const launcherOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 0.4],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [progress],
  );

  const handleExpand = () => {
    setActive(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: EXPAND_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handleDock = useCallback(
    (side: DockSide, y: number) => setDock({ side, y }),
    [],
  );

  const handleUndock = useCallback(() => setDock(undefined), []);

  const handleDockMove = useCallback(
    (y: number) => setDock(current => current && { ...current, y }),
    [],
  );

  return (
    <>
      {dock && (
        <DockHandle
          side={dock.side}
          y={dock.y}
          minY={AVATAR_HEIGHT - containerSize.height}
          onYChange={handleDockMove}
          onPress={handleUndock}
          bottom={regionStyle.bottom - dock.y + (AVATAR_HEIGHT - HANDLE_HEIGHT) / 2}
        />
      )}
    <View
      style={[styles.region, regionStyle]}
      pointerEvents="box-none"
      onLayout={handleLayout}
    >
      {containerSize.width ? (
        <Draggable
          width={active ? AVATAR_WIDTH : LAUNCHER_SIZE}
          height={active ? AVATAR_HEIGHT : LAUNCHER_SIZE}
          containerSize={containerSize}
          obstacle={obstacle}
          dockable={active}
          dockedSide={dock?.side}
          dockedY={dock?.y}
          dockInset={{ left: regionStyle.left, right: regionStyle.right }}
          onDock={handleDock}
        >
          <Animated.View style={[styles.window, windowStyle]}>
            <Animated.View
              style={[styles.clip, { borderRadius: windowStyle.borderRadius }]}
            >
              {active && (
                <WebView
                  style={styles.webView}
                  ref={webViewRef}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  mediaCapturePermissionGrantType="grant"
                  source={source}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  scrollEnabled={false}
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  onMessage={onMessage}
                />
              )}
              <Animated.View
                style={[styles.launcher, { opacity: launcherOpacity }]}
                pointerEvents={active ? 'none' : 'auto'}
              >
                <Pressable style={styles.launcherButton} onPress={handleExpand}>
                  <SparklesIcon width={20} height={20} fill={BRAND} />
                  <Text style={styles.launcherLabel}>AI</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Draggable>
      ) : null}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    zIndex: 120,
    elevation: 120,
  },
  window: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  clip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  webView: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: AVATAR_WIDTH,
    height: AVATAR_HEIGHT,
  },
  launcher: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
  },
  launcherButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  launcherLabel: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    color: BRAND,
  },
});
