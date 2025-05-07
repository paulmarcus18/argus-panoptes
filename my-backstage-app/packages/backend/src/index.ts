import { createBackend } from '@backstage/backend-defaults';
import { techInsightsModuleSonarCloudFactRetriever } from './modules/sonarCloudFactRetriever';
import { techInsightsModuleGitHubCommitRetriever } from './modules/githubFactRetrieverUtils';

const backend = createBackend();

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));

// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);
backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collator
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

// tech-insights plugin
backend.add(import('@backstage-community/plugin-tech-insights-backend'));
backend.add(
  import('@backstage-community/plugin-tech-insights-backend-module-jsonfc'),
);
backend.add(techInsightsModuleSonarCloudFactRetriever); // Add the SonarCloud fact retriever
backend.add(import('@internal/plugin-ai-summary-backend-backend'));

backend.add(techInsightsModuleGitHubCommitRetriever);
backend.start();
