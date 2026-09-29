/**
 * Verity AI-Writing Pattern Analysis Engine
 *
 * IMPORTANT ETHICAL & ARCHITECTURAL PRINCIPLES:
 * 1. AI-writing analysis is probabilistic and evaluates observable statistical writing patterns.
 * 2. It does NOT and CANNOT definitively prove AI authorship.
 * 3. It must NEVER return binary "AI generated: true" verdicts.
 * 4. Plagiarism scoring and AI writing analysis are strictly separated.
 */

import type {
  AIWritingAnalysisResult,
  AIWritingIndicator,
  ObservableWritingCharacteristics,
  ModelDerivedIndicators,
} from "@/types/database";

export type { AIWritingAnalysisResult };

export interface AIWritingAnalysisProvider {
  readonly name: string;
  analyze(text: string): Promise<AIWritingAnalysisResult> | AIWritingAnalysisResult;
}

const LLM_MARKER_TERMS = [
  "delve",
  "delves",
  "delving",
  "tapestry",
  "crucial",
  "paramount",
  "in conclusion",
  "it is worth noting",
  "serves as a testament",
  "sheds light on",
  "plays a vital role",
  "a plethora of",
  "in summary",
  "underscores the importance",
  "furthermore",
  "moreover",
  "consequently",
  "seamlessly",
  "testament",
  "holistic",
  "fosters",
  "navigating the complexities",
];

export const PROBABILISTIC_DISCLAIMER =
  "AI-writing analysis is probabilistic and evaluates statistical writing patterns. It should not be treated as definitive proof of AI authorship.";

/**
 * Built-in Statistical AI-Writing Pattern Analyzer.
 * Measures observable lexical, syntactic, and structural signals deterministically.
 */
export class StatisticalAIWritingProvider implements AIWritingAnalysisProvider {
  public readonly name = "Verity-Statistical-Pattern-Analyzer-v2";

  public analyze(documentText: string): AIWritingAnalysisResult {
    const rawText = documentText.trim();
    const words = rawText.split(/\s+/).filter(Boolean);
    const totalWords = words.length;

    // Minimum evidence safeguard
    if (totalWords < 45) {
      return {
        status: "insufficient_evidence",
        confidence: 0.1,
        indicators: [],
        observableCharacteristics: {
          sentenceCount: 0,
          averageSentenceLength: 0,
          sentenceLengthStdDev: 0,
          vocabularyDiversityTTR: 0,
          paragraphCount: 0,
          averageParagraphLength: 0,
          transitionWordDensity: 0,
          stylisticConsistencyScore: 0,
          repeatedPhraseCount: 0,
        },
        explanation:
          "The submitted text is too short (< 45 words) to perform statistically valid writing pattern analysis.",
        disclaimer: PROBABILISTIC_DISCLAIMER,
      };
    }

    // 1. Sentence Segmentation & Sentence-Length Distribution
    const rawSentences = rawText
      .split(/(?<=[.!?])\s+|\n{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const sentenceCount = Math.max(1, rawSentences.length);
    const sentenceLengths = rawSentences.map((s) => s.split(/\s+/).filter(Boolean).length);
    const avgSentenceLength =
      sentenceLengths.reduce((a, b) => a + b, 0) / sentenceCount;

    // Sentence-length standard deviation
    const variance =
      sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) /
      sentenceCount;
    const sentenceLengthStdDev = Math.sqrt(variance);
    const sentenceCoeffVariation = avgSentenceLength > 0 ? sentenceLengthStdDev / avgSentenceLength : 0;

    // 2. Vocabulary Diversity (Type-Token Ratio)
    const cleanTokens = words.map((w) =>
      w.toLowerCase().replace(/[^a-z0-9]/g, "")
    ).filter((w) => w.length > 1);
    const uniqueTokens = new Set(cleanTokens);
    const ttr = cleanTokens.length > 0 ? uniqueTokens.size / cleanTokens.length : 0;

    // 3. Paragraph-Length Distribution
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const paragraphCount = Math.max(1, paragraphs.length);
    const paragraphLengths = paragraphs.map((p) => p.split(/\s+/).filter(Boolean).length);
    const avgParagraphLength =
      paragraphLengths.reduce((a, b) => a + b, 0) / paragraphCount;

    // 4. Transition-word and Characteristic LLM Phrase Density
    const lowerText = rawText.toLowerCase();
    let markerCount = 0;
    for (const marker of LLM_MARKER_TERMS) {
      const reg = new RegExp(`\\b${marker.replace(/\s+/g, "\\s+")}\\b`, "gi");
      const hits = (lowerText.match(reg) || []).length;
      markerCount += hits;
    }
    const transitionWordDensity = Math.round((markerCount / Math.max(1, totalWords)) * 1000 * 10) / 10;

    // 5. Syntactic-Pattern Consistency (Repetitive Sentence Openers)
    const openers = rawSentences.map((s) => {
      const firstTwo = s.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
      return firstTwo;
    });
    const openerCounts = new Map<string, number>();
    openers.forEach((op) => openerCounts.set(op, (openerCounts.get(op) || 0) + 1));
    let repeatedOpenersCount = 0;
    openerCounts.forEach((cnt) => {
      if (cnt > 1) repeatedOpenersCount += cnt;
    });
    const openerUniformityRatio = openerCounts.size > 0 ? repeatedOpenersCount / sentenceCount : 0;

    // 6. Repeated Phrase Patterns (3-gram repetition)
    const triGrams = new Map<string, number>();
    for (let i = 0; i <= cleanTokens.length - 3; i++) {
      const tri = cleanTokens.slice(i, i + 3).join(" ");
      triGrams.set(tri, (triGrams.get(tri) || 0) + 1);
    }
    let repeatedPhraseCount = 0;
    triGrams.forEach((cnt) => {
      if (cnt > 2) repeatedPhraseCount++;
    });

    // 7. Stylistic Consistency Across Document Sections
    let stylisticConsistencyScore = 50;
    if (rawSentences.length >= 6) {
      const chunkSize = Math.floor(rawSentences.length / 3);
      const chunk1 = rawSentences.slice(0, chunkSize);
      const chunk3 = rawSentences.slice(rawSentences.length - chunkSize);

      const avgLen1 = chunk1.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(1, chunk1.length);
      const avgLen3 = chunk3.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(1, chunk3.length);

      const diff = Math.abs(avgLen1 - avgLen3);
      // Extremely low variation across thirds indicates synthetic uniform pacing
      stylisticConsistencyScore = Math.max(0, Math.min(100, Math.round(100 - diff * 4)));
    }

    // 8. Indicators Construction
    const indicators: AIWritingIndicator[] = [];

    // Indicator A: Sentence Length Uniformity (Low burstiness)
    const isUniformSentences = sentenceCoeffVariation < 0.28 && sentenceCount >= 5;
    indicators.push({
      name: "Sentence-Length Variation",
      score: Math.round((1 - Math.min(1, sentenceCoeffVariation)) * 100) / 100,
      threshold: 0.72,
      flagged: isUniformSentences,
      description: isUniformSentences
        ? "Unusually uniform sentence length (low burstiness); typical of synthesized text."
        : "Healthy sentence-length variation observed with natural rhythm.",
    });

    // Indicator B: Vocabulary Diversity (TTR)
    const isConstrainedTTR = ttr < 0.38 && totalWords > 120;
    indicators.push({
      name: "Lexical Diversity (TTR)",
      score: Math.round(ttr * 100) / 100,
      threshold: 0.40,
      flagged: isConstrainedTTR,
      description: isConstrainedTTR
        ? "Constrained type-token vocabulary diversity."
        : "Vocabulary distribution within standard academic parameters.",
    });

    // Indicator C: Formulaic Transition Density
    const isHighTransition = transitionWordDensity >= 12;
    indicators.push({
      name: "Transition & Phrasing Idioms",
      score: Math.min(1, Math.round((transitionWordDensity / 20) * 100) / 100),
      threshold: 0.60,
      flagged: isHighTransition,
      description: isHighTransition
        ? `Elevated frequency of formulaic transitional phrases (${transitionWordDensity} per 1k words).`
        : "Transitional phrasing frequency is consistent with natural academic writing.",
    });

    // Indicator D: Syntactic Opener Repetition
    const isRepetitiveOpeners = openerUniformityRatio >= 0.45 && sentenceCount >= 8;
    indicators.push({
      name: "Syntactic Opener Repetition",
      score: Math.round(openerUniformityRatio * 100) / 100,
      threshold: 0.45,
      flagged: isRepetitiveOpeners,
      description: isRepetitiveOpeners
        ? "Repetitive sentence opening patterns across successive paragraphs."
        : "Diverse clause and sentence initialization observed.",
    });

    // 9. Overall Status Evaluation
    const flaggedCount = indicators.filter((i) => i.flagged).length;
    let status: "review_recommended" | "no_strong_indicators" | "insufficient_evidence";
    let confidence: number;
    let explanation: string;

    if (flaggedCount >= 3 || (flaggedCount >= 2 && isUniformSentences && isHighTransition)) {
      status = "review_recommended";
      confidence = 0.82;
      explanation =
        "The submission exhibits multiple statistical writing anomalies common in synthetic generation, such as exceptionally uniform sentence lengths and elevated formulaic transition density. Faculty manual review is recommended.";
    } else if (flaggedCount === 1) {
      status = "no_strong_indicators";
      confidence = 0.74;
      explanation =
        "Isolated statistical pattern detected, but insufficient convergence to warrant an advisory flag. Typical of structured student writing.";
    } else {
      status = "no_strong_indicators";
      confidence = 0.86;
      explanation =
        "Observable writing metrics reflect natural syntactic burstiness, diverse sentence openings, and balanced vocabulary distributions.";
    }

    return {
      status,
      confidence,
      indicators,
      observableCharacteristics: {
        sentenceCount,
        averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        sentenceLengthStdDev: Math.round(sentenceLengthStdDev * 10) / 10,
        vocabularyDiversityTTR: Math.round(ttr * 100) / 100,
        paragraphCount,
        averageParagraphLength: Math.round(avgParagraphLength * 10) / 10,
        transitionWordDensity,
        stylisticConsistencyScore,
        repeatedPhraseCount,
      },
      modelDerivedIndicators: {
        providerName: this.name,
        burstinessScore: Math.round(sentenceCoeffVariation * 100) / 100,
        perplexityScore: Math.round((ttr * 100 + (100 - stylisticConsistencyScore)) / 2),
        rawModelConfidence: confidence,
      },
      explanation,
      disclaimer: PROBABILISTIC_DISCLAIMER,
    };
  }
}

/**
 * Adapter for external AI detection model APIs (e.g. Hugging Face classification head or hosted detector).
 */
export class ExternalAIWritingProvider implements AIWritingAnalysisProvider {
  public readonly name: string;
  private endpointUrl: string;
  private apiKey?: string | undefined;
  private fallback: StatisticalAIWritingProvider;

  constructor(options: { name?: string | undefined; endpointUrl: string; apiKey?: string | undefined }) {
    this.name = options.name || "External-AI-Detector-API";
    this.endpointUrl = options.endpointUrl;
    this.apiKey = options.apiKey;
    this.fallback = new StatisticalAIWritingProvider();
  }

  public async analyze(text: string): Promise<AIWritingAnalysisResult> {
    if (!this.endpointUrl || !this.apiKey) {
      return this.fallback.analyze(text);
    }

    try {
      const res = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`AI detector HTTP ${res.status}`);
      const data = await res.json();

      // Combine statistical baseline with model-derived probability
      const base = this.fallback.analyze(text);
      if (data.modelScore !== undefined) {
        base.modelDerivedIndicators = {
          providerName: this.name,
          rawModelConfidence: data.modelScore,
          perplexityScore: data.perplexity,
          burstinessScore: data.burstiness,
        };
        if (data.modelScore > 0.8 && base.status !== "insufficient_evidence") {
          base.status = "review_recommended";
          base.confidence = Math.max(base.confidence, data.modelScore);
        }
      }
      return base;
    } catch {
      return this.fallback.analyze(text);
    }
  }
}

// Active provider instance
let activeAIWritingProvider: AIWritingAnalysisProvider = new StatisticalAIWritingProvider();

export function setAIWritingProvider(provider: AIWritingAnalysisProvider): void {
  activeAIWritingProvider = provider;
}

export function getAIWritingProvider(): AIWritingAnalysisProvider {
  return activeAIWritingProvider;
}

/**
 * Analyzes document for AI writing indicators using configured provider.
 */
export function analyzeAIWritingPatterns(documentText: string): AIWritingAnalysisResult {
  const provider = getAIWritingProvider();
  const res = provider.analyze(documentText);
  if (res instanceof Promise) {
    // Synchronous fallback
    return new StatisticalAIWritingProvider().analyze(documentText);
  }
  return res;
}
