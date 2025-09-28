import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ActiveJourney from './ActiveJourney';

interface JourneyTemplate {
  id: number;
  start_city: string;
  end_city: string;
  description: string;
  total_distance_miles: number;
  difficulty: string;
  is_template: true;
  is_active: true;
}

interface JourneyListProps {
  showActiveJourney?: boolean;
  currentJourney?: any;
}

export default function JourneyList({ showActiveJourney = false, currentJourney }: JourneyListProps) {
  const { fetchJourneyTemplates, startJourney, user } = useAuth();
  const [journeys, setJourneys] = useState<JourneyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingJourney, setStartingJourney] = useState<number | null>(null);

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    setLoading(true);
    try {
      const result = await fetchJourneyTemplates();
      if (result.success && result.journeys) {
        setJourneys(result.journeys);
      } else {
        Alert.alert('Error', result.message || 'Failed to load journeys');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load journeys');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJourney = async (templateId: number, journeyName: string) => {
    if (user?.current_journey) {
      Alert.alert(
        'Journey in Progress',
        'You already have an active journey. Would you like to end it and start a new one?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start New Journey', onPress: () => confirmStartJourney(templateId, journeyName) }
        ]
      );
      return;
    }

    await confirmStartJourney(templateId, journeyName);
  };

  const confirmStartJourney = async (templateId: number, journeyName: string) => {
    setStartingJourney(templateId);
    try {
      const result = await startJourney(templateId);
      if (result.success) {
        Alert.alert('Journey Started!', `Successfully started: ${journeyName}`);
      } else {
        Alert.alert('Error', result.message || 'Failed to start journey');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start journey');
    } finally {
      setStartingJourney(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
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

  const renderJourneyItem = ({ item }: { item: JourneyTemplate }) => (
    <View style={styles.journeyCard}>
      <View style={styles.journeyHeader}>
        <Text style={styles.journeyTitle}>
          {item.start_city} → {item.end_city}
        </Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </View>
      </View>
      
      <Text style={styles.journeyDescription}>{item.description}</Text>
      
      <View style={styles.journeyStats}>
        <Text style={styles.statText}>
          📍 Distance: {item.total_distance_miles.toFixed(0)} miles
        </Text>
        <Text style={styles.statText}>
          🚶‍♂️ ~{Math.round(item.total_distance_miles * 2000).toLocaleString()} steps
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.startButton,
          startingJourney === item.id && styles.startButtonDisabled
        ]}
        onPress={() => handleStartJourney(item.id, `${item.start_city} to ${item.end_city}`)}
        disabled={startingJourney === item.id}
      >
        <Text style={styles.startButtonText}>
          {startingJourney === item.id ? 'Starting...' : 'Start Journey'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderListHeader = () => (
    <View>
      {showActiveJourney && currentJourney && (
        <View>
          <ActiveJourney journey={currentJourney} />
          <View style={styles.journeyListHeader}>
            <Text style={styles.sectionTitle}>Available Journeys</Text>
            <Text style={styles.sectionSubtitle}>
              Complete your current journey or end it to start a new one
            </Text>
          </View>
        </View>
      )}
      {!showActiveJourney && (
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Journey</Text>
          <Text style={styles.subtitle}>
            Select a journey to begin your adventure
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading journeys...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={journeys}
        renderItem={renderJourneyItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadJourneys}
        ListHeaderComponent={renderListHeader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  journeyListHeader: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  journeyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  journeyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  journeyDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  journeyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statText: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});