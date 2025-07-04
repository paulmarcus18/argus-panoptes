import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

export const aiPlugin = createBackendPlugin({
  pluginId: 'ai-plugin',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.rootLogger,
        database: coreServices.database,
        discovery: coreServices.discovery,
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
      },
      async init({ logger, database, httpRouter, config }) {
        // include config here
        const db = await database.getClient();
        console.log('The backend is getting the db correctly', db.schema);
        const hasTable = await db.schema.hasTable('ai_summaries');
        console.log('HasTable:', hasTable);
        if (!hasTable) {
          await db.schema.createTable('ai_summaries', table => {
            table.string('system').notNullable();
            table.string('repo_name').notNullable();
            table.text('summary').notNullable();
            table.string('date').notNullable();
            table.primary(['system', 'repo_name', 'date']);
          });
          logger.info('Created ai_summaries table');
        }

        // Pass config to the router
        const router = await createRouter({ logger, database, config });
        httpRouter.use(router);
      },
    });
  },
});
