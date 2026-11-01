# GreenView Residences — tenant app

The PMS tenant app for iPhone and Android, built with React Native and Expo (SDK 57), the
same setup as CashFlow_Mobile. **UI only for now:** every screen shows sample data from
`src/mock`, and nothing calls the PMS API yet (see `docs/MOCK_VS_REAL.md`).

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go on the phone (same Wi-Fi)
npx expo start --web    # or open it in a browser
```

Sign in with any details: the sample app always signs in as Ahmed Al Lawati.

## Checks

```bash
npx tsc --noEmit   # types
npx eslint .       # lint
npx jest           # every language has every string, with the same placeholders
```

## Where things are

| Path | What |
|---|---|
| `src/app/(auth)` | Welcome, Sign In, Create Account |
| `src/app/(app)/(tabs)` | The four tabs: Dashboard, My Property, Requests, Announcements |
| `src/app/(app)/…` | Lease, payments, utilities, documents, requests, notifications, contacts, profile |
| `src/mock` | Sample data and the in-memory store the screens change |
| `src/components/art.tsx` | The drawn building, logo and facility pictures (swap for photos later) |
| `src/config.ts` | The property name the app is branded with |
| `src/locales` | The 29 languages; English is the source |

## Web link for the manager

`vercel.json` builds the web version (`expo export -p web`). Import the GitHub repo into
Vercel once to get a shareable link, as with cashflow-mobile.
