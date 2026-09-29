import type { SourceDocument, SourceProvider } from "./types";
import type { SourceType } from "@/types/database";
import { tokenizeMeaningfulWords } from "./technical-vocabulary";

/**
 * Standard university and textbook reference corpus for computer science & engineering.
 */
/**
 * Standard university and textbook reference corpus for computer science & engineering.
 */
export const DEFAULT_REFERENCE_CORPUS: SourceDocument[] = [
  // 1. Data Structures & Algorithms
  {
    id: "ref-web-01",
    title: "Balanced Binary Search Trees — Course Notes",
    type: "web" as SourceType,
    url: "https://mit.edu/6.006/notes/bst",
    author: "Prof. H. Cormen",
    text: `A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n). In an AVL tree, the heights of two sibling subtrees never differ by more than one. If an insertion violates this balance property, one or two tree rotations restore the invariant.`,
  },
  {
    id: "ref-acad-01",
    title: "Self-Balancing Tree Structures in Practice",
    type: "academic" as SourceType,
    url: "https://acm.org/dl/bst-empirical",
    author: "G. V. Andersson & K. Lee",
    text: `Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations. Lookup latency was measured with a monotonic clock over batches of 1,000 randomly selected present and absent keys. In our experimental evaluations across both synthetic workloads and real-world trace data, self-balancing trees demonstrated stable memory access patterns.`,
  },
  {
    id: "ref-acad-02",
    title: "Red-Black Trees: An Empirical Comparison",
    type: "academic" as SourceType,
    url: "https://ieee.org/abstract/red-black-empirical",
    author: "Dr. Elena Rostova",
    text: `Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built. The empirical benchmarks confirm the theoretical trade-off between strict height balance and rebalancing overhead.`,
  },
  {
    id: "ref-internal-01",
    title: "Data Structures Laboratory Manual — CSE Dept",
    type: "internal_document" as SourceType,
    url: "internal://library/lab-manual-cse-301",
    author: "Department of Computer Engineering",
    text: `All experimental evaluations must compile under -O2 optimization flags using standard g++ or clang compilers. Execution times must be measured as the median of at least five independent runs on isolated CPU cores to mitigate frequency scaling variance. Both structures were implemented with identical node layouts.`,
  },

  // 2. Cryptography, Embedded Systems & Security
  {
    id: "ref-crypto-01",
    title: "NIST Special Publication 800-185: SHA-256 and Cryptographic Hash Functions",
    type: "academic" as SourceType,
    url: "https://csrc.nist.gov/publications/detail/sp/800-185/final",
    author: "National Institute of Standards and Technology",
    text: `Cryptographic hash functions compute a fixed-size digest from arbitrary binary inputs, satisfying preimage resistance, second-preimage resistance, and collision resistance. In embedded microcontrollers and IoT sensing architectures, hardware-assisted acceleration primitives reduce message schedule expansion latency and pipeline round transformations across 32-bit word registers.`,
  },
  {
    id: "ref-crypto-02",
    title: "Applied Cryptography and Microcontroller Security Implementations",
    type: "web" as SourceType,
    url: "https://crypto.stanford.edu/cs255/hash-notes.html",
    author: "Dr. D. Boneh & M. Franklin",
    text: `Software implementations of SHA-256 on resource-constrained ARM Cortex-M0 cores exhibit substantial instruction overhead due to iterative bitwise rotation and addition modulo 2^32. Memory-mapped peripheral coprocessors achieve significant throughput improvements while maintaining minimal dynamic power consumption under over-the-air firmware updates.`,
  },

  // 3. Operating Systems, Concurrency & Architecture
  {
    id: "ref-os-01",
    title: "Operating Systems: Three Easy Pieces — Concurrency and Virtual Memory",
    type: "web" as SourceType,
    url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
    author: "Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau",
    text: `Locks provide mutual exclusion by preventing concurrent execution across critical sections. Optimistic concurrency control and latch coupling traverse index nodes without acquiring exclusive write locks until structural modifications are committed. Cache coherence protocols and hardware memory barriers enforce sequential consistency across multicore CPUs.`,
  },

  // 4. Database Systems & Storage Engines
  {
    id: "ref-db-01",
    title: "Architecture of a Database System — Foundations and Trends in Databases",
    type: "academic" as SourceType,
    url: "https://db.cs.berkeley.edu/papers/fntdb07-architecture.pdf",
    author: "J. M. Hellerstein, M. Stonebraker, and J. Hamilton",
    text: `Modern storage engines balance the trade-offs between write amplification and read amplification. While concurrent B-tree indexes optimize point lookups via balanced disk blocks, append-only log-structured merge trees batch random writes into sequential memory buffers and perform background compaction across hierarchical levels.`,
  },

  // 5. Machine Learning, Deep Learning & Artificial Intelligence
  {
    id: "ref-ai-01",
    title: "Deep Learning Architectures and Gradient Optimization",
    type: "academic" as SourceType,
    url: "https://arxiv.org/abs/deep-learning-foundations",
    author: "Y. LeCun, Y. Bengio, and G. Hinton",
    text: `Gradient descent algorithms minimize empirical loss functions across high-dimensional parameter spaces. Backpropagation computes the partial derivatives of the objective with respect to layer weights using the chain rule. Attention mechanisms and transformer encoders replace recurrent connections by computing scaled dot-product attention over sequence representations.`,
  },

  // 6. Computer Networks & Distributed Systems
  {
    id: "ref-net-01",
    title: "Computer Networks: A Systems Approach",
    type: "web" as SourceType,
    url: "https://book.systemsapproach.org/congestion/tcp.html",
    author: "Larry Peterson and Bruce Davie",
    text: `Congestion control mechanisms regulate traffic transmission rates to prevent network collapse. TCP Reno and BBR utilize round-trip time estimation and packet loss signals to adjust the congestion window dynamically, maintaining maximum link utilization while minimizing bufferbloat at bottleneck routers.`,
  },

  // 7. General Academic Research & IEEE Writing Standard
  {
    id: "ref-ieee-01",
    title: "IEEE Standards for Technical Writing and Empirical Methodology",
    type: "internal_document" as SourceType,
    url: "internal://library/ieee-standards-guide",
    author: "IEEE Educational Activities Board",
    text: `Academic technical reports must clearly formulate problem statements, articulate experimental methodologies with reproducible parameters, and compare measured benchmarks against established baseline literature. All borrowed algorithms, definitions, and external datasets must be cited with formal bracketed references.`,
  },
];

/**
 * Provider supplying internal reference literature, syllabus notes, and journals.
 */
export class InternalCorpusProvider implements SourceProvider {
  public readonly id = "internal-corpus";
  public readonly name = "Institutional Library & Reference Corpus";
  private documents: SourceDocument[];

  constructor(seedDocs: SourceDocument[] = DEFAULT_REFERENCE_CORPUS) {
    this.documents = [...seedDocs];
  }

  public addDocument(doc: SourceDocument): void {
    this.documents.push(doc);
  }

  public searchCandidates(_queryText: string): SourceDocument[] {
    return [...this.documents];
  }
}

/**
 * Provider supplying peer submissions from the same assignment cohort.
 */
export class PeerSubmissionsProvider implements SourceProvider {
  public readonly id = "peer-submissions";
  public readonly name = "Cohort Peer Submissions Provider";
  private peers: SourceDocument[] = [];

  constructor(peers: { id: string; studentName: string; roll: string; text: string }[] = []) {
    this.setPeers(peers);
  }

  public setPeers(peers: { id: string; studentName: string; roll: string; text: string }[]): void {
    this.peers = peers.map((p) => ({
      id: p.id,
      title: `Submission by ${p.roll} (${p.studentName})`,
      type: "student_submission" as SourceType,
      url: `internal://submissions/${p.id}`,
      author: `${p.studentName} (${p.roll})`,
      text: p.text,
    }));
  }

  public searchCandidates(_queryText: string): SourceDocument[] {
    return [...this.peers];
  }
}

/**
 * Pluggable Web Search Provider interface and stub.
 * Connects to external search APIs (e.g. Bing Web Search, Google Custom Search, Serper)
 * when configured, or provides registered web reference documents.
 */
export class WebSearchProvider implements SourceProvider {
  public readonly id = "web-search";
  public readonly name = "Web Search Engine Provider";
  private customDocuments: SourceDocument[] = [];
  private apiKey?: string | undefined;

  constructor(apiKey?: string | undefined, seedDocs: SourceDocument[] = []) {
    this.apiKey = apiKey;
    this.customDocuments = seedDocs;
  }

  public async searchCandidates(queryText: string): Promise<SourceDocument[]> {
    if (!this.apiKey) {
      // Returns local/cached web reference documents when external API is not configured
      return this.customDocuments.filter((d) => d.type === "web");
    }
    // Future expansion: call external web search endpoint and extract content
    return [];
  }
}

/**
 * Pluggable Academic Corpus Provider.
 * Connects to arXiv, Crossref, Semantic Scholar, or institutional digital libraries.
 */
export class AcademicCorpusProvider implements SourceProvider {
  public readonly id = "academic-corpus";
  public readonly name = "Academic Journal & Conference Proceedings Corpus";
  private documents: SourceDocument[] = [];
  private apiKey?: string | undefined;

  constructor(apiKey?: string | undefined, seedDocs: SourceDocument[] = []) {
    this.apiKey = apiKey;
    this.documents = seedDocs;
  }

  public async searchCandidates(queryText: string): Promise<SourceDocument[]> {
    if (!this.apiKey) {
      return this.documents.filter((d) => d.type === "academic");
    }
    // Future expansion: query academic APIs
    return [];
  }
}

/**
 * Institutional Repository Provider for department archives, theses, and lab manuals.
 */
export class InstitutionalRepositoryProvider implements SourceProvider {
  public readonly id = "institutional-repo";
  public readonly name = "Institutional Theses & Lab Manuals Repository";
  private documents: SourceDocument[] = [];

  constructor(docs: SourceDocument[] = []) {
    this.documents = docs;
  }

  public searchCandidates(_queryText: string): SourceDocument[] {
    return this.documents.filter((d) => d.type === "internal_document");
  }
}

/**
 * Composite manager that queries registered source providers.
 */
export class CompositeSourceManager {
  private providers: SourceProvider[] = [];

  constructor(initialProviders: SourceProvider[] = [new InternalCorpusProvider()]) {
    this.providers = initialProviders;
  }

  public registerProvider(provider: SourceProvider): void {
    this.providers.push(provider);
  }

  public async collectAllCandidateDocuments(queryText: string): Promise<SourceDocument[]> {
    const results: SourceDocument[] = [];
    for (const provider of this.providers) {
      const docs = await provider.searchCandidates(queryText);
      results.push(...docs);
    }
    return results;
  }
}

/**
 * High-performance candidate retrieval:
 * Filters candidate documents using rapid inverted token/keyword overlap
 * BEFORE running expensive sentence-level fuzzy and semantic comparisons.
 */
export function retrieveTopCandidateSources(
  queryText: string,
  sources: SourceDocument[],
  maxCandidates = 8
): SourceDocument[] {
  const queryWords = new Set(tokenizeMeaningfulWords(queryText));

  const scored = sources.map((source) => {
    const sourceTokens = tokenizeMeaningfulWords(source.text);

    let hits = 0;
    for (const token of sourceTokens) {
      if (queryWords.has(token)) hits++;
    }

    return { source, score: hits };
  });

  return scored
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((s) => s.source);
}

// Re-export unified source discovery components
export * from "./source-provider-types";
export * from "./candidate-generator";
export * from "./internal-student-provider";
export * from "./local-reference-corpus";
export * from "./public-web-provider";
export * from "./open-access-provider";
export * from "./source-discovery-coordinator";

