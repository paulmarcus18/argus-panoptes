import { Router } from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import { getCommitMessagesBySystem } from '../utils/getCommitMessagesBySystem';

export interface PluginEnvironment {
  logger: LoggerService;
  catalogApi: CatalogClient;
  techInsightsApi: {
    getFacts: (
      entityRef: { kind: string; namespace?: string; name: string },
      facts: string[],
    ) => Promise<Record<string, any>>;
  };
}

export async function createRouter(env: PluginEnvironment): Promise<Router> {
  const router = Router();

  router.get('/commit-messages', async (_req, res) => {
    try {
      const result = await getCommitMessagesBySystem(
        env.catalogApi,
        env.techInsightsApi,
        env.logger,
      );
      res.json(result);
    } catch (e) {
      if (e instanceof Error) {
        env.logger.error('Failed to get commit messages', e);
      } else {
        env.logger.error('Unknown error', new Error(String(e)));
      }
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // ✅ Run aggregation once at backend startup
  (async () => {
    try {
      const result = await getCommitMessagesBySystem(
        env.catalogApi,
        env.techInsightsApi,
        env.logger,
      );
      env.logger.info('✅ Aggregated commit messages at startup:');
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      if (e instanceof Error) {
        env.logger.error('❌ Error in startup commit message aggregation:', e);
      } else {
        env.logger.error(
          '❌ Unknown error in startup aggregation',
          new Error(String(e)),
        );
      }
    }
  })();

  return router;
}
