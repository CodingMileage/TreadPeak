# Architecture Research

**Domain:** Walking-focused fitness tracking app (steps + food logging + location-filtered leaderboards + friends)
**Researched:** 2026-07-24
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (React Native / Expo)              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │  Step Tracking  │  │  Food Diary    │  │  Social / Leaderboard │   │
│  │  (HealthKit/    │  │  (Offline-     │  │  (React Query +      │   │
│  │   Health Connect│  │   first +      │  │   Location Filters)  │   │
│  │   → useHealth)  │  │   Barcode)     │  │                      │   │
│  └───────┬─────────┘  └───────┬────────┘  └──────────┬───────────┘   │
│          │                    │                       │              │
├──────────┴────────────────────┴───────────────────────┴──────────────┤
│              CLIENT DATA ABSTRACTION LAYER                             │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  React Query (server state cache + persistence via           │   │
│  │  AsyncStorage) + Zustand (ephemeral UI state)                │   │
│  └───────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                    NETWORK LAYER                                       │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│  │  Supabase Client      │  │  Custom API Client               │   │
│  │  (Auth, DB, Realtime) │  │  (Open Food Facts Proxy)          │   │
│  └──────────┬───────────┘  └──────────┬─────────────────────────┘   │
└─────────────┼─────────────────────────┼──────────────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                                  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  PostgreSQL 15 + PostGIS 3.x                                │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │      │
│  │  │  Auth    │  │  Step    │  │  Food    │  │  Social  │   │      │
│  │  │  Service │  │  Logs    │  │  Diary   │  │  Graph   │   │      │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │      │
│  │  ┌──────────┐  ┌──────────────────────────────┐           │      │
│  │  │Location  │  │  Leaderboard Materialized     │           │      │
│  │  │Index     │  │  Views (daily/weekly/global/  │           │      │
│  │  │(PostGIS) │  │  friends/location-filtered)   │           │      │
│  │  └──────────┘  └──────────────────────────────┘           │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  Supabase Edge Functions (Deno/TypeScript)                  │      │
│  │  ┌─────────────────┐  ┌──────────────────┐                 │      │
│  │  │  Open Food      │  │  Contact Sync    │                 │      │
│  │  │  Facts Proxy    │  │  (hash matching) │                 │      │
│  │  └─────────────────┘  └──────────────────┘                 │      │
│  │  ┌─────────────────┐  ┌──────────────────┐                 │      │
│  │  │  Leaderboard    │  │  Geocoding       │                 │      │
│  │  │  Refresh (cron) │  │  (reverse        │                 │      │
│  │  └─────────────────┘  │   geocode user   │                 │      │
│  │                       │   location text) │                 │      │
│  │                       └──────────────────┘                 │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                               │
│                                                                       │
│  ┌──────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Open Food Facts     │  │  Apple HealthKit / Google Health    │  │
│  │  (REST API — text    │  │  Connect (device-native, read-only) │  │
│  │   search + barcode)  │  │                                     │  │
│  └──────────────────────┘  └─────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Health Data Service** | Read daily step counts from HealthKit/Health Connect, aggregate, push to backend | `expo-unified-health` for unified cross-platform API; platform-specific config plugins in app.json |
| **Food Diary** | Log meals via text search or barcode scan; store locally with offline support; display daily totals | React Query mutations with `PersistQueryClientProvider` for offline resilience; local SQLite or AsyncStorage for pending writes |
| **Open Food Facts Proxy** | Proxy search/barcode requests through server-side cache to reduce direct API calls and handle rate limits | Supabase Edge Function with in-memory or KV cache; custom User-Agent required; optional cache warming from JSONL export |
| **Friend Graph** | Manage bidirectional friendships; handle contact sync (hashed phone matching); username/phone search | PostgreSQL `friendships` table; Edge Function for contact hash matching; RLS policies for data isolation |
| **Leaderboard Engine** | Calculate rankings at periodic intervals; support location filters (park/city/zip/state); serve top-N sorted results | PostgreSQL materialized views refreshed by cron Edge Function; PostGIS spatial queries for location filtering |
| **Location Service** | Geocode user-provided location strings into coordinates; reverse-geocode for leaderboard filtering | Edge Function wrapping a geocoding API (Mapbox, Google, or Nominatim); PostGIS `GEOGRAPHY(POINT, 4326)` storage |
| **Auth Service** | User registration, sign-in, session management | Supabase Auth (built-in) with email/password or phone OTP; row-level security policies on all tables |
| **Dashboard Aggregator** | Combine step totals, calorie totals, and leaderboard rank for dashboard view | React Query concurrent queries + client-side merge; or a single Supabase view joining steps + meals + leaderboard |

## Recommended Project Structure

```
src/
├── app/                        # Expo Router file-based routing (existing)
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── home/
│   │   ├── search/
│   │   └── profile/
│   └── settings/
│
├── features/                   # Domain modules (new — primary organizational unit)
│   ├── auth/                   # Auth screens, hooks, API
│   │   ├── api/                # Supabase Auth calls
│   │   ├── hooks/              # useSignIn, useSignUp
│   │   ├── screens/            # LoginScreen, RegisterScreen
│   │   └── schemas/            # Zod validation schemas
│   │
│   ├── steps/                  # Step tracking domain
│   │   ├── api/                # Step API client (push to Supabase)
│   │   ├── hooks/              # useStepData, useDailySteps, useHealthPermissions
│   │   ├── screens/            # StepHistoryScreen
│   │   ├── services/           # HealthKit/Health Connect abstraction
│   │   │   ├── use-health-data.ts    # expo-unified-health wrapper
│   │   │   ├── sync-steps.ts         # Background sync logic
│   │   │   └── permissions.ts        # Permission request flow
│   │   └── schemas/            # Zod validation
│   │
│   ├── food/                   # Food logging domain
│   │   ├── api/                # Open Food Facts proxy + Supabase diary
│   │   ├── hooks/              # useFoodSearch, useBarcodeScan, useMealLog
│   │   ├── screens/            # FoodSearchScreen, FoodDetailScreen, DiaryScreen
│   │   ├── components/         # BarcodeScanner, FoodCard, NutritionSummary
│   │   ├── services/           # Local diary persistence, barcode camera config
│   │   └── schemas/            # Zod validation for meal entries
│   │
│   ├── leaderboard/            # Leaderboard domain
│   │   ├── api/                # Supabase queries for ranked entries
│   │   ├── hooks/              # useLeaderboard, useLocationFilter
│   │   ├── screens/            # LeaderboardScreen, GlobalLeaderboard, FriendsLeaderboard
│   │   ├── components/         # LeaderboardRow, RankBadge, LocationFilterPicker
│   │   └── schemas/            # Location filter validation
│   │
│   ├── social/                 # Friends domain
│   │   ├── api/                # Friend graph mutations, contact sync
│   │   ├── hooks/              # useFriends, useContactSync, useFriendSearch
│   │   ├── screens/            # FriendsScreen, AddFriendScreen
│   │   ├── components/         # FriendRow, ContactItem, SearchBar
│   │   └── schemas/            # Friend request validation
│   │
│   └── dashboard/              # Dashboard domain
│       ├── api/                # Aggregated data queries
│       ├── hooks/              # useDashboard
│       ├── screens/            # DashboardScreen
│       └── components/         # StepRing, CaloriePie, RankCard, DaySelector
│
├── components/                 # Shared reusable UI (existing, augment)
│   ├── drawer-content.tsx
│   ├── header-drawer-button.tsx
│   ├── ui/                    # Design system primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── layout/                 # Shared layout wrappers
│
├── lib/                        # Utility helpers (existing, augment)
│   ├── cn.ts                   # Tailwind merge utility
│   ├── supabase.ts             # Supabase client singleton
│   ├── query-client.ts         # React Query client config with persistence
│   └── api-client.ts           # Custom fetch wrapper for proxy endpoints
│
├── theme/                      # Theme tokens (existing)
│   ├── colors.ts
│   └── ...
│
├── stores/                     # Zustand stores (client-only state)
│   ├── health-permissions.ts   # Tracks which health permissions granted
│   ├── food-diary-filter.ts    # Current date/filter state for diary
│   └── leaderboard-filter.ts   # Current location filter state
│
└── types/                      # Shared TypeScript types
    ├── step.ts
    ├── food.ts
    ├── leaderboard.ts
    ├── social.ts
    └── supabase.ts             # Generated Supabase types (supabase gen types)
```

### Structure Rationale

- **features/**: Domain modules encapsulate all code for a feature (screens, hooks, API calls, components, validation schemas). Keeps concerns co-located. Each feature folder could become a shared module if needed later. This is the dominant pattern in production React Native apps at scale.
- **features/*/services/**: Platform-specific or third-party service abstractions (HealthKit/Health Connect wrapper, barcode scanning). These are the "seams" where you could swap implementations without changing UI code.
- **features/*/api/**: All Supabase queries and mutations for that domain. Keeps data access co-located with the feature that uses it.
- **stores/**: Zustand stores hold client-only state that persists across navigation but isn't server state. Server state goes in React Query. This separation prevents the common mistake of duplicating API data in global state.
- **lib/supabase.ts**: Singleton Supabase client. Generated types from `supabase gen types` inform all query shapes.
- **types/supabase.ts**: Auto-generated from `supabase gen types --lang=typescript`. Gives end-to-end type safety from database schema to React Query hooks.

## Architectural Patterns

### Pattern 1: Offline-First with Persisted Query Cache

**What:** React Query `PersistQueryClientProvider` serializes the query cache to AsyncStorage so the app works offline and shows cached data immediately on launch.

**When to use:** Required for food diary (users log meals anywhere, including subway/elevator) and step data (daily steps should display on app open without a network round-trip).

**Trade-offs:**
- Pro: Instant loading from cache; survives app restarts
- Pro: Automatic background refetch when online
- Con: AsyncStorage has size limits (~6MB on Android); must selectively persist
- Con: Cache invalidation logic must account for stale health data

**Implementation:**
```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 minutes — steps don't change rapidly
      gcTime: 1000 * 60 * 60 * 24,  // 24 hours before garbage collection
    },
  },
})

export const asyncStoragePersister = createSyncStoragePersister({
  storage: AsyncStorage,
  key: 'TREADPEAK_QUERY_CACHE',
  throttleTime: 1000,
})
```

Wrap in `_layout.tsx`:
```typescript
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
>
  <ThemeProvider>{/* rest of app */}</ThemeProvider>
</PersistQueryClientProvider>
```

**Selective persistence:** Exclude large volatile queries (e.g., food search results) from persistence by adding `meta: { persist: false }` to query options and customizing `shouldDehydrateQuery`:
```typescript
shouldDehydrateQuery: (query) => query.meta?.persist !== false,
```

### Pattern 2: Health Data Abstraction (Bridge Pattern)

**What:** A unified health data service that abstracts over HealthKit (iOS) and Health Connect (Android) behind a single interface, letting feature code be platform-agnostic.

**When to use:** Any app reading health data from both platforms. Critical for step tracking — you write the feature once, test on both platforms.

**Trade-offs:**
- Pro: Feature code never branches on platform
- Pro: Permissions, availability checks, and error handling centralized
- Con: Adds abstraction layer; native capabilities that only exist on one platform are harder to expose
- Con: Requires development build (not Expo Go) for native health modules

**Implementation (using `expo-unified-health`):**

```typescript
// features/steps/services/use-health-data.ts
import { requestPermissions, readRecords, isAvailable } from 'expo-unified-health'
import { Platform } from 'react-native'

export async function requestStepPermissions(): Promise<boolean> {
  if (!(await isAvailable())) {
    console.warn('Health data not available on this device')
    return false
  }
  const { granted } = await requestPermissions({
    read: ['steps'],
  })
  return granted
}

export async function readTodaySteps(): Promise<number> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const { records } = await readRecords('steps', {
    startDate: startOfDay.toISOString(),
    endDate: now.toISOString(),
  })
  
  return records.reduce((sum, r) => sum + r.count, 0)
}

export async function readStepsForDateRange(
  startDate: Date,
  endDate: Date
): Promise<{ date: string; steps: number }[]> {
  const { records } = await readRecords('steps', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
  
  // Group by date and aggregate
  const grouped = new Map<string, number>()
  for (const record of records) {
    const dateKey = record.date.split('T')[0]
    grouped.set(dateKey, (grouped.get(dateKey) || 0) + record.count)
  }
  
  return Array.from(grouped.entries()).map(([date, steps]) => ({ date, steps }))
}
```

### Pattern 3: Periodically Materialized Leaderboard

**What:** Leaderboards are computed on a schedule (e.g., every 15 minutes for daily, once at day boundary for weekly) via PostgreSQL materialized views, not queried live. This avoids O(N log N) rank calculations on every read.

**When to use:** Perfect for step-based leaderboards where data changes infrequently (users accumulate steps throughout the day). Not suitable for real-time gaming where sub-second rank updates matter.

**Trade-offs:**
- Pro: Leaderboard reads are O(log N) index lookups — fast even at scale
- Pro: No cache stampede from concurrent reads
- Pro: Simple to implement with PostgreSQL `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- Con: Staleness window (e.g., up to 15 minutes behind)
- Con: Refresh becomes expensive at very high user counts (mitigated by CONCURRENTLY)
- Con: Location-filtered leaderboards require multiple materialized views or one view with all locations

**View design:**

```sql
-- Daily steps leaderboard (global)
CREATE MATERIALIZED VIEW leaderboard_daily AS
SELECT
  u.id AS user_id,
  u.display_name,
  COALESCE(SUM(s.step_count), 0) AS total_steps,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.step_count), 0) DESC) AS rank
FROM users u
LEFT JOIN step_logs s ON s.user_id = u.id
  AND s.logged_date = CURRENT_DATE
GROUP BY u.id, u.display_name;

CREATE UNIQUE INDEX idx_leaderboard_daily_user ON leaderboard_daily(user_id);
CREATE INDEX idx_leaderboard_daily_rank ON leaderboard_daily(rank);
```

**Refresh strategy (Edge Function cron):**
```
"0 */1 * * *"  → REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_daily
"0 0 * * *"    → REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly
```

### Pattern 4: Friend Graph with Hash-Based Contact Discovery

**What:** Friendships are bidirectional (mutual approval). Contact sync uses client-side hashing of phone numbers with server-side matching, never transmitting plaintext contacts.

**When to use:** Required for contact sync feature. Choose this over one-sided "follow" because competition requires mutual visibility.

**Trade-offs:**
- Pro: Privacy-preserving (server never sees raw phone numbers)
- Pro: User has control over who sees their data
- Con: Contact sync requires additional infrastructure (Edge Function for hashing)
- Con: iOS contact permission prompt adds friction on first sync

**Friendship model (canonical ordering, one row):**

```sql
CREATE TABLE friendships (
  user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'blocked')),
  action_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce canonical ordering: user_id_1 < user_id_2
  CONSTRAINT canonical_order CHECK (user_id_1 < user_id_2),
  PRIMARY KEY (user_id_1, user_id_2)
);
```

**Note on canonical ordering:** Storing `(user_id_1, user_id_2)` with `user_id_1 < user_id_2` and a single row per friendship simplifies writes (one row to create/update/delete), but makes reads asymmetric — querying "all friends of user X" requires checking both columns. Add a GIST exclusion constraint or use two-row storage if reads are hot-path. For TreadPeak's scale, canonical ordering with a UNION query is fine.

**Contact sync flow:**
1. Client reads device contacts (iOS CNContactStore or Android Contacts Provider)
2. Client hashes each phone number: `SHA-256(salt + phone_number)` truncated to first 16 hex chars
3. Client sends hashed list to Edge Function
4. Edge Function SHA-256 hashes its salt + stored user phone hashes, matches against incoming list
5. Edge Function returns matching user profiles (IDs, display names, hashed phone — no plaintext)
6. Client presents matches as "found on TreadPeak" — user sends friend requests

**Privacy note:** The salt is rotated periodically (e.g., weekly via Edge Function config) to invalidate any pre-computed rainbow tables against the hash list.

### Pattern 5: Open Food Facts Proxy with Cache Layer

**What:** A server-side proxy (Supabase Edge Function) sits between the mobile app and Open Food Facts API. It caches responses to reduce external API calls, handles rate limits, and provides a stable endpoint for the app.

**When to use:** Always when consuming a third-party API from a mobile app. Direct calls from the device expose API keys, bypass caching, and couple the app to the external service's availability.

**Trade-offs:**
- Pro: Caches frequent searches (common barcodes, popular foods) — reduces latency
- Pro: Single place to handle Open Food Facts API changes
- Pro: Custom User-Agent identifies the app properly
- Con: Adds server-side infrastructure (but Supabase Edge Functions are included)
- Con: Proxy adds ~50-100ms latency per uncached request
- Con: ODbL share-alike license — must consider if combining OF data with other databases

**Implementation sketch:**

```typescript
// Supabase Edge Function: open-food-facts-proxy
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2'
const CACHE_TTL = 60 * 60 * 24 * 7  // 7 days for food data (stable)

serve(async (req) => {
  const url = new URL(req.url)
  const query = url.searchParams.get('query')
  const barcode = url.searchParams.get('barcode')
  
  // Check cache (Supabase or Deno KV)
  const cacheKey = barcode ? `barcode:${barcode}` : `search:${query}`
  // ... cache lookup logic ...
  
  // Build Open Food Facts URL
  let offUrl: string
  if (barcode) {
    offUrl = `${OFF_API_BASE}/product/${barcode}.json`
  } else {
    offUrl = `${OFF_API_BASE}/search?search_terms=${encodeURIComponent(query!)}&page_size=25&json=1`
  }
  
  const response = await fetch(offUrl, {
    headers: {
      'User-Agent': 'TreadPeak/1.0 (treadpeak.app)',
    },
  })
  
  const data = await response.json()
  
  // Cache the response
  // ... store in cache with TTL ...
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Data Flow

### Step Data Flow (Daily Sync)

```
iOS HealthKit / Android Health Connect
    │
    ▼
[useHealth()] → read today's steps from device health store
    │
    ├──→ Store in React Query cache for UI display (instant)
    │
    ▼
[Sync Engine] → compare local steps vs last synced value (avoid redundant pushes)
    │
    ├──→ If changed > threshold: POST to Supabase step_logs table
    │
    ▼
[Supabase step_logs] → stores daily row per user (upsert on logged_date)
    │
    ▼
[Cron: Leaderboard Refresh] → REFRESH MATERIALIZED VIEW CONCURRENTLY
    │
    ▼
[Materialized View] → updated rankings available for reads
```

### Food Logging Flow

```
User taps "Search" or "Scan Barcode"
    │
    ├──→ Text search: debounced input → React Query → Supabase Edge Function → Open Food Facts API
    │   └──→ Results cached server-side for 7 days; React Query caches client-side for session
    │
    ├──→ Barcode scan: expo-camera → barcode string → React Query → Edge Function → Open Food Facts API
    │   └──→ Barcode data cached aggressively (barcodes don't change)
    │
    ▼
User selects food item → displays nutrition facts
    │
    ▼
User logs meal → SELECT meal_type (breakfast/lunch/dinner/snack), serving_size
    │
    ├──→ If online: INSERT into Supabase meal_entries → invalidate diary query
    │   └──→ Optimistic update via React Query setQueryData
    │
    └──→ If offline: save to local queue with pending flag
        └──→ When online restored: flush queue, update local cache
```

### Leaderboard Read Flow

```
User opens LeaderboardScreen
    │
    ▼
useLeaderboard({ scope: 'global' | 'friends', location?: LocationFilter })
    │
    ▼
React Query key: ['leaderboard', scope, locationHash]
    │
    ├──→ Cache hit (within staleTime): show cached data, refetch in background
    │
    └──→ Cache miss/stale: query Supabase
        │
        ├──→ Global: SELECT * FROM leaderboard_daily ORDER BY rank LIMIT 100
        │
        ├──→ Friends: SELECT * FROM leaderboard_daily 
        │   WHERE user_id IN (friend_ids_from_graph) ORDER BY rank LIMIT 100
        │
        └──→ Location-filtered:
            ├──→ Resolve location name → coordinates (Edge Function + geocoding API)
            └──→ Spatial query: SELECT * FROM leaderboard_daily ld
                JOIN user_locations ul ON ld.user_id = ul.user_id
                WHERE ST_DWithin(ul.coordinates, target_point, radius)
                ORDER BY ld.rank LIMIT 100
    │
    ▼
React Query caches result → renders LeaderboardScreen
    │
    ▼
Supabase Realtime subscription (optional): subscribe to leaderboard refresh events
    → show "Leaderboard updated" banner, user taps to refetch
```

### Friend Graph Data Flow

```
=== Add Friend (Username Search) ===
User types username → debounced search → Supabase SELECT users WHERE display_name ILIKE query
    → Display results → User taps "Add Friend" → INSERT friendships(user_id_1, user_id_2, status='pending')
    → Notification to target user → Target accepts → UPDATE friendships SET status='accepted'

=== Contact Sync ===
1. User grants contacts permission → prompt on first sync
2. Client reads device contacts → extracts phone numbers
3. Client hashes: SHA-256(salt + phone) → truncate to 16 hex chars
4. Client POSTs hashed array to Edge Function
5. Edge Function matches against stored user_phone_hashes table
6. Returns matched user profiles
7. Client renders "Found on TreadPeak" list
8. User sends friend requests for desired contacts
```

## State Management Boundaries

```
┌──────────────────────────────────────────────────────────┐
│                     STATE CATEGORIES                       │
│                                                           │
│  SERVER STATE (React Query)                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • Step logs (read from Supabase)                    │ │
│  │ • Food search results (proxy cache)                 │ │
│  │ • Meal diary entries                                │ │
│  │ • Leaderboard rankings                              │ │
│  │ • Friend list + friend requests                     │ │
│  │ • User profile data                                 │ │
│  │ Strategy: staleTime=5min, gcTime=24h, persist=true  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  CLIENT STATE (Zustand)                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • Selected date for diary view                      │ │
│  │ • Active leaderboard filter (scope + location)      │ │
│  │ • Health permission grant status                    │ │
│  │ • UI toggles (expanded cards, sort order)           │ │
│  │ Strategy: In-memory, persist specific keys only     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  DEVICE STATE (Native APIs)                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ • HealthKit/Health Connect raw step data            │ │
│  │ • Device contacts (read-only, for sync)             │ │
│  │ • Location (for geocoding, not stored persistently) │ │
│  │ • Camera (for barcode scanning)                     │ │
│  │ Strategy: Abstracted behind services/, never direct │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Database Schema (PostgreSQL + PostGIS)

```sql
-- ============================================================
-- CORE
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Managed by Supabase Auth; this is the public profiles table

-- ============================================================
-- STEPS
-- ============================================================
CREATE TABLE step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  step_count INTEGER NOT NULL CHECK (step_count >= 0),
  source TEXT NOT NULL DEFAULT 'health_kit',  -- 'health_kit', 'health_connect', 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, logged_date)  -- one row per user per day
);
CREATE INDEX idx_step_logs_user_date ON step_logs(user_id, logged_date DESC);

-- ============================================================
-- FOOD
-- ============================================================
-- Cached food items from Open Food Facts
CREATE TABLE food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE,                    -- null for non-barcoded items
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  calories_per_100g NUMERIC(7,2),
  protein_per_100g NUMERIC(7,2),
  carbs_per_100g NUMERIC(7,2),
  fat_per_100g NUMERIC(7,2),
  serving_size_g NUMERIC(7,2),            -- suggested serving
  image_url TEXT,
  off_product_id TEXT,                    -- Open Food Facts product ID
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_food_items_barcode ON food_items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_food_items_name_trgm ON food_items USING GIN (name gin_trgm_ops);

-- User meal diary
CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES food_items(id),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  serving_grams NUMERIC(7,2) NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced BOOLEAN NOT NULL DEFAULT TRUE     -- false for offline-created entries
);
CREATE INDEX idx_meal_entries_user_date ON meal_entries(user_id, consumed_at DESC);

-- ============================================================
-- SOCIAL (Friends)
-- ============================================================
CREATE TABLE friendships (
  user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  action_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_order CHECK (user_id_1 < user_id_2),
  PRIMARY KEY (user_id_1, user_id_2)
);
CREATE INDEX idx_friendships_user1 ON friendships(user_id_1, status);
CREATE INDEX idx_friendships_user2 ON friendships(user_id_2, status);

-- Phone hash table for contact sync (server-side)
CREATE TABLE user_phone_hashes (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256(salt + phone) stored as hex string
  phone_hash TEXT UNIQUE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_phone_hashes_hash ON user_phone_hashes(phone_hash);

-- ============================================================
-- LOCATION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- User-chosen location for leaderboard filtering
CREATE TABLE user_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,            -- e.g. "Central Park", "San Francisco, CA"
  location_type TEXT NOT NULL CHECK (location_type IN ('park', 'city', 'zipcode', 'state')),
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
  geocoded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_locations_coords ON user_locations USING GIST (coordinates);

-- ============================================================
-- LEADERBOARD (Materialized Views)
-- ============================================================
CREATE MATERIALIZED VIEW leaderboard_daily AS
SELECT
  u.id AS user_id,
  u.display_name,
  u.avatar_url,
  COALESCE(s.step_count, 0) AS total_steps,
  ROW_NUMBER() OVER (ORDER BY COALESCE(s.step_count, 0) DESC) AS rank
FROM users u
LEFT JOIN step_logs s ON s.user_id = u.id AND s.logged_date = CURRENT_DATE
WHERE u.id IN (SELECT id FROM users);  -- placeholder, RLS handles visibility

CREATE UNIQUE INDEX idx_lb_daily_user ON leaderboard_daily(user_id);
CREATE INDEX idx_lb_daily_rank ON leaderboard_daily(rank);

CREATE MATERIALIZED VIEW leaderboard_weekly AS
SELECT
  u.id AS user_id,
  u.display_name,
  u.avatar_url,
  COALESCE(SUM(s.step_count), 0) AS total_steps,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.step_count), 0) DESC) AS rank
FROM users u
LEFT JOIN step_logs s ON s.user_id = u.id
  AND s.logged_date >= date_trunc('week', CURRENT_DATE)
  AND s.logged_date <= CURRENT_DATE
GROUP BY u.id, u.display_name, u.avatar_url;

CREATE UNIQUE INDEX idx_lb_weekly_user ON leaderboard_weekly(user_id);
CREATE INDEX idx_lb_weekly_rank ON leaderboard_weekly(rank);
```

### Location-Filtered Leaderboard Query Pattern

For location-filtered leaderboards, query the materialized view joined against `user_locations` with a spatial filter:

```sql
-- Friends leaderboard (no location)
SELECT * FROM leaderboard_daily ld
WHERE ld.user_id IN (SELECT friends($1))  -- hypothetical friends function
ORDER BY ld.rank
LIMIT 100;

-- Location-filtered leaderboard (e.g., "users near Central Park")
SELECT ld.*, ST_Distance(ul.coordinates, target_point::GEOGRAPHY) AS distance_m
FROM leaderboard_daily ld
JOIN user_locations ul ON ld.user_id = ul.user_id
WHERE ST_DWithin(ul.coordinates, target_point::GEOGRAPHY, radius_meters)
ORDER BY ld.rank
LIMIT 100;
```

The `target_point` and `radius_meters` are derived from the user's location filter selection. A park selection maps to a known bounding radius (e.g., 500m for a park, 5000m for a city, 25000m for a state). This avoids requiring every user to report their real-time location — they choose where they want to compete.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith Supabase project; all materialized views refresh on cron; no caching layer needed beyond Supabase built-in |
| 1k-100k users | Materialized view refresh becomes the first bottleneck (full refresh of leaderboard_daily on 100k rows is ~2-5 seconds CONCURRENTLY). Add Redis cache in front of leaderboard reads. Consider partitioning step_logs by month. |
| 100k+ users | Step logs become massive (100k rows/day). Partition step_logs by date. Leaderboard materialized views need incremental refresh (triggers + summary table) instead of full refresh. Consider read replicas for leaderboard queries. Friend graph fan-out becomes a consideration. |

### Scaling Priorities

1. **First bottleneck: Materialized view refresh on step_logs.** At ~50k users, daily step tracking generates 50k rows/day (1 row/user/day). By 100k users it's 100k rows/day. `REFRESH MATERIALIZED VIEW CONCURRENTLY` scans the entire table. Mitigation: Partition step_logs by month, and create leaderboard views that only scan the latest partition.

2. **Second bottleneck: Open Food Facts proxy cache contention.** At scale, the Edge Function cache (in-memory or Supabase Storage) fills with search results. LRU eviction means popular foods stay cached. Mitigation: Pre-warm cache from Open Food Facts JSONL export for the most common barcodes in your region.

3. **Third bottleneck: Contact sync hash matching.** At 100k users, matching hashed contacts means the Edge Function iterates over 100k rows per sync request. Mitigation: Index `user_phone_hashes(phone_hash)` and batch incoming hashes into a single `IN` query.

## Build Order (Dependency Graph)

```
Phase 1: Auth + User Profile
  │   └── No dependencies (required by everything else)
  ▼
Phase 2: Step Tracking
  │   └── Depends on: Auth
  │   └── Independent of: Food, Social, Leaderboard
  ▼
Phase 3: Food Diary
  │   └── Depends on: Auth
  │   └── Independent of: Steps, Social (can parallel with Phase 2)
  ▼
Phase 4: Friend Graph
  │   └── Depends on: Auth
  │   └── Independent of: Steps, Food
  ▼
Phase 5: Leaderboard
  │   └── Depends on: Steps (needs step_logs), Friends (for friends scope), 
  │                    Location (for location filter)
  │   └── Do NOT start until Steps and Friends are writing data
  ▼
Phase 6: Dashboard
  │   └── Depends on: Steps, Food, Leaderboard (aggregates all three)
  │   └── Must be last — it's a composite view
```

## Anti-Patterns

### Anti-Pattern 1: Real-Time Leaderboard Increment on Every Step

**What people do:** Every time a user takes a step, increment a score counter in the database or Redis sorted set.

**Why it's wrong:** Steps come in hundreds per minute from the health API sync. Every sync would trigger a write. The leaderboard would fluctuate constantly. Location-filtered queries would recalculate on every view. This creates 100x more writes than needed and provides no user-value — users don't care about step-by-step rank changes.

**Do this instead:** Batch daily step totals. Push once per sync interval (e.g., every 15-30 minutes). Refresh the leaderboard materialized view on a cron schedule (every 15-60 minutes). Users see their rank update every time they open the app, which is frequent enough.

### Anti-Pattern 2: Direct Open Food Facts API Calls from Mobile Client

**What people do:** Call `world.openfoodfacts.org/api/v2/search` directly from the React Native app using `fetch`.

**Why it's wrong:** No caching layer means every user request hits Open Food Facts directly. No custom User-Agent or its wrong. Open Food Facts can rate-limit or go down. If the API changes endpoints, every deployed client version breaks. The app shows loading spinners for every search.

**Do this instead:** Proxy through a Supabase Edge Function. Cache responses (7-day TTL for food data since it's stable). Only the proxy needs updating if the upstream API changes. The app gets faster responses from cache on repeat searches.

### Anti-Pattern 3: Storing Friend Graph in a Third-Party Social SDK

**What people do:** Use Stream, Sendbird, or similar social SDKs for the friend graph and leaderboard.

**Why it's wrong:** Unnecessary third-party dependency and cost for TreadPeak's scope. The friend graph is simple: bidirectional friendships with contact sync. PostgreSQL can handle this trivially at TreadPeak's scale. Adding a social SDK introduces monthly fees, vendor lock-in, and another service to monitor. Leaderboard storage in a social SDK also won't support PostGIS location filtering natively.

**Do this instead:** PostgreSQL for friendships (one table, 5 queries). Supabase RLS for authorization. Custom Edge Function for contact sync. Total code: ~500 lines across the backend and client.

### Anti-Pattern 4: Requiring Real-Time Location Tracking for Leaderboard Filtering

**What people do:** Ask for "Always" location permission and continuously track the user's GPS to determine which leaderboard scope they belong to.

**Why it's wrong:** Privacy-invasive (App Store rejection risk). Battery drain. Unnecessary — the user can choose where they want to compete. Walking routes don't determine leaderboard scope; user preference does.

**Do this instead:** Let the user select a location from the leaderboard filter UI (type in a park name, city, or zipcode). Geocode that selection once. Store the chosen location in `user_locations`. Scope leaderboard queries by that stored location. The user's real-time GPS is only needed if they want "near me now" filtering, which is a v2 feature.

### Anti-Pattern 5: Using a Generic Global State for Everything

**What people do:** Put step data, food diary, leaderboard rankings, friend list, UI filters, and permission states all into one Zustand store (or worse, Redux).

**Why it's wrong:** Mixing server state and client state creates synchronization bugs ("the store says step count is X, but the server says Y"). Server state should be the source of truth with React Query managing sync. Trying to manually sync server data into a global store is error-prone and unnecessary.

**Do this instead:** React Query owns all server state (steps, meals, leaderboard, friends). Zustand owns ephemeral client state (selected date, active filter, permission flags). They never overlap. When you need server data + UI state in one screen, React Query provides the data and Zustand provides the filter — they combine in the component.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Apple HealthKit | `expo-unified-health` `readRecords('steps', ...)` | Requires EAS dev build; config plugin in app.json; `NSHealthShareUsageDescription` in Info.plist |
| Google Health Connect | `expo-unified-health` `readRecords('steps', ...)` | Requires Health Connect app on device; config plugin with `android.permission.health.READ_STEPS`; `minSdkVersion 28+` |
| Open Food Facts | Supabase Edge Function proxy | Custom User-Agent `TreadPeak/1.0` required; ODbL license requires attribution; JSONL export for cache warming |
| Geocoding (location filter) | Edge Function → Mapbox/Nominatim/Google Geocoding | Called once when user sets a filter, result cached in Supabase; not on every leaderboard load |
| Supabase Auth | Built-in email/password or phone OTP | RLS policies on all tables reference `auth.uid()`; session managed by Supabase client SDK |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Step Tracking ↔ Health Device | `expo-unified-health` direct calls | Abstracted behind `features/steps/services/use-health-data.ts` |
| Step Tracking ↔ Supabase (step_logs) | React Query mutation | Upsert pattern: `INSERT ... ON CONFLICT (user_id, logged_date) DO UPDATE SET step_count = EXCLUDED.step_count` |
| Food Diary ↔ Open Food Facts Proxy | React Query → Edge Function URL | Edge Function is a Supabase-hosted Deno endpoint; React Query caches client-side |
| Food Diary ↔ Supabase (meal_entries) | React Query mutation with optimistic update | Offline entries get `synced=false`, flushed when online |
| Friend Graph ↔ Supabase (friendships) | React Query mutation | RLS ensures user can only see/modify their own friendships |
| Friend Graph ↔ Contact Sync Edge Function | Custom hook calling Edge Function | POST hashed phone array; response is matched user profiles |
| Leaderboard ↔ Supabase (materialized views) | React Query query (SELECT only) | Read-only from app; refreshes happen server-side via cron |
| Leaderboard ↔ Location Service | React Query query | Geocode location string → store coordinates → reuse for leaderboard filter queries |
| Dashboard ↔ Steps + Food + Leaderboard | Client-side merge of 3 React Query results | No server-side aggregation needed at MVP scale; each query runs independently |

## Sources

- [Expo Unified Health documentation](https://www.npmjs.com/package/expo-unified-health)
- [@robinhealth/health-sdk - cross-platform health data for React Native](https://www.npmjs.com/package/@robinhealth/health-sdk)
- [Open Food Facts API usage guidelines (forum)](https://forum.openfoodfacts.org/t/conditions-to-use-the-open-food-facts-api/443/2)
- [Offline-first React Native with React Query and AsyncStorage](https://practicaldev-herokuapp-com.freetls.fastly.net/msaadullah/building-offline-first-apps-using-react-native-react-query-and-asyncstorage-1h4i)
- [Leaderboard design patterns (real-time vs periodic)](https://raw.githubusercontent.com/sujeet-pro/sujeet.pro/refs/heads/main/content/articles/leaderboard-design/README.md)
- [Supabase Realtime + leaderboard subscriptions](https://dev.to/datalaria/from-zero-to-hero-create-a-cyberpunk-snake-game-with-real-time-ranking-using-supabase-and-vanilla-117n)
- [PostGIS spatial filtering for leaderboards](http://postgis.net/stuff/postgis-3.5.3dev-en.pdf)
- [Privacy-preserving contact sync with hashed phone numbers (Patent EP2779016)](https://patentimages.storage.googleapis.com/f6/ed/99/a5f5846a3300b6/EP2779016B1.pdf)
- [Mutual contact discovery protocol (arXiv)](https://ar5iv.labs.arxiv.org/html/2209.12003)
- [Fitness app database schema patterns (GeeksForGeeks)](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-health-and-fitness-tracking-applications/)
- [Social media app architecture guide (Stream)](https://getstream.io/blog/build-a-social-media-app/)

---
*Architecture research for: TreadPeak fitness tracking app*
*Researched: 2026-07-24*
