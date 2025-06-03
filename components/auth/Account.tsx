import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Avatar from './Avatar';

interface AccountProps {
  session: Session;
}

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'url';
}

function ProfileField({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  editable = true,
  keyboardType = 'default'
}: ProfileFieldProps) {
  return (
    <View className="mb-6">
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
        {label}
      </Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          className="text-gray-900 dark:text-white text-lg font-medium pb-2 border-b border-gray-200 dark:border-gray-700"
        />
      ) : (
        <Text className="text-gray-400 dark:text-gray-500 text-lg pb-2 border-b border-gray-200 dark:border-gray-700">
          {value}
        </Text>
      )}
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex-1 mx-1">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </Text>
    </View>
  );
}

export default function Account({ session }: AccountProps) {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (session) {
      getProfile();
    }
  }, [session]);

  const getProfile = async () => {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', session?.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async ({
    username,
    avatar_url,
  }: {
    username: string;
    avatar_url: string;
  }) => {
    try {
      setUpdating(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session?.user.id,
        username,
        avatar_url,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = () => {
    updateProfile({ username, avatar_url: avatarUrl });
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => supabase.auth.signOut(),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="mt-4 text-gray-500 dark:text-gray-400 text-base">
          Loading...
        </Text>
      </View>
    );
  }

  const memberSince = new Date(session.user.created_at).getFullYear();

  return (
    <ScrollView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header Section */}
      <View className="bg-white dark:bg-gray-800 pt-4 pb-8">
        <View className="items-center px-6">
          {/* Profile Picture */}
          <View className="mb-4">
            <Avatar
              size={120}
              url={avatarUrl}
              onUpload={(url: string) => {
                setAvatarUrl(url);
                updateProfile({ username, avatar_url: url });
              }}
            />
          </View>

          {/* Name and Email */}
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {username || 'Cyclist'}
          </Text>
          <Text className="text-base text-gray-500 dark:text-gray-400 mb-6">
            {session?.user?.email}
          </Text>

          {/* Stats Row */}
          <View className="flex-row w-full max-w-sm">
            <StatCard value={memberSince.toString()} label="Member Since" />
            <StatCard value="0" label="Total Rides" />
            <StatCard value="0 mi" label="Distance" />
          </View>
        </View>
      </View>

      {/* Profile Form */}
      <View className="px-6 pt-8">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Profile Details
        </Text>

        <ProfileField 
          label="Email"
          value={session?.user?.email || ''}
          editable={false}
        />

        <ProfileField 
          label="Display Name"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your name"
        />

        {/* Action Buttons */}
        <View className="mt-8 space-y-4">
          <TouchableOpacity
            onPress={handleUpdateProfile}
            disabled={updating}
            className="bg-orange-500 dark:bg-orange-600 py-4 rounded-lg flex-row justify-center items-center shadow-sm"
          >
            {updating ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            className="border border-red-500 dark:border-red-400 py-4 rounded-lg flex-row justify-center items-center"
          >
            <Text className="text-red-500 dark:text-red-400 font-semibold text-base">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional sections ready for expansion */}
        <View className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Privacy & Settings
          </Text>
          <TouchableOpacity className="py-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700 dark:text-gray-300">Privacy Controls</Text>
              <Text className="text-gray-400 dark:text-gray-500">→</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="py-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700 dark:text-gray-300">Units & Display</Text>
              <Text className="text-gray-400 dark:text-gray-500">→</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="py-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700 dark:text-gray-300">Help & Support</Text>
              <Text className="text-gray-400 dark:text-gray-500">→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
} 