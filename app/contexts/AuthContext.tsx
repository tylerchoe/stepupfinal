import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// API configuration - Change this to your local machine's IP if testing on physical device
const API_BASE_URL = 'http://localhost:5001/api';

interface User {
  username: string;
  display_name: string;
  total_steps_life: number;
  today_steps: number;
  streak: number;
  total_miles: number;
  level: number;
  current_exp: number;
  exp_to_next_level: number;
  badges: Badge[];
  current_journey?: Journey;
  user_level?: UserLevel;
}

interface Badge {
  name: string;
  description: string;
  icon: string;
}

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
  is_active?: boolean;
  is_template?: boolean;
  created_at?: string;
  user_id?: number;
  template_id?: number;
}

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

interface UserLevel {
  user_id: number;
  current_level: number;
  current_exp: number;
  total_exp: number;
  exp_to_next_level: number;
  attack_power: number;
  last_levelup?: string;
}

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
  user_level: UserLevel;
  boss_status: Boss;
  boss_rewards?: {
    exp_reward: number;
    coin_reward?: number;
    special_reward?: string;
  };
}

interface WeeklySteps {
  date: string;
  steps: number;
  dayName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  syncSteps: (stepsCount: number, source?: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  fetchUserProfile: () => Promise<User | null>;
  apiCall: (endpoint: string, options?: any) => Promise<any>;
  // Journey functions
  fetchJourneyTemplates: () => Promise<{ success: boolean; journeys?: JourneyTemplate[]; message?: string }>;
  startJourney: (templateId: number) => Promise<{ success: boolean; journey?: Journey; message?: string }>;
  endJourney: () => Promise<{ success: boolean; message?: string }>;
  // Boss system functions
  fetchBosses: () => Promise<{ success: boolean; bosses?: Boss[]; message?: string }>;
  attackBoss: (bossId: number, stepsToUse: number) => Promise<{ success: boolean; result?: BossAttackResult; message?: string }>;
  fetchUserLevel: () => Promise<{ success: boolean; userLevel?: UserLevel; message?: string }>;
  // Weekly steps function
  fetchWeeklySteps: () => Promise<{ success: boolean; weeklySteps?: WeeklySteps[]; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // API helper function
  const apiCall = async (endpoint: string, options: any = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const currentToken = token || await AsyncStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
      },
      ...options,
    };

    try {
      const response = await axios({
        url,
        ...config,
      });
      return response.data;
    } catch (error: any) {
      console.error('API Error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('API request failed');
    }
  };

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const data = await apiCall('/login', {
        method: 'POST',
        data: { username, password },
      });
      
      const newToken = data.token;
      setToken(newToken);
      await AsyncStorage.setItem('token', newToken);
      
      // Set axios default headers immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      await fetchUserProfile();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // Register function
  const register = async (username: string, password: string) => {
    try {
      await apiCall('/register', {
        method: 'POST',
        data: { username, password },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // Fetch user profile
  const fetchUserProfile = async (): Promise<User | null> => {
    try {
      const data = await apiCall('/user/profile');
      setUser(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Don't logout on profile fetch failure during login
      return null;
    }
  };

  // Logout function
  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Sync steps function
  const syncSteps = async (stepsCount: number, source: string = 'manual') => {
    try {
      const data = await apiCall('/steps/sync', {
        method: 'POST',
        data: { 
          steps_count: stepsCount, 
          source,
          mode: 'add' // Add steps to existing count
        },
      });
      
      // Refresh user profile after syncing steps
      await fetchUserProfile();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // Journey functions
  const fetchJourneyTemplates = async () => {
    try {
      const data = await apiCall('/journeys');
      return { success: true, journeys: data.journeys };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to fetch journey templates' };
    }
  };

  const startJourney = async (templateId: number) => {
    try {
      const data = await apiCall(`/journeys/${templateId}/start`, {
        method: 'POST'
      });
      
      // Refresh user profile to get updated journey info
      await fetchUserProfile();
      return { success: true, journey: data.journey, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to start journey' };
    }
  };

  const endJourney = async () => {
    try {
      const data = await apiCall('/journeys/end', {
        method: 'POST'
      });
      
      // Refresh user profile to clear current journey
      await fetchUserProfile();
      return { success: true, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to end journey' };
    }
  };

  // Boss system functions
  const fetchBosses = async () => {
    try {
      const data = await apiCall('/bosses');
      return { success: true, bosses: data.bosses };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to fetch bosses' };
    }
  };

  const attackBoss = async (bossId: number, stepsToUse: number) => {
    try {
      const data = await apiCall(`/bosses/${bossId}/attack`, {
        method: 'POST',
        data: { steps_to_use: stepsToUse }
      });
      
      // Refresh user profile after boss attack to update level and steps
      await fetchUserProfile();
      return { success: true, result: data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to attack boss' };
    }
  };

  const fetchUserLevel = async () => {
    try {
      const data = await apiCall('/user/level');
      return { success: true, userLevel: data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to fetch user level' };
    }
  };

  const fetchWeeklySteps = async () => {
    try {
      const data = await apiCall('/user/weekly-steps');
      return { success: true, weeklySteps: data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to fetch weekly steps' };
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          await fetchUserProfile();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Update axios instance when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    syncSteps,
    fetchUserProfile,
    apiCall,
    fetchJourneyTemplates,
    startJourney,
    endJourney,
    fetchBosses,
    attackBoss,
    fetchUserLevel,
    fetchWeeklySteps,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};