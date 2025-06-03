# Cyclora - Cycling Tracking App

A modern React Native cycling tracking application built with Expo, featuring GPS-based ride tracking, local data storage, and AI-powered ride summaries.

## Features

### 🚴‍♀️ Core Functionality
- **GPS Ride Tracking**: Real-time tracking of cycling rides with distance, duration, and speed metrics
- **Energy-Efficient Location Services**: Optimized GPS settings to preserve battery life
- **Offline-First Storage**: Local SQLite database for reliable data persistence
- **AI-Powered Summaries**: Automatic generation of encouraging ride summaries using OpenAI

### 📱 User Experience
- **Modern UI/UX**: Clean, responsive design with dark mode support
- **Real-Time Stats**: Live display of current speed, distance, and duration
- **Ride History**: Comprehensive view of past rides with detailed statistics
- **Smart Notifications**: Toast notifications for ride events and system messages

### 🛠️ Technical Features
- **Cross-Platform**: Runs on iOS, Android, and Web
- **TypeScript**: Full type safety throughout the application
- **State Management**: Zustand for efficient global state management
- **Data Fetching**: TanStack React Query for optimized API calls
- **Styling**: NativeWind (Tailwind CSS) for consistent design

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Database**: Expo SQLite
- **Location Services**: Expo Location
- **AI Integration**: OpenAI API
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cyclora
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Configuration

### AI Summaries (Optional)
To enable AI-powered ride summaries, you'll need to configure an OpenAI API key:

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. In the app, the AI service will use mock summaries by default
3. To use real AI summaries, you can set the API key in the `aiSummaryService.setApiKey()` method

### Location Permissions
The app requires location permissions to track rides:
- **iOS**: Location permissions are requested automatically
- **Android**: Location permissions are requested automatically
- **Background Location**: Optional for continued tracking when app is backgrounded

## Project Structure

```
cyclora/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Ride tracking screen
│   │   └── explore.tsx    # Ride history screen
│   └── _layout.tsx        # Root layout with providers
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── RideTracker.tsx   # Main ride tracking component
│   └── RideHistory.tsx   # Ride history component
├── hooks/                # Custom React hooks
│   └── useAppStore.ts    # Zustand store
├── services/             # Business logic services
│   ├── rideTracker.ts    # GPS tracking service
│   ├── rideStorage.ts    # SQLite storage service
│   └── aiSummary.ts      # AI summary service
├── types/                # TypeScript type definitions
│   └── ride.ts           # Ride-related types
└── constants/            # App constants
```

## Key Components

### RideTracker
The main tracking interface that displays:
- Real-time ride statistics
- Start/Stop ride controls
- GPS status indicator
- Large, easy-to-read metrics display

### RideHistory
Displays past rides with:
- Chronological list of completed rides
- Summary statistics (total rides, distance, average speed)
- AI-generated ride summaries
- Delete functionality (long press)

### Services

#### RideTrackerService
- Manages GPS location tracking
- Calculates distance using Haversine formula
- Provides real-time speed and duration updates
- Handles location permissions

#### RideStorageService
- SQLite database operations
- CRUD operations for ride records
- Data persistence and retrieval
- Statistics calculations

#### AISummaryService
- OpenAI API integration
- Offline queue for failed requests
- Fallback to mock summaries
- Encouraging, coach-like messaging

## Development

### Code Style
- ESLint and Prettier configured
- TypeScript strict mode enabled
- Functional components with hooks
- Consistent naming conventions

### Testing
```bash
npm run lint
```

### Building for Production
```bash
# Build for all platforms
expo build

# Platform-specific builds
expo build:ios
expo build:android
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Expo](https://expo.dev/)
- UI components inspired by modern fitness apps
- Location tracking optimized for cycling use cases
- AI summaries powered by OpenAI
