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
