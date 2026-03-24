import type { OrdoApiClient } from '../client';
import type { RemixJob, ContentItem } from '@ordo/types';

export interface SubmitAnalysisInput {
  input_url: string;
}

export interface SubmitAnalysisResponse {
  job_id: string;
  status_url: string;
  status: string;
}

export interface ApplyResultsInput {
  clip_ids: string[];
}

export function createRemixResource(client: OrdoApiClient) {
  return {
    submitAnalysis(workspaceId: string, body: SubmitAnalysisInput): Promise<SubmitAnalysisResponse> {
      return client.post<SubmitAnalysisResponse>(
        `/api/v1/workspaces/${workspaceId}/remix/analyze`,
        body,
      );
    },

    getJobStatus(workspaceId: string, jobId: string): Promise<RemixJob> {
      return client.get<RemixJob>(
        `/api/v1/workspaces/${workspaceId}/remix/${jobId}/status`,
      );
    },

    getJobResults(workspaceId: string, jobId: string): Promise<Record<string, unknown>> {
      return client.get<Record<string, unknown>>(
        `/api/v1/workspaces/${workspaceId}/remix/${jobId}/results`,
      );
    },

    applyResults(workspaceId: string, jobId: string, body: ApplyResultsInput): Promise<ContentItem[]> {
      return client.post<ContentItem[]>(
        `/api/v1/workspaces/${workspaceId}/remix/${jobId}/apply`,
        body,
      );
    },
  };
}
