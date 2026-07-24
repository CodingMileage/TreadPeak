# Feature Landscape

**Domain:** Walking-focused fitness tracking app with food logging and competitive leaderboards
**Researched:** 2026-07-24

## Executive Summary

The walking/fitness tracking app market is crowded but fragmented. Most apps excel at either step tracking (Pacer, StepsApp) or food logging (MyFitnessPal, MyNetDiary), but few combine both with social competition. TreadPeak's opportunity is the intersection: automatic step tracking + frictionless food logging + location-filtered leaderboards in a single app.

The critical insight from research is that **features do not equal retention**. Over 90% of fitness app users stop using within 30 days. The apps that retain users (StepsApp's 100M+ users) optimize for a simple daily loop: see goal, take action, see progress, feel rewarded. They avoid feature bloat. Every additional feature beyond the core loop must justify its complexity cost.

The most powerful retention levers for a walking app are: **streaks** (forgiving, with freeze mechanisms), **small-group leaderboards** (friends, not global), **visual progress** (rings/bars over raw numbers), and **frictionless data capture** (automatic steps, fast food search). The most common failure pattern is building too many features too early.

---

## Table Stakes

Features users expect from any step tracker or food logger. Missing any of these makes the app feel incomplete or non-viable against alternatives.

### Step Tracking Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Automatic step tracking via HealthKit/Health Connect** | Users will not manually enter steps. The phone already tracks them. | Med | Requires HealthKit entitlement (iOS), Health Connect API (Android). Background sync reliability differs: iOS is predictable (hourly callbacks), Android requires defensive programming for manufacturer battery optimizations. |
| **Daily step total with progress toward goal** | Universal expectation. Every pedometer shows this. | Low | Ring or progress bar format outperforms raw number. Visual representation drives more engagement than numeric display. |
| **Step history (daily, weekly, monthly, yearly)** | Users need to see trends to feel progress. | Low-Med | Weekly/monthly views matter most. Yearly is nice-to-have. StepsApp found weekly trends reduce obsession with daily fluctuations. |
| **Customizable daily step goal** | Users have different baselines. Default of 10K is fine, but must be adjustable. | Low | StepsApp learned: setting realistic goals that gradually increase outperforms aggressive targets. Pacer was criticized for paywalling goal changes. |
| **Distance and active time** | Steps are abstract. Distance (km/mi) and active minutes are expected companions. | Low | Calculated from step count + user height (if HealthKit unavailable) or read directly from health APIs. |

### Food Logging Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Text search for foods with nutritional results** | Primary food logging method. Users type food name and see results. | Med | Open Food Facts v2/v3 APIs lack full-text search. Only legacy v1 supports keyword search. Mitigation: structured search with filters, or pre-built local index for autocomplete. Search-as-you-type is NOT viable at 300-800ms latency. |
| **Barcode scanning for instant food lookup** | MyFitnessPal made this standard. Users expect to scan and see results. | Low-Med | Open Food Facts supports barcode lookup via `/api/v3/product/[barcode]`. This is the most reliable interaction path for the API. Scanning a barcode is faster and more accurate than text search. |
| **Calorie and macro display (protein, carbs, fat)** | Core nutritional data users check when logging. | Low | Open Food Facts returns per-100g values for energy, fat, saturated fat, carbs, sugars, fiber, protein, salt. Display as-consumed serving size is a conversion step. |
| **Food diary / meal log by date** | Users need to see what they ate each day and manage entries. | Med | Date-scoped diary with breakfast/lunch/dinner/snack categorization. Must support adding, editing, and deleting entries. |
| **Daily calorie and macro totals from logged foods** | The reason users log food — to see where they stand against goals. | Low | Sum all logged food entries for the day. Display remaining calories/macros if a daily goal is set. |

### Social and Leaderboard Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Friend connections** | Leaderboards need friends to compete with. Users expect to invite and accept. | Med-High | Three methods (username search, phone number, contact sync) each have different permission and privacy implications. |
| **Daily/weekly step leaderboard** | The primary competitive feature. Users expect to see ranking sorted by steps. | Med | Should show rank, steps, and delta from user's position. Weekly is the standard cadence across Pacer, StepsApp, and Fitbit. |
| **User profile with step stats** | Other users need to see who they're competing with. | Low-Med | Display username, avatar (initials or photo), step stats, rank. Keep it simple — detailed profiles are not table stakes for walking apps. |

### Dashboard and UX Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Account creation and authentication** | Required per spec. Data persistence across devices needs identity. | Med | Email/password or OAuth (Apple, Google). No guest mode (per PROJECT.md). |
| **Dashboard showing key metrics at a glance** | Home screen is the first thing users see. Must communicate current status immediately. | Med | Best practice: today's step progress + streak + calorie total in a single scannable view. Avoid burying any of these behind tabs. |
| **Push notifications for engagement** | Users expect nudges for inactivity, goal achievements, friend requests. | Low-Med | Must be context-aware and configurable. Generic motivational messages are ignored or found annoying. |

---

## Differentiators

Features that set TreadPeak apart from Pacer, StepsApp, MyFitnessPal, and MyNetDiary. These are the competitive advantages.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Location-filtered leaderboards** | Core differentiator. Users see how they rank against people in their park, neighborhood, city, or state. | High | Requires location permission, geo-resolution (park vs city vs state), leaderboard segmentation engine. Research shows segmented leaderboards (friends, location) see ~50% engagement vs ~25% for global. This is the feature that makes TreadPeak distinct. |
| **Combined steps + food dashboard** | Most step trackers don't log food. Most food loggers don't show steps. Showing both together gives a complete picture. | Med | The home screen should show steps (energy out) and calories consumed (energy in) side by side. This creates a unique value prop that neither Pacer nor MyFitnessPal delivers in one view. |
| **Free barcode scanning (unlocked from day one)** | MyFitnessPal paywalls barcode scanning behind Premium ($79.99/yr). Making it free in TreadPeak is a direct competitive advantage. | Low-Med | Open Food Facts barcode lookup is free and unlimited. This is a rare case where being free is genuinely differentiating. |
| **Contact sync for friend discovery** | Reduces friction of finding friends. Users grant contacts permission and see which of their contacts already use the app. | Med | Requires contacts permission on both platforms. Must handle the case where zero contacts use the app (graceful fallback). Privacy-sensitive — users need to understand why this permission is requested. |
| **Phone-number-based friend connections** | Not common in fitness apps. Lower friction than username search for non-technical users. | Med | Requires phone verification (SMS) or phone-number-based lookup. Privacy implications — users may not want to be found by phone number. Should be opt-in. |
| **Streak tracking with freeze mechanic** | StepsApp and Duolingo have proven streaks drive retention. Adding "freeze" capability (buy or earn a streak freeze) reduces frustration on off days. | Low-Med | Research shows apps with streak freezes see 17.19-day average streaks vs 11.62 without. Implementation: track consecutive days meeting step goal, offer limited freezes per month. |
| **Achievements and milestone badges** | StepsApp found badge collection dynamics drive continued engagement beyond the initial novelty period. | Low | Milestones: First 5K steps, 7-day streak, 30-day streak, 100K total steps, first barcode scan, first friend added. Keep the list short — 10-15 badges maximum for MVP. |
| **"Complete day" view showing net calories** | MyNetDiary's "Complete Day" feature (end-of-day summary showing net calories = calories in - calories burned) is popular and missing from most step-tracking apps. | Low-Med | Simple calculation: daily calories consumed (from food log) minus estimated calories burned (from steps). Display as a net surplus/deficit. |
| **Auto-calibrated goals based on actual step history** | Instead of requiring users to set a goal, suggest one after 3-5 days of tracking based on their actual average. | Med | Research shows algorithm-generated rigid goals can feel punishing. Use actual data as a suggestion, let users adjust. Adaptive goals improve long-term adherence. |

### Why These Differentiators Work Together

The combination of steps + food + location-filtered leaderboards creates a motivational loop no single app in the current market provides:

1. **Effortless data collection** (auto steps, barcode scanning) reduces friction
2. **Combined dashboard** shows complete energy picture (calories in vs out)
3. **Location leaderboards** add local competition pressure
4. **Friends leaderboards** add social accountability
5. **Streaks and badges** gamify consistency

This loop competes with Pacer (steps only, weak food), MyFitnessPal (food only, no steps on dashboard), and StepsApp (steps only, no food, global leaderboards only, which research shows underperform).

---

## Anti-Features

Features to explicitly NOT build. These hurt retention, create negative user experiences, or waste engineering time.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Global all-time leaderboard** | Research shows global leaderboards demotivate 75%+ of users. Beginners see 40,000+ step gaps and stop checking. Fitbit's all-time leaderboards are mostly ignored. | Friend-only leaderboards and location-filtered leaderboards only. Never show a "worldwide" rank. |
| **Manual step entry** | Undermines trust in the data. Users will inflate steps to win leaderboards. Breaks the integrity of competition. | Accept only HealthKit/Health Connect data. If health APIs aren't available, show an empty state explaining why. |
| **Shame-inducing notifications** | "You only walked 2,000 steps today!" creates guilt, not motivation. Research shows this is a primary reason users delete fitness apps. | Positive framing: "You're 2,000 steps away from your goal!" or "A 10-minute walk would close your rings." Offer encouragement, not judgment. |
| **Overloaded dashboard** | Research found apps with 12+ dashboard options drove users away. A fitness app with 4 well-executed features outperforms one with 20 mediocre ones. One platform that simplified from 12 to 4 options saw retention improve within 2 weeks. | Show only: step progress ring, streak counter, calorie summary, and rank. Everything else goes in a secondary tab or settings. |
| **Rigid algorithm-driven goals that ignore life context** | Research from UCL/Loughborough found users feel "blamed" after small deviations from algorithm-set goals, leading to quitting cycles. | Let users set and adjust their own goals. Use past data only as suggestions, never as mandates. |
| **Generic motivational messages** | Studies show users find these "annoying" and are skeptical of their effectiveness. They become notification noise that users tune out. | No motivational quotes or "you can do it!" messages. Send only context-aware, data-driven notifications (progress alerts, friend requests, streak warnings). |
| **Exercise-to-earn-food mechanics** | "Earned 500 calories walking, now you can eat a treat" triggers moral licensing — users overindulge after being "good." Research shows exercise often makes people hungrier, and apps that ignore this can contribute to weight gain. | Present steps and food as independent data points, not as "earn and spend" currency. Show net calories as information, not permission. |
| **Social features that create public shame** | Public leaderboards where low performers are visible to all friends can cause anxiety. Not everyone wants their 2,000-step day broadcast. | Default leaderboards to show only the user's position relative to others, not everyone's rank. Let users opt into full visibility. |
| **Paywalling core features** | MyFitnessPal's decision to put barcode scanning behind Premium has driven users to alternatives (MyNetDiary). Pacer paywalling goal changes frustrated users. | Keep barcode scanning, goal setting, and basic history free. Monetize through advanced analytics, exclusive challenges, and premium customization (themes, icons). |
| **Excessive gamification** | Too many badges, levels, points, and mechanics make the app feel like homework. Research shows extrinsic rewards eventually wear off and can undermine intrinsic motivation. | Limit MVP to 10-15 achievements. Add new ones slowly. Focus gamification on streaks (habit formation) and leaderboards (social), not on arbitrary point systems. |
| **Per-keystroke search-as-you-type for foods** | Open Food Facts API has 300-800ms latency and 10 req/min rate limits for search. Implementing autocomplete would either be slow or hit rate limits constantly. | Use structured search (user types query, taps search, sees results). Consider a local search index for frequent queries. Scan barcodes as the primary fast path. |
| **All-time "best" leaderboard records** | Creates insurmountable gaps that demoralize new users. Early adopters build leads that never get caught. | Daily and weekly leaderboards only. Monthly as an optional extension post-MVP. Never show "all time." |

---

## Features That Drive Daily Engagement

Research-backed features that correlate with users returning daily. These should be prioritized in the roadmap.

| Feature | Engagement Impact | Evidence | Implementation Priority |
|---------|------------------|----------|------------------------|
| **Streaks** | Highest single lever. Users will go to great lengths to avoid breaking a visible streak. Apps with streaks + freeze mechanics see avg 17.19-day streaks vs 11.62 without. | StepsApp research, Duolingo model | Phase 1 (MVP) |
| **Visual progress ring/bar** | Red-to-green color transitions on step counters outperform complicated charts. Visual progress triggers dopamine response. | Multiple UX studies across fitness apps | Phase 1 (MVP) |
| **Small-group leaderboards (friends)** | Competition in groups of just 3 people added ~920 steps/day. Segmented leaderboards see ~50% engagement vs ~25% for global. | STEP UP randomized clinical trial | Phase 1 (MVP) |
| **Daily goal with celebration animation** | Immediate positive feedback upon goal completion reinforces the habit loop. StepsApp's celebratory animation is consistently praised. | StepsApp gamification case study | Phase 1 (MVP) |
| **Home screen widget showing step progress** | Widgets keep progress visible without opening the app. Users can "mid-day correct" when they see they're behind. StepsApp found this significantly increases daily step count. | StepsApp blog, Android/iOS widget adoption data | Phase 2 |
| **Context-aware notifications** | Timely, relevant nudges outperform generic reminders. "You usually walk 2,000 steps after lunch — it's 1 PM" beats "Don't forget to walk!" | User retention studies, StepsApp personalization blog | Phase 2 |
| **Weekly trends over daily obsession** | Encouraging weekly view reduces anxiety about bad days. Users who look at weekly trends have higher long-term retention. | StepsApp personalization blog, MyNetDiary user research | Phase 2 |
| **Personalization (themes, icons, goal names)** | Users who feel the app is "theirs" continue using it. Custom app icons and color themes increase emotional investment. | StepsApp blog: "Personalization matters because visibility and friction control behavior" | Phase 2-3 |
| **"Complete Day" / end-of-day summary** | MyNetDiary users consistently praise the daily summary feature. Closing out the day gives closure and satisfaction. | MyNetDiary user feedback, habit formation research | Phase 2 |
| **Weekly leaderboard reset** | Fresh competition every week prevents insurmountable gaps. Users re-engage on Monday to see the new board. | Fitbit and StepsApp leaderboard best practices | Phase 1 (MVP) |
| **Year-in-Review / Wrapped recap** | Seasonal recap drives sharing. Every share is free user acquisition. Strava, StepsApp, and Duolingo all use this. | Fitness app retention research, shareability data | Phase 3+ |

---

## Features Users Ignore or Abandon

Research findings on features that see low adoption or active user avoidance.

| Feature | Why Ignored | TreadPeak Implication |
|---------|-------------|----------------------|
| **Generic motivational messages and quotes** | Users find them "annoying." Perceived as fake or manipulative. | Do not build. Use data-driven, context-aware notifications only. |
| **Overloaded dashboards with 10+ metrics** | Users want clarity, not complexity. Features with under 10% adoption are candidates for removal. | Limit dashboard to 3-4 primary metrics. Move everything else to secondary screens. |
| **Advanced vitals (heart points, sleep quality, energy expended)** | Walking app users care about steps and distance, not heart rate variability or sleep staging. Unnecessary complexity. | Out of scope by design (TreadPeak is walking-focused). Keep it that way. |
| **All-time leaderboards** | Once the gap becomes insurmountable, users stop checking. Low engagement. | Do not build. Daily and weekly only. |
| **Manual food logging with no barcode/text fallback** | Users who have to type every meal manually abandon the feature quickly. | Barcode scanning first, text search second. Optimize for speed. |
| **Social features that require effort** | Open groups, forums, and comment threads see low participation and high moderation cost. | Skip the social network. Friends + leaderboards is sufficient for MVP. |
| **Overly detailed nutritional breakdowns** | Most users check calories and macros only. 108 nutrients (MyNetDiary) is overkill for a walking app audience. | Show calories + protein/carbs/fat. Let power users drill in if they choose. |
| **Frequent congratulatory notifications** | Celebrating every small achievement creates notification fatigue. Users tune out. | Limit achievements to meaningful milestones. Don't spam. |

---

## Feature Dependencies

```
AUTH-01 (Account creation)
  ├── SOCL-01 (Username search for friends) — needs user identity
  ├── SOCL-02 (Phone number search) — needs user identity + phone verification
  ├── SOCL-03 (Contact sync) — needs user identity + contacts permission
  ├── LEAD-01 (Global leaderboard) — needs users to exist
  ├── FOOD-01 (Text food search) — no dependency on auth, but needs persistent diary
  └── STEP-01 (Auto step tracking) — no dependency on auth, but needs device permission

STEP-01 (Auto step tracking) 
  ├── STEP-02 (Step history) — needs accumulated step data
  └── DASH-01 (Dashboard) — needs step data + food data

FOOD-01 (Text food search)
  ├── FOOD-03 (Log foods to diary) — needs search results to log
  ├── FOOD-04 (Daily calorie/macro totals) — needs logged foods
  └── DASH-01 (Dashboard) — needs food totals

SOCL-01/02/03 (Friend connections)
  └── LEAD-02 (Friends leaderboard) — needs friends to exist

LEAD-01/02 (Global + Friends leaderboards)
  └── LEAD-03 (Location filter) — needs leaderboard + location permission
```

### Critical Dependency Chain

```
AUTH-01 → SOCL-01/02/03 → LEAD-02 (friend connections flow through to friends leaderboard)
STEP-01 + FOOD-03/04 → DASH-01 (dashboard needs both data sources)
SOCL-01/02/03 + LOCATION → LEAD-03 (location-filtered leaderboards need both friends and geo)
```

---

## MVP Recommendation (Phase 1)

The MVP should ship the **full core loop**: steps tracked automatically, food logged (barcode + text), friends connected (username at minimum), and leaderboards displayed (global + friends + location). Cutting any of these would break the combined value proposition.

### Must Ship (Phase 1 — Core Loop)

1. **STEP-01/02** — Automatic step tracking + daily/weekly/monthly history. Foundation for everything.
2. **DASH-01** — Dashboard showing steps and calories. Primary home screen.
3. **AUTH-01** — Account creation. Every other feature depends on user identity.
4. **FOOD-01/02/03/04** — Text food search + barcode scanning + food diary + daily totals.
5. **LEAD-01/02** — Global + friends leaderboards by daily and weekly steps.
6. **SOCL-01** — Friend connections via username search (minimum viable social layer).
7. **Streaks** — Daily streak tracking with streak display on dashboard. Highest retention lever.

### Defer to Phase 2

1. **Location-filtered leaderboards (LEAD-03)** — Adds geo query complexity. Ship basic leaderboards first, then add location filter.
2. **Phone number and contact sync (SOCL-02/03)** — Adds SMS verification and contacts permission flows. Username search is sufficient for initial friend network.
3. **Home screen widgets** — Platform-specific implementation. Polished add-on, not core loop.
4. **Achievements/badges** — Nice retention mechanic but not table stakes. Streaks are higher priority.
5. **"Complete Day" / end-of-day summary** — Adds delight but not required for core loop.
6. **Context-aware notifications** — Requires usage data to calibrate. Can't build day one.

### Do Not Build (Ever)

- Global all-time leaderboard
- Manual step entry
- Generic motivational quotes/notifications
- Exercise-to-earn-food mechanics
- Excessive gamification (levels, XP, currency)
- Social feed / posts / comments
- Workout types beyond walking (post-MVP consideration)

### Phase 1 Retention Mechanics (Built-In)

The MVP itself should include these retention-driving features at launch:
- **Streaks** with streak counter on dashboard (no freeze mechanic in Phase 1 — add in Phase 2)
- **Daily goal** with visual progress ring and celebration animation
- **Weekly leaderboard reset** (fresh competition every Monday)
- **Friend leaderboards** (small groups keep competition close)
- **No all-time tracking** (prevents demoralization)

---

## Sources

- Pacer App Features (2025-2026) — Google Play, App Store listings, Pacer support documentation
- StepsApp Gamification Case Study — trophy.so/blog/stepsapp-gamification-case-study
- StepsApp Personalization Blog — steps.app/blog/tech/5-stepsapp-hacks-for-more-individualization
- MyFitnessPal vs MyNetDiary Comparison — mynetdiary.com/myfitnesspal-vs-mynetdiary.html
- MyNetDiary Logging Speed Test — mynetdiary.com/which-calorie-tracker-app-is-the-fastest.html
- "Why More Features Is the Wrong Answer to User Churn" — extenova.com/insights
- "Why Users Delete Fitness Apps" — stubbs.pro/blog/article/why-users-delete-fitness-apps
- Fitness App Gamification Retention Research — trophy.so/blog/gamification-for-fitness-apps
- STEP UP Randomized Clinical Trial (small-group leaderboards) — referenced in gamification research
- Leaderboard Best Practices — trophy.so/blog/when-your-app-needs-a-leaderboards-feature
- Open Food Facts API Documentation — wiki.openfoodfacts.org
- HealthKit vs Health Connect Comparison — sahha.ai/blog/healthkit-vs-health-connect
- Apple Health vs Health Connect 2025 — tryrook.io/blog/apple-health-vs-health-connect
- Fitness App Anti-Features Research — resourcifi.com/fitness-app-development-mistakes-avoid/
- "The Dark Side of Food and Fitness Tracking" — nfpt.com/the-dark-side-of-food-and-fitness-tracking-2/
- "Fitness App Myths to Watch Out For" — nextbigideaclub.com/magazine/nir-eyal-fitness-app-myths-watch/
- Musclog Nutrition Tracking Redesign Analysis — blopa.github.io/en/blog/coding/musclog-redesign-nutrition-tracking
- Dashboard UX Best Practices — dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users
