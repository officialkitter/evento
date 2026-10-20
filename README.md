# Evento

```
apps/mobile   Expo SDK 52 + Expo Router (React Native 0.76, new arch off)
apps/server   Node/Express API for Railway
supabase/     SQL migrations (tables, RLS, webhook trigger, reception RPCs)
```

## Prerequisites
- Node 22+ (required by `@supabase/server`)
- **JDK 17** with `JAVA_HOME` pointing at it (the build refuses to run on any other JDK)
- Android SDK with Platform 35 and Build-Tools 35.0.0 (accept licences: `sdkmanager --licenses`)

## 1. Database
```
supabase start            # or link a hosted project
supabase db reset         # applies supabase/migrations/*
```
Enable Phone (firebase) and Email OTP providers in the Supabase dashboard.

## 2. Server
```
cp apps/server/.env.example apps/server/.env   # fill values
npm install
npm run server:dev
```
Railway: create a service from this repo, set **Root Directory** to `apps/server`, add the env vars from `.env.example`.
Use the Supabase project URL, publishable key, secret key, and JWKS URL. Keep `SUPABASE_SECRET_KEY` only in server-side environment variables; never add it to the mobile app or commit it.
Point your mobile-money provider's callback at `POST /api/webhooks/mobile-money` (HMAC-SHA256 of the raw body in `x-signature`).
Adapt `src/services/mobileMoney.js` (`parseEvent`, `initiateCharge`) to your provider's real payload and API.
Authentication: new users **sign up** with email + password and confirm an emailed OTP (in the Supabase dashboard, enable email confirmation and put `{{ .Token }}` in the *Confirm signup* template); returning users **log in** with email + password only, and the session persists until they sign out. Create the demo account `test@evento.com` / `test123456` with `npm run seed:test-user --workspace apps/server` (needs a valid `SUPABASE_SECRET_KEY`).

## 3. Mobile
```
Copy-Item apps/mobile/.env.example apps/mobile/.env   # PowerShell; then fill in the real values
npm install                                     # from the repo root
cd apps/mobile
npx expo-doctor                                 # optional sanity check
npx expo run:android
```
Always run Expo commands from `apps/mobile`, or use the root scripts (`npm run android`, `npm start`). Running `npx expo ...` in the repo root fails with `Unable to resolve "../../App"` because the Expo app lives in `apps/mobile`.
Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/mobile/.env` using your Supabase project's API settings. For existing local setups, `EXPO_PUBLIC_SUPABASE_ANON_KEY` remains supported as a fallback. The app shows a setup screen if either value is missing or the URL is invalid. Restart Expo after editing `.env` so the values are included in the bundle. Never use the secret key in the mobile app or commit `.env`.
`plugins/withJava17.js` runs during prebuild: it aborts with a clear message unless the JDK is 17, injects
`compileOptions`/`kotlinOptions` for Java 17 into `android/app/build.gradle`, and pins `org.gradle.java.home` to your `JAVA_HOME`.
`expo-build-properties` sets compileSdk 35, targetSdk 35, buildTools 35.0.0.
Use an https `EXPO_PUBLIC_API_URL` (Railway URL or a tunnel) because Android blocks cleartext HTTP.

## Notes
- QR payload is `EVC1:<64-hex token>`; tickets and guest invitations share the same scanner/roster.
- Offline reception: roster cached in AsyncStorage, scans queued with client UUIDs, flushed via `checkin_batch` when NetInfo is online; dashboards update through Realtime.
- `expo-camera` replaces the deprecated `expo-barcode-scanner` for QR scanning.
