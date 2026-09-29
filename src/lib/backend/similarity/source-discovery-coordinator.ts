import type {
  NormalizedSourceRecord,
  ProviderHealthStatus,
  SourceCandidateMatchRecord,
  SourceSearchQuery,
  UnifiedSourceProvider,
} from "./source-provider-types";
import { generateCandidateQueries } from "./candidate-generator";
import { InternalStudentCorpusProvider } from "./internal-student-provider";
import { LocalReferenceCorpusProvider } from "./local-reference-corpus";
import { PublicWebSearchProvider } from "./public-web-provider";
import { OpenAccessAcademicProvider } from "./open-access-provider";
import { compareTwoDocumentsAsync } from "../similarity-engine";
import {
  type SimilarityEngineConfig,
  DEFAULT_SIMILARITY_CONFIG,
} from "./types";

export interface SourceDiscoveryOptions {
  config?: Partial<SimilarityEngineConfig> | undefined;
  minSimilarityToReport?: number | undefined; // Default 5%
  maxCandidatesTotal?: number | undefined;
}

/**
 * Orchestrates multi-provider source discovery and feeds candidate sources
 * through the existing Verity similarity engine.
 */
export class SourceDiscoveryCoordinator {
  private providers: UnifiedSourceProvider[] = [];

  public readonly studentProvider: InternalStudentCorpusProvider;
  public readonly localRefProvider: LocalReferenceCorpusProvider;
  public readonly webProvider: PublicWebSearchProvider;
  public readonly openAccessProvider: OpenAccessAcademicProvider;

  constructor(customProviders?: {
    student?: InternalStudentCorpusProvider | undefined;
    localRef?: LocalReferenceCorpusProvider | undefined;
    web?: PublicWebSearchProvider | undefined;
    openAccess?: OpenAccessAcademicProvider | undefined;
  }) {
    this.studentProvider = customProviders?.student || new InternalStudentCorpusProvider();
    this.localRefProvider = customProviders?.localRef || new LocalReferenceCorpusProvider();
    this.webProvider = customProviders?.web || new PublicWebSearchProvider();
    this.openAccessProvider = customProviders?.openAccess || new OpenAccessAcademicProvider();

    if (customProviders && Object.keys(customProviders).length > 0) {
      this.providers = [];
      if (customProviders.student) this.providers.push(customProviders.student);
      if (customProviders.localRef) this.providers.push(customProviders.localRef);
      if (customProviders.web) this.providers.push(customProviders.web);
      if (customProviders.openAccess) this.providers.push(customProviders.openAccess);
    } else {
      this.providers = [
        this.studentProvider,
        this.localRefProvider,
        this.webProvider,
        this.openAccessProvider,
      ];
    }
  }

  public registerProvider(provider: UnifiedSourceProvider): void {
    this.providers.push(provider);
  }

  public getProviders(): UnifiedSourceProvider[] {
    return [...this.providers];
  }

  /**
   * Complete end-to-end pipeline:
   * 1. Extracts distinctive candidate queries from student document
   * 2. Searches across all registered providers with error isolation
   * 3. Deduplicates candidate sources
   * 4. Evaluates each candidate source using the EXISTING similarity engine
   * 5. Produces normalized source match records
   */
  public async discoverAndEvaluateSources(
    submissionId: string,
    submissionText: string,
    queryContext: Omit<SourceSearchQuery, "text"> = {},
    options: SourceDiscoveryOptions = {}
  ): Promise<{
    matches: SourceCandidateMatchRecord[];
    discoveredCandidatesCount: number;
    evaluatedCandidatesCount: number;
    providerReports: ProviderHealthStatus[];
  }> {
    const cleanText = (submissionText || "").trim();
    if (cleanText.length < 20) {
      return {
        matches: [],
        discoveredCandidatesCount: 0,
        evaluatedCandidatesCount: 0,
        providerReports: await this.checkAllHealth(),
      };
    }

    // 1. Generate candidate queries suppressing generic academic clichés
    const candidateQueries = generateCandidateQueries(cleanText, {
      maxQueries: 6,
      promptText: (queryContext as any).promptText,
    });
    const distinctivePhrases = candidateQueries.map((q) => q.phrase);

    const searchQuery: SourceSearchQuery = {
      ...queryContext,
      text: cleanText,
      distinctivePhrases,
    };

    // 2. Query each provider in parallel with individual error boundaries
    const candidateMap = new Map<string, NormalizedSourceRecord>();

    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          const sources = await provider.searchCandidates(searchQuery);
          for (const s of sources) {
            // Deduplicate by URL or checksum or identifier
            const dedupeKey = s.checksum || s.url || `${s.providerId}:${s.identifier}`;
            if (!candidateMap.has(dedupeKey)) {
              candidateMap.set(dedupeKey, s);
            }
          }
        } catch (err) {
          // Provider error isolation: one unavailable provider never halts analysis
          console.warn(`Source provider ${provider.id} error:`, err);
        }
      })
    );

    const candidates = Array.from(candidateMap.values());
    const discoveredCandidatesCount = candidates.length;

    // Limit evaluated candidates to top candidates to avoid unnecessary O(N^2) load
    const maxToEvaluate = options.maxCandidatesTotal || 16;
    const toEvaluate = candidates.slice(0, maxToEvaluate);

    const minSimThreshold = options.minSimilarityToReport ?? 5;
    const simConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...options.config };

    const matchRecords: SourceCandidateMatchRecord[] = [];

    // 3. Evaluate candidate sources using EXISTING similarity engine
    for (const source of toEvaluate) {
      if (!source.text || source.text.trim().length === 0) continue;

      try {
        const evalResult = await compareTwoDocumentsAsync(
          cleanText,
          source.text,
          source.title,
          source.sourceType,
          simConfig
        );

        const passages = evalResult.passages || [];
        const breakdown = evalResult.evidenceBreakdown || {
          strong_percentage: 0,
          moderate_percentage: 0,
          semantic_percentage: 0,
          weak_percentage: 0,
          unique_matched_words: 0,
          total_document_words: 0,
        };

        const hasSignificantEvidence =
          evalResult.overallOverlap >= minSimThreshold ||
          passages.some((p) => p.is_quoted && (p.similarity_percentage ?? 0) >= 40);

        if (hasSignificantEvidence) {
          // Calculate shingle count and boundary positions from passages
          let firstPos: number | undefined;
          let lastPos: number | undefined;
          let totalShingles = 0;

          for (const p of passages) {
            if (p.start_char !== undefined) {
              firstPos = firstPos === undefined ? p.start_char : Math.min(firstPos, p.start_char);
            }
            if (p.end_char !== undefined) {
              lastPos = lastPos === undefined ? p.end_char : Math.max(lastPos, p.end_char);
            }
            totalShingles += Math.max(1, Math.floor(p.matched_words / 4));
          }

          const engineLevel = evalResult.transparentBreakdown?.evidenceLevel;
          const evidenceLevel: "strong" | "moderate" | "weak" =
            engineLevel === "strong" || engineLevel === "moderate" || engineLevel === "weak"
              ? engineLevel
              : breakdown.strong_percentage >= 20
              ? "strong"
              : breakdown.moderate_percentage >= 15 || breakdown.semantic_percentage >= 15
              ? "moderate"
              : "weak";

          const record: SourceCandidateMatchRecord = {
            submissionId,
            sourceId: source.identifier,
            sourceType: source.sourceType,
            provider: source.providerId,
            providerCategory: source.providerCategory,
            sourceTitle: source.title,
            author: source.author,
            url: source.url,
            domain: source.domain,
            sourceIdentifier: source.identifier,
            checksum: source.checksum,
            similarityPercentage: evalResult.overallOverlap,
            evidenceLevel,
            confidence: evalResult.overallOverlap >= 60 ? 0.94 : evalResult.overallOverlap >= 30 ? 0.82 : 0.65,
            matchedPassages: passages,
            matchedWordCount: evalResult.matchedWords,
            matchedShingleCount: totalShingles,
            exactMatchPercentage: evalResult.transparentBreakdown?.exactSimilarity ?? 0,
            fuzzyMatchPercentage: evalResult.transparentBreakdown?.fuzzySimilarity ?? 0,
            semanticMatchPercentage: evalResult.transparentBreakdown?.semanticSimilarity ?? 0,
            firstMatchedPosition: firstPos,
            lastMatchedPosition: lastPos,
            retrievedAt: new Date().toISOString(),
          };

          matchRecords.push(record);
        }
      } catch (err) {
        console.warn(`Evaluation failed for source ${source.identifier}:`, err);
      }
    }

    // Sort matches by similarity percentage descending
    matchRecords.sort((a, b) => b.similarityPercentage - a.similarityPercentage);

    const providerReports = await this.checkAllHealth();

    return {
      matches: matchRecords,
      discoveredCandidatesCount,
      evaluatedCandidatesCount: toEvaluate.length,
      providerReports,
    };
  }

  public async checkAllHealth(): Promise<ProviderHealthStatus[]> {
    return Promise.all(
      this.providers.map(async (p) => {
        try {
          return await p.health();
        } catch (err) {
          return {
            providerId: p.id,
            name: p.name,
            category: p.category,
            available: false,
            isOfflineCapable: false,
            message: `Health check failed: ${String(err)}`,
          };
        }
      })
    );
  }
}
