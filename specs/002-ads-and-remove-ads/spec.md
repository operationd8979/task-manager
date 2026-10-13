---
status: building
rev: 1
---
# Ads and Remove-ads purchase

## Goal

Task Manager is free and fully offline, and it earns nothing. This feature shows ads to free
users (a banner pinned to the timeline, plus an occasional full-screen ad) and sells one
permanent, one-time "Remove ads" purchase through the Play Store. Someone who has paid never
sees an ad: not for a moment at launch, not offline, not after reinstalling. Free users keep
every core flow (timeline, create/edit, reminders) working as before. Android only.

Source: the product decisions of 2026-10-10, recorded in this spec. The raw brief they came
from was retired on 2026-10-13, once this spec, the design and the plan had absorbed it
(its version and compatibility checks are in the plan's Context).

## User stories

### US-1 Owners never see an ad (P1)

As a user who bought Remove ads, I want the app never to show me an ad, not even briefly at
launch, so that I get what I paid for.

- AC-1.1 Given the purchase is owned and has synced at least once on this install, when the
  app cold-starts online or offline, then no banner area or "Remove ads" link appears at any
  moment and no ad request is made.
- AC-1.2 Given a fresh install whose purchase status the store has not answered yet, when the
  timeline shows, then no banner area appears and no ad request is made until the status
  resolves.
- AC-1.3 Given the status in AC-1.2 resolves to owned, when the session continues, then the
  banner area never appears in that session.
- AC-1.4 Given the status in AC-1.2 resolves to not owned, when the banner loads, then the
  layout shifts once, animated, with no gap left behind.
- AC-1.5 Given the purchase is owned, when the user saves a third new item, then no
  full-screen ad appears.
- AC-1.6 Given the purchase is owned, when Settings opens, then the Remove-ads section shows
  "Ads removed", with no Buy action and no Privacy options entry.
- AC-1.7 Given the purchase is owned and the device has been offline for days, when the app
  starts, then no ad appears.

### US-2 Free users see a pinned banner that never gets in the way (P1)

As a free user, I want the banner to stay out of my way so that I can use the timeline
exactly as before.

- AC-2.1 Given the purchase is not owned and consent allows ads, when the timeline shows,
  then a banner appears pinned at the bottom of the timeline screen, outside the task list,
  with a "Remove ads" link next to it.
- AC-2.2 Given the banner is shown, when the user swipes quickly through 10 days, then the
  banner stays on screen without reloading, and the day changes cause no new ad request.
- AC-2.3 Given the banner is shown, when the device rotates, then the banner adapts to the
  new width and stays visible.
- AC-2.4 Given the banner is shown, when the user swipes horizontally on the list, then the
  day changes exactly as it does without a banner.
- AC-2.5 Given the banner is shown, when the user drags a task to a new time, then the task
  lands at the time under the finger.
- AC-2.6 Given the banner is shown, when the user deletes a task, then the undo toast appears
  above the banner, fully visible, and its Undo action works.
- AC-2.7 Given the banner is shown, when the user taps the New-task bar or swipes up from it,
  then the create form opens, and the bar is never covered by the banner.
- AC-2.8 Given an ad has no fill, fails, is throttled or blocked by consent, or the device
  is offline, when the timeline shows, then the banner area and its link collapse fully, with
  no placeholder and no gap, no error is shown, and the timeline works normally.
- AC-2.9 Given the banner area appears or collapses mid-session, when that happens, then the
  New-task bar and any visible undo toast move with a smooth animation, without a jump and
  without leaving a gap.
- AC-2.10 Given the banner is shown, when the user taps "Remove ads", then the purchase
  screen opens (US-3).
- AC-2.11 Given the theme is light, dark or auto, when the banner is shown, then the banner
  area's own parts (link, separator, background) follow the theme with WCAG AA contrast; the
  ad content itself is drawn by the provider.

### US-3 Buy Remove ads (P1)

As a free user, I want to pay once to remove ads, with ads gone immediately and no restart
needed.

- AC-3.1 Given a free user opens the purchase screen, when product details are loading, then
  a layout-matching skeleton shows. Once loaded, the price, title and description shown come
  from the store, in the store's currency and format; the app's own text is in the app
  language.
- AC-3.2 Given the product is shown, when the user taps Buy and completes payment, then the
  screen confirms success, the banner area disappears at once, and no full-screen ad appears
  afterwards, all without a restart.
- AC-3.3 Given the store's purchase flow is open, when the user cancels, then they return to
  the purchase screen with no error message, Buy is still available, and ads are unchanged.
- AC-3.4 Given the store reports the item as already owned, when the user taps Buy, then the
  status becomes owned and the screen says the purchase was restored, with no error.
- AC-3.5 Given the product is not sold in the user's country or is not active yet, when the
  purchase screen opens, then a clear "not available" message shows, with no empty price and
  no Buy button.
- AC-3.6 Given the device is offline or the store returns an error, when the screen loads or
  Buy is tapped, then an actionable message with Retry shows, never a raw error code, and ads
  are unchanged.
- AC-3.7 Given Buy was tapped, when it is tapped again while the flow is starting, then only
  one purchase flow opens.
- AC-3.8 Given the purchase screen is open, when the user looks for Restore, then a Restore
  purchase action is present (US-4).

### US-4 Restore, reinstall and new device (P1)

As a user who has paid, I want my purchase back after a reinstall or on a new device with the
same store account, and I want a Restore button that tells the truth.

- AC-4.1 Given the purchase was made with store account A, when the app is reinstalled, or
  installed on another device signed in with A, and opened online, then the status becomes
  owned without tapping Restore, no ad appears (AC-1.2, AC-1.3), and no task data comes back
  (001 FR-049).
- AC-4.2 Given the store holds the purchase but the app shows not owned, when the user taps
  Restore, then "Purchase restored" shows and ads disappear at once.
- AC-4.3 Given the store account never bought the item, when the user taps Restore, then
  "No purchase found for this store account" shows (never a success message) and ads are
  unchanged.
- AC-4.4 Given the device is offline, when the user taps Restore, then an error with Retry
  shows and the status is unchanged.
- AC-4.5 Given the purchase is owned, when the user deletes all data (001 FR-054), then all
  tasks are deleted, the purchase stays owned, and no ad appears, without restoring.
- AC-4.6 Given the purchase was made on another device with the same store account while
  this app was in the background, when the app returns to the foreground online, then the
  status becomes owned and ads disappear without a restart.

### US-5 Pending payment (P1)

As a user paying with a slow method, I want to know my payment is still pending, and I want
ads removed automatically once it clears, even in a later session.

- AC-5.1 Given the user finishes the store flow with a slow payment method, when they return
  to the app, then the purchase screen says payment is pending and ads will be removed once
  it completes, and ads keep showing.
- AC-5.2 Given a payment is pending, when the user opens Settings or the purchase screen in
  this or a later session, then the pending state shows and Buy is not offered.
- AC-5.3 Given a payment is pending, when it completes while the app is running, then ads
  disappear in that session.
- AC-5.4 Given a payment is pending, when it completes while the app is closed, then at the
  next launch the status is owned without buying again.
- AC-5.5 Given a payment is pending, when it is declined or expires, then after the next sync
  the status is not owned, Buy is offered again, and ads continue.

### US-6 Privacy consent (P1)

As a user in the EU, EEA or UK, I want to give or refuse ad consent before any ad is
requested, and to change my choice later.

- AC-6.1 Given the device is in a consent region and the purchase is not owned, when consent
  is needed, then Google's consent form appears over the timeline, and no ad request is made
  before the user completes it.
- AC-6.2 Given the consent form is due, when a sheet, a drag or a system prompt is active,
  then the form waits until the timeline is idle.
- AC-6.3 Given the user declined or limited consent, when the timeline shows, then the app
  works normally and the banner area either shows an ad allowed by that choice or collapses,
  never showing an error.
- AC-6.4 Given a consent region and a not-owned purchase, when the user opens Settings, then
  a "Privacy options" entry reopens Google's form, and the new choice applies to later ad
  requests.
- AC-6.5 Given the device is outside consent regions, or the purchase is owned, when the app
  starts or Settings opens, then neither the consent form nor the "Privacy options" entry
  appears.
- AC-6.6 Given the consent status cannot be determined (e.g. offline on first launch), when
  the app starts, then no ad request is made, the app works normally, and the check is
  retried at the next launch.

### US-7 Safe development and test builds (P1)

As a developer, I want it to be impossible to make a real purchase or request a real ad by
accident.

- AC-7.1 Given a development build, when the user taps Buy, then no store transaction is
  created and the screen says purchases are disabled in this build.
- AC-7.2 Given a development or test build, when an ad shows, then it is a provider test ad
  (labelled as a test ad), never one from a real ad unit.
- AC-7.3 Given a test build installed from a Play testing track and signed in with a
  license-tester account, when the user buys Remove ads, then the purchase completes without
  a charge and the status becomes owned.
- AC-7.4 Given a release candidate, when the release check runs, then it fails if a
  production build contains test ad units or the development purchase block, or if a
  non-production build contains production ad units.

### US-8 Full-screen ad every 3 new items (P2)

As the app owner, I want a full-screen ad after every third new item, shown only once the
user has seen the item land, so that it earns revenue without hijacking the save.

- AC-8.1 Given the purchase is not owned, ads are allowed and the counter is at 2, when the
  user saves a new one-off task from the create form, then the form closes, the timeline
  shows the new task on its day, then the full-screen ad appears, and the counter resets to 0.
- AC-8.2 Given the user has created 2 new items, when the app is force-closed, reopened, and
  one more item is created, then the full-screen ad appears after it.
- AC-8.3 Given the counter is at 0, when the user creates a new recurring series, then the
  counter is 1: a series counts once, and its generated occurrences do not count.
- AC-8.4 Given any counter value, when the user edits, moves, drags, toggles status, skips,
  deletes or undoes, then the counter does not change.
- AC-8.5 Given an ad is due after a save, when a notification-permission prompt, a past-time
  warning or an undo toast is showing, then the ad waits until they are gone.
- AC-8.6 Given an ad is waiting (AC-8.5), when the user opens a sheet, starts a drag or
  leaves the app first, then no ad shows and the counter stays due, so the next new item
  triggers it.
- AC-8.7 Given an ad is due but none is loaded (no fill, offline, error), when the save
  completes, then no ad shows, the timeline is not delayed, no error appears, and the counter
  stays due.
- AC-8.8 Given the user closes the full-screen ad, when it is dismissed, then they are on the
  same timeline day, the new task is visible, and their state is intact.
- AC-8.9 Given the counter is due, when the app cold-starts or returns to the foreground,
  then no full-screen ad appears until the next new-item save.

### US-9 Refund brings ads back (P2)

As the app owner, I want ads to return for someone whose purchase was refunded.

- AC-9.1 Given an owned purchase was refunded or revoked, when the next cold start syncs
  successfully, then the status is not owned and ads resume.
- AC-9.2 Given a foreground sync detects a revocation, when the session continues, then ads
  stay off until the next cold start.
- AC-9.3 Given the purchase was revoked while the device is offline, when the app starts,
  then the last known owned status holds, and the app re-checks at every launch and
  foreground until a sync succeeds.

## Requirements

- FR-1 Purchase status has three states: unknown, owned, not owned. Unknown is never treated
  as not owned, and no timeout turns it into not owned: it lasts until the store answers.
  Ads are on only when the status is not owned, consent permits, ads are enabled in the build
  (FR-19), and the platform is Android.
- FR-2 The status from the last successful sync is available offline. The app syncs at every
  launch and every return to the foreground. A failed sync keeps the last known status.
- FR-3 Status changes in a running session apply immediately, without a restart. The one
  exception is owned → not owned, which applies from the next cold start (FR-1, US-9).
- FR-4 A pending payment never grants ad removal.
- FR-5 The purchase survives reinstalls and new devices through the store account; the
  disabled platform backup for task data (001 FR-049) must not block this. Deleting all data
  (001 FR-054) removes neither the purchase, the ad-consent choice, nor the interstitial
  counter.
- FR-6 There is exactly one product: a one-time, permanent "Remove ads". It removes every ad
  format and unlocks nothing else.
- FR-7 Price, product title and description always come from the store. The app never builds
  a price string itself.
- FR-8 The only ad formats are a banner on the timeline screen and a full-screen ad. No
  banner appears on Settings, sheets or any other screen.
- FR-9 The banner is pinned at the bottom of the timeline screen, outside the day-swipe and
  drag areas. Its touch area never extends over the list, it stays clear of the system
  navigation and gesture area, and it never overlaps the New-task bar or the "Remove ads"
  link. It stays mounted across day changes.
- FR-10 Neither the full-screen ad nor the consent form starts while a sheet or form is open,
  a drag is in progress, a system permission prompt is showing, or an undo toast is visible.
  A full-screen ad is attempted only right after a new-item save (US-8), never at launch, on
  resume, or at any other moment.
- FR-11 Interstitial counter: +1 for each new item saved from the create form (one-off task
  or new series), whatever the purchase status. Nothing else counts. The counter persists
  across launches, becomes due at 3 or more, and resets to 0 only when a full-screen ad is
  actually shown.
- FR-12 In consent regions (EU, EEA, UK), no ad request is made before consent permits it.
  The consent form is shown only while the status is not owned.
- FR-13 Ad and purchase failures are written to the local error log (001 FR-055a/b) with
  distinct reasons. For ads, throttled, no fill, failed and consent-blocked are four
  different entries even though the user sees the same collapsed banner. Logs contain no
  production product IDs, no ad unit IDs and no personal data.
- FR-14 Task titles and notes are never sent to the ad network or the store. No analytics or
  crash reporting is added (001 FR-055c still holds). The Settings data statement
  (001 FR-053) stays truthful: tasks stay on the device, and for free users, ads are served
  by Google using the device's advertising ID.
- FR-15 Monetisation is Android only. On iOS, the app makes no ad or purchase requests and
  shows no banner and no Remove-ads, Restore or Privacy options entry; otherwise it behaves
  as before. On an Android device without usable store billing, the Settings Remove-ads
  section says purchases are not available on this device and shows no Buy or Restore, and
  the banner link is hidden, so no entry point leads to a dead end.
- FR-16 Each purchase outcome is handled separately, with its own message in all three
  languages: success, cancelled (no message at all), pending, already owned (handled as a
  restore), not available, network error and store error. Error messages offer Retry.
- FR-17 Restore has three distinct outcomes: restored, nothing found, failed.
- FR-18 There are three environments. Development: purchases are blocked visibly and ads are
  test ads. Test (a release-configured build on a Play testing track): license-tester
  purchases and test ads. Production: real purchases and real ads. Manual testing never uses
  real production purchases.
- FR-19 Build configuration can turn ads and selling off independently, without breaking the
  app. Ads off means no ad requests, no banner area, no consent form and no full-screen ads.
  Selling off means no Buy entry points, but Restore and the owned status still work, so
  owners stay ad-free. A change takes effect with a new release.
- FR-20 All new text is in vi-VN, en-US and ja-JP through the existing string catalog; a
  missing key is a build error (001 FR-058a). Every new screen and state is correct in light,
  dark and auto. Accessibility: roles and labels, touch targets of at least 44×44 pt, no
  clipping at 170% font scale, and a logical focus order. The "Remove ads" link's
  accessibility label clearly distinguishes it from the ad.
- FR-21 With the banner shown, 001 SC-004 (day render ≤ 0.5 s with 5,000 tasks) and SC-006
  (60 FPS, ≤ 1% dropped frames) still hold for scrolling and day swiping. Banner state
  changes do not re-render list rows. Ad and payment start-up never blocks the first timeline
  render, and adds at most 100 ms to time-to-timeline on the low-end reference device.
- FR-22 A failure in ads, purchase, store or network never crashes, blocks or delays the
  timeline, create/edit, reminders or the notification-permission flow.
- FR-23 Automated tests, without a device, network, store account or real transaction,
  cover: the status → ads mapping, the counter, the timing rules (FR-10), and the handling of
  every purchase and restore outcome.
- FR-24 Release gates (named checks done outside the code; all required before the first
  production release):
  - the Play app is created as `com.taskmanager` and signed with a real release key, not the
    debug key;
  - the in-app product is active with a base price that Play converts per country;
  - ad units are created and linked to the app;
  - Data safety declares ads and the advertising ID, and "Contains ads" is declared;
  - a privacy policy in vi/en/ja is published and linked;
  - the content rating and target audience are updated;
  - a build is on a testing track, and license testers are set up;
  - there is evidence that development builds created no production transaction.

## Non-goals

- Server-side receipt validation or a server entitlement store. Client-side status can be
  tampered with on a rooted device; this is accepted and must not be claimed otherwise.
- Sharing entitlement between Android and iOS for the same person.
- Subscriptions and their lifecycle (renewal, grace, hold, plan change, management screen).
- Paid tiers or unlocking features beyond ad removal.
- Rewarded, app-open, native and house ads.
- iOS monetisation.
- Price A/B tests, promotions, promo codes and trials.
- Revenue analytics or dashboards, and payment outside the store.
- A remote kill switch (it needs a backend; FR-19 is build-time).
- Changes to the shared ads or payment SDKs in this repository. Gaps go to the SDK repos.

## Assumptions

- Purchase entry points are the Remove-ads section in Settings and the "Remove ads" link
  next to the banner (chosen 2026-10-11). The link collapses with the banner, so when there
  is no fill, Settings is the only entry point.
- The interstitial counter persists across launches and counts create-form saves only
  (chosen 2026-10-11).
- The banner sits at the bottom, not the top, because the top holds the day bar. Its exact
  vertical order against the New-task bar is decided in `/sdd-design`, within FR-9 and
  AC-2.6/AC-2.7.
- Unknown status has no timeout (FR-1), because the product goal of never treating a payer
  as a non-payer outranks revenue. The cost: a device whose store never answers shows no ads.
- A revocation takes effect at the next cold start, not mid-session (FR-3), so ads never
  flicker back in front of a user.
- Restore is shown to every Android user with store billing, owners included. It appears in
  Settings and on the purchase screen.
- The startup budget of 100 ms (FR-21) is a starting target. `/sdd-plan` measures the
  baseline first.
- Spec 001's assumption of Android + iOS is unchanged for task management. Only monetisation
  is Android-only; recording this in 001 is a separate refinement.

## Changelog

- r1 (2026-10-11): created.
