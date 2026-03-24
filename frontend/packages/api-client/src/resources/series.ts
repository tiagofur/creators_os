import type { OrdoApiClient } from '../client';

export interface SeriesItem {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  platform?: string | null;
  template?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SeriesEpisode {
  id: string;
  series_id: string;
  content_id?: string | null;
  episode_number: number;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SeriesPublishingSchedule {
  id: string;
  series_id: string;
  frequency: string;
  day_of_week?: number | null;
  time_of_day: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSeriesInput {
  title: string;
  description?: string | null;
  platform?: string | null;
}

export interface UpdateSeriesInput {
  title?: string | null;
  description?: string | null;
  platform?: string | null;
}

export interface AddEpisodeInput {
  content_id?: string | null;
  episode_number: number;
  title: string;
}

export interface UpdateEpisodeInput {
  title?: string | null;
  status?: string | null;
  content_id?: string | null;
}

export interface UpsertScheduleInput {
  frequency: string;
  day_of_week?: number | null;
  time_of_day: string;
  timezone?: string;
  is_active?: boolean;
}

export function createSeriesResource(client: OrdoApiClient) {
  return {
    list(workspaceId: string): Promise<SeriesItem[]> {
      return client.get<SeriesItem[]>(
        `/api/v1/workspaces/${workspaceId}/series`,
      );
    },

    get(workspaceId: string, seriesId: string): Promise<SeriesItem> {
      return client.get<SeriesItem>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}`,
      );
    },

    create(workspaceId: string, body: CreateSeriesInput): Promise<SeriesItem> {
      return client.post<SeriesItem>(
        `/api/v1/workspaces/${workspaceId}/series`,
        body,
      );
    },

    update(workspaceId: string, seriesId: string, body: UpdateSeriesInput): Promise<SeriesItem> {
      return client.put<SeriesItem>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}`,
        body,
      );
    },

    delete(workspaceId: string, seriesId: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}`,
      );
    },

    addEpisode(workspaceId: string, seriesId: string, body: AddEpisodeInput): Promise<SeriesEpisode> {
      return client.post<SeriesEpisode>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}/episodes`,
        body,
      );
    },

    updateEpisode(workspaceId: string, seriesId: string, episodeId: string, body: UpdateEpisodeInput): Promise<SeriesEpisode> {
      return client.put<SeriesEpisode>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}/episodes/${episodeId}`,
        body,
      );
    },

    deleteEpisode(workspaceId: string, seriesId: string, episodeId: string): Promise<void> {
      return client.delete<void>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}/episodes/${episodeId}`,
      );
    },

    upsertSchedule(workspaceId: string, seriesId: string, body: UpsertScheduleInput): Promise<SeriesPublishingSchedule> {
      return client.put<SeriesPublishingSchedule>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}/schedule`,
        body,
      );
    },
  };
}
