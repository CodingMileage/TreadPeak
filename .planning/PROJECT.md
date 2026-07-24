# TreadPeak

## What This Is

A walking-focused fitness app where users automatically track daily steps via HealthKit (iOS) and Health Connect (Android), log meals through text search and barcode scanning (Open Food Facts), and compete on location-filtered leaderboards. Users connect with friends by username, phone number, or contact sync. Competition and visibility drive the motivational loop — see how you stack up against friends and your local community.

## Core Value

Users stay motivated to walk more and eat better through competitive leaderboards that show where they rank against friends and people nearby, backed by effortless step tracking and simple food logging.

## Requirements

### Validated

- ✓ Cross-platform mobile app (iOS + Android) via Expo SDK 57 — existing
- ✓ Drawer + bottom tab navigation (Home, Search, Profile) — existing
- ✓ Light/dark mode theming via NativeWind + system color scheme — existing
- ✓ Network-aware data fetching via TanStack React Query — existing

### Active

- [ ] **AUTH-01**: User can create an account and sign in (account required upfront, no guest access)
- [ ] **STEP-01**: User's daily steps are automatically tracked via HealthKit (iOS) and Health Connect (Android)
- [ ] **STEP-02**: User can view their daily, weekly, and monthly step history
- [ ] **FOOD-01**: User can search for foods by text and view full nutritional facts (calories, macros)
- [ ] **FOOD-02**: User can scan barcodes to look up food items
- [ ] **FOOD-03**: User can log foods to their daily food diary
- [ ] **FOOD-04**: User can view their daily calorie and macro totals from logged foods
- [ ] **LEAD-01**: User can view a global leaderboard ranked by daily/weekly steps
- [ ] **LEAD-02**: User can view a friends-only leaderboard
- [ ] **LEAD-03**: User can filter leaderboards by location (park/area, city, zipcode, state)
- [ ] **SOCL-01**: User can find and connect with friends by username search
- [ ] **SOCL-02**: User can find and connect with friends by phone number
- [ ] **SOCL-03**: User can discover friends via contact sync
- [ ] **DASH-01**: User can view a dashboard with daily steps, calories consumed, and leaderboard rank at a glance

### Out of Scope

- Music integration — deferred to post-MVP
- Workout types beyond walking — MVP is walking only
- Broader social features (posts, comments, challenges) — MVP is friends + leaderboards only
- Guest/try-before-signup — account required upfront

## Context

- **Existing codebase:** React Native 0.86 app built with Expo SDK 57, Expo Router (drawer + bottom tabs), NativeWind (Tailwind CSS), TanStack React Query, Zustand, React Hook Form + Zod
- **Current state:** Navigation shell is built with placeholder screens. No backend, auth, API integrations, or domain logic exists yet
- **Build pipeline:** EAS Build configured with development, preview, and production profiles. Project ID: `72620361-2592-4ef2-8a13-63e8e5b54e33`
- **Food API:** Open Food Facts — free, open-source, no rate limits. Supports both text search and barcode lookup
- **Step tracking:** HealthKit (iOS) and Health Connect (Android) for automatic step data — reads steps the phone already collects, no manual entry needed
- **Target quality:** App Store launch quality — polished, production-ready

## Constraints

- **Platform:** iOS and Android via Expo managed workflow (EAS Build)
- **Stack:** Must use existing React Native + Expo + NativeWind foundation
- **Food API:** Open Food Facts (free tier — zero budget)
- **Step data:** HealthKit + Health Connect (read-only, no write-back needed for MVP)
- **Location:** Must request and handle location permissions for leaderboard geo-filtering
- **Contacts:** Must request contacts permission for friend discovery
- **Backend:** Needs a backend for accounts, leaderboards, and food API proxying — not yet selected

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Account required upfront | Data persistence is core value — tracking progress over weeks requires identity from day one | — Pending |
| Open Food Facts over Nutritionix | Zero cost, no rate limits, solid barcode database. Acceptable trade-off on search UX for MVP | — Pending |
| Walking-only for MVP | Narrower scope ships faster. Broader workout types can be added post-launch | — Pending |
| Location-filtered leaderboards in v1 | Key differentiator — users compete locally. Adds location permission complexity but drives retention | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-24 after initialization*
