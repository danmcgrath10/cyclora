import { useEffect } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore, useIsLoading, useRideHistory } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { rideTrackerService } from '../services/rideTracker';
import { RideRecord } from '../types/ride';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface RideHistoryItemProps {
  ride: RideRecord;
  onDelete: (id: string) => void;
}

function RideHistoryItem({ ride, onDelete }: RideHistoryItemProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLongPress = () => {
    Alert.alert(
      'Delete Ride',
      'Are you sure you want to delete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete(ride.id)
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
      activeOpacity={0.7}
    >
      {/* Date and Time */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {formatDate(ride.timestamp)}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {formatTime(ride.timestamp)}
        </Text>
      </View>

      {/* Stats Row */}
      <View className="flex-row justify-between mb-3">
        <View className="items-center">
          <ThemedText type="defaultSemiBold" className="text-green-600 dark:text-green-400">
            {rideTrackerService.formatDistance(ride.distance)}
          </ThemedText>
          <ThemedText type="default" className="text-xs text-gray-500 dark:text-gray-400">
            Distance
          </ThemedText>
        </View>

        <View className="items-center">
          <ThemedText type="defaultSemiBold" className="text-blue-600 dark:text-blue-400">
            {rideTrackerService.formatDuration(ride.duration)}
          </ThemedText>
          <ThemedText type="default" className="text-xs text-gray-500 dark:text-gray-400">
            Duration
          </ThemedText>
        </View>

        <View className="items-center">
          <ThemedText type="defaultSemiBold" className="text-orange-600 dark:text-orange-400">
            {rideTrackerService.formatSpeed(ride.averageSpeed)}
          </ThemedText>
          <ThemedText type="default" className="text-xs text-gray-500 dark:text-gray-400">
            Avg Speed
          </ThemedText>
        </View>
      </View>

      {/* AI Summary */}
      {ride.aiSummary && (
        <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mt-2">
          <ThemedText type="default" className="text-sm text-gray-700 dark:text-gray-300 italic">
            {ride.aiSummary}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function RideHistory() {
  const rideHistory = useRideHistory();
  const isLoading = useIsLoading();
  const { loadRideHistory, deleteRide } = useAppStore();
  const { user } = useAuth();

  useEffect(() => {
    loadRideHistory();
  }, [loadRideHistory]);

  const handleDeleteRide = (id: string) => {
    deleteRide(id);
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <View className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full items-center justify-center mb-6">
        <Text className="text-4xl">🚴‍♀️</Text>
      </View>
      <ThemedText type="title" className="text-center mb-4">
        No Rides Yet
      </ThemedText>
      <ThemedText type="default" className="text-center text-gray-500 dark:text-gray-400 leading-6">
        Start your first ride to see your cycling history here. Every journey begins with a single pedal stroke!
      </ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View className="mb-6">
      {/* User status */}
      {user?.email && (
        <View className="flex-row items-center justify-center mb-4">
          <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
          <ThemedText type="default" className="text-blue-600 dark:text-blue-400 text-sm">
            Your personal ride history • {user.email.split('@')[0]}
          </ThemedText>
        </View>
      )}
      
      {renderSummaryStats()}
    </View>
  );

  const renderSummaryStats = () => {
    if (rideHistory.length === 0) return null;

    const totalDistance = rideHistory.reduce((sum, ride) => sum + ride.distance, 0);
    const totalDuration = rideHistory.reduce((sum, ride) => sum + ride.duration, 0);
    const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : 0;

    return (
      <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <ThemedText type="subtitle" className="text-center mb-3 text-blue-800 dark:text-blue-200">
          Total Stats
        </ThemedText>
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {rideHistory.length}
            </Text>
            <ThemedText type="default" className="text-xs text-blue-700 dark:text-blue-300">
              Rides
            </ThemedText>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {rideTrackerService.formatDistance(totalDistance)}
            </Text>
            <ThemedText type="default" className="text-xs text-blue-700 dark:text-blue-300">
              Total
            </ThemedText>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {rideTrackerService.formatSpeed(avgSpeed)}
            </Text>
            <ThemedText type="default" className="text-xs text-blue-700 dark:text-blue-300">
              Avg Speed
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && rideHistory.length === 0) {
    return (
      <ThemedView className="flex-1 justify-center items-center">
        <ThemedText type="default">Loading ride history...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <FlatList
        data={rideHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RideHistoryItem ride={item} onDelete={handleDeleteRide} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{
          padding: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
} 