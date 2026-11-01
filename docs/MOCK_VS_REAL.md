# What is mock and what will replace it

Everything in the app is sample data today. All of it lives in `src/mock/data.ts`, each
block named after the API that will replace it; `src/mock/store.ts` holds what the screens
change while the app runs (lost on restart). Dates count from today, so the sample never
looks stale.

| Screen data | Sample source | Replaced by |
|---|---|---|
| Tenant name, code, contact | `tenant` | Tenant API, linked to the sign-in account |
| Property, building, unit | `property`, `unit` | Property, Building, Unit APIs |
| Lease, escalation, deposit | `lease`, `escalation` | Lease API |
| Parking bay | `parking` | ParkingBay API |
| Rent payments, receipts, schedule | `initialPayments`, `rentalSchedule` | Invoice and Receipt APIs |
| Utility bills | `initialUtilities` | A utility billing API (not built) |
| Documents | `documents` | TenantDocument API |
| Maintenance requests | `initialRequests` | ServiceRequest API |
| Visitors and passes | `initialVisitors` | A visitor pass API (not built) |
| Facilities and bookings | `facilities`, `initialBookings` | Facility API and a booking API (not built) |
| Move-in / move-out | `moveIn`, `moveOutSteps` | An inspection API (not built) |
| Access cards, mobile key | `accessCards` | An access control API (not built) |
| Announcements | `announcements` | An Announcement API (not built) |
| Notifications | `initialNotifications` | A Notification API (not built) |
| Contacts | `contacts` | A property contacts API (not built) |

Sign-in accepts any details. Payments, downloads and sharing show a "sample app" note
instead of acting. The AI Assistant is shown as "Coming soon" on Profile.
