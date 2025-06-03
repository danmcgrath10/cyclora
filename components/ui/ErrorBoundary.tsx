import React, { Component, ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center p-6 bg-gray-50 dark:bg-gray-900">
          <View className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-sm border border-red-200 dark:border-red-800">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full items-center justify-center mb-4">
                <Text className="text-2xl">🚨</Text>
              </View>
              <Text className="text-red-600 dark:text-red-400 text-xl font-bold text-center">
                Something went wrong
              </Text>
            </View>
            
            <Text className="text-gray-600 dark:text-gray-400 text-sm text-center mb-6">
              An unexpected error occurred. Please try again.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View className="bg-red-50 dark:bg-red-900/40 p-4 rounded-xl mb-6">
                <Text className="text-red-700 dark:text-red-300 text-xs font-mono">
                  {this.state.error.message}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={this.handleReset}
              className="bg-orange-500 dark:bg-orange-600 px-6 py-4 rounded-xl shadow-sm"
            >
              <Text className="text-white font-semibold text-center">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo);
    // You could also send this to an error reporting service
  };
} 