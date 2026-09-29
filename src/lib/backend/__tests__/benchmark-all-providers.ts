import {
  configureSemanticModel,
  compareTwoDocumentsAsync,
  type SemanticModelType,
} from "../similarity-engine";
import { DEFAULT_REFERENCE_CORPUS } from "../similarity/source-providers";

const refDoc0 = DEFAULT_REFERENCE_CORPUS[0]!.text; // AVL & BST reference
const refDocOS = DEFAULT_REFERENCE_CORPUS[6]!.text; // Operating Systems reference

const testCases = [
  {
    id: 1,
    name: "1. Exact copy",
    submission: refDoc0,
    reference: refDoc0,
    expectedType: "plagiarism",
  },
  {
    id: 2,
    name: "2. Light paraphrase",
    submission: `
      An ordinary binary search tree degrades to linear search time when input keys are provided in sorted sequence.
      Self-balancing implementations regain logarithmic height by carrying out localized tree pivots after each modification,
      bounding the worst-case cost of search, insertion, and deletion at O(log n).
      In an AVL tree structure, the heights of two child subtrees never differ by more than a single level.
      Whenever an insertion violates this balance invariant, one or two tree rotations restore the structure.
    `,
    reference: refDoc0,
    expectedType: "plagiarism",
  },
  {
    id: 3,
    name: "3. Heavy paraphrase",
    submission: `
      When items are entered in strictly ascending sequence, an ordinary search hierarchy breaks down into sequential scanning.
      To prevent this degradation, balanced structures apply localized rotational transformations following node updates,
      thereby maintaining an upper computational limit of logarithmic time for all primary queries and updates.
      Under the AVL balancing criteria, sibling branch elevations must remain strictly within a difference threshold of unity.
    `,
    reference: refDoc0,
    expectedType: "paraphrase_misconduct",
  },
  {
    id: 4,
    name: "4. Same topic but independently written",
    submission: `
      The AVL tree, introduced by Adelson-Velsky and Landis in 1962, uses a balance factor defined as the height difference between left and right subtrees.
      Rebalancing operations are categorized into single rotations (Left-Left, Right-Right) and double rotations (Left-Right, Right-Left).
      In contrast to red-black trees, AVL trees provide more rigidly balanced trees, leading to faster lookups at the expense of slightly slower insertions.
    `,
    reference: refDoc0,
    expectedType: "independent_writing",
  },
  {
    id: 5,
    name: "5. Completely unrelated engineering text",
    submission: `
      Convolutional neural networks apply learnable kernel filters across spatial dimensions to capture localized feature representations.
      Backpropagation computes partial derivatives of the loss function with respect to layer weights using the chain rule of calculus.
      Stochastic gradient descent with momentum accelerates convergence across ill-conditioned loss surfaces.
    `,
    reference: refDocOS,
    expectedType: "unrelated",
  },
  {
    id: 6,
    name: "6. Proper quotation",
    submission: `
      As noted in standard reference texts, "When keys are inserted in sorted order, an unbalanced binary search tree degenerates into a linear linked list with worst-case search complexity of O(n)."
      Furthermore, "In an AVL tree, the heights of two child subtrees never differ by more than a single level" (Adelson-Velsky & Landis, 1962).
    `,
    reference: refDoc0,
    expectedType: "proper_quotation",
  },
  {
    id: 7,
    name: "7. Same meaning using substantially different vocabulary",
    submission: `
      Progressing through indexed elements sequentially renders unconstrained tree-based lookups identical to traversing a simple chain.
      To counteract this bottleneck, dynamic restructuring algorithms trigger compensatory geometric reconfigurations across adjacent branches,
      guaranteeing an operational threshold proportional to the logarithm of total items.
    `,
    reference: refDoc0,
    expectedType: "paraphrase_misconduct",
  },
];

interface CaseResult {
  caseId: number;
  caseName: string;
  semanticSimilarity: number;
  finalSimilarity: number;
  evidenceLevel: string;
  confidence: number;
  processingTimeMs: number;
  auditStatus: string;
}

interface ProviderSummary {
  provider: SemanticModelType;
  modelName: string;
  initTimeMs: number;
  heapUsedMb: number;
  rssMb: number;
  results: CaseResult[];
}

function assessAudit(
  caseType: string,
  finalSim: number,
  semanticSim: number,
  evidenceLevel: string
): string {
  switch (caseType) {
    case "plagiarism":
      return finalSim >= 50 ? "CLEAN (Match Detected)" : "FALSE NEGATIVE";
    case "paraphrase_misconduct":
      // Paraphrase is detected if semantic similarity is high or flagged as moderate/strong
      return semanticSim >= 45 || evidenceLevel === "moderate" || evidenceLevel === "strong"
        ? "CLEAN (Paraphrase Flagged)"
        : "FALSE NEGATIVE (Paraphrase Missed)";
    case "independent_writing":
      // Should not declare severe misconduct (finalSim should not exceed 50%)
      return finalSim <= 50 ? "CLEAN (Appropriate Threshold)" : "SUSPECT FALSE POSITIVE";
    case "unrelated":
      return finalSim === 0 && semanticSim < 35
        ? "CLEAN (No FP)"
        : "FALSE POSITIVE";
    case "proper_quotation":
      return finalSim <= 10 ? "CLEAN (Quotation Respected)" : "FALSE POSITIVE (Quote Penalized)";
    default:
      return "UNKNOWN";
  }
}

async function benchmarkProvider(modelType: SemanticModelType): Promise<ProviderSummary> {
  const memBefore = process.memoryUsage();
  const t0 = performance.now();
  const provider = configureSemanticModel(modelType);
  if ("prewarm" in provider && typeof (provider as any).prewarm === "function") {
    await (provider as any).prewarm();
  }
  const initTimeMs = Math.round(performance.now() - t0);
  const memAfter = process.memoryUsage();

  const caseResults: CaseResult[] = [];

  for (const tc of testCases) {
    const tCase0 = performance.now();
    const comp = await compareTwoDocumentsAsync(tc.submission, tc.reference);
    const timeMs = Math.round((performance.now() - tCase0) * 10) / 10;
    const tb = comp.transparentBreakdown;

    const semSim = tb?.semanticSimilarity ?? 0;
    const finSim = comp.overallOverlap;
    const evLevel = tb?.evidenceLevel ?? "ignored";
    const conf = tb?.confidence ?? 0;

    const audit = assessAudit(tc.expectedType, finSim, semSim, evLevel);

    caseResults.push({
      caseId: tc.id,
      caseName: tc.name,
      semanticSimilarity: semSim,
      finalSimilarity: finSim,
      evidenceLevel: evLevel,
      confidence: conf,
      processingTimeMs: timeMs,
      auditStatus: audit,
    });
  }

  return {
    provider: modelType,
    modelName: provider.name,
    initTimeMs,
    heapUsedMb: Math.round((memAfter.heapUsed / (1024 * 1024)) * 100) / 100,
    rssMb: Math.round((memAfter.rss / (1024 * 1024)) * 100) / 100,
    results: caseResults,
  };
}

async function runFullComparison() {
  console.log("=========================================================================================");
  console.log("VERITY NLP EMBEDDING ENGINE — COMPREHENSIVE 3-PROVIDER BENCHMARK");
  console.log("Evaluating: [1] Heuristic TF-IDF  |  [2] Xenova/all-MiniLM-L6-v2  |  [3] Xenova/bge-small-en-v1.5");
  console.log("=========================================================================================\n");

  const models: SemanticModelType[] = ["heuristic", "miniLM", "bge-small"];
  const summaries: ProviderSummary[] = [];

  for (const m of models) {
    console.log(`Starting benchmark for provider: ${m}...`);
    const summary = await benchmarkProvider(m);
    summaries.push(summary);
    console.log(`Finished ${m} in init: ${summary.initTimeMs}ms, RSS: ${summary.rssMb}MB\n`);
  }

  console.log("=========================================================================================");
  console.log("BENCHMARK SUMMARY RESULTS TABLE");
  console.log("=========================================================================================\n");

  for (const s of summaries) {
    console.log(`PROVIDER: ${s.provider.toUpperCase()} (${s.modelName})`);
    console.log(`Init Time: ${s.initTimeMs}ms | Heap Used: ${s.heapUsedMb}MB | Process RSS: ${s.rssMb}MB`);
    console.log("-----------------------------------------------------------------------------------------------------------------------------------------");
    console.log(
      "Case Name".padEnd(42) +
      "Semantic%".padStart(11) +
      "Final%".padStart(9) +
      "Level".padStart(11) +
      "Conf".padStart(7) +
      "Time(ms)".padStart(10) +
      "   Audit Assessment"
    );
    console.log("-----------------------------------------------------------------------------------------------------------------------------------------");
    for (const r of s.results) {
      console.log(
        r.caseName.padEnd(42) +
        `${r.semanticSimilarity}%`.padStart(11) +
        `${r.finalSimilarity}%`.padStart(9) +
        r.evidenceLevel.padStart(11) +
        r.confidence.toFixed(2).padStart(7) +
        `${r.processingTimeMs}`.padStart(10) +
        `   ${r.auditStatus}`
      );
    }
    console.log("-----------------------------------------------------------------------------------------------------------------------------------------\n");
  }

  console.log("RAW_JSON_DATA:");
  console.log(JSON.stringify(summaries, null, 2));

  // Reset to default heuristic for normal test isolation
  configureSemanticModel("heuristic");
}

runFullComparison().catch(console.error);
