# EstateFlow PMS Mobile — Mock vs Real Data (`demo` vs `api` mode)

In **demo mode** (`EXPO_PUBLIC_AUTH_MODE` unset or `demo`), every screen reads sample data from `src/mock/data.ts` and `src/mock/store.ts`.

In **API mode** (`EXPO_PUBLIC_AUTH_MODE=api`), screens read through the live API endpoints on `PMS_API`. All four user types can sign in; an account's company role narrows its user type, and staff tabs the role cannot open are left out (`src/auth/page-access.ts`, `MODULES`):
- **Tenant**: resident experience accessing `/api/My/*` through `src/hooks/use-tenancy.ts`.
- **PropertyManager & SuperAdmin**: portfolio dashboard, properties, finance, and operations accessing `PMS/src/core/api/*.api.ts` via `src/api/staff.ts`.
- **Maintenance**: facility maintenance home, tickets queue, and facilities accessing `src/api/staff.ts` (without calling the Dashboard summary API).

## Real in `api` mode (Tenant)

| Screen / Block | Endpoint | Notes |
|---|---|---|
| Sign in, token refresh, sign out | `POST /api/Auth/login`, `POST /api/Auth/refresh`, `POST /api/Auth/logout`, `GET /api/Auth/me` | Supports all four roles; reads company `currencyCode` from `/api/Auth/me` |
| Dashboard greeting & unit line | `GET /api/My/getMyProfile` | Uses `displayNameAr` / `propertyNameAr` / `buildingNameAr` in Arabic |
| Dashboard — Next Rent Due card | `GET /api/My/getMyInstallments` | Earliest installment whose status is not `Paid` or `Cancelled` |
| Dashboard — Lease Expiry card | `GET /api/My/getMyProfile` | Current lease `endDate` and days remaining |
| Dashboard — Outstanding card | `GET /api/My/getMyInvoices` | Sum of `outstandingAmount` across `Posted`, `PartPaid`, and `Overdue` invoices |
| Dashboard — Active Requests card | `GET /api/My/getMyServiceRequests` | Newest 2 requests not `Resolved` or `Closed` |
| My Property, Unit, Building, Parking | `GET /api/My/getMyProfile` | Unit specs, floor, building details, allocated parking bays, and registered vehicles |
| Lease management, agreement, deposit | `GET /api/My/getMyLease` | Lease status, dates, rent, payment frequency, notice period, charges, and deposit |
| Payment history, receipts list, detail | `GET /api/My/getMyReceipts`, `GET /api/My/getMyReceipt/{id}` | Tenant receipts and linked invoice numbers |
| Rental schedule | `GET /api/My/getMyInstallments` | Installments ordered by due date |
| Outstanding payments | `GET /api/My/getMyInvoices` | Open invoices (`Posted`, `PartPaid`, `Overdue`) |
| Documents list & download | `GET /api/My/getMyDocuments`, `GET /api/My/getMyDocumentFile/{id}` | Native file saving and sharing via blob/expo-sharing |
| Maintenance requests list & detail | `GET /api/My/getMyServiceRequests`, `GET /api/My/getMyServiceRequest/{id}` | Live ticket stage, priority, and category |
| New maintenance request | `POST /api/My/createMyServiceRequest` | Creates service request against tenant's active lease |
| Announcements list & detail | `GET /api/My/getMyAnnouncements`, `GET /api/My/getMyAnnouncement/{id}`, `POST /api/My/acknowledgeAnnouncement/{id}` | Filtered by tenant's property and portfolio-wide notices; acknowledgement persistence |
| Notifications list & actions | `GET /api/My/getMyNotifications`, `POST /api/My/markNotificationRead/{id}`, `POST /api/My/markAllNotificationsRead` | Transactional alerts, individual and bulk mark read; returns only sent notifications (no queued, cancelled, or future scheduled ones). Nothing sends email, SMS or push yet. |
| Profile & contact details | `GET /api/My/getMyProfile` | Tenant profile, code, mobile, email, and sign out |

## Real in `api` mode (Staff — Property Manager & Maintenance)

| Screen / Block | Endpoint | Notes |
|---|---|---|
| Portfolio Dashboard (`/(tabs)/staff/dashboard`) | `GET /api/Dashboard/getDashboardSummary` | Units, occupancy %, rent roll, billed, collected, overdue, priority queue (PM & SuperAdmin only) |
| Facility Home (`/(tabs)/staff/facility`) | `GET /api/ServiceRequest/getServiceRequest` | Open, urgent, in-progress, and resolved ticket counts and priority queue (Maintenance & PM) |
| Tickets Register (`/(tabs)/staff/tickets`) | `GET /api/ServiceRequest/getServiceRequest` | Filterable ticket list (`All`, `Open`, `In Progress`, `Resolved`) |
| Ticket Detail (`/staff/ticket/[id]`) | `GET /api/ServiceRequest/getServiceRequest/{id}`, `PUT /api/ServiceRequest/updateServiceRequest/{id}` | Status updates and technician assignment; delete allowed for PM/SuperAdmin only |
| New Ticket (`/staff/ticket/new`) | `POST /api/ServiceRequest/createServiceRequest`, `GET /api/Property/getProperty`, `GET /api/Unit/getUnit` | Creates ticket linked to property and unit with priority and visit time |
| Properties Register (`/(tabs)/staff/properties`) | `GET /api/Property/getProperty`, `GET /api/Unit/getUnit`, `GET /api/Lease/getLease`, `GET /api/Tenant/getTenant` | Properties list with units count, leases, and tenants |
| Property Detail (`/staff/property/[id]`) | `GET /api/Property/getProperty/{id}`, `GET /api/Unit/getUnit` | Property information and units list |
| Facilities Register (`/(tabs)/staff/facilities`) | `GET /api/Facility/getFacility`, `GET /api/Unit/getUnit` | Real facilities and units list |
| Finance Hub (`/(tabs)/staff/finance`) | `GET /api/Invoice/getInvoicePaged`, `GET /api/Receipt/getReceiptPaged`, `GET /api/Installment/getInstallmentPaged` | Invoices, receipts, installments with retry error handling |
| Invoice Detail (`/staff/invoice/[id]`) | `GET /api/Invoice/getInvoice/{id}` | Paid amount, total due, and balance breakdown |
| Record Payment / New Receipt (`/staff/payment/new`) | `POST /api/Receipt/createReceipt`, `GET /api/Tenant/getTenant`, `GET /api/Lease/getLease` | Tenant and lease pickers, sends tenantId, leaseId, propertyId, amount, paymentMethod, and company currency |
| Lease Detail (`/staff/lease/[id]`) | `GET /api/Lease/getLease/{id}` | Start/end dates, monthly rent, and terms |
| Building Notices & Detail (`/(tabs)/staff/announcements`, `/staff/announcement/[id]`) | `GET /api/Announcement/getAnnouncement`, `GET /api/Announcement/getAnnouncement/{id}` | Company announcements with property scope and status |
| Approvals (`/(tabs)/staff/operations` for managers, `/(tabs)/staff/approvals` for Maintenance) | `GET /api/Approval/getApprovalRequest`, `POST /api/Approval/decideApprovalRequest/{id}` | Requests waiting for the signed-in person offer Approve, Return and Reject (a reason is needed for the last two); others show who they wait for |
| Staff Profile (`/profile` & `/staff/profile`) | `POST /api/Auth/logout` | Staff user info, role pill, language switch, theme selector, and sign out (no tenant profile calls) |

## Sample in `api` mode (no backend API yet)

| Feature / Screen | Sample Source | Reason |
|---|---|---|
| Pay Now and online payment (`/payments/pay`) | `src/mock/store.ts` | No payment gateway integration yet |
| Utilities (`/utilities`) | `initialUtilities` | No utility billing API yet |
| Lease escalation table (`/lease/escalation`) | `escalation` | The API stores only `EscalationRuleRef` text on the lease |
| Lease renewal & termination requests (`/lease/renewal`, `/lease/termination`) | `src/mock/store.ts` | No tenant-initiated renewal/termination request API yet |
| Visitors and passes (`/requests/visitors`, `/requests/visitor-pass/[id]`) | `initialVisitors` | No visitor pass API yet |
| Facility bookings (`/requests/facilities/*`) | `facilities`, `initialBookings` | No facility booking API yet |
| Move-in and move-out (`/requests/move`) | `moveIn`, `moveOutSteps` | No move-in/move-out inspection API yet |
| Digital access (`/requests/access`) | `accessCards` | No digital access / keycard API yet |
| Work Orders (`/(tabs)/staff/facility`, `operations.tsx`) | `SAMPLE_WORK_ORDERS` in `src/api/staff.ts` | No work order API yet |
| Assets & Inspections (`/(tabs)/staff/facilities`) | `SAMPLE_ASSETS`, `SAMPLE_INSPECTIONS` in `src/api/staff.ts` | No asset management or inspection API yet |
| Inventory & Material Requests | Sample data | No inventory or material requisition API yet |
| Contacts (`/contacts`) | `contacts` | No property contacts API yet |
| Maintenance request photos (`/requests/maintenance/new`) | Local picker state only | The service request API does not store attachments yet |
| AI Assistant (`/profile`) | Static row | Marked "Coming soon" |
