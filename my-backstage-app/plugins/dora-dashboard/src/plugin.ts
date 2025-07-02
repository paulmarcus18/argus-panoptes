/**
 * DORA Dashboard Plugin
 * Visualizes DevOps Research & Assessment metrics for system performance
 */
import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

// Register plugin with routing configuration
export const doraDashboardPlugin = createPlugin({
  id: 'dora-dashboard',
  routes: {
    root: rootRouteRef,
  },
});

// Create the main dashboard page component with lazy loading
export const DoraDashboardPage = doraDashboardPlugin.provide(
  createRoutableExtension({
    name: 'DoraDashboardPage',
    component: () =>
      import('./components/DashboardComponent').then(m => m.DashboardComponent),
    mountPoint: rootRouteRef,
  }),
);
