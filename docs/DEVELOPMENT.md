# Development guide

Setting up, running, checking and building the project on Windows (PowerShell). For how the code is organised, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

| Tool | Version used | Needed for |
|---|---|---|
| Node.js | 24.x (npm 11) | Everything |
| Docker Desktop | current | Local PostgreSQL |
| Git | current | |
| Android Studio + emulator | current, emulator image API 35+ x86_64 | Running the app |
| Expo account + `eas-cli` | latest via `npx` | Building installable APKs |

Set your Git identity once, so commits are linked to your GitHub account:

```powershell
git config --global user.name "<your GitHub username>"
git config --global user.email "<your GitHub noreply or real email>"
```

Use VS Code's terminal (`` Ctrl+` ``). It opens in the repo folder; an Administrator PowerShell starts in `C:\WINDOWS\system32`, where Git commands fail with `not a git repository`.

## First-time setup

Run from the repo root.

```powershell
# 1. Environment files. Pick your own local password; use the same one in both files.
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env

# 1b. Login secret: generate your own, then paste it as JWT_SECRET="..." in apps/api/.env.
#     Every developer and every server gets a different one. Never share or commit it.
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 2. Install all workspaces (one install for api, mobile and shared)
npm ci

# 3. Start PostgreSQL
docker compose up -d

# 4. Prisma client + tables
cd apps/api
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
cd ../..
```

Check: `docker compose ps` shows `kindle-pdf-postgres` as `(healthy)`.

`.env` files are ignored by Git. Never commit them, and never put a real password into a `.env.example`.

## Daily commands

| Task | Command (repo root) |
|---|---|
| Start PostgreSQL | `docker compose up -d` (Docker Desktop must be running) |
| Start the API (keep the terminal open) | `npm run dev -w apps/api` |
| Check the API | `Invoke-RestMethod http://127.0.0.1:3000/health/db` |
| Run the API tests (PostgreSQL must be running) | `npm test -w apps/api` |
| Type-check shared types | `npm run typecheck -w packages/shared` |
| Type-check the API | `npm run typecheck -w apps/api` |
| Type-check the app | `cd apps/mobile; npx tsc --noEmit` |
| Bundle the app for Android (no device needed) | `cd apps/mobile; npx expo export --platform android --output-dir $env:TEMP\expo-export` |
| Add a dependency to one workspace | `npm install <pkg> -w apps/api` |
| Add an Expo package to the app | `cd apps/mobile; npx expo install <pkg>` |
| Prisma migration status | `cd apps/api; npx prisma migrate status --config prisma7.config.ts` |

Always install from the **root**. Running `npm install` inside `apps/mobile` creates a second lockfile and breaks the workspace setup.

## Database changes

1. Edit `apps/api/prisma/schema.prisma`.
2. Create a migration: `cd apps/api; npx prisma migrate dev --name <what-changed> --config prisma7.config.ts`.
3. Regenerate the client if it did not run automatically: `npx prisma generate --config prisma7.config.ts`.
4. Commit the schema and the new folder in `prisma/migrations/` together.
5. Others run `npx prisma migrate deploy --config prisma7.config.ts` after pulling.

Never edit a migration that has already been pushed; add a new one.

## Android emulator

The project is tested on the emulator only. Setup on Windows:

1. **Install Android Studio**: `winget install --id Google.AndroidStudio -e`
2. **SDK location with enough space.** The SDK and emulator need 15–20 GB. If C: is tight, set these before first launch (a normal user can't create folders at the root of some drives, so use a folder you own):
   ```powershell
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "E:\dev\Android\Sdk", "User")
   [Environment]::SetEnvironmentVariable("ANDROID_AVD_HOME", "E:\dev\Android\avd", "User")
   $p = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$p;E:\dev\Android\Sdk\platform-tools;E:\dev\Android\Sdk\emulator", "User")
   ```
   Restart VS Code afterwards.
3. **Hypervisor.** With Docker Desktop installed (Hyper-V), enable *Windows Hypervisor Platform* (Administrator PowerShell, then reboot) and do **not** install the "Android Emulator hypervisor driver":
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All
   ```
4. **Create a device** in Android Studio: Virtual Device Manager → + → a Pixel phone, image API 35+ **x86_64**.
5. **Check**: `adb devices` lists `emulator-5554  device`.

Working with the emulator:

| Task | Command |
|---|---|
| Install an APK | `adb install -r <file>.apk` |
| Copy a PDF in (then pick it from *Downloads*) | `adb push <file>.pdf /sdcard/Download/` (or drag the file onto the emulator) |
| Fully stop the app | `adb shell am force-stop com.pdfreader.mobile` |
| Run the app (development build) | `npm run run:android -w apps/mobile`. Runs `adb reverse tcp:3000 tcp:3000` and `tcp:8081 tcp:8081`, then `expo run:android` (D16) |
| Reach the API from the emulator | `http://127.0.0.1:3000` after `adb reverse tcp:3000 tcp:3000` (try `/health/db` in the emulator's Chrome). `adb reverse` resets when the emulator restarts |

## Building the app (EAS)

From `apps/mobile`, log in and link the Expo project once:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
```

Build an installable Android APK in the cloud:

```powershell
npm run build:android
```

When the build finishes, open the build URL printed by EAS or run `npx eas-cli@latest build:list`. The `preview` profile (`eas.json`) produces a standalone APK with the JavaScript bundled in; it does not need a dev server. iOS builds need Apple Developer credentials and registered devices.

Native changes (new native packages such as `react-native-pdf`, or `app.json` plugins) need a new EAS build. The app does not run in Expo Go once native packages are added.

For the app to call the API over plain `http://`, the build must allow cleartext traffic (`expo-build-properties` → `android.usesCleartextTraffic: true`). Development builds only.

## Checking a change

Before merging:

1. Type-check the workspaces you touched (commands above).
2. API changes: `npm test -w apps/api`. All tests must pass. Add a test for new behaviour.
3. App changes: type-check and bundle the app; for behaviour, install a build on the emulator. (The app has no automated tests yet.)
4. A new route file: check it is registered in `src/app.ts`. The type-check cannot catch a missing `app.register(...)`; the route just returns Fastify's 404. A test that calls the route catches it.

**About the API tests** (`apps/api/src/api.test.ts`): they use Node's built-in test runner and Fastify's `app.inject()`, which sends requests without opening a port, so a running dev server doesn't interfere. They run against the local development database; every test creates its own documents with random UUIDs and deletes them at the end, so existing data is untouched.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm error Missing script: "dev"` | Ran in the repo root without a workspace | `npm run dev -w apps/api` |
| `fatal: not a git repository` | Terminal is not in the repo (often `C:\WINDOWS\system32`) | `cd E:\dev\kindle-pdf-reader` |
| Emulator Chrome: "refused to connect" at `127.0.0.1:3000` | The API is not running, or `adb reverse` was reset by an emulator restart | Start the API and keep its terminal open; run `adb reverse tcp:3000 tcp:3000` again |
| App: positions and bookmarks don't reach the API (warnings in the Metro log) | No `adb reverse`: on the device, `127.0.0.1` is the device itself | `adb reverse tcp:3000 tcp:3000`, or start the app with `npm run run:android -w apps/mobile` |
| `/health/db` returns `503` | PostgreSQL is not running | Start Docker Desktop, `docker compose up -d` |
| `DATABASE_URL is not set` on API start | `apps/api/.env` missing | Copy it from `apps/api/.env.example` |
| `JWT_SECRET is missing or shorter than 43 characters` on API start or in tests | No `JWT_SECRET` line in `apps/api/.env` (setting it only in the terminal is lost when the terminal closes) | Generate one (First-time setup, step 1b) and add it to `apps/api/.env` |
| VS Code: `File 'expo/tsconfig.base' not found` | Editor cached the state from before `npm ci` | Ctrl+Shift+P → *TypeScript: Restart TS Server* |
| `Access to the path ... is denied` when creating folders | No write access at the drive root | Use a folder you own, e.g. under `E:\dev` |
| `adb` not recognized | Terminal opened before `Path` was updated | Restart VS Code |
| Prisma: config or schema not found | The config file has a non-default name | Add `--config prisma7.config.ts` |
| `npm warn allow-scripts ... prisma ... esbuild` | npm 11 skips some install scripts | Harmless so far; everything ran correctly |
| `warning: could not open directory 'apps/api/.claude/skills/...'` | Empty leftover folders | Delete `apps/api/.claude` |
