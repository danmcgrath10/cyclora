import { create } from 'zustand';
import { aiSummaryService } from '../services/aiSummary';
import { hybridRideStorageService } from '../services/hybridRideStorage';
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
  
  // Hybrid ride history state
  localRides: RideRecord[];
  remoteRides: RideRecord[];
  hasMoreRemoteRides: boolean;
  nextRemoteCursor: string | null;
  totalRideCount: number;
  isLoadingMore: boolean;
  
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
  loadMoreRides: () => Promise<void>;
  startRideTracking: () => Promise<boolean>;
  stopRideTracking: () => Promise<void>;
  deleteRide: (id: string) => Promise<void>;
  forceSync: () => Promise<void>;
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
  localRides: [],
  remoteRides: [],
  hasMoreRemoteRides: false,
  nextRemoteCursor: null,
  totalRideCount: 0,
  isLoadingMore: false,

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
      await hybridRideStorageService.initialize();
      
      const hybridData = await hybridRideStorageService.getPaginatedRides();
      
      set({
        localRides: hybridData.localRides,
        remoteRides: hybridData.remoteRides,
        hasMoreRemoteRides: hybridData.hasMoreRemote,
        nextRemoteCursor: hybridData.nextCursor,
        totalRideCount: hybridData.totalCount,
      });
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

  loadMoreRides: async () => {
    const state = get();
    if (state.isLoadingMore || !state.hasMoreRemoteRides) {
      return;
    }

    try {
      set({ isLoadingMore: true });
      
      const hybridData = await hybridRideStorageService.getPaginatedRides(
        state.nextRemoteCursor || undefined
      );
      
      set({
        remoteRides: [...state.remoteRides, ...hybridData.remoteRides],
        hasMoreRemoteRides: hybridData.hasMoreRemote,
        nextRemoteCursor: hybridData.nextCursor,
        totalRideCount: hybridData.totalCount,
      });
    } catch (error) {
      console.error('Failed to load more rides:', error);
      get().addNotification({
        title: 'Error',
        message: 'Failed to load more rides',
        type: 'error',
      });
    } finally {
      set({ isLoadingMore: false });
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
        // Get complete ride data including route points and max speed
        const rideData = rideTrackerService.getRideData();
        
        const rideRecord = {
          timestamp: rideData.startTime?.toISOString() || new Date().toISOString(),
          distance: rideData.distance,
          duration: rideData.duration,
          averageSpeed: rideData.averageSpeed,
          maxSpeed: rideData.maxSpeed,
          routePoints: rideData.routePoints,
        };

        // Save using hybrid storage (local first, then auto-migration)
        const rideId = await hybridRideStorageService.saveRide(rideRecord);
        
        // Generate AI summary
        try {
          const summary = await aiSummaryService.generateSummaryWithQueue(rideId, {
            distance: rideRecord.distance,
            duration: rideRecord.duration,
            averageSpeed: rideRecord.averageSpeed,
          });
          
          await hybridRideStorageService.updateRideAISummary(rideId, summary);
          
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
          message: `${rideTrackerService.formatDistance(rideRecord.distance)} ride saved successfully`,
          type: 'success',
        });
      } else {
        get().addNotification({
          title: 'Ride Cancelled',
          message: 'No significant distance recorded',
          type: 'info',
        });
      }
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
      await hybridRideStorageService.deleteRide(id);
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

  forceSync: async () => {
    try {
      set({ isLoading: true });
      await hybridRideStorageService.forceFullMigration();
      await get().loadRideHistory();
      
      get().addNotification({
        title: 'Sync Complete',
        message: 'All rides have been synced to cloud',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to force sync:', error);
      get().addNotification({
        title: 'Sync Failed',
        message: 'Failed to sync rides to cloud',
        type: 'error',
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Optimized selectors that prevent unnecessary re-renders
export const useIsDarkMode = () => useAppStore((state) => state.isDarkMode);
export const useUserName = () => useAppStore((state) => state.userName);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useCurrentRide = () => useAppStore((state) => state.currentRide);

// Individual ride data selectors
export const useLocalRides = () => useAppStore((state) => state.localRides);
export const useRemoteRides = () => useAppStore((state) => state.remoteRides);
export const useHasMoreRides = () => useAppStore((state) => state.hasMoreRemoteRides);
export const useIsLoadingMore = () => useAppStore((state) => state.isLoadingMore);
export const useTotalRideCount = () => useAppStore((state) => state.totalRideCount); 