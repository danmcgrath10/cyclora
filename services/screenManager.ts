import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AppState } from 'react-native';

export enum ScreenMode {
  NORMAL = 'normal',           // Standard brightness and behavior
  RIDE_ACTIVE = 'ride_active', // Keep awake with auto-dim
  BATTERY_SAVER = 'battery_saver', // Aggressive power saving
  NIGHT_MODE = 'night_mode'    // Low brightness for night rides
}

interface ScreenSettings {
  keepAwake: boolean;
  autoDimDelay: number;       // milliseconds before dimming
  allowSleep: boolean;
  orientation: 'portrait' | 'landscape' | 'auto';
  reducedRefreshRate: boolean;
}

const SCREEN_MODE_SETTINGS: Record<ScreenMode, ScreenSettings> = {
  [ScreenMode.NORMAL]: {
    keepAwake: false,
    autoDimDelay: 30000, // 30 seconds
    allowSleep: true,
    orientation: 'auto',
    reducedRefreshRate: false,
  },
  [ScreenMode.RIDE_ACTIVE]: {
    keepAwake: true,
    autoDimDelay: 15000, // 15 seconds
    allowSleep: false,
    orientation: 'portrait',
    reducedRefreshRate: false,
  },
  [ScreenMode.BATTERY_SAVER]: {
    keepAwake: true,
    autoDimDelay: 10000, // 10 seconds
    allowSleep: false,
    orientation: 'portrait',
    reducedRefreshRate: true,
  },
  [ScreenMode.NIGHT_MODE]: {
    keepAwake: true,
    autoDimDelay: 20000, // 20 seconds
    allowSleep: false,
    orientation: 'portrait',
    reducedRefreshRate: true,
  },
};

class ScreenManagerService {
  private currentMode: ScreenMode = ScreenMode.NORMAL;
  private dimTimer: ReturnType<typeof setTimeout> | null = null;
  private isDimmed: boolean = false;
  private isActive: boolean = true;
  private lastInteraction: number = Date.now();
  private appStateSubscription: any = null;
  
  private callbacks: {
    onScreenModeChange?: (mode: ScreenMode) => void;
    onDimStateChange?: (isDimmed: boolean) => void;
    onInteraction?: () => void;
  } = {};

  /**
   * Initialize screen management
   */
  async initialize(): Promise<void> {
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Set initial orientation
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }

  /**
   * Cleanup screen management
   */
  cleanup(): void {
    this.setScreenMode(ScreenMode.NORMAL);
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Set screen mode for different use cases
   */
  async setScreenMode(mode: ScreenMode): Promise<void> {
    const prevMode = this.currentMode;
    this.currentMode = mode;
    const settings = SCREEN_MODE_SETTINGS[mode];

    try {
      // Manage keep awake
      if (settings.keepAwake) {
        await activateKeepAwakeAsync('cyclora-ride-tracking');
      } else {
        deactivateKeepAwake('cyclora-ride-tracking');
      }

      // Reset dim timer
      this.resetDimTimer();
      
      // Lock orientation if specified
      if (settings.orientation === 'portrait') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } else if (settings.orientation === 'landscape') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.unlockAsync();
      }

      this.callbacks.onScreenModeChange?.(mode);
      
      console.log(`Screen mode changed: ${prevMode} → ${mode}`);
    } catch (error) {
      console.error('Failed to set screen mode:', error);
    }
  }

  /**
   * Register interaction to prevent dimming
   */
  registerInteraction(): void {
    this.lastInteraction = Date.now();
    
    if (this.isDimmed) {
      this.undimScreen();
    }
    
    this.resetDimTimer();
    this.callbacks.onInteraction?.();
  }

  /**
   * Get current screen mode
   */
  getCurrentMode(): ScreenMode {
    return this.currentMode;
  }

  /**
   * Check if screen is dimmed
   */
  getIsDimmed(): boolean {
    return this.isDimmed;
  }

  /**
   * Set callbacks for screen events
   */
  setCallbacks(callbacks: {
    onScreenModeChange?: (mode: ScreenMode) => void;
    onDimStateChange?: (isDimmed: boolean) => void;
    onInteraction?: () => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Get screen optimization recommendations
   */
  getOptimizationRecommendations(rideMode: 'performance' | 'balanced' | 'battery_saver'): {
    recommendedMode: ScreenMode;
    batteryImpact: string;
    features: string[];
  } {
    const recommendations = {
      performance: {
        recommendedMode: ScreenMode.RIDE_ACTIVE,
        batteryImpact: 'Medium - screen stays on with normal brightness',
        features: ['Keep awake enabled', 'Auto-dim after 15s', 'Portrait locked'],
      },
      balanced: {
        recommendedMode: ScreenMode.RIDE_ACTIVE,
        batteryImpact: 'Medium - balanced screen management',
        features: ['Keep awake enabled', 'Auto-dim after 15s', 'Tap to wake'],
      },
      battery_saver: {
        recommendedMode: ScreenMode.BATTERY_SAVER,
        batteryImpact: 'Low - aggressive screen power saving',
        features: ['Quick auto-dim (10s)', 'Reduced refresh rate', 'Minimal brightness'],
      },
    };

    return recommendations[rideMode];
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: string): void {
    const wasActive = this.isActive;
    this.isActive = nextAppState === 'active';

    if (!wasActive && this.isActive) {
      // App became active - reset interaction timer
      this.registerInteraction();
    } else if (wasActive && !this.isActive) {
      // App became background - clear timers
      this.clearDimTimer();
    }
  }

  /**
   * Reset the auto-dim timer
   */
  private resetDimTimer(): void {
    this.clearDimTimer();
    
    if (this.currentMode === ScreenMode.NORMAL) return;
    
    const settings = SCREEN_MODE_SETTINGS[this.currentMode];
    
    this.dimTimer = setTimeout(() => {
      this.dimScreen();
    }, settings.autoDimDelay);
  }

  /**
   * Clear the auto-dim timer
   */
  private clearDimTimer(): void {
    if (this.dimTimer) {
      clearTimeout(this.dimTimer);
      this.dimTimer = null;
    }
  }

  /**
   * Dim the screen
   */
  private dimScreen(): void {
    if (this.isDimmed) return;
    
    this.isDimmed = true;
    this.callbacks.onDimStateChange?.(true);
    
    console.log('Screen dimmed for power saving');
  }

  /**
   * Undim the screen
   */
  private undimScreen(): void {
    if (!this.isDimmed) return;
    
    this.isDimmed = false;
    this.callbacks.onDimStateChange?.(false);
    
    console.log('Screen undimmed');
  }

  /**
   * Get current screen statistics
   */
  getScreenStats(): {
    mode: ScreenMode;
    isDimmed: boolean;
    timeSinceLastInteraction: number;
    keepAwakeActive: boolean;
  } {
    return {
      mode: this.currentMode,
      isDimmed: this.isDimmed,
      timeSinceLastInteraction: Date.now() - this.lastInteraction,
      keepAwakeActive: SCREEN_MODE_SETTINGS[this.currentMode].keepAwake,
    };
  }
}

export const screenManagerService = new ScreenManagerService(); 