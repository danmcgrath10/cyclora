# Supabase Integration Setup

## Environment Variables

Create a `.env.local` file in the root directory and add the following environment variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Getting Your Supabase Keys

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the following values:
   - **Project URL** → Use for `EXPO_PUBLIC_SUPABASE_URL`
   - **Project API Key** (anon/public) → Use for `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Example Configuration

```env
EXPO_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZmFzZGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0OTM4NzIwMywiZXhwIjoxOTY0OTYzMjAzfQ.Hmac_secret_key
```

## Database Setup

### Create the Profiles Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  website TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### Optional: Create Rides Table for Cloud Sync

If you want to sync ride data to the cloud, add this table:

```sql
-- Create rides table for cloud storage
CREATE TABLE public.rides (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  distance FLOAT NOT NULL,
  duration INTEGER NOT NULL,
  average_speed FLOAT NOT NULL,
  timestamp TEXT NOT NULL,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Create policies for rides
CREATE POLICY "Users can view their own rides."
  ON public.rides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rides."
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rides."
  ON public.rides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rides."
  ON public.rides FOR DELETE
  USING (auth.uid() = user_id);
```

## Features Included

✅ **Secure Authentication Gate**
- **Entire app is locked behind authentication** - users must sign in to access any features
- Email/password sign up and sign in
- Session management with automatic refresh
- Automatic routing between auth and main app

✅ **User Profiles**
- Profile creation and editing
- Username and website fields
- Avatar image upload to Supabase Storage

✅ **Enhanced User Experience**
- User identification shown in Ride Tracker and History screens
- Personal data security indicators
- Seamless authentication flow

✅ **Cloud Sync Ready**
- `useSupabaseSync` hook ready for cloud synchronization
- Prepared for multi-device ride history sync

## Authentication Flow

🔒 **App is Completely Locked Behind Authentication**

1. **First Launch**: Users see the sign-in/sign-up screen
2. **Authentication Required**: No access to ride tracking or history without signing in
3. **Automatic Routing**: 
   - Unauthenticated users → Auth screens
   - Authenticated users → Main app with tabs
4. **Session Persistence**: Users stay logged in between app launches
5. **Sign Out**: Available from Profile tab, returns to auth screen

## Usage

### Authentication State Management

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, session, isAuthenticated, loading } = useAuth();
  
  // The app handles routing automatically, but you can check auth state
  if (loading) return <LoadingSpinner />;
  
  // In the main app, users are guaranteed to be authenticated
  return <AuthenticatedContent user={user} />;
}
```

### Cloud Sync (Optional)

```typescript
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { useRideHistory } from '@/hooks/useAppStore';

function SyncExample() {
  const { syncRideData, isSyncing } = useSupabaseSync();
  const rideHistory = useRideHistory();

  const handleSync = async () => {
    await syncRideData(rideHistory);
  };

  return (
    <Button onPress={handleSync} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
    </Button>
  );
}
```

## Navigation Structure

```
App (Protected by AuthProvider)
├── (auth) - Authentication screens
│   ├── login - Combined sign-in/sign-up form
│   └── profile - Dedicated profile screen
└── (tabs) - Main app (requires authentication)
    ├── index (Ride Tracker) - Shows user email
    ├── explore (History) - Shows personal data indicator  
    └── profile - Account management & sign out
```

## Security Features

🔐 **Complete App Protection**
- Zero access to app features without authentication
- Automatic session validation on app start
- Secure routing between auth and main app
- User data scoped to authenticated user only

🔒 **Data Security**
- Row Level Security on all database tables
- User-specific data isolation
- Secure file uploads to Supabase Storage
- Session-based access control

## User Experience

### Visual Indicators
- **Ride Tracker**: Shows "Signed in as [username]" with green dot
- **History**: Shows "Your personal ride history • [username]" with blue dot
- **Profile**: Full account management with avatar upload

### Seamless Flow
- Users authenticate once and stay logged in
- Background session refresh keeps users connected
- Clear sign-out process when needed
- No access to sensitive features without authentication

## Troubleshooting

1. **Can't access app features**: Ensure you're signed in - the entire app requires authentication
2. **Stuck on loading screen**: Check your environment variables are correctly set
3. **Authentication errors**: Verify your Supabase keys and database setup
4. **Profile pictures not loading**: Ensure the `avatars` storage bucket exists

## Migration Notes

If you're updating from the previous version:
- The Profile tab now only shows account management (no auth form)
- All app features are locked behind authentication
- Users will need to sign in again after the update
- Local ride data remains intact and secure per user session 