import * as Location from 'expo-location';
import { LocationPoint, RideTrackingState } from '../types/ride';

class RideTrackerService {
  private trackingState: RideTrackingState = {
    isTracking: false,
    currentDistance: 0,
    currentDuration: 0,
    currentSpeed: 0,
    averageSpeed: 0,
  };

  private locationSubscription: Location.LocationSubscription | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private startTime: Date | null = null;
  private positions: LocationPoint[] = [];
  private callbacks: {
    onLocationUpdate?: (state: RideTrackingState) => void;
    onError?: (error: string) => void;
  } = {};

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        this.callbacks.onError?.('Location permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied - tracking may be limited when app is backgrounded');
      }

      return true;
    } catch (error) {
      this.callbacks.onError?.(`Permission error: ${error}`);
      return false;
    }
  }

  /**
   * Set callbacks for location updates and errors
   */
  setCallbacks(callbacks: {
    onLocationUpdate?: (state: RideTrackingState) => void;
    onError?: (error: string) => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Start tracking the ride
   */
  async startTracking(): Promise<boolean> {
    if (this.trackingState.isTracking) {
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    try {
      this.startTime = new Date();
      this.positions = [];
      this.trackingState = {
        isTracking: true,
        startTime: this.startTime,
        currentDistance: 0,
        currentDuration: 0,
        currentSpeed: 0,
        averageSpeed: 0,
      };

      // Start location tracking with energy-efficient settings
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000, // Update every 3 seconds minimum
          distanceInterval: 15, // Update when moved ≥15 meters
        },
        this.handleLocationUpdate.bind(this)
      );

      // Start duration timer
      this.trackingInterval = setInterval(() => {
        this.updateDuration();
      }, 1000);

      this.callbacks.onLocationUpdate?.(this.trackingState);
      return true;
    } catch (error) {
      this.callbacks.onError?.(`Failed to start tracking: ${error}`);
      return false;
    }
  }

  /**
   * Stop tracking the ride
   */
  async stopTracking(): Promise<RideTrackingState> {
    if (!this.trackingState.isTracking) {
      return this.trackingState;
    }

    // Stop location tracking
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Stop duration timer
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    // Final state update
    this.updateDuration();
    this.trackingState.isTracking = false;

    this.callbacks.onLocationUpdate?.(this.trackingState);
    return this.trackingState;
  }

  /**
   * Handle location updates from GPS
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    const newPosition: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
    };

    this.positions.push(newPosition);

    // Update current speed (convert m/s to km/h)
    if (location.coords.speed !== null && location.coords.speed >= 0) {
      this.trackingState.currentSpeed = location.coords.speed * 3.6;
    }

    // Calculate total distance if we have previous positions
    if (this.positions.length > 1) {
      const distance = this.calculateDistance(
        this.positions[this.positions.length - 2],
        newPosition
      );
      this.trackingState.currentDistance += distance;
    }

    // Update average speed
    this.updateAverageSpeed();

    // Update last position
    this.trackingState.lastPosition = {
      latitude: newPosition.latitude,
      longitude: newPosition.longitude,
      timestamp: newPosition.timestamp,
    };

    this.callbacks.onLocationUpdate?.(this.trackingState);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(pos1: LocationPoint, pos2: LocationPoint): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(pos2.latitude - pos1.latitude);
    const dLon = this.toRadians(pos2.longitude - pos1.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(pos1.latitude)) *
        Math.cos(this.toRadians(pos2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Update duration based on elapsed time
   */
  private updateDuration(): void {
    if (this.startTime) {
      this.trackingState.currentDuration = Math.floor(
        (Date.now() - this.startTime.getTime()) / 1000
      );
    }
  }

  /**
   * Update average speed calculation
   */
  private updateAverageSpeed(): void {
    if (this.trackingState.currentDuration > 0) {
      this.trackingState.averageSpeed = 
        (this.trackingState.currentDistance / this.trackingState.currentDuration) * 3600; // km/h
    }
  }

  /**
   * Get current tracking state
   */
  getTrackingState(): RideTrackingState {
    return { ...this.trackingState };
  }

  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.trackingState.isTracking;
  }

  /**
   * Format duration for display (HH:MM:SS)
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format distance for display
   */
  formatDistance(kilometers: number): string {
    if (kilometers < 1) {
      return `${Math.round(kilometers * 1000)}m`;
    }
    return `${kilometers.toFixed(2)}km`;
  }

  /**
   * Format speed for display
   */
  formatSpeed(kmh: number): string {
    return `${kmh.toFixed(1)} km/h`;
  }
}

export const rideTrackerService = new RideTrackerService(); 