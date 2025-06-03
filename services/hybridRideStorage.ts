import { RideRecord } from '../types/ride';
import { rideStorageService } from './rideStorage';
import { supabaseRidesService } from './supabaseRides';

interface HybridRideData {
  localRides: RideRecord[];
  remoteRides: RideRecord[];
  hasMoreRemote: boolean;
  nextCursor: string | null;
  totalCount: number;
}

class HybridRideStorageService {
  private readonly HOURS_24 = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private isMigrating = false;

  /**
   * Initialize the hybrid storage system
   */
  async initialize(): Promise<void> {
    await rideStorageService.initializeDatabase();
    // Perform initial migration of old rides
    await this.migrateOldRides();
  }

  /**
   * Save a new ride (always saves locally first)
   */
  async saveRide(rideData: Omit<RideRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Save to local storage first
    const rideId = await rideStorageService.saveRide(rideData);
    
    // Schedule migration check (non-blocking)
    setTimeout(() => this.migrateOldRides(), 5000);
    
    return rideId;
  }

  /**
   * Get recent rides (last 24 hours) from local storage
   */
  async getRecentRides(): Promise<RideRecord[]> {
    const allLocalRides = await rideStorageService.getAllRides();
    const cutoffTime = new Date(Date.now() - this.HOURS_24);
    
    return allLocalRides.filter(ride => 
      new Date(ride.timestamp) > cutoffTime
    );
  }

  /**
   * Get old rides (older than 24 hours) that should be migrated
   */
  async getOldRides(): Promise<RideRecord[]> {
    const allLocalRides = await rideStorageService.getAllRides();
    const cutoffTime = new Date(Date.now() - this.HOURS_24);
    
    return allLocalRides.filter(ride => 
      new Date(ride.timestamp) <= cutoffTime
    );
  }

  /**
   * Get paginated rides (combines local recent + remote old)
   */
  async getPaginatedRides(
    remoteCursor?: string,
    pageSize: number = 10
  ): Promise<HybridRideData> {
    // Get recent local rides
    const localRides = await this.getRecentRides();
    
    // Get paginated remote rides
    const remoteData = await supabaseRidesService.getPaginatedRides(remoteCursor, pageSize);
    
    // Calculate total count (local + remote)
    const totalLocalCount = localRides.length;
    const totalRemoteCount = remoteData.totalCount;
    
    return {
      localRides,
      remoteRides: remoteData.rides,
      hasMoreRemote: remoteData.hasMore,
      nextCursor: remoteData.nextCursor,
      totalCount: totalLocalCount + totalRemoteCount,
    };
  }

  /**
   * Get all rides for statistics (combines local and remote stats)
   */
  async getAllRideStats(): Promise<{
    totalRides: number;
    totalDistance: number;
    totalDuration: number;
  }> {
    // Get local stats
    const localStats = await rideStorageService.getRideStats();
    
    try {
      // Get remote stats
      const remoteStats = await supabaseRidesService.getRideStats();
      
      return {
        totalRides: localStats.totalRides + remoteStats.totalRides,
        totalDistance: localStats.totalDistance + remoteStats.totalDistance,
        totalDuration: localStats.totalDuration + remoteStats.totalDuration,
      };
    } catch (error) {
      console.warn('Failed to get remote stats, using local only:', error);
      return localStats;
    }
  }

  /**
   * Delete a ride (checks both local and remote)
   */
  async deleteRide(rideId: string): Promise<void> {
    // Try to delete from local first
    try {
      await rideStorageService.deleteRide(rideId);
    } catch (error) {
      // If not found locally, it might be in remote
      console.log('Ride not found locally, trying remote...');
    }
    
    // Try to delete from remote
    try {
      await supabaseRidesService.deleteRide(rideId);
    } catch (error) {
      // If not found in either, that's fine
      console.log('Ride not found in remote storage');
    }
  }

  /**
   * Update ride AI summary (checks both local and remote)
   */
  async updateRideAISummary(rideId: string, aiSummary: string): Promise<void> {
    // Try local first
    try {
      await rideStorageService.updateRideAISummary(rideId, aiSummary);
      return;
    } catch (error) {
      console.log('Ride not found locally for AI update, trying remote...');
    }
    
    // Try remote
    try {
      await supabaseRidesService.updateRideAISummary(rideId, aiSummary);
    } catch (error) {
      throw new Error(`Failed to update AI summary: ${error}`);
    }
  }

  /**
   * Migrate old rides from local to Supabase
   */
  async migrateOldRides(): Promise<void> {
    if (this.isMigrating) {
      console.log('Migration already in progress, skipping...');
      return;
    }

    this.isMigrating = true;
    
    try {
      const oldRides = await this.getOldRides();
      
      if (oldRides.length === 0) {
        console.log('No old rides to migrate');
        return;
      }

      console.log(`Migrating ${oldRides.length} old rides to Supabase...`);
      
      // Upload rides to Supabase
      await supabaseRidesService.uploadRides(oldRides);
      
      // Delete from local storage after successful upload
      for (const ride of oldRides) {
        await rideStorageService.deleteRide(ride.id);
      }
      
      console.log(`Successfully migrated ${oldRides.length} rides to Supabase`);
    } catch (error) {
      console.error('Failed to migrate old rides:', error);
      // Don't throw - migration failure shouldn't break the app
    } finally {
      this.isMigrating = false;
    }
  }

  /**
   * Force migration of all local rides (for manual sync)
   */
  async forceFullMigration(): Promise<void> {
    if (this.isMigrating) {
      throw new Error('Migration already in progress');
    }

    this.isMigrating = true;
    
    try {
      const allLocalRides = await rideStorageService.getAllRides();
      
      if (allLocalRides.length === 0) {
        console.log('No local rides to migrate');
        return;
      }

      console.log(`Force migrating ${allLocalRides.length} rides to Supabase...`);
      
      // Upload all rides to Supabase
      await supabaseRidesService.uploadRides(allLocalRides);
      
      // Keep only recent rides locally (last 24 hours)
      const cutoffTime = new Date(Date.now() - this.HOURS_24);
      const oldRides = allLocalRides.filter(ride => 
        new Date(ride.timestamp) <= cutoffTime
      );
      
      // Delete old rides from local storage
      for (const ride of oldRides) {
        await rideStorageService.deleteRide(ride.id);
      }
      
      console.log(`Successfully migrated ${allLocalRides.length} rides to Supabase`);
    } catch (error) {
      console.error('Failed to force migrate rides:', error);
      throw error;
    } finally {
      this.isMigrating = false;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): { isMigrating: boolean } {
    return { isMigrating: this.isMigrating };
  }

  /**
   * Check data integrity between local and remote
   */
  async checkDataIntegrity(): Promise<{
    localCount: number;
    remoteCount: number;
    oldLocalRidesCount: number;
  }> {
    const allLocalRides = await rideStorageService.getAllRides();
    const recentRides = await this.getRecentRides();
    const oldRides = await this.getOldRides();
    
    let remoteCount = 0;
    try {
      const remoteStats = await supabaseRidesService.getRideStats();
      remoteCount = remoteStats.totalRides;
    } catch (error) {
      console.warn('Failed to get remote count:', error);
    }
    
    return {
      localCount: allLocalRides.length,
      remoteCount,
      oldLocalRidesCount: oldRides.length,
    };
  }
}

export const hybridRideStorageService = new HybridRideStorageService(); 