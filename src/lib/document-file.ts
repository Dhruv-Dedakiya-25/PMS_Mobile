import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getMyDocumentFile } from '@/api/my';
import { authMode } from '@/config';

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'document.pdf';
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl;
      const binary = globalThis.atob ? globalThis.atob(base64) : '';
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      resolve(bytes);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downloads or shares a tenant document file.
 * - Demo mode returns `'sample'` so the caller shows the sample note.
 * - Web opens a blob URL (or triggers a download).
 * - Native writes the file via expo-file-system and opens the share sheet via expo-sharing.
 */
export async function openOrShareDocument(
  id: string,
  fallbackName: string,
  action: 'download' | 'share',
): Promise<'sample' | 'done'> {
  if (authMode === 'demo') return 'sample';

  const { blob, contentType, fileName } = await getMyDocumentFile(id);
  const resolvedName = sanitizeFileName(fileName || fallbackName || 'document.pdf');

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    if (action === 'download' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.download = resolvedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'done';
  }

  const bytes = await blobToUint8Array(blob);
  const file = new File(Paths.cache, resolvedName);
  file.create({ overwrite: true });
  file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: contentType,
      dialogTitle: resolvedName,
    });
  }
  return 'done';
}
