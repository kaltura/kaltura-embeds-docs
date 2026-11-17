import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/screen';
import { Period, trainingSummary } from '../../data/training';
import { appStore, useAppStore } from '../../state/app-store';
import { BRAND } from '../../theme';

const periods: { id: Period; label: string }[] = [
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'last_4_weeks', label: 'Last 4 weeks' },
];

const CHART_HEIGHT = 120;

export function ProgressScreen() {
  const period = useAppStore(state => state.progressPeriod);
  const summary = trainingSummary[period];

  const cards = [
    {
      label: 'Workouts done',
      value: `${summary.workoutsDone} of ${summary.workoutsPlanned}`,
    },
    { label: 'Active minutes', value: String(summary.activeMinutes) },
    { label: 'Avg intensity', value: summary.avgIntensity, capitalize: true },
    { label: 'Rest days', value: String(summary.restDays) },
  ];

  const maxMinutes = Math.max(...(summary.weeklyMinutes ?? [0]));

  return (
    <Screen title="Progress">
      <View style={styles.tabs}>
        {periods.map(item => (
          <Pressable
            key={item.id}
            style={[styles.tab, item.id === period && styles.tabActive]}
            onPress={() => appStore.setProgressPeriod(item.id)}
          >
            <Text
              style={[
                styles.tabText,
                item.id === period && styles.tabTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {cards.map(card => (
          <View key={card.label} style={styles.card}>
            <Text style={[styles.value, card.capitalize && styles.capitalize]}>
              {card.value}
            </Text>
            <Text style={styles.label}>{card.label}</Text>
          </View>
        ))}
      </View>
      {summary.weeklyMinutes && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Minutes per week</Text>
          <View style={styles.chart}>
            {summary.weeklyMinutes.map((minutes, index) => (
              <View key={index} style={styles.column}>
                <Text style={styles.barValue}>{minutes}</Text>
                <View
                  style={[
                    styles.bar,
                    { height: (minutes / maxMinutes) * CHART_HEIGHT },
                  ]}
                />
                <Text style={styles.barLabel}>Week {index + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: BRAND,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: BRAND,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: '#8E8E93',
  },
  chartCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: CHART_HEIGHT + 44,
    marginTop: 16,
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 32,
    marginVertical: 6,
    borderRadius: 6,
    backgroundColor: BRAND,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  barLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
