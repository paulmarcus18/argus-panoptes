import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
// import { TodoListService } from './services/TodoListService/types';
import { MetricType } from "./services/TodoListService/types"

import { DoraService } from './services/TodoListService/types';
import { Aggregation } from './services/TodoListService/types';

export async function createRouter({
  doraService,
}: {
  httpAuth: HttpAuthService;
  doraService: DoraService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/metrics/:type/:aggregation', async (req, res) => {
    const { type, aggregation } = req.params;

    // validate the metric type and aggregation

    res.json(await doraService.getMetric(type as MetricType, aggregation as Aggregation));
  });

  return router;
}
