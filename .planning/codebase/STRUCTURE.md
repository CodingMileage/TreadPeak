# Codebase Structure

**Analysis Date:** 2026-07-24

## Directory Layout

```
TreadPeak/
├── .agents/                    # GSD agent skill definitions
├── .claude/                    # Claude Code configuration & project skills
├── .expo/                      # Expo local build artifacts (generated)
├── assets/                     # Static assets (icons, splash, images)
│   ├── expo.icon/              #   App icon (multi-resolution)
│   └── images/                 #   Splash screen, favicon, Android icons
├── src/                        # Application source code
│   ├── app/                    #   Expo Router file-based routes
│   │   ├── _layout.tsx         #   Root layout — Drawer + QueryClient + Theme
│   │   ├── index.tsx           #   Route redirect → /(tabs)/home
│   │   ├── +not-found.tsx      #   Catch-all 404 screen
│   │   ├── (tabs)/             #   Route group — no URL segment
│   │   │   ├── _layout.tsx     #   NativeTabs bottom bar
│   │   │   ├── home/           #   Home tab
│   │   │   │   ├── _layout.tsx #   Stack navigator
│   │   │   │   └── index.tsx   #   Home screen
│   │   │   ├── search/         #   Search tab
│   │   │   │   ├── _layout.tsx #   Stack navigator
│   │   │   │   └── index.tsx   #   Search screen
│   │   │   └── profile/        #   Profile tab
│   │   │       ├── _layout.tsx #   Stack navigator
│   │   │       └── index.tsx   #   Profile screen
│   │   └── settings/           #   Settings drawer screen
│   │       ├── _layout.tsx     #   Stack navigator
│   │       └── index.tsx       #   Settings screen
│   ├── components/             #   Reusable UI components
│   │   ├── drawer-content.tsx  #   Custom drawer panel
│   │   └── header-drawer-button.tsx  #   Hamburger toggle button
│   ├── lib/                    #   Utility helpers
│   │   └── cn.ts               #   Tailwind class merge (clsx + twMerge)
│   └── theme/                  #   Design tokens and colors
│       └── colors.ts           #   Semantic tint color for native props
├── .gitignore
├── AGENTS.md                   # Agent instructions
├── app.json                    # Expo app configuration
├── babel.config.js             # Babel config with NativeWind preset
├── CLAUDE.md                   # Claude Code project config
├── eas.json                    # EAS Build & Submit configuration
├── expo-env.d.ts               # Expo type declarations (generated)
├── global.css                  # Tailwind CSS directives
├── LICENSE                     # MIT License (Expo default)
├── metro.config.js             # Metro bundler config with NativeWind
├── nativewind-env.d.ts         # NativeWind type reference
├── package.json                # Dependencies and scripts
├── package-lock.json           # Lockfile
├── skills-lock.json            # GSD skills lockfile
├── tailwind.config.js          # Tailwind CSS config (extends NativeWind preset)
└── tsconfig.json               # TypeScript config with @/* → ./src/*
```

## Directory Purposes

**`src/app/`:**
- Purpose: Expo Router file-based routing — every file maps to a route URL
- Contains: Route layouts (`_layout.tsx`), screen components (`index.tsx`), error pages (`+not-found.tsx`)
- Key files: `_layout.tsx` (root layout), `(tabs)/_layout.tsx` (tab bar), `index.tsx` (entry redirect)
- Constraints: No non-route code belongs here. Route groups `(tabs)` use parentheses to avoid URL segments

**`src/components/`:**
- Purpose: Reusable UI components shared across screens
- Contains: `drawer-content.tsx`, `header-drawer-button.tsx`
- Pattern: One named export per file, kebab-case filenames

**`src/lib/`:**
- Purpose: Standalone utility helpers with no UI dependencies
- Contains: `cn.ts` (Tailwind class merge utility)
- Pattern: One named export per file; tests colocated (`format-date.test.ts`)

**`src/theme/`:**
- Purpose: Design tokens, color definitions, and theme utilities
- Contains: `colors.ts` (tint color for native component props)
- Pattern: Constants and functions that describe visual properties

**`assets/`:**
- Purpose: Static binary assets bundled with the app
- Contains: App icons, splash screen images, favicon
- Generated: No
- Committed: Yes

**`.agents/`:**
- Purpose: GSD (Guided Software Development) agent skill definitions
- Contains: Skill definitions for expo-router, expo-ui, expo-native-ui (in `skills/` subdirectories)
- Generated: No (managed by `gsd-update` / `gsd-new-project`)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code configuration and project skills
- Contains: Skills for GSD workflow and Expo-specific patterns
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `package.json` (`"main": "expo-router/entry"`): App entry point that bootstraps the router
- `src/app/_layout.tsx`: Root layout — the first app code loaded

**Configuration:**
- `app.json`: Expo app metadata, plugins, iOS/Android/web settings
- `eas.json`: EAS Build profiles (development, preview, production) and submit config
- `tsconfig.json`: TypeScript configuration with `@/*` path alias mapping to `./src/*`
- `babel.config.js`: Babel preset with NativeWind JSX import source
- `metro.config.js`: Metro bundler with NativeWind plugin
- `tailwind.config.js`: Tailwind CSS content paths and NativeWind preset
- `global.css`: Tailwind `@tailwind` directives

**Core Logic:**
- `src/app/_layout.tsx`: QueryClient creation, React Query focus/online managers, navigation structure
- `src/app/(tabs)/_layout.tsx`: NativeTabs bottom tab bar configuration
- `src/components/drawer-content.tsx`: Custom drawer UI with route filtering
- `src/components/header-drawer-button.tsx`: Drawer toggle button with SF Symbol

**Testing:**
- None detected. No test files, test runner config, or test scripts exist. Jest/Vitest not installed.

## Naming Conventions

**Files:**
- kebab-case for route files and utilities: `+not-found.tsx`, `drawer-content.tsx`, `header-drawer-button.tsx`
- Route groups wrapped in parentheses: `(tabs)`
- Route layouts named `_layout.tsx` (Expo Router convention)
- Error routes prefixed with `+`: `+not-found.tsx` (Expo Router convention)
- Screen files named `index.tsx` within their route folder (Expo Router convention)

**Directories:**
- Lowecase, single-word for top-level src directories: `app/`, `components/`, `lib/`, `theme/`
- Route groups use parentheses: `(tabs)/`
- Sub-routes use lowercase, single-word: `home/`, `search/`, `profile/`, `settings/`

**Functions:**
- Named exports for all components and utilities
- PascalCase for React components: `DrawerContent`, `HeaderDrawerButton`, `HomeScreen`
- camelCase for utilities and hooks: `cn`, `useDrawerNavigation`

**Variables:**
- camelCase throughout
- UPPER_SNAKE_CASE for constants: `HIDDEN_ROUTES` (in `drawer-content.tsx`)

**Types:**
- PascalCase inferred from TypeScript/Expo types
- TypeScript strict mode enabled
- Explicit return types on functions used in component props

## Where to Add New Code

**New Feature (screen/route):**
- Route file: `src/app/(tabs)/<feature-name>/` (for tab screens) or `src/app/<feature-name>/` (for drawer/push screens)
- Screen component: `src/app/(tabs)/<feature-name>/index.tsx` with inline UI
- Complex screen body: Extract to `src/screens/<feature-name>/index.tsx` (colocate private sub-components in `src/screens/<feature-name>/components/`)
- Each route folder needs its own `_layout.tsx` for a Stack navigator

**New Component:**
- Implementation: `src/components/<component-name>.tsx`
- Complex components (multiple sub-files): `src/components/<component-name>/index.tsx` + sub-files
- Platform variants: Append `.ios.tsx`, `.android.tsx`, `.web.tsx`

**New Utility:**
- Implementation: `src/lib/<utility-name>.ts`
- Tests: `src/lib/<utility-name>.test.ts` (colocated)

**New Theme Token:**
- Colors: `src/theme/colors.ts`
- Tailwind theme extensions: `tailwind.config.js` under `theme.extend`

**New Server API Route (EAS Hosting):**
- Route file: `src/app/api/<route-name>+api.ts`
- Shared server helpers: `src/server/`

**New Hook:**
- Implementation: `src/hooks/<hook-name>.ts`

## Special Directories

**`.expo/`:**
- Purpose: Expo local build artifacts, types, web cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`assets/`:**
- Purpose: Static app assets bundled at build time
- Generated: No
- Committed: Yes

**`/ios`, `/android` (generated):**
- Purpose: Native project files for development builds
- Generated: Yes (via `npx expo prebuild`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-07-24*
