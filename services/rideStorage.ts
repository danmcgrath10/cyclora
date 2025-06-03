import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { LocationPoint, RideRecord } from '../types/ride';

interface RideRow {
  id: string;
  timestamp: string;
  distance: number;
  duration: number;
  averageSpeed: number;
  maxSpeed: number | null;
  routePoints: string | null; // JSON string of LocationPoint[]
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StatsRow {
  totalRides: number;
  totalDistance: number;
  totalDuration: number;
}

class RideStorageService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('cyclora_rides.db');
      
      // Create the rides table if it doesn't exist
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS rides (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          distance REAL NOT NULL,
          duration INTEGER NOT NULL,
          averageSpeed REAL NOT NULL,
          maxSpeed REAL,
          routePoints TEXT,
          aiSummary TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_rides_timestamp ON rides(timestamp);
        CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(createdAt);
      `);

      // Add new columns if they don't exist (for database migration)
      try {
        await this.db.execAsync(`ALTER TABLE rides ADD COLUMN maxSpeed REAL;`);
      } catch (error) {
        // Column probably already exists
      }
      
      try {
        await this.db.execAsync(`ALTER TABLE rides ADD COLUMN routePoints TEXT;`);
      } catch (error) {
        // Column probably already exists
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async ensureDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    return this.db!;
  }

  async saveRide(rideData: Omit<RideRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = await this.ensureDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      // Serialize route points to JSON
      const routePointsJson = rideData.routePoints ? JSON.stringify(rideData.routePoints) : null;
      
      await db.runAsync(
        `INSERT INTO rides (id, timestamp, distance, duration, averageSpeed, maxSpeed, routePoints, aiSummary, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          rideData.timestamp, 
          rideData.distance, 
          rideData.duration, 
          rideData.averageSpeed, 
          rideData.maxSpeed || null,
          routePointsJson,
          rideData.aiSummary || null, 
          now, 
          now
        ]
      );
      
      return id;
    } catch (error) {
      console.error('Failed to save ride:', error);
      throw error;
    }
  }

  async getAllRides(): Promise<RideRecord[]> {
    const db = await this.ensureDatabase();
    
    try {
      const result = await db.getAllAsync(`
        SELECT * FROM rides 
        ORDER BY timestamp DESC
      `) as RideRow[];
      
      return result.map(row => {
        let routePoints: LocationPoint[] | undefined;
        
        // Parse route points from JSON
        if (row.routePoints) {
          try {
            routePoints = JSON.parse(row.routePoints);
          } catch (error) {
            console.warn('Failed to parse route points for ride:', row.id);
            routePoints = undefined;
          }
        }
        
        return {
          id: row.id,
          timestamp: row.timestamp,
          distance: row.distance,
          duration: row.duration,
          averageSpeed: row.averageSpeed,
          maxSpeed: row.maxSpeed || undefined,
          routePoints,
          aiSummary: row.aiSummary || undefined,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        };
      });
    } catch (error) {
      console.error('Failed to get rides:', error);
      throw error;
    }
  }

  async getRide(id: string): Promise<RideRecord | null> {
    const db = await this.ensureDatabase();
    
    try {
      const result = await db.getFirstAsync(
        'SELECT * FROM rides WHERE id = ?',
        [id]
      ) as RideRow | null;
      
      if (!result) return null;
      
      let routePoints: LocationPoint[] | undefined;
      
      // Parse route points from JSON
      if (result.routePoints) {
        try {
          routePoints = JSON.parse(result.routePoints);
        } catch (error) {
          console.warn('Failed to parse route points for ride:', result.id);
          routePoints = undefined;
        }
      }
      
      return {
        id: result.id,
        timestamp: result.timestamp,
        distance: result.distance,
        duration: result.duration,
        averageSpeed: result.averageSpeed,
        maxSpeed: result.maxSpeed || undefined,
        routePoints,
        aiSummary: result.aiSummary || undefined,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      };
    } catch (error) {
      console.error('Failed to get ride:', error);
      throw error;
    }
  }

  async updateRideAISummary(id: string, aiSummary: string): Promise<void> {
    const db = await this.ensureDatabase();
    const now = new Date().toISOString();
    
    try {
      await db.runAsync(
        'UPDATE rides SET aiSummary = ?, updatedAt = ? WHERE id = ?',
        [aiSummary, now, id]
      );
    } catch (error) {
      console.error('Failed to update ride AI summary:', error);
      throw error;
    }
  }

  async deleteRide(id: string): Promise<void> {
    const db = await this.ensureDatabase();
    
    try {
      await db.runAsync('DELETE FROM rides WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete ride:', error);
      throw error;
    }
  }

  async getRideStats(): Promise<{ totalRides: number; totalDistance: number; totalDuration: number }> {
    const db = await this.ensureDatabase();
    
    try {
      const result = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as totalRides,
          COALESCE(SUM(distance), 0) as totalDistance,
          COALESCE(SUM(duration), 0) as totalDuration
        FROM rides
      `) as StatsRow | null;
      
      return {
        totalRides: result?.totalRides || 0,
        totalDistance: result?.totalDistance || 0,
        totalDuration: result?.totalDuration || 0,
      };
    } catch (error) {
      console.error('Failed to get ride stats:', error);
      throw error;
    }
  }
}

export const rideStorageService = new RideStorageService(); 