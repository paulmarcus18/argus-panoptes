import express from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { JsonRulesEngineFactCheckerFactory } from '@backstage-community/plugin-tech-insights-backend-module-jsonfc';

export async function createRouter({
  logger,
}: {
  logger: LoggerService;
}): Promise<express.Router> {
  const router = express.Router();

  const checkerFactory = new JsonRulesEngineFactCheckerFactory({
    checks: [
      {
        id: 'dependabotLowAlertCheck',
        type: 'json-rules-engine',
        name: 'Dependabot Alerts Below Threshold',
        description: 'Checks if Dependabot alerts are below 5',
        factIds: ['dependabotFactRetriever'],
        rule: {
          conditions: {
            all: [
              {
                fact: 'openAlertCount',
                operator: 'lessThan',
                value: 5,
              },
            ],
          },
        },
      },
    ],
    logger,
  });

  const factChecker = checkerFactory.getFactChecker(); 

  router.get('/dependabotStatus/:owner/:repo', async (req, res) => {
    const { repo } = req.params;

    logger.info(`Running dependabotLowAlertCheck for ${repo}`);

    try {
      const results = await factChecker.runChecksForEntity(
        {
          kind: 'Component',
          namespace: 'default',
          name: repo,
        },
        ['dependabotLowAlertCheck'],
      );

      const passed = results?.[0]?.result?.result === true;
      res.json({ status: passed ? 'green' : 'red' });
    } catch (error: any) {
      logger.error(`Error running check for ${repo}: ${error.message}`);
      res.status(500).json({ status: 'unknown', error: error.message });
    }
  });

  return router;
}
