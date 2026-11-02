# Mock vs Real Data (`demo` vs `api` mode)

In **demo mode** (`EXPO_PUBLIC_AUTH_MODE` unset or `demo`), every screen reads sample data from `src/mock/data.ts` and `src/mock/store.ts`.

In **API mode** (`EXPO_PUBLIC_AUTH_MODE=api`), screens read through the hooks in `src/hooks/use-tenancy.ts`, which call `/api/Auth/*` and `/api/My/*` on `PMS_API` for everything backed by an API and keep sample behaviour for features that do not have backend endpoints yet.

## Real in `api` mode

| Screen / Block | Endpoint | Notes |
|---|---|---|
| Sign in, token refresh, sign out | `POST /api/Auth/login`, `POST /api/Auth/refresh`, `POST /api/Auth/logout`, `GET /api/Auth/me` | Refuses non-`Tenant` roles with the residents-only message; reads company `currencyCode` from `/api/Auth/me` |
| Dashboard greeting & unit line | `GET /api/My/getMyProfile` | Uses `displayNameAr` / `propertyNameAr` / `buildingNameAr` when the app language is Arabic and an Arabic name exists |
| Dashboard — Next Rent Due card | `GET /api/My/getMyInstallments` | Earliest installment whose status is not `Paid` or `Cancelled` |
| Dashboard — Lease Expiry card | `GET /api/My/getMyProfile` | Current lease `endDate` and days remaining |
| Dashboard — Outstanding card | `GET /api/My/getMyInvoices` | Sum of `outstandingAmount` across `Posted`, `PartPaid`, and `Overdue` invoices |
| Dashboard — Active Requests card | `GET /api/My/getMyServiceRequests` | Newest 2 requests not `Resolved` or `Closed` |
| My Property, Unit, Building, Parking | `GET /api/My/getMyProfile` | Unit specs, floor, building details, allocated parking bays, and registered tenant vehicles |
| Lease management, details, agreement, deposit | `GET /api/My/getMyLease` | Lease status, dates, rent, payment frequency, notice period, `escalationRuleRef`, charges, and security deposit record. Escalation, the deposit's paid-on date and its receipt number show "—" when the lease has no value for them. |
| Payment history, receipts list, receipt detail | `GET /api/My/getMyReceipts`, `GET /api/My/getMyReceipt/{id}` | Tenant receipts and linked invoice numbers |
| Rental schedule | `GET /api/My/getMyInstallments` | Installments ordered by due date (`paid`, `due`, `upcoming`) |
| Outstanding payments | `GET /api/My/getMyInvoices` | Open invoices (`Posted`, `PartPaid`, `Overdue`) and next rent due |
| Documents list | `GET /api/My/getMyDocuments` | Tenant documents metadata |
| Document view, download, share | `GET /api/My/getMyDocumentFile/{id}` | Native writes via `expo-file-system` and shares via `expo-sharing`; Web opens or downloads a blob URL |
| Maintenance requests list & detail | `GET /api/My/getMyServiceRequests`, `GET /api/My/getMyServiceRequest/{id}` | Maps stage (`Open`/`InProgress`/`OnHold`/`Resolved`/`Closed`), priority (`Low`/`Medium`/`High`/`Emergency`), and category |
| New maintenance request | `POST /api/My/createMyServiceRequest` | Creates a service request against the tenant's active lease |
| Profile header & contact details | `GET /api/My/getMyProfile` | Tenant name, code, mobile, email, unit line, and `/api/Auth/logout` |

## Sample in `api` mode (no backend API yet)

| Feature / Screen | Sample Source | Reason |
|---|---|---|
| Pay Now and online payment (`/payments/pay`) | `src/mock/store.ts` | No payment gateway integration yet |
| Utilities (`/utilities`) | `initialUtilities` | No utility billing API yet |
| Lease escalation table (`/lease/escalation`) | `escalation` | The API stores only `EscalationRuleRef` text on the lease |
| Lease renewal and termination requests (`/lease/renewal`, `/lease/termination`) | `src/mock/store.ts` | No tenant-initiated renewal/termination request API yet |
| Visitors and passes (`/requests/visitors`, `/requests/visitor-pass/[id]`) | `initialVisitors` | No visitor pass API yet |
| Facility bookings (`/requests/facilities/*`) | `facilities`, `initialBookings` | No facility booking API yet |
| Move-in and move-out (`/requests/move`) | `moveIn`, `moveOutSteps` | No move-in/move-out inspection API yet |
| Digital access (`/requests/access`) | `accessCards` | No digital access / keycard API yet |
| Announcements and notifications (`/(tabs)/announcements`, `/announcements/[id]`, `/notifications`) | `announcements`, `initialNotifications` | No announcements or notifications API yet |
| Contacts (`/contacts`) | `contacts` | No property contacts API yet |
| Maintenance request photos (`/requests/maintenance/new`) | Local picker state only | The service request API does not store attachments yet (noted on the photo step in `api` mode) |
| AI Assistant (`/profile`) | Static row | Marked "Coming soon" |
