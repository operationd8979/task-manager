# Release materials

What Play Console, AdMob and the developer website need for Task Manager
(specs/002-ads-and-remove-ads FR-24, plan SL-9). The owner's step-by-step checklist lives in
the release checklist doc: https://claude.ai/code/artifact/5a6f7329-aff2-4015-b1b7-173eb88c5bd0

| File | Goes to |
| --- | --- |
| `site/` | The root of the GitHub Pages repo `operationd8979.github.io` |
| `data-safety.md` | Play Console → Policy → App content |
| `store-listing.md` | Play Console → Grow → Store presence → Main store listing |

The site is the developer's one site for every app (developer "Hoàng Dũng IT", decided
2026-10-14): one `app-ads.txt` at the root covers every app of the same AdMob account, and
each app adds its own folder (`task-manager/`, then `<next-app>/`) and a section in
`site/index.html`. `PRIVACY_POLICY_SITE` in `src/domain/privacyPolicy.ts` is already
`https://operationd8979.github.io`.

## Still to fill

| Placeholder | Where | Value |
| --- | --- | --- |
| `pub-XXXXXXXXXXXXXXXX` | `site/app-ads.txt` | The line AdMob shows under Apps → app-ads.txt |

## Publishing the site

1. On GitHub (account `operationd8979`), create a **public** repo named exactly
   `operationd8979.github.io`, copy everything inside `site/` into its root, push to `main`,
   then Settings → Pages → Source: deploy from branch `main`, folder `/ (root)`.
2. Check that these open in a private window:
   - `https://operationd8979.github.io/app-ads.txt` (plain text, once the pub ID is in);
   - `https://operationd8979.github.io/task-manager/privacy/` and its `vi/`, `en/`, `ja/` pages.
3. Enter `https://operationd8979.github.io` as the Website in each app's Play Store settings,
   so AdMob finds `app-ads.txt`, and `https://operationd8979.github.io/task-manager/privacy/`
   as Task Manager's privacy policy URL.

A custom domain can come later (GitHub Pages → Custom domain). Then `app-ads.txt` and the
policies move with it, every Play listing's Website changes, and each app needs a release
with the new `PRIVACY_POLICY_SITE`, because the address is built into the app.

## Builds

```
npm run build:apk                                       # local test APK, debug key allowed
npm run build:aab -- -VersionCode 1 -VersionName 1.0     # test AAB for Play testing tracks
npm run build:aab:production -- -VersionCode 2 -VersionName 1.0
```

Every AAB needs the upload key, a new `-VersionCode` and the published policy; the build
then checks that every 64-bit native library is 16 KB aligned.
