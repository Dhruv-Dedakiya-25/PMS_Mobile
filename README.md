# EstateFlow — resident and staff app

The PMS tenant app for iPhone, Android, and Web, built with React Native and Expo (SDK 57).

## Two modes: Demo and Live API

The app supports two build-time modes controlled by `EXPO_PUBLIC_AUTH_MODE`:

- **Demo mode (`demo`, default):** every screen renders sample data from `src/mock` and never calls the server. Sign in with any credentials to explore the app as the sample resident.
- **API mode (`api`):** signs in against `PMS_API` (tenants only) and loads the signed-in tenant's profile, unit, building, parking, lease, installments, invoices, receipts, documents, and maintenance service requests from `/api/My/*` (see `docs/MOCK_VS_REAL.md`).

## Run it

### Demo mode (default)

```bash
npm install
npx expo start          # scan the QR code with Expo Go on the phone (same Wi-Fi)
npx expo start --web    # or open it in a browser
```

### Live API mode (against local PMS_API on port 5028)

With `PMS_API` running locally on `http://localhost:5028`:

```bash
EXPO_PUBLIC_AUTH_MODE=api npx expo start
EXPO_PUBLIC_AUTH_MODE=api npx expo start --web
```

In development, `metro.config.js` forwards `/api/*` requests to `process.env.PMS_DEV_API ?? 'http://localhost:5028'`, so both browser preview and Expo Go on the same Wi-Fi talk to the API without CORS issues. You can also point directly to another API URL via `EXPO_PUBLIC_API_URL`.

## Checks

```bash
npx tsc --noEmit   # types
npx eslint .       # lint
npx jest           # every language has every string, with the same placeholders
```

## Where things are

| Path | What |
|---|---|
| `src/app/(auth)` | Sign In, Create Account (demo mode) |
| `src/app/(app)/(tabs)` | The four tabs: Dashboard, My Property, Requests, Announcements |
| `src/app/(app)/…` | Lease, payments, utilities, documents, requests, notifications, contacts, profile |
| `src/auth/session.ts` | Live session (access token in memory, refresh token in `expo-secure-store` / HttpOnly cookie) |
| `src/api/client.ts` | Authenticated `fetch` wrapper with automatic 401 token refresh |
| `src/api/my.ts` | Typed functions for `/api/My/*` endpoints |
| `src/hooks/use-tenancy.ts` | Unified data hooks (`useProfile`, `useLease`, `usePayments`, `useDocuments`, `useRequests`) |
| `src/mock` | Sample data and the in-memory store used in demo mode and for features without an API yet |
| `src/locales` | All 29 languages; English is the source |

## Web link for the manager

`vercel.json` builds the web version (`expo export -p web`) and proxies `/api/:path*` to the live PMS API before the SPA rewrite. Demo mode remains the default unless `EXPO_PUBLIC_AUTH_MODE=api` is configured in the environment.
