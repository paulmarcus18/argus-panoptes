import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createDoraService } from './services/DoraService'; // change this to DoraService

/**
 * doraDashboardPlugin backend plugin
 *
 * @public
 */
export const doraDashboardPlugin = createBackendPlugin({
  pluginId: 'dora-dashboard',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
      },
      async init({ logger, httpAuth, httpRouter}) {
        const doraService = await createDoraService({
          logger
        });

        httpRouter.use(
          await createRouter({
            httpAuth,
            doraService,
          }),
        );
      },
    });
  },
});