# Technology Stack

**Analysis Date:** 2026-07-24

## Languages

**Primary:**
- TypeScript 6.0 - Used throughout all source files (`src/`) for application logic, components, routes, and configuration (`tsconfig.json`)

**Secondary:**
- JavaScript (Node.js) - Build and config files (`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `eas.json`)

## Runtime

**Environment:**
- Node.js (via Expo CLI, version managed by the project)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)
- No yarn, pnpm, or bun detected

## Frameworks

**Core:**
- React Native 0.86.0 - Cross-platform mobile framework (`react-native`)
- React 19.2.3 - UI library (`react`, `react-dom`)
- Expo SDK ~57.0.8 - Managed runtime and toolchain (`expo`)

**Routing:**
- Expo Router ~57.0.8 - File-based routing for navigation (`expo-router`)
  - Uses a root Drawer navigator with a bottom tab bar (`NativeTabs`) inside
  - Drawer screens: `(tabs)`, `settings`
  - Tab screens: `home`, `search`, `profile`

**Styling:**
- NativeWind ^4.2.6 - Tailwind CSS for React Native (`nativewind`)
- Tailwind CSS ^3.4.19 - Utility-first CSS framework (`tailwindcss`)
- tailwind-merge ^3.6.0 - Utility for merging Tailwind classes without conflicts
- clsx ^2.1.1 - Conditional class name construction

**Data Fetching:**
- TanStack React Query ^5.101.4 - Server state management and caching (`@tanstack/react-query`)
  - Configured in `src/app/_layout.tsx` with 1-minute stale time
  - Online manager connected to `@react-native-community/netinfo`
  - Focus refetching via `AppState` listener

**State Management:**
- Zustand ^5.0.14 - Lightweight client state management

**Forms & Validation:**
- React Hook Form ^7.82.0 - Form state management (`react-hook-form`)
- Zod ^4.4.3 - Schema validation (`zod`)
- @hookform/resolvers ^5.4.0 - Bridge between React Hook Form and Zod

**Testing:**
- Not detected (no Jest, Vitest, or other test framework configuration present)

**Build/Dev:**
- Expo Dev Client ~57.0.9 - Development builds (`expo-dev-client`)
- Expo Metro Config - Bundler config (`metro.config.js`)
- Babel with `babel-preset-expo` and `nativewind/babel` preset (`babel.config.js`)

## Key Dependencies

**Critical:**
- `expo` ~57.0.8 - Application runtime, build, and deployment platform
- `react-native` 0.86.0 - Mobile UI framework
- `expo-router` ~57.0.8 - All navigation (drawer, tabs, stack)
- `nativewind` ^4.2.6 - Styling layer (requires Tailwind config at `tailwind.config.js`)

**UI & Interaction:**
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

**Utilities:**
- `expo-constants` ~57.0.7 - App constants and config
- `expo-device` ~57.0.1 - Device information
- `expo-font` ~57.0.1 - Font loading
- `expo-linking` ~57.0.4 - Deep linking
- `expo-splash-screen` ~57.0.5 - Splash screen management
- `expo-web-browser` ~57.0.2 - Web browser integration
- `@react-native-community/netinfo` 12.0.1 - Network connectivity detection
- `react-native-web` ~0.21.0 - Web platform renderer

**Infrastructure:**
- `clsx` ^2.1.1 - Conditional class name utility
- `tailwind-merge` ^3.6.0 - Tailwind class merge utility
- `zustand` ^5.0.14 - Lightweight state store
- `react-hook-form` ^7.82.0 - Form management
- `zod` ^4.4.3 - Schema validation
- `@hookform/resolvers` ^5.4.0 - Form validation resolvers

## Configuration

**Environment:**
- No `.env` files detected at root (`.env*.local` is gitignored per `.gitignore`)
- Environment configuration is not yet implemented
- Expo's `extra` field in `app.json` holds non-sensitive config (EAS project ID)

**Build:**
- `app.json` - Expo app configuration (name, version, icons, plugins, iOS/Android/Web settings)
- `eas.json` - EAS Build profiles (development, preview, production) with auto-incrementing versions
- `babel.config.js` - Babel configuration with Expo preset and NativeWind JSX import source
- `metro.config.js` - Metro bundler configuration with NativeWind CSS input (`global.css`)
- `tsconfig.json` - TypeScript configuration extending `expo/tsconfig.base`, with `@/*` alias mapping to `./src/*`
- `tailwind.config.js` - Tailwind CSS configuration with NativeWind preset
- `nativewind-env.d.ts` - NativeWind TypeScript type declarations

**Linting:**
- `expo lint` is the only lint script defined (no ESLint config file detected yet)

## Platform Requirements

**Development:**
- Node.js (version managed by system)
- Expo CLI (via `npx expo`)
- Xcode (for iOS development)
- Android Studio (for Android development)
- macOS (for iOS builds)

**Production:**
- EAS (Expo Application Services) for building and submitting
  - Project ID: `72620361-2592-4ef2-8a13-63e8e5b54e33`
  - Build profiles: development (dev client, internal distribution), preview (internal), production (auto-increment version)
- iOS: App Store (via EAS Submit)
- Android: Google Play Store (via EAS Submit)
- Web: Static output via `expo-router` (web output set to `static`)

---

*Stack analysis: 2026-07-24*
