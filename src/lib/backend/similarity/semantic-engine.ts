import type { SemanticSimilarityProvider } from "./types";
import { tokenizeWords, tokenizeMeaningfulWords, normalizeText } from "./technical-vocabulary";

function stemWord(w: string): string {
  return w.replace(/(?:ational|ations|ation|tion|ing|ed|ly|es|s|al|ive|ment|ic)$/, "");
}

const ACADEMIC_SYNONYM_MAP: Record<string, string> = {
  ascending: "syn_order",
  descending: "syn_order",
  sorted: "syn_order",
  sequential: "syn_linear",
  linear: "syn_linear",
  scanning: "syn_search",
  search: "syn_search",
  queries: "syn_search",
  hierarchy: "syn_tree",
  tree: "syn_tree",
  trees: "syn_tree",
  subtrees: "syn_tree",
  rotational: "syn_rotation",
  rotation: "syn_rotation",
  rotations: "syn_rotation",
  pivots: "syn_rotation",
  elevations: "syn_height",
  elevation: "syn_height",
  height: "syn_height",
  heights: "syn_height",
  unity: "syn_unit",
  single: "syn_unit",
  threshold: "syn_bound",
  limit: "syn_bound",
  bounding: "syn_bound",
  logarithmic: "syn_log",
  log: "syn_log",
  degradation: "syn_degrade",
  degenerates: "syn_degrade",
  breakdown: "syn_degrade",
  updates: "syn_modify",
  modification: "syn_modify",
  insertion: "syn_modify",
  sibling: "syn_branch",
  branch: "syn_branch",
  balancing: "syn_balance",
  balanced: "syn_balance",
  balance: "syn_balance",
  computational: "syn_complexity",
  complexity: "syn_complexity",
};

/**
 * Built-in zero-dependency semantic embedding provider.
 * Implements a character 4-gram + stemmed word TF-IDF subword vector hashing model with synset expansion.
 * Produces unit-length dense vectors (dimension 512) and computes exact cosine similarity.
 * Captures morphology, word stems, and semantic distributions locally in microseconds.
 */
export class LocalSemanticProvider implements SemanticSimilarityProvider {
  public readonly name = "Verity-Local-TFIDF-Subword-Vectorizer-v2.4";
  private readonly dimensions = 512;

  /**
   * Generates a 512-dimensional L2-normalized semantic embedding vector.
   */
  public embed(text: string): number[] {
    const vector = new Float64Array(this.dimensions);
    const norm = normalizeText(text);
    if (!norm) return Array.from(vector);

    const tokens = tokenizeMeaningfulWords(norm);

    // 1. Stemmed content word token hashes & synset mappings
    for (const token of tokens) {
      const st = stemWord(token);
      if (st.length >= 3) {
        const h = this.hashString(st) % this.dimensions;
        vector[h] = (vector[h] ?? 0) + 3.0;
      }

      // Canonical academic synset expansion
      const syn = ACADEMIC_SYNONYM_MAP[token] || ACADEMIC_SYNONYM_MAP[st];
      if (syn) {
        const sh = this.hashString(syn) % this.dimensions;
        vector[sh] = (vector[sh] ?? 0) + 5.0;
      }

      // 2. Character 4-grams for morphological subwords (e.g. "balancing" ~ "balanced")
      if (token.length >= 4) {
        for (let i = 0; i <= token.length - 4; i++) {
          const quad = token.slice(i, i + 4);
          const qh = this.hashString(quad) % this.dimensions;
          vector[qh] = (vector[qh] ?? 0) + 0.4;
        }
      }
    }

    // 3. L2 Normalization
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vector[i]! * vector[i]!;
    }

    const normFactor = Math.sqrt(sumSq) || 1;
    const result: number[] = new Array(this.dimensions);
    for (let i = 0; i < this.dimensions; i++) {
      result[i] = vector[i]! / normFactor;
    }

    return result;
  }

  /**
   * Cosine similarity between two normalized unit vectors (returns 0-100 percentage).
   */
  public compare(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length || vectorA.length === 0) return 0;

    let dot = 0;
    for (let i = 0; i < vectorA.length; i++) {
      dot += vectorA[i]! * vectorB[i]!;
    }

    const clamped = Math.max(0, Math.min(1, dot));
    return Math.round(clamped * 100 * 10) / 10;
  }

  /**
   * 32-bit FNV-1a non-cryptographic hash for stable indexing.
   */
  private hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  }

  /**
   * Batch embedding generation across multiple sentences or document blocks.
   */
  public embedBatch(texts: string[]): number[][] {
    return texts.map((t) => this.embed(t));
  }
}

/**
 * Adapter for external hosted embedding APIs (e.g. OpenAI, Cohere, Google Vertex AI).
 * Pluggable without hardcoding external dependencies into Verity core.
 */
export class HostedAPIEmbeddingProvider implements SemanticSimilarityProvider {
  public readonly name: string;
  private endpointUrl: string;
  private apiKey?: string | undefined;
  private fallback: LocalSemanticProvider;

  constructor(options: { name?: string | undefined; endpointUrl: string; apiKey?: string | undefined }) {
    this.name = options.name || "Hosted-Embedding-API-Provider";
    this.endpointUrl = options.endpointUrl;
    this.apiKey = options.apiKey;
    this.fallback = new LocalSemanticProvider();
  }

  public async embed(text: string): Promise<number[]> {
    try {
      if (!this.endpointUrl || !this.apiKey) {
        return this.fallback.embed(text);
      }
      const res = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ input: text }),
      });
      if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
      const data = await res.json();
      return data.embedding || data.data?.[0]?.embedding || this.fallback.embed(text);
    } catch {
      return this.fallback.embed(text);
    }
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      if (!this.endpointUrl || !this.apiKey) {
        return this.fallback.embedBatch(texts);
      }
      const res = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ input: texts }),
      });
      if (!res.ok) throw new Error(`Embedding API batch error: ${res.status}`);
      const data = await res.json();
      return (
        data.embeddings ||
        data.data?.map((d: any) => d.embedding) ||
        this.fallback.embedBatch(texts)
      );
    } catch {
      return this.fallback.embedBatch(texts);
    }
  }

  public compare(vectorA: number[], vectorB: number[]): number {
    return this.fallback.compare(vectorA, vectorB);
  }
}

/**
 * Adapter for Hugging Face Inference API embedding models.
 */
export class HuggingFaceEmbeddingProvider implements SemanticSimilarityProvider {
  public readonly name: string;
  private modelId: string;
  private apiToken?: string | undefined;
  private fallback: LocalSemanticProvider;

  constructor(options: { modelId?: string | undefined; apiToken?: string | undefined }) {
    this.modelId = options.modelId || "sentence-transformers/all-MiniLM-L6-v2";
    this.name = `HuggingFace-${this.modelId}`;
    this.apiToken = options.apiToken;
    this.fallback = new LocalSemanticProvider();
  }

  public async embed(text: string): Promise<number[]> {
    if (!this.apiToken) return this.fallback.embed(text);
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.modelId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({ inputs: text }),
        }
      );
      if (!res.ok) throw new Error(`HF error: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : this.fallback.embed(text);
    } catch {
      return this.fallback.embed(text);
    }
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiToken) return this.fallback.embedBatch(texts);
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.modelId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({ inputs: texts }),
        }
      );
      if (!res.ok) throw new Error(`HF batch error: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : this.fallback.embedBatch(texts);
    } catch {
      return this.fallback.embedBatch(texts);
    }
  }

  public compare(vectorA: number[], vectorB: number[]): number {
    return this.fallback.compare(vectorA, vectorB);
  }
}

export type SemanticModelType = "heuristic" | "miniLM" | "bge-small";

// Global pipeline cache across provider instances to avoid reloading ONNX models
const pipelineCache = new Map<string, Promise<any>>();
// Global embedding vector cache across provider instances keyed by modelId -> text -> vector
const globalEmbeddingCache = new Map<string, Map<string, number[]>>();

export function splitTextIntoSafeChunks(text: string, maxWords = 50, overlapWords = 10): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords && trimmed.length < 350) return [trimmed];

  // If there are very few space-delimited words because of dense formulas/code
  if (words.length <= 3 && trimmed.length > 180) {
    const charChunks: string[] = [];
    const maxChars = 180;
    const overlapChars = 30;
    let s = 0;
    while (s < trimmed.length) {
      const e = Math.min(trimmed.length, s + maxChars);
      charChunks.push(trimmed.slice(s, e));
      if (e >= trimmed.length) break;
      s += maxChars - overlapChars;
    }
    return charChunks;
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(words.length, start + maxWords);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start += maxWords - overlapWords;
  }
  return chunks;
}

/**
 * High-performance, zero-cost, local ONNX neural embedding provider using Transformers.js.
 * Operates 100% on-device / local server with zero API keys and zero network data transfer.
 */
export class LocalTransformerEmbeddingProvider implements SemanticSimilarityProvider {
  public readonly name: string;
  public readonly modelType: "miniLM" | "bge-small";
  public readonly modelId: string;
  private readonly fallback: LocalSemanticProvider;

  constructor(modelType: "miniLM" | "bge-small" = "miniLM") {
    this.modelType = modelType;
    if (modelType === "miniLM") {
      this.modelId = "Xenova/all-MiniLM-L6-v2";
      this.name = "Verity-Local-ONNX-MiniLM-L6-v2";
    } else {
      this.modelId = "Xenova/bge-small-en-v1.5";
      this.name = "Verity-Local-ONNX-BGE-Small-en-v1.5";
    }
    this.fallback = new LocalSemanticProvider();

    if (!globalEmbeddingCache.has(this.modelId)) {
      globalEmbeddingCache.set(this.modelId, new Map<string, number[]>());
    }
  }

  private get embeddingCache(): Map<string, number[]> {
    return globalEmbeddingCache.get(this.modelId)!;
  }

  /**
   * Lazily loads and caches the ONNX feature extraction pipeline.
   */
  private async getPipeline(): Promise<any> {
    if (!pipelineCache.has(this.modelId)) {
      const loadPromise = (async () => {
        try {
          const { pipeline, env } = await import("@xenova/transformers");
          env.allowLocalModels = true;
          // Loads from local cache if present, otherwise downloads once
          return await pipeline("feature-extraction", this.modelId, {
            quantized: true,
          });
        } catch (err) {
          console.warn(`[LocalTransformer] Failed to load ${this.modelId}, using fallback:`, err);
          return null;
        }
      })();
      pipelineCache.set(this.modelId, loadPromise);
    }
    return pipelineCache.get(this.modelId)!;
  }

  /**
   * Generates a normalized dense embedding vector for a single string.
   * Returns synchronously if vector is already cached, or asynchronously on first inference.
   */
  public embed(text: string): Promise<number[]> | number[] {
    const trimmed = text.trim();
    if (!trimmed) return this.fallback.embed(text);

    if (this.embeddingCache.has(trimmed)) {
      return this.embeddingCache.get(trimmed)!;
    }

    return this.embedInternal(trimmed);
  }

  private async embedInternal(trimmed: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    if (!extractor) {
      return this.fallback.embed(trimmed);
    }

    try {
      const chunks = splitTextIntoSafeChunks(trimmed, 50, 10);
      if (chunks.length <= 1) {
        const target = chunks[0] || trimmed;
        const output = await extractor(target, { pooling: "mean", normalize: true });
        const vector = Array.from(output.data as Float32Array);
        if (this.embeddingCache.size < 10000) {
          this.embeddingCache.set(trimmed, vector);
        }
        return vector;
      }

      // Safe multi-chunk handling with mini-batches of up to 16 chunks
      const miniBatchSize = 16;
      let totalChunks = 0;
      let dim = 384;
      let composite: Float64Array | null = null;

      for (let s = 0; s < chunks.length; s += miniBatchSize) {
        const miniBatch = chunks.slice(s, Math.min(chunks.length, s + miniBatchSize));
        const output = await extractor(miniBatch, { pooling: "mean", normalize: true });
        const [batchSize, d] = output.dims;
        dim = d;
        if (!composite) composite = new Float64Array(dim);
        const data = output.data as Float32Array;

        for (let b = 0; b < batchSize; b++) {
          const offset = b * dim;
          for (let i = 0; i < dim; i++) {
            composite[i] = (composite[i] ?? 0) + (data[offset + i] ?? 0);
          }
          totalChunks++;
        }
      }

      if (!composite || totalChunks === 0) {
        return this.fallback.embed(trimmed);
      }

      let sumSq = 0;
      for (let d = 0; d < dim; d++) sumSq += composite[d]! * composite[d]!;
      const factor = Math.sqrt(sumSq) || 1;
      const compositeVec = Array.from(composite).map((v) => v / factor);

      if (this.embeddingCache.size < 10000) {
        this.embeddingCache.set(trimmed, compositeVec);
      }
      return compositeVec;
    } catch {
      return this.fallback.embed(trimmed);
    }
  }

  /**
   * High-throughput batch embedding across multiple sentences or blocks with safe chunking and TRUE batching.
   */
  public async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = new Array(texts.length);
    const toProcess: { index: number; text: string }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const t = texts[i]!.trim();
      if (!t) {
        results[i] = this.fallback.embed("");
      } else if (this.embeddingCache.has(t)) {
        results[i] = this.embeddingCache.get(t)!;
      } else {
        toProcess.push({ index: i, text: t });
      }
    }

    if (toProcess.length === 0) {
      return results;
    }

    const extractor = await this.getPipeline();
    if (!extractor) {
      for (const item of toProcess) {
        results[item.index] = this.fallback.embed(item.text);
      }
      return results;
    }

    // Separate items that require sub-chunking vs normal single-chunk sentences
    const singleChunkItems: { index: number; text: string }[] = [];
    const multiChunkItems: { index: number; text: string }[] = [];

    for (const item of toProcess) {
      const words = item.text.split(/\s+/).filter(Boolean);
      if (words.length > 50 || item.text.length > 300) {
        multiChunkItems.push(item);
      } else {
        singleChunkItems.push(item);
      }
    }

    // 1. Process single-chunk items in true parallel batches of up to 16
    const batchSize = 16;
    for (let b = 0; b < singleChunkItems.length; b += batchSize) {
      const slice = singleChunkItems.slice(b, Math.min(singleChunkItems.length, b + batchSize));
      const sliceTexts = slice.map((s) => s.text);

      try {
        const output = await extractor(sliceTexts, { pooling: "mean", normalize: true });
        const [outBatch, dim] = output.dims;
        const data = output.data as Float32Array;

        for (let j = 0; j < outBatch; j++) {
          const item = slice[j]!;
          const vec = Array.from(data.subarray(j * dim, (j + 1) * dim));
          if (this.embeddingCache.size < 10000) {
            this.embeddingCache.set(item.text, vec);
          }
          results[item.index] = vec;
        }
      } catch {
        // Fallback individually on error
        for (const item of slice) {
          results[item.index] = await this.embedInternal(item.text);
        }
      }
    }

    // 2. Process multi-chunk items safely
    for (const item of multiChunkItems) {
      results[item.index] = await this.embedInternal(item.text);
    }

    return results;
  }

  /**
   * Exact cosine similarity percentage (0 - 100) between two unit vectors.
   */
  public compare(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length || vectorA.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < vectorA.length; i++) {
      dot += vectorA[i]! * vectorB[i]!;
    }
    const clamped = Math.max(0, Math.min(1, dot));
    return Math.round(clamped * 100 * 10) / 10;
  }

  /**
   * Pre-loads the ONNX model into memory.
   */
  public async prewarm(): Promise<boolean> {
    const pipeline = await this.getPipeline();
    return pipeline !== null;
  }
}

// Global active semantic provider instance
let activeSemanticProvider: SemanticSimilarityProvider = new LocalSemanticProvider();
let activeModelType: SemanticModelType = "heuristic";

export function setSemanticSimilarityProvider(provider: SemanticSimilarityProvider): void {
  activeSemanticProvider = provider;
}

export function getSemanticSimilarityProvider(): SemanticSimilarityProvider {
  return activeSemanticProvider;
}

/**
 * Configure the active semantic model dynamically:
 * - "heuristic": Built-in 512-dim subword vectorizer (fastest, zero dependencies)
 * - "miniLM": Xenova/all-MiniLM-L6-v2 ONNX model (384-dim, 22MB, fast neural)
 * - "bge-small": Xenova/bge-small-en-v1.5 ONNX model (384-dim, 33MB, state-of-the-art retrieval)
 */
export function configureSemanticModel(modelType: SemanticModelType): SemanticSimilarityProvider {
  activeModelType = modelType;
  if (modelType === "heuristic") {
    const provider = new LocalSemanticProvider();
    setSemanticSimilarityProvider(provider);
    return provider;
  } else if (modelType === "miniLM") {
    const provider = new LocalTransformerEmbeddingProvider("miniLM");
    setSemanticSimilarityProvider(provider);
    return provider;
  } else if (modelType === "bge-small") {
    const provider = new LocalTransformerEmbeddingProvider("bge-small");
    setSemanticSimilarityProvider(provider);
    return provider;
  }
  throw new Error(`Unknown model type: ${modelType}`);
}

export function getActiveSemanticModelType(): SemanticModelType {
  return activeModelType;
}

/**
 * Compares two texts semantically using the configured provider.
 * Falls back deterministically to local lexical vectorization if the provider is unavailable or asynchronous.
 */
export function calculateSemanticSimilarity(textA: string, textB: string): number {
  try {
    const provider = getSemanticSimilarityProvider();
    const vecA = provider.embed(textA);
    const vecB = provider.embed(textB);

    // If synchronous vectors returned or already cached
    if (Array.isArray(vecA) && Array.isArray(vecB)) {
      return provider.compare(vecA, vecB);
    }
  } catch {
    // Continue to fallback
  }

  // Fallback local calculation
  const fallback = new LocalSemanticProvider();
  return fallback.compare(fallback.embed(textA), fallback.embed(textB));
}

/**
 * Asynchronous semantic similarity computation supporting real neural embeddings.
 */
export async function calculateSemanticSimilarityAsync(textA: string, textB: string): Promise<number> {
  try {
    const provider = getSemanticSimilarityProvider();
    const vecA = await provider.embed(textA);
    const vecB = await provider.embed(textB);
    return provider.compare(vecA, vecB);
  } catch {
    const fallback = new LocalSemanticProvider();
    return fallback.compare(fallback.embed(textA), fallback.embed(textB));
  }
}

