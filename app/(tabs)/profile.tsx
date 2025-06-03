import Account from '@/components/auth/Account';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileTabScreen() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Since the entire app is now locked behind auth, 
  // we know the user is authenticated if they reach this screen
  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
          <Text className="text-gray-600 dark:text-gray-400">Session error</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Account session={session} />
    </SafeAreaView>
  );
} 