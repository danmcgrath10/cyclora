import { ActivityIndicator, Text, View } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'large', 
  color = '#3B82F6', 
  message = 'Loading...', 
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <View className={`flex-1 justify-center items-center p-6 ${className}`}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-gray-600 dark:text-gray-400 text-base mt-3 text-center">
          {message}
        </Text>
      )}
    </View>
  );
}

export function InlineLoadingSpinner({ 
  size = 'small', 
  color = '#3B82F6', 
  className = '' 
}: Omit<LoadingSpinnerProps, 'message'>) {
  return (
    <View className={`justify-center items-center p-2 ${className}`}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
} 