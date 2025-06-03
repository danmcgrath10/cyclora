import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import {
  useAppStore,
  useHasMoreRides,
  useIsLoading,
  useIsLoadingMore,
  useLocalRides,
  useRemoteRides,
  useTotalRideCount
} from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { rideTrackerService } from '../services/rideTracker';
import { RideRecord } from '../types/ride';
import { MapPreview } from './MapPreview';
import { RideDetail } from './RideDetail';
import { ThemedView } from './ThemedView';

interface RideHistoryItemProps {
  ride: RideRecord;
  onPress: () => void;
  onDelete: (id: string) => void;
  isLocal?: boolean;
}

function RideHistoryItem({ ride, onPress, onDelete, isLocal = false }: RideHistoryItemProps) {
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
      onPress={onPress}
      onLongPress={handleLongPress}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm relative"
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {/* Map Preview */}
        <View className="mr-4">
          <MapPreview 
            routePoints={ride.routePoints || []}
            width={100}
            height={80}
          />
        </View>

        {/* Ride Info */}
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDate(ride.timestamp)}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {formatTime(ride.timestamp)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                {rideTrackerService.formatDistance(ride.distance)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Distance
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row justify-between">
            <View>
              <Text className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {rideTrackerService.formatDuration(ride.duration)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Duration
              </Text>
            </View>
            <View>
              <Text className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {rideTrackerService.formatSpeed(ride.averageSpeed)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Avg Speed
              </Text>
            </View>
            {ride.maxSpeed && (
              <View>
                <Text className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {rideTrackerService.formatSpeed(ride.maxSpeed)}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Max Speed
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* AI Summary Preview */}
      {ride.aiSummary && (
        <View className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Text className="text-sm text-gray-600 dark:text-gray-400 italic" numberOfLines={2}>
            {ride.aiSummary}
          </Text>
        </View>
      )}

      {/* Storage indicator */}
      <View className="absolute top-2 left-2">
        <View className={`px-2 py-1 rounded-full ${isLocal ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
          <Text className={`text-xs font-medium ${isLocal ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
            {isLocal ? '📱 Local' : '☁️ Cloud'}
          </Text>
        </View>
      </View>

      {/* Tap indicator */}
      <View className="absolute top-4 right-4">
        <View className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full items-center justify-center">
          <Text className="text-orange-600 dark:text-orange-400 text-xs">→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex-1 mx-2">
      <Text className="text-3xl font-bold text-orange-500 dark:text-orange-400 mb-1 text-center">
        {value}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">
        {label}
      </Text>
    </View>
  );
}

function LoadMoreButton() {
  const { loadMoreRides } = useAppStore();
  const hasMoreRides = useHasMoreRides();
  const isLoadingMore = useIsLoadingMore();

  if (!hasMoreRides) {
    return null;
  }

  return (
    <View className="mx-4 mb-4">
      <TouchableOpacity
        onPress={loadMoreRides}
        disabled={isLoadingMore}
        className="bg-orange-500 dark:bg-orange-600 rounded-2xl p-4 items-center"
      >
        {isLoadingMore ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="white" />
            <Text className="text-white font-semibold ml-2">Loading more rides...</Text>
          </View>
        ) : (
          <Text className="text-white font-semibold">Load More Rides</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SyncButton() {
  const { forceSync } = useAppStore();
  const isLoading = useIsLoading();

  return (
    <View className="mx-4 mb-4">
      <TouchableOpacity
        onPress={forceSync}
        disabled={isLoading}
        className="bg-blue-500 dark:bg-blue-600 rounded-2xl p-3 items-center"
      >
        {isLoading ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="white" />
            <Text className="text-white font-medium ml-2">Syncing...</Text>
          </View>
        ) : (
          <Text className="text-white font-medium">🔄 Force Sync to Cloud</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function RideHistory() {
  const localRides = useLocalRides();
  const remoteRides = useRemoteRides();
  const totalCount = useTotalRideCount();
  const isLoading = useIsLoading();
  const { deleteRide } = useAppStore();
  const { user } = useAuth();
  const [selectedRide, setSelectedRide] = useState<RideRecord | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Memoize the combined ride history to prevent unnecessary re-renders
  const rideHistory = useMemo(() => {
    return [...localRides, ...remoteRides];
  }, [localRides, remoteRides]);

  // Get the loadRideHistory function
  const loadRideHistory = useAppStore(state => state.loadRideHistory);

  // Memoize all callbacks at the top level
  const handleDeleteRide = useCallback((id: string) => {
    deleteRide(id);
  }, [deleteRide]);

  const handleRidePress = useCallback((ride: RideRecord) => {
    setSelectedRide(ride);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedRide(null);
  }, []);

  const renderRideItem = useCallback(({ item, index }: { item: RideRecord; index: number }) => {
    const isLocal = index < localRides.length;
    return (
      <RideHistoryItem 
        ride={item} 
        onPress={() => handleRidePress(item)}
        onDelete={handleDeleteRide}
        isLocal={isLocal}
      />
    );
  }, [localRides.length, handleRidePress, handleDeleteRide]);

  // Initialize ride history only once
  useEffect(() => {
    if (!hasInitialized) {
      loadRideHistory();
      setHasInitialized(true);
    }
  }, [hasInitialized, loadRideHistory]);

  // Show detailed view if a ride is selected
  if (selectedRide) {
    return (
      <RideDetail 
        ride={selectedRide} 
        onClose={handleCloseDetail}
      />
    );
  }

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <View className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center mb-8">
        <Text className="text-5xl">🚴‍♀️</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
        No Rides Yet
      </Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 text-center leading-6">
        Start your first ride to see your cycling history here. Every journey begins with a single pedal stroke!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View className="mb-6">
      {/* Header Section */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Ride History
        </Text>
        {user?.email && (
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {user.email.split('@')[0]}&apos;s cycling journey
          </Text>
        )}
        <View className="flex-row justify-center mt-3 space-x-4">
          <View className="flex-row items-center">
            <Text className="text-xs text-green-600 dark:text-green-400 font-medium">
              📱 {localRides.length} Local
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              ☁️ {remoteRides.length} Cloud
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              📊 {totalCount} Total
            </Text>
          </View>
        </View>
      </View>
      
      {renderSummaryStats()}
      
      {/* Sync Button */}
      <SyncButton />
    </View>
  );

  const renderSummaryStats = () => {
    if (rideHistory.length === 0) return null;

    const totalDistance = rideHistory.reduce((sum: number, ride: RideRecord) => sum + ride.distance, 0);
    const totalDuration = rideHistory.reduce((sum: number, ride: RideRecord) => sum + ride.duration, 0);
    const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : 0;

    return (
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-2">
          Total Stats (Loaded)
        </Text>
        
        <View className="flex-row mb-4">
          <StatCard 
            value={rideHistory.length.toString()}
            label="Loaded Rides"
          />
          <StatCard 
            value={rideTrackerService.formatDistance(totalDistance)}
            label="Distance"
          />
        </View>
        
        <View className="flex-row">
          <StatCard 
            value={rideTrackerService.formatDuration(totalDuration)}
            label="Total Time"
          />
          <StatCard 
            value={rideTrackerService.formatSpeed(avgSpeed)}
            label="Avg Speed"
          />
        </View>
      </View>
    );
  };

  const renderFooter = () => <LoadMoreButton />;

  if (isLoading && rideHistory.length === 0) {
    return (
      <ThemedView className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading ride history...</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={rideHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{
          padding: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
} 