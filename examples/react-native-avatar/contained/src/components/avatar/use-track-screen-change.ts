import { useCallback, useEffect, useRef } from 'react';
import {
  NavigationContainerRefWithCurrent,
  ParamListBase,
} from '@react-navigation/native';
import { appStore } from '../../state/app-store';
import { getCurrentScreen, getDynamicVariables } from './dynamic-variables';

type Params = {
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
  injectJavascript: (script: string) => void;
};

export function useTrackScreenChange({
  navigationRef,
  injectJavascript,
}: Params) {
  const currentScreen = useRef(getCurrentScreen(navigationRef));
  const lastSent = useRef(
    JSON.stringify(getDynamicVariables(currentScreen.current)),
  );

  const sendIfChanged = useCallback(() => {
    const variables = JSON.stringify(
      getDynamicVariables(currentScreen.current),
    );

    if (variables === lastSent.current) {
      return;
    }

    lastSent.current = variables;
    injectJavascript(`window.onScreenChanged?.(${variables})`);
  }, [injectJavascript]);

  useEffect(
    () =>
      navigationRef.addListener('state', ({ data: { state } }) => {
        const screen = state?.routes[state.index ?? 0]?.name;

        if (screen) {
          currentScreen.current = screen;
          sendIfChanged();
        }
      }),
    [navigationRef, sendIfChanged],
  );

  useEffect(() => appStore.subscribe(sendIfChanged), [sendIfChanged]);
}
