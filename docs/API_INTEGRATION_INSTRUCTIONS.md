# Tenant app: connect to the PMS API

The GreenView tenant app (`PMS_Mobile`, Expo SDK 57 + Expo Router) was built from the
manager's design with sample data only. This task makes it read and write real data from
the PMS API for a signed-in **Tenant**. Three projects in the `Sactech` folder are touched:

| Project | What changes |
|---|---|
| `PMS_API` (.NET) | Link a sign-in account to a tenant record; add tenant-only "my" endpoints |
| `PMS` (React website) | The Users page can link a Tenant account to a tenant record |
| `PMS_Mobile` (Expo) | Real sign-in, tenants-only gate, screens read the "my" endpoints |

## Ground rules

- **Never commit, push or create branches.** The user does all git work. When finished, list
  the changed files per project and suggest one short commit message for each.
- **Database changes only through an EF Core Code First migration** in
  `PMS_API/PMS.Infrastructure/Migrations`. Never run SQL that changes schema or data.
- **The database belongs to the user's manager.** The local API (`PMS_API/PMSApi`, port 5028)
  connects to that hosted database and **applies pending migrations when it starts**
  (Development). So the moment the API starts with your migration, it lands on the shared
  database. See the checkpoint at the end of Part 1.
- Never write a password, token or connection string into any file, doc or message. Never edit
  or commit `appsettings.Secrets.json`.
- Do not touch `HRMS`, `HRMS_V2`, `CashFlow*` (except reading `CashFlow_Mobile` to copy patterns).
- Do not change CORS. The app reaches the API through a proxy (see 3.1), so no new origin is needed.
- Every new UI string goes into **all 29 languages**: `PMS_Mobile/src/locales/*.json` for the
  app, `PMS/public/locales/<language>/<language>.<namespace>.json` for the website.
- Code comments say what a rule is, never "step 3" or "Part 2" from this file.
- Where no API exists, the screen keeps its sample data. Record it in `PMS_Mobile/docs/MOCK_VS_REAL.md`.

## What exists today

- `PMSApi/Authorization/Policies.cs` and `VerbAuthorizationConvention.cs`: every endpoint is
  `Manage` (SuperAdmin, PropertyManager) or `Maintenance` by convention. A **Tenant reaches only**
  `POST /api/Auth/login`, `/refresh`, `/logout`, `GET /api/Auth/me` and change-password
  (`SelfService`). An action or controller with its own `[Authorize(Policy = ...)]` is left alone
  by the convention.
- `User` (`PMS.Core/Entities/UserManagementEntities/User.cs`) has `CompanyId` and `Role`, but **no
  link to a `Tenant` row**. The JWT carries the role and `company_id`; `ApplicationDbContext`
  filters every query to the caller's company and hides soft-deleted rows.
- Login returns `LoginResponse { accessToken, refreshToken, accessTokenExpiration, ..., user }`;
  `user` is `UserResponse { id, username, displayName, email, role, companyId, currencyCode }`.
  Enums are sent as strings (`"Tenant"`).
- Tables the tenant screens need already exist: `Tenant`, `Lease`, `LeaseCharge`, `Deposit`,
  `Installment`, `Invoice`, `Receipt`, `TenantDocument` (+ `TenantDocumentFile`),
  `TenantVehicle`, `ParkingBay`, `ServiceRequest`, `Unit`, `Building`, `FloorZone`, `Property`.
  `ServiceRequest` has no photo attachments. Its `Category` is free text on the website.
- The website's tenant portal (`PMS/src/feature-module/portal`) signs in for real but its pages
  are sample data too. **Leave it as it is** in this task.
- `CashFlow_Mobile` already connects an Expo app to a .NET API this way. Copy and trim:
  `src/config.ts` (demo/api mode, API address), `metro.config.js` (dev proxy),
  `src/api/client.ts` (token, one refresh, `ApiError`, timeout), `src/auth/session.ts`
  (tokens and signed-in user), `vercel.json` (`/api` rewrite).

---

## Part 1: PMS_API

### 1.1 Link an account to a tenant

- `User.TenantId` (`Guid?`), a foreign key to `Tenant` with `OnDelete(SetNull)`, plus an index.
- Migration named for the change, for example `AddUserTenantLink`. Check that the generated
  migration contains **only** this column, FK and index. If it contains anything else, the
  snapshot is out of step: stop and tell the user.
- `CreateUserRequest`, `UpdateUserRequest`, `UserListItem` and `UserResponse` get `TenantId`.
  The user service enforces these rules:
  - role `Tenant` **requires** a `TenantId` of a tenant in the same company;
  - every other role must have `TenantId = null`;
  - one tenant record can be linked to at most one active account.

### 1.2 Tenant-only policy

In `Policies.cs`, add `TenantSelf = "TenantSelf"` → `RequireRole(nameof(UserRole.Tenant))`, and
update the summary table: "Tenant — SelfService, plus TenantSelf: their own records only".

### 1.3 `MyController` (`api/My`), the tenant's own records

The class carries `[Authorize(Policy = Policies.TenantSelf)]`. Every action:

- finds the caller's tenant from **their user row** (`ICurrentUserService.UserId` → `User.TenantId`),
  never from a route, query or body value;
- an account with no linked tenant gets **403** with a clear message ("This account is not
  linked to a tenancy");
- a record that exists but belongs to someone else returns **404**, the same as a missing one;
- reuses the existing services and repositories (ticket numbers, totals, file streaming). Add
  tenant-scoped query methods instead of copying logic.

"Current lease" means the tenant's lease with status `Active` or `NoticePeriod`. If there are
several, take the latest `StartDate`.

| Endpoint | Returns / does |
|---|---|
| `GET getMyProfile` | Tenant (number, names En/Ar, mobile, email); current lease summary (number, status, start, end, rent, frequency); unit (code, type, bedrooms, bathrooms, area, furnishing, view, balcony); floor, building and property names; parking bays from the tenant's vehicles; the vehicles themselves |
| `GET getMyLease` | Current lease in full: deposits, notice period, `EscalationRuleRef`, renewal notice date and charge lines (`LeaseCharge`), plus `Deposit` rows |
| `GET getMyInstallments` | Current lease's installments by due date |
| `GET getMyInvoices` | The tenant's invoices, newest first; include `outstandingAmount` |
| `GET getMyReceipts` | The tenant's receipts, newest first |
| `GET getMyReceipt/{id}` | One receipt, plus the invoice it pays |
| `GET getMyDocuments` | The tenant's documents (type, number, issue/expiry, verification status, file name) |
| `GET getMyDocumentFile/{id}` | The file of one of their documents, the same way `TenantDocumentController.getTenantDocumentFile` streams it |
| `GET getMyServiceRequests` | Their requests, newest first |
| `GET getMyServiceRequest/{id}` | One of their requests |
| `POST createMyServiceRequest` | Body: `category`, `subcategory?`, `priority`, `description`, `preferredVisitTime?`. The server sets `TenantId`, `UnitId` and `PropertyId` from the current lease and `Status = Open`, and allocates the ticket number through the existing service. Any other fields sent are ignored. No current lease → 400 with a clear message |

Return small view models in `PMS.Core/ViewModels/TenantOccupancyDTO` (or a new `MyDTO` folder),
never the entities.

### 1.4 Tests (the existing `PMS.Tests` project; do not add a new project)

In `PMS.Tests/Security`, follow the existing tests' style:

- a Tenant token still gets 403 on staff endpoints (for example `GET api/Lease/getLease`);
- a staff token gets 403 on `api/My/*`;
- tenant A cannot read tenant B's receipt, document file or service request by id (404);
- `createMyServiceRequest` ignores a posted `tenantId` or `unitId` that is not theirs;
- a Tenant account with no link gets 403 on `api/My/*`.

Run `dotnet build` and `dotnet test` from `PMS_API`.

### 1.5 Checkpoint: stop here

Do **not** start the API, and do not run `dotnet ef database update`. Show the user:

- the migration file;
- the list of new endpoints;
- the test results.

Then wait. The user will check with their manager before the migration reaches the shared
database. Continue only after the user says so.

---

## Part 2: PMS website, the Users page

In `PMS/src/feature-module/workflow-security/user/index.tsx` and `src/core/api/user-management.api.ts`:

- When the role is **Tenant**, show a required **Tenant** select listing the company's tenants
  (from the Tenant API) and send `tenantId`. For any other role, hide it and send `null`.
- The users list shows the linked tenant's name for Tenant accounts.
- New labels in all 29 languages (`masters` or `pages` namespace, whichever the page already uses).
- Run `npx tsc --noEmit`, `npx eslint .` and `npx vitest run` from `PMS`.

---

## Part 3: PMS_Mobile

### 3.1 Demo and live modes, and the API address

Copy and adapt from `CashFlow_Mobile`:

- **`src/config.ts`:**
  - `authMode` is `'api'` when `EXPO_PUBLIC_AUTH_MODE=api`, otherwise `'demo'`.
  - `apiBaseUrl` is `EXPO_PUBLIC_API_URL`, otherwise `'/api'` on web, otherwise `http://<hostUri>/api`.
  - **Demo stays the default**, so the manager's review link keeps working with sample data.
- **`metro.config.js`:** forward `/api/*` to `process.env.PMS_DEV_API ?? 'http://localhost:5028'`.
- **`vercel.json`:** add `{ "source": "/api/:path*", "destination": "https://sactech-001-site24.itempurl.com/api/:path*" }`
  before the app rewrite. This is the same live API the website uses.

### 3.2 Session and API client

- **`src/auth/session.ts`:** keep only sign-in, refresh, sign-out and the stored user. CashFlow's
  two-factor, trusted device and app lock are not needed. The access token lives in memory;
  the refresh token goes in `expo-secure-store` (`npx expo install expo-secure-store`). On web,
  the API's refresh cookie travels through the `/api` proxy. Read `currencyCode` and the name
  from `GET /api/Auth/me`.
- **`src/api/client.ts`:** the access token on every request, one refresh on 401, then sign out.
  `ApiError` carries the server's message.
- **`src/api/my.ts`:** one typed function per Part 1 endpoint. Types go in `src/api/types.ts`.

### 3.3 Sign-in: tenants only

- In api mode the sign-in screen starts **empty**: no sample username or password, and no
  "Sample app" note. Wrong details show the server's message.
- After sign-in, if `user.role !== 'Tenant'`, sign straight out and show: "This app is for
  residents. Staff, please use the PMS website." Do not show any tenant screen.
- A 403 "not linked" from `api/My` shows: "Your account isn't linked to a tenancy yet. Please
  contact the management office." Include a Sign Out button.
- In api mode, hide "New resident? Create an account": the management office creates accounts
  on the website. Demo mode keeps it.
- Sign Out on Profile calls `/api/Auth/logout`.

### 3.4 One data layer, two sources

Screens must not know the mode. Add hooks such as `useProfile`, `useLease`, `usePayments`,
`useDocuments` and `useRequests` (with loading, error and refresh) that:

- in **demo** mode, return the existing sample from `src/mock/data.ts` and `src/mock/store.ts`;
- in **api** mode, call `src/api/my.ts`.

Each screen then reads only the hooks. Every API screen gets a loading state, an error state
with Retry, pull to refresh, and the existing empty states. Keep the current layout and
design exactly; the manager has approved it.

Amounts use the company currency from `/Auth/me`, not a hard-coded OMR. Generalise
`omr()` in `src/lib/format.ts`; OMR keeps 3 decimals.

### 3.5 Screen → endpoint

| Screen | Endpoint | Notes |
|---|---|---|
| Dashboard greeting, unit line | `getMyProfile` | Arabic name when the app language is Arabic and one exists |
| Next Rent Due card | `getMyInstallments` | Earliest installment not `Paid` or `Cancelled` |
| Lease Expiry card | `getMyProfile` | Current lease `endDate`, days left |
| Outstanding card | `getMyInvoices` | Sum of `outstandingAmount` on `Posted`, `PartPaid` and `Overdue` |
| Active Requests card | `getMyServiceRequests` | Not `Resolved`/`Closed`, newest 2 |
| My Property, Unit, Building, Parking | `getMyProfile` | |
| Lease details, agreement, deposit | `getMyLease` | |
| Payment history, receipts, receipt detail | `getMyReceipts`, `getMyReceipt/{id}` | |
| Rent schedule | `getMyInstallments` | |
| Outstanding | `getMyInvoices` | |
| Documents list | `getMyDocuments` | |
| Document view, download, share | `getMyDocumentFile/{id}` | Native: `expo-file-system` + `expo-sharing` (`npx expo install expo-sharing`). Web: open a blob URL |
| Maintenance list, detail | `getMyServiceRequests`, `getMyServiceRequest/{id}` | Map as below |
| New maintenance request | `createMyServiceRequest` | Photo step stays, but photos are not uploaded yet: the API has no attachments. Say so in a small note in api mode |

**Request mapping**

| Field | Phone value | API value |
|---|---|---|
| Stage | `submitted` | `Open` with no `assignedTo` |
| | `assigned` | `Open` with `assignedTo` |
| | `inProgress` | `InProgress` or `OnHold` |
| | `completed` | `Resolved` or `Closed` |
| Priority | `low` / `normal` / `high` / `urgent` | `Low` / `Medium` / `High` / `Emergency` |
| Category | `airConditioning`, `plumbing`, `electrical`, `appliance`, `carpentry`, `pestControl`, `cleaning`, `other` | Send the English label ("Air Conditioning", "Plumbing", …) so staff read it on the website. Read it back the same way; an unknown label shows as Other with its text |

### 3.6 Stays sample, even in api mode

There is no API for the following yet. Keep the current sample behaviour and list each one in
`docs/MOCK_VS_REAL.md`:

- Pay Now and online payment (no payment gateway);
- utilities;
- lease escalation table (the API has only `EscalationRuleRef` text);
- renewal and termination requests;
- visitors and passes;
- facility bookings;
- move-in and move-out;
- digital access;
- announcements and notifications;
- contacts;
- request photos;
- AI Assistant ("Coming soon").

### 3.7 Docs

- **`README.md`:** how to run against the local API (`EXPO_PUBLIC_AUTH_MODE=api npx expo start`,
  with the API on 5028) and the two modes.
- **`docs/MOCK_VS_REAL.md`:** for each block, real or sample in api mode.

### 3.8 Checks

From `PMS_Mobile`, run `npx tsc --noEmit`, `npx eslint .` and `npx jest`. Jest's locale test
fails if any of the 29 languages misses a key.

---

## Testing end to end (after the user's go-ahead in 1.5)

1. The user starts the API and website, or allows you to start them.
2. On the website's Users page, the user creates a Tenant account linked to a tenant who has a
   current lease, installments, an invoice, a receipt, a document and a service request. The
   user types the password; do not write it anywhere.
3. Run the app in api mode, in the browser preview and in Expo Go. Check that:
   - every screen in 3.5 shows that tenant's data;
   - a new maintenance request appears on the website's Service Requests page with the right
     unit and category;
   - signing in with a staff account shows the "residents only" message;
   - demo mode still works exactly as before.

## Hand back

Report what is real and what is still sample. List the changed files per project, and give one
short commit message for each of `PMS_API`, `PMS` and `PMS_Mobile`. Do not commit.
