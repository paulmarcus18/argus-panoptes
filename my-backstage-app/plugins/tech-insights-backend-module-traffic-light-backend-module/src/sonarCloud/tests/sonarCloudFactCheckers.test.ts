import { createBugsCheck, } from '../sonarCloudFactCheckers';
import { ConfigReader } from '@backstage/config';

describe('SonarCloud Fact Checkers', () => {
  it('should create bugs check from config', () => {
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            noHighBugsCheck: {
              name: 'No Bugs Check',
              description: 'Check for bugs',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'bugs',
                      operator: 'lessThanInclusive',
                      value: 0,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    const check = createBugsCheck(config);
    expect(check.id).toBe('noHighBugsCheck');
    expect(check.name).toBe('No Bugs Check');
    expect((check.rule.conditions as any).all[0].fact).toBe('bugs');
    expect((check.rule.conditions as any).all[0].value).toBe(0);
  });

  // Add similar tests for other fact checkers
});