import {
  Day,
  days,
  Intensity,
  intensities,
  Period,
  periods,
  Plan,
} from '../../data/training';

type GetTrainingSummary = {
  id: number;
  name: 'get_training_summary';
  args: {
    period?: string;
  };
};

type GoTo = {
  id: number;
  name: 'go_to';
  args: {
    destination: string;
    period?: string;
  };
};

type ProposeWorkoutPlan = {
  id: number;
  name: 'propose_workout_plan';
  args: {
    days: string;
    time: string;
    intensity: string;
    duration_min?: number;
    rest_day_after?: boolean;
  };
};

type GetPlanResult = {
  id: number;
  name: 'get_plan_result';
  args: Record<string, never>;
};

export type ToolCall =
  | GetTrainingSummary
  | GoTo
  | ProposeWorkoutPlan
  | GetPlanResult;

export const destinations = {
  home: 'Home',
  workouts: 'Workouts',
  progress: 'Progress',
  plan: 'Plan',
} as const;

export type Destination = keyof typeof destinations;

export const MIN_DURATION = 20;
export const MAX_DURATION = 90;
export const DURATION_STEP = 5;
export const DEFAULT_DURATION = 45;

export function isPeriod(value: string): value is Period {
  return (periods as readonly string[]).includes(value);
}

export function isDestination(value: string): value is Destination {
  return value in destinations;
}

export function isIntensity(value: string): value is Intensity {
  return (intensities as readonly string[]).includes(value);
}

function isDay(value: string): value is Day {
  return (days as readonly string[]).includes(value);
}

// propose_workout_plan does not wait for the member (Wait for response is off), so the agent keeps talking while the
// sheet is open. When the member saves or dismisses, the app only sends this trigger text; the agent then calls
// get_plan_result to read the decision.
export const PLAN_DECIDED_EVENT = '[app event] plan_decided';

export type PlanDecision =
  | { status: 'open' }
  | { status: 'dismissed' }
  | {
      status: 'saved';
      days: string;
      time: string;
      intensity: Intensity;
      duration_min: number;
      rest_day_after: boolean;
      edited: boolean;
    };

export function savedDecision(plan: Plan, edited: boolean): PlanDecision {
  return {
    status: 'saved',
    days: plan.days.join(','),
    time: plan.time,
    intensity: plan.intensity,
    duration_min: plan.durationMin,
    rest_day_after: plan.restDayAfter,
    edited,
  };
}

export function parseProposedPlan(
  args: ProposeWorkoutPlan['args'],
): { plan: Plan } | { error: string } {
  const requested = String(args.days ?? '')
    .split(',')
    .map(day => day.trim().toLowerCase())
    .filter(Boolean);
  const invalidDay = requested.find(day => !isDay(day));

  if (!requested.length || invalidDay !== undefined) {
    return {
      error: `invalid day "${invalidDay ?? args.days}"; use ${days.join(',')}`,
    };
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(args.time))) {
    return { error: `invalid time "${args.time}"; use HH:MM, 24h` };
  }

  if (!isIntensity(String(args.intensity))) {
    return {
      error: `invalid intensity "${args.intensity}"; use ${intensities.join(
        ', ',
      )}`,
    };
  }

  const duration = Math.min(
    MAX_DURATION,
    Math.max(MIN_DURATION, args.duration_min ?? DEFAULT_DURATION),
  );

  return {
    plan: {
      days: days.filter(day => requested.includes(day)),
      time: args.time,
      intensity: args.intensity as Intensity,
      durationMin: Math.round(duration / DURATION_STEP) * DURATION_STEP,
      restDayAfter: args.rest_day_after ?? true,
    },
  };
}
