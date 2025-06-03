-- Update rides table to match local schema with route points and pagination support
-- Run this in your Supabase SQL Editor

-- Drop existing table if it exists (WARNING: This will delete existing data)
DROP TABLE IF EXISTS public.rides;

-- Create rides table with full schema
CREATE TABLE public.rides (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  timestamp TEXT NOT NULL,
  distance REAL NOT NULL,
  duration INTEGER NOT NULL,
  average_speed REAL NOT NULL,
  max_speed REAL,
  route_points JSONB, -- Store GPS route as JSON
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying and pagination
CREATE INDEX idx_rides_user_timestamp ON public.rides(user_id, timestamp DESC);
CREATE INDEX idx_rides_user_created_at ON public.rides(user_id, created_at DESC);
CREATE INDEX idx_rides_timestamp ON public.rides(timestamp DESC);

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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_rides_updated_at 
    BEFORE UPDATE ON public.rides 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.rides IS 'Stores user cycling ride data with GPS routes and statistics'; 