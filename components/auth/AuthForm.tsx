import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const signInWithEmail = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const signUpWithEmail = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else if (!session) {
      Alert.alert(
        'Check your email',
        'Please check your inbox for email verification!'
      );
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    if (isSignUp) {
      signUpWithEmail();
    } else {
      signInWithEmail();
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <StatusBar style="auto" />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12 bg-gray-50 dark:bg-gray-900">
          {/* Branding Header */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-orange-500 rounded-full items-center justify-center mb-6">
              <Text className="text-3xl">🚴‍♀️</Text>
            </View>
            <Text className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
              {isSignUp ? 'Join Cyclora' : 'Welcome Back'}
            </Text>
            <Text className="text-base text-center text-gray-600 dark:text-gray-400">
              {isSignUp 
                ? 'Start tracking your cycling journey' 
                : 'Continue your cycling adventure'
              }
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
            <View className="space-y-6">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Email Address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  className="w-full pb-3 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-lg"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="w-full pb-3 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-lg"
                />
                {isSignUp && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Minimum 6 characters
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className={`w-full py-4 rounded-xl ${
                  loading 
                    ? 'bg-gray-400 dark:bg-gray-600' 
                    : 'bg-orange-500 dark:bg-orange-600'
                } flex-row justify-center items-center shadow-lg mt-8`}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggle Sign Up/In */}
          <View className="flex-row justify-center items-center mt-8">
            <Text className="text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Already have an account?' : 'New to Cyclora?'}
            </Text>
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={loading}
              className="ml-2"
            >
              <Text className="text-orange-500 dark:text-orange-400 font-semibold">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 