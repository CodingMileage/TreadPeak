# Coding Conventions

**Analysis Date:** 2026-07-24

## Naming Patterns

**Files:**
- kebab-case for all file names: `drawer-content.tsx`, `header-drawer-button.tsx`, `+not-found.tsx`, `cn.ts`
- Folder-based route naming follows Expo Router conventions: `(tabs)/home/index.tsx`, `settings/_layout.tsx`
- Route groups use parentheses: `(tabs)/`

**Functions:**
- Named function declarations for screen/component defaults: `export default function HomeScreen()` (`src/app/(tabs)/home/index.tsx`)
- Named function declarations (not arrow) for named exports: `function RootLayoutInner()`, `function useDrawerNavigation()` (`src/app/_layout.tsx`, `src/components/header-drawer-button.tsx`)
- Named exports (not default) for shared utility components: `export function DrawerContent()`, `export function HeaderDrawerButton()`
- PascalCase for component and hook function names: `DrawerContent`, `HeaderDrawerButton`, `RootLayoutInner`
- camelCase for non-component functions: `cn()`, `useDrawerNavigation()`

**Variables:**
- camelCase for all variables: `const queryClient`, `const visibleRoutes`, `const filteredState`
- UPPER_SNAKE_CASE for constants: `const HIDDEN_ROUTES`, `const TOKEN_KEY`
- `const` preferred over `let`; `let` only for reassignments

**Types:**
- PascalCase for type and interface names
- Inline type imports using `import type { ... }`: `import type { DrawerContentComponentProps } from "expo-router/drawer"` (`src/components/drawer-content.tsx`)
- Type imports grouped and separated from value imports

## Code Style

**Formatting:**
- No formatting tool detected (no `.prettierrc`, no `biome.json`)
- Expo's default linting available via `npx expo lint` (`package.json` scripts: `"lint": "expo lint"`)
- 2-space indentation observed throughout

**Linting:**
- No custom ESLint config detected; default Expo linting applied via `"lint": "expo lint"` in `package.json`
- No custom lint rules defined at project level

**TypeScript:**
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- Path alias `@/*` mapped to `./src/*` and `@/assets/*` mapped to `./assets/*`
- Extends `expo/tsconfig.base` for Expo defaults (`tsconfig.json`)
- TypeScript ~6.0.3 used

## Import Organization

**Order:**
1. CSS/global imports first: `import "../../global.css"` (`src/app/_layout.tsx`)
2. Third-party library imports (React, Expo, React Native): `import { View, Text } from "react-native"`, `import { Stack } from "expo-router/stack"`
3. Local/internal imports via `@/` path alias: `import { DrawerContent } from "@/components/drawer-content"`, `import { tint } from "@/theme/colors"`

**Path Aliases:**
- `@/*` maps to `./src/*` — always use `@/components/...`, `@/theme/...`, `@/lib/...` instead of relative paths
- Relative imports used only within same directory or for files outside `src/` (e.g., `"../../global.css"`)
- No barrel files (`index.ts`) currently used for re-exports

## Error Handling

**Patterns:**
- Minimal error handling present in the current codebase (early-stage project)
- React Query's built-in error handling for async operations: `isLoading`, `error` states from `useQuery` (per expo-data-fetching skill pattern)
- No custom error classes or error boundaries defined yet
- Empty/fallback returns pattern: routes currently are placeholder screens

**Recommended pattern (per expo-data-fetching skill):**
- Use `ApiError` class extending `Error` for typed API errors
- Check `response.ok` before parsing JSON
- Use React Query's `error` state for display rather than try/catch in components

## Logging

**Framework:** None detected. `console` not used in current source files.

**Patterns:**
- No logging framework installed
- No observable log statements in source code

## Comments

**When to Comment:**
- JSDoc-style `/** */` block comments on all exported components and functions: describes purpose, behavior, and any caveats
- Section separator comments: `// -----` style used to group logical sections in larger files (`src/app/_layout.tsx`)
- Inline comments explain non-obvious logic: "Since `(tabs)` is a route group (no URL segment)" (`src/app/index.tsx`)
- "Why" comments over "what" comments — explains design decisions, not code mechanics

**JSDoc/TSDoc:**
- Multi-line `/** */` for components: `@returns` omitted, but purpose clearly described
- Single-line `/** */` for small functions: `/** Routes that should never appear as drawer items. */` (`src/components/drawer-content.tsx`)
- Not all files consistently use JSDoc — `src/app/settings/index.tsx` lacks comment block that other screens have

## Function Design

**Size:**
- Screen components kept small (10-20 lines) — placeholder screens are minimal
- Utility functions are single-purpose: `cn()` is 3 lines (`src/lib/cn.ts`), `useDrawerNavigation()` is 8 lines (`src/components/header-drawer-button.tsx`)

**Parameters:**
- Object destructuring for component props: `function DrawerContent(props: DrawerContentComponentProps)` destructures inline via `const { state, navigation, descriptors } = props`
- Spread/rest patterns used for remaining props where applicable

**Return Values:**
- Components return JSX elements directly (no wrapper HOCs)
- Utility functions return plain values (`cn()` returns `string`)

## Module Design

**Exports:**
- Default exports for route pages (Expo Router convention): `export default function HomeScreen()`
- Named exports for shared components and utilities: `export function DrawerContent()`, `export function HeaderDrawerButton()`, `export function cn()`
- Named exports for constants: `export const tint = ...`

**Barrel Files:**
- Not used. Each module imported directly from its source file.

## Styling

**Classes:**
- NativeWind Tailwind classes via `className` props throughout: `<View className="flex-1 items-center justify-center bg-white dark:bg-black">`
- Native-only style props for platform-specific values: `style={{ paddingTop: top + 20 }}` and `style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}`
- Semantic tint color exported from `src/theme/colors.ts` using `Color` API from `expo-router`, used in native-only props that don't accept Tailwind classes
- Inline `style={}` used for dynamic styles (pressable opacity) — not `StyleSheet.create`

**Theme:**
- Dark and light mode via `PlatformColor`/`Color` from `expo-router` for native components
- Tailwind `dark:` prefix for utility class-based theming: `bg-white dark:bg-black`, `text-black dark:text-white`
- System color scheme determined via `useColorScheme()` hook

## State Management

**Server State:**
- `@tanstack/react-query` with `QueryClientProvider` at root (`src/app/_layout.tsx`)
- Stale time configured: 60 seconds
- Auto-refetch on app focus via `focusManager.setEventListener()`
- Auto-refetch on network reconnect via `onlineManager.setEventListener()` using `@react-native-community/netinfo`

**Client State:**
- `zustand` installed (`^5.0.14`) but no stores detected yet

## Form Handling
- `react-hook-form` (`^7.82.0`) and `@hookform/resolvers` (`^5.4.0`) installed
- `zod` (`^4.4.3`) for schema validation

---

*Convention analysis: 2026-07-24*
