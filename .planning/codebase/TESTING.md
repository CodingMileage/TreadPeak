# Testing Patterns

**Analysis Date:** 2026-07-24

## Test Framework

**Runner:**
- Not configured. No test runner (Jest, Vitest, etc.) is installed or configured.
- No `jest.config.*` or `vitest.config.*` files found in the repository.
- No test-related dependencies in `package.json` `devDependencies`.

**Assertion Library:**
- Not configured. No assertion library installed.

**Run Commands:**
- No test commands defined in `package.json` scripts.

## Test File Organization

**Location:**
- Not yet established. No test files exist anywhere in the project (`*.test.*`, `*.spec.*`).
- The project skill `expo-project-structure` recommends **colocating tests** next to source files (e.g., `format-date.test.ts` beside `format-date.ts`) rather than a separate `__tests__/` directory.

**Naming:**
- No existing convention established.
- The project skill suggests `format-file.cs.test.ts` pattern (colocated, `.test.ts` suffix).

**Structure:**
- No test directories exist.

## Test Structure

**Test Suite Organization:**
- No existing test structure to reference.

**Recommended Patterns (from expo-project-structure skill):**
```
src/
  utils/
    format-date.ts
    format-date.test.ts     # Colocated test
```

## Mocking

**Framework:**
- Not configured. No mocking library installed.

**What to Mock:**
- Not yet established. Given installed dependencies, likely candidates for mocking:
  - `@tanstack/react-query` hooks
  - `@react-native-community/netinfo`
  - `expo-router` navigation hooks
  - `react-native-safe-area-context`

**What NOT to Mock:**
- Not yet established.

## Fixtures and Factories

**Test Data:**
- No fixture files exist.

**Location:**
- Not yet established. A `src/test/fixtures/` or `src/__fixtures__/` directory may be created as the project grows.

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:**
- No coverage commands available.

## Test Types

**Unit Tests:**
- Not implemented. No test files exist.

**Integration Tests:**
- Not implemented. No test files exist.

**E2E Tests:**
- Not detected. No E2E framework (Detox, Maestro, etc.) installed.

## Testing Gaps

**Current state:** The codebase has zero test coverage.

**What needs testing:**
- `src/theme/colors.ts` — color mapping logic
- `src/lib/cn.ts` — Tailwind class merging utility
- `src/components/drawer-content.tsx` — drawer route filtering and rendering
- `src/components/header-drawer-button.tsx` — drawer toggle interaction
- `src/app/_layout.tsx` — React Query setup, online/focus manager configuration
- Each route screen as they grow beyond placeholders

## Setup Required

To add testing to this project, the following is needed:

1. **Test runner:** Install and configure Jest or Vitest
   - For Expo/React Native, `jest-expo` is the recommended preset: `npx expo install jest-expo @types/jest`
   - Or for Vitest: `vitest` with `react-native` support

2. **Testing library:** `@testing-library/react-native` for component tests, or `@testing-library/react` for web

3. **Test script:** Add to `package.json`:
   ```json
   "scripts": {
     "test": "jest",
     "test:watch": "jest --watch",
     "test:coverage": "jest --coverage"
   }
   ```

4. **Jest config example** (for Jest with Expo):
   ```js
   // jest.config.js
   module.exports = {
     preset: "jest-expo",
     transformIgnorePatterns: [
       "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
     ],
     setupFilesAfterSetup: ["<rootDir>/jest.setup.ts"],
   };
   ```

5. **File colocation:** Follow the project convention of placing `*.test.ts(x)` files next to their source files in the same directory.

---

*Testing analysis: 2026-07-24*
