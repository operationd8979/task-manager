This is a [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Agent & specification system

This repository is set up for spec-driven development with coding agents. Four layers,
each with one job:

| Layer | Location | Holds |
|---|---|---|
| Engineering standards | `.specify/memory/constitution.md` | Binding principles every feature must satisfy. Amendments are versioned. |
| Agent routing | `AGENTS.md` | How an agent should navigate this repo and load context. Deliberately small — it is always in context. |
| Spec workflow | `.specify/templates/` | Templates for `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-checklist`. |
| Package knowledge | `.claude/skills/sdk-*/` | Skills shipped by installed SDK packages, synced on `npm install` and versioned with each package. Generated — never edited by hand. |

Nothing here is pinned to a specific dependency version. Agents derive the stack from
`package.json` and `tsconfig.json`, so the setup stays correct as the app upgrades and
can be reused as a starting point for a new application.

Useful commands:

```sh
npm run sync:skills   # re-sync SDK package skills (also runs on postinstall)
```

Start with `AGENTS.md`, then read the constitution before planning a feature.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

To build a release-variant APK for local testing without starting Metro:

```powershell
npm run build:apk
```

The APK is copied to `.artifacts/android/` with its version in the file name. The
script reads Gradle's `output-metadata.json`, so it does not depend on the default
`app-release.apk` file name. Useful options can be passed after `--`:

```powershell
# Faster device-only artifact; keep just the common 64-bit Android ABI.
npm run build:apk "--" -Architectures arm64-v8a

# Reuse Gradle outputs and overwrite an existing copied artifact.
npm run build:apk "--" -SkipClean -Force

# Purge generated app/Gradle build directories when diagnosing CMake issues.
npm run build:apk "--" -DeepClean -Force
```

The current Android `release` build type uses the debug signing configuration, so
this artifact is suitable for development/sideload testing, not store distribution.

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
