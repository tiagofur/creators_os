import type { OrdoApiClient } from '../client';

export interface PresignInput {
  content_type: string;
  file_extension: string;
  workspace_id: string;
}

export interface PresignResponse {
  upload_url: string;
  object_key: string;
  expires_at: string;
}

export interface ConfirmInput {
  object_key: string;
}

export interface ConfirmResponse {
  message: string;
}

export interface DownloadResponse {
  download_url: string;
}

export function createUploadsResource(client: OrdoApiClient) {
  return {
    getPresignedUrl(body: PresignInput): Promise<PresignResponse> {
      return client.post<PresignResponse>(
        `/api/v1/uploads/presign`,
        body,
      );
    },

    confirmUpload(body: ConfirmInput): Promise<ConfirmResponse> {
      return client.post<ConfirmResponse>(
        `/api/v1/uploads/confirm`,
        body,
      );
    },

    getDownloadUrl(objectKey: string): Promise<DownloadResponse> {
      return client.get<DownloadResponse>(
        `/api/v1/uploads/${objectKey}`,
      );
    },
  };
}
