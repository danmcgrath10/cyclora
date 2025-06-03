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

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: string;
}

interface SettingItemProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'url';
  multiline?: boolean;
}

function SettingSection({ title, children, icon }: SettingSectionProps) {
  return (
    <View className="mb-8">
      <View className="flex-row items-center mb-4">
        {icon && <Text className="text-xl mr-2">{icon}</Text>}
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </Text>
      </View>
      <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function SettingItem({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  editable = true,
  keyboardType = 'default',
  multiline = false 
}: SettingItemProps) {
  return (
    <View className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          className={`text-gray-900 dark:text-white text-base ${
            multiline ? 'min-h-[60px]' : ''
          }`}
        />
      ) : (
        <Text className="text-gray-500 dark:text-gray-400 text-base">
          {value}
        </Text>
      )}
    </View>
  );
}

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
}

function ActionButton({ 
  title, 
  onPress, 
  loading = false, 
  variant = 'primary',
  icon 
}: ActionButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 dark:bg-blue-500';
      case 'secondary':
        return 'bg-gray-600 dark:bg-gray-500';
      case 'danger':
        return 'bg-red-600 dark:bg-red-500';
      default:
        return 'bg-blue-600 dark:bg-blue-500';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className={`
        w-full py-4 px-6 rounded-xl flex-row justify-center items-center mb-3
        ${getButtonStyle()}
        ${loading ? 'opacity-50' : ''}
      `}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <View className="flex-row items-center">
          {icon && <Text className="text-white text-lg mr-2">{icon}</Text>}
          <Text className="text-white font-semibold text-base">
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
        .select(`username, website, avatar_url`)
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
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400 text-center">
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Account
          </Text>
          <Text className="text-base text-center text-gray-600 dark:text-gray-400">
            Manage your profile and preferences
          </Text>
        </View>

        {/* Profile Picture Section */}
        <SettingSection title="Profile Picture" icon="📸">
          <View className="items-center py-6">
            <Avatar
              size={100}
              url={avatarUrl}
              onUpload={(url: string) => {
                setAvatarUrl(url);
                updateProfile({ username, avatar_url: url });
              }}
            />
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
              Tap to change your profile picture
            </Text>
          </View>
        </SettingSection>

        {/* Personal Information */}
        <SettingSection title="Personal Information" icon="👤">
          <SettingItem 
            label="Email Address"
            value={session?.user?.email || ''}
            editable={false}
          />
          <SettingItem 
            label="Display Name"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your display name"
          />
        </SettingSection>

        {/* Account Statistics (Future expansion ready) */}
        <SettingSection title="Account Info" icon="📊">
          <View className="px-4 py-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700 dark:text-gray-300">Member since</Text>
              <Text className="text-gray-500 dark:text-gray-400">
                {new Date(session.user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </SettingSection>

        {/* Actions */}
        <View className="mt-6">
          <ActionButton
            title="Save Changes"
            onPress={handleUpdateProfile}
            loading={updating}
            variant="primary"
            icon="💾"
          />
          
          <ActionButton
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            icon="🚪"
          />
        </View>

        {/* Future sections ready for expansion */}
        {/* 
        <SettingSection title="Preferences" icon="⚙️">
          <SettingItem label="Units" value="Imperial" editable={false} />
          <SettingItem label="Theme" value="Auto" editable={false} />
        </SettingSection>

        <SettingSection title="Privacy & Security" icon="🔒">
          <SettingItem label="Data Sharing" value="Enabled" editable={false} />
          <SettingItem label="Location Services" value="Enabled" editable={false} />
        </SettingSection>
        */}

        {/* Footer space */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
} 