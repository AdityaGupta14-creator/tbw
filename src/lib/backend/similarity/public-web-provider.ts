import type {
  NormalizedSourceRecord,
  ProviderHealthStatus,
  SourceSearchQuery,
  UnifiedSourceProvider,
} from "./source-provider-types";
import { retrieveTopCandidateSources } from "./source-providers";

export interface PublicWebDocument {
  id: string;
  title: string;
  url: string;
  domain: string;
  text: string;
  author?: string | undefined;
  retrievedAt?: string | undefined;
}

/**
 * Public Web Candidate Source Provider.
 * Operating Principles:
 * - $0 cost: zero commercial search APIs, zero API keys required.
 * - Explicitly labeled as "Public Web Candidate Source" (never claimed as exhaustive internet search).
 * - Safe optional operation: network timeouts and offline states fail gracefully without halting analysis.
 * - Supports registered public web documents, direct public URL fetching with timeout, and open encyclopedic search.
 */
export class PublicWebSearchProvider implements UnifiedSourceProvider {
  public readonly id = "public-web-search";
  public readonly name = "Public Web Candidate Discovery Provider";
  public readonly category = "public_web" as const;

  private registeredWebDocuments: PublicWebDocument[] = [];
  private isNetworkEnabled = true;

  constructor(seedDocs: PublicWebDocument[] = []) {
    this.registeredWebDocuments = [...seedDocs];
  }

  public registerWebDocument(doc: PublicWebDocument): void {
    const idx = this.registeredWebDocuments.findIndex((d) => d.url === doc.url || d.id === doc.id);
    if (idx >= 0) {
      this.registeredWebDocuments[idx] = doc;
    } else {
      this.registeredWebDocuments.push(doc);
    }
  }

  public setNetworkEnabled(enabled: boolean): void {
    this.isNetworkEnabled = enabled;
  }

  /**
   * Search candidate public web documents.
   * Never throws across network or rate-limit failures.
   */
  public async searchCandidates(query: SourceSearchQuery): Promise<NormalizedSourceRecord[]> {
    const results: NormalizedSourceRecord[] = [];

    // 1. Search locally registered / cached public web documents first (zero network dependency)
    if (this.registeredWebDocuments.length > 0) {
      const candidateDocs = this.registeredWebDocuments.map((d) => ({
        id: d.id,
        title: d.title,
        type: "web" as const,
        author: d.author,
        url: d.url,
        text: d.text,
      }));

      const top = retrieveTopCandidateSources(query.text, candidateDocs, query.maxCandidates || 4);
      for (const t of top) {
        const orig = this.registeredWebDocuments.find((d) => d.id === t.id);
        if (orig) {
          results.push(this.formatWebRecord(orig));
        }
      }
    }

    // 2. Optional Free Public Web Lookup (e.g. Wikipedia Open REST API)
    // Only executed if network is enabled and distinctive phrases are provided
    if (this.isNetworkEnabled && query.distinctivePhrases && query.distinctivePhrases.length > 0) {
      try {
        const topPhrase = query.distinctivePhrases[0];
        if (topPhrase && topPhrase.length >= 8) {
          const publicWebResult = await this.queryOpenWeb(topPhrase);
          if (publicWebResult && !results.some((r) => r.url === publicWebResult.url)) {
            results.push(publicWebResult);
          }
        }
      } catch {
        // Safe isolation: ignore network failures
      }
    }

    return results;
  }

  /**
   * Query free public encyclopedia API without API keys.
   */
  private async queryOpenWeb(phrase: string): Promise<NormalizedSourceRecord | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s safe timeout

      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        phrase
      )}&utf8=&format=json&origin=*`;

      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Verity-Academic-Integrity-Agent/1.0 (Educational Academic Non-Commercial)",
        },
      });
      clearTimeout(timeoutId);

      if (!resp.ok) return null;
      const data = await resp.json();
      const hit = data?.query?.search?.[0];
      if (!hit) return null;

      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/\s+/g, "_"))}`;
      const snippet = (hit.snippet || "").replace(/<[^>]+>/g, "");

      return {
        identifier: `web-wiki-${hit.pageid}`,
        providerId: this.id,
        providerCategory: this.category,
        sourceType: "web",
        title: `Public Web Candidate: ${hit.title}`,
        author: "Public Web Contributor / Wikipedia",
        url: pageUrl,
        domain: "en.wikipedia.org",
        snippet,
        retrievedAt: new Date().toISOString(),
        contentAvailable: snippet.length > 30,
        text: snippet,
        metadataQuality: "medium",
        metadata: {
          wordCount: hit.wordcount,
          pageId: hit.pageid,
          isPublicWebCandidate: true,
        },
      };
    } catch {
      return null;
    }
  }

  public async getSource(identifier: string): Promise<NormalizedSourceRecord | null> {
    const doc = this.registeredWebDocuments.find((d) => d.id === identifier || d.url === identifier);
    return doc ? this.formatWebRecord(doc) : null;
  }

  public async health(): Promise<ProviderHealthStatus> {
    return {
      providerId: this.id,
      name: this.name,
      category: this.category,
      available: true,
      isOfflineCapable: true,
      sourceCount: this.registeredWebDocuments.length,
      message: this.isNetworkEnabled
        ? "Public web candidate discovery active (optional rate-limited open lookups)."
        : "Public web provider in offline-only mode (cached web sources available).",
    };
  }

  private formatWebRecord(doc: PublicWebDocument): NormalizedSourceRecord {
    return {
      identifier: doc.id,
      providerId: this.id,
      providerCategory: this.category,
      sourceType: "web",
      title: `Public Web Candidate: ${doc.title}`,
      author: doc.author || "Web Publisher",
      url: doc.url,
      domain: doc.domain || "web.archive",
      snippet: doc.text.slice(0, 240).replace(/\s+/g, " ") + "...",
      retrievedAt: doc.retrievedAt || new Date().toISOString(),
      contentAvailable: true,
      text: doc.text,
      metadataQuality: "medium",
      metadata: {
        isPublicWebCandidate: true,
      },
    };
  }
}
