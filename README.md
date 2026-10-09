# PDF Reader

A Kindle-style mobile PDF reader for casual readers. Import PDFs from your phone, read them in book mode or scroll mode, and resume where you stopped. Offline-first: everything works on the phone; a backend keeps a copy for future sync.

## Status

Early MVP, Android first.

- **App:** import PDFs, local library, duplicate detection. Alpha APK released. The reader is still a placeholder.
- **Backend:** API for documents, reading positions and bookmarks, on PostgreSQL. Complete for the MVP.
- **Not yet:** the PDF viewer, resuming the reading position, and the app calling the API.

Details: [docs/ROADMAP.md](docs/ROADMAP.md).

## Repository

| Path | What |
|---|---|
| `apps/mobile` | Expo / React Native app (TypeScript, Android first) |
| `apps/api` | Fastify + Prisma + PostgreSQL API (TypeScript) |
| `packages/shared` | Types shared by app and API |
| `docs` | Project documentation |

## Documentation

| Read this | When you want to know |
|---|---|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | How to set up, run, check and build; what to do when something breaks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app and API are structured and how data flows |
| [docs/API.md](docs/API.md) | How to call each endpoint |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Who owns what; branches, merging, releases |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What's done and what's next |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why things are built the way they are |

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
The app reaches it at `http://127.0.0.1:3000` through `adb reverse` (D16), set up by `npm run run:android -w apps/mobile`.

## Run the app

Start the emulator and the API, then run `npm run run:android -w apps/mobile`. It forwards ports 3000 (API) and 8081 (Metro) with `adb reverse` and installs a development build. Emulator setup, installing an APK, and building with EAS (`npm run build:android` in `apps/mobile`) are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#android-emulator).
