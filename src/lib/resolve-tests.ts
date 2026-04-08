import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SuiteResult } from '../../package/tests/runner';
import { runSuites } from '../../package/tests/runner';
import '../../package/tests/starting'; // Register suites
import '../../package/tests/iter2'; // Register iter2 suites
import '../../package/tests/iter3'; // Register iter3 suites

const SNAPSHOTS_DIR = join(process.cwd(), 'src/data/logbook/snapshots');

function getSnapshotPath(entryId: string): string {
  return join(SNAPSHOTS_DIR, `${entryId}.json`);
}

function readSnapshot(entryId: string): SuiteResult[] | null {
  const path = getSnapshotPath(entryId);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeSnapshot(entryId: string, results: SuiteResult[]): void {
  if (!existsSync(SNAPSHOTS_DIR)) mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  writeFileSync(getSnapshotPath(entryId), JSON.stringify(results, null, 2));
}

export async function resolveTestResults(
  entryId: string,
  testSuites: string[],
  closed: boolean,
): Promise<SuiteResult[]> {
  if (testSuites.length === 0) return [];

  if (closed) {
    const snapshot = readSnapshot(entryId);
    if (snapshot) return snapshot;

    // No snapshot yet — run live, save, return
    const results = await runSuites(testSuites);
    writeSnapshot(entryId, results);
    return results;
  }

  return runSuites(testSuites);
}
