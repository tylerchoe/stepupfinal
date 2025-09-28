import { Clock, Search, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  total_steps: number;
  friendship_status: 'none' | 'friends' | 'request_sent' | 'request_received';
}

interface Friend {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  total_steps: number;
  last_active?: string;
  friendship_date?: string;
}

interface FriendRequest {
  id: number;
  sender: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    total_steps: number;
  };
  sent_at: string;
}

type TabType = 'friends' | 'requests' | 'search';

const Friends: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setFriendRequests(data.friend_requests || []);
      } else {
        Alert.alert('Error', 'Failed to load friends');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await fetch(`http://localhost:5001/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        Alert.alert('Error', 'Failed to search users');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during search');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (username: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/friends/send-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', data.message);
        // Update search results to reflect new status
        setSearchResults(prev => prev.map(user => 
          user.username === username 
            ? { ...user, friendship_status: 'request_sent' }
            : user
        ));
      } else {
        Alert.alert('Error', data.error || 'Failed to send friend request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while sending friend request');
    }
  };

  const respondToRequest = async (requestId: number, action: 'accept' | 'decline') => {
    try {
      const response = await fetch('http://localhost:5001/api/friends/respond', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId, action }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', data.message);
        loadFriends(); // Reload to update lists
      } else {
        Alert.alert('Error', data.error || 'Failed to respond to request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while responding to request');
    }
  };

  const removeFriend = async (userId: number, displayName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch('http://localhost:5001/api/friends/remove', {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId }),
              });

              const data = await response.json();
              if (response.ok) {
                Alert.alert('Success', data.message);
                loadFriends();
              } else {
                Alert.alert('Error', data.error || 'Failed to remove friend');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error while removing friend');
            }
          }
        }
      ]
    );
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendInfo}>
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.display_name[0].toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.display_name}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
          <Text style={styles.friendSteps}>{item.total_steps.toLocaleString()} total steps</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeFriend(item.id, item.display_name)}
      >
        <Trash2 size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.friendInfo}>
        <View style={styles.avatar}>
          {item.sender.avatar_url ? (
            <Image source={{ uri: item.sender.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.sender.display_name[0].toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.sender.display_name}</Text>
          <Text style={styles.friendUsername}>@{item.sender.username}</Text>
          <Text style={styles.friendSteps}>{item.sender.total_steps.toLocaleString()} total steps</Text>
        </View>
      </View>
      <View style={styles.requestButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => respondToRequest(item.id, 'accept')}
        >
          <UserCheck size={18} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => respondToRequest(item.id, 'decline')}
        >
          <UserX size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: User }) => (
    <View style={styles.searchCard}>
      <View style={styles.friendInfo}>
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.display_name[0].toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.display_name}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
          <Text style={styles.friendSteps}>{item.total_steps.toLocaleString()} total steps</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[
          styles.actionButton,
          item.friendship_status === 'friends' && styles.friendsButton,
          item.friendship_status === 'request_sent' && styles.sentButton,
          item.friendship_status === 'request_received' && styles.receivedButton,
          item.friendship_status === 'none' && styles.addButton
        ]}
        onPress={() => {
          if (item.friendship_status === 'none') {
            sendFriendRequest(item.username);
          }
        }}
        disabled={item.friendship_status !== 'none'}
      >
        {item.friendship_status === 'friends' && <UserCheck size={18} color="#ffffff" />}
        {item.friendship_status === 'request_sent' && <Clock size={18} color="#ffffff" />}
        {item.friendship_status === 'request_received' && <Clock size={18} color="#ffffff" />}
        {item.friendship_status === 'none' && <UserPlus size={18} color="#ffffff" />}
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'friends':
        return (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadFriends();
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Users size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No Friends Yet</Text>
                <Text style={styles.emptyText}>Search for users to add as friends!</Text>
              </View>
            }
          />
        );
      
      case 'requests':
        return (
          <FlatList
            data={friendRequests}
            renderItem={renderFriendRequest}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadFriends();
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Clock size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No Friend Requests</Text>
                <Text style={styles.emptyText}>You'll see incoming friend requests here.</Text>
              </View>
            }
          />
        );
      
      case 'search':
        return (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
            {searchLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id.toString()}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  searchQuery.length >= 2 ? (
                    <View style={styles.emptyState}>
                      <Search size={48} color="#9ca3af" />
                      <Text style={styles.emptyTitle}>No Users Found</Text>
                      <Text style={styles.emptyText}>Try searching with a different username.</Text>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Search size={48} color="#9ca3af" />
                      <Text style={styles.emptyTitle}>Search for Friends</Text>
                      <Text style={styles.emptyText}>Type at least 2 characters to search for users.</Text>
                    </View>
                  )
                }
              />
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Users size={20} color={activeTab === 'friends' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Clock size={20} color={activeTab === 'requests' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({friendRequests.length})
          </Text>
          {friendRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{friendRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Search size={20} color={activeTab === 'search' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
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
    paddingVertical: 16,
    paddingHorizontal: 8,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  friendCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  friendSteps: {
    fontSize: 12,
    color: '#9ca3af',
  },
  removeButton: {
    padding: 8,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  addButton: {
    backgroundColor: '#3b82f6',
  },
  friendsButton: {
    backgroundColor: '#10b981',
  },
  sentButton: {
    backgroundColor: '#f59e0b',
  },
  receivedButton: {
    backgroundColor: '#8b5cf6',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
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

export default Friends;