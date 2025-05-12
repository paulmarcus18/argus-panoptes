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
      },
      async init({ logger, database }) {
        const db = await database.getClient();

        const hasTable = await db.schema.hasTable('ai_summaries');
        if (!hasTable) {
          await db.schema.createTable('ai_summaries', table => {
            table.string('system').notNullable();
            table.string('repo_name').notNullable();
            table.text('summary').notNullable();
            table.string('date').notNullable();
            table.primary(['system', 'repo_name', 'date']);
          });
          logger.info('✅ Created ai_summaries table');
        }

        // ✅ Return the router here
        await createRouter({ logger, database });
        return;
      },
    });
  },
});
