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
| New maintenance request | `POST /api/My/createMyServiceRequest`, `POST /api/My/uploadMyServiceRequestPhoto/{id}` | Creates service request against tenant's active lease; up to 4 photos, shrunk to 1600 px on the phone before sending |
| Request photos | `GET /api/My/getMyServiceRequestPhotos/{id}`, `GET /api/My/getMyServiceRequestPhotoFile/{photoId}` | Shown on the request page |
| Announcements list & detail, Home notice card | `GET /api/My/getMyAnnouncements`, `GET /api/My/getMyAnnouncement/{id}`, `POST /api/My/acknowledgeAnnouncement/{id}` | Filtered by tenant's property and portfolio-wide notices; acknowledgement persistence |
| Notifications list & actions, Home bell badge | `GET /api/My/getMyNotifications`, `POST /api/My/markNotificationRead/{id}`, `POST /api/My/markAllNotificationsRead` | Transactional alerts, individual and bulk mark read; returns only sent notifications (no queued, cancelled, or future scheduled ones). Tapping a `"booking"` notification (`href: "/requests/facilities"`) opens the facilities booking screen. Tapping an `"inspection"` notification (`href: "/requests/move"`) opens the move-in/move-out reports screen. Nothing sends email, SMS or push yet. |
| Visitors and passes (`/requests/visitors`, `/requests/visitor-pass/[id]`) | `GET /api/My/getMyVisitors`, `POST /api/My/inviteMyVisitor`, `PUT /api/My/cancelMyVisitor/{id}` | A pass covers the whole visit day on the phone's clock. The QR carries the pass's own random code, which the gate checks. Share Pass uses the phone's share menu. Cancel Pass works until the visitor arrives. Statuses are Expected, Arrived, Left, Cancelled and Expired |
| Facility bookings (`/requests/facilities`, `/requests/facilities/[id]`) | `GET /api/My/getMyFacilities`, `GET /api/My/getMyAvailability`, `GET /api/My/getMyBookings`, `POST /api/My/bookMyFacility`, `PUT /api/My/cancelMyBooking/{id}` | Bookable facilities at the tenant's leased properties, daily free/pending/booked/past slots in the company time zone, instant confirmation or `Pending` when `requiresApproval` is set, booking fee collected by the office, and cancellation until the slot starts; demo mode keeps `src/mock` |
| Move-in and move-out reports (`/requests/move`) | `GET /api/My/getMyInspections`, `GET /api/My/getMyInspection/{id}`, `GET /api/My/getMyInspectionPhotoFile/{photoId}`, `PUT /api/My/acceptMyInspection/{id}` | Move-in and move-out inspection reports for tenant's active lease; displays checklist conditions, meter readings, handover counts, damage notes, photos, charges, and one-click report acceptance with optional comment; notification kind `"inspection"` opens `/requests/move`. The move-out steps come from the lease (notice period), the move-out report (booked, completed) and the deposit (refunded); the clearance step is left out because the system doesn't track it; deposit held is the lease deposit and deductions are the report's damage charges. Demo mode keeps `src/mock` |
| Profile & contact details | `GET /api/My/getMyProfile` | Tenant profile, code, mobile, email, and sign out |

## Real in `api` mode (Staff — Property Manager & Maintenance)

| Screen / Block | Endpoint | Notes |
|---|---|---|
| Portfolio Dashboard (`/(tabs)/staff/dashboard`) | `GET /api/Dashboard/getDashboardSummary` | Units, occupancy %, rent roll, billed, collected, overdue, priority queue (PM & SuperAdmin only) |
| Facility Home (`/(tabs)/staff/facility`) | `GET /api/ServiceRequest/getServiceRequest` | Open, urgent, in-progress, and resolved ticket counts and priority queue (Maintenance & PM) |
| Tickets Register (`/(tabs)/staff/tickets`) | `GET /api/ServiceRequest/getServiceRequest` | Filterable ticket list (`All`, `Open`, `In Progress`, `Resolved`) |
| Ticket Detail (`/staff/ticket/[id]`) | `GET /api/ServiceRequest/getServiceRequest/{id}`, `PUT /api/ServiceRequest/updateServiceRequest/{id}`, `GET /api/ServiceRequest/getServiceRequestPhotos/{id}` | Status updates, technician assignment and the ticket's photos; delete allowed for PM/SuperAdmin only |
| New Ticket (`/staff/ticket/new`) | `POST /api/ServiceRequest/createServiceRequest`, `GET /api/Property/getProperty`, `GET /api/Unit/getUnit` | Creates ticket linked to property and unit with priority and visit time |
| Properties Register (`/(tabs)/staff/properties`) | `GET /api/Property/getProperty`, `GET /api/Unit/getUnit`, `GET /api/Lease/getLease`, `GET /api/Tenant/getTenant` | Properties list with units count, leases, and tenants |
| Property Detail (`/staff/property/[id]`) | `GET /api/Property/getProperty/{id}`, `GET /api/Unit/getUnit` | Property information and units list |
| Facilities Register (`/(tabs)/staff/facilities`) | `GET /api/Facility/getFacility`, `GET /api/Unit/getUnit` | Real facilities and units list |
| Staff Inspections (`/(tabs)/staff/facilities`, `/staff/inspection/[id]`) | `GET /api/Inspection/getInspection`, `GET /api/Inspection/getInspection/{id}`, `PUT /api/Inspection/updateInspection/{id}`, `PUT /api/Inspection/completeInspection/{id}`, `PUT /api/Inspection/cancelInspection/{id}`, `POST /api/Inspection/addInspectionItem/{id}`, `PUT /api/Inspection/updateInspectionItem/{id}`, `PUT /api/Inspection/removeInspectionItem/{id}`, `POST /api/Inspection/uploadInspectionPhoto/{id}`, `GET /api/Inspection/getInspectionPhotoFile/{id}`, `PUT /api/Inspection/removeInspectionPhoto/{id}`, `POST /api/Inspection/raiseInspectionTicket/{id}` | Live inspection queue for assigned properties; execution screen with checklist condition grading (Good, Fair, Damaged, N/A), notes, camera and gallery photo uploads (up to 4 per item), ticket creation directly from damaged items, meter readings/key handovers, cancellation with reason, and inspection completion; open inspections listed first; demo mode keeps `SAMPLE_INSPECTIONS` |
| Finance Hub (`/(tabs)/staff/finance`) | `GET /api/Invoice/getInvoicePaged`, `GET /api/Receipt/getReceiptPaged`, `GET /api/Installment/getInstallmentPaged` | Invoices, receipts, installments with retry error handling |
| Invoice Detail (`/staff/invoice/[id]`) | `GET /api/Invoice/getInvoice/{id}` | Paid amount, total due, and balance breakdown |
| Record Payment / New Receipt (`/staff/payment/new`) | `POST /api/Receipt/createReceipt`, `GET /api/Tenant/getTenant`, `GET /api/Lease/getLease` | Tenant and lease pickers, sends tenantId, leaseId, propertyId, amount, paymentMethod, and company currency |
| Lease Detail (`/staff/lease/[id]`) | `GET /api/Lease/getLease/{id}` | Start/end dates, monthly rent, and terms |
| Building Notices & Detail (`/(tabs)/staff/announcements`, the Notices section of `/(tabs)/staff/operations`, `/staff/announcement/[id]`) | `GET /api/Announcement/getAnnouncement`, `GET /api/Announcement/getAnnouncement/{id}` | Company announcements with property scope and status |
| Assets (the Assets section of `/(tabs)/staff/facilities`) | `GET /api/Asset/getAsset` | Tag, category, property and status |
| Work Orders (Maintenance home, the Work Orders section of `/(tabs)/staff/operations`) | `GET /api/WorkOrder/getWorkOrder` | Newest first; each opens its ticket |
| Approvals (`/(tabs)/staff/operations` for managers, `/(tabs)/staff/approvals` for Maintenance) | `GET /api/Approval/getApprovalRequest`, `POST /api/Approval/decideApprovalRequest/{id}` | Requests waiting for the signed-in person offer Approve, Return and Reject (a reason is needed for the last two); others show who they wait for |
| Inventory & Material Requisitions (`/(tabs)/staff/inventory`, `/staff/requisition/new`, Request Materials on `/staff/ticket/[id]`) | `GET /api/InventoryItem/getInventoryItem`, `GET /api/MaterialRequisition/getMaterialRequisition`, `POST /api/MaterialRequisition/createMaterialRequisition`, `PUT /api/MaterialRequisition/updateMaterialRequisition/{id}`, `PUT /api/MaterialRequisition/sendMaterialRequisition/{id}` | Live store stock levels (`onHand`, low/out-of-stock pills) and material requisitions (`Draft`, `InApproval`, `Issued`, `Returned`, `Rejected`) routed through `MaterialRequisition` approval workflows; demo mode keeps `src/mock/inventory.ts` |
| Staff Profile (`/profile` & `/staff/profile`) | `POST /api/Auth/logout` | Staff user info, role pill, language switch, theme selector, and sign out (no tenant profile calls) |

## Sample in `api` mode (no backend API yet)

| Feature / Screen | Sample Source | Reason |
|---|---|---|
| Pay Now and online payment (`/payments/pay`) | `src/mock/store.ts` | No payment gateway integration yet |
| Utilities (`/utilities`) | `initialUtilities` | No utility billing API yet |
| Lease escalation table (`/lease/escalation`) | `escalation` | The API stores only `EscalationRuleRef` text on the lease |
| Lease renewal & termination requests (`/lease/renewal`, `/lease/termination`) | `src/mock/store.ts` | No tenant-initiated renewal/termination request API yet |
| Digital access (`/requests/access`) | `accessCards` | No digital access / keycard API yet |
| Contacts (`/contacts`) | `contacts` | No property contacts API yet |
| AI Assistant (`/profile`) | Static row | Marked "Coming soon" |
