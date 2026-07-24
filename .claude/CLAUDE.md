<!-- GSD:project-start source:PROJECT.md -->

## Project

**TreadPeak**

A walking-focused fitness app where users automatically track daily steps via HealthKit (iOS) and Health Connect (Android), log meals through text search and barcode scanning (Open Food Facts), and compete on location-filtered leaderboards. Users connect with friends by username, phone number, or contact sync. Competition and visibility drive the motivational loop — see how you stack up against friends and your local community.

**Core Value:** Users stay motivated to walk more and eat better through competitive leaderboards that show where they rank against friends and people nearby, backed by effortless step tracking and simple food logging.

### Constraints

- **Platform:** iOS and Android via Expo managed workflow (EAS Build)
- **Stack:** Must use existing React Native + Expo + NativeWind foundation
- **Food API:** Open Food Facts (free tier — zero budget)
- **Step data:** HealthKit + Health Connect (read-only, no write-back needed for MVP)
- **Location:** Must request and handle location permissions for leaderboard geo-filtering
- **Contacts:** Must request contacts permission for friend discovery
- **Backend:** Needs a backend for accounts, leaderboards, and food API proxying — not yet selected

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 6.0 - Used throughout all source files (`src/`) for application logic, components, routes, and configuration (`tsconfig.json`)
- JavaScript (Node.js) - Build and config files (`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `eas.json`)

## Runtime

- Node.js (via Expo CLI, version managed by the project)
- npm (lockfile: `package-lock.json` present)
- No yarn, pnpm, or bun detected

## Frameworks

- React Native 0.86.0 - Cross-platform mobile framework (`react-native`)
- React 19.2.3 - UI library (`react`, `react-dom`)
- Expo SDK ~57.0.8 - Managed runtime and toolchain (`expo`)
- Expo Router ~57.0.8 - File-based routing for navigation (`expo-router`)
- NativeWind ^4.2.6 - Tailwind CSS for React Native (`nativewind`)
- Tailwind CSS ^3.4.19 - Utility-first CSS framework (`tailwindcss`)
- tailwind-merge ^3.6.0 - Utility for merging Tailwind classes without conflicts
- clsx ^2.1.1 - Conditional class name construction
- TanStack React Query ^5.101.4 - Server state management and caching (`@tanstack/react-query`)
- Zustand ^5.0.14 - Lightweight client state management
- React Hook Form ^7.82.0 - Form state management (`react-hook-form`)
- Zod ^4.4.3 - Schema validation (`zod`)
- @hookform/resolvers ^5.4.0 - Bridge between React Hook Form and Zod
- Not detected (no Jest, Vitest, or other test framework configuration present)
- Expo Dev Client ~57.0.9 - Development builds (`expo-dev-client`)
- Expo Metro Config - Bundler config (`metro.config.js`)
- Babel with `babel-preset-expo` and `nativewind/babel` preset (`babel.config.js`)

## Key Dependencies

- `expo` ~57.0.8 - Application runtime, build, and deployment platform
- `react-native` 0.86.0 - Mobile UI framework
- `expo-router` ~57.0.8 - All navigation (drawer, tabs, stack)
- `nativewind` ^4.2.6 - Styling layer (requires Tailwind config at `tailwind.config.js`)
- `@expo/ui` ~57.0.7 - Expo's own UI component library
- `react-native-reanimated` 4.5.0 - High-performance animations
- `react-native-gesture-handler` ~2.32.0 - Gesture handling
- `react-native-safe-area-context` ~5.7.0 - Safe area insets
- `react-native-screens` ~4.26.0 - Native screen containers
- `react-native-worklets` 0.10.0 - Worklet support for Reanimated
- `expo-symbols` ~57.0.1 - SF Symbols (iOS native icons)
- `expo-image` ~57.0.1 - Optimized image component
- `expo-glass-effect` ~57.0.1 - Glass/blur effects
- `@shopify/flash-list` 2.0.2 - High-performance list component
- `expo-system-ui` ~57.0.1 - System UI configuration
- `expo-status-bar` ~57.0.1 - Status bar management
- `expo-constants` ~57.0.7 - App constants and config
- `expo-device` ~57.0.1 - Device information
- `expo-font` ~57.0.1 - Font loading
- `expo-linking` ~57.0.4 - Deep linking
- `expo-splash-screen` ~57.0.5 - Splash screen management
- `expo-web-browser` ~57.0.2 - Web browser integration
- `@react-native-community/netinfo` 12.0.1 - Network connectivity detection
- `react-native-web` ~0.21.0 - Web platform renderer
- `clsx` ^2.1.1 - Conditional class name utility
- `tailwind-merge` ^3.6.0 - Tailwind class merge utility
- `zustand` ^5.0.14 - Lightweight state store
- `react-hook-form` ^7.82.0 - Form management
- `zod` ^4.4.3 - Schema validation
- `@hookform/resolvers` ^5.4.0 - Form validation resolvers

## Configuration

- No `.env` files detected at root (`.env*.local` is gitignored per `.gitignore`)
- Environment configuration is not yet implemented
- Expo's `extra` field in `app.json` holds non-sensitive config (EAS project ID)
- `app.json` - Expo app configuration (name, version, icons, plugins, iOS/Android/Web settings)
- `eas.json` - EAS Build profiles (development, preview, production) with auto-incrementing versions
- `babel.config.js` - Babel configuration with Expo preset and NativeWind JSX import source
- `metro.config.js` - Metro bundler configuration with NativeWind CSS input (`global.css`)
- `tsconfig.json` - TypeScript configuration extending `expo/tsconfig.base`, with `@/*` alias mapping to `./src/*`
- `tailwind.config.js` - Tailwind CSS configuration with NativeWind preset
- `nativewind-env.d.ts` - NativeWind TypeScript type declarations
- `expo lint` is the only lint script defined (no ESLint config file detected yet)

## Platform Requirements

- Node.js (version managed by system)
- Expo CLI (via `npx expo`)
- Xcode (for iOS development)
- Android Studio (for Android development)
- macOS (for iOS builds)
- EAS (Expo Application Services) for building and submitting
- iOS: App Store (via EAS Submit)
- Android: Google Play Store (via EAS Submit)
- Web: Static output via `expo-router` (web output set to `static`)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- kebab-case for all file names: `drawer-content.tsx`, `header-drawer-button.tsx`, `+not-found.tsx`, `cn.ts`
- Folder-based route naming follows Expo Router conventions: `(tabs)/home/index.tsx`, `settings/_layout.tsx`
- Route groups use parentheses: `(tabs)/`
- Named function declarations for screen/component defaults: `export default function HomeScreen()` (`src/app/(tabs)/home/index.tsx`)
- Named function declarations (not arrow) for named exports: `function RootLayoutInner()`, `function useDrawerNavigation()` (`src/app/_layout.tsx`, `src/components/header-drawer-button.tsx`)
- Named exports (not default) for shared utility components: `export function DrawerContent()`, `export function HeaderDrawerButton()`
- PascalCase for component and hook function names: `DrawerContent`, `HeaderDrawerButton`, `RootLayoutInner`
- camelCase for non-component functions: `cn()`, `useDrawerNavigation()`
- camelCase for all variables: `const queryClient`, `const visibleRoutes`, `const filteredState`
- UPPER_SNAKE_CASE for constants: `const HIDDEN_ROUTES`, `const TOKEN_KEY`
- `const` preferred over `let`; `let` only for reassignments
- PascalCase for type and interface names
- Inline type imports using `import type { ... }`: `import type { DrawerContentComponentProps } from "expo-router/drawer"` (`src/components/drawer-content.tsx`)
- Type imports grouped and separated from value imports

## Code Style

- No formatting tool detected (no `.prettierrc`, no `biome.json`)
- Expo's default linting available via `npx expo lint` (`package.json` scripts: `"lint": "expo lint"`)
- 2-space indentation observed throughout
- No custom ESLint config detected; default Expo linting applied via `"lint": "expo lint"` in `package.json`
- No custom lint rules defined at project level
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- Path alias `@/*` mapped to `./src/*` and `@/assets/*` mapped to `./assets/*`
- Extends `expo/tsconfig.base` for Expo defaults (`tsconfig.json`)
- TypeScript ~6.0.3 used

## Import Organization

- `@/*` maps to `./src/*` — always use `@/components/...`, `@/theme/...`, `@/lib/...` instead of relative paths
- Relative imports used only within same directory or for files outside `src/` (e.g., `"../../global.css"`)
- No barrel files (`index.ts`) currently used for re-exports

## Error Handling

- Minimal error handling present in the current codebase (early-stage project)
- React Query's built-in error handling for async operations: `isLoading`, `error` states from `useQuery` (per expo-data-fetching skill pattern)
- No custom error classes or error boundaries defined yet
- Empty/fallback returns pattern: routes currently are placeholder screens
- Use `ApiError` class extending `Error` for typed API errors
- Check `response.ok` before parsing JSON
- Use React Query's `error` state for display rather than try/catch in components

## Logging

- No logging framework installed
- No observable log statements in source code

## Comments

- JSDoc-style `/** */` block comments on all exported components and functions: describes purpose, behavior, and any caveats
- Section separator comments: `// -----` style used to group logical sections in larger files (`src/app/_layout.tsx`)
- Inline comments explain non-obvious logic: "Since `(tabs)` is a route group (no URL segment)" (`src/app/index.tsx`)
- "Why" comments over "what" comments — explains design decisions, not code mechanics
- Multi-line `/** */` for components: `@returns` omitted, but purpose clearly described
- Single-line `/** */` for small functions: `/** Routes that should never appear as drawer items. */` (`src/components/drawer-content.tsx`)
- Not all files consistently use JSDoc — `src/app/settings/index.tsx` lacks comment block that other screens have

## Function Design

- Screen components kept small (10-20 lines) — placeholder screens are minimal
- Utility functions are single-purpose: `cn()` is 3 lines (`src/lib/cn.ts`), `useDrawerNavigation()` is 8 lines (`src/components/header-drawer-button.tsx`)
- Object destructuring for component props: `function DrawerContent(props: DrawerContentComponentProps)` destructures inline via `const { state, navigation, descriptors } = props`
- Spread/rest patterns used for remaining props where applicable
- Components return JSX elements directly (no wrapper HOCs)
- Utility functions return plain values (`cn()` returns `string`)

## Module Design

- Default exports for route pages (Expo Router convention): `export default function HomeScreen()`
- Named exports for shared components and utilities: `export function DrawerContent()`, `export function HeaderDrawerButton()`, `export function cn()`
- Named exports for constants: `export const tint = ...`
- Not used. Each module imported directly from its source file.

## Styling

- NativeWind Tailwind classes via `className` props throughout: `<View className="flex-1 items-center justify-center bg-white dark:bg-black">`
- Native-only style props for platform-specific values: `style={{ paddingTop: top + 20 }}` and `style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}`
- Semantic tint color exported from `src/theme/colors.ts` using `Color` API from `expo-router`, used in native-only props that don't accept Tailwind classes
- Inline `style={}` used for dynamic styles (pressable opacity) — not `StyleSheet.create`
- Dark and light mode via `PlatformColor`/`Color` from `expo-router` for native components
- Tailwind `dark:` prefix for utility class-based theming: `bg-white dark:bg-black`, `text-black dark:text-white`
- System color scheme determined via `useColorScheme()` hook

## State Management

- `@tanstack/react-query` with `QueryClientProvider` at root (`src/app/_layout.tsx`)
- Stale time configured: 60 seconds
- Auto-refetch on app focus via `focusManager.setEventListener()`
- Auto-refetch on network reconnect via `onlineManager.setEventListener()` using `@react-native-community/netinfo`
- `zustand` installed (`^5.0.14`) but no stores detected yet

## Form Handling

- `react-hook-form` (`^7.82.0`) and `@hookform/resolvers` (`^5.4.0`) installed
- `zod` (`^4.4.3`) for schema validation

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- Every file in `src/app/` maps to a route automatically
- Route groups `(tabs)` provide URL-agnostic screen grouping
- Each tab wraps its own `<Stack>` for independent navigation history
- Custom drawer content (`DrawerContent`) filters out hidden routes
- React Query manages server state with automatic refetch on focus and online recovery
- NativeWind applies Tailwind CSS utility classes to React Native components

## Layers

- Purpose: Defines navigation structure via file-based routing
- Location: `src/app/`
- Contains: Route layouts and screen components
- Depends on: `@/components/`, `@/theme/`, external libraries
- Used by: Expo Router entry point (`expo-router/entry`)
- Purpose: Reusable UI components
- Location: `src/components/`
- Contains: `drawer-content.tsx`, `header-drawer-button.tsx`
- Depends on: `@/theme/`, `expo-router`
- Used by: Route layouts
- Purpose: Utility helpers
- Location: `src/lib/`
- Contains: `cn.ts` (Tailwind class merge utility)
- Depends on: `clsx`, `tailwind-merge`
- Used by: Components and screens
- Purpose: Theme colors and design tokens
- Location: `src/theme/`
- Contains: `colors.ts` (semantic tint color for native props)
- Depends on: `expo-router` (Color API), `react-native` (Platform)
- Used by: Components and layouts

## Data Flow

### Primary Request Path (App Startup)

### React Query Data Flow

- Server state: React Query (cached, auto-refetched on focus/online)
- Client/UI state: React state (local to components), no global store wired yet
- Theme: Managed by `ThemeProvider` from expo-router, driven by system `useColorScheme`
- Zustand v5 is a dependency but not yet used in source code

## Key Abstractions

- Purpose: Every file in `src/app/` is a route; `_layout.tsx` files wrap child routes with navigators
- Examples: `src/app/(tabs)/home/_layout.tsx` wraps `index` in a Stack, `src/app/_layout.tsx` wraps everything in a Drawer
- Pattern: File-based routing with nested navigators
- Purpose: Groups the three bottom tabs without adding a URL segment
- Pattern: Parentheses-wrapped folder name is omitted from the URL path
- Purpose: `DrawerContent` component in `src/components/drawer-content.tsx` renders a branded drawer header and filters out hidden routes (`index`, `+not-found`) from the drawer item list
- Pattern: Manipulates Drawer state to exclude auto-registered route entries
- Purpose: `tint` export from `src/theme/colors.ts` provides a platform-native tint color for props that don't accept Tailwind classes (e.g., `NativeTabs.tintColor`, `SymbolView.tintColor`)
- Pattern: Platform-specific color value exposed as a constant

## Entry Points

- Location: `expo-router/entry` (configured in `package.json` `"main"` field)
- Triggers: Expo bundler startup
- Responsibilities: Loads `src/app/_layout.tsx` as the root layout
- Location: `src/app/_layout.tsx`
- Triggers: On app launch
- Responsibilities: Sets up GestureHandler, QueryClient, ThemeProvider, Drawer navigator; configures React Query focus/online managers
- Location: `src/app/index.tsx`
- Triggers: User hits `/` URL
- Responsibilities: Redirects to `/(tabs)/home`
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

### Placeholder Screens as Dummy Views

## Error Handling

- React Query set to `staleTime: 60 * 1000` — stale data shown while refetching
- `onlineManager` with NetInfo handles offline errors
- No custom `ErrorBoundary` components or catch-all error UI detected

## Cross-Cutting Concerns

- NativeWind (Tailwind CSS for React Native) applied via `className` props
- System color scheme drives dark/light mode via expo-router `ThemeProvider`
- Semantic tint color in `src/theme/colors.ts` for native-only props
- Global CSS loaded at `src/app/_layout.tsx:1` from `../../global.css`

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| expo-data-fetching | Framework (OSS). Use when implementing or debugging ANY network request, API call, or data fetching. Covers fetch API, React Query, SWR, error handling, caching, offline support, and Expo Router data loaders (`useLoaderData`). | `.agents/skills/expo-data-fetching/SKILL.md` |
| expo-native-ui | Framework (OSS). Build beautiful, native-feeling Expo screens. Covers Apple HIG styling, semantic colors, native controls, SF Symbols, media, animations, visual effects, gradients, storage, and responsive layout. For routing and navigation, use the expo-router skill. | `.agents/skills/expo-native-ui/SKILL.md` |
| expo-project-structure | Framework (OSS). Folder structure for a new Expo app. Use when scaffolding or laying out a new Expo project with Expo Router, or deciding where a file should live in one. For new projects only — never restructure an existing app to match. | `.agents/skills/expo-project-structure/SKILL.md` |
| expo-router | Framework (OSS). Navigation and routing for Expo Router. Covers file-based routes, groups and dynamic routes, folder organization, Link with previews and context menus, native Stack, page titles, modals and form sheets, NativeTabs, headers and toolbars, and header search bars. | `.agents/skills/expo-router/SKILL.md` |
| expo-ui | "Framework (OSS). Build native UI with the @expo/ui package: real SwiftUI on iOS and Jetpack Compose on Android rendered from React in an Expo or React Native app. Covers universal cross-platform components (Host, Column, Row, Button, Text, List, and more imported from @expo/ui), drop-in replacements for popular React Native community libraries (BottomSheet, DateTimePicker, Slider, Menu, etc.), and platform-specific SwiftUI (@expo/ui/swift-ui, iOS only) and Jetpack Compose (@expo/ui/jetpack-compose, Android only) trees and modifiers. Use when adding or reviewing @expo/ui Host/RNHostView trees, building native-feeling UI where standard React Native components fall short (grouped settings forms with toggles, sections, menus, sheets, pickers, sliders), choosing between universal and platform-specific components, or replacing an RN community UI library with a native @expo/ui equivalent. Not for custom native modules, Expo Router navigation, Reanimated, or data fetching." | `.agents/skills/expo-ui/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
