# PDF Reader

A Kindle-style mobile PDF reader for casual readers. Import PDFs from your phone, read them in book mode or scroll mode, and resume exactly where you stopped.

## Features (MVP)

- Import PDFs and keep them in a local library
- Book mode (one page at a time) and scroll mode
- Exact resume position and position bookmarks
- Dark mode and offline reading

## Planned

- Cloud sync with accounts
- AI reference assistant with source quotes and page links

## Project structure

- `app/` - React Native (Expo) mobile app
- `backend/` - Node.js + TypeScript API with PostgreSQL

## Status

Early setup. Folder structure only, no code yet.

## Build the mobile app with EAS

From `apps/mobile`, log in to Expo and link this app to an Expo project once:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Build an installable Android APK in the cloud:

```bash
npm run build:android
```

When the build finishes, open the build URL printed by EAS or run `npx eas-cli@latest build:list` and choose **Install**. Android can install the APK directly. iOS internal builds require Apple Developer credentials and registered devices.

## Run the API locally

Requires Node.js 24 and Docker Desktop. Run everything from the repo root unless noted.

```powershell
# 1. Environment files (once). Edit the password in both if you change it.
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env

# 2. Install all workspaces
npm ci

# 3. Start PostgreSQL
docker compose up -d

# 4. Generate the Prisma client and create the tables (once, and after schema changes)
cd apps/api
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
cd ../..

# 5. Start the API and keep this terminal open
npm run dev -w apps/api
```

Check `http://127.0.0.1:3000/health/db` returns `{"status":"ok","database":"reachable"}`.
From the Android emulator, the API is at `http://10.0.2.2:3000`.
