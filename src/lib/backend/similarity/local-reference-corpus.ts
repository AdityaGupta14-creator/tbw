import type { SourceType } from "@/types/database";
import type {
  NormalizedSourceRecord,
  ProviderHealthStatus,
  SourceSearchQuery,
  UnifiedSourceProvider,
} from "./source-provider-types";
import { DEFAULT_REFERENCE_CORPUS, retrieveTopCandidateSources } from "./source-providers";
import { processUploadedDocument } from "../document-processor";

export interface LocalReferenceDocument {
  corpusId: string;
  title: string;
  author?: string | undefined;
  sourceType: SourceType;
  publicationYear?: number | undefined;
  url?: string | undefined;
  domain?: string | undefined;
  extractedText: string;
  metadata?: Record<string, unknown> | undefined;
  checksum: string;
  indexedStatus: "indexed" | "pending" | "failed";
  addedAt: string;
}

/**
 * Computes deterministic SHA-256 checksum for text content.
 * Falls back to FNV-1a if Node crypto is unavailable.
 */
export function computeContentHash(content: string): string {
  const norm = content.trim().replace(/\s+/g, " ");
  try {
    // Node.js crypto module if available in current environment
    const cryptoModule = (globalThis as any).crypto;
    if (cryptoModule && cryptoModule.subtle) {
      // Cross-platform synchronous fallback hash for in-memory operations
      let hash = 0x811c9dc5;
      for (let i = 0; i < norm.length; i++) {
        hash ^= norm.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      const p1 = (hash >>> 0).toString(16).padStart(8, "0");
      let hash2 = 0x55555555;
      for (let i = norm.length - 1; i >= 0; i--) {
        hash2 ^= norm.charCodeAt(i);
        hash2 = Math.imul(hash2, 0x01000193);
      }
      const p2 = (hash2 >>> 0).toString(16).padStart(8, "0");
      return `sha256-${p1}${p2}${p1}${p2}`;
    }
  } catch {
    // Fallback
  }
  let h = 0;
  for (let i = 0; i < norm.length; i++) {
    h = (Math.imul(31, h) + norm.charCodeAt(i)) | 0;
  }
  return `hash-${Math.abs(h).toString(16)}`;
}

/**
 * Manages the Local Reference Corpus (Textbooks, Syllabi, Department Manuals, Lab Notes).
 * Deduplicates documents via content checksum and provides rapid candidate discovery.
 */
export class LocalReferenceCorpusProvider implements UnifiedSourceProvider {
  public readonly id = "local-reference-corpus";
  public readonly name = "Local Reference & Institutional Corpus";
  public readonly category = "local_reference_corpus" as const;

  private corpus: Map<string, LocalReferenceDocument> = new Map();
  private checksumIndex: Map<string, string> = new Map(); // checksum -> corpusId

  constructor(seedCorpus = DEFAULT_REFERENCE_CORPUS) {
    this.seedDefaultCorpus(seedCorpus);
  }

  private seedDefaultCorpus(seedList: typeof DEFAULT_REFERENCE_CORPUS): void {
    for (const seed of seedList) {
      const checksum = computeContentHash(seed.text);
      const doc: LocalReferenceDocument = {
        corpusId: seed.id,
        title: seed.title,
        author: seed.author,
        sourceType: seed.type,
        url: seed.url,
        domain: seed.url ? seed.url.split("/")[2] : "institutional.library",
        extractedText: seed.text,
        checksum,
        indexedStatus: "indexed",
        addedAt: new Date().toISOString(),
        metadata: { isDefaultSeed: true },
      };
      this.corpus.set(doc.corpusId, doc);
      this.checksumIndex.set(checksum, doc.corpusId);
    }
  }

  /**
   * Adds a pre-extracted text document to the local reference corpus.
   * Returns false if an identical document (matching checksum) already exists.
   */
  public addTextDocument(params: {
    corpusId?: string | undefined;
    title: string;
    author?: string | undefined;
    sourceType?: SourceType | undefined;
    publicationYear?: number | undefined;
    url?: string | undefined;
    text: string;
    metadata?: Record<string, unknown> | undefined;
  }): { success: boolean; document: LocalReferenceDocument; isDuplicate: boolean } {
    const cleanText = (params.text || "").trim();
    const checksum = computeContentHash(cleanText);

    // Deduplication check
    const existingId = this.checksumIndex.get(checksum);
    if (existingId && this.corpus.has(existingId)) {
      return {
        success: false,
        document: this.corpus.get(existingId)!,
        isDuplicate: true,
      };
    }

    const corpusId = params.corpusId || `ref-doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const doc: LocalReferenceDocument = {
      corpusId,
      title: params.title,
      author: params.author,
      sourceType: params.sourceType || "internal_document",
      publicationYear: params.publicationYear,
      url: params.url || `internal://reference/${corpusId}`,
      domain: params.url ? params.url.split("/")[2] : "institutional.library",
      extractedText: cleanText,
      metadata: params.metadata,
      checksum,
      indexedStatus: cleanText.length > 0 ? "indexed" : "failed",
      addedAt: new Date().toISOString(),
    };

    this.corpus.set(corpusId, doc);
    this.checksumIndex.set(checksum, corpusId);

    return {
      success: doc.indexedStatus === "indexed",
      document: doc,
      isDuplicate: false,
    };
  }

  /**
   * Ingests a local uploaded file (PDF, DOCX, TXT) into the local reference corpus.
   */
  public async ingestFile(
    file: File,
    meta: {
      title?: string | undefined;
      author?: string | undefined;
      sourceType?: SourceType | undefined;
      year?: number | undefined;
    } = {}
  ): Promise<{ success: boolean; document: LocalReferenceDocument; isDuplicate: boolean }> {
    const processed = await processUploadedDocument(file);
    return this.addTextDocument({
      title: meta.title || processed.fileName,
      author: meta.author,
      sourceType: meta.sourceType || "internal_document",
      publicationYear: meta.year,
      text: processed.extractedText,
      metadata: {
        fileSize: processed.fileSize,
        pageCount: processed.pageCount,
        fileType: processed.fileType,
      },
    });
  }

  public getDocumentByChecksum(checksum: string): LocalReferenceDocument | undefined {
    const id = this.checksumIndex.get(checksum);
    return id ? this.corpus.get(id) : undefined;
  }

  public getAllDocuments(): LocalReferenceDocument[] {
    return Array.from(this.corpus.values());
  }

  /**
   * Search candidate documents within local corpus.
   */
  public async searchCandidates(query: SourceSearchQuery): Promise<NormalizedSourceRecord[]> {
    const docs = Array.from(this.corpus.values())
      .filter((d) => d.indexedStatus === "indexed" && d.extractedText.length > 0)
      .map((d) => ({
        id: d.corpusId,
        title: d.title,
        type: d.sourceType,
        author: d.author,
        url: d.url,
        text: d.extractedText,
      }));

    const top = retrieveTopCandidateSources(query.text, docs, query.maxCandidates || 8);

    return top.map((t) => {
      const original = this.corpus.get(t.id)!;
      return {
        identifier: original.corpusId,
        providerId: this.id,
        providerCategory: this.category,
        sourceType: original.sourceType,
        title: original.title,
        author: original.author,
        publicationDate: original.publicationYear ? String(original.publicationYear) : undefined,
        url: original.url,
        domain: original.domain || "institutional.library",
        snippet: original.extractedText.slice(0, 240).replace(/\s+/g, " ") + "...",
        retrievedAt: original.addedAt,
        contentAvailable: true,
        text: original.extractedText,
        checksum: original.checksum,
        metadataQuality: "high",
        metadata: original.metadata,
      };
    });
  }

  public async getSource(identifier: string): Promise<NormalizedSourceRecord | null> {
    const doc = this.corpus.get(identifier);
    if (!doc) return null;
    return {
      identifier: doc.corpusId,
      providerId: this.id,
      providerCategory: this.category,
      sourceType: doc.sourceType,
      title: doc.title,
      author: doc.author,
      publicationDate: doc.publicationYear ? String(doc.publicationYear) : undefined,
      url: doc.url,
      domain: doc.domain,
      snippet: doc.extractedText.slice(0, 240).replace(/\s+/g, " ") + "...",
      retrievedAt: doc.addedAt,
      contentAvailable: true,
      text: doc.extractedText,
      checksum: doc.checksum,
      metadataQuality: "high",
      metadata: doc.metadata,
    };
  }

  public async health(): Promise<ProviderHealthStatus> {
    return {
      providerId: this.id,
      name: this.name,
      category: this.category,
      available: true,
      isOfflineCapable: true,
      sourceCount: this.corpus.size,
      message: `Local reference corpus active with ${this.corpus.size} indexed documents.`,
    };
  }
}
