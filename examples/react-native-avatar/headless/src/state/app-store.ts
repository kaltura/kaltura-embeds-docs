import { useSyncExternalStore } from 'react';
import { defaultPlan, Period, Plan } from '../data/training';

type State = {
  progressPeriod: Period;
  plan: Plan;
};

type Listener = () => void;

let state: State = { progressPeriod: 'last_week', plan: defaultPlan };

const listeners = new Set<Listener>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
}

export const appStore = {
  getState: () => state,
  setProgressPeriod: (progressPeriod: Period) => update({ progressPeriod }),
  setPlan: (plan: Plan) => update({ plan }),
  subscribe(listener: Listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

export function useAppStore<T>(selector: (current: State) => T) {
  return useSyncExternalStore(appStore.subscribe, () => selector(state));
}
