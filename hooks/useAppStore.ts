import { create } from 'zustand';
import { aiSummaryService } from '../services/aiSummary';
import { rideStorageService } from '../services/rideStorage';
import { rideTrackerService } from '../services/rideTracker';
import { RideRecord, RideTrackingState } from '../types/ride';

interface AppState {
  // User preferences
  isDarkMode: boolean;
  userName: string;
  
  // App state
  isLoading: boolean;
  notifications: Notification[];
  
  // Ride tracking state
  currentRide: RideTrackingState;
  rideHistory: RideRecord[];
  
  // Actions
  toggleDarkMode: () => void;
  setUserName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Ride actions
  updateCurrentRide: (rideState: RideTrackingState) => void;
  loadRideHistory: () => Promise<void>;
  startRideTracking: () => Promise<boolean>;
  stopRideTracking: () => Promise<void>;
  deleteRide: (id: string) => Promise<void>;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isDarkMode: false,
  userName: '',
  isLoading: false,
  notifications: [],
  currentRide: {
    isTracking: false,
    currentDistance: 0,
    currentDuration: 0,
    currentSpeed: 0,
    averageSpeed: 0,
  },
  rideHistory: [],

  // Actions
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  setUserName: (name: string) => set({ userName: name }),
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 10), // Keep only last 10
    }));
  },
  
  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
    
  clearNotifications: () => set({ notifications: [] }),

  // Ride tracking actions
  updateCurrentRide: (rideState: RideTrackingState) => {
    set({ currentRide: rideState });
  },

  loadRideHistory: async () => {
    try {
      set({ isLoading: true });
      await rideStorageService.initializeDatabase();
      const rides = await rideStorageService.getAllRides();
      set({ rideHistory: rides });
    } catch (error) {
      console.error('Failed to load ride history:', error);
      get().addNotification({
        title: 'Error',
        message: 'Failed to load ride history',
        type: 'error',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  startRideTracking: async () => {
    try {
      // Set up callbacks for ride tracker
      rideTrackerService.setCallbacks({
        onLocationUpdate: (rideState) => {
          get().updateCurrentRide(rideState);
        },
        onError: (error) => {
          get().addNotification({
            title: 'GPS Error',
            message: error,
            type: 'error',
          });
        },
      });

      const success = await rideTrackerService.startTracking();
      
      if (success) {
        get().addNotification({
          title: 'Ride Started',
          message: 'GPS tracking is now active',
          type: 'success',
        });
      } else {
        get().addNotification({
          title: 'Failed to Start',
          message: 'Could not start ride tracking',
          type: 'error',
        });
      }
      
      return success;
    } catch (error) {
      console.error('Failed to start ride tracking:', error);
      get().addNotification({
        title: 'Error',
        message: 'Failed to start ride tracking',
        type: 'error',
      });
      return false;
    }
  },

  stopRideTracking: async () => {
    try {
      set({ isLoading: true });
      const finalState = await rideTrackerService.stopTracking();
      
      // Save the ride
      if (finalState.currentDistance > 0 && finalState.currentDuration > 0) {
        const rideData = {
          timestamp: new Date().toISOString(),
          distance: finalState.currentDistance,
          duration: finalState.currentDuration,
          averageSpeed: finalState.averageSpeed,
        };

        const rideId = await rideStorageService.saveRide(rideData);
        
        // Generate AI summary
        try {
          const summary = await aiSummaryService.generateSummaryWithQueue(rideId, {
            distance: rideData.distance,
            duration: rideData.duration,
            averageSpeed: rideData.averageSpeed,
          });
          
          await rideStorageService.updateRideAISummary(rideId, summary);
          
          get().addNotification({
            title: 'Ride Completed!',
            message: summary,
            type: 'success',
          });
        } catch (error) {
          console.error('Failed to generate AI summary:', error);
        }

        // Reload ride history
        await get().loadRideHistory();
        
        get().addNotification({
          title: 'Ride Saved',
          message: `${rideTrackerService.formatDistance(rideData.distance)} ride saved successfully`,
          type: 'success',
        });
      } else {
        get().addNotification({
          title: 'Ride Cancelled',
          message: 'No significant distance recorded',
          type: 'info',
        });
      }

      // Reset current ride state
      set({
        currentRide: {
          isTracking: false,
          currentDistance: 0,
          currentDuration: 0,
          currentSpeed: 0,
          averageSpeed: 0,
        },
      });
    } catch (error) {
      console.error('Failed to stop ride tracking:', error);
      get().addNotification({
        title: 'Error',
        message: 'Failed to save ride',
        type: 'error',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteRide: async (id: string) => {
    try {
      await rideStorageService.deleteRide(id);
      await get().loadRideHistory();
      get().addNotification({
        title: 'Ride Deleted',
        message: 'Ride removed from history',
        type: 'info',
      });
    } catch (error) {
      console.error('Failed to delete ride:', error);
      get().addNotification({
        title: 'Error',
        message: 'Failed to delete ride',
        type: 'error',
      });
    }
  },
}));

// Selectors for better performance
export const useIsDarkMode = () => useAppStore((state) => state.isDarkMode);
export const useUserName = () => useAppStore((state) => state.userName);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useCurrentRide = () => useAppStore((state) => state.currentRide);
export const useRideHistory = () => useAppStore((state) => state.rideHistory); 