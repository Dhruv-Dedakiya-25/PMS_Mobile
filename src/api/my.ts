/**
 * One typed function per /api/My endpoint on PMS_API.
 */
import { apiGet, apiPost, sendAuthed } from '@/api/client';
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
