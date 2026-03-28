export interface TestResult {
  name: string;
  suite: string;
  passed: boolean;
  message?: string;
}

export interface SuiteResult {
  suite: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

export type TestFn = () => Promise<TestResult>;

export interface Suite {
  name: string;
  tests: TestFn[];
}

// Map prevents duplicate registration when multiple pages import the orchestrator
const registry = new Map<string, Suite>();

export function registerSuite(suite: Suite): void {
  registry.set(suite.name, suite);
}

export async function runSuites(suiteNames: string[]): Promise<SuiteResult[]> {
  const results: SuiteResult[] = [];

  for (const name of suiteNames) {
    const suite = registry.get(name);
    if (!suite) {
      results.push({ suite: name, tests: [], passed: 0, failed: 0, total: 0 });
      continue;
    }

    const tests: TestResult[] = [];
    for (const fn of suite.tests) {
      try {
        tests.push(await fn());
      } catch (error) {
        tests.push({
          name: 'unknown',
          suite: name,
          passed: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const passed = tests.filter((t) => t.passed).length;
    const failed = tests.filter((t) => !t.passed).length;
    results.push({ suite: name, tests, passed, failed, total: tests.length });
  }

  return results;
}
