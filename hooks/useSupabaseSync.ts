import { RideRecord } from '@/types/ride';
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface UseSupabaseSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncRideData: (rides: RideRecord[]) => Promise<void>;
  loadUserRides: () => Promise<RideRecord[]>;
}

export function useSupabaseSync(): UseSupabaseSyncReturn {
  const { user, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check if user is online (basic implementation)
  useEffect(() => {
    // You could enhance this with network state detection
    setIsOnline(true);
  }, []);

  const syncRideData = async (rides: RideRecord[]): Promise<void> => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping sync');
      return;
    }

    try {
      setIsSyncing(true);
      
      // Create a rides table entry for each ride
      // You would need to create a 'rides' table in Supabase first
      const rideData = rides.map(ride => ({
        id: ride.id,
        user_id: user.id,
        distance: ride.distance,
        duration: ride.duration,
        average_speed: ride.averageSpeed,
        timestamp: ride.timestamp,
        ai_summary: ride.aiSummary || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // For now, we'll just log what would be synced
      // Uncomment when you have the rides table set up:
      /*
      const { error } = await supabase
        .from('rides')
        .upsert(rideData, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      */

      console.log('Would sync rides:', rideData);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error syncing ride data:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const loadUserRides = async (): Promise<RideRecord[]> => {
    if (!isAuthenticated || !user) {
      return [];
    }

    try {
      // For now, return empty array
      // Uncomment when you have the rides table set up:
      /*
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(ride => ({
        id: ride.id,
        distance: ride.distance,
        duration: ride.duration,
        averageSpeed: ride.average_speed,
        timestamp: ride.timestamp,
        aiSummary: ride.ai_summary,
      }));
      */

      return [];
    } catch (error) {
      console.error('Error loading user rides:', error);
      return [];
    }
  };

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncRideData,
    loadUserRides,
  };
} 