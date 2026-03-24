import { authHandlers } from './auth';
import { ideasHandlers } from './ideas';
import { contentsHandlers } from './contents';
import { seriesHandlers } from './series';
import { workspacesHandlers } from './workspaces';
import { analyticsHandlers } from './analytics';
import { notificationsHandlers } from './notifications';
import { billingHandlers } from './billing';
import { usersHandlers } from './users';
import { sponsorshipsHandlers } from './sponsorships';
import { aiHandlers } from './ai';
import { searchHandlers } from './search';
import { gamificationHandlers } from './gamification';
import { integrationsHandlers } from './integrations';
import { teamHandlers } from './team';
import { publishingHandlers } from './publishing';
import { remixHandlers } from './remix';
import { uploadsHandlers } from './uploads';
import { auditLogsHandlers } from './audit-logs';

export const handlers = [
  ...authHandlers,
  ...ideasHandlers,
  ...contentsHandlers,
  ...seriesHandlers,
  ...workspacesHandlers,
  ...analyticsHandlers,
  ...notificationsHandlers,
  ...billingHandlers,
  ...usersHandlers,
  ...sponsorshipsHandlers,
  ...aiHandlers,
  ...searchHandlers,
  ...gamificationHandlers,
  ...integrationsHandlers,
  ...teamHandlers,
  ...publishingHandlers,
  ...remixHandlers,
  ...uploadsHandlers,
  ...auditLogsHandlers,
];
