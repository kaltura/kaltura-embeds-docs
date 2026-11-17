import {
  NavigationContainerRefWithCurrent,
  ParamListBase,
} from '@react-navigation/native';
import { member } from '../../data/training';
import { appStore } from '../../state/app-store';

const DEFAULT_SCREEN = 'Home';

export function getCurrentScreen(
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>,
) {
  return (
    (navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null) ??
    DEFAULT_SCREEN
  );
}

export function getDynamicVariables(currentScreen: string) {
  return {
    memberName: member.name,
    goal: member.goal,
    currentScreen,
    progressPeriod: appStore.getState().progressPeriod,
  };
}

export type DynamicVariables = ReturnType<typeof getDynamicVariables>;
