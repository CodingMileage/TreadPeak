<!-- refreshed: 2026-07-24 -->
# Architecture

**Analysis Date:** 2026-07-24

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                      GestureHandlerRootView                      │
│                      (react-native-gesture-handler)              │
├──────────────────────────────────────────────────────────────────┤
│                      QueryClientProvider                         │
│                      (@tanstack/react-query)                     │
├──────────────────────────────────────────────────────────────────┤
│                      ThemeProvider (system light/dark)            │
├──────────────────────────────────────────────────────────────────┤
│                        Drawer Navigator                          │
│                (expo-router/drawer — root navigator)             │
├────────────────────────────────┬─────────────────────────────────┤
│         (tabs) Route Group     │       settings Route            │
│    (NativeTabs — bottom tabs)  │    (Stack — drawer screen)      │
│  ┌──────┬───────┬─────────┐    │                                 │
│  │ Home │ Search│ Profile │    │   Settings Screen               │
│  │Stack │ Stack │  Stack  │    │                                 │
│  └──────┴───────┴─────────┘    │                                 │
└────────────────────────────────┴─────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root Layout | Creates GestureHandler + QueryClient + ThemeProvider + Drawer | `src/app/_layout.tsx` |
| Index | Redirects `/` to `/(tabs)/home` | `src/app/index.tsx` |
| Not Found | Catch-all for unmatched routes | `src/app/+not-found.tsx` |
| Tabs Layout | Bottom tab bar using `NativeTabs` with Home, Search, Profile | `src/app/(tabs)/_layout.tsx` |
| Home Layout | Stack navigator for Home tab with header drawer button | `src/app/(tabs)/home/_layout.tsx` |
| Home Screen | Landing tab content (placeholder) | `src/app/(tabs)/home/index.tsx` |
| Search Layout | Stack navigator for Search tab with header drawer button | `src/app/(tabs)/search/_layout.tsx` |
| Search Screen | Search tab content (placeholder) | `src/app/(tabs)/search/index.tsx` |
| Profile Layout | Stack navigator for Profile tab with header drawer button | `src/app/(tabs)/profile/_layout.tsx` |
| Profile Screen | Profile tab content (placeholder) | `src/app/(tabs)/profile/index.tsx` |
| Settings Layout | Stack navigator for Settings drawer screen | `src/app/settings/_layout.tsx` |
| Settings Screen | Settings content (placeholder) | `src/app/settings/index.tsx` |
| Drawer Content | Custom drawer panel with branding + filtered route list | `src/components/drawer-content.tsx` |
| Header Drawer Button | Hamburger icon that toggles the drawer | `src/components/header-drawer-button.tsx` |
| cn utility | Merges Tailwind classes (clsx + tailwind-merge) | `src/lib/cn.ts` |
| Colors | Semantic tint color for native props | `src/theme/colors.ts` |

## Pattern Overview

**Overall:** File-based routing (Expo Router) with a hybrid drawer + tab navigator pattern.

**Key Characteristics:**
- Every file in `src/app/` maps to a route automatically
- Route groups `(tabs)` provide URL-agnostic screen grouping
- Each tab wraps its own `<Stack>` for independent navigation history
- Custom drawer content (`DrawerContent`) filters out hidden routes
- React Query manages server state with automatic refetch on focus and online recovery
- NativeWind applies Tailwind CSS utility classes to React Native components

## Layers

**App Layer (Routes):**
- Purpose: Defines navigation structure via file-based routing
- Location: `src/app/`
- Contains: Route layouts and screen components
- Depends on: `@/components/`, `@/theme/`, external libraries
- Used by: Expo Router entry point (`expo-router/entry`)

**Components Layer:**
- Purpose: Reusable UI components
- Location: `src/components/`
- Contains: `drawer-content.tsx`, `header-drawer-button.tsx`
- Depends on: `@/theme/`, `expo-router`
- Used by: Route layouts

**Lib Layer:**
- Purpose: Utility helpers
- Location: `src/lib/`
- Contains: `cn.ts` (Tailwind class merge utility)
- Depends on: `clsx`, `tailwind-merge`
- Used by: Components and screens

**Theme Layer:**
- Purpose: Theme colors and design tokens
- Location: `src/theme/`
- Contains: `colors.ts` (semantic tint color for native props)
- Depends on: `expo-router` (Color API), `react-native` (Platform)
- Used by: Components and layouts

## Data Flow

### Primary Request Path (App Startup)

1. Entry point: `expo-router/entry` loads `src/app/_layout.tsx`
2. Root layout wraps app in `GestureHandlerRootView` > `QueryClientProvider` > `ThemeProvider` > `Drawer`
3. Drawer renders `(tabs)` group and `settings` as drawer screens
4. Initial route `/` hits `src/app/index.tsx` which redirects to `/(tabs)/home`
5. `(tabs)/_layout.tsx` renders `NativeTabs` with Home, Search, Profile triggers
6. Each tab layout (`home/_layout.tsx`) provides a `<Stack>` navigator

### React Query Data Flow

1. QueryClient created in `src/app/_layout.tsx` with 1-minute `staleTime`
2. `focusManager` listens to `AppState` (mobile) / `visibilitychange` (web) to refetch on app focus
3. `onlineManager` listens to `@react-native-community/netinfo` to refetch on reconnect
4. Screens use `useQuery` / `useMutation` via `@tanstack/react-query` against the provider

**State Management:**
- Server state: React Query (cached, auto-refetched on focus/online)
- Client/UI state: React state (local to components), no global store wired yet
- Theme: Managed by `ThemeProvider` from expo-router, driven by system `useColorScheme`
- Zustand v5 is a dependency but not yet used in source code

## Key Abstractions

**Route as Navigation Node:**
- Purpose: Every file in `src/app/` is a route; `_layout.tsx` files wrap child routes with navigators
- Examples: `src/app/(tabs)/home/_layout.tsx` wraps `index` in a Stack, `src/app/_layout.tsx` wraps everything in a Drawer
- Pattern: File-based routing with nested navigators

**Route Group `(tabs)`:**
- Purpose: Groups the three bottom tabs without adding a URL segment
- Pattern: Parentheses-wrapped folder name is omitted from the URL path

**Custom Drawer Content:**
- Purpose: `DrawerContent` component in `src/components/drawer-content.tsx` renders a branded drawer header and filters out hidden routes (`index`, `+not-found`) from the drawer item list
- Pattern: Manipulates Drawer state to exclude auto-registered route entries

**Semantic Tint Color:**
- Purpose: `tint` export from `src/theme/colors.ts` provides a platform-native tint color for props that don't accept Tailwind classes (e.g., `NativeTabs.tintColor`, `SymbolView.tintColor`)
- Pattern: Platform-specific color value exposed as a constant

## Entry Points

**Root Entry:**
- Location: `expo-router/entry` (configured in `package.json` `"main"` field)
- Triggers: Expo bundler startup
- Responsibilities: Loads `src/app/_layout.tsx` as the root layout

**App Initialization:**
- Location: `src/app/_layout.tsx`
- Triggers: On app launch
- Responsibilities: Sets up GestureHandler, QueryClient, ThemeProvider, Drawer navigator; configures React Query focus/online managers

**Route Redirect:**
- Location: `src/app/index.tsx`
- Triggers: User hits `/` URL
- Responsibilities: Redirects to `/(tabs)/home`

**Not Found:**
- Location: `src/app/+not-found.tsx`
- Triggers: Unmatched route
- Responsibilities: Shows "This screen does not exist" with a link home

## Architectural Constraints

- **Threading:** Single-threaded React Native JS thread. `react-native-reanimated` (v4.5.0) and `react-native-worklets` (v0.10.0) available for offloading animations and heavy work to the UI thread, but no usage yet.
- **Global state:** React Query `queryClient` is the only module-level singleton, created in `src/app/_layout.tsx` and provided via React context. No module-level singletons elsewhere.
- **Circular imports:** None detected. The dependency graph is strict: `theme/` imports nothing from the project; `lib/` imports only npm packages; `components/` imports from `theme/` and `expo-router`; `app/` imports from `components/` and `theme/`.
- **Platform code:** No platform-specific file variants (`.ios.tsx`, `.android.tsx`, `.web.tsx`) exist yet, though the infrastructure supports them via Metro's extension resolution. Platform differences are handled inline with `Platform.select()`.

## Anti-Patterns

### Filtered Drawer Routes via State Manipulation

**What happens:** `DrawerContent` in `src/components/drawer-content.tsx` rebuilds the Drawer state object — creating a new `filteredState` that excludes hidden routes and recalculates the index — to prevent `index` and `+not-found` from appearing as drawer items.
**Why it's wrong:** Expo Router auto-registers all route files as drawer screens, requiring manual filtering. This approach mutates the state shape, bypassing the navigator's internal state management. It works but is fragile.
**Do this instead:** Use Expo Router's `unstable_settings` export in route files or configure `drawerHide` option per screen in the Drawer `Screen` definitions in `src/app/_layout.tsx`.

### Placeholder Screens as Dummy Views

**What happens:** All screen files (`home/index.tsx`, `search/index.tsx`, `profile/index.tsx`, `settings/index.tsx`) render identical placeholder views — centered `Text` with "Home", "Search", "Profile", or "Settings".
**Why it's wrong:** These are stub implementations, not actual features. The pattern is correct for initial scaffolding but the screens lack any domain logic, data fetching, or user interaction.
**Do this instead:** Each screen should eventually render meaningful content via its corresponding screen component (colocated in `src/screens/` if complex) and connect to React Query for data.

## Error Handling

**Strategy:** React Query error handling (queries/mutations) at the data layer. No centralized error boundary or error handling middleware detected.

**Patterns:**
- React Query set to `staleTime: 60 * 1000` — stale data shown while refetching
- `onlineManager` with NetInfo handles offline errors
- No custom `ErrorBoundary` components or catch-all error UI detected

## Cross-Cutting Concerns

**Logging:** Not configured. No logging framework detected.

**Validation:** Zod v4 is a dependency but not yet used in any source file. No schema validation implemented.

**Authentication:** Not configured. No auth providers or middleware detected.

**Theme/Styling:**
- NativeWind (Tailwind CSS for React Native) applied via `className` props
- System color scheme drives dark/light mode via expo-router `ThemeProvider`
- Semantic tint color in `src/theme/colors.ts` for native-only props
- Global CSS loaded at `src/app/_layout.tsx:1` from `../../global.css`

---

*Architecture analysis: 2026-07-24*
