import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';

import { createRouter } from './router';
import { CatalogClient } from '@backstage/catalog-client';

import { FetchApi } from '@backstage/core-plugin-api';

const customFetchApi: FetchApi = {
  fetch: async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', 'Bearer guest'); // ✅ inject guest token
    return fetch(url, { ...options, headers });
  },
};

export const aiSummaryBackendPlugin = createBackendPlugin({
  pluginId: 'ai-summary-backend',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        discovery: coreServices.discovery,
        config: coreServices.rootConfig,
      },
      async init({ logger, httpRouter, discovery, config }) {
        const catalogApi = new CatalogClient({
          discoveryApi: discovery,
          fetchApi: customFetchApi, // ✅ correct property
        });

        // You can plug in a real TechInsightsApi or mock it here
        const techInsightsApi = {
          async getFacts(
            entityRef: { kind: string; namespace?: string; name: string },
            facts: string[],
          ) {
            logger.warn('Using mock techInsightsApi.getFacts');
            return {};
          },
        };

        httpRouter.use(
          await createRouter({
            logger,
            catalogApi,
            techInsightsApi,
          }),
        );
      },
    });
  },
});
