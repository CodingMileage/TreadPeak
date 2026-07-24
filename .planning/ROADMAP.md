# Roadmap: TreadPeak

**Core Value:** Users stay motivated to walk more and eat better through competitive leaderboards that show where they rank against friends and people nearby, backed by effortless step tracking and simple food logging.

## Phases

- [ ] **Phase 1: Foundation & Authentication** - Supabase backend, user accounts (email/OAuth), offline-first infrastructure
- [ ] **Phase 2: Step Tracking** - Automatic step tracking via HealthKit/Health Connect with history, goals, and distance
- [ ] **Phase 3: Food Diary** - Text-based food search, meal logging, and daily nutrition tracking via Open Food Facts
- [ ] **Phase 4: Social & Leaderboards** - Friend connections (username, phone, contacts), profiles, and competitive step leaderboards with location filtering
- [ ] **Phase 5: Dashboard, Engagement & Ship** - Unified home dashboard, streaks, achievements, notifications, and App Store release

---

## Phase Details

### Phase 1: Foundation & Authentication
**Goal:** Users can securely sign up, sign in, and access the app with offline resilience, backed by Supabase.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, INFR-01, INFR-02, INFR-05
**Success Criteria** (what must be TRUE):
1. User can create a new account with email/password or Apple/Google OAuth
2. User can sign in and remain authenticated across app restarts (session persistence via Supabase Auth)
3. User can sign out from any screen and is redirected to the sign-in screen
4. App displays stale cached data when offline and automatically refreshes when connectivity returns
**Plans:** TBD
**UI hint:** yes

---

### Phase 2: Step Tracking
**Goal:** Users automatically track daily steps via HealthKit (iOS) and Health Connect (Android) and can view step history, set goals, and see distance and active time.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** STEP-01, STEP-02, STEP-03, STEP-04, STEP-05, INFR-03
**Success Criteria** (what must be TRUE):
1. User sees daily step count automatically populated from HealthKit (iOS) or Health Connect (Android) without manual entry
2. User can view step history in daily, weekly, and monthly views with a visual progress ring showing current steps vs daily goal
3. User can customize their daily step goal (default 10,000) and see progress toward it
4. User can view distance (km/mi toggle) and active time alongside their step totals
5. Health data permission is requested with an explanatory interstitial at first use of step tracking (not during onboarding)
**Plans:** TBD
**UI hint:** yes

---

### Phase 3: Food Diary
**Goal:** Users can search for foods by text via Open Food Facts, log meals to their diary, and track daily nutrition.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** FOOD-01, FOOD-02, FOOD-03, FOOD-04, FOOD-05
**Success Criteria** (what must be TRUE):
1. User can search for foods by text and see full nutritional facts (calories, protein, carbs, fat)
2. User can log a food to their daily diary and assign it to a meal category (breakfast, lunch, dinner, snack)
3. User can view their food diary by date showing all logged entries with daily calorie and macro totals
4. User can edit or delete any food diary entry
**Plans:** TBD
**UI hint:** yes

---

### Phase 4: Social & Leaderboards
**Goal:** Users can find and connect with friends and see themselves ranked on daily and weekly step leaderboards with global, friends-only, and location-filtered views.
**Mode:** mvp
**Depends on:** Phase 1, Phase 2
**Requirements:** SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, SOCL-06, LEAD-01, LEAD-02, LEAD-03, INFR-04
**Success Criteria** (what must be TRUE):
1. User can search for other users by username, phone number lookup, or contact sync and send friend requests
2. User can accept or decline incoming friend requests
3. User can view a daily and weekly step leaderboard with global and friends-only views
4. User can filter the leaderboard by location (park/area, city, zipcode, state) with fuzzed location data
5. User can see their own rank highlighted within the leaderboard
6. User can view their own profile and friends' profiles showing step stats and achievements
**Plans:** TBD
**UI hint:** yes

---

### Phase 5: Dashboard, Engagement & Ship
**Goal:** Users see a unified home dashboard with daily stats, earn achievements and maintain streaks with freezes, receive push notifications, and the app is production-ready for App Store and Play Store release.
**Mode:** mvp
**Depends on:** Phase 2, Phase 3, Phase 4
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, ENGA-01, ENGA-02, ENGA-03, ENGA-04, ENGA-05, ENGA-06
**Success Criteria** (what must be TRUE):
1. User can see step progress ring, streak counter, daily calorie summary, leaderboard rank, recent friend activity, and earned achievements on the home screen
2. User maintains a daily step streak that increments each consecutive day they meet their goal, with streak freeze mechanics (limited per month) to protect against missed days
3. User earns achievement badges for milestones (5K steps, 7-day streak, 30-day streak, 100K total steps, first food logged, first friend added) and sees them on their profile and dashboard
4. User can view a "Complete Day" summary showing net calories (consumed minus estimated calories burned from steps)
5. User receives push notifications for daily step summary, friend requests, and streak-at-risk warnings
6. User is suggested a step goal based on their 3-5 day step history, with the option to manually override
**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| Phase 1: Foundation & Authentication | 0/0 | Not started | - |
| Phase 2: Step Tracking | 0/0 | Not started | - |
| Phase 3: Food Diary | 0/0 | Not started | - |
| Phase 4: Social & Leaderboards | 0/0 | Not started | - |
| Phase 5: Dashboard, Engagement & Ship | 0/0 | Not started | - |

---

## Dependency Graph

```
Phase 1 (Foundation & Auth)
  |
  +---> Phase 2 (Step Tracking)
  |
  +---> Phase 3 (Food Diary)
  |
  +---> Phase 4 (Social & Leaderboards) -- depends on Phase 2
           |
           +---> Phase 5 (Dashboard, Engagement & Ship) -- depends on Phase 2, Phase 3, Phase 4
```

Phases 2 and 3 are independent after Phase 1 and could be planned concurrently. Phase 4 requires step data (Phase 2) for leaderboards. Phase 5 composes data from all prior phases into the dashboard.
