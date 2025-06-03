import { useEffect } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore, useNotifications } from '../../hooks/useAppStore';

export function NotificationToast() {
  const notifications = useNotifications();
  const { removeNotification } = useAppStore();
  const fadeAnim = new Animated.Value(0);

  const latestNotification = notifications[0];

  useEffect(() => {
    if (latestNotification) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          removeNotification(latestNotification.id);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [latestNotification, fadeAnim, removeNotification]);

  if (!latestNotification) {
    return null;
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <TouchableOpacity
        onPress={() => removeNotification(latestNotification.id)}
        className={`${getBackgroundColor(latestNotification.type)} p-4 rounded-xl shadow-lg flex-row items-center`}
        activeOpacity={0.9}
      >
        <Text className="text-2xl mr-3">
          {getIcon(latestNotification.type)}
        </Text>
        <View className="flex-1">
          <Text className="text-white font-bold text-base mb-1">
            {latestNotification.title}
          </Text>
          <Text className="text-white text-sm opacity-90">
            {latestNotification.message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => removeNotification(latestNotification.id)}
          className="ml-2 p-1"
        >
          <Text className="text-white text-lg">×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
} 