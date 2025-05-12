import { createDevApp } from '@backstage/dev-utils';
import { doraDashboardPlugin, DoraDashboardPage } from '../src/plugin';

createDevApp()
  .registerPlugin(doraDashboardPlugin)
  .addPage({
    element: <DoraDashboardPage />,
    title: 'Root Page',
    path: '/dora-dashboard',
  })
  .render();
