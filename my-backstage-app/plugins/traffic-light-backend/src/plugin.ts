import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const trafficLightBackendModule = createBackendModule({
  pluginId: 'traffic-light',
  moduleId: 'default',
  register(env) {
    env.registerInit({
      deps: {
        router: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ router, logger }) {
        const trafficLightRouter = await createRouter({ logger });
        router.use('/traffic-light', trafficLightRouter);
      },
    });
  },
});
