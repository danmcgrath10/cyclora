import React, { Component, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

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
        <View className="flex-1 justify-center items-center p-6 bg-white dark:bg-gray-900">
          <View className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 max-w-sm">
            <Text className="text-red-600 dark:text-red-400 text-xl font-semibold text-center mb-2">
              🚨 Something went wrong
            </Text>
            
            <Text className="text-red-500 dark:text-red-300 text-sm text-center mb-4">
              An unexpected error occurred. Please try again.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View className="bg-red-100 dark:bg-red-900/40 p-3 rounded-lg mb-4">
                <Text className="text-red-700 dark:text-red-300 text-xs font-mono">
                  {this.state.error.message}
                </Text>
              </View>
            )}
            
            <Pressable
              onPress={this.handleReset}
              className="bg-red-600 dark:bg-red-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium text-center">
                Try Again
              </Text>
            </Pressable>
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