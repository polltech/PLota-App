import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { dbService } from './src/services/database';
import { syncService } from './src/services/api';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF8F3', padding: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#C62828', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#6f4e37', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    const initApp = async () => {
      try {
        await dbService.init();
        await syncService.startAutoSync();
      } catch (e) {
        console.error('App init failure:', e);
      }
    };
    initApp();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
