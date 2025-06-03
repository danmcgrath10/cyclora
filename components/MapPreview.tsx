import React from 'react';
import { Platform, View } from 'react-native';
import { LocationPoint } from '../types/ride';

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

interface MapPreviewProps {
  routePoints: LocationPoint[];
  width?: number;
  height?: number;
  style?: any;
}

export function MapPreview({ 
  routePoints, 
  width = 120, 
  height = 80, 
  style 
}: MapPreviewProps) {
  // If expo-maps is not available or no route points, show placeholder
  if (!AppleMaps || !GoogleMaps || !routePoints || routePoints.length < 2) {
    return (
      <View 
        style={[
          {
            width,
            height,
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
          },
          style
        ]}
        className="bg-gray-100 dark:bg-gray-700"
      >
        <View className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full items-center justify-center">
          <View className="w-3 h-3 bg-orange-500 rounded-full" />
        </View>
      </View>
    );
  }

  // Calculate bounds for the route
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

  const cameraPosition = {
    coordinates: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
    },
    zoom: Math.max(15 - Math.log2(Math.max(maxLat - minLat, maxLng - minLng) * 111), 10), // Rough zoom calculation
  };

  const polylineProps = {
    coordinates,
    color: "#FF6B35",
    width: 3,
  };

  const containerStyle = [
    {
      width,
      height,
      borderRadius: 12,
      overflow: 'hidden',
    },
    style
  ];

  if (Platform.OS === 'ios') {
    return (
      <View style={containerStyle}>
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          uiSettings={{
            compassEnabled: false,
            myLocationButtonEnabled: false,
            scaleBarEnabled: false,
            togglePitchEnabled: false,
          }}
          polylines={[polylineProps]}
        />
      </View>
    );
  } else if (Platform.OS === 'android') {
    return (
      <View style={containerStyle}>
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          uiSettings={{
            compassEnabled: false,
            myLocationButtonEnabled: false,
            scaleBarEnabled: false,
            scrollGesturesEnabled: false,
            zoomGesturesEnabled: false,
            rotationGesturesEnabled: false,
            tiltGesturesEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
          }}
          polylines={[polylineProps]}
        />
      </View>
    );
  } else {
    // Fallback for web or other platforms
    return (
      <View style={containerStyle} className="bg-gray-200 dark:bg-gray-600 items-center justify-center">
        <View className="w-8 h-8 bg-orange-500 rounded-full" />
      </View>
    );
  }
} 