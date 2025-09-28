import React from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface Journey {
  id: number;
  start_city: string;
  end_city: string;
  description?: string;
  total_distance_miles: number;
  personal_progress_miles: number;
  progress_percentage: number;
  status?: string;
  difficulty?: string;
}

interface ActiveJourneyProps {
  journey: Journey;
}

export default function ActiveJourney({ journey }: ActiveJourneyProps) {
  const { endJourney, user } = useAuth();
  const [endingJourney, setEndingJourney] = React.useState(false);

  const handleEndJourney = () => {
    Alert.alert(
      'End Journey',
      'Are you sure you want to end your current journey? Your progress will be saved, but you won\'t earn completion rewards if you haven\'t finished.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Journey', style: 'destructive', onPress: confirmEndJourney }
      ]
    );
  };

  const confirmEndJourney = async () => {
    setEndingJourney(true);
    try {
      const result = await endJourney();
      if (result.success) {
        Alert.alert('Journey Ended', 'Your journey has been ended successfully.');
      } else {
        Alert.alert('Error', result.message || 'Failed to end journey');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to end journey');
    } finally {
      setEndingJourney(false);
    }
  };

  const remainingMiles = journey.total_distance_miles - journey.personal_progress_miles;
  const remainingSteps = Math.round(remainingMiles * 2000);
  const isCompleted = journey.progress_percentage >= 100;

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'hard':
        return '#f44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Current Journey</Text>
          {journey.difficulty && (
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(journey.difficulty) }]}>
              <Text style={styles.difficultyText}>{journey.difficulty}</Text>
            </View>
          )}
        </View>
        <Text style={styles.routeText}>
          {journey.start_city} → {journey.end_city}
        </Text>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Progress</Text>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(journey.progress_percentage, 100)}%`,
                backgroundColor: isCompleted ? '#4CAF50' : '#007AFF'
              }
            ]} 
          />
        </View>
        
        <View style={styles.progressStats}>
          <Text style={styles.progressPercentage}>
            {journey.progress_percentage.toFixed(1)}% Complete
          </Text>
          <Text style={styles.progressText}>
            {journey.personal_progress_miles.toFixed(1)} / {journey.total_distance_miles.toFixed(0)} miles
          </Text>
        </View>

        {isCompleted ? (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>🎉 Journey Completed!</Text>
            <Text style={styles.completedSubtext}>Congratulations on reaching your destination!</Text>
          </View>
        ) : (
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingTitle}>Remaining</Text>
            <Text style={styles.remainingMiles}>
              📍 {remainingMiles.toFixed(1)} miles
            </Text>
            <Text style={styles.remainingSteps}>
              🚶‍♂️ ~{remainingSteps.toLocaleString()} steps
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.today_steps?.toLocaleString() || '0'}</Text>
          <Text style={styles.statLabel}>Steps Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.total_miles?.toFixed(0) || '0'}</Text>
          <Text style={styles.statLabel}>Total Miles</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.endButton, endingJourney && styles.endButtonDisabled]}
        onPress={handleEndJourney}
        disabled={endingJourney}
      >
        <Text style={styles.endButtonText}>
          {endingJourney ? 'Ending Journey...' : 'End Journey'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  routeText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 25,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  completedContainer: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  remainingContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  remainingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  remainingMiles: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  remainingSteps: {
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  endButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  endButtonDisabled: {
    backgroundColor: '#ccc',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});