import {
  createPlugin,
  createRoutableExtension,
  createRouteRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const commitMessagesRouteRef = createRouteRef({
  id: 'commit-messages-test',
});

export const aiPluginPlugin = createPlugin({
  id: 'ai-plugin',
  routes: {
    root: rootRouteRef,
  },
});

export const AiPluginPage = aiPluginPlugin.provide(
  createRoutableExtension({
    name: 'AiPluginPage',
    component: () =>
      import('./components/AISummariesPage').then(
        m => m.AISummaries,
      ),
    mountPoint: rootRouteRef,
  }),
);
