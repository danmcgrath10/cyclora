import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return; // Don't redirect while loading

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // Redirect authenticated users to main app
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to auth
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, loading, segments, router]);

  // Show loading screen while determining auth state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
} 