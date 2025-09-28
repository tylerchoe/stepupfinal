import { Award, Calendar, Clock, Globe, Medal, Target, Trophy, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  steps: number;
  miles: number;
  level: number;
  is_current_user: boolean;
  is_friend: boolean;
}

interface LeaderboardData {
  timeframe: string;
  friends_only: boolean;
  total_entries: number;
  leaderboard: LeaderboardEntry[];
}

type TimeframeType = 'day' | 'week' | 'month' | 'all';
type ViewType = 'global' | 'friends';

const Leaderboard: React.FC = () => {
  const { token } = useAuth();
  const [timeframe, setTimeframe] = useState<TimeframeType>('week');
  const [viewType, setViewType] = useState<ViewType>('global');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe, viewType]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const friendsOnly = viewType === 'friends';
      const response = await fetch(
        `http://localhost:5001/api/leaderboard?timeframe=${timeframe}&friends_only=${friendsOnly}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data);
      } else {
        console.error('Failed to load leaderboard');
      }
    } catch (error) {
      console.error('Network error while loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} color="#ffd700" />;
      case 2:
        return <Medal size={24} color="#c0c0c0" />;
      case 3:
        return <Award size={24} color="#cd7f32" />;
      default:
        return (
          <View style={styles.rankNumber}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        );
    }
  };

  const getTimeframeLabel = (timeframe: TimeframeType) => {
    switch (timeframe) {
      case 'day':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'all':
        return 'All Time';
    }
  };

  const getTimeframeIcon = (timeframe: TimeframeType) => {
    switch (timeframe) {
      case 'day':
        return <Clock size={16} color="#6b7280" />;
      case 'week':
        return <Calendar size={16} color="#6b7280" />;
      case 'month':
        return <Target size={16} color="#6b7280" />;
      case 'all':
        return <Globe size={16} color="#6b7280" />;
    }
  };

  const renderLeaderboardEntry = ({ item }: { item: LeaderboardEntry }) => (
    <View style={[
      styles.entryCard,
      item.is_current_user && styles.currentUserCard,
      item.rank <= 3 && styles.topThreeCard
    ]}>
      <View style={styles.rankContainer}>
        {getRankIcon(item.rank)}
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.display_name[0].toUpperCase()}</Text>
          )}
        </View>
        
        <View style={styles.userDetails}>
          <View style={styles.userNameRow}>
            <Text style={[
              styles.displayName,
              item.is_current_user && styles.currentUserText
            ]}>
              {item.display_name}
              {item.is_current_user && ' (You)'}
            </Text>
            {item.is_friend && (
              <View style={styles.friendBadge}>
                <Text style={styles.friendBadgeText}>Friend</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.level}>Level {item.level}</Text>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.stepsCount}>{item.steps.toLocaleString()}</Text>
        <Text style={styles.stepsLabel}>steps</Text>
        <Text style={styles.milesText}>{item.miles} mi</Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading && !leaderboardData) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (!leaderboardData || leaderboardData.leaderboard.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Trophy size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Leaderboard Data</Text>
          <Text style={styles.emptyText}>
            {viewType === 'friends' 
              ? 'Add some friends to see their progress here!'
              : 'Be the first to log some steps!'}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={leaderboardData.leaderboard}
        renderItem={renderLeaderboardEntry}
        keyExtractor={(item) => item.user_id.toString()}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadLeaderboard();
            }}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.totalEntries}>
            <Text style={styles.totalEntriesText}>
              {leaderboardData?.total_entries || 0} {viewType === 'friends' ? 'friends' : 'users'}
            </Text>
          </View>
        </View>
      </View>

      {/* View Type Selector */}
      <View style={styles.viewTypeContainer}>
        <TouchableOpacity 
          style={[styles.viewTypeButton, viewType === 'global' && styles.activeViewType]}
          onPress={() => setViewType('global')}
        >
          <Globe size={20} color={viewType === 'global' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.viewTypeText, viewType === 'global' && styles.activeViewTypeText]}>
            Global
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.viewTypeButton, viewType === 'friends' && styles.activeViewType]}
          onPress={() => setViewType('friends')}
        >
          <Users size={20} color={viewType === 'friends' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.viewTypeText, viewType === 'friends' && styles.activeViewTypeText]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        {(['day', 'week', 'month', 'all'] as TimeframeType[]).map((tf) => (
          <TouchableOpacity 
            key={tf}
            style={[styles.timeframeButton, timeframe === tf && styles.activeTimeframe]}
            onPress={() => setTimeframe(tf)}
          >
            {getTimeframeIcon(tf)}
            <Text style={[styles.timeframeText, timeframe === tf && styles.activeTimeframeText]}>
              {getTimeframeLabel(tf)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalEntries: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  totalEntriesText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  viewTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeViewType: {
    backgroundColor: '#eff6ff',
  },
  viewTypeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeViewTypeText: {
    color: '#3b82f6',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeframeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTimeframe: {
    backgroundColor: '#eff6ff',
  },
  timeframeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTimeframeText: {
    color: '#3b82f6',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  topThreeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  currentUserText: {
    color: '#3b82f6',
  },
  friendBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  friendBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  level: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  stepsCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  stepsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  milesText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default Leaderboard;