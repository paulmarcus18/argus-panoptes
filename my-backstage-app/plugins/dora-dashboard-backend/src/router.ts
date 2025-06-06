import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';

import { DoraService, MetricType, Aggregation } from './services/DoraService/types';

export async function createRouter({
  doraService,
}: {
  httpAuth: HttpAuthService;
  doraService: DoraService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  // Updated route: no more :project
  router.get('/metrics/:type/:aggregation/:from/:to', async (req, res) => {
    const { type, aggregation, from, to } = req.params;

    const trueFrom = Number(from);
    const trueTo = Number(to);

    // Read projects from query string: ?projects=projA,projB
    const projectsParam = req.query.projects;
    const projects = typeof projectsParam === 'string'
      ? projectsParam.split(',').map(p => p.trim())
      : [];


    const data = await doraService.getMetric(
      type as MetricType,
      aggregation as Aggregation,
      projects,
      trueFrom,
      trueTo
    );

    res.json(data);
  });

  router.get('/projects', async (req, res) => {
    try {
      const projects = await doraService.getProjectNames();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project names' });
    }
  });
  
  return router;
}
