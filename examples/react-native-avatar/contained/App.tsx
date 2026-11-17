/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  EdgeInsetsValue,
  StatusBar,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetProvider } from '@swmansion/react-native-bottom-sheet';
import { Avatar } from './src/components/avatar';
import { Navigation } from './src/components/navigation';
import { WorkoutPlanSheet } from './src/components/workout-plan-sheet';

function App() {
  const [tabBarHeight, setTabBarHeight] = useState<number>();
  const sheetVisibleHeight = useRef(new Animated.Value(0)).current;

  const draggableArea = useMemo<EdgeInsetsValue | undefined>(
    () =>
      tabBarHeight === undefined
        ? undefined
        : { top: 0, right: 0, bottom: tabBarHeight, left: 0 },
    [tabBarHeight],
  );

  const navigationRef = useNavigationContainerRef();

  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <BottomSheetProvider>
        <SafeAreaView style={styles.container}>
          <Navigation
            navigationRef={navigationRef}
            onHeightChange={setTabBarHeight}
          />
        </SafeAreaView>
        <WorkoutPlanSheet visibleHeight={sheetVisibleHeight} />
      </BottomSheetProvider>
      {draggableArea && (
        <Avatar
          draggableArea={draggableArea}
          navigationRef={navigationRef}
          sheetVisibleHeight={sheetVisibleHeight}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
