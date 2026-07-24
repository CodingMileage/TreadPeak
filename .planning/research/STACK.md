# Technology Stack

**Project:** TreadPeak
**Researched:** 2026-07-24
**Mode:** Ecosystem survey
**Overall confidence:** HIGH

## Executive Summary

TreadPeak needs a backend platform that handles relational data (leaderboards by location, friend graphs, food diaries), user auth with native OAuth, and real-time updates for leaderboards — all within a tight budget. **Supabase** is the clear winner here: PostgreSQL gives us proper SQL joins for leaderboard queries, its Auth module provides native Google/Apple OAuth (critical for mobile UX), and its real-time subscriptions enable live leaderboard updates. Firebase loses because its NoSQL model makes geo-filtered leaderboard queries painful without heavy denormalization, and its pricing becomes expensive at scale. Clerk loses because its pre-built UI components don't work on React Native, so you pay a premium for a web-only feature that's irrelevant on mobile.

For health data, the ecosystem has matured significantly in 2025-2026. The best approach is **platform-specific libraries**: `apple-health` (iOS) and `react-native-health-connect` via `expo-health-connect` (Android). Unified SDKs like `@robinhealth/health-sdk` and `@tryvital/vital-health-react-native` exist but add unnecessary abstraction layers for a walking-only MVP that only needs step count.

For barcode scanning, `expo-camera` with its built-in `onBarCodeScanned` prop has fully replaced the deprecated `expo-barcode-scanner`. Open Food Facts remains the right choice for food data — it's free, unauthenticated for reads, and has a solid barcode database.

## Recommended Stack

### Core Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | Pro plan ($25/mo) | Backend platform: PostgreSQL DB, Auth, real-time, storage | Relational data for leaderboards/friends/food diary; built-in Auth with native OAuth; RLS for security; 100k MAU included; open source |

### Database (Supabase PostgreSQL)

| Feature | Purpose | Detail |
|---------|---------|--------|
| `profiles` table | User profiles linked to auth.users | id, display_name, avatar_url, location_preference |
| `daily_steps` table | Step records per user per day | user_id, date, steps, updated_at (upsert by user+date) |
| `food_entries` table | Food diary entries | user_id, date, meal_type, food_name, calories, macros, barcode |
| `leaderboard_snapshots` table | Daily/weekly leaderboard positions | user_id, date, period_type, steps, rank, location_scope |
| `friendships` table | Friend connections | requester_id, addressee_id, status (pending/accepted) |
| Row-Level Security | Per-row access control | Users read/write own data; leaderboards are public-read |
| Real-time subscriptions | Live leaderboard updates | Subscribe to leaderboard_snapshot changes |
| pg_trgm extension | Text search for username lookup | Efficient `ILIKE` + trigram indexing |

### Auth

| Technology | Purpose | Why |
|------------|---------|-----|
| Supabase Auth | User authentication | Native Google & Apple OAuth on mobile; PKCE flow for secure redirects; RLS integration with DB; 100k MAU included on Pro plan |
| `expo-secure-store` | Token storage | Hardware-backed encrypted storage (iOS Keychain, Android Keystore); required for auth token security |
| `expo-linking` | Deep link handling | Handle OAuth redirects and email verification callbacks |

### Health Data (iOS)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `apple-health` | ^0.0.4 | HealthKit step reading | Dedicated Expo module with hooks (useHealthKitStatistics, usePermissions); Expo config plugin included; 70+ quantity types but only stepCount needed for MVP |

### Health Data (Android)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `react-native-health-connect` | ^2.0.0 | Health Connect step reading | Mature library for Health Connect on Android; official Google Health Connect SDK wrapper |
| `expo-health-connect` | ^0.1.1 | Expo config plugin | Wraps react-native-health-connect with an Expo config plugin; auto-configures Android manifest permissions |
| `expo-build-properties` | ~57.0.0 | Android build config | Required to set minSdkVersion 26+, compileSdkVersion 35 |

### Food Logging

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-camera` | ~57.0.0 | Barcode scanning via CameraView | expo-barcode-scanner is deprecated; CameraView's onBarCodeScanned prop handles all food barcode formats (EAN-13, UPC-A, Code 128) |
| Open Food Facts API | N/A (REST) | Food product database | Free, no auth required for reads, no rate limits, solid barcode database; search + barcode endpoints |

### Location

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-location` | ~57.0.0 | GPS + reverse geocoding | `getCurrentPositionAsync` for GPS, `reverseGeocodeAsync` for converting coords to city/zip/state for leaderboard filtering; foreground permission only needed for MVP |

### Social / Contacts

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-contacts` | ~57.0.0 | Contact sync for friend discovery | `Contact.getAllDetails` for efficient bulk contact reading; `Contact.presentPicker` for native picker UX |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | ^5.101.4 (existing) | Server state for all API calls | Already integrated; use for Supabase queries, Open Food Facts, leaderboard data |
| `zustand` | ^5.0.14 (existing) | Client state (auth session, theme) | Already integrated; use for auth state, UI preferences |
| `react-hook-form` + `zod` | existing | Form validation | Already integrated; use for sign-up, food search, settings forms |
| `@supabase/supabase-js` | ^2.x | Supabase client SDK | All DB queries, auth, real-time subscriptions |
| `expo-splash-screen` | existing | Graceful health auth flow | Show splash while checking HealthKit/Health Connect availability |

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| EAS Build | existing | CI/CD for native builds | Already configured; required because HealthKit/Health Connect libraries won't work in Expo Go |
| Supabase Project | N/A | Hosted PostgreSQL + APIs | Managed Postgres, auto-scaling, backups, edge functions for server-side logic if needed later |

## Alternatives Considered

### Backend

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| BaaS | Supabase | Firebase Firestore | NoSQL makes relational queries (leaderboard by location, friend graph traversal) painful; requires heavy denormalization; pricing scales poorly |
| BaaS | Supabase | PocketBase | Less mature real-time; smaller ecosystem for authentication; fewer React Native resources |

### Auth

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth Provider | Supabase Auth | Clerk | Clerk's pre-built UI components don't work on React Native (you build custom UI anyway); 10x higher cost at scale ($800/mo at 50k MAU vs $25/mo); no native OAuth (webview only); no RLS integration |
| Auth Provider | Supabase Auth | Auth0 | Higher complexity; overkill for MVP; significantly more expensive; harder Supabase integration |

### Health (iOS)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| HealthKit | `apple-health` | `react-native-health` (AE Studio) | `apple-health` is a dedicated Expo module with React hooks, simpler API surface for step-only needs; `react-native-health` is more mature but has larger API surface |
| HealthKit | `apple-health` | `@kingstinct/react-native-healthkit` | Mature but larger scope; `apple-health` is simpler for step-only MVP |
| HealthKit | `apple-health` | `expo-health-kit` | v1.0.8 is a year old with less active maintenance; `apple-health` has more recent releases |

### Health (Android)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Health Connect | `react-native-health-connect` + `expo-health-connect` | `expo-healthkit-module` | `expo-healthkit-module` is maintained by the same author as `expo-health-kit` with less frequent updates; separate libraries per platform are more reliable |

### Unified Health SDKs

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Cross-platform health | Separate per-platform | `@robinhealth/health-sdk` | Adds dependency on `@kingstinct/react-native-healthkit` + `react-native-health-connect` + `expo-sqlite`; unnecessary abstraction for walking-only MVP |
| Cross-platform health | Separate per-platform | `@tryvital/vital-health-react-native` | Requires Vital platform account (third-party dependency); adds monthly cost-tier; overkill for simple step reading |

### Barcode Scanning

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Barcode | `expo-camera` CameraView | `expo-barcode-scanner` | Deprecated and will be removed in a future SDK version |
| Barcode | `expo-camera` CameraView | `react-native-camera` | Not needed; expo-camera handles all required barcode formats (EAN-13, UPC-A, Code 128 for food products) |

### Location

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Geolocation | `expo-location` | `@react-native-community/geolocation` | expo-location is the Expo-native solution; includes reverse geocoding built-in without extra dependencies |

## Installation

```bash
# Supabase
npx expo install @supabase/supabase-js expo-secure-store expo-linking

# HealthKit (iOS) and Health Connect (Android)
npx expo install expo-health-connect expo-build-properties
npm install react-native-health-connect apple-health

# Barcode scanning
npx expo install expo-camera

# Contacts
npx expo install expo-contacts

# Dev dependencies
npm install -D @types/react-native-health-connect
```

### app.json Plugin Configuration

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "android": {
          "compileSdkVersion": 35,
          "targetSdkVersion": 35,
          "minSdkVersion": 26,
          "buildToolsVersion": "35.0.0"
        }
      }],
      "expo-health-connect",
      [
        "apple-health",
        {
          "healthSharePermission": "TreadPeak reads your step count to show walking progress and leaderboards.",
          "healthUpdatePermission": "TreadPeak does not write health data."
        }
      ],
      [
        "expo-contacts",
        {
          "contactsPermission": "TreadPeak uses your contacts to help find friends on the app."
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "TreadPeak uses your location to filter leaderboards by your area."
        }
      ]
    ]
  }
}
```

## Key Architectural Decisions

1. **Supabase Auth over Clerk because:** Clerk's core value (pre-built UI) is irrelevant on React Native; Supabase Auth provides native OAuth, RLS integration, and is 10x cheaper.

2. **Platform-specific health libraries over unified SDK because:** Walking-only MVP needs only step count; separate `apple-health` + `react-native-health-connect` is simpler to debug and has fewer dependency chains than `@robinhealth/health-sdk` or `@tryvital/vital-health-react-native`.

3. **Direct Open Food Facts API calls over proxy because:** Open Food Facts requires no auth for read operations; calling it directly from the client (via TanStack React Query) avoids an unnecessary backend proxy layer. Save the proxy for post-MVP if rate limiting becomes an issue.

4. **Foreground-only location over background because:** Leaderboard filtering is user-initiated (user selects "show leaderboard near me") — no need for continuous background location tracking, which simplifies both permissions and App Store review.

5. **expo-secure-store over AsyncStorage for tokens because:** AsyncStorage is unencrypted and vulnerable to data dumps on rooted/jailbroken devices. SecureStore uses iOS Keychain + Android Keystore hardware-backed encryption.

## Sources

- Supabase pricing and Auth capabilities: supabase.com/pricing, supabase.com/docs/guides/auth/native-mobile-deep-linking
- Clerk vs Supabase Auth: community discussions on answeroverflow.com, clerk.com blog
- apple-health: reactnative.directory/package/apple-health, npmjs.com/package/apple-health
- expo-health-connect: reactnative.directory/package/expo-health-connect, npmjs.com/package/expo-health-connect
- expo-camera barcode scanning: docs.expo.dev/versions/v57.0.0/sdk/camera/
- expo-barcode-scanner deprecation: expo.fyi/barcode-scanner-to-expo-camera
- expo-location reverse geocoding: docs.expo.dev/versions/v57.0.0/sdk/location/
- expo-secure-store: docs.expo.dev/versions/v57.0.0/sdk/securestore/
- expo-contacts: docs.expo.dev/versions/v57.0.0/sdk/contacts/
- Open Food Facts API: openfoodfacts.github.io/documentation/
- Expo SDK 57 changelog: expo.dev/changelog/sdk-57
