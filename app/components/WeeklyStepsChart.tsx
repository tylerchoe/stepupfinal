import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface WeeklyStepsChartProps {
  style?: ViewStyle;
}

const WeeklyStepsChart: React.FC<WeeklyStepsChartProps> = ({ style }) => {
  const { fetchWeeklySteps } = useAuth();
  const [weeklyData, setWeeklyData] = useState<{ date: string; steps: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeeklySteps = async () => {
      setLoading(true);
      try {
        const result = await fetchWeeklySteps();
        if (result.success && result.weeklySteps) {
          setWeeklyData(result.weeklySteps);
        }
      } catch (error) {
        console.error('Error loading weekly steps:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWeeklySteps();
  }, []);

  const maxSteps = Math.max(...weeklyData.map(d => d.steps), 100);

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Weekly Steps</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Weekly Steps</Text>
      <View style={styles.chartContainer}>
        {weeklyData.length === 0 ? (
          <Text style={styles.noDataText}>No step data available</Text>
        ) : (
          <View style={styles.chart}>
            {weeklyData.map((day, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max((day.steps / maxSteps) * 80, 2), // Minimum height of 2 for visibility
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{getDayName(day.date)}</Text>
                <Text style={styles.stepsLabel}>{day.steps}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    height: 150,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 40,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    paddingBottom: 40,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    width: '80%',
  },
  bar: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    minHeight: 2,
    width: '100%',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  stepsLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default WeeklyStepsChart;