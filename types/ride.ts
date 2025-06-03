export interface RideRecord {
  id: string; // UUID
  timestamp: string; // ISO timestamp
  distance: number; // Distance in kilometers (float)
  duration: number; // Duration in seconds (integer)
  averageSpeed: number; // Average speed in km/h (float)
  maxSpeed?: number; // Maximum speed in km/h (float)
  routePoints?: LocationPoint[]; // GPS route for map visualization
  aiSummary?: string; // AI-generated summary (optional, added after ride completion)
  createdAt: Date;
  updatedAt: Date;
}

export interface RideTrackingState {
  isTracking: boolean;
  startTime?: Date;
  currentDistance: number;
  currentDuration: number;
  currentSpeed: number;
  averageSpeed: number;
  lastPosition?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export enum RideStatus {
  IDLE = 'idle',
  TRACKING = 'tracking',
  PAUSED = 'paused',
  COMPLETED = 'completed',
} 