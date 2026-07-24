# Codebase Concerns

**Analysis Date:** 2026-07-24

## Tech Debt

### Unused Dependencies in package.json

- **Issue:** At least 8 packages listed in `package.json` have zero imports across the entire `src/` directory, indicating they were added preemptively or inherited from a template. These bloat `node_modules` (759MB, 431 packages for 474 lines of source), increase the dependency audit surface, and create confusion about the project's actual dependency footprint.
- **Packages never imported:**
  - `@hookform/resolvers` (v^5.4.0)
  - `@shopify/flash-list` (v2.0.2)
  - `expo-device` (v~57.0.1)
  - `expo-linking` (v~57.0.4)
  - `expo-web-browser` (v~57.0.2)
  - `react-hook-form` (v^7.82.0)
  - `zod` (v^4.4.3)
  - `zustand` (v^5.0.14)
- **Impact:** Install time is slower, dependency vulnerability surface is larger, and developers are misled about available patterns.
- **Fix approach:** Audit each unused package during the next feature phase. Uninstall packages that are not planned for imminent use. Add only when the feature that requires them is being implemented.

### Dead npm Script References Deleted Script

- **Issue:** The `package.json` `scripts` field contains `"reset-project": "node ./scripts/reset-project.js"`, but the `scripts/` directory and `reset-project.js` file have been deleted (shown as `D scripts/reset-project.js` in git status). Running `npm run reset-project` will fail.
- **Files:** `package.json` (line 48), `scripts/reset-project.js` (deleted)
- **Impact:** Minor; the `reset-project` command is a template convenience only needed during initial scaffolding. But it remains in the script list as a dead entry.
- **Fix approach:** Remove the `reset-project` script entry from `package.json`.

### global.css Migrated from src/ to Root

- **Issue:** The original `src/global.css` was deleted and a new `global.css` was added at the project root. `src/app/_layout.tsx` imports `../../global.css` (line 1). This is a non-standard location for Expo projects — `global.css` typically lives at the project root with import path `./global.css`. The change is functional but inconsistent with the expectation that `src/` contains all application code.
- **Files:** `global.css` (root), `src/app/_layout.tsx` (line 1), `src/global.css` (deleted)
- **Impact:** Low. Works correctly but is a deviation from standard Expo project conventions.
- **Fix approach:** Keep as-is since it works, or move back to `src/global.css` if convention consistency is desired.

## Known Bugs

- **None detected.** The codebase is too small (474 lines across 16 files) and consists entirely of simple placeholder screens and configuration. No runtime bugs were identified.

## Security Considerations

### No Environment Variable Management

- **Risk:** There is no `.env` file, no environment variable configuration, and no mechanism for injecting API keys, endpoints, or other secrets at build time. As features are added (API calls, authentication), developers may hardcode secrets directly into source code, which would commit them to version history.
- **Files:** No `.env*` files present. No env-related config in `app.json` or `eas.json`.
- **Current mitigation:** None. The app has no runtime secrets yet because it has no backend integration.
- **Recommendations:** Install and configure `expo-constants` for build-time env vars (already present as a dependency) or use `expo-secure-store` for runtime secrets. Add a `.env.example` file documenting required variables. Add `.env` and `.env.production` (without `.local` suffix) to `.gitignore`.

### No `.ipa` in `.gitignore`

- **Risk:** A 30MB `.ipa` build artifact (`build-1784852798657.ipa`) exists in the project root and is not listed in `.gitignore`. While this specific file is currently untracked, future `.ipa` build outputs could be accidentally committed, permanently bloating the git repository.
- **Files:** `.gitignore` (root), `build-1784852798657.ipa` (root, untracked)
- **Current mitigation:** None.
- **Recommendations:** Add `*.ipa` to `.gitignore` immediately.

## Performance Bottlenecks

### Minimal Codebase — No Bottlenecks Yet

- The application is in an early scaffolding stage with 474 lines of TypeScript across 16 files. No performance bottlenecks exist. The following may become performance concerns as the app grows:
  - **No FlashList usage:** `@shopify/flash-list` (v2.0.2) is installed but not imported. Any list rendering will default to React Native's `FlatList`, which has worse performance for long lists.
  - **No image optimization:** `expo-image` is installed but not used. Any image rendering will use `Image` from React Native, which lacks caching, blurhash, and progressive loading.
  - **No `useMemo`/`useCallback` usage:** The codebase is simple enough that memoization is unnecessary, but as components grow, this will need attention.

### 759MB node_modules for 474 Lines of Source

- **Problem:** The dependency graph installs 431 packages totaling 759MB for 474 lines of application code. This is excessive for the current scope and slows CI/CD pipelines, `npm install` times, and initial clones.
- **Files:** `package.json`, `node_modules/`
- **Cause:** The project inherits the full Expo SDK 57 dependency tree plus multiple unused packages.
- **Improvement path:** Remove unused dependencies. Consider `npm prune` after dependency cleanup. Monitor with `depcheck` or similar tooling.

## Fragile Areas

### drawer-content.tsx — Manual Route Filtering

- **Files:** `src/components/drawer-content.tsx`
- **Why fragile:** The component manually filters out routes named `"index"` and `"+not-found"` via a `HIDDEN_ROUTES` `Set`. As the app grows and more route files are added to `app/`, this set could fall out of sync, causing unwanted drawer entries or missing routes. The approach also reconstructs a filtered navigation state object (`filteredState`), which copies the full state and recalculates the index — this is a fragile workaround for Expo Router's auto-registration behavior.
- **Safe modification:** When adding new route files that should NOT appear in the drawer, add their names to `HIDDEN_ROUTES`. When adding route files that SHOULD appear, they likely need an explicit `<Drawer.Screen>` entry in `_layout.tsx` as well.
- **Test coverage:** None — no tests exist for any code in the project.

### header-drawer-button.tsx — Unsafe Type Cast on Navigation

- **Files:** `src/components/header-drawer-button.tsx`
- **Why fragile:** The `useNavigation("/")` result is cast to `{ toggleDrawer(): void; openDrawer(): void; closeDrawer(): void; }` (line 14-19). This is an unsafe type assertion — if the root navigator is ever changed from a Drawer to another navigator type, `toggleDrawer` will be `undefined` at runtime and the press handler will crash. The comment acknowledges this ("At runtime the method is always present when a Drawer is the root layout") but provides no runtime safety.
- **Safe modification:** If the root layout navigator type changes, this component must be updated. Consider adding a runtime guard or wrapping the call in an optional chain.
- **Test coverage:** None.

### colors.ts — Unsafe Non-Null Assertion

- **Files:** `src/theme/colors.ts` (line 17: `export const tint = Platform.select({...})!`)
- **Why fragile:** The `!` non-null assertion on `Platform.select` assumes one platform will always match. While `Platform.select` defaults to the `default` key on unrecognized platforms, the compiler cannot verify this. If the `default` key is ever removed or the `select` API changes, this will silently produce `undefined` and cause crashes in any component using `tint` as a color prop.
- **Safe modification:** Use a fallback: `Platform.select({...}) ?? "#007AFF"` instead of the non-null assertion.

### unstable-native-tabs API Usage

- **Files:** `src/app/(tabs)/_layout.tsx` (line 2: `import { NativeTabs } from "expo-router/unstable-native-tabs"`)
- **Why fragile:** The import path `/unstable-native-tabs` is explicitly marked as unstable. The API surface (`.Trigger`, `.Trigger.Icon`, `.Trigger.Label`) could change or be removed in future Expo Router releases. Any SDK update may require migration.
- **Safe modification:** Pin the Expo SDK version explicitly and test navigation after each SDK upgrade. Monitor Expo changelogs for stabilization of this API.
- **Test coverage:** None.

## Scaling Limits

### All Screens Are Placeholders

- **Current capacity:** Home, Search, Profile, and Settings screens each render a single centered `<Text>` label. There is no data fetching, no state management, no user interaction, and no navigation beyond the drawer/tab structure.
- **Limit:** The app is not usable in any meaningful sense. No features exist beyond navigation scaffolding.
- **Scaling path:** Features must be implemented from scratch. No existing business logic exists to refactor or extend.

| Screen | File | Content |
|--------|------|---------|
| Home | `src/app/(tabs)/home/index.tsx` | Centered "Home" text |
| Search | `src/app/(tabs)/search/index.tsx` | Centered "Search" text |
| Profile | `src/app/(tabs)/profile/index.tsx` | Centered "Profile" text |
| Settings | `src/app/settings/index.tsx` | Centered "Settings" text |

### No Data Fetching Infrastructure

- React Query (`@tanstack/react-query`) is set up in `src/app/_layout.tsx` with a `QueryClient` and online/focus manager listeners, but no queries, mutations, query keys, or hook wrappers exist anywhere in the codebase. The entire data layer is absent.

## Dependencies at Risk

### React Compiler Experiment Enabled

- **Risk:** `app.json` has `"experiments": { "reactCompiler": true }` (line 43). The React Compiler is an experimental Babel plugin. It may cause unexpected build failures, incorrect re-render behavior, or compatibility issues with current Expo SDK 57 builds.
- **Files:** `app.json` (line 43)
- **Impact:** If this experiment is unsupported or buggy in the current Expo SDK version, it could cause hard-to-debug rendering bugs or build failures that are difficult to trace.
- **Migration plan:** If build issues arise, set `"reactCompiler": false` to disable. Re-evaluate when the React Compiler reaches stable status.

### TypeScript 6.0

- **Risk:** The project uses `typescript ~6.0.3` (line 44 of `package.json`). TypeScript 6.0 is a very new major version. Third-party type definitions may not be fully compatible yet, potentially causing type errors or requiring `@ts-expect-error` workarounds.
- **Impact:** Type resolution failures for packages that haven't updated their types for TS 6.0. At minimum, increased `tsconfig.json` maintenance.
- **Migration plan:** If type errors become frequent, pin to TypeScript 5.x until the ecosystem catches up.

## Missing Critical Features

### No Error Handling Boundary

- **Problem:** The root layout (`src/app/_layout.tsx`) wraps the app in `GestureHandlerRootView` and `QueryClientProvider`, but there is no `ErrorBoundary` component wrapping the application tree. Any unhandled JavaScript error will cause a full-screen crash on device with no recovery UI.
- **Files:** `src/app/_layout.tsx` (root layout)
- **Blocks:** Graceful error recovery and user-facing error states.
- **Recommendation:** Add an `ErrorBoundary` component wrapping the root layout, with a "Try Again" fallback UI.

### No Linting or Formatting Configuration

- **Problem:** The `package.json` `scripts` section includes `"lint": "expo lint"`, but there is no ESLint config file (`.eslintrc*`, `eslint.config.*`) or Prettier config (`.prettierrc*`) in the project root. Running `npm run lint` will fail or produce no meaningful output. There is no automated code style enforcement.
- **Files:** No ESLint config. No Prettier config. `package.json` line 52.
- **Blocks:** Consistent code style enforcement, automated PR checks.
- **Recommendation:** Run `npx expo lint` to generate ESLint config, or manually create `eslint.config.mjs` with `expo` and `typescript-eslint` presets. Add Prettier for formatting.

### No Test Infrastructure

- **Problem:** There is no test runner config (`jest.config.*`, `vitest.config.*`), no test files, and no test scripts in `package.json`. The entire codebase has zero test coverage.
- **Files:** No test configuration files exist.
- **Blocks:** Safe refactoring, regression detection, CI/CD quality gates.
- **Recommendation:** Install Jest or Vitest with React Native testing utilities. Set up a `test` script in `package.json`. Add at least smoke tests for each screen and unit tests for utilities like `cn()`.

### No CI/CD Pipeline

- **Problem:** `eas.json` defines build profiles (development, preview, production) but there is no CI configuration file (no `.github/workflows/`, no `bitrise.yml`, no `appcenter-post-clone.sh`). Builds must be triggered manually via `eas build` from a developer's machine.
- **Files:** `eas.json` (build profiles defined, but no CI integration)
- **Blocks:** Automated testing on PRs, automated deployment to TestFlight/Play Store, release process consistency.
- **Recommendation:** Add a GitHub Actions workflow (or other CI) that runs lint, type checking, and tests on PRs, and optionally triggers EAS Build on merge to main.

## Test Coverage Gaps

- **What's not tested:** Everything. Zero test files exist in the project. No unit tests, no integration tests, no E2E tests.
- **Files:** All source files.
- **Risk:** Any code change may introduce regressions without detection. Refactoring is unsafe. The placeholder screens are trivial enough that the practical risk is low today, but the infrastructure gap will become critical as soon as real features are added.
- **Priority:** High — must be addressed before implementing significant features.

---

*Concerns audit: 2026-07-24*
