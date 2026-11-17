export const periods = ['this_week', 'last_week', 'last_4_weeks'] as const;
export type Period = (typeof periods)[number];

export const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof days)[number];

export const dayLabels: Record<Day, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const intensities = ['light', 'moderate', 'hard'] as const;
export type Intensity = (typeof intensities)[number];

export type Plan = {
  days: Day[];
  time: string;
  intensity: Intensity;
  durationMin: number;
  restDayAfter: boolean;
};

export type TrainingSummary = {
  workoutsDone: number;
  workoutsPlanned: number;
  activeMinutes: number;
  avgIntensity: Intensity;
  restDays: number;
  hardDaysInARow: number;
  minutesVsPreviousPct: number;
  weeklyMinutes?: number[];
};

export const trainingSummary: Record<Period, TrainingSummary> = {
  this_week: {
    workoutsDone: 1,
    workoutsPlanned: 3,
    activeMinutes: 38,
    avgIntensity: 'moderate',
    restDays: 0,
    hardDaysInARow: 1,
    minutesVsPreviousPct: -70,
  },
  last_week: {
    workoutsDone: 3,
    workoutsPlanned: 5,
    activeMinutes: 128,
    avgIntensity: 'hard',
    restDays: 1,
    hardDaysInARow: 3,
    minutesVsPreviousPct: -15,
  },
  last_4_weeks: {
    workoutsDone: 14,
    workoutsPlanned: 20,
    activeMinutes: 638,
    avgIntensity: 'hard',
    restDays: 5,
    hardDaysInARow: 3,
    minutesVsPreviousPct: -33,
    weeklyMinutes: [190, 170, 150, 128],
  },
};

export const defaultPlan: Plan = {
  days: ['mon', 'tue', 'wed', 'fri', 'sat'],
  time: '06:30',
  intensity: 'hard',
  durationMin: 45,
  restDayAfter: false,
};

export const member = {
  name: 'Alex',
  goal: 'Run a 10K in 8 weeks',
};
