import { useCallback, useMemo, useRef, useState } from 'react';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { renderHtml } from './avatar-html';
import { getCurrentScreen, getDynamicVariables } from './dynamic-variables';
import { ToolCall } from './native-tools';
import { useCallTool } from './use-call-tool';
import { useTrackScreenChange } from './use-track-screen-change';
import { storage } from '../../utils/storage';
import Config from 'react-native-config';
import {
  NavigationContainerRefWithCurrent,
  ParamListBase,
} from '@react-navigation/native';

type Message =
  | {
      type: 'thread';
      id: string;
    }
  | {
      type: 'error';
      reason: string;
    }
  | { type: 'status'; status: string }
  | { type: 'tool'; tool: ToolCall };

type UseAvatarProps = {
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>;
  onDisconnecting: () => void;
};

export function useAvatar({ navigationRef, onDisconnecting }: UseAvatarProps) {
  const webViewRef = useRef<WebView<object>>(null);
  const [threadId] = useState(() => storage.getString('threadId'));

  const injectJavascript = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(`${script}; true;`);
  }, []);

  useTrackScreenChange({ navigationRef, injectJavascript });

  const callTool = useCallTool({ injectJavascript, navigationRef });

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as Message;

        console.log('Avatar | Received Message - ', message);

        switch (message.type) {
          case 'thread': {
            // Persist only: updating state here would rebuild the html and reload the live WebView
            storage.set('threadId', message.id);
            break;
          }
          case 'error': {
            console.error('Avatar |', message.reason);
            break;
          }
          case 'tool': {
            callTool(message.tool);
            break;
          }
          case 'status': {
            if (message.status === 'disconnecting') {
              onDisconnecting();
            }
            break;
          }
        }
      } catch (error) {
        console.log('Avatar | Unknown Message', error);
      }
    },
    [callTool, onDisconnecting],
  );

  const source = useMemo(
    () => ({
      html: renderHtml({
        partnerId: Config.PARTNER_ID!,
        widgetId: Config.WIDGET_ID!,
        dynamicVariables: getDynamicVariables(getCurrentScreen(navigationRef)),
        thread: threadId,
      }),
      baseUrl: 'https://example.com',
    }),
    [navigationRef, threadId],
  );

  return { source, webViewRef, onMessage: handleMessage };
}
