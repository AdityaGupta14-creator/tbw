/**
 * Verity V2 Similarity Engine Benchmarking & Test Framework
 *
 * Implements standard test scenarios (Tests A through H) to validate multi-layer similarity:
 * - Test A: Original (distinct documents -> low similarity)
 * - Test B: Exact Copy (verbatim duplicate -> very high similarity & strong evidence)
 * - Test C: Light Modification (lexical edits, punctuation, reordered clauses -> high similarity)
 * - Test D: Paraphrase (rewritten sentences with semantic preservation -> semantic detection)
 * - Test E: Common Academic Text (standard technical boilerplate -> suppressed from plagiarism)
 * - Test F: Proper Quotation (quoted passages with citation -> recognized and excluded from misconduct)
 * - Test G: Reference Section (shared bibliographies -> isolated from body similarity)
 * - Test H: Student Collaboration (shared methodology with independent results -> partial passage match)
 *
 * Calculates Precision, Recall, False Positive Rate (FPR), and False Negative Rate (FNR).
 */

import { compareTwoDocuments, type ComparisonResult } from "./similarity-engine";

export interface BenchmarkTestCase {
  id: string;
  name: string;
  description: string;
  textA: string;
  textB: string;
  expectedCategory: "plagiarism" | "clean" | "partial_collaboration";
  expectedMinOverlap: number;
  expectedMaxOverlap: number;
  expectedMinStrongEvidence?: number;
}

export interface TestCaseResult {
  id: string;
  name: string;
  overallOverlap: number;
  strongMatchesCount: number;
  moderateMatchesCount: number;
  weakMatchesCount: number;
  longestMatchWords: number;
  evidenceSummary: string[];
  passagesCount: number;
  passed: boolean;
  classification: "true_positive" | "true_negative" | "false_positive" | "false_negative";
  details: string;
}

export interface BenchmarkSuiteResult {
  totalTests: number;
  passedCount: number;
  failedCount: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  testResults: TestCaseResult[];
  timestamp: string;
}

export const BENCHMARK_TEST_SUITE: BenchmarkTestCase[] = [
  // Test A — Original: Two genuinely different documents
  {
    id: "test-a-original",
    name: "Test A — Original Independent Documents",
    description: "Two distinct engineering reports covering different domains (BST vs Quantum computing).",
    textA: `1. Introduction
Balanced binary search trees maintain logarithmic bounds on search and insertion by executing local rotations.
2. Methodology
AVL and Red-Black trees were benchmarked in C++ using synthetic and uniform workloads.
3. Results
AVL trees maintained an average depth of 1.19 log2(n) while Red-Black trees yielded 1.34 log2(n).`,
    textB: `1. Quantum Gates Overview
Quantum circuits manipulate state vectors using unitary matrix transformations such as Hadamard and Pauli-X operators.
2. Hardware Architecture
Superconducting qubits require dilution refrigerators operating at fifteen millikelvin to prevent thermal decoherence.
3. Error Correction
Surface codes utilize stabilizer measurements to diagnose phase flips and bit flips without collapsing the superposition.`,
    expectedCategory: "clean",
    expectedMinOverlap: 0,
    expectedMaxOverlap: 12,
  },

  // Test B — Exact Copy: Verbatim duplication
  {
    id: "test-b-exact-copy",
    name: "Test B — Exact Verbatim Copy",
    description: "An exact or near-verbatim duplicate of a technical methodology and discussion.",
    textA: `A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n). Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations. Lookup latency was measured with a monotonic clock over batches of 1,000 randomly selected present and absent keys. Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built.`,
    textB: `A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n). Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations. Lookup latency was measured with a monotonic clock over batches of 1,000 randomly selected present and absent keys. Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built.`,
    expectedCategory: "plagiarism",
    expectedMinOverlap: 80,
    expectedMaxOverlap: 100,
    expectedMinStrongEvidence: 75,
  },

  // Test C — Light Modification: Word substitutions, punctuation changes, reordered clauses
  {
    id: "test-c-light-modification",
    name: "Test C — Lightly Modified Copying",
    description: "Copied text with punctuation alterations, swapped adjectives, and minor inserted filler words.",
    textA: `A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n). Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations.`,
    textB: `A binary search tree slowly degrades to linear search behaviour whenever keys arrive in sorted order. Self-balancing tree variants effectively restore logarithmic tree height by performing localized rotations after every structural modification, strictly bounding the worst-case cost of search, insertion, and deletion at O(log n). Rebalancing routine rotation counts were instrumented directly. Tree height was sampled after every 10,000 individual operations.`,
    expectedCategory: "plagiarism",
    expectedMinOverlap: 55,
    expectedMaxOverlap: 100,
  },

  // Test D — Paraphrase: Rewritten sentences with semantic preservation
  {
    id: "test-d-paraphrase",
    name: "Test D — Structural Paraphrase & Rewritten Text",
    description: "Sentences rewritten with active/passive transformation and synonyms while retaining identical logic.",
    textA: `Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built.`,
    textB: `When keys were introduced in strictly increasing sequence, the performance disparity grew noticeably more pronounced. Because of their less restrictive balancing rules, red-black trees finalized the insertion workload fourteen percent quicker; conversely, AVL trees preserved a lower overall depth, which provided superior search and retrieval throughput after construction concluded.`,
    expectedCategory: "plagiarism",
    expectedMinOverlap: 20,
    expectedMaxOverlap: 95,
  },

  // Test E — Common Academic Text: Technical vocabulary & standard definitions
  {
    id: "test-e-common-technical",
    name: "Test E — Standard Technical Vocabulary & Framing",
    description: "Standard definitions and lab framing (time complexity, binary search tree, as shown in figure).",
    textA: `1. Introduction
A binary search tree is a data structure with worst-case time complexity of O(log n) for balanced variants. As shown in Figure 1, the experimental results show stable memory consumption. In this report we present an empirical evaluation of data structures.`,
    textB: `1. Introduction
A binary search tree is a data structure with worst-case time complexity of O(log n) under optimal balance. As shown in Figure 1, the experimental results show linear growth. In this report we present an analysis of database indexing.`,
    expectedCategory: "clean",
    expectedMinOverlap: 0,
    expectedMaxOverlap: 25,
  },

  // Test F — Proper Quotation: Quoted source with attribution
  {
    id: "test-f-proper-quotation",
    name: "Test F — Attributed Quotation with Citation",
    description: "Text in quotation marks directly citing an academic source: [1]. Should not trigger misconduct.",
    textA: `As stated by Cormen et al. [1]: "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification." This property motivated our subsequent experimental benchmark.`,
    textB: `A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification.`,
    expectedCategory: "clean",
    expectedMinOverlap: 0,
    expectedMaxOverlap: 25,
  },

  // Test G — Reference Section: Identical bibliography lists
  {
    id: "test-g-reference-section",
    name: "Test G — Isolated Bibliography Section",
    description: "Identical references list attached to distinct report bodies. Bibliography should not inflate plagiarism.",
    textA: `Balanced search trees optimize lookup latencies across random workloads.

References
[1] T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, Introduction to Algorithms, 3rd ed. MIT Press, 2009.
[2] R. Tarjan, Data Structures and Network Algorithms, SIAM, 1983.
[3] D. E. Knuth, The Art of Computer Programming, Vol. 3: Sorting and Searching, Addison-Wesley, 1998.`,
    textB: `Graph traversal algorithms such as Dijkstra and Bellman-Ford calculate shortest paths.

References
[1] T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, Introduction to Algorithms, 3rd ed. MIT Press, 2009.
[2] R. Tarjan, Data Structures and Network Algorithms, SIAM, 1983.
[3] D. E. Knuth, The Art of Computer Programming, Vol. 3: Sorting and Searching, Addison-Wesley, 1998.`,
    expectedCategory: "clean",
    expectedMinOverlap: 0,
    expectedMaxOverlap: 15,
  },

  // Test H — Student Collaboration: Shared methodology wording, independent results
  {
    id: "test-h-student-collaboration",
    name: "Test H — Student Collaboration (Shared Methodology Only)",
    description: "Two lab reports share experimental setup and methodology text verbatim, but report distinct results.",
    textA: `1. Methodology
Both structures were implemented in C++17 with identical node layouts and compiled at -O2. Each workload was executed ten times on an isolated core; the reported figures are medians. Keys were drawn from three distributions: uniform random, ascending sorted, and a Zipfian distribution.
2. Results
Our tests on workstation Alpha recorded 42,000 insertions per millisecond with zero memory leaks across sustained 24-hour trials.
3. Discussion
The throughput on workstation Alpha validates our hypothesis that L3 cache residency dominates insertion speed for trees under 100,000 nodes.`,
    textB: `1. Methodology
Both structures were implemented in C++17 with identical node layouts and compiled at -O2. Each workload was executed ten times on an isolated core; the reported figures are medians. Keys were drawn from three distributions: uniform random, ascending sorted, and a Zipfian distribution.
2. Results
Our tests on cluster Node 4 recorded 28,500 operations per second under thermal throttling and heavy network contention.
3. Discussion
Thermal limitations in the rack enclosure induced substantial clock frequency downscaling, severely degrading worst-case traversal latency.`,
    expectedCategory: "partial_collaboration",
    expectedMinOverlap: 35,
    expectedMaxOverlap: 75,
  },
];

/**
 * Runs the benchmark suite and calculates performance metrics.
 */
export function runSimilarityBenchmark(): BenchmarkSuiteResult {
  const results: TestCaseResult[] = [];

  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const testCase of BENCHMARK_TEST_SUITE) {
    const res: ComparisonResult = compareTwoDocuments(
      testCase.textA,
      testCase.textB,
      testCase.name,
      "student_submission"
    );

    const overlap = res.overallOverlap;
    const passed = overlap >= testCase.expectedMinOverlap && overlap <= testCase.expectedMaxOverlap;

    let classification: "true_positive" | "true_negative" | "false_positive" | "false_negative";

    if (testCase.expectedCategory === "plagiarism" || testCase.expectedCategory === "partial_collaboration") {
      if (overlap >= 25) {
        truePositives++;
        classification = "true_positive";
      } else {
        falseNegatives++;
        classification = "false_negative";
      }
    } else {
      // expectedCategory === "clean"
      if (overlap <= 25) {
        trueNegatives++;
        classification = "true_negative";
      } else {
        falsePositives++;
        classification = "false_positive";
      }
    }

    const strongMatches = res.strongMatchesCount || 0;
    const moderateMatches = res.moderateMatchesCount || 0;
    const weakMatches = res.weakMatchesCount || 0;
    const longestWords = res.longestMatch ? res.longestMatch.split(" ").length : 0;

    results.push({
      id: testCase.id,
      name: testCase.name,
      overallOverlap: overlap,
      strongMatchesCount: strongMatches,
      moderateMatchesCount: moderateMatches,
      weakMatchesCount: weakMatches,
      longestMatchWords: longestWords,
      evidenceSummary: res.evidenceSummary || [],
      passagesCount: res.matchingPassagesCount,
      passed,
      classification,
      details: `Overlap ${overlap}% (Expected ${testCase.expectedMinOverlap}-${testCase.expectedMaxOverlap}%), Passages: ${res.matchingPassagesCount}, Strong: ${strongMatches}, Moderate: ${moderateMatches}`,
    });
  }

  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  const precision = truePositives + falsePositives > 0
    ? Math.round((truePositives / (truePositives + falsePositives)) * 100 * 10) / 10
    : 100;

  const recall = truePositives + falseNegatives > 0
    ? Math.round((truePositives / (truePositives + falseNegatives)) * 100 * 10) / 10
    : 100;

  const falsePositiveRate = falsePositives + trueNegatives > 0
    ? Math.round((falsePositives / (falsePositives + trueNegatives)) * 100 * 10) / 10
    : 0;

  const falseNegativeRate = falseNegatives + truePositives > 0
    ? Math.round((falseNegatives / (falseNegatives + truePositives)) * 100 * 10) / 10
    : 0;

  return {
    totalTests: total,
    passedCount,
    failedCount,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    falsePositiveRate,
    falseNegativeRate,
    testResults: results,
    timestamp: new Date().toISOString(),
  };
}
