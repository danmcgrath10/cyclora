import * as Location from 'expo-location';
import { LocationPoint, RideTrackingState } from '../types/ride';

// Battery optimization modes
export enum PowerMode {
  PERFORMANCE = 'performance',     // Best accuracy, highest battery use
  BALANCED = 'balanced',          // Good accuracy, moderate battery use  
  BATTERY_SAVER = 'battery_saver' // Lower accuracy, longest battery life
}

interface PowerModeConfig {
  accuracy: Location.Accuracy;
  timeInterval: number;
  distanceInterval: number;
  uiUpdateInterval: number;
  maxStoredPoints: number;
}

const POWER_MODE_CONFIGS: Record<PowerMode, PowerModeConfig> = {
  [PowerMode.PERFORMANCE]: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,        // 2 seconds
    distanceInterval: 10,      // 10 meters
    uiUpdateInterval: 1000,    // 1 second UI updates
    maxStoredPoints: 10000,    // Store more points for detailed tracking
  },
  [PowerMode.BALANCED]: {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,        // 5 seconds  
    distanceInterval: 20,      // 20 meters
    uiUpdateInterval: 2000,    // 2 second UI updates
    maxStoredPoints: 5000,     // Moderate point storage
  },
  [PowerMode.BATTERY_SAVER]: {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,       // 10 seconds
    distanceInterval: 50,      // 50 meters
    uiUpdateInterval: 5000,    // 5 second UI updates
    maxStoredPoints: 2000,     // Minimal point storage
  },
};

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
  private uiUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private startTime: Date | null = null;
  private positions: LocationPoint[] = [];
  private maxSpeed: number = 0;
  private currentPowerMode: PowerMode = PowerMode.BALANCED;
  private lastMovementTime: number = Date.now();
  private isStationary: boolean = false;
  private stationaryThreshold: number = 30000; // 30 seconds without movement
  
  private callbacks: {
    onLocationUpdate?: (state: RideTrackingState) => void;
    onError?: (error: string) => void;
    onPowerModeChange?: (mode: PowerMode) => void;
  } = {};

  /**
   * Set power saving mode
   */
  setPowerMode(mode: PowerMode): void {
    this.currentPowerMode = mode;
    this.callbacks.onPowerModeChange?.(mode);
    
    // If currently tracking, restart with new settings
    if (this.trackingState.isTracking) {
      this.restartTrackingWithNewMode();
    }
  }

  /**
   * Get current power mode
   */
  getPowerMode(): PowerMode {
    return this.currentPowerMode;
  }

  /**
   * Auto-detect optimal power mode based on ride characteristics
   */
  private adaptPowerMode(): void {
    if (!this.trackingState.isTracking) return;
    
    const rideDuration = this.trackingState.currentDuration;
    const currentSpeed = this.trackingState.currentSpeed;
    
    // Auto-switch to battery saver after 2 hours
    if (rideDuration > 7200 && this.currentPowerMode !== PowerMode.BATTERY_SAVER) {
      this.setPowerMode(PowerMode.BATTERY_SAVER);
      this.callbacks.onError?.('Switched to Battery Saver mode for long ride');
    }
    // Switch to battery saver when stationary for extended periods
    else if (this.isStationary && currentSpeed < 2 && this.currentPowerMode === PowerMode.PERFORMANCE) {
      this.setPowerMode(PowerMode.BALANCED);
    }
  }

  /**
   * Restart tracking with new power mode settings
   */
  private async restartTrackingWithNewMode(): Promise<void> {
    if (!this.trackingState.isTracking) return;

    // Stop current location subscription
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Stop UI update interval
    if (this.uiUpdateInterval) {
      clearInterval(this.uiUpdateInterval);
      this.uiUpdateInterval = null;
    }

    // Restart with new settings
    const config = POWER_MODE_CONFIGS[this.currentPowerMode];
    
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: config.accuracy,
        timeInterval: config.timeInterval,
        distanceInterval: config.distanceInterval,
      },
      this.handleLocationUpdate.bind(this)
    );

    // Start optimized UI updates
    this.uiUpdateInterval = setInterval(() => {
      this.updateDuration();
      this.adaptPowerMode();
      this.manageMemory();
      this.callbacks.onLocationUpdate?.(this.trackingState);
    }, config.uiUpdateInterval);
  }

  /**
   * Manage memory by limiting stored GPS points
   */
  private manageMemory(): void {
    const config = POWER_MODE_CONFIGS[this.currentPowerMode];
    
    if (this.positions.length > config.maxStoredPoints) {
      // Keep recent points and some evenly spaced historical points
      const keepRecent = Math.floor(config.maxStoredPoints * 0.7);
      const keepHistorical = config.maxStoredPoints - keepRecent;
      const step = Math.floor((this.positions.length - keepRecent) / keepHistorical);
      
      const historicalPoints = [];
      for (let i = 0; i < this.positions.length - keepRecent; i += step) {
        historicalPoints.push(this.positions[i]);
      }
      
      const recentPoints = this.positions.slice(-keepRecent);
      this.positions = [...historicalPoints, ...recentPoints];
    }
  }

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
    onPowerModeChange?: (mode: PowerMode) => void;
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
      this.maxSpeed = 0; // Reset max speed
      this.lastMovementTime = Date.now();
      this.isStationary = false;
      
      this.trackingState = {
        isTracking: true,
        startTime: this.startTime,
        currentDistance: 0,
        currentDuration: 0,
        currentSpeed: 0,
        averageSpeed: 0,
      };

      const config = POWER_MODE_CONFIGS[this.currentPowerMode];

      // Start location tracking with power-optimized settings
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: config.accuracy,
          timeInterval: config.timeInterval,
          distanceInterval: config.distanceInterval,
        },
        this.handleLocationUpdate.bind(this)
      );

      // Start duration timer (1 second for accurate time tracking)
      this.trackingInterval = setInterval(() => {
        this.updateDuration();
      }, 1000);

      // Start optimized UI updates (can be less frequent)
      this.uiUpdateInterval = setInterval(() => {
        this.adaptPowerMode();
        this.manageMemory();
        this.callbacks.onLocationUpdate?.(this.trackingState);
      }, config.uiUpdateInterval);

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

    // Stop UI update timer
    if (this.uiUpdateInterval) {
      clearInterval(this.uiUpdateInterval);
      this.uiUpdateInterval = null;
    }

    // Final state update
    this.updateDuration();
    this.trackingState.isTracking = false;

    // Clear memory
    this.positions = [];

    this.callbacks.onLocationUpdate?.(this.trackingState);
    return this.trackingState;
  }

  /**
   * Handle location updates from GPS
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    const now = Date.now();
    const newPosition: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
    };

    // Movement detection for power optimization
    const currentSpeed = location.coords.speed ? location.coords.speed * 3.6 : 0; // km/h
    if (currentSpeed > 1) { // Moving faster than 1 km/h
      this.lastMovementTime = now;
      this.isStationary = false;
    } else if (now - this.lastMovementTime > this.stationaryThreshold) {
      this.isStationary = true;
    }

    this.positions.push(newPosition);

    // Update current speed (convert m/s to km/h)
    if (location.coords.speed !== null && location.coords.speed >= 0) {
      this.trackingState.currentSpeed = currentSpeed;
      // Track maximum speed
      if (currentSpeed > this.maxSpeed) {
        this.maxSpeed = currentSpeed;
      }
    }

    // Calculate total distance if we have previous positions
    if (this.positions.length > 1) {
      const distance = this.calculateDistance(
        this.positions[this.positions.length - 2],
        newPosition
      );
      
      // Only add distance if we're actually moving (reduces GPS drift)
      if (currentSpeed > 0.5 || distance > 0.01) { // 0.5 km/h or 10m minimum
        this.trackingState.currentDistance += distance;
      }
    }

    // Update average speed
    this.updateAverageSpeed();

    // Update last position
    this.trackingState.lastPosition = {
      latitude: newPosition.latitude,
      longitude: newPosition.longitude,
      timestamp: newPosition.timestamp,
    };

    // Only trigger immediate UI update for significant changes
    const config = POWER_MODE_CONFIGS[this.currentPowerMode];
    if (currentSpeed > 2 || now % config.uiUpdateInterval < 1000) {
      this.callbacks.onLocationUpdate?.(this.trackingState);
    }
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

  /**
   * Get estimated battery usage per hour for current power mode
   */
  getEstimatedBatteryUsage(): { percentage: number; description: string } {
    switch (this.currentPowerMode) {
      case PowerMode.PERFORMANCE:
        return { 
          percentage: 25, 
          description: 'High accuracy GPS • ~4 hours battery life' 
        };
      case PowerMode.BALANCED:
        return { 
          percentage: 15, 
          description: 'Balanced GPS • ~6-7 hours battery life' 
        };
      case PowerMode.BATTERY_SAVER:
        return { 
          percentage: 8, 
          description: 'Low power GPS • ~12+ hours battery life' 
        };
      default:
        return { percentage: 15, description: 'Unknown' };
    }
  }

  /**
   * Get power mode recommendations based on ride duration
   */
  getRecommendedPowerMode(expectedDurationHours: number): PowerMode {
    if (expectedDurationHours <= 2) {
      return PowerMode.PERFORMANCE;
    } else if (expectedDurationHours <= 4) {
      return PowerMode.BALANCED;
    } else {
      return PowerMode.BATTERY_SAVER;
    }
  }

  /**
   * Get complete ride data including route points and max speed
   */
  getRideData(): {
    distance: number;
    duration: number;
    averageSpeed: number;
    maxSpeed: number;
    routePoints: LocationPoint[];
    startTime: Date | null;
  } {
    return {
      distance: this.trackingState.currentDistance,
      duration: this.trackingState.currentDuration,
      averageSpeed: this.trackingState.averageSpeed,
      maxSpeed: this.maxSpeed,
      routePoints: [...this.positions], // Copy of route points
      startTime: this.startTime,
    };
  }

  /**
   * Get tracking statistics
   */
  getTrackingStats(): {
    gpsPoints: number;
    powerMode: PowerMode;
    isStationary: boolean;
    memoryUsage: string;
  } {
    return {
      gpsPoints: this.positions.length,
      powerMode: this.currentPowerMode,
      isStationary: this.isStationary,
      memoryUsage: `${this.positions.length} GPS points stored`,
    };
  }
}

export const rideTrackerService = new RideTrackerService(); 