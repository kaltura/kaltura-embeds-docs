import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/screen';

type Intensity = 'light' | 'moderate' | 'hard';

const workouts: {
  id: string;
  date: string;
  type: string;
  minutes: number;
  intensity: Intensity;
}[] = [
  { id: '1', date: 'Nov 16', type: 'Run', minutes: 38, intensity: 'moderate' },
  { id: '2', date: 'Nov 11', type: 'Ride', minutes: 43, intensity: 'hard' },
  { id: '3', date: 'Nov 10', type: 'Run', minutes: 40, intensity: 'hard' },
  { id: '4', date: 'Nov 9', type: 'Strength', minutes: 45, intensity: 'hard' },
  { id: '5', date: 'Nov 5', type: 'Run', minutes: 50, intensity: 'moderate' },
  { id: '6', date: 'Nov 3', type: 'Yoga', minutes: 30, intensity: 'light' },
];

const intensityColors: Record<Intensity, string> = {
  light: '#34C759',
  moderate: '#FF9500',
  hard: '#DA2128',
};

export function WorkoutsScreen() {
  return (
    <Screen title="Workouts">
      {workouts.map(workout => (
        <View key={workout.id} style={styles.card}>
          <View style={styles.info}>
            <Text style={styles.type}>{workout.type}</Text>
            <Text style={styles.meta}>
              {workout.date} · {workout.minutes} min
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: intensityColors[workout.intensity] },
            ]}
          >
            <Text style={styles.badgeText}>{workout.intensity}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  info: {
    flex: 1,
  },
  type: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: '#8E8E93',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'capitalize',
  },
});
