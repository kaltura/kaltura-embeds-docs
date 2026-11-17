import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ChevronDownIcon from '../../../assets/chevron-down.svg';
import { BRAND, BRAND_TINT } from '../../theme';
import { Capability } from './capabilities';

const ICON_SIZE = 24;
const DURATION = 240;

type Props = {
  capability: Capability;
  open: boolean;
  onPress: () => void;
};

export function CapabilityCard({
  capability: { title, description, example, Icon },
  open,
  onPress,
}: Props) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [bodyHeight, setBodyHeight] = useState(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open, progress]);

  const handleBodyLayout = ({ nativeEvent }: LayoutChangeEvent) =>
    setBodyHeight(nativeEvent.layout.height);

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, bodyHeight],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onPress}>
        <View style={styles.iconTile}>
          <Icon width={ICON_SIZE} height={ICON_SIZE} fill={BRAND} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDownIcon
            width={ICON_SIZE}
            height={ICON_SIZE}
            fill="#8E8E93"
          />
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.clip, { height, opacity: progress }]}>
        <View style={styles.body} onLayout={handleBodyLayout}>
          <Text style={styles.description}>{description}</Text>
          {example && (
            <View style={styles.example}>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_TINT,
  },
  title: {
    flex: 1,
    marginHorizontal: 14,
    fontSize: 17,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  clip: {
    overflow: 'hidden',
  },
  body: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6C6C70',
  },
  example: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7C7CC',
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1C1C1E',
  },
});
