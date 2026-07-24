# Requirements: TreadPeak

**Defined:** 2026-07-24
**Core Value:** Users stay motivated to walk more and eat better through competitive leaderboards that show where they rank against friends and people nearby, backed by effortless step tracking and simple food logging.

## v1 Requirements

Requirements for initial App Store release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can create an account with email/password or Apple/Google OAuth
- [ ] **AUTH-02**: User can sign in and stay logged in across sessions
- [ ] **AUTH-03**: User can sign out from any screen

### Step Tracking

- [ ] **STEP-01**: User's daily steps are automatically tracked via HealthKit (iOS) and Health Connect (Android)
- [ ] **STEP-02**: User can view daily step total with visual progress ring toward daily goal
- [ ] **STEP-03**: User can view step history in daily, weekly, and monthly views
- [ ] **STEP-04**: User can customize their daily step goal (default 10,000 steps)
- [ ] **STEP-05**: User can view distance (km/mi) and active time alongside step totals

### Food Logging

- [ ] **FOOD-01**: User can search for foods by text and view full nutritional facts (calories, protein, carbs, fat)
- [ ] **FOOD-02**: User can log foods to their daily food diary with meal categorization (breakfast, lunch, dinner, snack)
- [ ] **FOOD-03**: User can view food diary by date showing all logged entries
- [ ] **FOOD-04**: User can view daily calorie and macro totals summed from logged foods
- [ ] **FOOD-05**: User can edit and delete food diary entries

### Leaderboards

- [ ] **LEAD-01**: User can view a daily and weekly step leaderboard with friend and global views
- [ ] **LEAD-02**: User can filter leaderboards by location (park/area, city, zipcode, state)
- [ ] **LEAD-03**: User can see their own rank highlighted within the leaderboard

### Social

- [ ] **SOCL-01**: User can find and connect with friends by username search
- [ ] **SOCL-02**: User can find and connect with friends by phone number lookup
- [ ] **SOCL-03**: User can discover friends via contact sync (with explicit permission grant)
- [ ] **SOCL-04**: User can accept or decline friend requests
- [ ] **SOCL-05**: User can view their own profile with avatar, step stats, and achievements
- [ ] **SOCL-06**: User can view friends' profiles with step stats and achievements

### Dashboard

- [ ] **DASH-01**: User can view step progress ring with current vs goal steps on the home screen
- [ ] **DASH-02**: User can view current streak counter on the home screen
- [ ] **DASH-03**: User can view daily calorie and macro summary on the home screen
- [ ] **DASH-04**: User can view current leaderboard rank on the home screen
- [ ] **DASH-05**: User can view recent friend activity on the home screen
- [ ] **DASH-06**: User can view earned achievements on the home screen

### Engagement

- [ ] **ENGA-01**: User can view and maintain a daily step streak — consecutive days meeting step goal
- [ ] **ENGA-02**: User can use streak freezes to protect their streak on missed days (limited per month)
- [ ] **ENGA-03**: User can earn achievement badges for milestones (first 5K steps, 7-day streak, 30-day streak, 100K total steps, first food logged, first friend added — 10-15 badges total)
- [ ] **ENGA-04**: User can view a "Complete Day" summary showing net calories (calories consumed minus estimated calories burned from steps)
- [ ] **ENGA-05**: User receives push notifications for daily step summary, friend requests, and streak at risk
- [ ] **ENGA-06**: User's step goal is suggested based on their actual 3-5 day step history, with manual override

### Infrastructure

- [ ] **INFR-01**: All API calls use TanStack React Query with offline-aware caching
- [ ] **INFR-02**: App handles network disconnection gracefully with stale data display
- [ ] **INFR-03**: Health data permissions are requested at point of need with explanatory interstitials (not all at once during onboarding)
- [ ] **INFR-04**: Location data is fuzzed on leaderboards — never expose precise lat/lng for other users
- [ ] **INFR-05**: Supabase project configured as backend — PostgreSQL database, Apple/Google OAuth via Supabase Auth, Row Level Security policies, and real-time subscriptions for leaderboard updates

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Food Logging v2

- **FOOD-V2-01**: Barcode scanning for instant food lookup via camera
- **FOOD-V2-02**: Search-as-you-type with local food index for faster text search
- **FOOD-V2-03**: Custom food entry (user-created foods not in Open Food Facts)

### Social v2

- **SOCL-V2-01**: Home screen widgets showing step progress (iOS and Android)
- **SOCL-V2-02**: Context-aware notifications based on user behavior patterns
- **SOCL-V2-03**: Monthly leaderboard view

### Post-MVP

- Music integration during walks
- Workout types beyond walking (running, cycling, etc.)
- Year-in-Review / Wrapped recap
- Broader social features (challenges, teams, comments)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Music integration | Post-MVP — build core fitness experience first |
| Workout types beyond walking | MVP is walking-only — narrower scope ships faster |
| Manual step entry | Undermines competitive integrity of leaderboards. HealthKit/Health Connect data only |
| Global all-time leaderboard | Research shows this demotivates 75%+ of users. Daily/weekly only |
| Guest/try-before-signup | Account required upfront per product decision — data persistence is core value |
| Barcode scanning (v1) | Deferred to v2 — text search ships first; Open Food Facts search needs caching layer before barcode adds value |
| Generic motivational notifications | Users find them annoying. Only context-aware, data-driven notifications |
| Exercise-to-earn-food mechanics | Moral licensing risk — present steps and food as independent data, not currency |
| Shame-inducing notifications | "You only walked X steps" creates guilt, not motivation. Positive framing only |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| STEP-01 | Phase 2 | Pending |
| STEP-02 | Phase 2 | Pending |
| STEP-03 | Phase 2 | Pending |
| STEP-04 | Phase 2 | Pending |
| STEP-05 | Phase 2 | Pending |
| FOOD-01 | Phase 3 | Pending |
| FOOD-02 | Phase 3 | Pending |
| FOOD-03 | Phase 3 | Pending |
| FOOD-04 | Phase 3 | Pending |
| FOOD-05 | Phase 3 | Pending |
| LEAD-01 | Phase 4 | Pending |
| LEAD-02 | Phase 4 | Pending |
| LEAD-03 | Phase 4 | Pending |
| SOCL-01 | Phase 4 | Pending |
| SOCL-02 | Phase 4 | Pending |
| SOCL-03 | Phase 4 | Pending |
| SOCL-04 | Phase 4 | Pending |
| SOCL-05 | Phase 4 | Pending |
| SOCL-06 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |
| DASH-06 | Phase 5 | Pending |
| ENGA-01 | Phase 5 | Pending |
| ENGA-02 | Phase 5 | Pending |
| ENGA-03 | Phase 5 | Pending |
| ENGA-04 | Phase 5 | Pending |
| ENGA-05 | Phase 5 | Pending |
| ENGA-06 | Phase 5 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 2 | Pending |
| INFR-04 | Phase 4 | Pending |
| INFR-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-24*
*Last updated: 2026-07-24 after roadmap creation*
