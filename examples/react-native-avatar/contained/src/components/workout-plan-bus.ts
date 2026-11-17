import { Plan } from '../data/training';

export type DismissReason = 'member' | 'lifecycle';

export type WorkoutPlanRequest = {
  plan: Plan;
  suggested: boolean;
  onSave?: (plan: Plan, edited: boolean) => void;
  onDismiss?: (reason: DismissReason) => void;
};

type Listener = (request: WorkoutPlanRequest) => void;

const listeners = new Set<Listener>();

export const workoutPlanBus = {
  open(request: WorkoutPlanRequest) {
    listeners.forEach(listener => listener(request));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
