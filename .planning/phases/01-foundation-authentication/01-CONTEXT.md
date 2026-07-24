# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

## Phase Boundary

Set up the Supabase backend, implement user authentication (email/password + Apple OAuth + Google OAuth), establish the auth gate architecture that protects all app screens behind sign-in, and wire up offline-first infrastructure so the app degrades gracefully when connectivity drops. This phase makes the app "alive" — users can create accounts, sign in, and the foundation exists for every other phase to build on.

## Implementation Decisions

### Auth Providers
- **D-01:** Supabase Auth with email/password + Apple Sign In + Google OAuth. All three are required: email/password is the universal fallback, Apple Sign In is mandated by App Store Review Guidelines (4.8) when offering third-party social login, and Google OAuth covers Android users who prefer Google. Use Supabase's built-in native OAuth support — no third-party auth SDK needed. — **Reversibility:** reversible — removing a provider later only affects users who exclusively used that method.
- **D-02:** Email verification required before full app access. Supabase Auth handles this natively. Unverified accounts get a limited "verify your email" interstitial.

### Auth Gate Architecture
- **D-03:** Route group split: `(auth)` for unauthenticated screens (sign-in, sign-up, verify-email), `(app)` for authenticated screens (home, everything else). The root `_layout.tsx` uses Supabase's `onAuthStateChange` listener to check session state and conditionally render the appropriate route group. This is the standard Expo Router + Supabase Auth pattern. — **Reversibility:** costly — changing the route group structure after phases 2-5 are built would require updating every authenticated route.
- **D-04:** Session persistence via Supabase SDK's `expo-secure-store` adapter. Tokens stored securely in the keychain (iOS) / keystore (Android). Session survives app restarts by default with Supabase's `autoRefreshToken`.

### Supabase Project Setup
- **D-05:** Local development with Supabase CLI (`supabase start`). Provides a full local Supabase stack (PostgreSQL, Auth, Storage) for development. Migrations committed to `supabase/migrations/` and version-controlled. Production project provisioned via Supabase dashboard and connected via environment variables. — **Reversibility:** one-way — migration history is append-only; reverting to a different approach would require reconstructing the schema from scratch.
- **D-06:** Row Level Security (RLS) policies from day one. Auth tables: users can only read their own profile. Future phases: leaderboard reads are public, writes are authenticated and user-scoped. RLS is enforced server-side and cannot be bypassed by the client.

### Sign-up Flow
- **D-07:** Single-screen sign-up with email + password + display name. OAuth buttons (Apple, Google) as alternatives — single tap to sign up/in. Display name collected at sign-up to avoid a separate onboarding step. Sign-in is the same screen with a toggle. Minimal friction — get users into the app fast.

### Offline Strategy
- **D-08:** React Query persistent cache using `@tanstack/react-query-persist-client` with `expo-secure-store` as the storage adapter for auth tokens. Online/offline detection already wired via `@react-native-community/netinfo` in `src/app/_layout.tsx`. Network state changes trigger React Query's `onlineManager` which automatically refetches stale queries on reconnect. Offline behavior: show cached/stale data with a subtle "offline" indicator; queue mutations for retry (React Query's built-in `mutationCache` retry behavior). — **Reversibility:** costly — the persist layer couples queries to storage; changing storage backends later means migrating cached data.

### Error Handling
- **D-09:** Zod-validated forms with per-field inline error messages (using React Hook Form's `formState.errors`). Auth failures (wrong password, network error) display as form-level alerts. Unexpected errors caught by a global `ErrorBoundary` wrapper at the root layout level with a fallback UI and retry button.

### Claude's Discretion
All decisions above were made by Claude applying best practices based on:
- The Supabase + Expo/React Native ecosystem standards
- The research findings in `.planning/research/` (STACK.md, ARCHITECTURE.md, PITFALLS.md)
- Apple App Store Review Guidelines for social login requirements
- The existing codebase architecture (Expo Router, React Query, Zustand, React Hook Form + Zod)

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Full project context, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — All v1 requirements with REQ-IDs; Phase 1 covers AUTH-01–03, INFR-01–02, INFR-05
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependencies, phase ordering

### Research
- `.planning/research/STACK.md` — Recommended stack: Supabase Pro ($25/mo), `@supabase/supabase-js` client, `expo-secure-store` for session persistence
- `.planning/research/ARCHITECTURE.md` — Auth → Steps/Food/Friends dependency graph; Supabase RLS design
- `.planning/research/PITFALLS.md` — Permission fatigue (don't request all permissions at sign-up; Phase 1 only needs network auth, nothing else), privacy-by-design from day one

### Existing codebase
- `.planning/codebase/STACK.md` — Current stack: Expo SDK 57, React Native 0.86, React Query, Zustand, React Hook Form + Zod, NativeWind
- `.planning/codebase/ARCHITECTURE.md` — Root layout provider chain, route structure, data flow

## Existing Code Insights

### Reusable Assets
- **`src/app/_layout.tsx`**: Root provider chain (GestureHandler → QueryClient → ThemeProvider → Drawer). Auth provider wraps at this level — add Supabase `SessionContextProvider` before QueryClient.
- **`@tanstack/react-query`** (v5.101.4, already configured): 1-min staleTime, focus refetch via AppState listener, online manager via NetInfo. Auth queries and mutations use this directly.
- **`zustand`** (v5.0.14, installed but unused): Perfect for client-side auth session state (current user, isAuthenticated, session expiry) outside of React tree.
- **`react-hook-form`** (v7.82.0) + **`zod`** (v4.4.3) + **`@hookform/resolvers`** (v5.4.0): Ready for sign-up/sign-in form validation.
- **`src/lib/cn.ts`**: Tailwind class merge utility — use in auth form components.
- **`src/theme/colors.ts`**: Semantic tint color for native props — use for OAuth button styling.

### Established Patterns
- File-based routing via Expo Router with `_layout.tsx` wrappers
- NativeWind `className` props for all styling
- React Query for server state, React state for local UI state
- System dark/light mode via ThemeProvider

### Integration Points
- **Root layout** (`src/app/_layout.tsx:45`): Add Supabase `SessionContextProvider` and auth gate logic here — above the Drawer navigator. This ensures auth check runs before any screen renders.
- **Route structure**: Current redirect `/` → `/(tabs)/home`. Replace with auth-aware redirect: unauthenticated → `/(auth)/sign-in`, authenticated → `/(app)/(tabs)/home`.
- **EAS Build**: Already configured with development/preview/production profiles. Supabase URL + anon key go in `EXPO_PUBLIC_*` environment variables.

## Specific Ideas

No specific UI/UX references provided — open to standard mobile auth patterns. The existing app uses a clean, native-feeling design with NativeWind and system color scheme.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 1-Foundation & Authentication*
*Context gathered: 2026-07-24*
