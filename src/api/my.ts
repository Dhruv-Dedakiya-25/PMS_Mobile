/**
 * One typed function per /api/My endpoint on PMS_API.
 */
import { apiGet, apiImage, apiPost, apiPut, apiUploadPhoto, sendAuthed } from '@/api/client';
import type {
  ApiMoveOutReason,
  BookMyFacilityDto,
  CreateMyServiceRequestDto,
  InspectionDto,
  InviteMyVisitorDto,
  MyAccessCardDto,
  MyAccessKeyDto,
  MyAnnouncementDto,
  MyContactDto,
  MyDocumentDto,
  MyFacilityBookingDto,
  MyFacilityDto,
  MyFacilitySlotDto,
  MyInstallmentDto,
  MyInvoiceDto,
  MyLeaseDto,
  MyLeaseRequestDto,
  MyNotificationDto,
  MyProfileDto,
  MyReceiptDetailDto,
  MyReceiptDto,
  MyServiceRequestDto,
  MyViolationAppealDto,
  MyViolationDto,
  MyViolationEvidenceDto,
  MyVisitorDto,
  ServiceCategoryOptionDto,
  ViolationAppealType,
} from '@/api/types';

export const getMyProfile = () => apiGet<MyProfileDto>('/My/getMyProfile');

export const getMyLease = () => apiGet<MyLeaseDto | null>('/My/getMyLease');

export const getMyInstallments = () => apiGet<MyInstallmentDto[]>('/My/getMyInstallments');

export const getMyInvoices = () => apiGet<MyInvoiceDto[]>('/My/getMyInvoices');

export const getMyReceipts = () => apiGet<MyReceiptDto[]>('/My/getMyReceipts');

export const getMyReceipt = (id: string) => apiGet<MyReceiptDetailDto>(`/My/getMyReceipt/${id}`);

export const getMyDocuments = () => apiGet<MyDocumentDto[]>('/My/getMyDocuments');

export const getMyDocumentFile = (id: string) => fileFrom(`/My/getMyDocumentFile/${id}`);

/** A protected file with its type and the name the server gives it. */
export async function fileFrom(path: string): Promise<{ blob: Blob; contentType: string; fileName?: string }> {
  const res = await sendAuthed('GET', path);
  const blob = await res.blob();
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob, contentType, fileName: match?.[1] };
}

export const getMyServiceCategories = () => apiGet<ServiceCategoryOptionDto[]>('/My/getServiceCategories');

export const getMyServiceRequests = () => apiGet<MyServiceRequestDto[]>('/My/getMyServiceRequests');

export const getMyServiceRequest = (id: string) => apiGet<MyServiceRequestDto>(`/My/getMyServiceRequest/${id}`);

export const createMyServiceRequest = (request: CreateMyServiceRequestDto) =>
  apiPost<MyServiceRequestDto>('/My/createMyServiceRequest', request);

/** Adds an already-shrunk JPEG to one of the tenant's own requests. */
export const uploadMyServiceRequestPhoto = (id: string, uri: string) =>
  apiUploadPhoto(`/My/uploadMyServiceRequestPhoto/${id}`, uri);

/** The photos on one of the tenant's own requests, as data URIs ready to show. */
export async function getMyServiceRequestPhotoUris(id: string): Promise<string[]> {
  const list = await apiGet<{ id: string }[]>(`/My/getMyServiceRequestPhotos/${id}`);
  return Promise.all(list.map((p) => apiImage(`/My/getMyServiceRequestPhotoFile/${p.id}`)));
}

export const getMyAnnouncements = () => apiGet<MyAnnouncementDto[]>('/My/getMyAnnouncements');

export const getMyAnnouncement = (id: string) => apiGet<MyAnnouncementDto>(`/My/getMyAnnouncement/${id}`);

export const acknowledgeAnnouncement = (id: string) =>
  apiPost<{ success: boolean }>(`/My/acknowledgeAnnouncement/${id}`, {});

export const getMyNotifications = () => apiGet<MyNotificationDto[]>('/My/getMyNotifications');

export const markNotificationRead = (id: string) =>
  apiPost<{ success: boolean }>(`/My/markNotificationRead/${id}`, {});

export const markAllNotificationsRead = () =>
  apiPost<{ success: boolean }>('/My/markAllNotificationsRead', {});

/** The tenant's visitor passes, newest visit first. */
export const getMyVisitors = () => apiGet<MyVisitorDto[]>('/My/getMyVisitors');

/** A pass for the tenant's own unit, ready at the gate at once. */
export const inviteMyVisitor = (visit: InviteMyVisitorDto) => apiPost<MyVisitorDto>('/My/inviteMyVisitor', visit);

/** Cancels one of the tenant's own passes before the visitor comes. */
export const cancelMyVisitor = (id: string) => apiPut<MyVisitorDto>(`/My/cancelMyVisitor/${id}`, {});

/** Bookable facilities at the properties where the tenant has a current lease. */
export const getMyFacilities = () => apiGet<MyFacilityDto[]>('/My/getMyFacilities');

/** The day's slots for one of those facilities. */
export const getMyAvailability = (facilityId: string, date: string) =>
  apiGet<MyFacilitySlotDto[]>(
    `/My/getMyAvailability?facilityId=${encodeURIComponent(facilityId)}&date=${encodeURIComponent(date)}`,
  );

/** The tenant's own facility bookings, newest slot first. */
export const getMyBookings = () => apiGet<MyFacilityBookingDto[]>('/My/getMyBookings');

/** Books one free slot on a bookable facility of the tenant's property. */
export const bookMyFacility = (booking: BookMyFacilityDto) =>
  apiPost<MyFacilityBookingDto>('/My/bookMyFacility', booking);

/** Cancels one of the tenant's own upcoming bookings. */
export const cancelMyBooking = (id: string, reason?: string) =>
  apiPut<MyFacilityBookingDto>(`/My/cancelMyBooking/${id}`, { reason });

/** The tenant's own move-in and move-out inspection reports. */
export const getMyInspections = () => apiGet<InspectionDto[]>('/My/getMyInspections');

/** One inspection with its checklist, condition of each item, meter readings, notes, and photos. */
export const getMyInspection = (id: string) => apiGet<InspectionDto>(`/My/getMyInspection/${id}`);

/** Loads an inspection photo as a data URI for display. */
export const getMyInspectionPhotoUri = (photoId: string) => apiImage(`/My/getMyInspectionPhotoFile/${photoId}`);

/** Tenant accepts the move-in or move-out inspection report with an optional comment. */
export const acceptMyInspection = (id: string, comment?: string) =>
  apiPut<InspectionDto>(`/My/acceptMyInspection/${id}`, { comment });

/** The violations recorded against the tenant, newest first, each with its appeals. */
export const getMyViolations = () => apiGet<MyViolationDto[]>('/My/getMyViolations');

export const getMyViolationEvidence = (violationId: string) =>
  apiGet<MyViolationEvidenceDto[]>(`/My/getMyViolationEvidence/${violationId}`);

/** A photo of the evidence, as a data URI an Image can show. */
export const getMyViolationEvidenceImage = (id: string) => apiImage(`/My/getMyViolationEvidenceFile/${id}`);

export const getMyViolationEvidenceFile = (id: string) => fileFrom(`/My/getMyViolationEvidenceFile/${id}`);

/** Appeals a violation or asks the office about it; refused while an earlier one is still pending. */
export const appealMyViolation = (violationId: string, body: { type: ViolationAppealType; reason: string }) =>
  apiPost<MyViolationAppealDto>(`/My/appealMyViolation/${violationId}`, body);

export const getMyContacts = () => apiGet<MyContactDto[]>('/My/getMyContacts');

export const getMyLeaseRequests = () => apiGet<MyLeaseRequestDto[]>('/My/getMyLeaseRequests');

export const requestMyRenewal = (termMonths: 12 | 24, note?: string) =>
  apiPost<MyLeaseRequestDto>('/My/requestMyRenewal', { termMonths, note });

export const giveMyNotice = (moveOutDate: string, reason: ApiMoveOutReason, note?: string) =>
  apiPost<MyLeaseRequestDto>('/My/giveMyNotice', { moveOutDate, reason, note });

export const getMyAccessKey = () => apiGet<MyAccessKeyDto>('/My/getMyAccessKey');

export const getMyAccessCards = () => apiGet<MyAccessCardDto[]>('/My/getMyAccessCards');

export const reportMyAccessCardLost = (id: string) => apiPut<MyAccessCardDto>(`/My/reportMyAccessCardLost/${id}`, {});

