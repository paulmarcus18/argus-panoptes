import { createBugsCheck, createCodeSmellsCheck, createVulnerabilitiesCheck, createQualityGateCheck, createCodeCoverageCheck} from '../sonarCloudFactCheckers';
import { ConfigReader } from '@backstage/config';
import { Engine } from 'json-rules-engine';

describe('SonarCloud Fact Checkers', () => {
  // Test: Bugs check is created correctly from config
  it('should create bugs check from config', () => {
    // Mock configuration
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

    // Create the check and verify its properties
    const check = createBugsCheck(config);
    expect(check.id).toBe('noHighBugsCheck');
    expect(check.name).toBe('No Bugs Check');
    expect(check.factIds).toEqual(['sonarcloud-fact-retriever']);
    expect((check.rule.conditions as any).all[0].fact).toBe('bugs');
    expect((check.rule.conditions as any).all[0].operator).toBe('lessThanInclusive');
    expect((check.rule.conditions as any).all[0].value).toBe(0);
  });

  // Test: Bugs check returns correct result when there are bugs
  it('should return false if there are more than 0 bugs in the fact', async () => {
    // Mock configuration
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

    // Create the check
    const check = createBugsCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has more than 0 bugs
    const facts = { bugs: 2, code_smells: 0, vulnerabilities: 5, code_coverage: 80, quality_gate: 'OK' };
    const { events } = await engine.run(facts);

    // The check should fail (no events should be triggered)
    expect(events.length).toBe(0);
  });

  // Test: Bugs check returns correct result when there are no bugs
  it('should return true if there are 0 bugs in the fact', async () => {
    // Mock configuration
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

    // Create the check
    const check = createBugsCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has 0 bugs
    const facts = { bugs: 0, code_smells: 0, vulnerabilities: 5, code_coverage: 80, quality_gate: 'OK' };
    const { events, results } = await engine.run(facts);

    // The check should pass (one event should be triggered)
    expect(events.length).toBe(1);
    expect(results[0].result).toBe(true);
  });

  // Test: Code smells check is created correctly from config
  it('should create code smells check from config', () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            noHighCodeSmellsCheck: {
              name: 'No Code Smells Check',
              description: 'Check for code smells',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'code_smells',
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

    // Create the check and verify its properties
    const check = createCodeSmellsCheck(config);
    expect(check.id).toBe('noHighCodeSmellsCheck');
    expect(check.name).toBe('No Code Smells Check');
    expect(check.factIds).toEqual(['sonarcloud-fact-retriever']);
    expect((check.rule.conditions as any).all[0].fact).toBe('code_smells');
    expect((check.rule.conditions as any).all[0].operator).toBe('lessThanInclusive');
    expect((check.rule.conditions as any).all[0].value).toBe(0);
  });

  // Test: Code smells check returns correct result when there are more than 0 code smells
  it('should return false if there are more than 0 code smells in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            noHighCodeSmellsCheck: {
              name: 'No Code Smells Check',
              description: 'Check for code smells',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'code_smells',
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

    // Create the check
    const check = createCodeSmellsCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has more than 0 code smells
    const facts = { bugs: 2, code_smells: 4, vulnerabilities: 5, code_coverage: 80, quality_gate: 'OK' };
    const { events } = await engine.run(facts);

    // The check should fail (no events should be triggered)
    expect(events.length).toBe(0);
  });

  // Test: Code smells check returns correct result when there are no code smells
  it('should return true if there are 0 code smells in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            noHighCodeSmellsCheck: {
              name: 'No Code Smells Check',
              description: 'Check for code smells',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'code_smells',
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

    // Create the check
    const check = createCodeSmellsCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has 0 code smells
    const facts = { bugs: 0, code_smells: 0, vulnerabilities: 5, code_coverage: 80, quality_gate: 'OK' };
    const { events, results } = await engine.run(facts);

    // The check should pass (one event should be triggered)
    expect(events.length).toBe(1);
    expect(results[0].result).toBe(true);
  });

  // Test: Vulnerabilities check is created correctly from config
  it('should create vulnerabilities check from config', () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            vulnerabilitiesCheck: {
              name: 'Vulnerabilities Check',
              description: 'Check for vulnerabilities',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'vulnerabilities',
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

    // Create the check and verify its properties
    const check = createVulnerabilitiesCheck(config);
    expect(check.id).toBe('vulnerabilitiesCheck');
    expect(check.name).toBe('Vulnerabilities Check');
    expect(check.factIds).toEqual(['sonarcloud-fact-retriever']);
    expect((check.rule.conditions as any).all[0].fact).toBe('vulnerabilities');
    expect((check.rule.conditions as any).all[0].operator).toBe('lessThanInclusive');
    expect((check.rule.conditions as any).all[0].value).toBe(0);
  });

  // Test: Vulnerabilities check returns correct result when there are more than 0 vulnerabilities
  it('should return false if there are more than 0 vulnerabilities in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            vulnerabilitiesCheck: {
              name: 'Vulnerabilities Check',
              description: 'Check for vulnerabilities',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'vulnerabilities',
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

    // Create the check
    const check = createVulnerabilitiesCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has more than 0 vulnerabilities
    const facts = { bugs: 2, code_smells: 4, vulnerabilities: 5, code_coverage: 80, quality_gate: 'OK' };
    const { events } = await engine.run(facts);

    // The check should fail (no events should be triggered)
    expect(events.length).toBe(0);
  });

  // Test: Vulnerabilities check returns correct result when there are no vulnerabilities
  it('should return true if there are 0 vulnerabilitiess in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            vulnerabilitiesCheck: {
              name: 'Vulnerabilities Check',
              description: 'Check for vulnerabilities',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'vulnerabilities',
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

    // Create the check
    const check = createVulnerabilitiesCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has 0 vulnerabilities
    const facts = { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 80, quality_gate: 'OK' };
    const { events, results } = await engine.run(facts);

    // The check should pass (one event should be triggered)
    expect(events.length).toBe(1);
    expect(results[0].result).toBe(true);
  });

  // Test: Quality gate check is created correctly from config
  it('should create quality gate check from config', () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            qualityGateCheck: {
              name: 'Quality Gate Check',
              description: 'Check for quality gate status',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'quality_gate',
                      operator: 'equal',
                      value: 'OK',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Create the check and verify its properties
    const check = createQualityGateCheck(config);
    expect(check.id).toBe('qualityGateCheck');
    expect(check.name).toBe('Quality Gate Check');
    expect(check.factIds).toEqual(['sonarcloud-fact-retriever']);
    expect((check.rule.conditions as any).all[0].fact).toBe('quality_gate');
    expect((check.rule.conditions as any).all[0].operator).toBe('equal');
    expect((check.rule.conditions as any).all[0].value).toBe('OK');
  });

  // Test: Quality gate check returns correct result when the quality gate is not passed
  it('should return false if the quality gate is not passed in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            qualityGateCheck: {
              name: 'Quality Gate Check',
              description: 'Check for quality gate status',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'quality_gate',
                      operator: 'equal',
                      value: 'OK',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Create the check
    const check = createQualityGateCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that does not pass the quality gate
    const facts = { bugs: 2, code_smells: 4, vulnerabilities: 5, code_coverage: 80, quality_gate: 'WARN' };
    const { events } = await engine.run(facts);

    // The check should fail (no events should be triggered)
    expect(events.length).toBe(0);
  });

  // Test: Quality Gate check return correct result when the quality gate is passed
  it('should return true if the quality gate is passed in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            qualityGateCheck: {
              name: 'Quality Gate Check',
              description: 'Check for quality gate status',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'quality_gate',
                      operator: 'equal',
                      value: 'OK',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Create the check
    const check = createQualityGateCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that passes the quality gate
    const facts = { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 80, quality_gate: 'OK' };
    const { events, results } = await engine.run(facts);

    // The check should pass (one event should be triggered)
    expect(events.length).toBe(1);
    expect(results[0].result).toBe(true);
  });

  // Test: Code coverage check is created correctly from config
  it('should create code coverage check from config', () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            codeCoverageCheck: {
              name: 'Code Coverage Check',
              description: 'Check for code coverage',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'code_coverage',
                      operator: 'greaterThanInclusive',
                      value: 80,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Create the check and verify its properties
    const check = createCodeCoverageCheck(config);
    expect(check.id).toBe('codeCoverageCheck');
    expect(check.name).toBe('Code Coverage Check');
    expect(check.factIds).toEqual(['sonarcloud-fact-retriever']);
    expect((check.rule.conditions as any).all[0].fact).toBe('code_coverage');
    expect((check.rule.conditions as any).all[0].operator).toBe('greaterThanInclusive');
    expect((check.rule.conditions as any).all[0].value).toBe(80);
  });

  // Test: Code coverage check returns correct result when the code coverage is too low
  it('should return false if the code coverage is too low in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            codeCoverageCheck: {
              name: 'Code Coverage Check',
              description: 'Check for code coverage',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'code_coverage',
                      operator: 'greaterThanInclusive',
                      value: 80,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Create the check
    const check = createCodeCoverageCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that has low code coverage
    const facts = { bugs: 2, code_smells: 4, vulnerabilities: 5, code_coverage: 70, quality_gate: 'OK' };
    const { events } = await engine.run(facts);

    // The check should fail (no events should be triggered)
    expect(events.length).toBe(0);
  });

  // Test: Code coverage check returns correct result when the code coverage is above the threshold
  it('should return true if the code coverage is above the threshold in the fact', async () => {
    // Mock configuration
    const config = new ConfigReader({
      techInsights: {
        factChecker: {
          checks: {
            codeCoverageCheck: {
              name: 'Code Coverage Check',
              description: 'Check for code coverage',
              factIds: ['sonarcloud-fact-retriever'],
              rule: {
                conditions: {
                  all: [
                    {
                      fact: 'code_coverage',
                      operator: 'greaterThanInclusive',
                      value: 80,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // Create the check
    const check = createCodeCoverageCheck(config);

    // Set up the rules engine with the check's rule
    const engine = new Engine();
    engine.addRule({
      conditions: check.rule.conditions,
      event: { type: check.id },
    });

    // Run the engine with a fact that passes the code coverage threshold
    const facts = { bugs: 0, code_smells: 0, vulnerabilities: 0, code_coverage: 80, quality_gate: 'OK' };
    const { events, results } = await engine.run(facts);

    // The check should pass (one event should be triggered)
    expect(events.length).toBe(1);
    expect(results[0].result).toBe(true);
  });
});
