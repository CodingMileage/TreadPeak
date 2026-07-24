# External Integrations

**Analysis Date:** 2026-07-24

## APIs & External Services

**No external API integrations are currently connected.**

The project has the data-fetching infrastructure in place (TanStack React Query configured in `src/app/_layout.tsx`), but no API endpoints, SDK clients, or service integrations have been wired up yet. All screen content is placeholder text.

**Detected patterns indicating future API usage:**
- `@tanstack/react-query` ^5.101.4 is configured with online and focus management, ready for server state
- `zustand` ^5.0.14 is available for client-side state that may interact with API data
- `react-hook-form` ^7.82.0 + `zod` ^4.4.3 + `@hookform/resolvers` ^5.4.0 are present for form validation, suggesting future data submission flows

## Data Storage

**Databases:**
- None detected. No ORM, database client, or backend service is configured.

**Local Storage:**
- Not yet configured. No local persistence library (e.g., `AsyncStorage`, `expo-secure-store`, `expo-sqlite`, `react-native-mmkv`) is installed.

**File Storage:**
- Local filesystem only for bundled assets in `assets/` directory (images, icons, splash screen).

**Caching:**
- React Query's in-memory cache is configured with a 1-minute `staleTime` (`src/app/_layout.tsx:52`), but no persistent cache layer is present.
- No service worker or offline cache strategy detected.

## Authentication & Identity

**Auth Provider:**
- None. No auth SDK (e.g., Supabase Auth, Firebase Auth, Clerk, Auth0) is installed or configured.
- No authentication flows, login screens, or session management exist.

## Monitoring & Observability

**Error Tracking:**
- None. No error monitoring SDK (Sentry, Bugsnag, etc.) is installed.
- No unhandled rejection or error boundary handling beyond React defaults.

**Logs:**
- No logging framework detected. Only `console.log`-level debugging would be available.

## CI/CD & Deployment

**Hosting:**
- Not yet deployed. EAS Build is configured with three profiles (`development`, `preview`, `production`) in `eas.json`.
- EAS project ID: `72620361-2592-4ef2-8a13-63e8e5b54e33` (stored in `app.json`)
- Web output is set to `static` in `app.json`, but no web hosting platform is configured.

**CI Pipeline:**
- None. No GitHub Actions, GitLab CI, or other CI configuration files detected.

## Environment Configuration

**Required env vars:**
- None currently required. No `.env` files exist in the project.
- `.env*.local` is gitignored, indicating environment files may be added per developer machine.
- The project uses `expo-constants` for runtime config access but no `EXPO_PUBLIC_*` variables are defined.

**Secrets location:**
- No secrets infrastructure detected. EAS Build secrets would be managed through the EAS dashboard.
- EAS `appVersionSource: "remote"` is configured in `eas.json`, which requires EAS server-side version management.

## Webhooks & Callbacks

**Incoming:**
- None. No webhook endpoints are defined (no `+api` route files exist in `src/app/`).

**Outgoing:**
- None. No outgoing webhook calls are implemented.

## Third-Party SDKs

**SDKs currently installed (no API keys configured):**
- `@shopify/flash-list` 2.0.2 - High-performance list rendering (local-only, no network dependency)
- `@react-native-community/netinfo` 12.0.1 - Network status detection (used by React Query's online manager in `src/app/_layout.tsx:42-47`)
- `react-native-gesture-handler` ~2.32.0 - Gesture handling (local-only)
- `react-native-reanimated` 4.5.0 - Animations (local-only)
- `expo-symbols` ~57.0.1 - SF Symbols (local-only, iOS native)
- `expo-image` ~57.0.1 - Optimized image loading (could load remote images but no URLs configured)

## Infrastructure Status Summary

| Integration | Status | Notes |
|---|---|---|
| API client | Not configured | React Query ready, no endpoints wired |
| Database | Not configured | No backend or local DB |
| Auth | Not configured | No auth provider |
| File storage | Bundled assets only | `assets/` directory |
| Error monitoring | Not configured | No SDK installed |
| Logging | None | No structured logging |
| CI/CD | EAS Build configured | No CI pipeline |
| Deployment | Not deployed | EAS configured, no deployments |
| Secrets | Not configured | No env vars defined |
| Webhooks | None | No API routes exist |

---

*Integration audit: 2026-07-24*
