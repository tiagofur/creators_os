import type { OrdoApiClient } from '../client';
import type {
  Series,
  SeriesEpisode,
  SeriesPublishingSchedule,
  PlatformType,
  ContentStatus,
} from '@ordo/types';

export interface CreateSeriesInput {
  title: string;
  description?: string | null;
  platform?: PlatformType | null;
}

export interface UpdateSeriesInput {
  title?: string | null;
  description?: string | null;
  platform?: PlatformType | null;
}

export interface AddEpisodeInput {
  content_id?: string | null;
  episode_number: number;
  title: string;
}

export interface UpdateEpisodeInput {
  title?: string | null;
  status?: ContentStatus | null;
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
    list(workspaceId: string): Promise<Series[]> {
      return client.get<Series[]>(
        `/api/v1/workspaces/${workspaceId}/series`,
      );
    },

    get(workspaceId: string, seriesId: string): Promise<Series> {
      return client.get<Series>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}`,
      );
    },

    create(workspaceId: string, body: CreateSeriesInput): Promise<Series> {
      return client.post<Series>(
        `/api/v1/workspaces/${workspaceId}/series`,
        body,
      );
    },

    update(workspaceId: string, seriesId: string, body: UpdateSeriesInput): Promise<Series> {
      return client.put<Series>(
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

    updateEpisode(
      workspaceId: string,
      seriesId: string,
      episodeId: string,
      body: UpdateEpisodeInput,
    ): Promise<SeriesEpisode> {
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

    upsertSchedule(
      workspaceId: string,
      seriesId: string,
      body: UpsertScheduleInput,
    ): Promise<SeriesPublishingSchedule> {
      return client.put<SeriesPublishingSchedule>(
        `/api/v1/workspaces/${workspaceId}/series/${seriesId}/schedule`,
        body,
      );
    },
  };
}
