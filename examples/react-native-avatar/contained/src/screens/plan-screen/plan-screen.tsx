import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/screen';
import { workoutPlanBus } from '../../components/workout-plan-bus';
import { dayLabels, days } from '../../data/training';
import { useAppStore } from '../../state/app-store';
import { BRAND } from '../../theme';

export function PlanScreen() {
  const plan = useAppStore(state => state.plan);

  const details = [
    { label: 'Time', value: plan.time },
    { label: 'Intensity', value: plan.intensity, capitalize: true },
    { label: 'Duration', value: `${plan.durationMin} min` },
    { label: 'Rest day after', value: plan.restDayAfter ? 'On' : 'Off' },
  ];

  const handleEditPress = () => workoutPlanBus.open({ plan, suggested: false });

  return (
    <Screen title="Plan">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your weekly plan</Text>
        <View style={styles.week}>
          {days.map(day => {
            const active = plan.days.includes(day);

            return (
              <View key={day} style={[styles.day, active && styles.dayActive]}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>
                  {dayLabels[day]}
                </Text>
              </View>
            );
          })}
        </View>
        {details.map(detail => (
          <View key={detail.label} style={styles.row}>
            <Text style={styles.rowLabel}>{detail.label}</Text>
            <Text
              style={[styles.rowValue, detail.capitalize && styles.capitalize]}
            >
              {detail.value}
            </Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.button} onPress={handleEditPress}>
        <Text style={styles.buttonText}>Edit plan</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEE',
  },
  dayActive: {
    backgroundColor: BRAND,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  dayTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
  },
  rowLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  button: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
