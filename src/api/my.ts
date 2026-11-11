/**
 * One typed function per /api/My endpoint on PMS_API.
 */
import { apiGet, apiImage, apiPost, apiPut, apiUploadPhoto, sendAuthed } from '@/api/client';
import type {
  CreateMyServiceRequestDto,
  MyDocumentDto,
  MyInstallmentDto,
  MyInvoiceDto,
  MyLeaseDto,
  MyProfileDto,
  MyReceiptDetailDto,
  MyReceiptDto,
  MyServiceRequestDto,
  MyAnnouncementDto,
  MyNotificationDto,
  MyVisitorDto,
  InviteMyVisitorDto,
} from '@/api/types';

export const getMyProfile = () => apiGet<MyProfileDto>('/My/getMyProfile');

export const getMyLease = () => apiGet<MyLeaseDto | null>('/My/getMyLease');

export const getMyInstallments = () => apiGet<MyInstallmentDto[]>('/My/getMyInstallments');

export const getMyInvoices = () => apiGet<MyInvoiceDto[]>('/My/getMyInvoices');

export const getMyReceipts = () => apiGet<MyReceiptDto[]>('/My/getMyReceipts');

export const getMyReceipt = (id: string) => apiGet<MyReceiptDetailDto>(`/My/getMyReceipt/${id}`);

export const getMyDocuments = () => apiGet<MyDocumentDto[]>('/My/getMyDocuments');

export async function getMyDocumentFile(id: string): Promise<{ blob: Blob; contentType: string; fileName?: string }> {
  const res = await sendAuthed('GET', `/My/getMyDocumentFile/${id}`);
  const blob = await res.blob();
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob, contentType, fileName: match?.[1] };
}

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

