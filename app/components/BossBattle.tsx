import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface Boss {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  max_health: number;
  current_health: number;
  health_percentage: number;
  exp_reward: number;
  coin_reward?: number;
  special_reward?: string;
  difficulty: string;
  boss_type: string;
  journey_id?: number;
  is_active: boolean;
  is_defeated: boolean;
  spawned_at?: string;
  defeated_at?: string;
}

interface BossAttackResult {
  success: boolean;
  damage_dealt: number;
  exp_gained: number;
  boss_defeated: boolean;
  level_ups: number;
  user_level: {
    user_id: number;
    current_level: number;
    current_exp: number;
    total_exp: number;
    exp_to_next_level: number;
    attack_power: number;
    last_levelup?: string;
  };
  boss_status: Boss;
  boss_rewards?: {
    exp_reward: number;
    coin_reward?: number;
    special_reward?: string;
  };
}

const BossBattle: React.FC = () => {
  const { user, fetchBosses, attackBoss, fetchUserProfile } = useAuth();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [stepsInput, setStepsInput] = useState('');
  const [attacking, setAttacking] = useState(false);
  const [lastAttackResult, setLastAttackResult] = useState<BossAttackResult | null>(null);

  const loadBosses = async () => {
    setLoading(true);
    try {
      const result = await fetchBosses();
      if (result.success && result.bosses) {
        setBosses(result.bosses);
      } else {
        Alert.alert('Error', result.message || 'Failed to load bosses');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load bosses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBosses();
    await fetchUserProfile();
    setRefreshing(false);
  };

  const handleAttackBoss = async () => {
    if (!selectedBoss) return;
    
    const stepsToUse = parseInt(stepsInput);
    if (isNaN(stepsToUse) || stepsToUse <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of steps');
      return;
    }

    if (user && stepsToUse > user.today_steps) {
      Alert.alert('Insufficient Steps', `You only have ${user.today_steps} available steps today.\nYou need ${stepsToUse - user.today_steps} more steps to perform this attack.`);
      return;
    }

    setAttacking(true);
    try {
      const result = await attackBoss(selectedBoss.id, stepsToUse);
      if (result.success && result.result) {
        setLastAttackResult(result.result);
        setStepsInput('');
        
        // Show attack result
        let message = `Steps used: ${stepsToUse}\nDamage dealt: ${result.result.damage_dealt}\nEXP gained: ${result.result.exp_gained}`;
        
        // Show remaining steps after refresh
        const updatedUser = await fetchUserProfile();
        if (updatedUser) {
          message += `\nRemaining steps: ${updatedUser.today_steps}`;
        }
        
        if (result.result.level_ups > 0) {
          message += `\n🎉 Level up! You are now level ${result.result.user_level.current_level}`;
        }
        
        if (result.result.boss_defeated) {
          message += '\n💀 Boss defeated!';
          if (result.result.boss_rewards) {
            message += `\n🎁 Rewards: ${result.result.boss_rewards.exp_reward} EXP`;
            if (result.result.boss_rewards.coin_reward) {
              message += `, ${result.result.boss_rewards.coin_reward} coins`;
            }
            if (result.result.boss_rewards.special_reward) {
              message += `, ${result.result.boss_rewards.special_reward}`;
            }
          }
        }
        
        Alert.alert('Attack Result', message);
        
        // Reload bosses to get updated state
        await loadBosses();
      } else {
        Alert.alert('Attack Failed', result.message || 'Failed to attack boss');
      }
    } catch (error) {
      Alert.alert('Error', 'Attack failed');
    } finally {
      setAttacking(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      case 'legendary': return '#9C27B0';
      case 'daily': return '#2196F3';
      default: return '#666';
    }
  };

  const getBossTypeColor = (bossType: string) => {
    switch (bossType.toLowerCase()) {
      case 'global': return '#E91E63';
      case 'daily': return '#2196F3';
      case 'personal': return '#4CAF50';
      case 'journey': return '#FF5722';
      default: return '#666';
    }
  };

  useEffect(() => {
    loadBosses();
  }, []);

  if (loading && bosses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bosses...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Boss Battles</Text>
        {user && (
          <View style={styles.userStats}>
            <Text style={styles.statsText}>Level: {user.level || 1}</Text>
            <Text style={styles.statsText}>Available Steps: {user.today_steps || 0}</Text>
            <Text style={styles.statsText}>Total Steps: {user.total_steps_life?.toLocaleString() || 0}</Text>
          </View>
        )}
      </View>

      {bosses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active bosses available</Text>
          <Text style={styles.emptySubtext}>Come back later for new challenges!</Text>
        </View>
      ) : (
        <View>
          {bosses.map((boss) => (
            <View key={boss.id} style={styles.bossCard}>
              <View style={styles.bossHeader}>
                <Text style={styles.bossName}>{boss.name}</Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: getDifficultyColor(boss.difficulty) }]}>
                    <Text style={styles.badgeText}>{boss.difficulty}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getBossTypeColor(boss.boss_type) }]}>
                    <Text style={styles.badgeText}>{boss.boss_type}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.bossDescription}>{boss.description}</Text>
              
              {/* Health Bar */}
              <View style={styles.healthContainer}>
                <View style={styles.healthBarBackground}>
                  <View 
                    style={[
                      styles.healthBar, 
                      { width: `${boss.health_percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.healthText}>
                  {boss.current_health.toLocaleString()} / {boss.max_health.toLocaleString()} HP
                </Text>
              </View>

              {/* Rewards */}
              <View style={styles.rewardsContainer}>
                <Text style={styles.rewardsTitle}>Rewards:</Text>
                <Text style={styles.rewardsText}>🌟 {boss.exp_reward} EXP</Text>
                {boss.coin_reward && (
                  <Text style={styles.rewardsText}>🪙 {boss.coin_reward} coins</Text>
                )}
                {boss.special_reward && (
                  <Text style={styles.rewardsText}>🎁 {boss.special_reward}</Text>
                )}
              </View>

              {/* Attack Section */}
              {boss.is_active && !boss.is_defeated && (
                <View style={styles.attackSection}>
                  <Text style={styles.attackTitle}>Attack with Steps:</Text>
                  {user && (
                    <Text style={styles.availableStepsText}>Available: {user.today_steps} steps</Text>
                  )}
                  <View style={styles.attackControls}>
                    <TextInput
                      style={styles.stepsInput}
                      value={selectedBoss?.id === boss.id ? stepsInput : ''}
                      onChangeText={(text) => {
                        setSelectedBoss(boss);
                        setStepsInput(text);
                      }}
                      placeholder="Enter steps"
                      keyboardType="numeric"
                      editable={!attacking}
                    />
                    <TouchableOpacity
                      style={[
                        styles.attackButton,
                        attacking && selectedBoss?.id === boss.id && styles.attackButtonDisabled
                      ]}
                      onPress={() => {
                        setSelectedBoss(boss);
                        handleAttackBoss();
                      }}
                      disabled={attacking && selectedBoss?.id === boss.id}
                    >
                      {attacking && selectedBoss?.id === boss.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.attackButtonText}>Attack!</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Defeated State */}
              {boss.is_defeated && (
                <View style={styles.defeatedContainer}>
                  <Text style={styles.defeatedText}>💀 Boss Defeated!</Text>
                  {boss.defeated_at && (
                    <Text style={styles.defeatedTime}>
                      Defeated: {new Date(boss.defeated_at).toLocaleString()}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  userStats: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  bossCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bossName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  badges: {
    flexDirection: 'row',
    gap: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bossDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  healthContainer: {
    marginBottom: 15,
  },
  healthBarBackground: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  healthText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  rewardsContainer: {
    marginBottom: 15,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  rewardsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  attackSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  attackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  availableStepsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  attackControls: {
    flexDirection: 'row',
    gap: 10,
  },
  stepsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  attackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  attackButtonDisabled: {
    backgroundColor: '#ccc',
  },
  attackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  defeatedContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  defeatedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  defeatedTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});

export default BossBattle;