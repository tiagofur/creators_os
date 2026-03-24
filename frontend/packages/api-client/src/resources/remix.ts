import type { OrdoApiClient } from '../client';

export interface RemixJob {
  id: string;
  workspace_id: string;
  user_id: string;
  status: string;
  input_url: string;
  results?: Record<string, unknown>;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

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

export interface RemixContent {
  id: string;
  workspace_id: string;
  title: string;
  [key: string]: unknown;
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

    applyResults(workspaceId: string, jobId: string, body: ApplyResultsInput): Promise<RemixContent[]> {
      return client.post<RemixContent[]>(
        `/api/v1/workspaces/${workspaceId}/remix/${jobId}/apply`,
        body,
      );
    },
  };
}
