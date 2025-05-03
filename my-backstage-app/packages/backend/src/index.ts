import dotenv from 'dotenv';
dotenv.config();
console.log('Loaded GitHub token:', process.env.GITHUB_TOKEN);


import { createBackend } from '@backstage/backend-defaults';


const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-techdocs-backend'));

// Tech Insights plugin and fact retriever modules
backend.add(import('@backstage-community/plugin-tech-insights-backend'));
backend.add(import('@backstage-community/plugin-tech-insights-backend-module-jsonfc'));
backend.add(import('@internal/tech-insights-backend-module-dependabot')); // <== uses index.ts

// Auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// Catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// Permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));

// Search
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// Kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

// Optional: your custom plugin
// backend.add(import('@internal/plugin-traffic-light-backend'));

backend.start();
