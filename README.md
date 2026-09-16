# TreadPeak

A walking-focused fitness app that tracks your daily steps and walks automatically. See how much you move every day, record GPS-tracked walks with live maps, and keep a persistent history of every walk.

## Features

- **Daily activity dashboard** — steps, distance, and calories for the day, pulled from Apple HealthKit (iOS) / Health Connect (Android) with a hardware pedometer fallback
- **Live walk tracking** — real-time map with a GPS breadcrumb trail, distance computed with the haversine formula, and manual start/stop controls
- **Automatic walk detection** — GPS speed heuristics (0.5–2.8 m/s) detect when you start and stop walking, distinguishing walks from driving or cycling
- **Walk history** — every completed walk is saved locally with duration, distance, steps, calories, and route; past 30 days of HealthKit walking workouts are imported and deduplicated against GPS-tracked walks
- **Profile stats** — weekly and daily aggregates of your activity
- **Dark mode** — follows your device's system color scheme

## Tech Stack

- [React Native](https://reactnative.dev) 0.86 + [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) (managed workflow, EAS Build)
- [Expo Router](https://docs.expo.dev/router/introduction/) — file-based routing with drawer + tab navigation
- TypeScript (strict mode)
- [NativeWind](https://www.nativewind.dev) — Tailwind CSS styling
- [Zustand](https://zustand.docs.pmnd.rs) + AsyncStorage — persisted walk history
- [TanStack Query](https://tanstack.com/query) — server state with focus/online refetching
- [react-native-maps](https://github.com/react-native-maps/react-native-maps) — live map and route tracing
- `expo-sensors` — hardware pedometer
- `expo-location` — GPS tracking and permissions
- `expo-healthkit-module` — Apple HealthKit / Health Connect integration

## Getting Started

### Prerequisites

- Node.js
- Xcode (iOS) and/or Android Studio (Android)
- An Expo account for EAS builds

### Install & Run

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the development server

   ```bash
   npx expo start
   ```

   From the terminal you can open the app in a development build, the iOS simulator, or the Android emulator.

### HealthKit Requires a Development Build

HealthKit integration uses a custom native module (`expo-healthkit-module`), so it **does not work in Expo Go**. Build and run a development client:

```bash
eas build --profile development
```

or run locally on a simulator:

```bash
npx expo run:ios
npx expo run:android
```

The HealthKit entitlement and usage descriptions are already configured in `app.json`. On your first launch, approve HealthKit and location access when prompted.

### Build Profiles

| Profile     | Command                           | Description                                   |
| ----------- | --------------------------------- | --------------------------------------------- |
| Development | `eas build --profile development` | Dev client with live reload                   |
| Preview     | `eas build --profile preview`     | Internal distribution build                   |
| Production  | `eas build --profile production`  | Release build with auto-incrementing versions |

## Project Structure

```
src/
├── app/                # Expo Router routes (file-based routing)
│   ├── (tabs)/         # Home, Search, Profile tabs
│   │   └── home/       # Daily stats + live walk map
│   ├── history/        # Walk history list + detail screens
│   └── settings/
├── components/         # Shared UI (map, drawer, header)
├── hooks/              # use-location, use-pedometer, use-healthkit
├── lib/                # walk-store (Zustand), utilities
└── theme/              # Color tokens
```
