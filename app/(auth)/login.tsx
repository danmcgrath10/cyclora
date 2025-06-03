import AuthForm from '@/components/auth/AuthForm';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AuthForm />
    </SafeAreaView>
  );
} 