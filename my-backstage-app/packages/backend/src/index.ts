import { createBackend } from '@backstage/backend-defaults';
//import aiPlugin from '@internal/plugin-ai-plugin-backend';
//import aiPlugin from '';
//import { techInsightsModuleSonarCloudFactRetriever } from './modules/sonarCloudFactRetriever';
import dotenv from 'dotenv';
dotenv.config();
const backend = createBackend();

// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// Catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// Permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// Search
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// Kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

// tech-insights plugin
backend.add(import('@backstage-community/plugin-tech-insights-backend'));
backend.add(
  import('@backstage-community/plugin-tech-insights-backend-module-jsonfc'),
);
//backend.add(techInsightsModuleSonarCloudFactRetriever); // Add the SonarCloud fact retriever
backend.add(
  import(
    '@internal/plugin-tech-insights-backend-module-traffic-light-backend-module'
  ),
);
backend.add(
  import(
    '@internal/plugin-ai-plugin-backend-module-tech-insights-backend-module'
  ),
);
backend.add(import('@internal/plugin-ai-plugin-backend'));

backend.start();
