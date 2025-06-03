import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore, useCurrentRide } from '../hooks/useAppStore';
import { rideTrackerService } from '../services/rideTracker';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function RideTracker() {
  const currentRide = useCurrentRide();
  const { startRideTracking, stopRideTracking, isLoading } = useAppStore();
  const [displayTime, setDisplayTime] = useState('00:00');

  // Update display time every second when tracking
  useEffect(() => {
    if (!currentRide.isTracking) return;

    const interval = setInterval(() => {
      setDisplayTime(rideTrackerService.formatDuration(currentRide.currentDuration));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRide.isTracking, currentRide.currentDuration]);

  // Update display time when ride state changes
  useEffect(() => {
    setDisplayTime(rideTrackerService.formatDuration(currentRide.currentDuration));
  }, [currentRide.currentDuration]);

  const handleStartRide = async () => {
    const success = await startRideTracking();
    if (!success) {
      Alert.alert(
        'Permission Required',
        'GPS location access is required to track your ride. Please enable location permissions in your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStopRide = () => {
    Alert.alert(
      'End Ride',
      'Are you sure you want to end your ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Ride', 
          style: 'destructive',
          onPress: stopRideTracking 
        },
      ]
    );
  };

  return (
    <ThemedView className="flex-1 p-6">
      {/* Header */}
      <View className="items-center mb-8">
        <ThemedText type="title" className="text-center mb-2">
          {currentRide.isTracking ? 'Ride in Progress' : 'Ready to Ride'}
        </ThemedText>
        <View className={`w-4 h-4 rounded-full ${currentRide.isTracking ? 'bg-red-500' : 'bg-gray-400'}`} />
      </View>

      {/* Stats Display */}
      <View className="flex-1 justify-center">
        {/* Time */}
        <View className="items-center mb-8">
          <ThemedText type="subtitle" className="text-gray-500 mb-2">
            TIME
          </ThemedText>
          <Text className="text-6xl font-bold text-blue-600 font-mono">
            {displayTime}
          </Text>
        </View>

        {/* Distance and Speed Row */}
        <View className="flex-row justify-between mb-8">
          {/* Distance */}
          <View className="flex-1 items-center">
            <ThemedText type="subtitle" className="text-gray-500 mb-2">
              DISTANCE
            </ThemedText>
            <Text className="text-3xl font-bold text-green-600">
              {rideTrackerService.formatDistance(currentRide.currentDistance)}
            </Text>
          </View>

          {/* Current Speed */}
          <View className="flex-1 items-center">
            <ThemedText type="subtitle" className="text-gray-500 mb-2">
              SPEED
            </ThemedText>
            <Text className="text-3xl font-bold text-orange-600">
              {rideTrackerService.formatSpeed(currentRide.currentSpeed)}
            </Text>
          </View>
        </View>

        {/* Average Speed */}
        <View className="items-center mb-8">
          <ThemedText type="subtitle" className="text-gray-500 mb-2">
            AVERAGE SPEED
          </ThemedText>
          <Text className="text-2xl font-bold text-purple-600">
            {rideTrackerService.formatSpeed(currentRide.averageSpeed)}
          </Text>
        </View>
      </View>

      {/* Control Button */}
      <View className="pb-8">
        <TouchableOpacity
          onPress={currentRide.isTracking ? handleStopRide : handleStartRide}
          disabled={isLoading}
          className={`
            py-6 px-8 rounded-2xl items-center justify-center
            ${currentRide.isTracking 
              ? 'bg-red-500 active:bg-red-600' 
              : 'bg-green-500 active:bg-green-600'
            }
            ${isLoading ? 'opacity-50' : ''}
          `}
          activeOpacity={0.8}
        >
          <Text className="text-white text-2xl font-bold">
            {isLoading 
              ? 'Processing...' 
              : currentRide.isTracking 
                ? 'STOP RIDE' 
                : 'START RIDE'
            }
          </Text>
        </TouchableOpacity>
      </View>

      {/* GPS Status */}
      {currentRide.isTracking && (
        <View className="items-center pb-4">
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            <ThemedText type="default" className="text-green-500 text-sm">
              GPS Active
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
} 