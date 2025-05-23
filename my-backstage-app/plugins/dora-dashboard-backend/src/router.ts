import { Router } from 'express';
import pool from './services/TodoListService/db'; // <- MUST match actual path

export async function createRouter(p0: unknown): Promise<Router> {
  console.log('[debug] createRouter() called');

  const router = Router();

  router.get('/dora', async (_req, res) => {
    try {
      console.log('[debug] querying from pool');
      const [rows] = await pool.execute(
      'SELECT COUNT(*) AS deployments FROM cicd_deployments'
    );

      res.json({
        deploymentFrequency: (rows as any)[0]?.deployments ?? 0,
        source: 'live from DevLake',
      });
    } catch (error) {
      console.error('Database query failed:', error);
      res.status(500).json({ error: 'Failed to fetch DORA metrics' });
    }
  });

  return router;
}
