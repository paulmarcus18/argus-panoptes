import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { TechInsightsApi } from '@backstage/plugin-tech-insights';

export const getAzureDevOpsBugFacts = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  azureBugCount: number;
}> => {
  try {
    console.log(
      '🔍 Fetching Azure DevOps bug facts for entity:',
      stringifyEntityRef(entity),
    );

    const response = await api.getFacts(entity, ['azureDevOpsBugsRetriever']);

    console.log('📦 Raw Azure DevOps facts:', response);

    const facts = response?.['azureDevOpsBugsRetriever']?.facts;

    if (!facts) {
      console.warn('⚠️ No facts found for entity:', stringifyEntityRef(entity));
      return { azureBugCount: 0 };
    }

    const bugCount = Number(facts.azure_bug_count ?? 0);

    console.info(`✅ Bug count for ${stringifyEntityRef(entity)}:`, bugCount);

    return { azureBugCount: bugCount };
  } catch (error) {
    console.error(
      '❌ Error fetching Azure DevOps facts for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return { azureBugCount: 0 };
  }
};

export const getAzureDevOpsBugChecks = async (
  api: TechInsightsApi,
  entity: CompoundEntityRef,
): Promise<{
  bugCountCheck: boolean;
}> => {
  try {
    console.log(
      '✅ Running Azure DevOps bug count check for entity:',
      stringifyEntityRef(entity),
    );

    const checkResults = await api.runChecks(entity);

    const bugCheck = checkResults.find(
      r => r.check.id === 'azure-bugs',
    );

    console.info(
      `🔍 Check result for ${stringifyEntityRef(entity)}:`,
      bugCheck?.result,
    );

    return {
      bugCountCheck: bugCheck?.result === true,
    };
  } catch (error) {
    console.error(
      '❌ Error running Azure DevOps bug check for entity:',
      stringifyEntityRef(entity),
      error,
    );
    return { bugCountCheck: false };
  }
};

