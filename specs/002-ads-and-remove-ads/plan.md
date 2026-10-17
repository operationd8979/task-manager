---
rev: 7
spec_rev: 2
design_rev: 1
---
# Plan: Ads and Remove-ads purchase

## Context

- **Stack**: React Native 0.86.2, React 19.2.3, TypeScript strict, Kotlin 2.1.20,
  min/compile/target SDK 24/36/36. Same Kotlin as both SDKs were verified on (RN 0.85.3), so
  the `react-native-google-mobile-ads` `<16.1.0` pin compiles here.
- **SDKs** (installed, exact pins):
  - `@chipmobilesdk/rn-ads` 0.4.0: peer `react-native-google-mobile-ads >=16.0.3 <16.1.0`
    (unchanged). 0.4.0 adds the privacy options form and its requirement status (SL-5).
  - `@chipmobilesdk/rn-payment` 0.3.0: peers `react-native-iap >=16.6.1 <17`,
    `react-native-mmkv >=4` and `react-native-nitro-modules >=0.36.5` (both already present).
    0.2.0 added the pending set (D-20) and fixed its Android adapter, which granted a
    pending purchase on a device under `react-native-iap` 16.x. 0.2.1 makes its record
    persist at all (MMKV v4, found on the emulator in r5). 0.3.0 is documentation only, so
    the synced skill matches the code; no runtime change from 0.2.1.
  - `@chipmobilesdk/rn-notification` 0.3.0 (owned by feature 001): the same MMKV v4 fix in
    0.2.1, then a documentation-only 0.3.0.
  - Facts that shape the plan:
    - the payment status is `unknown` until the first sync, and again after a **7-day**
      staleness ceiling;
    - development builds get `environment_blocked`;
    - licence-tester purchases need `environment: 'production'` with `isProductionBuild: true`;
    - the payment record lives in MMKV `chipmobilesdk.payment`;
    - ads accept `enabled: 'undecided'`;
    - `AdsBanner` must stay mounted;
    - banners have a 60 s request floor, and rotation is exempt;
    - rn-ads 0.4.0 shows the privacy options form, and `initialize()` refuses — initializing
      nothing — while its consent flow does not permit requests (D-11, D-21);
    - rn-payment 0.2.0 keeps pending purchases visible across sessions, `unknown` under the
      same 7-day rule (D-20);
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
  `versionCode 1` / `versionName "1.0"` are literals in `android/app/build.gradle`, and only
  `APP_ENV=production` refuses the debug key, so a test AAB signed with it builds and is
  then rejected by Play.
- **Play requirements checked 2026-10-13**: target SDK 36 is required since 31/8/2026 (met);
  Play Billing Library ≥ 8 (the bridge resolves `billing:9.1.0`, met); 16 KB page-size
  support for apps targeting API 35+ is not yet verified on a build with the ad and billing
  native libraries.
- **Settings rows**: `PrivacyOptionsRow` in `RemoveAdsSection` is the only tappable row with
  a hint, an inline failure line and a chevron; the DỮ LIỆU section holds the data
  statement. The DB gateway (`useDatabase()`) exposes `errorLog` to any screen under it.
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
  between the list and the bar. Rejected because the product decision (2026-10-10) is to lift
  the bar above the banner, and an ad wedged between the list and the most-used button invites
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
  requirement status. (Its raw change note in the SDK repo was retired once 0.4.0 shipped;
  the rn-ads 0.4.0 CHANGELOG and README `### Letting users change their choice` record it.)
  The alternative was reset-and-reshow, rejected because UMP documents reset as testing-only.
  Your decision, 2026-10-11. Resolved in r4: rn-ads 0.4.0 shipped, and SL-5 is built on it
  (D-21).
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
- ~~D-18~~ (r4: replaced by D-20 once rn-payment 0.2.0 shipped the pending set). A local
  "pending since" marker with a 7-day TTL, chosen on 2026-10-11 because rn-payment 0.1.0
  reported pending only in the session it happened in. Its cost — a declined payment
  showing "pending" until the TTL passed — is what D-20 removes.
- D-19 What the user is mid-way through lives in a generic `InterruptionProvider`
  (`src/lib/interruptions.ts`), mounted outside the boot branch. The plan had put a
  blockers registry inside the monetization provider. Rejected because the undo toast, the
  permission prompt and the drag have to report from components that render without that
  provider, and a wipe's reboot must not drop a wait in progress.
- D-20 Pending comes from rn-payment 0.2.0's pending set (AC-5.2, AC-5.5). The wiring
  subscribes to it next to the entitlement and publishes `MonetizationSnapshot.pending`:
  true when the set is `known`, lists `remove_ads`, and the purchase is not owned. A
  payment declined or expired drops off the set at the next sync, so Buy returns then
  rather than after a TTL; the sheet also returns to Buy in place. An `unknown` set shows
  no pending — the purchase is `unknown` under the same rule, and "checking" already
  withholds Buy. Alternatives rejected:
  - keeping the marker: a declined payment kept showing "pending" for up to 7 days,
    against AC-5.5;
  - reading the set in the provider: the wiring is the one place that translates SDK state
    into the app's view, and it is process-scoped and tested against the SDK fakes.
- D-21 Privacy options (SL-5) is a third row in `RemoveAdsSection`, after Restore, as in the
  `SCR3-privacy-sl5` artboard. It shows when the ads SDK's consent snapshot reports
  `privacyOptionsRequirement: 'required'` and the purchase is `not_owned`
  (`isPrivacyOptionsShown`). The requirement is only known after the consent flow, which
  only runs for not-owned users, so owners never see it (AC-6.5, AC-1.6). A tap calls
  `openPrivacyOptions` in the session, which holds the `consent` interruption while
  Google's form is up (FR-10). The SDK applies the choice to its own gate. Only `failed`
  is surfaced: a line under the row, where tapping again retries, plus
  `ads.privacy_options_failed` in the error log. The artboard has no failure state; this
  inline line is a judgment call under standards IV (no silent failure).
  Alternatives rejected:
  - an `ErrorState` or a dialog: too heavy for a rare failure in a Settings row;
  - ignoring the failure: standards IV.
- D-22 `ensureAdsReady` re-checks that ads are still wanted (`stillWanted()`, enablement
  `enabled`) after waiting for idle and before showing the consent form; if not, it shows
  nothing and clears its once-per-process memo, so a later "wanted" runs the flow again.
  Found on the emulator: with the payment record persisting (rn-payment 0.2.1), a cached
  "not owned" starts the flow at launch, and this session's sync can then find the purchase
  (bought on another device). Before the guard, Google's form appeared over an owner's
  timeline, against AC-6.5. Rejected: delaying the flow until the first sync, which would
  hold every free user's consent, and so their first ad, behind a network call.
- D-23 The privacy policy entry (US-10) is a row in DỮ LIỆU, right under the data
  statement it expands on, on every platform. It opens
  `<site>/task-manager/privacy/<vi|en|ja>/` in the browser via `Linking.openURL`; a failure
  shows a line under the row with the address and logs `legal.privacy_policy_open_failed`
  (AC-10.3). The site is one constant, `PRIVACY_POLICY_SITE` =
  `https://operationd8979.github.io`, the developer's shared site for all their apps
  (owner's choice, 2026-10-14). Alternatives rejected:
  - an in-app WebView: a new native dependency for one page, and Play only asks for a link;
  - inside the Ads section: the policy covers task data too, and iOS has no Ads section.
- D-24 Extract `src/components/ActionRow.tsx` (label, hint, optional failure line, chevron,
  bordered like the Ads rows) and move `PrivacyOptionsRow` and the Restore row onto it. The
  privacy policy row is the second copy of that pattern (standards II). Styling it locally
  was rejected for the same reason as D-17.
- D-25 "Release candidate" (AC-7.5) means an AAB of any environment, or any production
  build. The guard is in two places:
  - `android/app/build.gradle` refuses a `bundle*` task without the upload key, whatever
    the environment, so even a hand-run `gradlew bundleRelease` cannot sign with the debug
    key;
  - `check-release-config` takes `--format`, and refuses an AAB of `test`/`production` whose
    `PRIVACY_POLICY_SITE` is not an `https://` address.

  A local release APK, signed with the debug key for device checks, stays allowed.
  Refusing every release build was rejected: it blocks device checks until the key exists.
- D-26 `versionCode`/`versionName` come from `TM_VERSION_CODE`/`TM_VERSION_NAME` (Gradle
  property or environment, defaults 1 / `1.0`), set by `build-android.ps1 -VersionCode
  -VersionName`. An AAB requires `-VersionCode` explicitly, since Play refuses a reused code.
  `APP_ENV=test` appends `-test` to the name, so a test upload is visible as one in Play
  Console. A version file in the repo was rejected: it is bumped by hand anyway, and a
  forgotten bump only surfaces at upload.
- D-27 `scripts/check-elf-alignment.mjs <apk|aab>` reads the archive with Node's zlib (no new
  dependency) and fails when a 64-bit library (`arm64-v8a`, `x86_64`) has a `PT_LOAD`
  segment aligned below 16 KB. The build runs it after every AAB. The ELF and zip parsing
  lives in `scripts/elf-alignment.cjs` and is unit-tested. Alternatives rejected: the
  shell-only `check_elf_alignment.sh` (no Windows) and `bundletool` (a new tool to install).

## Changes

**Dependencies & build**
- `package.json`: add these, add `-Environment` variants of the `build:*` scripts, and add a
  `check:release` script:
  - `@chipmobilesdk/rn-ads@0.4.0` (was 0.3.0 until r4), `react-native-google-mobile-ads@16.0.3`;
  - `@chipmobilesdk/rn-payment@0.3.0` (0.1.0 until r4, 0.2.0 until r6, then 0.2.1; 0.3.0 is
    docs only), `react-native-iap@16.7.3`.

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
- `environment.ts`: the `AppEnvironment` type, Google's test units, the product ID.
- `appEnv.ts` (development), `appEnv.testtrack.ts` (APP_ENV=test) and `appEnv.production.ts`:
  - name, `adsEnabled` and `sellingEnabled` (FR-19);
  - ads and payment environments (D-3);
  - banner and interstitial unit IDs, and the `remove_ads` product ID.
  - The test file is not named `appEnv.test.ts`, because Jest would collect it as a test.
- `catalog.ts`: placements `timeline_footer` and `task_break`; payment catalog `remove_ads`
  (`one_time_permanent`) → `no_ads`; `buildAdsConfig` / `buildPaymentConfig`.
- `runtime.ts`:
  - lazily creates `createAds({ enabled: 'undecided', … })` and `createEngine` with
    `createStoreProvider()`;
  - Android only, and only when the env flags are on;
  - catches construction errors as `startupFailures` codes instead of crashing (FR-22).
- `wiring.ts`: narrow ports; entitlement → enablement through the D-9 latch.
- `diagnostics.ts`: SDK events → distinct log codes (FR-13), with no unit or product IDs.
- `session.ts`: process-scoped wiring, store, purchasing and interstitial controller; payment
  start; consent then initialize, once per process.
- `purchasing.ts`: the sheet's facade, mapping SDK results to domain outcomes (FR-16, FR-17).
- `localStore.ts`: MMKV `taskmanager.monetization` (`createMMKV`), holding
  `interstitial.count`. `persistent: false` is logged.
- `wiring.ts` also takes a `PendingPort` (the same engine) and publishes
  `MonetizationSnapshot.pending` (D-20).
- `runtime.ts` takes a `snapshotStore` test seam, so two runtimes can share the payment
  record and simulate an app kill.
- `interstitial.ts`: counter, preload (skipped while loading or ready), show.

**Domain** (`src/domain/monetization.ts`, renderer-free)
- `toPurchaseStatus`, `latchOwned`, `effectivePurchaseStatus`, `toAdsEnablement` (FR-1,
  FR-3, FR-19).
- `toPurchaseOutcome` (FR-16), `RestoreResult` (FR-17).
- `PendingPurchases`, `isPendingShown(pending, productKey, purchase)` (D-20).
- `removeAdsSectionState`: `hidden | unavailable | owned | pending | checking | buy`.
- `INTERSTITIAL_EVERY`, `nextInterstitialCount`, `isInterstitialDue`,
  `shouldPreloadInterstitial`, `interstitialStep` (D-13).

**App shell**
- `src/lib/interruptions.ts` and `src/app/providers/InterruptionProvider.tsx` (add): a
  reference-counted record of what the user is mid-way through (overlay, drag, undo,
  permission, consent, background), with `useInterruptionBlocker`. This replaces the plan's
  "blockers registry" inside the monetization provider: undo, permission and drag register
  from components that must keep rendering without any provider.
- `src/app/providers/BottomInsetProvider.tsx` (add): a Reanimated shared value for extra
  bottom chrome. `BannerSlot` writes it; the toast reads it.
- `src/app/providers/MonetizationProvider.tsx` (add):
  - subscribes to the session and does not own the SDKs;
  - foreground → `handleForeground()` and `setAppActive`;
  - consent and initialize when ads first become wanted;
  - store availability, the sheet request, and diagnostics into the error log; `pending`
    is read from the wiring snapshot (D-20).
- `src/app/App.tsx`: Interruption and BottomInset providers outside the boot branch;
  Monetization inside ReminderProvider; `RemoveAdsSheetHost` under UndoProvider.
- `src/app/providers/ReminderProvider.tsx`: holds `permission` while the system prompt is up.
- `src/app/providers/UndoProvider.tsx`: holds `undo` while the toast is up; passes the bottom
  inset to the toast.
- `src/components/Toast.tsx`: an animated extra bottom offset (generic; knows nothing about
  ads).

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
  - The state machine lives in `hooks/useRemoveAdsFlow.ts`; the sheet only renders small
    per-state views (Principle II).
- `src/features/monetization/components/RemoveAdsSheetHost.tsx` (add): mounts the sheet over
  any screen from below the bottom-sheet provider, and holds `overlay` while it is open.
- `src/features/monetization/components/RemoveAdsSection.tsx` (add), SCR-3:
  - the "QUẢNG CÁO" section, placed between NGÔN NGỮ and DỮ LIỆU (design D-9);
  - states: free (Bỏ quảng cáo row with `Chevron`), checking (skeleton row plus text),
    pending (ĐANG CHỜ THANH TOÁN tag), owned (✓ Đã bỏ quảng cáo, not tappable), and
    unavailable on this device (text, no rows, FR-15);
  - the Restore row opens the sheet in `restore` mode (D-16).
- `src/features/monetization/hooks/useInterstitial.ts` (add):
  - counts creates through the session's controller, which preloads at 2 (D-7);
  - waits on the D-13 gate until the timeline has redrawn with the saved item, then shows
    after a 600 ms settle (`SHOW_AFTER_SETTLE_MS`);
  - cancels on a new sheet, drag or real backgrounding.
- `src/features/monetization/index.ts` (add): the feature's public API.
- `src/features/timeline/screens/TimelineScreen.tsx`:
  - narrow the create-swipe detector to the button;
  - render `BannerSlot` between the button and the insets spacer (D-5);
  - register overlay and drag blockers;
  - call `noteNewItemSaved()` from `handleSaved` on creates.
- `src/features/task-editor/hooks/useTaskForm.ts` and `screens/TaskFormSheet.tsx`:
  `onSaved(savedDate, { created })`, true only for a new task or a new series.
- `src/features/timeline/hooks/useTaskDrag.ts`: holds `drag` while a finger is mid-drag.
- `src/features/settings/screens/SettingsScreen.tsx`:
  - add `RemoveAdsSection` (Android only);
  - add the ads line to the data statement only while ads are active, i.e. free and
    resolved. It is hidden for owners, while checking, and on devices without store billing
    (FR-14, design D-7);
  - the Privacy options row lives inside `RemoveAdsSection` (`PrivacyOptionsRow`), so
    Settings itself needed no change for SL-5 (D-21).
- SL-5 also adds: `isPrivacyOptionsShown`, `toPrivacyOptionsOutcome` and the
  `PrivacyOptionsRequirement` / `PrivacyOptionsOutcome` types to the domain;
  `openPrivacyOptions` to `session.ts`; `privacyOptions` / `openPrivacyOptions` to
  `MonetizationProvider` (a `useSyncExternalStore` over `ads.consent`);
  `PRIVACY_OPTIONS_FAILED_CODE` to `diagnostics.ts`; `settings.privacyOptions`, `…Hint`
  and `…Failed` in the three locales (vi-VN from the design's *Copy* table).
- `src/i18n/locales/{vi-VN,en-US,ja-JP}.json` and `keys.generated.ts`: `ads.*` and
  `removeAds.*` keys, via `npm run i18n:sync`. The vi-VN text is the design's *Copy* table;
  en-US and ja-JP are translated from it.

**Release readiness** (SL-8, SL-9)
- `src/domain/privacyPolicy.ts` (add): `PRIVACY_POLICY_SITE`, `privacyPolicyUrl(locale,
  site)` and `PRIVACY_POLICY_OPEN_FAILED_CODE` (D-23).
- `src/components/ActionRow.tsx` (add, D-24); `RemoveAdsSection` moves `PrivacyOptionsRow`
  and Restore onto it with no visual change.
- `src/features/settings/hooks/usePrivacyPolicy.ts` (add): the URL for the current locale,
  `open()`, `failed`, and the error-log entry.
- `src/features/settings/components/PrivacyPolicyRow.tsx` (add) and `SettingsScreen.tsx`:
  the row under the data statement.
- Locales: `settings.privacyPolicy`, `…Hint`, `…Failed` (with `{{url}}`) in vi/en/ja.
- `scripts/release-config-rules.cjs`, `check-release-config.mjs`: `--format apk|aab`; the
  D-25 privacy-site and AAB rules; reads `src/domain/privacyPolicy.ts`.
- `android/app/build.gradle`: the `bundle*` guard (D-25) and version properties (D-26).
- `scripts/build-android.ps1`: `-VersionCode`, `-VersionName`, passes `--format` to the
  check, and runs the alignment check after an AAB (D-27).
- `scripts/elf-alignment.cjs`, `scripts/check-elf-alignment.mjs` (add, D-27).
- `android/app/src/release/AndroidManifest.xml` (remove): it stripped INTERNET and
  ACCESS_NETWORK_STATE from every release build, from 001's offline-only days, so no
  release build could load an ad (see Notes).
- `docs/release/` (add, SL-9): the GitHub Pages site (`site/app-ads.txt` template,
  `site/task-manager/privacy/{index,vi,en,ja}`), `data-safety.md` (the Play form's answers,
  sourced) and `store-listing.md` (vi/en/ja texts).

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
  - MMKV `taskmanager.monetization`, created with `createMMKV` (react-native-mmkv v4):
    - `interstitial.count`: an integer ≥ 0. Missing means 0, and invalid values are reset
      to 0.
    - (`purchase.pendingSince` was removed in r4; pending lives in the payment SDK's record,
      D-20. No migration: the app has not been released.)
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
- **`useMonetization()`** (null outside the provider): `{ purchase: 'unknown' | 'owned' |
  'not_owned'; adsActive: boolean; Banner: AdsBanner | null; removeAdsRequest: { mode } |
  null; openRemoveAds(options?: { mode?: 'buy' | 'restore' }): void; closeRemoveAds(): void;
  supported: boolean; storeAvailable: boolean; canBuy: boolean; pending: boolean;
  purchasing: Purchasing | null; interstitial: InterstitialController;
  privacyOptions: boolean; openPrivacyOptions(): Promise<'shown' | 'failed' | 'ignored'> }`.
  `mode` defaults to `'buy'` (D-16).
- **`useInterruptionBlocker(reason, active)`**, with `reason`: `overlay | drag | undo |
  permission | consent | background`. A no-op outside its provider.
- **`TaskFormSheet.onSaved`**: `(savedDate: LocalDate, meta: { created: boolean }) => void`.
- **Error log codes** (operation `monetization`):
  - ads: `ads.throttled`, `ads.no_fill`, `ads.load_failed:<AdsErrorCode>`,
    `ads.show_failed:<code>`, `ads.internal_error`, `ads.config_unavailable`,
    `ads.privacy_options_failed` (Google's privacy options form could not open, D-21);
  - `payment.config_warning`: the payment SDK says its store does not persist (r5; the
    condition that hid rn-payment's MMKV v4 defect);
  - payment: `payment.<code>`, `payment.environment_blocked`,
    `payment.internal_error:<code>`, `payment.config_unavailable`,
    `payment.pending_cancelled` / `payment.pending_expired` (a pending payment that ended
    unpaid, D-20);
  - `monetization.store_memory_only` when MMKV is unavailable.
  - Operation `settings`: `legal.privacy_policy_open_failed` (AC-10.3).
- **Privacy policy** (D-23): `PRIVACY_POLICY_SITE: string | null` (`https://` origin, no
  trailing slash; `null` until published). `privacyPolicyUrl(locale: string, site =
  PRIVACY_POLICY_SITE): string | null` → `<site>/task-manager/privacy/<lang>/`, with `lang`
  `vi` | `en` | `ja` from the locale's language and `vi` for anything else (the primary
  locale).
- **Build parameters** (D-26): `TM_VERSION_CODE` (integer ≥ 1), `TM_VERSION_NAME` (string);
  `build-android.ps1 -VersionCode <n> -VersionName <s>`;
  `check-release-config.mjs --env <env> [--format apk|aab]` (default `apk`).

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
  than new markup. The action row becomes `ActionRow` on its second use (D-24).
- **IV no silent failure**: a privacy policy page that cannot open says so under the row,
  with the address, and is logged (AC-10.3).

## Slices

- [x] SL-1 Foundation: SDKs, environments, wiring, refund. Covers FR-1, FR-2, FR-3, FR-4,
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
- [x] SL-2 Banner and consent on the timeline. Covers SCR-1, US-2 (AC-2.1–AC-2.9,
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
    - in airplane mode, the area collapses with no gap (moved to SL-6, see Notes).
  - `debugGeography: 'eea'` shows the consent form over an idle timeline, never over a sheet.
  - Perf: a 5,000-task fixture keeps SC-004/SC-006 with the banner shown (moved to SL-6).
  - Light and dark screenshots match the `Main`, `SCR1-collapsed` and `SCR1-undo-toast`
    artboards: bottom stack order, strip, and toast clear of the ad.
- [x] SL-3 Buy, restore, pending, Settings section. Covers SCR-2, SCR-3 (all but the
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
    - wipe keeps `no_ads` (moved to SL-6: needs an owned purchase on a real store).
  - Restore from Settings opens the sheet in `restore` mode, and each outcome shows there
    (D-16).
  - The `Notice` extraction leaves `TaskFormSheet`'s reminder warning unchanged; its
    existing tests stay green (D-17).
  - Debug build on device: Buy shows the "disabled in this build" message, and
    `blockedOperations` is recorded (moved to SL-6: needs a device with the Play Store).
  - Three languages × light, dark and auto are screenshot-checked against the eight `SCR2-*`
    and five `SCR3-*` artboards (partly done, rest moved to SL-6; see Notes).
- [x] SL-4 Interstitial every 3 new items. Covers US-8 (AC-8.1–AC-8.9), AC-1.5, FR-5
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
- [x] SL-7 Pending from the payment SDK (rn-payment 0.2.0, D-20). Replaces the D-18 marker.
  Covers AC-5.2 and AC-5.5 fully (D-18 approximated AC-5.5), and re-checks AC-5.1, AC-5.3,
  AC-5.4.
  Verify:
  - `sdkIntegration.test` with the real engine on the fake store and a shared snapshot
    store: pending after an app kill and an offline restart; declined → Buy at the next
    sync; cleared while closed → owned at launch; cleared while running → owned in session.
  - `useRemoveAdsFlow.test`: a decline while the sheet shows pending brings Buy back; a
    just-returned pending is not bounced to Buy.
  - `monetization.test` (`isPendingShown`), `wiring.test`, `diagnostics.test`
    (`payment.pending_cancelled` / `_expired`).
- [x] SL-5 Privacy options entry (D-11, D-21). Covers SCR-3 (the `SCR3-privacy-sl5` row),
  AC-6.4, AC-6.5 (entry part) and AC-1.6 (no entry for owners).
  Verify:
  - Bumped to `0.4.0` (exact pin, D-15) and re-synced skills; the whole suite passed on
    0.4.0 before any SL-5 code.
  - 0.4.0 changes behaviour this app relies on, re-checked in `sdkIntegration.test`: a
    declined first-time form initializes nothing; a withdrawal blocks the next load; a
    re-grant resumes with one native initialization in the process.
  - Fake-engine tests: the entry shows only when the requirement is `required` and the
    purchase is not owned (`monetization.test`, `sdkIntegration.test`); the form is held as
    the `consent` interruption; a failure is said under the row and clears on a retry that
    works (`RemoveAdsSection.test`).
  - On device with `debugGeography: 'eea'`: moved to SL-6 — no device was attached, and
    the app has no debug-geography switch outside the temporary SL-2 harness.
- [x] SL-8 Privacy policy entry and release-build hardening (D-23 to D-27). Covers US-10
  (AC-10.1–AC-10.3), AC-7.5, FR-20 (new strings, a11y of the row) and FR-24 (the in-app
  link half).
  Verify:
  - `privacyPolicy.test` maps vi-VN/en-US/ja-JP and an unknown locale, and returns `null`
    while the site is unset.
  - `PrivacyPolicyRow.test`: present for any purchase status; a tap opens the locale's URL;
    a rejected open shows the failure line with the address and logs the code.
  - `RemoveAdsSection.test` stays green on `ActionRow` (D-24).
  - `release-config-rules.test`: an AAB of `test` with `PRIVACY_POLICY_SITE = null` fails, a
    real `https://` site passes, an APK of `test` with `null` passes; production still fails
    on the debug key.
  - `elf-alignment.test`: 4 KB and 16 KB `PT_LOAD` fixtures, stored and deflated entries,
    32-bit libraries ignored.
  - `gradlew bundleRelease` without the upload key fails with the D-25 message;
    `npm run build:apk` (test, debug key) still builds; its `versionName` ends in `-test`.
  - `node scripts/check-elf-alignment.mjs <test APK>` reports every 64-bit library; any
    unaligned one is fixed or recorded under Notes with its owner.
  - The **release** merged manifest holds INTERNET and ACCESS_NETWORK_STATE, the rn-ads
    permission table and BILLING.
- [x] SL-9 Release materials in `docs/release/`. Covers FR-24 (the documents behind the
  Data safety, policy, listing and `app-ads.txt` gates) and FR-14 (the policy says what the
  ads receive).
  Verify:
  - The policy pages state, in vi/en/ja: tasks stay on the device; AdMob receives the
    advertising ID, IP-derived approximate location, app interactions and diagnostics;
    consent in the EEA/UK/Switzerland and how to change it; Play Billing; no account and
    no analytics; contact. Each page names the app and is titled "privacy policy".
  - `data-safety.md` answers every Play form question and cites Google's AdMob disclosure.
  - Listing texts fit Play's limits (name 30, short description 80, full 4000 characters).
- [ ] SL-6 Release readiness (needs the Play Console and AdMob setup). Covers AC-7.3, FR-24,
  FR-21 (startup, size and the 5,000-task perf check), FR-20 (final sweep), and on a device
  AC-4.1, AC-4.5, AC-4.6, AC-7.1 and AC-2.8 (offline). The owner's account steps are tracked
  in the release checklist doc (see Notes).
  Verify:
  - FR-24 r2 gates: the policy is entered in Play Console and opened by the in-app entry;
    target audience 18+; the AdMob European regulations message is published and shows on
    a consent-region device; `app-ads.txt` is verified and the app is Ready in AdMob.
  - A release-configured `-Environment test` AAB on a Play testing track; a licence tester
    buys without a charge, the payment adapter is confirmed against `react-native-iap`
    16.7.3, a slow-payment pending purchase settles, and uninstall/reinstall restores it.
    rn-payment 0.2.0 already fixed one adapter defect found by checking 16.7.3's types (a
    pending purchase was granted); a slow test card that **declines** must now also bring
    Buy back after a sync (AC-5.5 on device).
  - ~~From SL-5, with `debugGeography: 'eea'` on a debug build~~ — done r5 on the emulator
    (see Evidence). "Withdrawing collapses the banner" is not reachable with Google's real
    form: "Do not consent" records an answer, so UMP keeps `canRequestAds` true and the
    choice travels as TCF (`IABTCF_PurposeConsents` `00000000000`). The collapse path stays
    covered by the fake-engine tests.
  - ~~Bump `@chipmobilesdk/rn-payment` and `@chipmobilesdk/rn-notification` to `0.2.1`~~ —
    done r6: exact pins, skills re-synced, full checks green; the published files match the
    code verified on the emulator byte for byte.
  - Airplane mode and a device without Play services both behave.
  - Time-to-timeline rises by ≤ 100 ms (median of 10 cold starts, before vs after), and the
    AAB size delta is recorded.
  - Every FR-24 gate is ticked, with evidence of zero production transactions from
    development and test builds.
  - Moved here from SL-2 and SL-3:
    - a 5,000-task fixture keeps SC-004/SC-006 with the banner shown;
    - offline collapse on a bundled release build;
    - a debug build's Buy blocked on a Play Store device (AC-7.1);
    - an owner wipes data and stays ad-free (AC-4.5);
    - the remaining language × theme × auto screenshots of SCR-2 and SCR-3;
    - from the 001 fixes: a light ↔ dark switch re-themes the timeline at once (001
      L-12), and Japanese chosen survives a restart (001 L-11).

## Verification

- Fast: `npx tsc --noEmit` · `npm run lint` · `npm test -- <touched paths>`
- Full: `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run check:native` ·
  `npm run i18n:sync` (no diff) · `node scripts/check-release-config.mjs --env <env>`
- Evidence (SL-1 to SL-4; "device" means the Pixel 3a API 36 emulator, debug build, with
  the payment SDK's fake store as a temporary harness, since the image has no Play Store):
  - AC-1.1 — `wiring.test` "disables ads for an owner from the first snapshot" ✓
  - AC-1.2 — `sdkIntegration.test` "sends zero provider calls while the purchase is
    unknown"; `BannerSlot.test` collapsed while undecided ✓
  - AC-1.3 — `wiring.test` owner snapshot and latch ✓
  - AC-1.4 — device: the banner appears once, animated, after not-owned resolves ✓
  - AC-1.5 — `interstitial.test` "counts for an owner but never shows them one" ✓
  - AC-1.6 — `RemoveAdsSection.test` owned state; `monetization.test` "hides it from owners"
    (no Privacy options entry); device r5: owner Settings shows "Ads removed", no entry ✓
  - AC-1.7 — `wiring.test` owner from the cached snapshot ✓. Device r5 with rn-payment
    0.2.1: an owner restarted with the store unreachable sees "Ads removed" and no ads ✓
    (0.2.0 never persisted the record; the app pins 0.2.1 since r6).
  - AC-2.1 — device screenshot (strip + banner under the New-task bar); `BannerSlot.test`
    opens when ready ✓
  - AC-2.2 — device: 10 day swipes, banner kept, 0 new `load_started`; `BannerSlot.test`
    one mount over 10 re-renders ✓
  - AC-2.3 — device: landscape keeps the banner, no throttle ✓
  - AC-2.4 — device: day swipe with the banner shown ✓
  - AC-2.5 — device: drag 16:00 → 17:30 lands under the finger ✓
  - AC-2.6 — device: undo toast above the bar, clear of the ad; UNDO restores ✓
  - AC-2.7 — device: tap and swipe-up on the New-task bar open the form ✓
  - AC-2.8 — `BannerSlot.test` collapsed for idle, loading, undecided, throttled, failed,
    unavailable ✓ (offline device check in SL-6)
  - AC-2.9 — `BannerSlot.test` inset follows the slot; device: animated appearance ✓
  - AC-2.10 — `BannerSlot.test` "opens the Remove-ads sheet from its link" ✓
  - AC-2.11 — device: dark and light screenshots ✓
  - AC-3.1 — `purchasing.test` store fields untouched; `useRemoveAdsFlow.test` ready ✓
  - AC-3.2 — `useRemoveAdsFlow.test` success; `sdkIntegration.test` "turns ads off in the
    session once the purchase succeeds" ✓
  - AC-3.3 — `useRemoveAdsFlow.test` cancel says nothing ✓
  - AC-3.4 — `useRemoveAdsFlow.test` already owned → restored ✓
  - AC-3.5 — `purchasing.test` + `useRemoveAdsFlow.test` unavailable; device (fake store,
    no product) ✓
  - AC-3.6 — `useRemoveAdsFlow.test` error → Retry; `purchasing.test` error mapping ✓
  - AC-3.7 — `useRemoveAdsFlow.test` double tap → one flow ✓
  - AC-3.8 — device: Restore offered in the sheet ✓
  - AC-4.1 — pending SL-6 (reinstall with a Play account)
  - AC-4.2 — `useRemoveAdsFlow.test` restore mode → restored ✓
  - AC-4.3 — `useRemoveAdsFlow.test` nothing found (also where not sold); device ✓
  - AC-4.4 — `useRemoveAdsFlow.test` restore failed → error ✓
  - AC-4.5 — pending SL-6 (`destroyAll` only deletes the local-db scope; the payment
    snapshot is MMKV `chipmobilesdk.payment`)
  - AC-4.6 — pending SL-6 (foreground sync on a real store)
  - AC-5.1 — `useRemoveAdsFlow.test` "shows a pending payment as pending, before the
    pending set catches up"; `sdkIntegration.test` session 1 snapshot `pending: true`;
    device r5 (fake store): Buy → PAYMENT PENDING notice, no Buy ✓
  - AC-5.2 — `sdkIntegration.test` "still shows pending after an app kill and an offline
    restart"; `useRemoveAdsFlow.test` opens in pending; `RemoveAdsSection.test` tag ✓ (SL-7).
    Device r5 with rn-payment 0.2.1: kill, store unreachable, Settings tagged PAYMENT
    PENDING ✓ (pinned since r6).
  - AC-5.3 — `sdkIntegration.test` "removes ads in the session when the payment clears
    while running"; `useRemoveAdsFlow.test` settles in place ✓
  - AC-5.4 — `sdkIntegration.test` "is owned at the next launch when the payment clears
    while closed" ✓
  - AC-5.5 — `sdkIntegration.test` "offers Buy again at the next sync once the payment is
    declined"; `useRemoveAdsFlow.test` "offers Buy again in place" ✓ (SL-7). Device r5
    (fake store declining 30 s later): after a foreground sync the open sheet went back to
    BUY ✓; on a real Play test card in SL-6
  - AC-6.1 — device, EEA debug geography: form over the idle timeline, 0 requests before
    the answer ✓
  - AC-6.2 — device: form waited while the New-task sheet was open, then appeared ✓
  - AC-6.3 — device: declined → app works, allowed ad served ✓
  - AC-6.4 — `sdkIntegration.test` "offers the entry in a consent region once the user has
    answered", "withdrawing through the entry blocks the next load", "re-granting resumes
    loads with one native initialization"; `RemoveAdsSection.test` entry opens the form ✓.
    Device r5, EEA debug geography, Google's real form: the entry appears after consent and
    reopens the form; "Do not consent" → `IABTCF_PurposeConsents` `00000000000`, re-grant →
    `11111111111`; one native initialization across both; banner kept ✓
  - AC-6.5 — consent runs only once ads are wanted (`MonetizationProvider`), never for an
    owner; `monetization.test` `isPrivacyOptionsShown` hides the entry outside consent
    regions, while unknown, and for owners; `RemoveAdsSection.test` no entry;
    `sdkIntegration.test` "skips the form when the purchase turns out owned while the flow
    waits" (D-22). Device r5: owner — no form, no banner, no entry; cached-free-then-owned
    race — form shown before D-22, not after ✓
  - AC-6.6 — `ensureAdsReady` leaves the gate closed on failure and retries next launch ✓
    (code path; no network-failure device run)
  - AC-7.1 — `useRemoveAdsFlow.test` dev-blocked state ✓ (Play-device check SL-6)
  - AC-7.2 — `sdkIntegration.test` only test units; device logcat "This request is sent
    from a test device" ✓
  - AC-7.3 — pending SL-6
  - AC-7.4 — `release-config-rules.test` (7 cases); CLI fails production, passes
    test/development ✓
  - AC-7.5 — `release-config-rules.test` "release candidates" (10 cases); CLI: `--env test
    --format aab` fails on the debug key and the unpublished site, `--format apk` passes;
    `gradlew :app:bundleRelease` without the key fails with the D-25 message ✓ (SL-8)
  - AC-8.1 — `useInterstitial.test`; device: Ad3 visible, then the test interstitial ✓
  - AC-8.2 — `interstitial.test` restart; device: count survived a restart (preload at 2) ✓
  - AC-8.3 — `useTaskForm` reports `created: true` once for a new series ✓ (code path)
  - AC-8.4 — device: 2 edits → 0 interstitial events, then 1 new task → still none ✓
  - AC-8.5 — `useInterstitial.test` waits out the permission prompt ✓
  - AC-8.6 — `useInterstitial.test` sheet / background cancel ✓
  - AC-8.7 — `interstitial.test` not ready → stays due ✓
  - AC-8.8 — device: after closing, same day with Ad3 and the banner ✓
  - AC-8.9 — `useInterstitial.test` "never shows at launch" ✓
  - AC-9.1, AC-9.2, AC-9.3 — `wiring.test` refund on next cold start, latch mid-session,
    stale → held ✓
  - AC-10.1 — `PrivacyPolicyRow.test` link role, label and hint, no purchase state read ✓
  - AC-10.2 — `privacyPolicy.test` vi/en/ja/fallback URLs; `PrivacyPolicyRow.test` opens
    the vi page ✓ (browser on a device: SL-6, once the site is published)
  - AC-10.3 — `PrivacyPolicyRow.test` rejected open → line with the address, no raw error,
    `legal.privacy_policy_open_failed` logged; retry clears it ✓

## Notes

- Device discoveries, each fixed with a test or a code comment:
  - `BannerSlot`: a flowing child of a zero-height wrapper is never laid out on the New
    Architecture, so it was never measured and the slot never opened. The content is now
    absolutely positioned.
  - `BannerSlot`: in landscape, sub-pixel height noise re-ran the slide every ~100 ms. The
    height is now rounded and changes under 1 pt are ignored.
  - `localStore`: react-native-mmkv v4 has `createMMKV`; `new MMKV` threw and the store
    silently fell back to memory, so the counter and pending marker were lost on restart.
    It is fixed, and the fallback is now logged (`monetization.store_memory_only`).
  - `interstitial`: the third save re-requested an ad that was already ready. Preload now
    skips loading and ready placements.
  - `Notice`: a spread shared `variants` object was invisible to the Unistyles Babel
    plugin, so text stayed dark in dark mode. The variants are now inline per style.
  - `useRemoveAdsFlow`: restore "nothing found" was lost where the product is not sold. The
    unavailable state now carries the note.
  - `InterruptionProvider`: AppState `unknown` was treated as background, which would block
    every wait. Only `background`/`inactive` count now.
  - `InteractionManager.runAfterInteractions` is deprecated in RN 0.86. Replaced by a named
    600 ms settle.
- Device-check harness: on the emulator only, `runtime.ts` used
  `rn-payment/testing`'s fake store and logged ad events. It was removed before the full
  checks, and no test double is imported by app code.
- Pre-existing, outside this feature — fixed 2026-10-13 under 001 (its plan, L-11 and L-12):
  - `src/i18n/storage.ts` had the same `new MMKV` bug, so the chosen language was not
    persisted across restarts (001 FR-058b). Now `createMMKV`, pinned by a v4-shaped test.
  - Switching light/dark re-themed the timeline only partly (old background, chevrons lost)
    until restart (001 FR-052c): its `SafeAreaView` is outside Unistyles' reach. Now
    `ThemedSafeAreaView`; the device check is part of SL-6.
  - Editing a module imported by `App.tsx` while the app runs can trigger Fast Refresh
    "handle is closed" or a blank reload. Dev only.
- SL-7 (r4): rn-payment 0.2.0 replaced the D-18 marker with the SDK's pending set (D-20).
  `purchase.pendingSince` was dropped with no migration, since the app is unreleased. The
  sheet now also returns to Buy in place when a payment is declined while it is open,
  which the marker could never observe.
- SL-5 (r4): built on rn-ads 0.4.0 once it reached npm. The suite was green on 0.4.0 before
  any SL-5 code, so its consent behaviour changes needed no app change: `ensureAdsReady`
  already ran update → form → initialize, and a declined user now simply gets no native
  initialization. The failure line under the row is not in the artboard (D-21). The
  device check moved to SL-6.
- Device session r5 (Pixel 3a API 36 emulator, debug build, Google's real UMP form and
  test ads; payment via a temporary fake-store harness, since the image has no Play Store —
  removed afterwards):
  - **SDK defect found and fixed in the SDK repo**: rn-payment 0.2.0 and rn-notification
    0.2.0 open MMKV with the v3 `new MMKV()`. In react-native-mmkv v4 (their peer range)
    `MMKV` is a type only, so both silently fell back to memory: the app's `files/mmkv` had
    no `chipmobilesdk.payment` or `chipmobilesdk.notification`. Owners read "checking"
    after every cold start, and pending payments were forgotten after a kill. Both
    packages are fixed as `0.2.1` (`createMMKV`, `remove`, a v4-shaped test double that
    fails against the old code), published 2026-10-13 and pinned in r6. Verified here
    first from local tarballs installed with `--no-save`: both instances appear, and AC-5.2
    and AC-1.7 pass.
  - D-22 came from the same session, once the record persisted.
  - The payment SDK's `config_warning` (non-durable store) is now logged
    (`payment.config_warning`); it had been dropped, which is why the defect stayed
    invisible.
  - Turning the emulator's network off breaks the debug bundle's Metro connection, so
    "offline" was simulated at the store (connection refused), which is what the payment
    SDK sees.
- SL-8, first release build with the ads and billing libraries (2026-10-13):
  - 48 of 48 64-bit libraries are 16 KB aligned (`check-elf-alignment`); the universal
    test APK is 119.2 MB.
  - **Release builds had no network.** `android/app/src/release/AndroidManifest.xml`, from
    001, removed INTERNET and ACCESS_NETWORK_STATE in release only; the debug source set
    adds INTERNET back for Metro. Every SL-1 to SL-5 device check ran a debug build, so SL-1's
    "merged manifest lists the rn-ads table plus BILLING" held for debug and not for
    release, where no ad could ever load. The file is removed; SL-1's manifest check now
    reads the release merged manifest (SL-8 Verify).
- r7 (spec r2): FR-2 now states the 7-day ceiling that D-10 already implements, so SL-1
  stays done; AC-7.4 is unchanged and AC-7.5 is new in SL-8. The design (r1, `spec_rev: 1`)
  predates US-10, so the privacy policy row has no artboard; D-23/D-24 place it with
  existing patterns. `/sdd-design` can draw it if wanted.
- The owner's Play Console, AdMob, website and payout steps are tracked in the release
  checklist doc: https://claude.ai/code/artifact/5a6f7329-aff2-4015-b1b7-173eb88c5bd0
- Choices worth a glance:
  - `maxAdContentRating: 'PG'` — confirm against the content-rating gate (FR-24). With the
    18+ audience (spec r2 Assumptions) it is conservative, not required.
  - In landscape the bottom chrome (bar + strip + banner) takes nearly half the screen; a
    design follow-up.
  - The dev environment uses Google's test units directly, so no substitution event fires;
    the request is still marked as a test-device request.

## Changelog

- r1 (2026-10-11): created from spec r1.
- r2 (2026-10-11): reconciled to design r1. Slices SL-2, SL-3 and SL-5 now cover SCR-1,
  SCR-2 and SCR-3, with artboard checks. Added D-16 (restore mode, design D-8) and D-17
  (shared `Notice`). D-5 now cites design D-1. Changes updated for the strip, sheet states,
  Settings placement and data-statement rule (design D-1, D-3, D-4, D-6, D-7, D-9).
- r3 (2026-10-11): implemented SL-1 to SL-4. Added D-18 (local pending marker, since rn-payment
  0.1.0 exposes no pending item) and D-19 (a general `InterruptionProvider` replaces the
  interstitial-only gate). Changes and Data & interfaces now match the files as built
  (`session.ts`, `purchasing.ts`, `localStore.ts`, `BottomInsetProvider`). Device-only checks
  that need a Play Store device, a release build or a perf fixture moved to SL-6. Evidence and
  Notes filled in.
- r4 (2026-10-12): rn-payment 0.1.0 → 0.2.0 and rn-ads 0.3.0 → 0.4.0. Retired D-18 (local
  pending marker); added D-20 (pending from the SDK's pending set, through the wiring) and
  D-21 (the Privacy options row, with an inline failure line). D-11 resolved. Added SL-7 and
  completed SL-5, its device check moved to SL-6. Changes, Data & interfaces, error log
  codes and the AC-1.6, AC-5.x, AC-6.4 and AC-6.5 evidence updated.
- r5 (2026-10-12): device session on the emulator. Added D-22 (no consent form once the
  purchase turns out owned mid-flow). SL-5's device check done; SL-6 gains the rn-payment /
  rn-notification 0.2.1 bump (MMKV v4 defect found on device, fixed in the SDK repo).
  `payment.config_warning` log code added. Evidence for AC-1.6, AC-1.7, AC-5.1, AC-5.2,
  AC-5.5, AC-6.4 and AC-6.5 updated with device results.
- r6 (2026-10-13): rn-payment and rn-notification bumped to the published 0.2.1 (MMKV v4
  fix). AC-1.7 and AC-5.2 device evidence no longer conditional. D-11's pointer to the
  retired SDK raw note now names the rn-ads CHANGELOG and README instead.
- r7 (2026-10-13): reconciled to spec r2. Added D-23 (privacy policy row), D-24
  (`ActionRow`), D-25 (release-candidate guard), D-26 (version parameters), D-27 (16 KB
  check); slices SL-8 (US-10, AC-7.5) and SL-9 (release materials); SL-6 verifies the new
  FR-24 gates. Context records the Play requirements checked and the 0.3.0 docs-only bump
  of rn-payment already listed there.
