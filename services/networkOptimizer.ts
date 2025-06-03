import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { RideRecord } from '../types/ride';

export enum NetworkMode {
  WIFI_ONLY = 'wifi_only',           // Only upload on WiFi
  CELLULAR_ALLOWED = 'cellular_allowed', // Allow cellular uploads
  OFFLINE_ONLY = 'offline_only'      // No network usage
}

interface NetworkSettings {
  allowCellular: boolean;
  allowBackgroundSync: boolean;
  compressionLevel: 'none' | 'light' | 'aggressive';
  maxRetries: number;
  batchSize: number;
}

const NETWORK_MODE_SETTINGS: Record<NetworkMode, NetworkSettings> = {
  [NetworkMode.WIFI_ONLY]: {
    allowCellular: false,
    allowBackgroundSync: true,
    compressionLevel: 'light',
    maxRetries: 3,
    batchSize: 10,
  },
  [NetworkMode.CELLULAR_ALLOWED]: {
    allowCellular: true,
    allowBackgroundSync: false,
    compressionLevel: 'aggressive',
    maxRetries: 2,
    batchSize: 5,
  },
  [NetworkMode.OFFLINE_ONLY]: {
    allowCellular: false,
    allowBackgroundSync: false,
    compressionLevel: 'none',
    maxRetries: 0,
    batchSize: 0,
  },
};

interface QueuedUpload {
  id: string;
  data: any;
  endpoint: string;
  priority: 'low' | 'medium' | 'high';
  attempts: number;
  timestamp: number;
  size: number;
}

interface NetworkStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  dataTransferred: number; // bytes
  wifiUploads: number;
  cellularUploads: number;
}

class NetworkOptimizerService {
  private currentMode: NetworkMode = NetworkMode.WIFI_ONLY;
  private isConnected: boolean = false;
  private connectionType: string = 'unknown';
  private uploadQueue: QueuedUpload[] = [];
  private isProcessingQueue: boolean = false;
  private netInfoUnsubscribe: (() => void) | null = null;
  private stats: NetworkStats = {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    dataTransferred: 0,
    wifiUploads: 0,
    cellularUploads: 0,
  };
  
  private callbacks: {
    onNetworkChange?: (connected: boolean, type: string) => void;
    onQueueChange?: (queueSize: number) => void;
    onUploadComplete?: (success: boolean, data: any) => void;
    onModeChange?: (mode: NetworkMode) => void;
  } = {};

  /**
   * Initialize network optimization
   */
  async initialize(): Promise<void> {
    // Subscribe to network state changes
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleNetworkStateChange.bind(this));
    
    // Get initial network state
    const netInfoState = await NetInfo.fetch();
    this.handleNetworkStateChange(netInfoState);
    
    console.log('Network optimizer initialized');
  }

  /**
   * Cleanup network optimization
   */
  cleanup(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  /**
   * Set network mode
   */
  setNetworkMode(mode: NetworkMode): void {
    this.currentMode = mode;
    this.callbacks.onModeChange?.(mode);
    
    // Process queue if network conditions are now favorable
    if (this.shouldProcessQueue()) {
      this.processUploadQueue();
    }
  }

  /**
   * Get current network mode
   */
  getNetworkMode(): NetworkMode {
    return this.currentMode;
  }

  /**
   * Queue data for upload
   */
  queueUpload(
    data: any, 
    endpoint: string, 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): string {
    const compressed = this.compressData(data);
    const upload: QueuedUpload = {
      id: Crypto.randomUUID(),
      data: compressed.data,
      endpoint,
      priority,
      attempts: 0,
      timestamp: Date.now(),
      size: compressed.size,
    };

    // Insert based on priority
    const insertIndex = this.getInsertIndex(priority);
    this.uploadQueue.splice(insertIndex, 0, upload);
    
    this.callbacks.onQueueChange?.(this.uploadQueue.length);
    
    // Try to process queue if conditions are favorable
    if (this.shouldProcessQueue()) {
      this.processUploadQueue();
    }
    
    return upload.id;
  }

  /**
   * Queue ride data for upload with smart compression
   */
  queueRideUpload(ride: RideRecord, priority: 'low' | 'medium' | 'high' = 'low'): string {
    // Remove heavy data that can be regenerated
    const lightRide = {
      id: ride.id,
      timestamp: ride.timestamp,
      distance: ride.distance,
      duration: ride.duration,
      averageSpeed: ride.averageSpeed,
      // Don't include full GPS track unless necessary
      summary: ride.aiSummary,
    };

    return this.queueUpload(lightRide, '/api/rides', priority);
  }

  /**
   * Force process queue (for user-initiated sync)
   */
  async forceSync(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('No network connection available');
    }
    
    await this.processUploadQueue(true);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    queueSize: number;
    totalSize: number;
    oldestItem: number; // age in ms
    priorityBreakdown: Record<string, number>;
  } {
    const now = Date.now();
    const priorityBreakdown = { low: 0, medium: 0, high: 0 };
    let totalSize = 0;
    let oldestItem = 0;

    this.uploadQueue.forEach(item => {
      priorityBreakdown[item.priority]++;
      totalSize += item.size;
      const age = now - item.timestamp;
      if (age > oldestItem) oldestItem = age;
    });

    return {
      queueSize: this.uploadQueue.length,
      totalSize,
      oldestItem,
      priorityBreakdown,
    };
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): NetworkStats & {
    connectionType: string;
    isConnected: boolean;
    currentMode: NetworkMode;
  } {
    return {
      ...this.stats,
      connectionType: this.connectionType,
      isConnected: this.isConnected,
      currentMode: this.currentMode,
    };
  }

  /**
   * Get network optimization recommendations
   */
  getOptimizationRecommendations(): {
    recommendedMode: NetworkMode;
    queueStatus: string;
    batteryImpact: string;
    suggestions: string[];
  } {
    const queueStats = this.getQueueStats();
    const suggestions: string[] = [];
    
    // Recommend mode based on connection
    let recommendedMode = this.currentMode;
    if (this.connectionType === 'wifi' && this.currentMode === NetworkMode.OFFLINE_ONLY) {
      recommendedMode = NetworkMode.WIFI_ONLY;
      suggestions.push('WiFi detected - consider enabling uploads');
    }
    
    if (queueStats.queueSize > 20) {
      suggestions.push('Large upload queue - consider syncing when on WiFi');
    }
    
    if (queueStats.oldestItem > 24 * 60 * 60 * 1000) { // 24 hours
      suggestions.push('Old data in queue - sync soon to avoid data loss');
    }

    return {
      recommendedMode,
      queueStatus: this.getQueueStatusText(queueStats),
      batteryImpact: this.getBatteryImpactText(),
      suggestions,
    };
  }

  /**
   * Set callbacks for network events
   */
  setCallbacks(callbacks: {
    onNetworkChange?: (connected: boolean, type: string) => void;
    onQueueChange?: (queueSize: number) => void;
    onUploadComplete?: (success: boolean, data: any) => void;
    onModeChange?: (mode: NetworkMode) => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    const wasConnected = this.isConnected;
    const prevType = this.connectionType;
    
    this.isConnected = state.isConnected ?? false;
    this.connectionType = state.type;
    
    if (wasConnected !== this.isConnected || prevType !== this.connectionType) {
      this.callbacks.onNetworkChange?.(this.isConnected, this.connectionType);
      
      console.log(`Network changed: ${prevType} → ${this.connectionType} (${this.isConnected ? 'connected' : 'disconnected'})`);
    }
    
    // Process queue if network became available
    if (!wasConnected && this.isConnected && this.shouldProcessQueue()) {
      this.processUploadQueue();
    }
  }

  /**
   * Check if we should process the upload queue
   */
  private shouldProcessQueue(): boolean {
    if (!this.isConnected || this.isProcessingQueue) return false;
    
    const settings = NETWORK_MODE_SETTINGS[this.currentMode];
    
    if (this.currentMode === NetworkMode.OFFLINE_ONLY) return false;
    if (!settings.allowCellular && this.connectionType === 'cellular') return false;
    
    return this.uploadQueue.length > 0;
  }

  /**
   * Process the upload queue
   */
  private async processUploadQueue(force: boolean = false): Promise<void> {
    if (this.isProcessingQueue && !force) return;
    if (!this.shouldProcessQueue() && !force) return;
    
    this.isProcessingQueue = true;
    const settings = NETWORK_MODE_SETTINGS[this.currentMode];
    
    try {
      const itemsToProcess = Math.min(settings.batchSize, this.uploadQueue.length);
      const batch = this.uploadQueue.splice(0, itemsToProcess);
      
      console.log(`Processing ${batch.length} uploads`);
      
      for (const item of batch) {
        try {
          await this.uploadItem(item);
          this.stats.successfulUploads++;
          this.stats.dataTransferred += item.size;
          
          if (this.connectionType === 'wifi') {
            this.stats.wifiUploads++;
          } else {
            this.stats.cellularUploads++;
          }
          
          this.callbacks.onUploadComplete?.(true, item.data);
        } catch (error) {
          console.error(`Upload failed for ${item.id}:`, error);
          this.stats.failedUploads++;
          
          // Retry logic
          if (item.attempts < settings.maxRetries) {
            item.attempts++;
            this.uploadQueue.push(item); // Re-queue for retry
          }
          
          this.callbacks.onUploadComplete?.(false, item.data);
        }
        
        this.stats.totalUploads++;
      }
      
      this.callbacks.onQueueChange?.(this.uploadQueue.length);
      
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Upload a single item
   */
  private async uploadItem(item: QueuedUpload): Promise<void> {
    // Simulate upload - replace with actual API calls
    const response = await fetch(item.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item.data),
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
  }

  /**
   * Compress data based on current settings
   */
  private compressData(data: any): { data: any; size: number } {
    const settings = NETWORK_MODE_SETTINGS[this.currentMode];
    let processedData = data;
    
    if (settings.compressionLevel === 'light') {
      // Remove non-essential fields
      if (data.positions) {
        processedData = { ...data };
        delete processedData.positions; // Remove detailed GPS track
      }
    } else if (settings.compressionLevel === 'aggressive') {
      // Keep only essential data
      processedData = {
        id: data.id,
        timestamp: data.timestamp,
        distance: data.distance,
        duration: data.duration,
        averageSpeed: data.averageSpeed,
      };
    }
    
    const jsonString = JSON.stringify(processedData);
    return {
      data: processedData,
      size: new Blob([jsonString]).size,
    };
  }

  /**
   * Get insertion index based on priority
   */
  private getInsertIndex(priority: 'low' | 'medium' | 'high'): number {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const targetPriority = priorityOrder[priority];
    
    for (let i = 0; i < this.uploadQueue.length; i++) {
      if (priorityOrder[this.uploadQueue[i].priority] > targetPriority) {
        return i;
      }
    }
    
    return this.uploadQueue.length;
  }

  /**
   * Get queue status text
   */
  private getQueueStatusText(stats: ReturnType<typeof this.getQueueStats>): string {
    if (stats.queueSize === 0) return 'Queue empty';
    if (stats.queueSize < 5) return 'Small queue';
    if (stats.queueSize < 20) return 'Moderate queue';
    return 'Large queue';
  }

  /**
   * Get battery impact text
   */
  private getBatteryImpactText(): string {
    switch (this.currentMode) {
      case NetworkMode.WIFI_ONLY:
        return 'Low - WiFi uploads only';
      case NetworkMode.CELLULAR_ALLOWED:
        return 'Medium - Cellular uploads allowed';
      case NetworkMode.OFFLINE_ONLY:
        return 'Minimal - No network usage';
      default:
        return 'Unknown';
    }
  }
}

export const networkOptimizerService = new NetworkOptimizerService(); 