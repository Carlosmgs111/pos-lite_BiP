export interface TestResult {
  name: string;
  suite: string;
  passed: boolean;
  message?: string;
}

export interface SuiteResult {
  id: string;
  name: string;
  description: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

export type TestFn = () => Promise<TestResult>;

export interface Suite {
  id: string;
  name: string;
  description: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  tests: TestFn[];
}

// Map prevents duplicate registration when multiple pages import the orchestrator
const registry = new Map<string, Suite>();

export function registerSuite(suite: Suite): void {
  registry.set(suite.id, suite);
}

export async function runSuites(suiteIds: string[]): Promise<SuiteResult[]> {
  const results: SuiteResult[] = [];

  for (const id of suiteIds) {
    const suite = registry.get(id);
    if (!suite) {
      continue;
    }

    if (suite.setup) {
      await suite.setup();
    }

    const tests: TestResult[] = [];
    for (const fn of suite.tests) {
      try {
        tests.push(await fn());
      } catch (error) {
        tests.push({
          name: 'unknown',
          suite: suite.name,
          passed: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (suite.teardown) {
      await suite.teardown();
    }

    const passed = tests.filter((t) => t.passed).length;
    const failed = tests.filter((t) => !t.passed).length;
    results.push({ id, name: suite.name, description: suite.description, tests, passed, failed, total: tests.length });
  }

  return results;
}
