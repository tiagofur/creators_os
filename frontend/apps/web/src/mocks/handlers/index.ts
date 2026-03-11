import { authHandlers } from './auth';
import { ideasHandlers } from './ideas';
import { contentsHandlers, seriesHandlers } from './contents';
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
];
