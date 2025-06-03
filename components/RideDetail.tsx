import React from 'react';
import { Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { rideTrackerService } from '../services/rideTracker';
import { LocationPoint, RideRecord } from '../types/ride';
import { ThemedView } from './ThemedView';

// Safely import expo-maps with fallback
let AppleMaps: any = null;
let GoogleMaps: any = null;

try {
  const expoMaps = require('expo-maps');
  AppleMaps = expoMaps.AppleMaps;
  GoogleMaps = expoMaps.GoogleMaps;
} catch (error) {
  console.log('expo-maps not available - using fallback UI');
}

interface RideDetailProps {
  ride: RideRecord;
  onClose: () => void;
}

function DetailStatCard({ 
  value, 
  label, 
  color = 'text-gray-900 dark:text-white',
  icon 
}: { 
  value: string; 
  label: string; 
  color?: string;
  icon?: string;
}) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex-1 mx-1">
      {icon && (
        <Text className="text-2xl text-center mb-2">{icon}</Text>
      )}
      <Text className={`text-2xl font-bold ${color} mb-1 text-center`}>
        {value}
      </Text>
      <Text className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">
        {label}
      </Text>
    </View>
  );
}

export function RideDetail({ ride, onClose }: RideDetailProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const routePoints: LocationPoint[] = ride.routePoints || [];
  
  // Calculate map region
  const getMapCameraPosition = () => {
    if (!routePoints || routePoints.length === 0) {
      // Default to a generic location if no route data
      return {
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        zoom: 12,
      };
    }

    const coordinates = routePoints.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));

    const latitudes = coordinates.map(coord => coord.latitude);
    const longitudes = coordinates.map(coord => coord.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      coordinates: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
      },
      zoom: Math.max(15 - Math.log2(Math.max(maxLat - minLat, maxLng - minLng) * 111), 10),
    };
  };

  const cameraPosition = getMapCameraPosition();
  const coordinates = routePoints.map(point => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  const startPoint = coordinates[0];
  const endPoint = coordinates[coordinates.length - 1];

  const renderMap = () => {
    // If expo-maps is not available, show fallback
    if (!AppleMaps || !GoogleMaps) {
      return (
        <View className="flex-1 bg-gray-200 dark:bg-gray-600 items-center justify-center">
          <View className="items-center">
            <View className="w-16 h-16 bg-orange-500 rounded-full items-center justify-center mb-4">
              <Text className="text-white text-2xl">🗺️</Text>
            </View>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              Map requires development build
            </Text>
            <Text className="text-gray-500 dark:text-gray-500 text-xs text-center mt-2">
              Route: {routePoints.length} GPS points recorded
            </Text>
          </View>
        </View>
      );
    }

    const commonPolylines = coordinates.length > 1 ? [{
      coordinates,
      color: "#FF6B35",
      width: 4,
    }] : [];

    if (Platform.OS === 'ios') {
      const markers = [];
      if (startPoint) {
        markers.push({
          coordinates: startPoint,
          title: "Start",
          tintColor: "#22C55E",
          systemImage: "play.circle.fill",
        });
      }
      if (endPoint && startPoint !== endPoint) {
        markers.push({
          coordinates: endPoint,
          title: "Finish", 
          tintColor: "#EF4444",
          systemImage: "stop.circle.fill",
        });
      }

      return (
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={markers}
          polylines={commonPolylines}
          uiSettings={{
            compassEnabled: true,
            myLocationButtonEnabled: false,
            scaleBarEnabled: true,
            togglePitchEnabled: true,
          }}
          properties={{
            mapType: 'STANDARD' as any,
            isTrafficEnabled: false,
          }}
        />
      );
    } else if (Platform.OS === 'android') {
      const markers = [];
      if (startPoint) {
        markers.push({
          coordinates: startPoint,
          title: "Start",
          snippet: "Ride started here",
        });
      }
      if (endPoint && startPoint !== endPoint) {
        markers.push({
          coordinates: endPoint,
          title: "Finish",
          snippet: "Ride ended here",
        });
      }

      return (
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={markers}
          polylines={commonPolylines}
          uiSettings={{
            compassEnabled: true,
            myLocationButtonEnabled: false,
            scaleBarEnabled: true,
            scrollGesturesEnabled: true,
            zoomGesturesEnabled: true,
            rotationGesturesEnabled: true,
            tiltGesturesEnabled: true,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
          }}
          properties={{
            mapType: 'NORMAL' as any,
            isTrafficEnabled: false,
          }}
        />
      );
    } else {
      // Fallback for web or other platforms
      return (
        <View className="flex-1 bg-gray-200 dark:bg-gray-600 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Map not available on this platform</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ThemedView className="flex-1">
        {/* Fixed Header */}
        <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center"
            >
              <Text className="text-lg font-semibold text-gray-600 dark:text-gray-300">←</Text>
            </TouchableOpacity>
            <View className="flex-1 mx-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white text-center">
                Ride Details
              </Text>
            </View>
            <View className="w-10" />
          </View>

          <View className="items-center pb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(ride.timestamp)}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Started at {formatTime(ride.timestamp)}
            </Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: 40 // Extra padding at bottom for safe scrolling
          }}
          bounces={true}
        >
          {/* Map Section */}
          <View className="mx-4 mt-6 mb-6">
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Route Map
              </Text>
              
              <View style={{ height: 300, borderRadius: 16, overflow: 'hidden' }}>
                {renderMap()}
              </View>
            </View>
          </View>

          {/* Stats Section */}
          <View className="mx-4 mb-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-2">
              Ride Statistics
            </Text>
            
            {/* Primary Stats */}
            <View className="flex-row mb-4">
              <DetailStatCard 
                value={rideTrackerService.formatDistance(ride.distance)}
                label="Distance"
                color="text-green-600 dark:text-green-400"
                icon="🚴‍♀️"
              />
              <DetailStatCard 
                value={rideTrackerService.formatDuration(ride.duration)}
                label="Duration"
                color="text-blue-600 dark:text-blue-400"
                icon="⏱️"
              />
            </View>

            {/* Secondary Stats */}
            <View className="flex-row mb-4">
              <DetailStatCard 
                value={rideTrackerService.formatSpeed(ride.averageSpeed)}
                label="Avg Speed"
                color="text-purple-600 dark:text-purple-400"
                icon="⚡"
              />
              <DetailStatCard 
                value="0m"
                label="Elevation"
                color="text-orange-600 dark:text-orange-400"
                icon="⛰️"
              />
            </View>

            {/* Additional Stats */}
            <View className="flex-row mb-4">
              <DetailStatCard 
                value={routePoints.length.toString()}
                label="GPS Points"
                color="text-indigo-600 dark:text-indigo-400"
                icon="📍"
              />
              <DetailStatCard 
                value={ride.maxSpeed ? rideTrackerService.formatSpeed(ride.maxSpeed) : 'N/A'}
                label="Max Speed"
                color="text-red-600 dark:text-red-400"
                icon="🏃‍♂️"
              />
            </View>
          </View>

          {/* AI Summary Section */}
          {ride.aiSummary && (
            <View className="mx-4 mb-6">
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Ride Summary
                </Text>
                <View className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                  <Text className="text-base text-gray-700 dark:text-gray-300 leading-6">
                    {ride.aiSummary}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Technical Details */}
          <View className="mx-4 mb-6">
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Technical Details
              </Text>
              
              <View className="space-y-4">
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-base">Ride ID</Text>
                  <Text className="text-gray-900 dark:text-white font-mono text-sm">
                    {ride.id.substring(0, 8)}...
                  </Text>
                </View>
                
                <View className="h-px bg-gray-200 dark:bg-gray-600" />
                
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-base">Start Time</Text>
                  <Text className="text-gray-900 dark:text-white text-sm">
                    {new Date(ride.timestamp).toLocaleString()}
                  </Text>
                </View>
                
                <View className="h-px bg-gray-200 dark:bg-gray-600" />
                
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-base">GPS Accuracy</Text>
                  <Text className="text-gray-900 dark:text-white text-sm">
                    High Precision
                  </Text>
                </View>
                
                {routePoints.length > 0 && (
                  <>
                    <View className="h-px bg-gray-200 dark:bg-gray-600" />
                    
                    <View className="flex-row justify-between items-center py-2">
                      <Text className="text-gray-600 dark:text-gray-400 text-base">Data Points</Text>
                      <Text className="text-gray-900 dark:text-white text-sm">
                        {routePoints.length} GPS coordinates
                      </Text>
                    </View>
                  </>
                )}
                
                <View className="h-px bg-gray-200 dark:bg-gray-600" />
                
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-base">Storage Location</Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    <Text className="text-gray-900 dark:text-white text-sm">
                      Local Device
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Performance Metrics (Additional Content) */}
          <View className="mx-4 mb-6">
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Performance Analysis
              </Text>
              
              <View className="space-y-4">
                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <Text className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Speed Analysis
                  </Text>
                  <Text className="text-sm text-blue-700 dark:text-blue-300">
                    Your average speed was {rideTrackerService.formatSpeed(ride.averageSpeed)}, 
                    {ride.maxSpeed && ` with a top speed of ${rideTrackerService.formatSpeed(ride.maxSpeed)}`}.
                    {ride.averageSpeed > 20 ? ' Great pace!' : ' Steady and consistent!'}
                  </Text>
                </View>
                
                <View className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <Text className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    Distance Achievement
                  </Text>
                  <Text className="text-sm text-green-700 dark:text-green-300">
                    {ride.distance > 10 
                      ? `Excellent endurance covering ${rideTrackerService.formatDistance(ride.distance)}!` 
                      : `Good ride distance of ${rideTrackerService.formatDistance(ride.distance)}.`
                    }
                  </Text>
                </View>
                
                <View className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <Text className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                    Route Tracking
                  </Text>
                  <Text className="text-sm text-purple-700 dark:text-purple-300">
                    {routePoints.length > 0 
                      ? `High-quality GPS tracking with ${routePoints.length} data points recorded.`
                      : 'Route data not available for this ride.'
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Spacing for Safe Scrolling */}
          <View className="h-8" />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
} 