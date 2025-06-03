import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore, useCurrentRide } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { optimizationManagerService, OptimizationProfile } from '../services/optimizationManager';
import { PowerMode, rideTrackerService } from '../services/rideTracker';
import { screenManagerService } from '../services/screenManager';
import { ThemedView } from './ThemedView';

function StatCard({ value, label, color = 'text-gray-900 dark:text-white' }: { 
  value: string; 
  label: string; 
  color?: string;
}) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex-1 mx-2">
      <Text className={`text-3xl font-bold ${color} mb-1 text-center`}>
        {value}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">
        {label}
      </Text>
    </View>
  );
}

function PowerModeSelector({ 
  currentMode, 
  onModeChange, 
  disabled 
}: { 
  currentMode: PowerMode; 
  onModeChange: (mode: PowerMode) => void;
  disabled: boolean;
}) {
  const modes = [
    { mode: PowerMode.PERFORMANCE, label: '⚡', color: 'bg-red-500' },
    { mode: PowerMode.BALANCED, label: '⚖️', color: 'bg-orange-500' },
    { mode: PowerMode.BATTERY_SAVER, label: '🔋', color: 'bg-green-500' },
  ];

  return (
    <View className="flex-row justify-center space-x-2 mb-4">
      {modes.map(({ mode, label, color }) => (
        <TouchableOpacity
          key={mode}
          onPress={() => onModeChange(mode)}
          disabled={disabled}
          className={`
            w-12 h-12 rounded-full items-center justify-center
            ${currentMode === mode ? color : 'bg-gray-200 dark:bg-gray-700'}
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          <Text className="text-lg">{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function OptimizationProfileSelector({ 
  currentProfile, 
  onProfileChange, 
  disabled 
}: { 
  currentProfile: OptimizationProfile; 
  onProfileChange: (profile: OptimizationProfile) => void;
  disabled: boolean;
}) {
  const profiles = [
    { profile: OptimizationProfile.MAXIMUM_PERFORMANCE, label: '🏎️', name: 'Performance' },
    { profile: OptimizationProfile.BALANCED_EFFICIENCY, label: '⚖️', name: 'Balanced' },
    { profile: OptimizationProfile.ULTRA_BATTERY_SAVER, label: '🔋', name: 'Ultra Saver' },
  ];

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-3">
        Optimization Profile
      </Text>
      <View className="flex-row justify-center space-x-4">
        {profiles.map(({ profile, label, name }) => (
          <TouchableOpacity
            key={profile}
            onPress={() => onProfileChange(profile)}
            disabled={disabled}
            className={`
              items-center p-3 rounded-xl
              ${currentProfile === profile 
                ? 'bg-orange-500 dark:bg-orange-600' 
                : 'bg-gray-200 dark:bg-gray-700'
              }
              ${disabled ? 'opacity-50' : ''}
            `}
          >
            <Text className="text-2xl mb-1">{label}</Text>
            <Text className={`text-xs font-medium ${
              currentProfile === profile 
                ? 'text-white' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function BatteryOptimizationPanel({ 
  optimizationStats, 
  onInteraction 
}: { 
  optimizationStats: any;
  onInteraction: () => void;
}) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3 text-center">
        Battery Optimization
      </Text>
      
      {/* Battery Life Estimate */}
      <View className="items-center mb-4">
        <Text className="text-3xl font-bold text-green-600 dark:text-green-400">
          {optimizationStats?.estimatedBatteryLife || 'Calculating...'}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Estimated Battery Life
        </Text>
      </View>

      {/* Power Breakdown */}
      {optimizationStats?.powerBreakdown && (
        <View className="flex-row justify-between mb-4">
          <View className="items-center flex-1">
            <Text className="text-orange-500 font-bold">
              {optimizationStats.powerBreakdown.gps}%
            </Text>
            <Text className="text-xs text-gray-500">GPS</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-blue-500 font-bold">
              {optimizationStats.powerBreakdown.screen}%
            </Text>
            <Text className="text-xs text-gray-500">Screen</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-purple-500 font-bold">
              {optimizationStats.powerBreakdown.processing}%
            </Text>
            <Text className="text-xs text-gray-500">Processing</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-green-500 font-bold">
              {optimizationStats.powerBreakdown.network}%
            </Text>
            <Text className="text-xs text-gray-500">Network</Text>
          </View>
        </View>
      )}

      {/* Recommendations */}
      {optimizationStats?.recommendations?.length > 0 && (
        <View className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <Text className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
            💡 Optimization Tips:
          </Text>
          {optimizationStats.recommendations.slice(0, 2).map((rec: string, index: number) => (
            <Text key={index} className="text-xs text-orange-700 dark:text-orange-300 mb-1">
              • {rec}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export function RideTracker() {
  const currentRide = useCurrentRide();
  const { startRideTracking, stopRideTracking, isLoading } = useAppStore();
  const { user } = useAuth();
  const [displayTime, setDisplayTime] = useState('00:00');
  const [powerMode, setPowerMode] = useState<PowerMode>(PowerMode.BALANCED);
  const [optimizationProfile, setOptimizationProfile] = useState<OptimizationProfile>(OptimizationProfile.BALANCED_EFFICIENCY);
  const [optimizationStats, setOptimizationStats] = useState<any>(null);
  const [isDimmed, setIsDimmed] = useState(false);

  // Initialize optimization services
  useEffect(() => {
    const initializeOptimizations = async () => {
      try {
        await optimizationManagerService.initialize();
        
        // Set up callbacks
        optimizationManagerService.setCallbacks({
          onOptimizationUpdate: (stats) => {
            setOptimizationStats(stats);
          },
          onRecommendation: (recommendation) => {
            console.log('Optimization recommendation:', recommendation);
          },
        });

        screenManagerService.setCallbacks({
          onDimStateChange: (dimmed) => {
            setIsDimmed(dimmed);
          },
        });

        // Get initial stats
        const stats = optimizationManagerService.getOptimizationStats();
        setOptimizationStats(stats);
      } catch (error) {
        console.error('Failed to initialize optimizations:', error);
      }
    };

    initializeOptimizations();

    return () => {
      optimizationManagerService.cleanup();
    };
  }, []);

  // Update display time with variable frequency based on power mode
  useEffect(() => {
    if (!currentRide.isTracking) return;

    const updateInterval = powerMode === PowerMode.BATTERY_SAVER ? 5000 : 
                          powerMode === PowerMode.BALANCED ? 2000 : 1000;

    const interval = setInterval(() => {
      setDisplayTime(rideTrackerService.formatDuration(currentRide.currentDuration));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [currentRide.isTracking, currentRide.currentDuration, powerMode]);

  // Update display time when ride state changes
  useEffect(() => {
    setDisplayTime(rideTrackerService.formatDuration(currentRide.currentDuration));
  }, [currentRide.currentDuration]);

  // Set up power mode change callback
  useEffect(() => {
    rideTrackerService.setCallbacks({
      onLocationUpdate: (rideState) => {
        // This will be handled by the store
      },
      onPowerModeChange: (mode) => {
        setPowerMode(mode);
      },
    });
    
    // Get initial power mode
    setPowerMode(rideTrackerService.getPowerMode());
    setOptimizationProfile(optimizationManagerService.getCurrentProfile());
  }, []);

  const handleStartRide = async () => {
    // Register interaction and notify optimization manager
    screenManagerService.registerInteraction();
    await optimizationManagerService.setRideActive(true);
    
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
          onPress: async () => {
            await stopRideTracking();
            await optimizationManagerService.setRideActive(false);
          }
        },
      ]
    );
  };

  const handlePowerModeChange = (mode: PowerMode) => {
    rideTrackerService.setPowerMode(mode);
    setPowerMode(mode);
    
    const modeNames = {
      [PowerMode.PERFORMANCE]: 'Performance Mode',
      [PowerMode.BALANCED]: 'Balanced Mode', 
      [PowerMode.BATTERY_SAVER]: 'Battery Saver Mode'
    };
    
    Alert.alert(
      'Power Mode Changed',
      `Switched to ${modeNames[mode]}`,
      [{ text: 'OK' }]
    );
  };

  const handleOptimizationProfileChange = async (profile: OptimizationProfile) => {
    setOptimizationProfile(profile);
    await optimizationManagerService.setOptimizationProfile(profile);
    
    const profileNames = {
      [OptimizationProfile.MAXIMUM_PERFORMANCE]: 'Maximum Performance',
      [OptimizationProfile.BALANCED_EFFICIENCY]: 'Balanced Efficiency',
      [OptimizationProfile.ULTRA_BATTERY_SAVER]: 'Ultra Battery Saver',
      [OptimizationProfile.CUSTOM]: 'Custom Settings'
    };
    
    Alert.alert(
      'Optimization Profile Changed',
      `Switched to ${profileNames[profile]}`,
      [{ text: 'OK' }]
    );
  };

  const handleScreenInteraction = () => {
    screenManagerService.registerInteraction();
  };

  const getPowerModeText = () => {
    switch (powerMode) {
      case PowerMode.PERFORMANCE: return 'Performance • High Battery Use';
      case PowerMode.BALANCED: return 'Balanced • Moderate Battery Use';
      case PowerMode.BATTERY_SAVER: return 'Battery Saver • Low Battery Use';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ThemedView 
        className={`flex-1 ${isDimmed ? 'opacity-50' : ''}`}
        onTouchStart={handleScreenInteraction}
      >
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: 100 // Extra padding for tab bar
          }}
          bounces={true}
        >
          {/* Header Section */}
          <View className="bg-white dark:bg-gray-800 pb-6">
            <View className="px-6 pt-4">
              {/* Main Status */}
              <View className="items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentRide.isTracking ? 'Ride in Progress' : 'Ready to Ride'}
                </Text>
                
                {/* Large Time Display */}
                <View className="mb-4">
                  <Text className="text-6xl font-bold text-orange-500 font-mono text-center">
                    {displayTime}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center mt-2">
                    Duration
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Optimization Profile Selector */}
          {!currentRide.isTracking && (
            <View className="px-6 py-4">
              <OptimizationProfileSelector
                currentProfile={optimizationProfile}
                onProfileChange={handleOptimizationProfileChange}
                disabled={isLoading}
              />
            </View>
          )}

          {/* Battery Optimization Panel */}
          {optimizationStats && (
            <View className="px-4">
              <BatteryOptimizationPanel 
                optimizationStats={optimizationStats}
                onInteraction={handleScreenInteraction}
              />
            </View>
          )}

          {/* Stats Grid */}
          <View className="px-4 py-6">
            <View className="flex-row mb-4">
              <StatCard 
                value={rideTrackerService.formatDistance(currentRide.currentDistance)}
                label="Distance"
                color="text-green-600 dark:text-green-400"
              />
              <StatCard 
                value={rideTrackerService.formatSpeed(currentRide.currentSpeed)}
                label="Speed"
                color="text-blue-600 dark:text-blue-400"
              />
            </View>
            
            <View className="flex-row mb-6">
              <StatCard 
                value={rideTrackerService.formatSpeed(currentRide.averageSpeed)}
                label="Avg Speed"
                color="text-purple-600 dark:text-purple-400"
              />
              <StatCard 
                value="0"
                label="Elevation"
                color="text-gray-600 dark:text-gray-400"
              />
            </View>
          </View>

          {/* Control Section */}
          <View className="px-6 py-4">
            {/* GPS Status */}
            {currentRide.isTracking && (
              <View className="flex-row items-center justify-center mb-6">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-green-600 dark:text-green-400 text-sm">
                  GPS Active • Recording
                </Text>
              </View>
            )}

            {/* Power Mode Selector */}
            <PowerModeSelector
              currentMode={powerMode}
              onModeChange={handlePowerModeChange}
              disabled={isLoading}
            />

            {/* Power Mode Info */}
            <Text className="text-center text-xs text-gray-500 dark:text-gray-400 mb-6">
              {getPowerModeText()}
            </Text>

            {/* Action Button */}
            <TouchableOpacity
              onPress={currentRide.isTracking ? handleStopRide : handleStartRide}
              disabled={isLoading}
              className={`
                py-6 px-8 rounded-2xl items-center justify-center shadow-lg mb-6
                ${currentRide.isTracking 
                  ? 'bg-red-500 dark:bg-red-600' 
                  : 'bg-orange-500 dark:bg-orange-600'
                }
                ${isLoading ? 'opacity-50' : ''}
              `}
              activeOpacity={0.9}
            >
              <Text className="text-white text-xl font-bold">
                {isLoading 
                  ? 'Processing...' 
                  : currentRide.isTracking 
                    ? 'FINISH RIDE' 
                    : 'START RIDE'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
} 