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
import { Draggable } from '../draggable';
import { useAvatar } from './use-avatar';

const LAUNCHER_SIZE = 56;
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
  const progress = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    progress.setValue(0);
    setActive(false);
  }, [progress]);

  const { source, webViewRef, onMessage } = useAvatar({
    navigationRef,
    onDisconnecting: handleClose,
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

  return (
    <>
      <View
        style={[styles.region, regionStyle]}
        pointerEvents="box-none"
        onLayout={handleLayout}>
        {containerSize.width ? (
          <Draggable
            width={LAUNCHER_SIZE}
            height={LAUNCHER_SIZE}
            containerSize={containerSize}
            obstacle={obstacle}
            style={active ? styles.hidden : undefined}>
            <Pressable
              style={styles.launcher}
              onPress={handleExpand}
              disabled={active}>
              <SparklesIcon width={20} height={20} fill={BRAND} />
              <Text style={styles.launcherLabel}>AI</Text>
            </Pressable>
          </Draggable>
        ) : null}
      </View>
      {active && (
        <Animated.View
          style={[
            styles.fullscreen,
            {
              opacity: progress,
              paddingTop: insets.top,
              paddingRight: insets.right,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
            },
          ]}>
          <WebView
            style={styles.webView}
            ref={webViewRef}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            mediaCapturePermissionGrantType="grant"
            source={source}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scalesPageToFit={false}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            scrollEnabled={false}
            bounces={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            onMessage={onMessage}
          />
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    zIndex: 120,
    elevation: 120,
  },
  hidden: {
    opacity: 0,
  },
  fullscreen: {
    ...StyleSheet.absoluteFill,
    zIndex: 130,
    elevation: 130,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  launcher: {
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAUNCHER_SIZE / 2,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  launcherLabel: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    color: BRAND,
  },
});
