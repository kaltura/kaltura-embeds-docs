import { ReactNode, useCallback, useEffect } from 'react';
import {
  createBottomTabNavigator,
  useBottomTabBarHeight,
} from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  NavigationContainerRefWithCurrent,
  ParamListBase,
} from '@react-navigation/native';
import { HomeScreen } from '../screens/home-screen';
import { WorkoutsScreen } from '../screens/workouts-screen';
import { ProgressScreen } from '../screens/progress-screen';
import { PlanScreen } from '../screens/plan-screen';
import { BRAND } from '../theme';

import HomeIcon from '../../assets/home.svg';
import FitnessIcon from '../../assets/fitness.svg';
import ProgressIcon from '../../assets/progress.svg';
import CalendarIcon from '../../assets/calendar.svg';

const Tab = createBottomTabNavigator();

type IconProps = { color: string };

const renderHomeIcon = ({ color }: IconProps) => (
  <HomeIcon width={24} height={24} fill={color} />
);
const renderWorkoutsIcon = ({ color }: IconProps) => (
  <FitnessIcon width={24} height={24} fill={color} />
);
const renderProgressIcon =({ color }: IconProps) => (
  <ProgressIcon fill={color} />
);
const renderPlanIcon = ({ color }: IconProps) => <CalendarIcon fill={color} />;

type HeightReporterProps = {
  children: ReactNode;
  onHeightChange: (height: number) => void;
};

function TabBarHeightReporter({
  children,
  onHeightChange,
}: HeightReporterProps) {
  const height = useBottomTabBarHeight();

  useEffect(() => {
    onHeightChange(height);
  }, [height, onHeightChange]);

  return children;
}

type Props = {
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
  onHeightChange: (height: number) => void;
};

export function Navigation({ navigationRef, onHeightChange }: Props) {
  const screenLayout = useCallback(
    ({ children }: { children: ReactNode }) => (
      <TabBarHeightReporter onHeightChange={onHeightChange}>
        {children}
      </TabBarHeightReporter>
    ),
    [onHeightChange],
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <Tab.Navigator
        screenLayout={screenLayout}
        screenOptions={{
          tabBarActiveTintColor: BRAND,
          tabBarInactiveTintColor: '#8E8E93',
          headerTitleAlign: 'center',
          animation: 'shift',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false, tabBarIcon: renderHomeIcon }}
        />
        <Tab.Screen
          name="Workouts"
          component={WorkoutsScreen}
          options={{ headerShown: false, tabBarIcon: renderWorkoutsIcon }}
        />
        <Tab.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ headerShown: false, tabBarIcon: renderProgressIcon }}
        />
        <Tab.Screen
          name="Plan"
          component={PlanScreen}
          options={{ headerShown: false, tabBarIcon: renderPlanIcon }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
