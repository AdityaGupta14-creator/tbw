import { normalizeText, isHeadingText } from "./technical-vocabulary";
import { normalizedLevenshteinSimilarity } from "./fuzzy-engine";

export interface HeadingItem {
  text: string;
  normalized: string;
  order: number;
}

export interface StructuralComparisonResult {
  similarityPercentage: number;
  matchingHeadingsCount: number;
  totalHeadingsA: number;
  totalHeadingsB: number;
  identicalSequence: boolean;
  notes: string[];
}

/**
 * Extracts candidate section headings from document text.
 */
export function extractHeadings(text: string): HeadingItem[] {
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const headings: HeadingItem[] = [];

  lines.forEach((line) => {
    if (isHeadingText(line)) {
      headings.push({
        text: line,
        normalized: normalizeText(line),
        order: headings.length + 1,
      });
    }
  });

  return headings;
}

/**
 * Extracts table and figure references (e.g., "Figure 1", "Fig. 2", "Table I").
 */
export function extractTableFigureReferences(text: string): string[] {
  const matches = text.match(/\b(?:Figure|Fig\.|Table)\s+[0-9IVXLCDMivxlcdm]+/gi) || [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

/**
 * Compares document section structures, table/figure alignment, and terminology organization.
 * CRITICAL RULE: Structural similarity must NEVER independently classify text as plagiarism.
 */
export function compareDocumentStructure(textA: string, textB: string): StructuralComparisonResult {
  const headingsA = extractHeadings(textA);
  const headingsB = extractHeadings(textB);

  const notes: string[] = [];

  // Table & Figure reference comparison
  const refsA = extractTableFigureReferences(textA);
  const refsB = extractTableFigureReferences(textB);
  let sharedRefs = 0;
  for (const ref of refsA) {
    if (refsB.includes(ref)) sharedRefs++;
  }
  if (sharedRefs > 0) {
    notes.push(`Shared table/figure reference pattern: ${sharedRefs} common references (${refsA.slice(0, 3).join(", ")})`);
  }

  if (headingsA.length === 0 || headingsB.length === 0) {
    return {
      similarityPercentage: 0,
      matchingHeadingsCount: 0,
      totalHeadingsA: headingsA.length,
      totalHeadingsB: headingsB.length,
      identicalSequence: false,
      notes: notes.length > 0 ? notes : ["Insufficient distinct section headings detected for structural alignment."],
    };
  }

  let matchesCount = 0;
  let inOrderCount = 0;
  let lastBIdx = -1;

  for (let i = 0; i < headingsA.length; i++) {
    const hA = headingsA[i]!;
    let bestMatchIdx = -1;
    let bestSim = 0;

    for (let j = 0; j < headingsB.length; j++) {
      const hB = headingsB[j]!;
      const sim = normalizedLevenshteinSimilarity(hA.normalized, hB.normalized);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatchIdx = j;
      }
    }

    if (bestSim >= 75) {
      matchesCount++;
      if (bestMatchIdx > lastBIdx) {
        inOrderCount++;
        lastBIdx = bestMatchIdx;
      }
    }
  }

  const maxHeadings = Math.max(headingsA.length, headingsB.length);
  const baseSim = (matchesCount / maxHeadings) * 100;
  const orderBonus = matchesCount > 0 ? (inOrderCount / matchesCount) * 10 : 0;
  const refBonus = sharedRefs >= 2 ? 5 : 0;
  const similarityPercentage = Math.min(100, Math.round(baseSim + orderBonus + refBonus));

  const identicalSequence = matchesCount === maxHeadings && inOrderCount === matchesCount;

  if (identicalSequence && matchesCount >= 4) {
    notes.push(`Identical ${matchesCount}-stage section hierarchy and progression detected.`);
  } else if (matchesCount >= 3) {
    notes.push(`${matchesCount} corresponding section headings identified in parallel order.`);
  }

  return {
    similarityPercentage,
    matchingHeadingsCount: matchesCount,
    totalHeadingsA: headingsA.length,
    totalHeadingsB: headingsB.length,
    identicalSequence,
    notes,
  };
}

