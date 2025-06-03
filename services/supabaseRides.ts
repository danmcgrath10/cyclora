import { supabase } from '../lib/supabase';
import { LocationPoint, RideRecord } from '../types/ride';

interface SupabaseRideRow {
  id: string;
  user_id: string;
  timestamp: string;
  distance: number;
  duration: number;
  average_speed: number;
  max_speed: number | null;
  route_points: LocationPoint[] | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedRides {
  rides: RideRecord[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount: number;
}

class SupabaseRidesService {
  private readonly PAGE_SIZE = 10;

  /**
   * Upload a ride to Supabase
   */
  async uploadRide(ride: RideRecord): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const rideData = {
      id: ride.id,
      user_id: user.id,
      timestamp: ride.timestamp,
      distance: ride.distance,
      duration: ride.duration,
      average_speed: ride.averageSpeed,
      max_speed: ride.maxSpeed || null,
      route_points: ride.routePoints || null,
      ai_summary: ride.aiSummary || null,
    };

    const { error } = await supabase
      .from('rides')
      .insert(rideData);

    if (error) {
      throw new Error(`Failed to upload ride: ${error.message}`);
    }

    return ride.id;
  }

  /**
   * Upload multiple rides to Supabase
   */
  async uploadRides(rides: RideRecord[]): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const ridesData = rides.map(ride => ({
      id: ride.id,
      user_id: user.id,
      timestamp: ride.timestamp,
      distance: ride.distance,
      duration: ride.duration,
      average_speed: ride.averageSpeed,
      max_speed: ride.maxSpeed || null,
      route_points: ride.routePoints || null,
      ai_summary: ride.aiSummary || null,
    }));

    const { error } = await supabase
      .from('rides')
      .insert(ridesData);

    if (error) {
      throw new Error(`Failed to upload rides: ${error.message}`);
    }

    return rides.map(ride => ride.id);
  }

  /**
   * Get paginated rides from Supabase
   */
  async getPaginatedRides(
    cursor?: string,
    pageSize: number = this.PAGE_SIZE
  ): Promise<PaginatedRides> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Build the query
    let query = supabase
      .from('rides')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(pageSize + 1); // Get one extra to check if there are more

    // Apply cursor-based pagination
    if (cursor) {
      query = query.lt('timestamp', cursor);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch rides: ${error.message}`);
    }

    const rides = (data || []).slice(0, pageSize);
    const hasMore = (data || []).length > pageSize;
    const nextCursor = hasMore && rides.length > 0 
      ? rides[rides.length - 1].timestamp 
      : null;

    const mappedRides: RideRecord[] = rides.map(this.mapSupabaseRowToRide);

    return {
      rides: mappedRides,
      hasMore,
      nextCursor,
      totalCount: count || 0,
    };
  }

  /**
   * Get all rides for a specific date range (for cleanup operations)
   */
  async getRidesInRange(startDate: Date, endDate: Date): Promise<RideRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch rides in range: ${error.message}`);
    }

    return (data || []).map(this.mapSupabaseRowToRide);
  }

  /**
   * Delete a ride from Supabase
   */
  async deleteRide(rideId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', rideId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete ride: ${error.message}`);
    }
  }

  /**
   * Delete multiple rides from Supabase
   */
  async deleteRides(rideIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('rides')
      .delete()
      .in('id', rideIds)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete rides: ${error.message}`);
    }
  }

  /**
   * Update ride AI summary in Supabase
   */
  async updateRideAISummary(rideId: string, aiSummary: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('rides')
      .update({ ai_summary: aiSummary })
      .eq('id', rideId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to update ride AI summary: ${error.message}`);
    }
  }

  /**
   * Check if a ride exists in Supabase
   */
  async rideExists(rideId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('rides')
      .select('id')
      .eq('id', rideId)
      .eq('user_id', user.id)
      .single();

    return !error && !!data;
  }

  /**
   * Get total ride statistics from Supabase
   */
  async getRideStats(): Promise<{
    totalRides: number;
    totalDistance: number;
    totalDuration: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('rides')
      .select('distance, duration')
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to get ride stats: ${error.message}`);
    }

    const stats = (data || []).reduce(
      (acc, ride) => ({
        totalRides: acc.totalRides + 1,
        totalDistance: acc.totalDistance + ride.distance,
        totalDuration: acc.totalDuration + ride.duration,
      }),
      { totalRides: 0, totalDistance: 0, totalDuration: 0 }
    );

    return stats;
  }

  /**
   * Map Supabase row to RideRecord
   */
  private mapSupabaseRowToRide(row: SupabaseRideRow): RideRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      distance: row.distance,
      duration: row.duration,
      averageSpeed: row.average_speed,
      maxSpeed: row.max_speed || undefined,
      routePoints: row.route_points || undefined,
      aiSummary: row.ai_summary || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const supabaseRidesService = new SupabaseRidesService(); 