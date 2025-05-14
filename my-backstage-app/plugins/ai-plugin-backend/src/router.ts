import express from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { AISummaryStore, SummaryPerRepo } from './utils/aiSummaryStore';

interface RouterOptions {
  logger: LoggerService;
  database: PluginDatabaseManager;
}

export async function createRouter({
  logger,
  database,
}: RouterOptions): Promise<express.Router> {
  const router = express.Router();
  router.use(express.json());

  const db = await database.getClient();
  const store = new AISummaryStore(db);

  const today = new Date().toISOString().split('T')[0];

  /**
   * GET /summaries - fetch all summaries for today
   */
  router.get('/summaries', async (_req, res) => {
    try {
      const summaries = await store.getAllSummariesForDate(today);
      res.json(summaries);
    } catch (error) {
      logger.error('Error fetching summaries:');
      res.status(500).json({ error: 'Could not fetch summaries' });
    }
  });

  /**
   * POST /summaries - receive and store summaries
   * Expected format:
   * {
   *   system: "foo",
   *   date: "2025-05-13",
   *   summaries: [{ repoName: "repo-a", summary: "..." }, ...]
   * }
   */
  router.post('/summaries', async (req, res) => {
    try {
      const { system, date, summaries } = req.body;

      if (!system || !date || !Array.isArray(summaries)) {
        return res.status(400).json({ error: 'Invalid request format' });
      }

      await store.saveSummaries(system, date, summaries as SummaryPerRepo[]);
      res.status(204).send();
    } catch (error) {
      logger.error('Error saving summaries:');
      res.status(500).json({ error: 'Could not save summaries' });
    }
  });

  return router;
}
