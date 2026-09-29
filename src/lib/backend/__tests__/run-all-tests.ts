/**
 * Verity Academic Integrity Platform — Unified Test Runner
 * Executes all 7 automated test suites:
 * 1. academic-integrity-engine.test.ts (14 tests)
 * 2. chunking-test.ts (5 tests)
 * 3. expanded-benchmark.ts (38 tests)
 * 4. source-discovery.test.ts (46 tests)
 * 5. end-to-end-integration.test.ts (62 tests)
 * 6. faculty-review-workflow.test.ts (57 tests)
 * 7. system-stabilization.test.ts (48 tests)
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";

const suites = [
  { name: "Academic Integrity Engine (14 Scenarios)", file: "academic-integrity-engine.test.ts" },
  { name: "Chunking & Granularity Verification", file: "chunking-test.ts" },
  { name: "Expanded Corpus Benchmark (38 Cases)", file: "expanded-benchmark.ts" },
  { name: "Source Discovery & Federated Providers", file: "source-discovery.test.ts" },
  { name: "End-to-End System Integration", file: "end-to-end-integration.test.ts" },
  { name: "Faculty Review Workflow & Audit Trail", file: "faculty-review-workflow.test.ts" },
  { name: "System Stabilization, Scoring & PDF", file: "system-stabilization.test.ts" },
  { name: "Single Submission Audit & Consistency", file: "single-submission-audit.test.ts" },
];

console.log("================================================================================");
console.log("             VERITY ACADEMIC INTEGRITY — UNIFIED TEST EXECUTION                 ");
console.log("================================================================================\n");

let totalSuites = suites.length;
let passedSuites = 0;
const testDir = resolve(process.cwd(), "src/lib/backend/__tests__");

for (const suite of suites) {
  const filePath = resolve(testDir, suite.file);
  console.log(`\n>>> Running: ${suite.name} [${suite.file}]...`);
  try {
    const output = execSync(`npx tsx "${filePath}"`, {
      encoding: "utf-8",
      cwd: process.cwd(),
      stdio: "pipe",
    });
    // Print summary lines from the output
    const lines = output.trim().split("\n");
    const summaryLines = lines.slice(-4).join("\n");
    console.log(summaryLines);
    console.log(`[PASSED] ${suite.name}`);
    passedSuites++;
  } catch (error: any) {
    console.error(`[FAILED] ${suite.name}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }
}

console.log("\n================================================================================");
console.log(`ALL TEST SUITES PASSED! (${passedSuites}/${totalSuites} Suites Clean)`);
console.log("================================================================================");
