# Domain Pitfalls: Fitness Tracking Apps

**Domain:** Walking-focused fitness tracker with food logging and leaderboards
**Researched:** 2026-07-24
**Overall confidence:** HIGH (multiple verified sources across all sub-domains)

---

## Critical Pitfalls

Mistakes that cause rewrites, app store rejections, or major user churn.

### Pitfall 1: HealthKit Authorization Sheet Never Appears (iOS)

**What goes wrong:** The HealthKit permission dialog simply never shows, making `getStepCount` and other queries return nothing. Multiple developers report this as their first and most frustrating roadblock.

**Root cause:** One or more of these missing:
- `NSHealthShareUsageDescription` in `Info.plist`
- `NSHealthUpdateUsageDescription` in `Info.plist`
- `com.apple.developer.healthkit` entitlement for the bundle ID
- Using Expo Go (does not support native health libraries) instead of a custom dev client
- Missing or misconfigured `react-native-health` config plugin in `app.json`

**Consequences:** Health features appear broken. Zero data shown. Weeks of debugging config instead of building features.

**Detection:** Build logs won't warn you. Test on a real device (not simulator) — the dialog only appears on physical devices. If you see no prompt, check `Info.plist` and entitlements in the built binary.

**Prevention:**
1. Add the config plugin to `app.json` with explicit permission strings
2. Run `npx expo prebuild --clean` after any config change
3. Use `eas build --profile development` always (never Expo Go)
4. Verify the entitlement on the Apple Developer portal matches your bundle ID
5. Add `PrivacyInfo.xcprivacy` (required since 2024, missing it = automatic rejection)

**Warning signs:** `initHealthKit` resolves but no dialog appears. Step queries return zero without errors.

**Reference sources:** Apple Developer Forums, kingstinct/react-native-healthkit Issues #86, Stack Overflow

**Phase mapping:** Phase 2 (Step Tracking) — address in initial HealthKit setup, not after.

---

### Pitfall 2: Health Connect Silent Failure / Clean Build Required (Android)

**What goes wrong:** After configuring `react-native-health-connect` in `app.json`, the app builds and installs but `HealthConnect` module can't be found at runtime. The error `TurboModuleRegistry.getEnforcing(...): 'HealthConnect' could not be found` appears.

**Root cause:** The most frequent cause is **stale native build cache**. A simple `npm install` + Metro restart is insufficient — the native binary doesn't include the new module. Must force a clean native prebuild.

**Compounding issues:**
- `minSdkVersion` defaults too low (need 26+)
- Missing `expo-health-connect` plugin
- Kotlin version mismatch
- Missing intent filter for permission rationale screen
- Bridgeless mode breaking native modules (Expo SDK 51+)

**Consequences:** Android health features broken. Developer wastes hours on cache-clearing loops.

**Detection:** Run `npx expo run:android` (not just `npx expo start`) and watch for TurboModule errors.

**Prevention:**
1. Install `react-native-health-connect`, `expo-health-connect`, `expo-build-properties`, `expo-dev-client`
2. Set `minSdkVersion: 26`, `compileSdkVersion: 34` via `expo-build-properties`
3. Add a custom Android manifest plugin for the permissions rationale intent filter
4. After any dependency change, run: `npx expo prebuild --platform android --clean`
5. For Play Store: complete Health Connect API Declaration Form (7-10 business days approval)

**Warning signs:** Health Connect screen opens but no data appears. `requestPermission` hangs indefinitely (known bug with some library versions).

**Reference sources:** deepwiki.com/matinzd/react-native-health-connect, GitHub issues #127, #137, Stack Overflow

**Phase mapping:** Phase 2 (Step Tracking) — must get this right before Android testing is possible.

---

### Pitfall 3: Background Health Data Delivery Stops After Force-Quit

**What goes wrong:** When a user force-quits the app (swipes it away), HealthKit's `HKObserverQuery` background deliveries stop entirely — permanently, until the user manually opens the app again. iOS sets a flag that prevents background relaunch.

**Root cause:** Apple's intentional design for user control. No documented override exists.

**Consequences:** Step data goes stale. Leaderboard stops updating. User sees yesterday's data and assumes the app is broken. Compounding effect: competitive users are most likely to notice stale data and most likely to churn.

**Detection:** Check app's last sync timestamp on the server. If a user hasn't synced in 12+ hours despite being active, they likely force-quit.

**Prevention:**
1. Onboarding education: "Keep TreadPeak open in the background for automatic step sync. Force-closing the app pauses data collection."
2. Push notification fallback: if server detects no sync in 8+ hours, send a gentle nudge ("Tap to resume step tracking")
3. App badge or widget showing "Last synced: X hours ago" to make staleness visible
4. Implement pull-to-refresh on the dashboard so users can manually sync after reopening

**Warning signs:** Server shows sync gaps that correspond to specific times of day (suggesting app was closed overnight and not reopened until commute).

**Reference sources:** Apple Developer Forums thread #803365, Apple engineer confirmation

**Phase mapping:** Phase 2 (Step Tracking) — design sync architecture with this assumption from day one.

---

### Pitfall 4: App Store Rejection — HealthKit UI Guideline 2.5.1

**What goes wrong:** Apple rejects the app for not clearly identifying HealthKit-sourced data in the UI. Even with privacy labels, permission strings, and onboarding copy, developers report repeated rejections.

**Root cause:** Apple requires a **permanent, visible label** like "Health data sourced from Apple Health" displayed alongside health metrics — not just in settings or onboarding.

**Consequences:** Last-minute rejection delays launch. Requires a point-release just for a UI label.

**Detection:** Review guidelines before submission. If your step count display doesn't have a permanent "from Apple Health" attribution, you will likely be rejected.

**Prevention:**
1. Add "via Apple Health" or "Sourced from Apple Health" as a permanent subtitle below step counts
2. Make it visible on the main dashboard, not buried in settings
3. Ensure `PrivacyInfo.xcprivacy` is bundled (auto-rejection if missing)
4. Prepare a compliance statement for App Review explaining how the app uses HealthKit

**Reference sources:** Apple App Store Review Guidelines, Apple Developer Forums

**Phase mapping:** Phase 2 (Step Tracking) — design the dashboard UI with this attribution visible from the start.

---

### Pitfall 5: Open Food Facts HTTP 200 Trap

**What goes wrong:** Invalid or missing barcodes return HTTP 200 with `status: 0` and an empty product object — not a 404 error. Worse, different product databases (e.g., Pet Food Facts vs. main OFF) behave differently for the same barcode (one returns 200+empty, the other returns 404).

**Root cause:** The API uses a two-tier response structure: HTTP status indicates the request was processed, `body.status` (0 or 1) indicates whether a product was found. Naive error handling checks HTTP status only.

**Consequences:** App shows "Product found!" with blank nutrition data. User confusion. Crashes if code accesses fields on the empty `product: {}` object.

**Detection:** The first time you search a barcode that doesn't exist, you'll get a 200 with `status: 0` and wonder why your product detail screen is blank.

**Prevention:**
1. Always check `response.data.status === 1` — never rely on HTTP status code
2. Check `response.data.product` exists and has expected fields before rendering
3. Add defensive: `if (!product?.nutriments) return { error: 'incomplete' }`
4. Build a typed response parser that normalizes all OFF responses

**Warning signs:** Barcode scan returns "Product found" with blank detail screen.

**Reference sources:** Open Food Facts GitHub issues #9770, OFF forum discussions, developer blog posts

**Phase mapping:** Phase 3 (Food Logging) — build the API client wrapper with this handling from the start.

---

### Pitfall 6: Open Food Facts Energy Units Trap

**What goes wrong:** The `nutriments.energy` field defaults to **kilojoules (kJ)**, not kilocalories (kcal). Developers who grab the bare `energy` field and display it as "calories" introduce a ~4.19x error — a 2000 kJ food displayed as "2000 calories" when it's really ~478 calories. The field name is ambiguous at a glance.

**Root cause:** OFF stores energy in kJ internally. The API exposes both `_kj` and `_kcal` variants, plus `_100g` and `_serving` bases. Mixing bases (e.g., using `_100g` value for a serving display) produces plausible-looking wrong numbers.

**Consequences:** Users see wildly incorrect calorie counts. Trust is destroyed. If this affects food diary totals, every logged meal is wrong.

**Detection:** Spot-check known foods against their labels. A Big Mac should show ~540 kcal, not ~2250.

**Prevention:**
1. Always use `nutriments["energy-kcal_100g"]` explicitly — never `nutriments.energy`
2. Build a typed accessor: `getCaloriesPer100g(product) => product.nutriments["energy-kcal_100g"] ?? 0`
3. Never use the bare `energy` field
4. Normalize all values to consistent units (kcal, grams) at the API boundary layer
5. Implement plausibility checks: protein + carbs + fat (grams) should not significantly exceed serving weight

**Reference sources:** OFF API documentation, developer experience reports from Vital and Dietly projects

**Phase mapping:** Phase 3 (Food Logging) — the API client layer must normalize units before any UI code sees the data.

---

### Pitfall 7: Open Food Facts Search-As-You-Type Is Impractical

**What goes wrong:** Text search via the live OFF API has 300-800ms latency on mobile connections, results are ordered by last-edit date (not relevance), and the API is not designed for high-frequency per-keystroke queries. Typing "chicken breast" fires 12+ API calls with the first few returning irrelevant results.

**Root cause:** OFF is a community database optimized for bulk import and barcode lookup, not real-time text search. Results sorted by last-modified, not by relevance to the query.

**Consequences:** Search feels broken. User types "chicken" and sees condiments because they were edited more recently. User gives up and doesn't log food.

**Detection:** Open a network tab while searching. Watch 12+ requests fire. Notice "apple" returns yogurt before actual apples.

**Prevention:**
1. Implement debounced search (300ms minimum delay, cancel in-flight requests)
2. Cache popular search results in a local SQLite database (`expo-sqlite`)
3. For moderate scale: build a self-hosted API shim using DuckDB + OFF Parquet exports (sub-5ms search)
4. For MVP: accept the limitation, show loading states, and prioritize barcode scanning as the primary food entry method
5. Consider downloading the OFF search index for offline BM25 search (~40MB, instant responses)

**Warning signs:** Users type but never tap a result. Search feels sluggish in testing.

**Reference sources:** OFF knowledge base, Vital (BM25) project, openfoodfacts-serving (DuckDB shim)

**Phase mapping:** Phase 3 (Food Logging) — design search UX assuming slow/imperfect results. Barcode-first approach mitigates this.

---

### Pitfall 8: Leaderboard Step Data Can Be Gamed (Cheating)

**What goes wrong:** Step data is trivially gameable. Users can shake their phone, attach it to a fan, a pet, or a Roomba, or use device-level accelerometer spoofing tools. A determined user can generate 100,000 "steps" in an hour.

**Root cause:** Step counting via phone accelerometer is inherently noisy. There is no cryptographic proof that steps were walked by a human. HealthKit and Health Connect do not verify step authenticity — they report what the accelerometer detects.

**Consequences:** Competitive leaderboards become meaningless. Legitimate users see impossible step counts (500k+ steps/day) and stop engaging. Strava's experience: millions of fraudulent activities removed, leaderboard trust fundamentally challenged.

**Detection:**
- Impossible daily totals (>150,000 steps is biologically improbable)
- Step distribution that doesn't match walking patterns (no rest periods, consistent minute-by-minute counts)
- Sudden spikes that correlate with device charging or stationary periods
- User reports of "obviously cheated" scores (the fastest detection signal)

**Prevention:**
1. Apply server-side sanity filters: cap daily steps at a biologically plausible maximum (e.g., 150,000)
2. Analyze step velocity: steps/minute > 200 for extended periods suggests device shaking
3. Require HealthKit/Health Connect as the data source (not manual entry) — this eliminates the easiest cheating vector
4. Implement a trust score per user based on data patterns; flag anomalous users for manual review
5. Build for transparency: show step source (phone vs. wearable) and let users flag suspicious scores
6. Accept that some cheating is inevitable. Strava's CEO calls bizarre leaderboard cheats "an upside" — they show people care enough to cheat. Design leaderboards so one bad actor doesn't ruin everyone's experience.

**Warning signs:** One user has 10x the step count of the #2 user. Daily steps are suspiciously round numbers (exactly 50,000 every day).

**Reference sources:** Strava Engineering blog, marathonhandbook.com analysis, Strava CEO interview

**Phase mapping:** Phase 4 (Leaderboards) — build detection into the server-side score ingestion, not as an afterthought.

---

### Pitfall 9: Leaderboard Performance Collapse at Scale

**What goes wrong:** The leaderboard query `SELECT * FROM users ORDER BY steps_today DESC LIMIT 100` runs a full table scan on every page load. At 10,000 users it's fine; at 100,000 users it starts to stutter; at 1M users it times out or costs a fortune.

**Root cause:** Relational databases do a full sort on every query unless you use specialized techniques. Sorting millions of rows to find the top 100 is expensive.

**Consequences:** Dashboard takes seconds to load. User experience degrades. Backend costs spike.

**Detection:** Monitor query execution time on the leaderboard endpoint. Track its growth relative to user count (should be O(log N), not O(N)).

**Prevention:**
1. Use Redis Sorted Sets for the live leaderboard — O(log N) inserts, O(1) rank lookups, O(log N + M) top-N queries
2. Keep PostgreSQL as the system of record but push leaderboard writes to Redis asynchronously
3. For time-windowed leaderboards (daily, weekly, monthly), use separate sorted sets per period
4. Consider `pg_trickle` (PostgreSQL extension) if you want to avoid the dual-write problem while maintaining SQL query capability
5. Shard by region for geo-filtered leaderboards — each region gets its own sorted set
6. Cache the top-N with TTL; don't query the sorted set on every page load

**Warning signs:** Leaderboard endpoint response time grows with user count. Database CPU pins at 100% during peak hours.

**Reference sources:** Redis leaderboard tutorials, AWS Gaming Database guide, pg_trickle benchmarks

**Phase mapping:** Phase 4 (Leaderboards) — design architecture with Redis Sorted Sets from day one, not as a migration.

---

### Pitfall 10: Location Privacy Exposure Through Geo-Filtered Leaderboards

**What goes wrong:** Geo-filtered leaderboards that show "people near you" can reveal a user's precise location, home address, and daily routines. Strava's segment leaderboards have been used to identify military personnel at sensitive bases, track government officials, and enable physical stalking.

**Root cause:** By design, location-filtered features need location data. But if the granularity is too precise (e.g., "within 100m"), a user's home address is trivially derived. Even city-level filtering can be identifying in sparsely populated areas.

**Consequences:**
- User safety risk (stalking, doxxing)
- Regulatory risk (Washington My Health My Data Act, CCPA)
- PR crisis if user location data is exposed
- App store review scrutiny

**Detection:** Before launch, map your geo-filter options against known privacy attack vectors. If you can identify a user's home from the leaderboard, you have a problem.

**Prevention:**
1. Never show precise location. Use fuzzy geolocation (city, neighborhood, zip code — not lat/lng).
2. Default leaderboard to city-level visibility. Offer "neighborhood" as an opt-in, never the default.
3. Implement privacy zones: hide a user's data within a configurable radius of their home (like Strava's privacy zones).
4. Make leaderboard visibility per-leaderboard: user chooses "city only" vs "friends only" vs "global" for each filter.
5. Never store precise location history on the server. Only store the coarse location (city/zip) derived on the client.
6. Clearly explain in onboarding why location is needed and how coarse it is.

**Warning signs:** Any UI that shows a map with user pins, or a leaderboard that says "0.2 miles away."

**Reference sources:** Bellingcat's Strava investigation toolkit, USENIX Security paper on location privacy, Washington My Health My Data Act

**Phase mapping:** Phase 4 (Leaderboards) and Phase 5 (Friend Discovery) — must be designed before any location data is stored.

---

### Pitfall 11: Health Data Privacy — The HIPAA Misconception

**What goes wrong:** Teams building health/fitness apps assume their health data is protected by HIPAA and design accordingly (or not at all). In reality, **HIPAA does not apply to most consumer fitness apps**. HIPAA covers only "Covered Entities" (healthcare providers, insurers) and their "Business Associates." A standalone fitness app is a Non-Covered Entity.

**Root cause:** HIPAA's privacy protection is based on **who holds the data, not the type of information**. A hospital sharing step data with you is HIPAA-regulated. You collecting it from HealthKit is not.

**Consequences:**
- False sense of security leads to lax data protection
- No BAA signed with analytics SDKs (Google Analytics, Mixpanel) that log user behavior to third-party servers
- FTC enforcement for deceptive privacy practices (even without HIPAA, the FTC can pursue unfair/deceptive acts under Section 5)
- State law liability: Washington My Health My Data Act (opt-in consent, private right of action), CCPA (transparency, access rights)
- No business associate agreements with cloud providers = data can be accessed by cloud provider employees

**Detection:** Review your data flow. If step data, food logs, or location data touches any third-party SDK (analytics, crash reporting, ad networks) without a data processing agreement, you have a gap.

**Prevention:**
1. Adopt Privacy-by-Design: process health data on-device where possible, send only non-identifiable aggregates to the server
2. Sign Data Processing Agreements with every third-party that touches health data (analytics, crash reporting, cloud infra)
3. Never send health data to ad networks, attribution tools, or social media SDKs
4. Write a clear, specific privacy policy explaining exactly what health data is collected, why, and with whom (if anyone) it's shared
5. Use `expo-secure-store` for any health data stored locally (encrypted storage)
6. Encrypt health data at rest on the server
7. Track state-level regulations: Washington My Health My Data Act requires opt-in consent for health data collection
8. Consider that CCPA/CPRA includes health data as sensitive personal information

**Warning signs:** Analytics dashboard shows HealthKit step data. Crash reporter captures food log contents. Privacy policy uses vague language like "may share with partners."

**Reference sources:** HHS FAQ clarifications, Dickinson Wright legal analysis, AccountableHQ compliance guides, FTC GoodRx enforcement action

**Phase mapping:** Phase 1 (Auth & Infrastructure) — establish data handling policies before any health data collection begins.

---

### Pitfall 12: Permission Fatigue Kills Activation (Onboarding Friction)

**What goes wrong:** The app requires upfront account registration, then requests HealthKit/Health Connect permissions, then location permission, then contacts permission — all before the user sees any value. Each permission prompt is a potential drop-off point. 40% of users abandon an app during onboarding.

**Root cause:** The app has four permission gates (auth, health data, location, contacts) and no "value-first" moment. Users are asked to commit before they understand why.

**Consequences:** Terrible activation rate. High cost-per-install with no return. User never sees the actual product.

**Detection:** Track drop-off at each permission prompt in your funnel analytics. If >30% of users who reach a permission prompt don't proceed, you have a permission fatigue problem.

**Prevention:**
1. **Value-first onboarding**: Show the dashboard or a preview before asking for any permissions. Let the user see what the app does. Breathwrk achieved 67% higher day-1 retention by guiding users through a session before asking for anything.
2. **Prime permissions**: Display a custom interstitial screen explaining WHY each permission is needed before the system dialog. This lifts opt-in rates by 20-40%.
3. **Just-in-time permissions**: Don't batch all requests at first launch. Request health permission when user lands on step dashboard. Request location when they first tap the leaderboard. Request contacts when they tap "Find Friends."
4. **Account-later consideration**: Although the spec says "account required upfront," consider allowing the user to see a demo dashboard or sample data before signing up. Even a 2-screen preview before the auth gate improves conversion.
5. **Minimum viable permissions**: Only request the permissions needed for the current flow. Don't request contacts at the same time as health data.

**Warning signs:** Auth flow has high completion but health permission prompt has 50%+ drop-off. Users install but never complete onboarding.

**Reference sources:** MarTechVibe retention analysis, Breathwrk case study, Stubbs.Pro user deletion analysis

**Phase mapping:** Phase 1 (Auth & Infrastructure) — design the onboarding flow before any feature code, with permission priming built in.

---

### Pitfall 13: The Cold-Start Problem — App Knows Nothing About You

**What goes wrong:** The moment a user is most motivated (days 1-7) is the exact moment the app knows the least about them. The app shows empty charts, zero step data, and "no foods logged today" — a blank slate that communicates "nothing is happening here." 77% of users churn within 3 days.

**Root cause:** Personalization requires history. History takes time. Week 1 is when the app needs personalization most and has data least.

**Consequences:** User sees an empty dashboard, doesn't know what to do, and never comes back. The app failed to answer "what should I do now?"

**Detection:** High first-session churn. Users who register and grant permissions but never return. Zero step history shown on first load.

**Prevention:**
1. **Import historical health data**: HealthKit and Health Connect can provide up to 30 days of historical step data (with user permission). Request this during initial auth so the dashboard shows "your last 7 days" instead of "no data yet."
2. **Zero-decision launch**: When the user opens the app for the first time, immediately show their step count for today and yesterday. No selecting goals, no setting up preferences — just data. They can configure later.
3. **Celebrate the first reading**: When the first step sync completes, show a confirmation. "You walked 2,341 steps today." Make the first interaction rewarding.
4. **Micro-commitment goals**: Instead of asking the user to set a step goal, default to "10,000 steps" and let them adjust later. Decision cost is lower than choice.
5. **Quick-win call to action**: After showing their current step count, suggest a simple next step: "Search for a food you ate today" or "See how you rank in your city." Don't leave them wondering what to do.

**Warning signs:** Dashboard shows empty charts on first load. Users who complete onboarding have zero sessions on day 2.

**Reference sources:** Sahha.ai cold-start analysis, MarTechVibe retention data, Stubbs.Pro fitness app study

**Phase mapping:** Phase 1 (Auth & Infrastructure) and Phase 2 (Step Tracking) — historical data import should be part of the initial auth flow, not a later feature.

---

### Pitfall 14: Barcode Scanning Is Less Reliable Than Expected

**What goes wrong:** Users scan a barcode and get "product not found" for valid packaged foods, or the wrong product, or incomplete data. Barcode scanning feels broken and the user switches to a competitor.

**Root cause:** Open Food Facts has ~3M+ products, but coverage is uneven. Store brands (prepared in-store items) often lack EAN barcodes. Non-EAN-13 barcodes (common outside North America/Europe) may fail image resolution. Scanned barcode normalization (padding short codes) differs between the API and the image CDN, causing images to fail for non-standard barcodes.

**Consequences:** Barcode scanning becomes a frustration instead of a convenience. Users revert to manual search (which has its own problems).

**Detection:** Test with 50 common household products. Track the percentage that return valid, complete data. If <70%, the scan experience will feel broken.

**Prevention:**
1. Set clear expectations: show a "scanning..." state, then handle "not found" gracefully — suggest text search or manual entry as a fallback
2. Handle the inconsistent `code` field type (sometimes int, sometimes string) in the API response
3. For non-EAN-13 barcodes (8-digit, >13-digit), implement custom image URL construction or fallback to no-image display
4. Implement retry logic: on scan failure, try once more after normalizing the barcode (padding, stripping dashes)
5. Cache recently scanned products locally so re-scans are instant
6. Provide a "report missing product" flow that submits to OFF (contributes to the community and gives the user a sense of contribution)

**Warning signs:** User scans a common product (Coca-Cola, Kraft Mac & Cheese) and gets "not found." Barcode scan returns product title but no image.

**Reference sources:** Open Food Facts GitHub issues #9770, #12166, OFF forum discussions

**Phase mapping:** Phase 3 (Food Logging) — design the scan flow assuming a significant miss rate. Never let a failed scan dead-end the user.

---

### Pitfall 15: Contact Sync Stores Phone Numbers Indefinitely

**What goes wrong:** When the user syncs their contacts for friend discovery, the app uploads and stores their entire address book on the server — including phone numbers and email addresses of non-users. This data creates liability (who owns the contact sync data? Can a non-user request deletion?), violates privacy expectations, and can trigger regulatory scrutiny.

**Root cause:** Phone numbers of non-users are Personally Identifiable Information (PII). Storing them without explicit consent from those individuals is legally questionable in many jurisdictions (GDPR, CCPA, Washington My Health My Data Act).

**Consequences:**
- If a non-user's data is in your database without their consent, you may violate privacy regulations
- If your contact database is breached, you're liable for exposing non-users' data
- App store privacy nutrition labels must disclose this practice
- User trust erosion if they discover their contacts were stored

**Detection:** Review your data flow for friend discovery. If phone numbers or email addresses of non-users persist in your database (not just hashed and matched), you have this problem.

**Prevention:**
1. Never store raw contact data. Hash phone numbers client-side before sending to the server.
2. Use a hash-based matching system: client sends hashed phone numbers, server checks for matching hashes, returns matches, discards the rest.
3. If you must store contact data (e.g., for ongoing notifications when contacts join), get explicit consent and provide a clear deletion mechanism.
4. Follow Strava's model: use email addresses (from contacts) for matching, not phone numbers. Phone numbers are more sensitive and harder to hash-match consistently.
5. Make contact sync opt-in with a clear explanation: "We'll check your contacts to find friends. No data is stored."
6. Implement a "Remove contacts" setting that allows users to delete their synced contact data.

**Warning signs:** Contact data stored as plain text in the database. No deletion flow for contact data. Privacy policy doesn't mention contact handling.

**Reference sources:** Strava Support (contact sync handling), Fitbit privacy policy, Washington My Health My Data Act requirements

**Phase mapping:** Phase 5 (Friend Discovery) — design the contact sync architecture with privacy-first matching before writing any sync code.

---

## Moderate Pitfalls

### Pitfall 16: Food Diary UX — Counting Entries, Not Completion

**What goes wrong:** The food diary requires users to log every single meal, snack, and drink to get accurate totals. This is exhausting. Users skip logging breakfast, then lunch, then give up entirely because "the data is already wrong."

**Why it's moderate (not critical):** The walking step tracking provides value independently. Users can use the step features without logging food.

**Prevention:**
1. Allow partial logging: logging breakfast without lunch is better than nothing. Show "logged: breakfast only" rather than a penalty.
2. Implement meal templates/shortcuts for frequent meals ("I had last night's dinner again").
3. Consider frequency over completeness: if a user logs 1 meal/day consistently for 2 weeks, that's a win. Don't penalize them for not logging every meal.
4. Use prompts: "You usually log lunch around now. Did you have your usual avocado toast?"
5. Never show "missing" calories as zero. Show "not logged" with a + button.

**Reference sources:** MyFitnessPal user reviews, Vital food journal analysis

**Phase mapping:** Phase 3 (Food Logging) — design the diary UI to encourage partial logging, not punish it.

---

### Pitfall 17: Friend Search by Phone Number — Privacy Sensitivity

**What goes wrong:** Allowing friend search by exact phone number enables harassment (someone can find you by knowing your number). It also creates a phone number harvesting surface.

**Why it's moderate:** Rarely exploited in practice, but the perception risk is high.

**Prevention:**
1. Require the user's phone number to be verified (via SMS OTP) before they are searchable by it
2. Make "searchable by phone" an explicit opt-in setting, defaulting to off
3. Add a rate limit on phone number searches (prevent brute-force lookups)
4. Consider username-first search as the primary method, phone as a secondary method

**Phase mapping:** Phase 5 (Friend Discovery) — design the discovery privacy controls before exposing phone-based search.

---

### Pitfall 18: React Compiler Experiment Causing Build Failures

**What goes wrong:** `app.json` has `"experiments": { "reactCompiler": true }` enabled. The React Compiler is experimental. It may cause unexpected build failures, incorrect re-render behavior, or compatibility issues with Expo SDK 57.

**Why it's moderate:** Can be disabled in minutes. But if it breaks during a critical build, it blocks releases.

**Prevention:**
1. Disable React Compiler (`"reactCompiler": false`) for production builds
2. Only enable for development testing
3. Pin Expo SDK version to prevent unexpected compiler updates
4. Test both modes before any release build

**Reference sources:** CONCERNS.md assessment, React Compiler documentation

**Phase mapping:** Phase 0 (Foundation) — disable before any production build.

---

### Pitfall 19: Missing Error Boundaries Cause Full-Screen Crashes

**What goes wrong:** Any unhandled JavaScript error (e.g., querying a null product response from OFF, or a failed HealthKit initialization) causes a full-screen white crash on device with no recovery UI.

**Why it's moderate:** Easy to fix, but the fix is invisible until it saves you.

**Prevention:**
1. Wrap the root layout in an `ErrorBoundary` component
2. Add a "Try Again" fallback screen
3. Wrap each feature screen with its own error boundary for graceful degradation (step dashboard fails independently of food diary)

**Reference sources:** CONCERNS.md assessment

**Phase mapping:** Phase 0 (Foundation) — add before any feature code.

---

### Pitfall 20: Offline Health Data Not Cached Locally

**What goes wrong:** The app loads step data from HealthKit/Health Connect on every screen visit. When the user is on the subway, in a tunnel, or has poor connectivity, the dashboard shows loading spinners for data that's already on the device.

**Why it's moderate:** Easy to fix early, but gets harder once the data-access pattern is scattered across screens.

**Prevention:**
1. Read HealthKit/Health Connect data into a local cache (expo-sqlite, WatermelonDB, or Zustand + persist) on app foreground
2. Serve cached data to the UI; refresh in background
3. Show "last synced" timestamps so users know data freshness
4. Server sync becomes a background concern, not a UI dependency

**Reference sources:** Offline-first fitness app case studies, Symbi project

**Phase mapping:** Phase 2 (Step Tracking) — design local caching before UI code touches health data.

---

### Pitfall 21: Food Diary Calorie Totals Don't Match User Expectations

**What goes wrong:** Users compare their TreadPeak calorie total against MyFitnessPal or Cronometer and see different numbers. They assume TreadPeak's data is wrong (even when it may be more accurate).

**Why it's moderate:** Affects trust but doesn't break core functionality. Educable through UI copy.

**Prevention:**
1. Show data source transparency: "Calories from Open Food Facts. Values are estimates."
2. Allow users to manually edit calorie values for a logged food
3. Cross-reference common foods and note OFF-specific values that differ from USDA
4. Handle the OFF units trap (kJ vs kcal) correctly to avoid real errors

**Phase mapping:** Phase 3 (Food Logging) — build data source transparency into the UI.

---

## Minor Pitfalls

### Pitfall 22: Push Notification Overload for Step Milestones

**What goes wrong:** The app sends notifications for every step milestone (5k, 10k, 15k, first place on leaderboard, friend passed you). Users disable notifications entirely.

**Prevention:**
1. Default notifications to "daily summary only"
2. Let users choose their notification frequency (daily, milestones, only when beaten)
3. Never send more than 2 notifications per day without user consent

**Phase mapping:** Phase 4 (Leaderboards) — notification settings before notification implementation.

---

### Pitfall 23: Health Connect Testing Requires Toolbox App

**What goes wrong:** The developer tries to test Android step integration and gets zero data every time. Health Connect doesn't generate data by itself — it only stores data written by other apps (Google Fit, Samsung Health, etc.) or by test tools.

**Prevention:**
1. Install "Health Connect Toolbox" from Google Play for inserting test step data
2. Also install Google Fit, configure it to write to Health Connect
3. Build a simple developer menu option to query device health permissions and data availability for debugging
4. Document the testing setup in the project README

**Reference sources:** deepwiki.com/matinzd/react-native-health-connect, GitHub issues

**Phase mapping:** Phase 2 (Step Tracking) — add testing documentation before development begins.

---

### Pitfall 24: Non-Idempotent Health Data Uploads Cause Duplicates

**What goes wrong:** HealthKit's observer query fires multiple times for the same data (e.g., when user edits a workout, HealthKit emits an "updated" sample with the same UUID but new modification date). If the upload endpoint is not idempotent, the server gets duplicate entries and step counts are inflated.

**Prevention:**
1. Make `POST /samples` idempotent on the HealthKit sample UUID (upsert logic)
2. Store `last_sync_timestamp` on the device; pull deltas since that timestamp
3. Deduplicate by UUID in the local database before upload
4. There's no bug on day one, but it silently appears as users start editing their health data in Apple Health

**Phase mapping:** Phase 2 (Step Tracking) — design the sync API to be idempotent from the start.

---

### Pitfall 25: Leaderboard Tie-Breaking Is Non-Obvious

**What goes wrong:** Three users all have exactly 10,000 steps. The leaderboard shows them tied, but the order is non-deterministic (database default). Users ask: "Who got here first?"

**Prevention:**
1. Define a tiebreaker: "earliest to reach the score wins" (most common)
2. For daily leaderboards: the person who hit the step count first in the day ranks higher
3. For weekly/monthly: use the timestamp of the last increment
4. Display tiebreaker logic somewhere (help screen or leaderboard footer)

**Phase mapping:** Phase 4 (Leaderboards) — define tiebreaker in the ranking query, not post-hoc.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Phase 0: Foundation | React Compiler (Pitfall 18), Missing Error Boundaries (Pitfall 19), No Privacy Policy (Pitfall 11) | Disable React Compiler for prod, add ErrorBoundary, draft privacy policy before any data collection |
| Phase 1: Auth & Infrastructure | Permission Fatigue (Pitfall 12), Cold-Start (Pitfall 13), HIPAA Misconception (Pitfall 11) | Value-first onboarding, prime permissions, import historical health data, Privacy-by-Design architecture |
| Phase 2: Step Tracking | Auth Sheet Never Appears (Pitfall 1), Health Connect Clean Build (Pitfall 2), Background Delivery Stops (Pitfall 3), App Store Rejection 2.5.1 (Pitfall 4), Offline Caching (Pitfall 20), Non-Idempotent Uploads (Pitfall 24), Health Connect Testing (Pitfall 23) | Config plugin checklist, clean prebuild steps, push notification fallback for stale data, local cache layer, idempotent API design, toolbox app for testing |
| Phase 3: Food Logging | HTTP 200 Trap (Pitfall 5), Units Trap (Pitfall 6), Search Latency (Pitfall 7), Barcode Unreliability (Pitfall 14), Diary UX (Pitfall 16), Calorie Trust Gap (Pitfall 21) | Check `status` field, use `energy-kcal_100g`, debounce search + cache, graceful scan failure UX, partial logging design |
| Phase 4: Leaderboards | Cheating (Pitfall 8), Performance (Pitfall 9), Location Privacy (Pitfall 10), Notifications Overload (Pitfall 22), Tie-Breaking (Pitfall 25) | Server-side sanity filters, Redis Sorted Sets, fuzzy geolocation, conservative notifications, deterministic tiebreakers |
| Phase 5: Friend Discovery | Contact Sync Storage (Pitfall 15), Phone Search Privacy (Pitfall 17) | Hash-based matching, opt-in searchability, clear deletion flow |
| Phase 6: Polish & Ship | All Pitfalls 1-25, but especially App Store Rejection (Pitfall 4), Privacy Policy gaps (Pitfall 11), Permission Fatigue (Pitfall 12) | Full compliance review, test on physical devices, review privacy nutrition labels |

## Research Flags for Phases

- **Phase 1 (Auth):** Needs deeper research on backend provider choice (Supabase vs. Convex vs. custom) and its implications for health data handling
- **Phase 2 (Step Tracking):** Needs deeper research on `react-native-health` vs. `@robinhealth/health-sdk` vs. `react-native-healthx` for Expo SDK 57 compatibility
- **Phase 3 (Food Logging):** Needs deeper research on OFF caching strategy — on-device BM25 index vs. server-side DuckDB shim vs. live API — based on expected scale
- **Phase 4 (Leaderboards):** Needs deeper research on Redis hosting (upstash, Redis Cloud, self-hosted), cost at expected user counts, and geo-sharding strategy

## Sources

- Apple Developer Forums — HealthKit authorization, background delivery behavior
- kingstinct/react-native-healthkit GitHub Issues #86, #139
- matinzd/react-native-health-connect GitHub Issues #92, #127, #137
- Open Food Facts GitHub Issues #9770, #12166
- Open Food Facts Knowledge Base — API usage guidelines, caching recommendations
- Strava Engineering Blog — "Keeping Strava's Segment Leaderboards Fair"
- Strava CEO Interview (Yahoo Finance) — leaderboard cheating perspectives
- Marathon Handbook — Strava cleanup analysis (4M+ activities removed)
- USENIX Security 2018 — location privacy paper on fitness apps
- Bellingcat Online Investigation Toolkit — Strava investigation methods
- Washington My Health My Data Act — legal text and compliance guides
- HHS FAQ — HIPAA scope clarifications for health apps
- FTC GoodRx enforcement action — health data sharing penalties
- Sahha.ai — cold-start problem analysis for health apps
- MarTechVibe — health app retention failure analysis
- Stubbs.Pro — fitness app user deletion analysis
- Vital (Alberto Purpura) — BM25 offline search index for OFF data
- openfoodfacts-serving (GitHub) — DuckDB-backed OFF API shim
- AWS Gaming Database Guide — leaderboard architecture patterns
- Redis leaderboard tutorials — sorted set patterns
- CONCERNS.md — project-specific codebase concerns (React Compiler, Error Boundaries)
