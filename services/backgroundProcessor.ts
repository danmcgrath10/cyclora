import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus } from 'react-native';

const BACKGROUND_RIDE_SYNC = 'background-ride-sync';

export enum ProcessingMode {
  FOREGROUND_FULL = 'foreground_full',     // All services active
  FOREGROUND_RIDE = 'foreground_ride',     // Ride tracking optimized
  BACKGROUND_ESSENTIAL = 'background_essential', // Only critical services
  BACKGROUND_MINIMAL = 'background_minimal'      // Minimal processing
}

interface ServiceState {
  aiSummary: boolean;
  notifications: boolean;
  analytics: boolean;
  uiAnimations: boolean;
  dataSync: boolean;
  locationTracking: boolean;
}

const PROCESSING_MODE_SERVICES: Record<ProcessingMode, ServiceState> = {
  [ProcessingMode.FOREGROUND_FULL]: {
    aiSummary: true,
    notifications: true,
    analytics: true,
    uiAnimations: true,
    dataSync: true,
    locationTracking: true,
  },
  [ProcessingMode.FOREGROUND_RIDE]: {
    aiSummary: false,        // Defer until ride ends
    notifications: true,     // Keep for GPS errors
    analytics: false,        // Defer non-essential tracking
    uiAnimations: false,     // Reduce UI overhead
    dataSync: false,         // Defer until ride ends
    locationTracking: true,  // Essential for tracking
  },
  [ProcessingMode.BACKGROUND_ESSENTIAL]: {
    aiSummary: false,
    notifications: false,    // Only critical notifications
    analytics: false,
    uiAnimations: false,
    dataSync: false,
    locationTracking: true,  // Continue GPS tracking
  },
  [ProcessingMode.BACKGROUND_MINIMAL]: {
    aiSummary: false,
    notifications: false,
    analytics: false,
    uiAnimations: false,
    dataSync: false,
    locationTracking: false, // Even GPS paused
  },
};

class BackgroundProcessorService {
  private currentMode: ProcessingMode = ProcessingMode.FOREGROUND_FULL;
  private appState: AppStateStatus = 'active';
  private isRideActive: boolean = false;
  private appStateSubscription: any = null;
  private deferredTasks: (() => Promise<void>)[] = [];
  
  private callbacks: {
    onModeChange?: (mode: ProcessingMode) => void;
    onServiceStateChange?: (services: ServiceState) => void;
    onTaskDeferred?: (taskCount: number) => void;
  } = {};

  /**
   * Initialize background processing
   */
  async initialize(): Promise<void> {
    // Register background task
    await this.registerBackgroundTasks();
    
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    console.log('Background processor initialized');
  }

  /**
   * Cleanup background processing
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Unregister background tasks
    BackgroundFetch.unregisterTaskAsync(BACKGROUND_RIDE_SYNC).catch(console.error);
  }

  /**
   * Set ride tracking state
   */
  setRideActive(isActive: boolean): void {
    this.isRideActive = isActive;
    this.updateProcessingMode();
  }

  /**
   * Get current processing mode
   */
  getCurrentMode(): ProcessingMode {
    return this.currentMode;
  }

  /**
   * Get current service states
   */
  getServiceStates(): ServiceState {
    return PROCESSING_MODE_SERVICES[this.currentMode];
  }

  /**
   * Defer a task to run when appropriate
   */
  deferTask(task: () => Promise<void>, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    if (priority === 'high' || this.currentMode === ProcessingMode.FOREGROUND_FULL) {
      // Execute immediately for high priority or when in full mode
      task().catch(console.error);
    } else {
      // Defer for later execution
      this.deferredTasks.push(task);
      this.callbacks.onTaskDeferred?.(this.deferredTasks.length);
    }
  }

  /**
   * Execute deferred tasks when appropriate
   */
  async executeDeferredTasks(): Promise<void> {
    if (this.deferredTasks.length === 0) return;
    
    const tasksToExecute = [...this.deferredTasks];
    this.deferredTasks = [];
    
    console.log(`Executing ${tasksToExecute.length} deferred tasks`);
    
    for (const task of tasksToExecute) {
      try {
        await task();
      } catch (error) {
        console.error('Deferred task failed:', error);
      }
    }
    
    this.callbacks.onTaskDeferred?.(0);
  }

  /**
   * Get processing optimization recommendations
   */
  getOptimizationRecommendations(): {
    currentOptimization: string;
    deferredTasks: number;
    batteryImpact: string;
    suggestions: string[];
  } {
    const serviceState = PROCESSING_MODE_SERVICES[this.currentMode];
    const activeServices = Object.values(serviceState).filter(Boolean).length;
    
    return {
      currentOptimization: this.currentMode.replace('_', ' ').toUpperCase(),
      deferredTasks: this.deferredTasks.length,
      batteryImpact: this.getBatteryImpact(),
      suggestions: this.getOptimizationSuggestions(),
    };
  }

  /**
   * Set callbacks for background processing events
   */
  setCallbacks(callbacks: {
    onModeChange?: (mode: ProcessingMode) => void;
    onServiceStateChange?: (services: ServiceState) => void;
    onTaskDeferred?: (taskCount: number) => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Register background tasks
   */
  private async registerBackgroundTasks(): Promise<void> {
    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_RIDE_SYNC, async () => {
        console.log('Background ride sync executing...');
        
        // Only sync essential data during background
        return BackgroundFetch.BackgroundFetchResult.NewData;
      });

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_RIDE_SYNC, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background tasks registered');
    } catch (error) {
      console.error('Failed to register background tasks:', error);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const prevState = this.appState;
    this.appState = nextAppState;
    
    console.log(`App state changed: ${prevState} → ${nextAppState}`);
    
    if (nextAppState === 'active' && prevState !== 'active') {
      // App became foreground - execute deferred tasks
      this.executeDeferredTasks();
    }
    
    this.updateProcessingMode();
  }

  /**
   * Update processing mode based on current state
   */
  private updateProcessingMode(): void {
    let newMode: ProcessingMode;
    
    if (this.appState === 'active') {
      // App is in foreground
      newMode = this.isRideActive 
        ? ProcessingMode.FOREGROUND_RIDE 
        : ProcessingMode.FOREGROUND_FULL;
    } else {
      // App is in background
      newMode = this.isRideActive 
        ? ProcessingMode.BACKGROUND_ESSENTIAL 
        : ProcessingMode.BACKGROUND_MINIMAL;
    }
    
    if (newMode !== this.currentMode) {
      const prevMode = this.currentMode;
      this.currentMode = newMode;
      
      this.callbacks.onModeChange?.(newMode);
      this.callbacks.onServiceStateChange?.(PROCESSING_MODE_SERVICES[newMode]);
      
      console.log(`Processing mode changed: ${prevMode} → ${newMode}`);
    }
  }

  /**
   * Get battery impact description
   */
  private getBatteryImpact(): string {
    switch (this.currentMode) {
      case ProcessingMode.FOREGROUND_FULL:
        return 'High - All services active';
      case ProcessingMode.FOREGROUND_RIDE:
        return 'Medium - Ride optimized';
      case ProcessingMode.BACKGROUND_ESSENTIAL:
        return 'Low - Essential services only';
      case ProcessingMode.BACKGROUND_MINIMAL:
        return 'Minimal - Maximum power saving';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get optimization suggestions
   */
  private getOptimizationSuggestions(): string[] {
    const suggestions = [];
    
    if (this.deferredTasks.length > 10) {
      suggestions.push('Many tasks deferred - consider returning to foreground');
    }
    
    if (this.isRideActive && this.appState !== 'active') {
      suggestions.push('Ride tracking in background - return to app for optimal tracking');
    }
    
    if (this.currentMode === ProcessingMode.FOREGROUND_FULL && this.isRideActive) {
      suggestions.push('Consider ride mode for better battery life during tracking');
    }
    
    return suggestions;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    mode: ProcessingMode;
    appState: AppStateStatus;
    isRideActive: boolean;
    deferredTasks: number;
    activeServices: number;
  } {
    const serviceState = PROCESSING_MODE_SERVICES[this.currentMode];
    const activeServices = Object.values(serviceState).filter(Boolean).length;
    
    return {
      mode: this.currentMode,
      appState: this.appState,
      isRideActive: this.isRideActive,
      deferredTasks: this.deferredTasks.length,
      activeServices,
    };
  }
}

export const backgroundProcessorService = new BackgroundProcessorService(); 