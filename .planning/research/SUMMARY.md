# Project Research Summary

**Project:** TreadPeak
**Domain:** Walking-focused fitness tracking app with food logging and social competition
**Researched:** 2026-07-24
**Confidence:** HIGH

## Executive Summary

TreadPeak is a walking-focused fitness tracking app that combines automatic step tracking, food logging, and location-filtered leaderboards with friend competition. The research shows this is a well-understood domain with established patterns for each subsystem. The recommended approach is to use Supabase as the backend (PostgreSQL for relational data like leaderboards and friend graphs, built-in OAuth for mobile, real-time subscriptions for live leaderboard updates), platform-specific health libraries (`apple-health` for iOS, `react-native-health-connect` via `expo-health-connect` for Android), and Open Food Facts for barcode and food product data. The already-integrated stack (`@tanstack/react-query`, `zustand`, `react-hook-form` with `zod`) aligns well with the architecture, with React Query owning server state and Zustand owning ephemeral UI state.

The critical insight across all research is that **features do not equal retention**. Over 90% of fitness app users stop using within 30 days. The apps that retain users optimize for a simple daily loop: see goal, take action, see progress, feel rewarded. TreadPeak's differentiators (location-filtered leaderboards, combined steps+food dashboard, free barcode scanning, streaks) can create a motivational loop no single competitor provides, but only if the core loop is executed cleanly and feature bloat is avoided.

The key risks are: (1) HealthKit/Health Connect configuration failures causing silent data absence, (2) Open Food Facts API pitfalls (HTTP 200 trap on missing products, kJ vs kcal units, high search latency), (3) permission fatigue during onboarding where four permission gates cause 40%+ abandonment, and (4) the cold-start problem where the first week shows an empty dashboard. Mitigations include: strict config plugin checklists for health libraries, typed response parsers for Open Food Facts, value-first onboarding with just-in-time permissions, and importing historical health data for immediate dashboard value.

## Key Findings

### Recommended Stack

The stack research (details in `STACK.md`) clearly identifies Supabase as the backend platform. It wins over Firebase because PostgreSQL's relational model handles leaderboard queries, friend graph traversal, and food diary joins naturally -- unlike Firestore's NoSQL model which requires heavy denormalization. It wins over Clerk because Clerk's core value (pre-built web UI components) is irrelevant on React Native, and Supabase Auth is 10x cheaper with native OAuth and RLS integration. For health data, the research recommends platform-specific libraries over unified SDKs because a walking-only MVP only needs step count, and separate libraries avoid unnecessary abstraction layers and dependency chains.

**Core technologies:**

- **Supabase Pro** ($25/mo): Backend platform (PostgreSQL, Auth, real-time, storage) -- relational data for leaderboards/friends/food; native Apple/Google OAuth; RLS for security; included 100k MAU
- **apple-health** (iOS): HealthKit step reading via dedicated Expo module with hooks -- simpler API surface for step-only needs
- **react-native-health-connect** + **expo-health-connect** (Android): Health Connect step reading with Expo config plugin -- official Google Health Connect SDK wrapper
- **expo-camera** (~57.0.0): Barcode scanning via CameraView with onBarCodeScanned -- replaces deprecated expo-barcode-scanner; handles EAN-13, UPC-A, Code 128
- **Open Food Facts API**: Free food product database -- no auth required for reads, no rate limits, solid barcode database
- **expo-location** (~57.0.0): GPS + reverse geocoding for leaderboard location filtering -- foreground permission only
- **expo-contacts** (~57.0.0): Contact sync for friend discovery -- native picker and bulk read
- **@tanstack/react-query** (existing, ^5.101.4): Server state for all API calls -- Supabase queries, Open Food Facts, leaderboard data
- **zustand** (existing, ^5.0.14): Client state for auth session, UI preferences, filter state
- **react-hook-form** + **zod** (existing): Form validation for sign-up, food search, settings
- **EAS Build**: Required because health libraries don't work in Expo Go

### Expected Features

The feature landscape research (details in `FEATURES.md`) reveals that the market is crowded but fragmented. Most apps excel at either step tracking (Pacer, StepsApp) or food logging (MyFitnessPal), but few combine both with social competition. TreadPeak's opportunity is the intersection. The critical retention levers are streaks (with freeze mechanics), small-group leaderboards (friends, not global), visual progress (rings over numbers), and frictionless data capture (automatic steps, fast food search).

**Must have (table stakes):**
- Automatic step tracking via HealthKit/Health Connect -- users will not manually enter steps
- Step history (daily, weekly, monthly, yearly) -- users need to see trends
- Customizable daily step goal -- default 10K, must be adjustable
- Dashboard showing step progress ring, streak counter, daily calories, and rank -- no more than 4 primary metrics
- Distance and active time -- calculated from steps or read from health APIs
- Text food search with nutritional results -- primary food logging method
- Barcode scanning for instant food lookup -- faster than text; must be free (differentiator vs MyFitnessPal)
- Calorie and macro display -- protein, carbs, fat at minimum
- Food diary by date with daily totals -- the reason users log food
- Friend connections via username search -- minimum viable social layer
- Daily/weekly step leaderboards (friends + global) -- sorted by steps with rank
- User profile with step stats
- Account creation with Apple/Google OAuth
- Push notifications for daily summary, friend requests, streak warnings
- Streak tracking with display on dashboard -- highest single retention lever

**Should have (competitive differentiators):**
- **Location-filtered leaderboards** -- Core differentiator; segmented leaderboards see ~50% engagement vs ~25% for global
- **Combined steps + food dashboard** -- Energy in vs out in one view; TreadPeak's unique intersection
- **Free barcode scanning from day one** -- MyFitnessPal paywalls this at $79.99/yr
- **Contact sync for friend discovery** -- Reduces friction of finding friends
- **Phone-number-based friend connections** -- Lower friction than username for non-technical users
- **Streak tracking with freeze mechanic** -- Research shows freeze mechanics extend average streak from 11.62 to 17.19 days
- **Achievements and milestone badges** -- Drive continued engagement; 10-15 badges for MVP
- **"Complete Day" view showing net calories** -- Calories in minus estimated calories burned
- **Auto-calibrated goals from actual step history** -- Suggest a goal after 3-5 days tracking

**Defer (v2+):**
- Location-filtered leaderboards (geo query complexity -- ship basic leaderboards first)
- Phone number and contact sync (adds SMS verification and permission flows)
- Home screen widgets (platform-specific; polished add-on)
- Context-aware notifications (need usage data to calibrate)
- Year-in-Review / Wrapped recap (seasonal, shareability feature)

**Do not build (anti-features):**
- Global all-time leaderboard (demotivates 75%+ of users)
- Manual step entry (undermines competitive integrity)
- Generic motivational quotes/notifications (users find them annoying)
- Exercise-to-earn-food mechanics (moral licensing)
- Excessive gamification with levels/XP/currency
- Social feed / posts / comments
- Workout types beyond walking

### Architecture Approach

The architecture research (details in `ARCHITECTURE.md`) recommends a feature-domain project structure with clear state management boundaries. React Query owns all server state (steps, meals, leaderboards, friends) with persisted query cache for offline resilience. Zustand owns ephemeral client state (selected date, active filters, permission flags) -- they never overlap. The backend uses Supabase PostgreSQL with materialized views for leaderboards (refreshed on cron, not queried live), PostGIS for spatial location filtering, Row-Level Security for data isolation, and Edge Functions for the Open Food Facts proxy and hash-based contact sync.

**Major components:**
1. **Health Data Service** -- Reads daily step counts from HealthKit/Health Connect, aggregates, pushes to Supabase; abstracted behind platform-agnostic use-health-data.ts
2. **Food Diary** -- Logs meals via text search or barcode scan; stores locally with offline support (PersistQueryClientProvider + pending write queue)
3. **Open Food Facts Proxy** -- Supabase Edge Function with 7-day server-side cache; stable endpoint for the app; handles API changes centrally
4. **Friend Graph** -- PostgreSQL friendships table with canonical ordering (one row per pair, user_id_1 < user_id_2); hash-based contact discovery
5. **Leaderboard Engine** -- PostgreSQL materialized views refreshed by cron (hourly for daily, midnight for weekly); PostGIS spatial queries for location filtering
6. **Location Service** -- Edge Function wrapping a geocoding API; user selects location from UI (never real-time GPS tracking)
7. **Auth Service** -- Supabase Auth with native OAuth; RLS on every table referencing auth.uid()
8. **Dashboard Aggregator** -- Client-side merge of 3 React Query results (steps, food, leaderboard); no server-side aggregation at MVP scale

**Key patterns:**
- Offline-first with persisted React Query cache (5-min staleTime, 24h gcTime)
- Health data bridge pattern (single interface, platform-specific implementations)
- Periodically materialized leaderboards (never query sorted tables live)
- Hash-based contact discovery (client hashes phone numbers, server matches hashes only)
- Open Food Facts proxy with 7-day cache TTL (food data is stable)

### Critical Pitfalls

The pitfalls research (details in `PITFALLS.md`) identified 25 pitfalls across all phases, 15 of which are critical. The top 10 that demand attention from day one:

1. **HealthKit Authorization Sheet Never Appears (iOS)** -- Missing Info.plist keys, entitlements, or using Expo Go. Prevention: strict config plugin checklist in app.json, `npx expo prebuild --clean` after dep changes, physical device testing only.

2. **Health Connect Silent Failure (Android)** -- TurboModuleRegistry errors due to stale native build cache. Prevention: minSdkVersion: 26, `npx expo prebuild --platform android --clean` after any dep change, complete Health Connect API Declaration Form (7-10 days approval).

3. **Open Food Facts HTTP 200 Trap** -- Invalid barcodes return HTTP 200 with status: 0, not 404. Prevention: always check `response.data.status === 1`, validate product fields, build a typed response parser.

4. **Open Food Facts Energy Units Trap** -- `nutriments.energy` defaults to kJ, not kcal. Prevention: always use `nutriments["energy-kcal_100g"]`, normalize at the API boundary.

5. **Permission Fatigue Kills Activation** -- Four permission gates before value. 40%+ abandon. Prevention: value-first onboarding, just-in-time permissions, priming interstitials.

6. **Cold-Start Problem** -- Empty dashboard in first week. 77% churn within 3 days. Prevention: import 30 days of historical health data, zero-decision launch, celebrate first sync.

7. **Leaderboard Cheating** -- Steps can be gamed via device shaking, fans, pets. Prevention: server-side sanity filters (cap at 150,000/day), step velocity analysis, trust scores.

8. **Location Privacy Exposure** -- Geo-filtered leaderboards can reveal precise location. Prevention: fuzzy geolocation, default to city-level, privacy zones, never store precise location history.

9. **Health Data Privacy Misconception** -- HIPAA does NOT apply to consumer fitness apps. State laws (Washington My Health My Data Act, CCPA) do. Prevention: Privacy-by-Design, Data Processing Agreements, never send health data to analytics SDKs.

10. **React Compiler Experiment** -- app.json has `reactCompiler: true` which can cause build failures. Prevention: disable for production builds, pin Expo SDK version.

## Implications for Roadmap

Based on combined research from all four files, here is the suggested phase structure:

### Phase 1: Foundation and Auth
**Rationale:** Auth is a hard dependency for every other feature. The cold-start problem and permission fatigue must be addressed before any feature code is written.
**Delivers:** Account creation with Apple/Google OAuth, Supabase PostgreSQL project with profiles table, RLS policies, EAS Build pipeline, privacy policy draft, ErrorBoundary component, offline-first React Query persistence layer
**Addresses features:** AUTH-01 (Account creation)
**Avoids pitfalls:** Permission Fatigue (12), Cold-Start (13), HIPAA Misconception (11), React Compiler (18), Missing Error Boundaries (19)
**Notes:** Stack is well-documented. No research-phase needed.

### Phase 2: Step Tracking
**Rationale:** Step tracking is the foundational value proposition. It has no dependency on food or social features. HealthKit/Health Connect integration is the highest-risk subsystem.
**Delivers:** Automatic step tracking via HealthKit (iOS) and Health Connect (Android), step history (daily/weekly/monthly), daily goal with visual progress ring, step sync to Supabase step_logs, offline-local caching of step data, historical data import (30 days)
**Uses stack:** apple-health, react-native-health-connect + expo-health-connect, expo-build-properties, EAS Build
**Implements architecture:** Health Data Abstraction (bridge pattern), offline-first local cache
**Avoids pitfalls:** HealthKit Auth Sheet (1), Health Connect Clean Build (2), Background Delivery Stops (3), App Store Rejection 2.5.1 (4), Offline Caching (20), Non-Idempotent Uploads (24)
**Research flag:** Needs deeper research on health library compatibility with Expo SDK 57.

### Phase 3: Food Diary
**Rationale:** Can be developed in parallel with Phase 2 after auth exists. Food logging is independent of step tracking.
**Delivers:** Barcode scanning via expo-camera, text food search (debounced), Open Food Facts proxy Edge Function with cache, food diary with meal types, daily calorie/macro totals, offline-created entry queue and sync
**Uses stack:** expo-camera, Open Food Facts REST API, Supabase Edge Functions
**Implements architecture:** OFF Proxy with 7-day server-side cache, offline-first diary persistence with optimistic updates
**Avoids pitfalls:** HTTP 200 Trap (5), Energy Units Trap (6), Search Latency (7), Barcode Unreliability (14), Diary UX Partial Logging (16), Calorie Trust Gap (21)
**Research flag:** Needs deeper research on OFF caching strategy -- on-device BM25 index, server-side DuckDB shim, or live proxy.

### Phase 4: Social and Leaderboard
**Rationale:** Depends on Step data (leaderboard needs step_logs) and the Friend Graph (for friends-scoped leaderboards). Location-filtered leaderboards additionally depend on Step data flowing.
**Delivers:** Friend connections via username search, daily/weekly leaderboards (global + friends), location-filtered leaderboards (city/zip/state), leaderboard materialized views with cron refresh, streak tracking with display, achievement badges (10-15)
**Uses stack:** Supabase PostgreSQL + materialized views, PostGIS, expo-location, expo-contacts
**Implements architecture:** Periodically materialized leaderboards, Friend Graph with canonical ordering, hash-based contact sync Edge Function, geocoding Edge Function
**Avoids pitfalls:** Leaderboard Cheating (8), Performance Collapse (9), Location Privacy (10), Notifications Overload (22), Tie-Breaking (25)
**Sub-phase recommendation:**
- Phase 4a: Username search + friend graph + basic global leaderboard
- Phase 4b: Location-filtered leaderboards (PostGIS spatial queries)
- Phase 4c: Contact sync (hash-based, privacy-first)
- Phase 4d: Streaks + achievements

### Phase 5: Dashboard and Polish
**Rationale:** The dashboard is a composite view aggregating Steps, Food, and Leaderboard. All three must be operational first.
**Delivers:** Unified dashboard showing step progress ring, streak counter, daily calorie total, and rank in one scannable view, notification system (daily summary, friend requests, streak warnings), celebration animations, weekly leaderboard reset
**Implements architecture:** Client-side merge of 3 React Query results, push notification service
**Avoids pitfalls:** Notification Overload (22), Overloaded Dashboard (anti-feature)
**Notes:** Standard patterns. No research-phase needed.

### Phase 6: Enhanced Social and Ship Prep
**Rationale:** Additive features after the core loop is validated. Contact sync and phone search add privacy complexity. Ship prep includes regulatory compliance and store submission.
**Delivers:** Contact sync (hash-based), phone number search (opt-in), "Complete Day" end-of-day summary, home screen widgets, full compliance review, App Store + Play Store submission
**Avoids pitfalls:** Contact Sync Storage (15), Phone Search Privacy (17), App Store Rejection (4)
**Notes:** Compliance review is a blocking gate.

### Phase Ordering Rationale

- **Auth first (Phase 1):** Every feature depends on user identity. Supabase project setup unblocks all backend work.
- **Steps and Food in parallel (Phases 2-3):** Independent subsystems after auth. Parallel saves 30-40% calendar time. Step tracking starts first due to higher risk.
- **Leaderboard waits (Phase 4):** Needs step data (to rank) and friend graph (to scope). Cannot begin before both Phase 2 and Phase 4a are operational.
- **Dashboard last (Phase 5):** Composite view. No value before data sources exist.
- **Enhanced social deferred (Phase 6):** Privacy-sensitive additions benefit from existing user base.
- **Anti-features never built:** Global all-time leaderboard, manual step entry, generic motivation, exercise-to-earn mechanics, excessive gamification.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Step Tracking):** Health library compatibility with Expo SDK 57 -- which library (apple-health, @robinhealth/health-sdk, expo-unified-health) provides the cleanest step-only integration
- **Phase 3 (Food Diary):** Open Food Facts caching strategy -- on-device BM25 index, server-side DuckDB shim, or live API proxy -- based on expected search volume
- **Phase 4b-4c (Leaderboard at scale):** Redis hosting options and cost analysis (Upstash, Redis Cloud, self-hosted) for leaderboard at 10k+ users

Phases with standard patterns (skip research-phase during planning):
- **Phase 1 (Auth):** Well-documented Supabase Auth patterns
- **Phase 5 (Dashboard):** Standard React Query merge patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Multiple verified sources; official docs for all technologies; pricing verified |
| Features | HIGH | Competitive analysis of 5+ apps; peer-reviewed retention research; published case studies |
| Architecture | HIGH | Established patterns validated against production fitness apps; PostgreSQL materialized views mature pattern |
| Pitfalls | HIGH | 25 pitfalls from developer communities, GitHub issues, legal sources; cross-referenced |

**Overall confidence:** HIGH

### Gaps to Address

- **Open Food Facts caching strategy:** Resolved at pattern level (proxy + cache) but specific technology (BM25, DuckDB shim, or Supabase Storage) depends on expected search volume. Decision needed during Phase 3 planning.
- **Leaderboard architecture at 10k+ users:** PostgreSQL materialized views work for MVP, but transition to Redis Sorted Sets needs documented migration path. Not a Phase 4a blocker.
- **Expo SDK 57 health library compatibility:** Needs integration testing during Phase 2 setup, not during features.
- **Privacy regulation compliance:** Washington My Health My Data Act, CCPA, GDPR need legal review. Architecture is privacy-preserving by default, but documentation is a Phase 6 blocker.
- **Open Food Facts attribution:** ODbL share-alike license requires proper in-app attribution. Must be designed into UI before Phase 3 ships.

## Sources

### Primary (HIGH confidence)
- Supabase pricing and Auth documentation (supabase.com/pricing, supabase.com/docs/guides/auth)
- Expo SDK 57 documentation (docs.expo.dev/versions/v57.0.0/)
- Apple HealthKit documentation and App Store Review Guidelines (developer.apple.com)
- Google Health Connect documentation (health.connect/)
- Open Food Facts API documentation (openfoodfacts.github.io/documentation/)
- apple-health npm package (npmjs.com/package/apple-health)
- react-native-health-connect npm package (npmjs.com/package/react-native-health-connect)
- expo-health-connect npm package (npmjs.com/package/expo-health-connect)
- expo-camera barcode scanning (docs.expo.dev/versions/v57.0.0/sdk/camera/)

### Secondary (MEDIUM confidence)
- StepsApp Gamification Case Study (trophy.so)
- StepsApp personalization blog (steps.app/blog)
- STEP UP Randomized Clinical Trial (small-group leaderboard engagement data)
- Trophy.so leaderboard best practices and gamification research
- Sahha.ai cold-start analysis for health apps
- MarTechVibe health app retention failure analysis
- USENIX Security 2018 location privacy paper on fitness apps

### Tertiary (LOW confidence -- needs validation)
- expo-unified-health Expo SDK 57 compatibility -- needs integration testing
- Open Food Facts DuckDB shim performance at MVP scale (openfoodfacts-serving GitHub)
- Redis pricing for leaderboards at expected user counts (Upstash vs Redis Cloud)

---
*Research completed: 2026-07-24*
*Ready for roadmap: yes*
