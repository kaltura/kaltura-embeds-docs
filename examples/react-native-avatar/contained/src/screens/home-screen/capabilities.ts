import { FC } from 'react';
import { SvgProps } from 'react-native-svg';
import CalendarIcon from '../../../assets/calendar.svg';
import MicIcon from '../../../assets/mic.svg';
import SearchListIcon from '../../../assets/search-list.svg';
import SwapIcon from '../../../assets/swap.svg';

export type Capability = {
  id: string;
  title: string;
  description: string;
  example?: string;
  Icon: FC<SvgProps>;
};

// One entry per thing the agent can do here: voice, then each client tool, then the avatar itself.
export const capabilities: Capability[] = [
  {
    id: 'talk',
    title: 'Talk to the agent',
    description:
      'Speak naturally. The agent listens, answers by voice, and stays on screen while you use the app.',
    example: '"Hi, what can you help me with?"',
    Icon: MicIcon,
  },
  {
    id: 'summary',
    title: 'Ask about your workouts',
    description:
      'The agent reads your training summary for this week, last week or the last 4 weeks and answers with your numbers.',
    example: '"How did last week go?"',
    Icon: SearchListIcon,
  },
  {
    id: 'navigate',
    title: 'Navigate the app',
    description:
      'Ask the agent to open Home, Workouts, Progress or Plan, and to pick the period shown on Progress.',
    example: '"Show me my progress for the last 4 weeks."',
    Icon: SwapIcon,
  },
  {
    id: 'plan',
    title: 'Plan your week',
    description:
      'The agent proposes a plan and opens it in a bottom sheet. Edit it, save or dismiss, and the agent reacts to what you chose.',
    example: '"Plan my next week, I want to run in the mornings."',
    Icon: CalendarIcon,
  },
];
