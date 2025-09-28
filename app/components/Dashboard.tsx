import { Activity, Award, BarChart3, LogOut, MapPin, Navigation, Trophy, Users, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import BossBattle from './BossBattle';
import Friends from './Friends';
import JourneyList from './JourneyList';
import Leaderboard from './Leaderboard';
import WeeklyStepsChart from './WeeklyStepsChart';

type TabType = 'stats' | 'journeys' | 'bosses' | 'friends' | 'leaderboard';

export const Dashboard: React.FC = () => {
  const { user, logout, syncSteps } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [stepInput, setStepInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSyncSteps = async () => {
    if (!stepInput || isNaN(Number(stepInput))) {
      Alert.alert('Error', 'Please enter a valid number of steps');
      return;
    }

    const stepsToAdd = parseInt(stepInput);
    setSyncing(true);
    setMessage('');
    const result = await syncSteps(stepsToAdd);
    
    if (result.success) {
      setMessage(`Added ${stepsToAdd} steps successfully!`);
      setStepInput('');
    } else {
      setMessage(`Error: ${result.message}`);
    }
    setSyncing(false);
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const renderStatsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statCardInner}>
            <View style={[styles.statIcon, styles.blueIcon]}>
              <Activity size={24} color="#2563eb" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Available Steps</Text>
              <Text style={styles.statValue}>{user.today_steps?.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardInner}>
            <View style={[styles.statIcon, styles.greenIcon]}>
              <BarChart3 size={24} color="#16a34a" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Steps</Text>
              <Text style={styles.statValue}>{user.total_steps_life?.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardInner}>
            <View style={[styles.statIcon, styles.redIcon]}>
              <MapPin size={24} color="#dc2626" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Miles</Text>
              <Text style={styles.statValue}>{user.total_miles}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardInner}>
            <View style={[styles.statIcon, styles.purpleIcon]}>
              <Award size={24} color="#9333ea" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{user.streak} days</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Weekly Steps Chart */}
      <WeeklyStepsChart />

      {/* Step Sync Form */}
      <View style={styles.syncCard}>
        <Text style={styles.sectionTitle}>Add Steps</Text>
        <View style={styles.syncForm}>
          <TextInput
            style={styles.stepInput}
            value={stepInput}
            onChangeText={setStepInput}
            placeholder="Enter steps to add"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.disabledButton]}
            onPress={handleSyncSteps}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.syncButtonText}>Add Steps</Text>
            )}
          </TouchableOpacity>
        </View>
        {message ? (
          <Text style={[
            styles.message,
            message.includes('Error') ? styles.errorMessage : styles.successMessage
          ]}>
            {message}
          </Text>
        ) : null}
      </View>

      {/* XP Progress */}
      <View style={styles.xpCard}>
        <Text style={styles.sectionTitle}>Level Progress</Text>
        <View style={styles.xpProgress}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpText}>
              Level {user.level} • {user.current_exp} / {user.exp_to_next_level} XP
            </Text>
          </View>
          <View style={styles.xpBar}>
            <View 
              style={[
                styles.xpFill,
                { width: `${(user.current_exp / user.exp_to_next_level) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Badges */}
      {user.badges && user.badges.length > 0 && (
        <View style={styles.badgesCard}>
          <Text style={styles.sectionTitle}>Badges Earned</Text>
          <View style={styles.badgesGrid}>
            {user.badges.map((badge, index) => (
              <View key={index} style={styles.badge}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderJourneysTab = () => (
    <View style={styles.journeyTabContainer}>
      <JourneyList 
        showActiveJourney={!!user.current_journey}
        currentJourney={user.current_journey}
      />
    </View>
  );

  const renderBossesTab = () => (
    <View style={styles.bossTabContainer}>
      <BossBattle />
    </View>
  );

  const renderFriendsTab = () => (
    <View style={styles.friendsTabContainer}>
      <Friends />
    </View>
  );

  const renderLeaderboardTab = () => (
    <View style={styles.leaderboardTabContainer}>
      <Leaderboard />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Activity size={32} color="#2563eb" />
          <Text style={styles.headerTitle}>StepUp</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.welcomeText}>Welcome, {user.display_name}!</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Activity size={12} color={activeTab === 'stats' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'journeys' && styles.activeTab]}
          onPress={() => setActiveTab('journeys')}
        >
          <Navigation size={12} color={activeTab === 'journeys' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'journeys' && styles.activeTabText]}>
            Journeys
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'bosses' && styles.activeTab]}
          onPress={() => setActiveTab('bosses')}
        >
          <Zap size={12} color={activeTab === 'bosses' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'bosses' && styles.activeTabText]}>
            Bosses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Users size={12} color={activeTab === 'friends' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Trophy size={12} color={activeTab === 'leaderboard' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'stats' ? renderStatsTab() : 
       activeTab === 'journeys' ? renderJourneysTab() : 
       activeTab === 'bosses' ? renderBossesTab() :
       activeTab === 'friends' ? renderFriendsTab() :
       activeTab === 'leaderboard' ? renderLeaderboardTab() :
       renderStatsTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#4b5563',
    marginRight: 12,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 8,
    color: '#6b7280',
    marginLeft: 3,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  journeyTabContainer: {
    flex: 1,
  },
  bossTabContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '48%',
  },
  statCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  blueIcon: {
    backgroundColor: '#eff6ff',
  },
  yellowIcon: {
    backgroundColor: '#fefce8',
  },
  greenIcon: {
    backgroundColor: '#f0fdf4',
  },
  purpleIcon: {
    backgroundColor: '#faf5ff',
  },
  redIcon: {
    backgroundColor: '#fef2f2',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  syncCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  syncForm: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  stepInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  syncButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  successMessage: {
    color: '#16a34a',
  },
  errorMessage: {
    color: '#dc2626',
  },
  xpCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  xpProgress: {
    marginTop: 12,
  },
  xpHeader: {
    marginBottom: 8,
  },
  xpText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  xpBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  badgesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  badge: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
    maxWidth: '48%',
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  friendsTabContainer: {
    flex: 1,
  },
  leaderboardTabContainer: {
    flex: 1,
  },
});