import { backgroundProcessorService, ProcessingMode } from './backgroundProcessor';
import { NetworkMode, networkOptimizerService } from './networkOptimizer';
import { PowerMode, rideTrackerService } from './rideTracker';
import { screenManagerService, ScreenMode } from './screenManager';

export enum OptimizationProfile {
  MAXIMUM_PERFORMANCE = 'maximum_performance',   // Best accuracy, higher battery use
  BALANCED_EFFICIENCY = 'balanced_efficiency',   // Good balance of features and battery
  ULTRA_BATTERY_SAVER = 'ultra_battery_saver',   // Maximum battery life
  CUSTOM = 'custom'                               // User-defined settings
}

interface OptimizationSettings {
  powerMode: PowerMode;
  screenMode: ScreenMode;
  processingMode: ProcessingMode;
  networkMode: NetworkMode;
}

const OPTIMIZATION_PROFILES: Record<OptimizationProfile, OptimizationSettings> = {
  [OptimizationProfile.MAXIMUM_PERFORMANCE]: {
    powerMode: PowerMode.PERFORMANCE,
    screenMode: ScreenMode.RIDE_ACTIVE,
    processingMode: ProcessingMode.FOREGROUND_FULL,
    networkMode: NetworkMode.CELLULAR_ALLOWED,
  },
  [OptimizationProfile.BALANCED_EFFICIENCY]: {
    powerMode: PowerMode.BALANCED,
    screenMode: ScreenMode.RIDE_ACTIVE,
    processingMode: ProcessingMode.FOREGROUND_RIDE,
    networkMode: NetworkMode.WIFI_ONLY,
  },
  [OptimizationProfile.ULTRA_BATTERY_SAVER]: {
    powerMode: PowerMode.BATTERY_SAVER,
    screenMode: ScreenMode.BATTERY_SAVER,
    processingMode: ProcessingMode.BACKGROUND_ESSENTIAL,
    networkMode: NetworkMode.OFFLINE_ONLY,
  },
  [OptimizationProfile.CUSTOM]: {
    powerMode: PowerMode.BALANCED,
    screenMode: ScreenMode.RIDE_ACTIVE,
    processingMode: ProcessingMode.FOREGROUND_RIDE,
    networkMode: NetworkMode.WIFI_ONLY,
  },
};

interface OptimizationStats {
  estimatedBatteryLife: string;
  currentProfile: OptimizationProfile;
  activeOptimizations: string[];
  recommendations: string[];
  powerBreakdown: {
    gps: number;
    screen: number;
    processing: number;
    network: number;
  };
}

class OptimizationManagerService {
  private currentProfile: OptimizationProfile = OptimizationProfile.BALANCED_EFFICIENCY;
  private isRideActive: boolean = false;
  private customSettings: OptimizationSettings | null = null;
  private initialized: boolean = false;
  
  private callbacks: {
    onProfileChange?: (profile: OptimizationProfile) => void;
    onOptimizationUpdate?: (stats: OptimizationStats) => void;
    onRecommendation?: (recommendation: string) => void;
  } = {};

  /**
   * Initialize all optimization services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize all services
      await Promise.all([
        screenManagerService.initialize(),
        backgroundProcessorService.initialize(),
        networkOptimizerService.initialize(),
      ]);
      
      // Set up cross-service callbacks
      this.setupServiceCallbacks();
      
      // Apply initial optimization profile
      await this.applyOptimizationProfile(this.currentProfile);
      
      this.initialized = true;
      console.log('Optimization manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize optimization manager:', error);
      throw error;
    }
  }

  /**
   * Cleanup all optimization services
   */
  cleanup(): void {
    screenManagerService.cleanup();
    backgroundProcessorService.cleanup();
    networkOptimizerService.cleanup();
    this.initialized = false;
  }

  /**
   * Set optimization profile
   */
  async setOptimizationProfile(profile: OptimizationProfile): Promise<void> {
    this.currentProfile = profile;
    await this.applyOptimizationProfile(profile);
    this.callbacks.onProfileChange?.(profile);
  }

  /**
   * Set ride tracking state
   */
  async setRideActive(isActive: boolean): Promise<void> {
    this.isRideActive = isActive;
    
    // Update all services
    backgroundProcessorService.setRideActive(isActive);
    
    // Auto-optimize based on ride state
    if (isActive) {
      await this.optimizeForRide();
    } else {
      await this.optimizeForNormal();
    }
    
    this.updateOptimizationStats();
  }

  /**
   * Get current optimization profile
   */
  getCurrentProfile(): OptimizationProfile {
    return this.currentProfile;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): OptimizationStats {
    const batteryUsage = rideTrackerService.getEstimatedBatteryUsage();
    const screenStats = screenManagerService.getScreenStats();
    const processingStats = backgroundProcessorService.getProcessingStats();
    const networkStats = networkOptimizerService.getNetworkStats();
    
    // Calculate power breakdown (percentages)
    const powerBreakdown = this.calculatePowerBreakdown();
    
    // Estimate total battery life
    const estimatedBatteryLife = this.calculateBatteryLife(powerBreakdown);
    
    // Get active optimizations
    const activeOptimizations = this.getActiveOptimizations();
    
    // Get recommendations
    const recommendations = this.getSmartRecommendations();
    
    return {
      estimatedBatteryLife,
      currentProfile: this.currentProfile,
      activeOptimizations,
      recommendations,
      powerBreakdown,
    };
  }

  /**
   * Get optimization recommendations based on current conditions
   */
  getSmartRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // GPS recommendations
    const gpsStats = rideTrackerService.getTrackingStats();
    if (gpsStats.gpsPoints > 8000 && gpsStats.powerMode === PowerMode.PERFORMANCE) {
      recommendations.push('Consider switching to Balanced mode for better battery life');
    }
    
    // Screen recommendations
    const screenStats = screenManagerService.getScreenStats();
    if (screenStats.timeSinceLastInteraction > 60000 && !screenStats.isDimmed) {
      recommendations.push('Screen has been on for a while - consider enabling auto-dim');
    }
    
    // Network recommendations
    const networkStats = networkOptimizerService.getNetworkStats();
    const queueStats = networkOptimizerService.getQueueStats();
    if (queueStats.queueSize > 15 && networkStats.connectionType === 'wifi') {
      recommendations.push('WiFi available - consider syncing your ride data');
    }
    
    // Processing recommendations
    const processingStats = backgroundProcessorService.getProcessingStats();
    if (processingStats.deferredTasks > 20) {
      recommendations.push('Many tasks deferred - return to app to process updates');
    }
    
    return recommendations;
  }

  /**
   * Force sync all pending data
   */
  async forceSyncAll(): Promise<void> {
    try {
      await networkOptimizerService.forceSync();
      await backgroundProcessorService.executeDeferredTasks();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Set custom optimization settings
   */
  async setCustomSettings(settings: Partial<OptimizationSettings>): Promise<void> {
    const currentSettings = this.customSettings || OPTIMIZATION_PROFILES[OptimizationProfile.BALANCED_EFFICIENCY];
    
    this.customSettings = {
      ...currentSettings,
      ...settings,
    };
    
    this.currentProfile = OptimizationProfile.CUSTOM;
    await this.applyOptimizationSettings(this.customSettings);
  }

  /**
   * Get estimated battery life for different profiles
   */
  getBatteryEstimates(): Record<OptimizationProfile, string> {
    const estimates: Record<OptimizationProfile, string> = {} as any;
    
    Object.entries(OPTIMIZATION_PROFILES).forEach(([profile, settings]) => {
      const breakdown = this.calculatePowerBreakdownForSettings(settings);
      estimates[profile as OptimizationProfile] = this.calculateBatteryLife(breakdown);
    });
    
    return estimates;
  }

  /**
   * Set callbacks for optimization events
   */
  setCallbacks(callbacks: {
    onProfileChange?: (profile: OptimizationProfile) => void;
    onOptimizationUpdate?: (stats: OptimizationStats) => void;
    onRecommendation?: (recommendation: string) => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Apply optimization profile to all services
   */
  private async applyOptimizationProfile(profile: OptimizationProfile): Promise<void> {
    const settings = this.customSettings || OPTIMIZATION_PROFILES[profile];
    await this.applyOptimizationSettings(settings);
  }

  /**
   * Apply specific optimization settings
   */
  private async applyOptimizationSettings(settings: OptimizationSettings): Promise<void> {
    try {
      // Apply settings to all services
      rideTrackerService.setPowerMode(settings.powerMode);
      await screenManagerService.setScreenMode(settings.screenMode);
      networkOptimizerService.setNetworkMode(settings.networkMode);
      
      console.log('Applied optimization settings:', settings);
    } catch (error) {
      console.error('Failed to apply optimization settings:', error);
    }
  }

  /**
   * Optimize for active ride
   */
  private async optimizeForRide(): Promise<void> {
    const profile = this.currentProfile;
    
    // Additional ride-specific optimizations
    if (profile !== OptimizationProfile.CUSTOM) {
      await screenManagerService.setScreenMode(ScreenMode.RIDE_ACTIVE);
    }
    
    this.callbacks.onRecommendation?.('Ride mode activated - optimizing for tracking');
  }

  /**
   * Optimize for normal use
   */
  private async optimizeForNormal(): Promise<void> {
    const profile = this.currentProfile;
    
    // Return to normal optimizations
    if (profile !== OptimizationProfile.CUSTOM) {
      await screenManagerService.setScreenMode(ScreenMode.NORMAL);
    }
    
    // Execute any deferred tasks
    await backgroundProcessorService.executeDeferredTasks();
  }

  /**
   * Setup callbacks between services
   */
  private setupServiceCallbacks(): void {
    // Screen manager callbacks
    screenManagerService.setCallbacks({
      onInteraction: () => {
        this.updateOptimizationStats();
      },
    });
    
    // Background processor callbacks
    backgroundProcessorService.setCallbacks({
      onTaskDeferred: (count) => {
        if (count > 20) {
          this.callbacks.onRecommendation?.(`${count} tasks deferred - consider returning to foreground`);
        }
      },
    });
    
    // Network optimizer callbacks
    networkOptimizerService.setCallbacks({
      onNetworkChange: (connected, type) => {
        if (connected && type === 'wifi') {
          this.callbacks.onRecommendation?.('WiFi connected - good time to sync data');
        }
      },
    });
  }

  /**
   * Calculate power breakdown for current settings
   */
  private calculatePowerBreakdown(): { gps: number; screen: number; processing: number; network: number } {
    const currentSettings = this.customSettings || OPTIMIZATION_PROFILES[this.currentProfile];
    return this.calculatePowerBreakdownForSettings(currentSettings);
  }

  /**
   * Calculate power breakdown for specific settings
   */
  private calculatePowerBreakdownForSettings(settings: OptimizationSettings): { gps: number; screen: number; processing: number; network: number } {
    // Base power consumption percentages
    let gps = 0;
    let screen = 0;
    let processing = 0;
    let network = 0;
    
    // GPS power based on mode
    switch (settings.powerMode) {
      case PowerMode.PERFORMANCE: gps = 35; break;
      case PowerMode.BALANCED: gps = 25; break;
      case PowerMode.BATTERY_SAVER: gps = 15; break;
    }
    
    // Screen power based on mode
    switch (settings.screenMode) {
      case ScreenMode.RIDE_ACTIVE: screen = 25; break;
      case ScreenMode.BATTERY_SAVER: screen = 15; break;
      case ScreenMode.NORMAL: screen = 20; break;
      case ScreenMode.NIGHT_MODE: screen = 10; break;
    }
    
    // Processing power based on mode
    switch (settings.processingMode) {
      case ProcessingMode.FOREGROUND_FULL: processing = 15; break;
      case ProcessingMode.FOREGROUND_RIDE: processing = 10; break;
      case ProcessingMode.BACKGROUND_ESSENTIAL: processing = 5; break;
      case ProcessingMode.BACKGROUND_MINIMAL: processing = 2; break;
    }
    
    // Network power based on mode
    switch (settings.networkMode) {
      case NetworkMode.CELLULAR_ALLOWED: network = 10; break;
      case NetworkMode.WIFI_ONLY: network = 3; break;
      case NetworkMode.OFFLINE_ONLY: network = 0; break;
    }
    
    // Normalize to 100%
    const total = gps + screen + processing + network;
    const normalizer = total > 0 ? 100 / total : 1;
    
    return {
      gps: Math.round(gps * normalizer),
      screen: Math.round(screen * normalizer),
      processing: Math.round(processing * normalizer),
      network: Math.round(network * normalizer),
    };
  }

  /**
   * Calculate estimated battery life
   */
  private calculateBatteryLife(powerBreakdown: { gps: number; screen: number; processing: number; network: number }): string {
    // Base battery consumption per hour (percentage)
    const totalConsumption = (powerBreakdown.gps * 0.3) + 
                           (powerBreakdown.screen * 0.25) + 
                           (powerBreakdown.processing * 0.1) + 
                           (powerBreakdown.network * 0.15);
    
    const hoursOfBattery = Math.max(1, Math.floor(100 / totalConsumption));
    
    if (hoursOfBattery >= 24) {
      return '24+ hours';
    } else if (hoursOfBattery >= 12) {
      return `${hoursOfBattery} hours`;
    } else {
      return `${hoursOfBattery} hours`;
    }
  }

  /**
   * Get list of active optimizations
   */
  private getActiveOptimizations(): string[] {
    const optimizations: string[] = [];
    
    // Check each service for active optimizations
    const trackingStats = rideTrackerService.getTrackingStats();
    optimizations.push(`GPS: ${trackingStats.powerMode.replace('_', ' ')}`);
    
    const screenStats = screenManagerService.getScreenStats();
    optimizations.push(`Screen: ${screenStats.mode.replace('_', ' ')}`);
    
    const processingStats = backgroundProcessorService.getProcessingStats();
    optimizations.push(`Processing: ${processingStats.mode.replace('_', ' ')}`);
    
    const networkStats = networkOptimizerService.getNetworkStats();
    optimizations.push(`Network: ${networkStats.currentMode.replace('_', ' ')}`);
    
    return optimizations;
  }

  /**
   * Update optimization statistics
   */
  private updateOptimizationStats(): void {
    const stats = this.getOptimizationStats();
    this.callbacks.onOptimizationUpdate?.(stats);
  }
}

export const optimizationManagerService = new OptimizationManagerService(); 