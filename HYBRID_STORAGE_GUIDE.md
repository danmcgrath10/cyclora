# Hybrid Storage System Guide

## Overview

The Cyclora app implements a sophisticated hybrid storage system that automatically manages ride data between local device storage and Supabase cloud storage. This system optimizes for both performance and storage efficiency by keeping recent rides locally while archiving older rides to the cloud.

## How It Works

### 🕐 **24-Hour Rule**
- **Recent rides** (within last 24 hours) = Stored locally for fast access
- **Older rides** (24+ hours old) = Automatically migrated to Supabase cloud
- **Seamless access** = App combines both sources transparently

### 📱 **Storage Locations**
1. **Local Storage (SQLite)**: Recent rides for instant access
2. **Supabase Cloud**: Archive of older rides with pagination
3. **Hybrid Interface**: Unified access to both sources

## Setup Instructions

### Step 1: Run Database Migration

Execute the SQL migration in your Supabase Dashboard:

```bash
# Navigate to your Supabase project
# Go to SQL Editor
# Run the migration from sql/rides_table_migration.sql
```

### Step 2: Verify Environment Variables

Ensure your `.env.local` has the required Supabase configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 3: Initialize the System

The hybrid storage system automatically initializes when the app loads. You'll see migration happening in the console:

```
Migrating 5 old rides to Supabase...
Successfully migrated 5 rides to Supabase
```

## Features

### ✅ **Automatic Migration**
- Runs every time a new ride is saved
- Happens in the background (non-blocking)
- Only migrates rides older than 24 hours
- Safely handles migration failures

### ✅ **Pagination Support**
- Loads recent rides instantly from local storage
- Paginates through older rides from Supabase
- "Load More" button for seamless browsing
- Efficient cursor-based pagination

### ✅ **Smart Deletion**
- Checks both local and remote storage
- Removes rides from appropriate location
- Handles cases where ride exists in both places

### ✅ **Unified Statistics**
- Combines local and remote ride stats
- Real-time counts displayed in UI
- Graceful fallback if cloud is unavailable

### ✅ **Force Sync**
- Manual sync button for immediate migration
- Uploads all local rides to cloud
- Keeps only recent rides locally
- Progress indication during sync

## User Interface

### 🏷️ **Visual Indicators**
Each ride card shows its storage location:
- **📱 Local** = Green badge for recent rides
- **☁️ Cloud** = Blue badge for archived rides

### 📊 **Storage Summary**
Header displays:
- Local ride count
- Cloud ride count  
- Total ride count across both sources

### 🔄 **Sync Controls**
- **Force Sync** button to manually migrate all rides
- **Load More** button to fetch additional cloud rides
- Loading indicators for all async operations

## API Reference

### HybridRideStorageService

```typescript
// Initialize the system
await hybridRideStorageService.initialize();

// Save a new ride (always local first)
const rideId = await hybridRideStorageService.saveRide(rideData);

// Get paginated rides (local + remote)
const hybridData = await hybridRideStorageService.getPaginatedRides(cursor);

// Force migrate all rides to cloud
await hybridRideStorageService.forceFullMigration();

// Get migration status
const { isMigrating } = hybridRideStorageService.getMigrationStatus();

// Check data integrity
const integrity = await hybridRideStorageService.checkDataIntegrity();
```

### App Store Selectors

```typescript
// Get all rides (local + remote combined)
const allRides = useRideHistory();

// Get specific storage types
const localRides = useLocalRides();
const remoteRides = useRemoteRides();

// Pagination state
const hasMore = useHasMoreRides();
const isLoadingMore = useIsLoadingMore();
const totalCount = useTotalRideCount();

// Actions
const { loadRideHistory, loadMoreRides, forceSync } = useAppStore();
```

## Data Flow

### 🚴 **New Ride Saved**
1. Ride data saved to local SQLite database
2. Background migration check scheduled (5 seconds later)
3. Old rides (24+ hours) automatically migrated to Supabase
4. Local storage cleaned up after successful upload

### 📱 **App Launch**
1. Hybrid storage system initializes
2. Recent rides loaded from local storage
3. First page of older rides loaded from Supabase
4. Background migration of any old local rides

### 📜 **Browsing History**
1. Recent rides display instantly (local)
2. Older rides display from Supabase (paginated)
3. "Load More" fetches additional pages
4. Seamless scrolling experience

### 🗑️ **Deleting Rides**
1. Check local storage first
2. If not found, check Supabase
3. Remove from whichever location contains the ride
4. Update UI immediately

## Performance Benefits

### ⚡ **Fast Access**
- Recent rides load instantly from local storage
- No network dependency for recent data
- Optimized for daily usage patterns

### 💾 **Storage Efficiency**
- Local storage kept minimal (only recent rides)
- Unlimited cloud storage for historical data
- Automatic cleanup prevents storage bloat

### 🌐 **Network Optimization**
- Minimal API calls for recent rides
- Paginated loading reduces bandwidth
- Background uploads don't block UI

## Troubleshooting

### Migration Issues
```typescript
// Check migration status
const { isMigrating } = hybridRideStorageService.getMigrationStatus();

// Check data integrity
const integrity = await hybridRideStorageService.checkDataIntegrity();
console.log(`Local: ${integrity.localCount}, Remote: ${integrity.remoteCount}`);
```

### Force Sync Issues
- Ensure user is authenticated with Supabase
- Check internet connectivity
- Verify Supabase permissions and RLS policies

### Missing Rides
- Recent rides should be in local storage
- Older rides should be in Supabase
- Use data integrity check to verify counts

## Security & Privacy

### 🔒 **Row Level Security**
- All Supabase rides are user-scoped
- Users can only access their own data
- Automatic user_id association on upload

### 🛡️ **Data Protection**
- Local SQLite database secured by OS
- HTTPS encryption for all Supabase communication
- No data shared between users

### 🔐 **Authentication**
- All cloud operations require valid auth session
- Graceful degradation if authentication fails
- Local storage continues working offline

## Monitoring

### Console Logs
```
Migrating 3 old rides to Supabase...
Successfully migrated 3 rides to Supabase
```

### Error Handling
```
Failed to migrate old rides: Network error
(App continues working with local storage only)
```

The hybrid storage system is designed to be resilient and fail gracefully. If cloud operations fail, the app continues working with local storage until connectivity is restored. 