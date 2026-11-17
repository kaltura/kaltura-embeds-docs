import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Animated,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ModalBottomSheet,
  PositionChangeEventData,
} from '@swmansion/react-native-bottom-sheet';
import {
  Day,
  dayLabels,
  days,
  Intensity,
  intensities,
  Plan,
} from '../data/training';
import { appStore } from '../state/app-store';
import { BRAND, BRAND_TINT } from '../theme';
import {
  DURATION_STEP,
  MAX_DURATION,
  MIN_DURATION,
} from './avatar/native-tools';
import {
  DismissReason,
  workoutPlanBus,
  WorkoutPlanRequest,
} from './workout-plan-bus';

const CLOSED_INDEX = 0;
const OPEN_INDEX = 1;
const SHEET_PADDING = 20;

const pad = (value: number) => String(value).padStart(2, '0');

const isSamePlan = (a: Plan, b: Plan) =>
  a.days.join() === b.days.join() &&
  a.time === b.time &&
  a.intensity === b.intensity &&
  a.durationMin === b.durationMin &&
  a.restDayAfter === b.restDayAfter;

type StepperProps = {
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

function Stepper({ value, onDecrement, onIncrement }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} onPress={onDecrement}>
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} onPress={onIncrement}>
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

type RowProps = {
  label: string;
  children: ReactNode;
};

function Row({ label, children }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

type PlanFormProps = {
  request: WorkoutPlanRequest;
  bottomInset: number;
  onSave: (plan: Plan) => void;
  onDismiss: () => void;
};

function PlanForm({ request, bottomInset, onSave, onDismiss }: PlanFormProps) {
  const [selectedDays, setSelectedDays] = useState<Day[]>(request.plan.days);
  const [time, setTime] = useState(request.plan.time);
  const [intensity, setIntensity] = useState<Intensity>(request.plan.intensity);
  const [durationMin, setDurationMin] = useState(request.plan.durationMin);
  const [restDayAfter, setRestDayAfter] = useState(request.plan.restDayAfter);

  const [hour, minute] = time.split(':').map(Number);

  const handleToggleDay = (day: Day) =>
    setSelectedDays(current =>
      days.filter(item => (item === day) !== current.includes(item)),
    );

  const handleHourChange = (delta: number) =>
    setTime(`${pad((hour + delta + 24) % 24)}:${pad(minute)}`);

  const handleMinuteChange = (delta: number) =>
    setTime(`${pad(hour)}:${pad((minute + delta * 5 + 60) % 60)}`);

  const handleDurationChange = (delta: number) =>
    setDurationMin(current =>
      Math.min(
        MAX_DURATION,
        Math.max(MIN_DURATION, current + delta * DURATION_STEP),
      ),
    );

  const handleSave = () =>
    onSave({
      days: selectedDays,
      time,
      intensity,
      durationMin,
      restDayAfter,
    });

  const canSave = selectedDays.length > 0;

  return (
    <View
      style={[styles.content, { paddingBottom: bottomInset + SHEET_PADDING }]}
    >
      <View style={styles.handle} />
      <View>
        <Text style={styles.title}>Your new plan</Text>
        {request.suggested && (
          <Text style={styles.note}>Suggested by your coach</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Days</Text>
        <View style={styles.chips}>
          {days.map(day => {
            const active = selectedDays.includes(day);

            return (
              <Pressable
                key={day}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleToggleDay(day)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {dayLabels[day]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Row label="Time">
        <View style={styles.time}>
          <Stepper
            value={pad(hour)}
            onDecrement={() => handleHourChange(-1)}
            onIncrement={() => handleHourChange(1)}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <Stepper
            value={pad(minute)}
            onDecrement={() => handleMinuteChange(-1)}
            onIncrement={() => handleMinuteChange(1)}
          />
        </View>
      </Row>

      <View style={styles.field}>
        <Text style={styles.label}>Intensity</Text>
        <View style={styles.segmented}>
          {intensities.map(item => (
            <Pressable
              key={item}
              style={[
                styles.segment,
                item === intensity && styles.segmentActive,
              ]}
              onPress={() => setIntensity(item)}
            >
              <Text
                style={[
                  styles.segmentText,
                  item === intensity && styles.segmentTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Row label="Duration">
        <Stepper
          value={`${durationMin} min`}
          onDecrement={() => handleDurationChange(-1)}
          onIncrement={() => handleDurationChange(1)}
        />
      </Row>

      <Row label="Rest day after hard sessions">
        <Switch
          value={restDayAfter}
          onValueChange={setRestDayAfter}
          trackColor={{ true: BRAND }}
        />
      </Row>

      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={onDismiss}
        >
          <Text style={styles.buttonSecondaryText}>Dismiss</Text>
        </Pressable>
        <Pressable
          style={[styles.button, !canSave && styles.buttonDisabled]}
          disabled={!canSave}
          onPress={handleSave}
        >
          <Text style={styles.buttonText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

type WorkoutPlanSheetProps = {
  visibleHeight: Animated.Value;
};

export function WorkoutPlanSheet({ visibleHeight }: WorkoutPlanSheetProps) {
  const [request, setRequest] = useState<WorkoutPlanRequest>();
  const [requestCount, setRequestCount] = useState(0);
  const [index, setIndex] = useState(CLOSED_INDEX);
  const pending = useRef<WorkoutPlanRequest | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const settle = useCallback((saved?: Plan, reason: DismissReason = 'member') => {
    const current = pending.current;

    if (!current) {
      return;
    }

    pending.current = undefined;
    setIndex(CLOSED_INDEX);

    if (saved) {
      appStore.setPlan(saved);
      current.onSave?.(saved, !isSamePlan(saved, current.plan));
    } else {
      current.onDismiss?.(reason);
    }
  }, []);

  const handleDismiss = useCallback(() => settle(), [settle]);

  useEffect(
    () =>
      workoutPlanBus.subscribe(next => {
        settle();
        pending.current = next;
        setRequest(next);
        setRequestCount(count => count + 1);
        setIndex(OPEN_INDEX);
      }),
    [settle],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        settle(undefined, 'lifecycle');
      }
    });

    return () => subscription.remove();
  }, [settle]);

  if (!request) {
    return null;
  }

  const handleIndexChange = (next: number) => {
    if (next === CLOSED_INDEX) {
      settle();
    }
  };

  const handlePositionChange = ({
    nativeEvent,
  }: NativeSyntheticEvent<PositionChangeEventData>) =>
    visibleHeight.setValue(nativeEvent.position);

  const handleSettle = (settled: number) => {
    if (settled === CLOSED_INDEX) {
      visibleHeight.setValue(0);
    }
  };

  return (
    <ModalBottomSheet
      lazy
      index={index}
      detents={[0, 'content']}
      scrimColor="rgba(0, 0, 0, 0.6)"
      surface={<View style={styles.surface} />}
      surfaceStyle={styles.surfaceShape}
      onCloseRequest={handleDismiss}
      onIndexChange={handleIndexChange}
      onSettle={handleSettle}
      onPositionChange={handlePositionChange}
    >
      <PlanForm
        key={requestCount}
        request={request}
        bottomInset={insets.bottom}
        onSave={settle}
        onDismiss={handleDismiss}
      />
    </ModalBottomSheet>
  );
}

const styles = StyleSheet.create({
  surface: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#fff',
  },
  surfaceShape: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  content: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D5DA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2227',
  },
  note: {
    marginTop: 2,
    fontSize: 13,
    color: BRAND,
  },
  field: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#56606A',
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F5F7',
  },
  chipActive: {
    backgroundColor: BRAND,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#56606A',
  },
  chipTextActive: {
    color: '#fff',
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E2227',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_TINT,
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    color: BRAND,
  },
  stepperValue: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#1E2227',
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#F3F5F7',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: BRAND,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#56606A',
    textTransform: 'capitalize',
  },
  segmentTextActive: {
    color: '#fff',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonSecondary: {
    backgroundColor: '#F3F5F7',
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E2227',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
