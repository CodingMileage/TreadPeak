# Phase 1: Foundation & Authentication — Discussion Log

**Discussion date:** 2026-07-24
**Mode:** Default (best-practices shortcut)
**Prior context loaded:** None (first phase)

## Summary

User opted to apply best practices across all identified gray areas rather than discuss each individually. Claude selected industry-standard approaches guided by the project research (STACK.md, ARCHITECTURE.md, PITFALLS.md), Apple App Store Review Guidelines, and the existing codebase architecture.

## Gray Areas & Decisions

### 1. Auth Providers
**Options presented:** Email/password + Apple OAuth + Google OAuth (all three), or subsets
**Decision:** All three. Email/password for universal access, Apple Sign In for App Store compliance, Google OAuth for Android users.
**Rationale:** Apple requires Sign In with Apple if any third-party social login is offered (Guideline 4.8). Supabase Auth natively supports all three without additional SDKs.

### 2. Auth Gate Pattern
**Options presented:** Route group split (auth)/(app), conditional redirect in index.tsx, auth wrapper component
**Decision:** Route group split with `(auth)` and `(app)` directories. Auth check in root `_layout.tsx` via Supabase `onAuthStateChange`.
**Rationale:** Standard Expo Router + Supabase pattern. Single source of truth for auth state. Clean separation of unauthenticated vs authenticated screens.

### 3. Supabase Project Setup
**Options presented:** Local dev with Supabase CLI vs. cloud project directly
**Decision:** Supabase CLI for local development, migrations in `supabase/migrations/`, cloud project for production.
**Rationale:** Local dev is faster, migrations are version-controlled, and the CLI provides a full local Supabase stack.

### 4. Sign-up Flow
**Options presented:** Single-screen vs. multi-step; email-only vs. email + display name
**Decision:** Single screen: email + password + display name. OAuth buttons as alternatives. Email verification required.
**Rationale:** Minimal friction — collect what's needed, get users into the app quickly. Display name avoids a separate onboarding step.

### 5. Offline Strategy (Claude's discretion)
**Decision:** React Query persistent cache with `expo-secure-store` adapter. Online/offline detection already wired via NetInfo in `_layout.tsx`.
**Rationale:** Already partially set up. Adding persistence is incremental. React Query's built-in retry/refetch handles reconnection.

### 6. Error Handling (Claude's discretion)
**Decision:** Zod + React Hook Form for inline field validation. Global `ErrorBoundary` for crashes. Form-level alerts for auth failures.
**Rationale:** The project already has zod and react-hook-form installed. Error boundary is a standard React pattern.

## Deferred Ideas
None.

## Files Created
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md`
- `.planning/phases/01-foundation-authentication/01-DISCUSSION-LOG.md`
