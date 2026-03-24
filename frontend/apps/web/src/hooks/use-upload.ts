'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createUploadsResource } from '@ordo/api-client';

const uploadsApi = createUploadsResource(apiClient);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

interface UploadOptions {
  /** Workspace ID (required by the presign endpoint) */
  workspaceId: string;
  /** Optional max file size override in bytes (default 50 MB) */
  maxFileSize?: number;
}

interface UploadResult {
  /** The object key stored in the backend */
  objectKey: string;
  /** The presigned upload URL (useful if the caller needs it) */
  uploadUrl: string;
}

function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : 'bin';
}

/**
 * Upload a file using XMLHttpRequest for progress tracking.
 * Returns a promise that resolves when the upload is complete.
 */
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Reusable file upload hook.
 *
 * Handles the full presign -> upload -> confirm flow with progress tracking.
 *
 * @example
 * ```tsx
 * const { upload, isUploading, progress, error, reset } = useUpload();
 *
 * async function handleFile(file: File) {
 *   const result = await upload(file, { workspaceId: 'ws_123' });
 *   console.log('Uploaded:', result.objectKey);
 * }
 * ```
 */
export function useUpload() {
  const [progress, setProgress] = React.useState(0);

  const mutation = useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options: UploadOptions;
    }): Promise<UploadResult> => {
      const maxSize = options.maxFileSize ?? MAX_FILE_SIZE;

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(
          `Unsupported file type "${file.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
        );
      }

      // Validate file size
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        throw new Error(`File size exceeds the ${maxMB} MB limit.`);
      }

      setProgress(0);

      // Step 1: Get presigned URL
      const presign = await uploadsApi.getPresignedUrl({
        content_type: file.type,
        file_extension: getFileExtension(file),
        workspace_id: options.workspaceId,
      });

      // Step 2: Upload directly to presigned URL with progress
      await uploadWithProgress(presign.upload_url, file, setProgress);

      // Step 3: Confirm upload
      await uploadsApi.confirmUpload({ object_key: presign.object_key });

      return {
        objectKey: presign.object_key,
        uploadUrl: presign.upload_url,
      };
    },
    onSettled: () => {
      // Reset progress after a short delay so the UI can show 100%
      setTimeout(() => setProgress(0), 500);
    },
  });

  const upload = React.useCallback(
    (file: File, options: UploadOptions): Promise<UploadResult> => {
      return mutation.mutateAsync({ file, options });
    },
    [mutation],
  );

  const reset = React.useCallback(() => {
    mutation.reset();
    setProgress(0);
  }, [mutation]);

  return {
    /** Execute the full upload flow (presign -> PUT -> confirm) */
    upload,
    /** Whether an upload is currently in progress */
    isUploading: mutation.isPending,
    /** Upload progress percentage (0-100) */
    progress,
    /** The last upload error, if any */
    error: mutation.error,
    /** Reset error and progress state */
    reset,
  };
}
