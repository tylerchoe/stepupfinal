import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthScreen } from '../components/AuthScreen';
import { Dashboard } from '../components/Dashboard';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return user ? <Dashboard /> : <AuthScreen />;
};

export default function Index() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
