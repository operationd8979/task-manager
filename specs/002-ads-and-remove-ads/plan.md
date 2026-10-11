---
rev: 2
spec_rev: 1
design_rev: 1
---
# Plan: Ads and Remove-ads purchase

## Context

- **Stack**: React Native 0.86.2, React 19.2.3, TypeScript strict, Kotlin 2.1.20,
  min/compile/target SDK 24/36/36. Same Kotlin as both SDKs were verified on (RN 0.85.3), so
  the `react-native-google-mobile-ads` `<16.1.0` pin compiles here.
- **SDKs** (not installed yet; skills read from the published tarballs):
  - `@chipmobilesdk/rn-ads` 0.3.0: peer `react-native-google-mobile-ads >=16.0.3 <16.1.0`.
  - `@chipmobilesdk/rn-payment` 0.1.0: peers `react-native-iap >=16.6.1 <17`,
    `react-native-mmkv >=4` and `react-native-nitro-modules >=0.36.5` (both already present).
  - Facts that shape the plan:
    - the payment status is `unknown` until the first sync, and again after a **7-day**
      staleness ceiling;
    - development builds get `environment_blocked`;
    - licence-tester purchases need `environment: 'production'` with `isProductionBuild: true`;
    - the payment record lives in MMKV `chipmobilesdk.payment`;
    - ads accept `enabled: 'undecided'`;
    - `AdsBanner` must stay mounted;
    - banners have a 60 s request floor, and rotation is exempt;
    - **rn-ads 0.3.0 cannot show the privacy-options form** (D-11);
    - the payment Android adapter is **unverified on a device** (its own README).
- **Composition root** [src/app/App.tsx](../../src/app/App.tsx):
  - nesting is DatabaseProvider → ReminderProvider → BottomSheetModalProvider →
    NavigationContainer → UndoProvider → RootStack;
  - "Delete all data" (`destroyAll`) deletes only the local-db scope and then **reboots the
    provider tree**. MMKV survives it.
- **Timeline** [TimelineScreen.tsx](../../src/features/timeline/screens/TimelineScreen.tsx):
  - the bottom New-task bar is wrapped whole, insets spacer included, by the create-swipe
    detector (001 FR-005a);
  - `handleSaved` closes the sheet and reloads or jumps to the saved day;
  - overlays are local `overlay` state, and the drag lives in `useTaskDrag`.
- **Undo toast** [Toast.tsx](../../src/components/Toast.tsx) is rendered by
  [UndoProvider](../../src/app/providers/UndoProvider.tsx) above the navigator, at
  `insets.bottom + BAR_HEIGHT.action`.
- **Notification permission**: `reminders.ensurePermission()` is fired **without awaiting**
  on save ([TaskFormSheet.tsx:77](../../src/features/task-editor/screens/TaskFormSheet.tsx#L77)),
  so the system dialog can appear right after the sheet closes.
- **Settings** is one screen ([SettingsScreen.tsx](../../src/features/settings/screens/SettingsScreen.tsx))
  with inline sections. The data statement is `settings.dataOnDevice`.
- **Local error log** is [errorLog.ts](../../src/services/logging/errorLog.ts) (code +
  operation, no content). It lives on the DB handle.
- **i18n**: `t('key')` calls, then `npm run i18n:sync` regenerates the locales and
  `keys.generated.ts`. A missing key fails the build.
- **MMKV pattern with memory fallback**: [src/i18n/storage.ts](../../src/i18n/storage.ts).
- **Android**:
  - no product flavours;
  - release builds are signed with `debug.keystore`;
  - `allowBackup=false`, and `data_extraction_rules.xml` excludes the DB and the
    notification MMKV;
  - no `react-native.config.js`.
- **Build**: `scripts/build-android.ps1`, with `npm run build:apk` and `npm run build:aab`.
- **Shared UI to reuse**: `Sheet`, `SkeletonGroup`/`Skeleton`, `EmptyState`, `ErrorState`,
  `Chevron` and `Toast` in `src/components/`. The warning notice (`accentSoft` fill, 1px
  `accentInk` border) is styled locally in `TaskFormSheet` (`reminderWarning`).
- **Design**: [design.md](design.md) r1, with SCR-1 (timeline banner area), SCR-2
  (Remove-ads sheet) and SCR-3 (Settings section). 17 artboards on the
  [canvas](https://claude.ai/artifact/WzK6S8svewWRZF4mrnopVv). The design system is now
  recorded in `docs/standards.md`.

## Approach

Two process-scoped SDK instances are wired by app code:

- payment `no_ads` → ads enablement: `unknown` → `undecided`, `entitled` → `disabled`,
  `not_entitled` → `enabled`;
- a per-process ownership latch.

A `MonetizationProvider` (under DatabaseProvider, above UndoProvider) exposes the status, the
consent flow, the purchase sheet opener and a "blockers" registry. The timeline gets a
`BannerSlot` below the New-task bar. Its animated height feeds a generic bottom-inset value
that the toast also reads. A persisted counter and a pure gate decide when the interstitial
shows after a create.

Settings gets a Remove-ads section, and one bottom sheet handles purchase, restore, pending
and owned states. The build environment is chosen when the bundle is built. All rules live in
`src/domain/monetization.ts` and are tested with the SDKs' fakes.

- D-1 The SDK instances are process-scoped singletons, created lazily in
  `src/services/monetization/runtime.ts`; the provider only subscribes. The alternative was
  to create them in the provider. Rejected because the wipe reboots the tree: a remount would
  re-run init and re-request the banner straight into the 60 s floor.
- D-2 The environment is picked at bundle time. Metro's `resolveRequest` redirects
  `./appEnv` to `appEnv.<APP_ENV>.ts`, and `appEnv.ts` is the development default, so TS and
  Jest resolve normally. Alternatives rejected:
  - `react-native-config` or flavours plus a native module: a new native dependency;
  - Babel env inlining: Metro's transform cache can bake a stale environment into a release
    bundle.
- D-3 Environment matrix:

  | App env | Build | Payment env | Ads env |
  |---|---|---|---|
  | development | debug | `development` (blocked) | `development` (test units) |
  | test | release, Play testing track | `production` + `isProductionBuild` | `test` (test units) |
  | production | release, production track | `production` | `production` |

  The alternative was payment `test` for the test build. Rejected because the SDK refuses
  every chargeable purchase outside `production`, so licence testers could never buy.
- D-4 Purchase, restore, pending and owned all live in one bottom sheet (`RemoveAdsSheet`),
  opened from the banner link and from Settings. A new stack screen was rejected: the app
  keeps two screens and puts everything else in sheets, and a sheet keeps depth ≤ 3.
- D-5 The banner sits **below** the New-task bar, directly above the system inset. The
  create-swipe detector is narrowed to the button only. The alternative was the banner
  between the list and the bar. Rejected because raw spec §4.4 asks for the bar to be lifted
  above the banner, and an ad wedged between the list and the most-used button invites
  accidental clicks. Design D-1 adopts it: a 44pt strip (label + link) sits between the bar
  and the banner, and the whole slot collapses together.
- D-6 The banner and its link collapse in every placement state except `ready`, including
  `undecided`. `AdsBanner` stays mounted inside a full-width wrapper whose height animates
  0 ↔ measured. The SDK's suggestion is to hold space while undecided. Rejected because
  AC-1.2 forbids a banner area before the status resolves.
- D-7 The interstitial is preloaded only once the counter reaches 2, and reloaded after a
  show only when the next one is near. Always keeping one loaded was rejected: it spends a
  billable request per validity hour on users who never reach 3.
- D-8 The counter lives in MMKV instance `taskmanager.monetization`. The SQLite settings
  table was rejected because "Delete all data" wipes it (FR-5).
- D-9 Ownership latch: once `entitled` is seen in a process, enablement stays `disabled` until
  the process ends (FR-3). Implemented in pure domain code.
- D-10 Keep the payment SDK's default 7-day staleness. Raising it was rejected: the ceiling
  bounds how long an offline refund outlives itself.
  - Consequence: past 7 days without a sync, the status is `unknown`. That maps to no ads,
    and Settings shows "Checking purchase…".
  - Spec FR-2 ("keeps the last known status") is therefore true for 7 days only. Flagged for
    a spec wording fix.
- D-11 The Privacy options entry waits for rn-ads 0.4.0, which will add the form and its
  requirement status. Mini raw spec: `c:\cms\temp\rn-ads-v0.4-privacy-options-change.md`.
  The alternative was reset-and-reshow, rejected because UMP documents reset as testing-only.
  Your decision, 2026-10-11.
- D-12 iOS:
  - `src/services/monetization` is required lazily behind `Platform.OS === 'android'`;
  - `react-native.config.js` removes `react-native-google-mobile-ads` and `react-native-iap`
    from iOS autolinking.

  As a result iOS never loads the bridges, and never links GMA, which aborts launch when no
  iOS app ID is set. The alternative was to rely on the SDKs' iOS stubs, rejected because the
  bridge native module would still link.
- D-13 The interstitial gate is a pure function over a snapshot of blockers:
  - sheet/overlay open;
  - drag active;
  - undo toast visible;
  - notification-permission request in flight;
  - consent form showing;
  - app not active (ignored while a permission request is in flight, because Android's
    permission dialog pauses the activity);
  - saved item not yet rendered.

  A blocker that appears *after* the wait started (sheet, drag, real backgrounding) cancels
  the attempt, and the counter stays due.
- D-14 Release signing reads the upload keystore from Gradle properties or the environment
  (`TM_UPLOAD_STORE_FILE`, `…_PASSWORD`, `…_KEY_ALIAS`, `…_KEY_PASSWORD`), never the repo.
  Building `APP_ENV=production` without them fails.
- D-15 Exact bridge pins: `react-native-google-mobile-ads@16.0.3` and
  `react-native-iap@16.7.3`. Carets were rejected: the payment adapter is unverified, so
  device verification must be reproducible.
- D-16 The sheet opens in one of two modes. `openRemoveAds({ mode: 'buy' | 'restore' })`:
  Settings' "Khôi phục giao dịch" opens it in `restore` mode, which starts the restore on
  open (design D-8). A separate restore result surface in Settings was rejected, because it
  would duplicate the three outcome messages.
- D-17 Extract the warning notice into `src/components/Notice.tsx`
  (`tone: 'warning' | 'neutral'`) and move `TaskFormSheet`'s `reminderWarning` onto it. The
  sheet's pending, development-blocked and nothing-found blocks would be the second and
  third copies of the pattern (standards II). Styling them locally was rejected because it
  breaks that rule.

## Changes

**Dependencies & build**
- `package.json`: add these, add `-Environment` variants of the `build:*` scripts, and add a
  `check:release` script:
  - `@chipmobilesdk/rn-ads@0.3.0`, `react-native-google-mobile-ads@16.0.3`;
  - `@chipmobilesdk/rn-payment@0.1.0`, `react-native-iap@16.7.3`.

  Then run `npm run sync:skills` (it yields `sdk-rn-ads` and `sdk-rn-payment`).
- `app.json`: `react-native-google-mobile-ads.android_app_id`. Use Google's test app ID until
  the AdMob app exists; the release check enforces the real one for production.
- `react-native.config.js` (add): exclude both bridges from iOS (D-12).
- `metro.config.js`: `resolveRequest` redirect for `appEnv` by `process.env.APP_ENV`. Unknown
  values fail the bundle (D-2).
- `jest.config.js`: add `react-native-google-mobile-ads` and `react-native-iap` to
  `transformIgnorePatterns`.
- `android/app/build.gradle`: release `signingConfig` from properties. Fail when
  `APP_ENV=production` and no keystore is configured (D-14).
- `android/app/src/main/res/xml/data_extraction_rules.xml` and `backup_rules.xml`: exclude
  `mmkv/chipmobilesdk.payment` and `mmkv/taskmanager.monetization`.
- `scripts/build-android.ps1`:
  - `-Environment development|test|production` sets `APP_ENV`;
  - release builds default to `test`, so production is always explicit;
  - runs `check:release` first.
- `scripts/check-release-config.mjs` (add), the AC-7.4 named check. It fails when:
  - production uses Google test IDs (publisher `3940256099942544`), the test app ID or the
    debug key;
  - development or test env files contain non-test ad units;
  - a placement or product ID is missing.

**Config & services** (`src/services/monetization/`)
- `appEnv.ts` (development), `appEnv.test.ts` and `appEnv.production.ts`: typed
  `AppEnvironment` with:
  - name, `adsEnabled` and `sellingEnabled` (FR-19);
  - ads and payment environments (D-3);
  - banner and interstitial unit IDs, and the `remove_ads` product ID.
- `catalog.ts`:
  - placements `timeline_footer` (banner) and `task_break` (interstitial);
  - payment catalog: `remove_ads` (`one_time_permanent`) → `no_ads`.
- `runtime.ts`:
  - lazily creates `createAds({ enabled: 'undecided', … })`, plus `createEngine` with
    `createStoreProvider()`;
  - Android only, and only when the env flags are on;
  - catches `AdsConfigError` and `PaymentConfigError` and reports monetization `unavailable`
    instead of crashing (FR-22);
  - exposes a replaceable log sink.
- `wiring.ts`:
  - subscribes to entitlements and pushes the enablement through the D-9 latch;
  - forwards events to the log sink with distinct codes: `ads.throttled`, `ads.no_fill`,
    `ads.load_failed:<code>`, `ads.consent_blocked`, and `payment.<code>`;
  - never logs unit or product IDs (FR-13).
- `counterStore.ts`: MMKV `taskmanager.monetization`, key `interstitial.count`, with a memory
  fallback (pattern of `src/i18n/storage.ts`).

**Domain** (`src/domain/monetization.ts`, renderer-free)
- `toEnablement(status, latch)`, `latchReducer`.
- `nextInterstitialCount`, `isInterstitialDue`, and `INTERSTITIAL_EVERY = 3`.
- `canShowInterstitial(blockers)` (D-13).
- `removeAdsSectionState(...)`: `checking | buy | pending | owned | unavailable | hidden`.
- `purchaseOutcomeView(result)` (FR-16) and `restoreOutcomeView(outcome)` (FR-17).

**App shell**
- `src/app/providers/MonetizationProvider.tsx` (add):
  - mounts `PaymentProvider` and `AdsProvider` around the singletons;
  - runs AppState foreground → `handleForeground()`;
  - consent orchestration: once enablement first becomes `enabled`, `requestInfoUpdate`,
    then `showFormIfRequired` when no blocker is up, then `initialize`;
  - provides `useMonetization()` with `adFree`, `adsActive`, `openRemoveAds()`,
    `noteNewItemSaved()`, `blockers` and `consentState`;
  - points the log sink at `useDatabase().errorLog`;
  - releases its subscriptions on unmount.
- `src/app/providers/BottomInsetProvider.tsx` (add): a Reanimated shared value for extra
  bottom chrome. `BannerSlot` writes it; the toast reads it.
- `src/app/App.tsx`: insert both providers. MonetizationProvider goes inside
  ReminderProvider, above BottomSheetModalProvider; BottomInsetProvider sits above
  UndoProvider.
- `src/app/providers/ReminderProvider.tsx`: expose `permissionRequestInFlight` (observable)
  around `ensurePermission`.
- `src/app/providers/UndoProvider.tsx`: expose `isVisible`, and pass the bottom offset to the
  toast.
- `src/components/Toast.tsx`: accept an animated extra bottom offset (generic; it does not
  know about ads).

**Features**
- `src/components/Notice.tsx` (add, D-17):
  - `tone: 'warning'` is an `accentSoft` fill with a 1px `accentInk` border; `tone:
    'neutral'` is a 1px `onBackground` border;
  - an optional caption label, a body and a description.
- `src/features/task-editor/screens/TaskFormSheet.tsx`: `reminderWarning` moves onto
  `Notice`, with no visual change.
- `src/features/monetization/components/BannerSlot.tsx` (add), SCR-1, design D-1 and D-3:
  - one animated-height wrapper (D-6) holding a strip of `TAP_TARGET_MIN` height: the
    "QUẢNG CÁO" caption on the left and a "BỎ QUẢNG CÁO" link on the right, with a 1px
    `color.border` above;
  - then the always-mounted `AdsBanner`;
  - the link's a11y label clearly distinguishes it from the ad;
  - publishes its height to BottomInsetProvider;
  - owns its placement state, so the timeline never re-renders on banner changes (FR-21).
- `src/features/monetization/components/RemoveAdsSheet.tsx` (add), SCR-2. Built on `Sheet`,
  in mode `buy` or `restore` (D-16):
  - loading: `SkeletonGroup` plus "Đang lấy giá…";
  - ready: store `formattedPrice`, title and description, MUA, KHÔI PHỤC GIAO DỊCH;
  - pending: `Notice` warning, with no MUA;
  - success: owned, plus already-owned and restored with their copy (design D-4);
  - nothing found: `Notice` neutral under Restore;
  - not available: `EmptyState`, with Restore as its action;
  - store error and restore failed: `ErrorState` with THỬ LẠI (design D-4);
  - development-blocked: `Notice` warning, after which MUA turns disabled and outlined
    (design D-6);
  - a double-tap guard.
- `src/features/monetization/components/RemoveAdsSection.tsx` (add), SCR-3:
  - the "QUẢNG CÁO" section, placed between NGÔN NGỮ and DỮ LIỆU (design D-9);
  - states: free (Bỏ quảng cáo row with `Chevron`), checking (skeleton row plus text),
    pending (ĐANG CHỜ THANH TOÁN tag), owned (✓ Đã bỏ quảng cáo, not tappable), and
    unavailable on this device (text, no rows, FR-15);
  - the Restore row opens the sheet in `restore` mode (D-16).
- `src/features/monetization/hooks/useInterstitial.ts` (add):
  - counts creates;
  - preloads at 2 (D-7);
  - waits on the D-13 gate after the saved item renders, then `show('task_break')`;
  - cancels on new blockers.
- `src/features/monetization/index.ts` (add): the feature's public API.
- `src/features/timeline/screens/TimelineScreen.tsx`:
  - narrow the create-swipe detector to the button;
  - render `BannerSlot` between the button and the insets spacer (D-5);
  - register overlay and drag blockers;
  - call `noteNewItemSaved()` from `handleSaved` on creates.
- `src/features/task-editor/screens/TaskFormSheet.tsx`: `onSaved(savedDate, { created })`.
- `src/features/settings/screens/SettingsScreen.tsx`:
  - add `RemoveAdsSection` (Android only);
  - add the ads line to the data statement only while ads are active, i.e. free and
    resolved. It is hidden for owners, while checking, and on devices without store billing
    (FR-14, design D-7);
  - reserve a slot for the Privacy options row (SL-5).
- `src/i18n/locales/{vi-VN,en-US,ja-JP}.json` and `keys.generated.ts`: `ads.*` and
  `removeAds.*` keys, via `npm run i18n:sync`. The vi-VN text is the design's *Copy* table;
  en-US and ja-JP are translated from it.

**Tests**
- `src/domain/__tests__/monetization.test.ts`: mapping, latch, counter, gate, and the outcome
  views.
- `src/services/monetization/__tests__/`:
  - wiring with `createFakeStore` + `createFakeAdsEngine`: status changes, refund, staleness,
    one native init;
  - counterStore;
  - runtime config errors;
  - `check-release-config` cases.
- `src/features/monetization/__tests__/`:
  - BannerSlot: collapse in each state, no extra load across simulated day changes;
  - RemoveAdsSheet: every outcome;
  - useInterstitial: due, wait, cancel, not-ready.

## Data & interfaces

- **Storage**:
  - MMKV `taskmanager.monetization`: `interstitial.count`, an integer ≥ 0. Missing means 0,
    and invalid values are reset to 0.
  - It is not touched by `destroyAll`, and it is excluded from backup and device transfer.
  - The SDK-owned MMKV `chipmobilesdk.payment` gets the same exclusions.
- **Keys**:
  - placements: `timeline_footer` (banner), `task_break` (interstitial);
  - product key `remove_ads` → entitlement `no_ads`;
  - Play product ID `remove_ads` (in-app product, one-time).
- **`AppEnvironment`**: `{ name: 'development' | 'test' | 'production'; adsEnabled: boolean;
  sellingEnabled: boolean; adsEnvironment: 'development' | 'test' | 'production';
  paymentEnvironment: 'development' | 'production'; bannerUnitId: string;
  interstitialUnitId: string; removeAdsProductId: string }`.
- **`useMonetization()`**: `{ adFree: 'unknown' | 'owned' | 'not_owned'; adsActive: boolean;
  pending: boolean; storeAvailable: boolean; consentState;
  openRemoveAds(options?: { mode?: 'buy' | 'restore' }): void; noteNewItemSaved(): void;
  setBlocker(name: BlockerName, on: boolean): void }`. `mode` defaults to `'buy'` (D-16).
  `BlockerName = 'overlay' | 'drag'`; the provider sets undo, permission, consent and
  app-state itself.
- **`TaskFormSheet.onSaved`**: `(savedDate: LocalDate, meta: { created: boolean }) => void`.
- **Error log codes** (operation `monetization`):
  - ads: `ads.throttled`, `ads.no_fill`, `ads.load_failed:<AdsErrorCode>`,
    `ads.show_failed:<status>`, `ads.consent_blocked`, `ads.config_unavailable`;
  - payment: `payment.<PaymentErrorCode>` and `payment.config_unavailable`.

## Standards

- **Security: "integrity rules are also enforced server-side"**. *Deviation*: the purchase
  status is checked only on the device.
  - Justification: there is no backend in scope (spec non-goal).
  - The tamper risk on rooted devices is accepted and never claimed otherwise.
  - Revisit if a backend appears; the SDK's validation hook is the seam.
- **Security: "tokens live in secure storage"**. *Deviation*: the payment SDK keeps
  unfinished-transaction records, including the purchase token, in its own plain MMKV.
  - Justification: the storage is SDK-owned, and the app cannot redirect it without
    patching the SDK.
  - A Play purchase token is useless without the developer's server credentials.
  - Fixing it belongs in the SDK repo.
- **Security: "no secrets in source"**. The AdMob app ID, ad unit IDs and Play product ID are
  public identifiers shipped in the APK, so they are committed in the env files. The upload
  keystore and its passwords never are (D-14).
- **IV complete async states**:
  - `RemoveAdsSheet` has a skeleton, a not-available ("empty") state, error with Retry, and
    explicit success and restore confirmations.
  - Banner failures are deliberately invisible (AC-2.8), so they are **logged** (FR-13),
    which satisfies "no silent catch".
- **VI performance & dependencies**:
  - The banner's state lives only in `BannerSlot`; the timeline list does not re-render on it.
  - SDK start-up runs after the first timeline frame.
  - Dependency cost: the two bridges add the GMA and Play Billing native SDKs. That is
    unavoidable for the feature. The APK/AAB size delta is recorded in SL-6, and the JS
    weight of both SDKs is small.
- **VII lifecycle**: the SDK instances are process-scoped by design (D-1). The provider and
  every hook release their subscriptions, timers and AppState listeners on unmount.
- **V accessibility**: the "Remove ads" link has its own role and label, and `AdsBanner`
  renders `null` when empty, so it leaves the a11y tree. The sheet is checked at 170% font
  scale.
- **II reusable components**: the warning notice becomes a shared `Notice` on its second use
  (D-17). The sheet's empty and error states reuse `EmptyState` and `ErrorState` rather
  than new markup.

## Slices

- [ ] SL-1 Foundation: SDKs, environments, wiring, refund. Covers FR-1, FR-2, FR-3, FR-4,
  FR-13, FR-15 (iOS), FR-18, FR-19, FR-22, FR-23, AC-7.2, AC-7.4 and US-9 (AC-9.1, AC-9.2,
  AC-9.3).
  Verify:
  - `npm test -- src/domain src/services/monetization` is green:
    - unknown → no requests;
    - entitled → disabled and latched;
    - refund → re-enabled only after a simulated restart;
    - stale beyond 7 days → undecided;
    - config error → `unavailable`, no throw.
  - `node scripts/check-release-config.mjs --env production` fails on the test app ID and the
    debug key, and `--env test` passes.
  - `npm run check:native` is green.
  - A debug build launches, and logcat shows test-unit substitution and zero non-test ad
    requests.
  - The merged manifest lists exactly the rn-ads permission table plus one `BILLING`.
- [ ] SL-2 Banner and consent on the timeline. Covers SCR-1, US-2 (AC-2.1–AC-2.9,
  AC-2.11), AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.7, AC-6.1, AC-6.2, AC-6.3, AC-6.5 (form
  part), AC-6.6, FR-8, FR-9, FR-10 (consent), FR-12, FR-14 (no task content), FR-20, FR-21.
  Verify:
  - Component tests with the fake ads engine:
    - the banner collapses for `undecided`, `throttled`, `failed`, no-fill and blocked;
    - 10 simulated day changes → `engine.calls` shows one banner load.
  - On device, debug build:
    - swiping 10 days keeps the banner, with one `load_started` in logcat;
    - rotating keeps it;
    - drag lands under the finger;
    - the undo toast sits above the banner and works;
    - tapping and swiping up the New-task bar both work;
    - in airplane mode, the area collapses with no gap.
  - `debugGeography: 'eea'` shows the consent form over an idle timeline, never over a sheet.
  - Perf: a 5,000-task fixture keeps SC-004/SC-006 with the banner shown.
  - Light and dark screenshots match the `Main`, `SCR1-collapsed` and `SCR1-undo-toast`
    artboards: bottom stack order, strip, and toast clear of the ad.
- [ ] SL-3 Buy, restore, pending, Settings section. Covers SCR-2, SCR-3 (all but the
  Privacy options row), US-3 (AC-3.1–AC-3.8), US-4 (AC-4.1–AC-4.6), US-5 (AC-5.1–AC-5.5),
  AC-1.6 (owned state), AC-2.10, AC-7.1, FR-5 (purchase), FR-6, FR-7, FR-14 (data
  statement), FR-15 (no store), FR-16, FR-17.
  Verify:
  - RemoveAdsSheet and RemoveAdsSection tests with `createFakeStore` cover every outcome:
    - success → banner gone without remount;
    - cancel → no message;
    - pending across sessions (app-kill simulation), already owned, unavailable in region,
      network, double tap;
    - restore: restored, nothing found, failed;
    - wipe keeps `no_ads`.
  - Restore from Settings opens the sheet in `restore` mode, and each outcome shows there
    (D-16).
  - The `Notice` extraction leaves `TaskFormSheet`'s reminder warning unchanged; its
    existing tests stay green (D-17).
  - Debug build on device: Buy shows the "disabled in this build" message, and
    `blockedOperations` is recorded.
  - Three languages × light, dark and auto are screenshot-checked against the eight `SCR2-*`
    and five `SCR3-*` artboards.
- [ ] SL-4 Interstitial every 3 new items. Covers US-8 (AC-8.1–AC-8.9), AC-1.5, FR-5
  (counter), FR-10 (interstitial), FR-11.
  Verify:
  - Domain tests for the counter and gate.
  - `useInterstitial` tests with the fake engine:
    - due → shown after the saved item renders;
    - permission in flight → waits;
    - sheet opened → cancelled and still due;
    - not ready → nothing shown and still due;
    - cold start → nothing shown;
    - edits, moves, skips and undo don't count;
    - a series counts once;
    - the counter survives a restart and a wipe.
  - On device: three creates show the test interstitial after the third task appears.
- [ ] SL-5 Privacy options entry. **Blocked on rn-ads 0.4.0** (D-11). Covers SCR-3 (the
  `SCR3-privacy-sl5` row), AC-6.4, AC-6.5 (entry part) and AC-1.6 (no entry for owners).
  Verify:
  - Bump to `^0.4.0` and re-sync skills.
  - A test with the fake engine: the entry shows only when the requirement is `required` and
    the purchase is not owned; withdrawing consent blocks the next load.
  - On device with `debugGeography: 'eea'`: the Settings entry reopens Google's form.
- [ ] SL-6 Release readiness (needs the Play Console and AdMob setup). Covers AC-7.3, FR-24,
  FR-21 (startup and size), FR-20 (final sweep), and AC-4.1 on a device.
  Verify:
  - A release-configured `-Environment test` AAB on a Play testing track; a licence tester
    buys without a charge, the payment adapter is confirmed against `react-native-iap`
    16.7.3, a slow-payment pending purchase settles, and uninstall/reinstall restores it.
  - Airplane mode and a device without Play services both behave.
  - Time-to-timeline rises by ≤ 100 ms (median of 10 cold starts, before vs after), and the
    AAB size delta is recorded.
  - Every FR-24 gate is ticked, with evidence of zero production transactions from
    development and test builds.

## Verification

- Fast: `npx tsc --noEmit` · `npm run lint` · `npm test -- <touched paths>`
- Full: `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run check:native` ·
  `npm run i18n:sync` (no diff) · `node scripts/check-release-config.mjs --env <env>`
- Evidence:

## Notes

## Changelog

- r1 (2026-10-11): created from spec r1.
- r2 (2026-10-11): reconciled to design r1. Slices SL-2, SL-3 and SL-5 now cover SCR-1,
  SCR-2 and SCR-3, with artboard checks. Added D-16 (restore mode, design D-8) and D-17
  (shared `Notice`). D-5 now cites design D-1. Changes updated for the strip, sheet states,
  Settings placement and data-statement rule (design D-1, D-3, D-4, D-6, D-7, D-9).
