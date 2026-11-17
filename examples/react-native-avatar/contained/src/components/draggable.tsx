import { ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

const DRAG_SLOP = 8;
const DOCK_THRESHOLD = 36;
const MAX_OVERSHOOT = 64;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export type DockSide = 'left' | 'right';

type Props = {
  children: ReactNode;
  width: number;
  height: number;
  containerSize: { width: number; height: number };
  obstacle?: Animated.AnimatedInterpolation<number>;
  style?: StyleProp<ViewStyle>;
  dockable?: boolean;
  dockedSide?: DockSide;
  dockedY?: number;
  dockInset?: { left: number; right: number };
  onDock?: (side: DockSide, y: number) => void;
};

export function Draggable({
  children,
  width,
  height,
  containerSize,
  obstacle,
  style,
  dockable = false,
  dockedSide,
  dockedY,
  dockInset = { left: 0, right: 0 },
  onDock,
}: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const obstacleValue = useRef(0);
  const translateY = useMemo(() => {
    if (!obstacle) {
      return pan.y;
    }

    const pushed = Animated.add(obstacle, pan.y).interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolateLeft: 'clamp',
    });

    return Animated.subtract(pan.y, pushed);
  }, [pan, obstacle]);
  const startPosition = useRef({ x: 0, y: 0 });
  const position = useRef({ x: 0, y: 0 });
  const size = useRef({ width, height });
  size.current = { width, height };
  const container = useRef(containerSize);
  container.current = containerSize;
  const dockableRef = useRef(dockable);
  dockableRef.current = dockable;
  const dockedRef = useRef(dockedSide);
  dockedRef.current = dockedSide;
  const insetRef = useRef(dockInset);
  insetRef.current = dockInset;
  const onDockRef = useRef(onDock);
  onDockRef.current = onDock;
  const wasDocked = useRef(false);

  // Moving the dock handle along the edge decides where the window comes back to.
  useEffect(() => {
    if (dockedY === undefined || !dockedRef.current) {
      return;
    }

    position.current = { ...position.current, y: dockedY };
    pan.y.setValue(dockedY);
  }, [dockedY, pan]);

  useEffect(() => {
    if (dockedSide) {
      wasDocked.current = true;

      // Slide the whole window past the screen edge; the region itself is inset from it.
      const toValue =
        dockedSide === 'right'
          ? size.current.width + insetRef.current.right
          : -container.current.width - insetRef.current.left;

      Animated.spring(pan.x, { toValue, useNativeDriver: false }).start();
    } else if (wasDocked.current) {
      wasDocked.current = false;
      Animated.spring(pan.x, {
        toValue: position.current.x,
        useNativeDriver: false,
      }).start();
    }
  }, [dockedSide, pan]);

  useEffect(() => {
    if (!obstacle) {
      obstacleValue.current = 0;
      return;
    }

    const id = obstacle.addListener(({ value }) => {
      obstacleValue.current = value;
    });

    return () => obstacle.removeListener(id);
  }, [obstacle]);

  useEffect(() => {
    if (dockedRef.current) {
      return;
    }

    const clamped = {
      x: clamp(position.current.x, width - containerSize.width, 0),
      y: clamp(position.current.y, height - containerSize.height, 0),
    };

    if (clamped.x === position.current.x && clamped.y === position.current.y) {
      return;
    }

    position.current = clamped;
    Animated.spring(pan, {
      toValue: clamped,
      useNativeDriver: false,
    }).start();
  }, [width, height, containerSize.width, containerSize.height, pan]);

  const snapToNearestEdge = () => {
    const leftEdge = size.current.width - container.current.width;
    const x = position.current.x < leftEdge / 2 ? leftEdge : 0;
    position.current = { ...position.current, x };
    Animated.spring(pan, {
      toValue: position.current,
      useNativeDriver: false,
    }).start();
  };

  const releaseDrag = () => {
    const { x, y } = position.current;
    const restX = size.current.width - container.current.width;

    if (dockableRef.current && onDockRef.current) {
      if (x > DOCK_THRESHOLD) {
        position.current = { x: 0, y };
        onDockRef.current('right', y);
        return;
      }

      if (x < restX - DOCK_THRESHOLD) {
        position.current = { x: restX, y };
        onDockRef.current('left', y);
        return;
      }
    }

    snapToNearestEdge();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        !dockedRef.current && Math.hypot(dx, dy) > DRAG_SLOP,
      onPanResponderGrant: () => {
        pan.stopAnimation(value => {
          position.current = value;
        });

        const pushed = Math.max(0, obstacleValue.current + position.current.y);
        position.current = {
          ...position.current,
          y: position.current.y - pushed,
        };
        pan.y.setValue(position.current.y);
        startPosition.current = { ...position.current };
      },
      onPanResponderMove: (_, { dx, dy }) => {
        const bounds = container.current;
        const minY = size.current.height - bounds.height;
        const overshoot = dockableRef.current ? MAX_OVERSHOOT : 0;
        position.current = {
          x: clamp(
            startPosition.current.x + dx,
            size.current.width - bounds.width - overshoot,
            overshoot,
          ),
          y: clamp(
            startPosition.current.y + dy,
            minY,
            Math.max(-obstacleValue.current, minY),
          ),
        };
        pan.setValue(position.current);
      },
      onPanResponderRelease: () => releaseDrag(),
      onPanResponderTerminate: () => releaseDrag(),
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.draggable,
        { width, height },
        style,
        { transform: [{ translateX: pan.x }, { translateY }] },
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  draggable: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
