import type {
  NormalizedSourceRecord,
  ProviderHealthStatus,
  SourceSearchQuery,
  UnifiedSourceProvider,
} from "./source-provider-types";
import { retrieveTopCandidateSources } from "./source-providers";

export interface AcademicArticleRecord {
  id: string;
  doi?: string | undefined;
  title: string;
  authors?: string[] | undefined;
  year?: number | undefined;
  journalOrVenue?: string | undefined;
  url?: string | undefined;
  abstract: string;
  fullText?: string | undefined;
  isOpenAccess: boolean;
}

/**
 * Open-Access Academic Provider.
 * Operating Principles:
 * - $0 cost: zero paid subscriptions, zero API keys required.
 * - Searches registered open-access preprint / journal papers.
 * - Supports safe optional queries against open academic metadata endpoints (e.g. Crossref Open REST API).
 * - Fails safely without halting overall similarity analysis when offline or when external services time out.
 */
export class OpenAccessAcademicProvider implements UnifiedSourceProvider {
  public readonly id = "open-access-academic";
  public readonly name = "Open-Access Academic Literature Provider";
  public readonly category = "academic_open_access" as const;

  private registeredArticles: AcademicArticleRecord[] = [];
  private isNetworkEnabled = true;

  constructor(seedArticles: AcademicArticleRecord[] = []) {
    this.registeredArticles = [...seedArticles];
  }

  public registerArticle(article: AcademicArticleRecord): void {
    const idx = this.registeredArticles.findIndex(
      (a) => a.id === article.id || (a.doi && a.doi === article.doi)
    );
    if (idx >= 0) {
      this.registeredArticles[idx] = article;
    } else {
      this.registeredArticles.push(article);
    }
  }

  public setNetworkEnabled(enabled: boolean): void {
    this.isNetworkEnabled = enabled;
  }

  public async searchCandidates(query: SourceSearchQuery): Promise<NormalizedSourceRecord[]> {
    const results: NormalizedSourceRecord[] = [];

    // 1. Search locally registered open-access articles (offline-first)
    if (this.registeredArticles.length > 0) {
      const candidateDocs = this.registeredArticles.map((a) => ({
        id: a.id,
        title: a.title,
        type: "academic" as const,
        author: a.authors?.join(", "),
        url: a.url || (a.doi ? `https://doi.org/${a.doi}` : undefined),
        text: `${a.title}\n${a.abstract}\n${a.fullText || ""}`,
      }));

      const top = retrieveTopCandidateSources(query.text, candidateDocs, query.maxCandidates || 4);
      for (const t of top) {
        const orig = this.registeredArticles.find((a) => a.id === t.id);
        if (orig) {
          results.push(this.formatArticleRecord(orig));
        }
      }
    }

    // 2. Optional Open Academic Metadata Query (Crossref Public REST API)
    if (this.isNetworkEnabled && query.distinctivePhrases && query.distinctivePhrases.length > 0) {
      try {
        const topPhrase = query.distinctivePhrases[0];
        if (topPhrase && topPhrase.length >= 10) {
          const crossrefRecord = await this.queryCrossrefPublicMetadata(topPhrase);
          if (crossrefRecord && !results.some((r) => r.identifier === crossrefRecord.identifier)) {
            results.push(crossrefRecord);
          }
        }
      } catch {
        // Safe isolation: ignore network failures
      }
    }

    return results;
  }

  /**
   * Queries the free Crossref Public Works REST API.
   * Completely free, requires no API key, returns published academic metadata.
   */
  private async queryCrossrefPublicMetadata(phrase: string): Promise<NormalizedSourceRecord | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s safe timeout

      const endpoint = `https://api.crossref.org/works?query=${encodeURIComponent(
        phrase
      )}&rows=1&select=DOI,title,author,published,abstract,URL,container-title`;

      const resp = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Verity-Academic-Integrity-Agent/1.0 (mailto:integrity-research@verity.edu)",
        },
      });
      clearTimeout(timeoutId);

      if (!resp.ok) return null;
      const data = await resp.json();
      const item = data?.message?.items?.[0];
      if (!item || !item.title?.[0]) return null;

      const title = item.title[0];
      const doi = item.DOI;
      const authorList = item.author?.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean).join(", ");
      const url = item.URL || (doi ? `https://doi.org/${doi}` : undefined);
      const abstractText = (item.abstract || "").replace(/<[^>]+>/g, "").trim();

      const combinedText = `${title}\n${abstractText}`;
      if (combinedText.length < 25) return null;

      return {
        identifier: `doi-${doi || item.title[0].toLowerCase().replace(/\s+/g, "-")}`,
        providerId: this.id,
        providerCategory: this.category,
        sourceType: "academic",
        title: `Academic Source: ${title}`,
        author: authorList || "Academic Researcher",
        publicationDate: item.published?.["date-parts"]?.[0]?.[0]?.toString(),
        url,
        domain: url ? url.split("/")[2] : "doi.org",
        snippet: abstractText.slice(0, 240) || title,
        retrievedAt: new Date().toISOString(),
        contentAvailable: combinedText.length > 50,
        text: combinedText,
        metadataQuality: "high",
        metadata: {
          doi,
          containerTitle: item["container-title"]?.[0],
          isOpenAccessMetadata: true,
        },
      };
    } catch {
      return null;
    }
  }

  public async getSource(identifier: string): Promise<NormalizedSourceRecord | null> {
    const art = this.registeredArticles.find((a) => a.id === identifier || a.doi === identifier);
    return art ? this.formatArticleRecord(art) : null;
  }

  public async health(): Promise<ProviderHealthStatus> {
    return {
      providerId: this.id,
      name: this.name,
      category: this.category,
      available: true,
      isOfflineCapable: true,
      sourceCount: this.registeredArticles.length,
      message: this.isNetworkEnabled
        ? "Open-access academic provider active (offline catalog + public Crossref metadata)."
        : "Open-access academic provider operating in offline-only mode.",
    };
  }

  private formatArticleRecord(a: AcademicArticleRecord): NormalizedSourceRecord {
    const fullContent = `${a.title}\n${a.abstract}\n${a.fullText || ""}`.trim();
    return {
      identifier: a.id,
      providerId: this.id,
      providerCategory: this.category,
      sourceType: "academic",
      title: `Academic Paper: ${a.title}`,
      author: a.authors?.join(", ") || "Academic Author",
      publicationDate: a.year ? String(a.year) : undefined,
      url: a.url || (a.doi ? `https://doi.org/${a.doi}` : undefined),
      domain: a.url ? a.url.split("/")[2] : "academic.journal",
      snippet: a.abstract.slice(0, 240) + "...",
      retrievedAt: new Date().toISOString(),
      contentAvailable: fullContent.length > 50,
      text: fullContent,
      metadataQuality: "high",
      metadata: {
        doi: a.doi,
        journal: a.journalOrVenue,
        isOpenAccess: a.isOpenAccess,
      },
    };
  }
}
