import type { SentenceSpan } from "./types";

/**
 * Common engineering terminology and algorithmic nomenclature.
 * When these occur as short spans, they should have low evidence weight
 * and not trigger false positive plagiarism flags.
 */
export const COMMON_ENGINEERING_PHRASES = new Set([
  "binary search tree",
  "binary search trees",
  "balanced binary search tree",
  "balanced binary search trees",
  "red black tree",
  "red black trees",
  "avl tree",
  "avl trees",
  "self balancing binary search",
  "data structure",
  "data structures",
  "time complexity",
  "space complexity",
  "worst case",
  "worst case complexity",
  "worst case cost",
  "average case",
  "best case",
  "big o notation",
  "logarithmic time",
  "linear time",
  "quadratic time",
  "database management system",
  "relational database",
  "relational algebra",
  "normal form",
  "normal forms",
  "acid properties",
  "transaction management",
  "concurrency control",
  "tcp ip",
  "tcp congestion control",
  "socket programming",
  "layered architecture",
  "layered architectures",
  "finite element analysis",
  "finite element approximations",
  "static equilibrium",
  "stress analysis",
  "digital electronics",
  "synchronous state machine",
  "logic synthesis",
  "hardware testbench",
  "fast fourier transform",
  "discrete fourier transform",
  "ohms law",
  "kirchhoffs voltage law",
  "kirchhoffs current law",
  "central processing unit",
  "operating system",
  "virtual memory",
  "dynamic programming",
  "depth first search",
  "breadth first search",
  "graph algorithm",
  "graph algorithms",
  "object oriented programming",
  "functional programming",
  "machine learning",
  "deep learning",
  "artificial intelligence",
  "convolutional neural network",
  "recurrent neural network",
  "transformer architecture",
  "attention mechanism",
  "gradient descent",
  "backpropagation",
  "stochastic gradient descent",
  "loss function",
  "overfitting",
  "underfitting",
  "cross validation",
  "hyperparameter tuning",
  "principal component analysis",
  "support vector machine",
  "random forest",
  "linear regression",
  "logistic regression",
]);

/**
 * Standard engineering and computer science textbook definitions.
 * When student or source text reproduces standard definitions verbatim or near-verbatim,
 * it should be categorized as WEAK or IGNORED rather than standalone academic misconduct.
 */
export const COMMON_ENGINEERING_DEFINITIONS: string[] = [
  "binary search tree is a rooted binary tree data structure with the key in each internal node greater than all keys in its left subtree and less than all keys in its right subtree",
  "an avl tree is a self balancing binary search tree where the heights of two child subtrees of any node differ by at most one",
  "a red black tree is a self balancing binary search tree with one extra bit of storage per node representing color",
  "time complexity is the computational complexity that describes the amount of computer time it takes to run an algorithm",
  "space complexity is a measure of the amount of working storage or memory that an algorithm needs",
  "big o notation is a mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity",
  "kirchhoffs current law states that the algebraic sum of currents entering any node in a circuit is equal to zero",
  "kirchhoffs voltage law states that the directed sum of potential differences around any closed loop is zero",
  "finite element analysis is a numerical method for solving differential equations in engineering and mathematical modeling",
  "dynamic programming is an algorithmic paradigm that solves complex problems by breaking them into simpler subproblems and storing intermediate solutions",
  "breadth first search traverses a graph level by level starting from a root node",
  "depth first search explores as far as possible along each branch before backtracking",
  "ohms law states that the current through a conductor between two points is directly proportional to the voltage across the two points",
];

/**
 * Standard academic boilerplate and transitional idioms.
 */
export const COMMON_ACADEMIC_BOILERPLATE = new Set([
  "as shown in figure",
  "as shown in table",
  "as illustrated in figure",
  "as depicted in figure",
  "the experimental results show",
  "the results are presented in",
  "in this report we present",
  "in this paper we propose",
  "the remainder of this report is organized as follows",
  "the rest of this paper is organized as follows",
  "as discussed in the previous section",
  "in order to evaluate the performance",
  "for the purpose of this analysis",
  "it is important to note that",
  "on the other hand",
  "in contrast to",
  "with respect to",
  "in accordance with",
  "based on the above observations",
  "it can be observed that",
  "the following section describes",
  "submitted for academic integrity evaluation",
  "department of computer engineering",
  "department of electrical engineering",
  "department of mechanical engineering",
  "abc institute of technology",
  "in conclusion the experimental results",
  "all rights reserved",
  "submitted in partial fulfillment of the requirements",
  "for the degree of bachelor of technology",
  "under the guidance of",
  "table of contents",
  "list of figures",
  "list of tables",
]);

/**
 * Assignment prompt and instructional framing patterns.
 */
export const ASSIGNMENT_PROMPT_PATTERNS = [
  /^problem\s+statement\s*:/i,
  /^assignment\s+objective\s*:/i,
  /^task\s+\d+\s*:/i,
  /^submission\s+guidelines\s*:/i,
  /^deliverables\s*:/i,
  /^expected\s+output\s*:/i,
  /^instructions\s*:/i,
  /^grading\s+rubric\s*:/i,
];

/**
 * Mathematical notation and equation patterns.
 */
export const MATH_NOTATION_PATTERNS = [
  /\\(?:sum|int|prod|frac|sqrt|partial|nabla|alpha|beta|gamma|theta|lambda|sigma|pi|infty)/i,
  /O\s*\(\s*(?:log\s*n|n\s*log\s*n|n\^?\d*|2\^n|1)\s*\)/i,
  /T\s*\(\s*n\s*\)\s*=\s*\d*\s*T\s*\(/i,
  /^[A-Za-z]\s*\(?\s*[A-Za-z0-9_,\s]+\s*\)?\s*=\s*[-+*/0-9A-Za-z_.\s^()]+$/,
  /[a-z]_\{\s*[0-9a-z]+\s*\}|\b[a-z]_[0-9a-z]\b/,
  /\b(?:sin|cos|tan|log|ln|exp)\s*\([a-z0-9_.\s+-]+\)/i,
  /^[0-9\s.+\-*/=><^_()\[\]{}]+$/,
];

/**
 * Standard English stopwords for lexical filtering.
 */
export const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
  "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
  "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
  "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
  "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself",
]);

/**
 * Normalizes text: lowercases, removes non-alphanumeric (except preserved technical symbols),
 * and condenses whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "") // fold contractions e.g. "kirchhoff's" -> "kirchhoffs"
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes text into individual word tokens.
 */
export function tokenizeWords(text: string): string[] {
  const norm = normalizeText(text);
  return norm ? norm.split(" ").filter(Boolean) : [];
}

/**
 * Checks if a text segment represents a mathematical notation or formula.
 */
export function isMathematicalFormula(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // If the sentence contains more than 8 words, it is explanatory prose, not a standalone equation
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;
  return MATH_NOTATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Checks if text matches assignment prompt guidelines or specific configured prompt text.
 */
export function isAssignmentPrompt(text: string, promptText?: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (ASSIGNMENT_PROMPT_PATTERNS.some((p) => p.test(trimmed))) {
    return true;
  }

  if (promptText && promptText.trim().length > 10) {
    const normText = normalizeText(trimmed);
    const normPrompt = normalizeText(promptText);
    if (normPrompt.includes(normText) || normText.includes(normPrompt)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if text is a standard engineering or computer science definition.
 */
export function isStandardEngineeringDefinition(text: string): boolean {
  const norm = normalizeText(text);
  if (norm.length < 15) return false;

  for (const def of COMMON_ENGINEERING_DEFINITIONS) {
    if (norm.includes(def) || def.includes(norm)) {
      return true;
    }
  }
  return false;
}

/**
 * Tokenizes and optionally strips common stopwords while preserving technical tokens.
 */
export function tokenizeMeaningfulWords(text: string): string[] {
  return tokenizeWords(text).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Checks whether a short text snippet consists primarily of common technical phrasing
 * or boilerplate that should not alone indicate misconduct.
 */
export function isCommonTechnicalPhrase(text: string): boolean {
  const norm = normalizeText(text);
  if (norm.length < 5) return true;

  if (COMMON_ENGINEERING_PHRASES.has(norm) || COMMON_ACADEMIC_BOILERPLATE.has(norm)) {
    return true;
  }

  // Check if text is a sub-phrase of known boilerplate
  for (const phrase of COMMON_ACADEMIC_BOILERPLATE) {
    if (phrase.includes(norm) || norm.includes(phrase)) {
      return true;
    }
  }

  for (const phrase of COMMON_ENGINEERING_PHRASES) {
    if (phrase === norm) return true;
  }

  return false;
}

/**
 * Checks whether a passage is a section heading.
 */
export function isHeadingText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 70) return false;
  return (
    /^(?:abstract|introduction|methodology|experimental setup|results|discussion|conclusion|references|bibliography|acknowledgements)$/i.test(trimmed) ||
    /^\d+(\.\d+)*\s+[A-Za-z]/.test(trimmed) ||
    /^[A-Z0-9\s—–:-]{4,50}$/.test(trimmed)
  );
}

/**
 * Isolates and separates the References / Bibliography section at the bottom of an academic text.
 */
export function separateReferencesSection(fullText: string): {
  bodyText: string;
  referencesText: string;
} {
  const refPattern = /(?:[\r\n]+|^)\s*(?:references|bibliography|works cited)\s*[\r\n]+/i;
  const match = refPattern.exec(fullText);

  if (match && match.index !== undefined) {
    return {
      bodyText: fullText.slice(0, match.index).trim(),
      referencesText: fullText.slice(match.index).trim(),
    };
  }

  return {
    bodyText: fullText,
    referencesText: "",
  };
}

/**
 * Checks whether a sentence or span consists predominantly of common engineering terms
 * or academic framing boilerplate (so it should not be treated as misconduct).
 */
export function isPredominantlyCommonOrBoilerplate(text: string): boolean {
  const norm = normalizeText(text);
  if (isCommonTechnicalPhrase(text)) return true;

  const words = tokenizeWords(norm);
  if (words.length === 0) return true;
  if (words.length <= 4) return isCommonTechnicalPhrase(norm);

  const matchedWordIndices = new Set<number>();

  const checkPhrases = (phraseSet: Set<string>) => {
    for (const phrase of phraseSet) {
      const pWords = phrase.split(" ");
      if (pWords.length < 2) continue; // Multi-word phrase only
      
      for (let i = 0; i <= words.length - pWords.length; i++) {
        let match = true;
        for (let j = 0; j < pWords.length; j++) {
          if (words[i + j] !== pWords[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          for (let j = 0; j < pWords.length; j++) {
            matchedWordIndices.add(i + j);
          }
        }
      }
    }
  };

  checkPhrases(COMMON_ENGINEERING_PHRASES);
  checkPhrases(COMMON_ACADEMIC_BOILERPLATE);

  // If >= 60% of all words belong to recognized multi-word technical phrases or boilerplate
  return (matchedWordIndices.size / words.length) >= 0.60;
}

/**
 * Identifies whether a given segment contains an explicit quote with attribution or citation.
 */
export function isQuotedOrCitedSegment(segmentText: string): boolean {
  const hasQuotes = /["“][^"”]{8,}["”]/.test(segmentText) || /'[^']{8,}'/.test(segmentText);
  const hasCitationBracket = /\[\d+\]/.test(segmentText);
  const hasAuthorDateCitation = /\([A-Z][a-z]+(?:\s+et\s+al\.)?,\s*\d{4}\)/.test(segmentText);
  const hasAttributionVerb = /stated by|according to|as argued by|observed by/i.test(segmentText);

  return (hasQuotes && (hasCitationBracket || hasAuthorDateCitation || hasAttributionVerb)) ||
         (hasQuotes && segmentText.length >= 25);
}

/**
 * Categorizes evidence into STRONG, MODERATE, WEAK, or IGNORED based on content and context.
 */
export function classifyEvidenceCategory(
  span: Partial<SentenceSpan>,
  similarityScore: number
): "strong" | "moderate" | "weak" | "ignored" {
  if (span.isHeading || span.isPrompt || span.isReference || span.isMathFormula) {
    return "ignored";
  }

  if (span.isQuoted || span.isCited) {
    return "weak"; // Qualified/attributed text should not count as misconduct
  }

  if (span.isCommonPhrase || span.isBoilerplate) {
    return similarityScore >= 85 ? "weak" : "ignored";
  }

  if (similarityScore >= 75) {
    return "strong";
  }

  if (similarityScore >= 45) {
    return "moderate";
  }

  return "weak";
}

/**
 * Segments document into structured sentence spans with character offsets and classifications.
 * Handles quotation boundaries properly so periods within quotes do not split citations.
 * Robustly preserves multiline sentences, protects decimal points (e.g. 3.4x), and handles
 * safe chunking of unusually long sentences and paragraphs.
 */
export function segmentIntoSentenceSpans(documentText: string, promptText?: string): SentenceSpan[] {
  const sentences: SentenceSpan[] = [];
  const textLen = documentText.length;
  if (textLen === 0) return sentences;

  // Find all quotation spans across the document
  const quoteSpans: { start: number; end: number }[] = [];
  const quoteRegex = /["“][^"”]+["”]|'[^']{15,}'/g;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = quoteRegex.exec(documentText)) !== null) {
    quoteSpans.push({ start: qMatch.index, end: qMatch.index + qMatch[0].length });
  }

  let cur = 0;
  let idx = 0;

  while (cur < textLen) {
    // Skip leading whitespace and blank lines
    while (cur < textLen && /\s/.test(documentText[cur]!)) cur++;
    if (cur >= textLen) break;

    const start = cur;
    let end = cur;

    while (end < textLen) {
      const ch = documentText[end]!;

      // Paragraph boundary: 2 or more consecutive newlines
      if (ch === "\n" || ch === "\r") {
        const rest = documentText.slice(end);
        const paraMatch = rest.match(/^(?:\r?\n\s*){2,}/);
        if (paraMatch) {
          break;
        }
      }

      // Colon followed by capital letter and space or newline (e.g., "Invariants: A binary search tree...")
      if (ch === ":" && end + 2 < textLen && /\s/.test(documentText[end + 1]!) && /[A-Z]/.test(documentText[end + 2]!)) {
        end++;
        break;
      }

      // Punctuation check: . ! ?
      if (ch === "." || ch === "!" || ch === "?") {
        // Protect decimal numbers: e.g. "3.4", "18.4"
        const prev = end > 0 ? documentText[end - 1]! : "";
        const next = end + 1 < textLen ? documentText[end + 1]! : "";
        if (ch === "." && /\d/.test(prev) && /\d/.test(next)) {
          end++;
          continue;
        }

        // Protect common abbreviations
        const windowBefore = documentText.slice(Math.max(0, end - 6), end + 1).toLowerCase();
        if (
          windowBefore.endsWith("e.g.") ||
          windowBefore.endsWith("i.e.") ||
          windowBefore.endsWith("al.") ||
          windowBefore.endsWith("vs.") ||
          windowBefore.endsWith("dr.") ||
          windowBefore.endsWith("mr.") ||
          windowBefore.endsWith("ms.") ||
          windowBefore.endsWith("prof.") ||
          windowBefore.endsWith("fig.") ||
          windowBefore.endsWith("tab.")
        ) {
          end++;
          continue;
        }

        // Include any consecutive punctuation or closing quotes/brackets
        end++;
        while (end < textLen && /[.!?)"'\]”]/.test(documentText[end]!)) {
          end++;
        }
        break;
      }

      end++;
    }

    const rawSpan = documentText.slice(start, end).trim();
    if (rawSpan.length >= 3) {
      // Clean internal line breaks within the sentence to single spaces
      const cleanSpanText = rawSpan.replace(/\s+/g, " ");

      const isEnclosedInQuote = quoteSpans.some(
        (qs) => (start >= qs.start && start < qs.end) ||
                (end > qs.start && end <= qs.end) ||
                (start <= qs.start && end >= qs.end)
      );

      const isExplicitlyQuoted = isEnclosedInQuote || isQuotedOrCitedSegment(cleanSpanText);
      const norm = normalizeText(cleanSpanText);
      const tokens = tokenizeWords(cleanSpanText);
      const isHeading = isHeadingText(cleanSpanText);
      const isCommon = isPredominantlyCommonOrBoilerplate(cleanSpanText) || isStandardEngineeringDefinition(cleanSpanText);
      const isPrompt = isAssignmentPrompt(cleanSpanText, promptText);
      const isMathFormula = isMathematicalFormula(cleanSpanText);
      const isCited = /\[\d+\]|\([A-Z][a-z]+(?:,\s*\d{4}|\s+et\s+al\.)\)/.test(cleanSpanText);

      // Safe chunking: if sentence or code block exceeds 50 words, chunk with 10 words overlap
      if (tokens.length > 50) {
        const words = cleanSpanText.split(" ");
        const chunkSize = 40;
        const overlap = 10;
        let wStart = 0;

        while (wStart < words.length) {
          const wEnd = Math.min(words.length, wStart + chunkSize);
          const subText = words.slice(wStart, wEnd).join(" ");
          if (subText.length >= 5) {
            // Estimate accurate character sub-offsets
            const subStartChar = Math.min(end, start + Math.round((wStart / words.length) * (end - start)));
            const subEndChar = Math.min(end, start + Math.round((wEnd / words.length) * (end - start)));

            sentences.push({
              idx,
              text: subText,
              normalizedText: normalizeText(subText),
              tokens: tokenizeWords(subText),
              startChar: subStartChar,
              endChar: subEndChar,
              isQuoted: isExplicitlyQuoted,
              isCommonPhrase: isCommon,
              isHeading,
              isReference: false,
              isPrompt,
              isMathFormula,
              isBoilerplate: isCommon,
              isCited,
            });
            idx++;
          }
          if (wEnd >= words.length) break;
          wStart += chunkSize - overlap;
        }
      } else if (cleanSpanText.length > 250 && tokens.length <= 3) {
        // Long dense formula / code with few spaces: chunk by character length with overlap
        const maxChars = 180;
        const overlapChars = 30;
        let cStart = 0;
        while (cStart < cleanSpanText.length) {
          const cEnd = Math.min(cleanSpanText.length, cStart + maxChars);
          const subText = cleanSpanText.slice(cStart, cEnd);
          if (subText.length >= 5) {
            sentences.push({
              idx,
              text: subText,
              normalizedText: normalizeText(subText),
              tokens: tokenizeWords(subText),
              startChar: start + cStart,
              endChar: start + cEnd,
              isQuoted: isExplicitlyQuoted,
              isCommonPhrase: isCommon,
              isHeading,
              isReference: false,
              isPrompt,
              isMathFormula,
              isBoilerplate: isCommon,
              isCited,
            });
            idx++;
          }
          if (cEnd >= cleanSpanText.length) break;
          cStart += maxChars - overlapChars;
        }
      } else {
        sentences.push({
          idx,
          text: cleanSpanText,
          normalizedText: norm,
          tokens,
          startChar: start,
          endChar: end,
          isQuoted: isExplicitlyQuoted,
          isCommonPhrase: isCommon,
          isHeading,
          isReference: false,
          isPrompt,
          isMathFormula,
          isBoilerplate: isCommon,
          isCited,
        });
        idx++;
      }
    }

    cur = end;
  }

  return sentences;
}

