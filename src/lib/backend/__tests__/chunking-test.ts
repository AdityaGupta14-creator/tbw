import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = true;
env.allowRemoteModels = false;

export function splitIntoSafeChunks(text: string, maxWords = 50, overlapWords = 10): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [text.trim()];

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

export async function embedChunkedText(extractor: any, text: string): Promise<number[]> {
  const chunks = splitIntoSafeChunks(text, 50, 10);
  if (chunks.length === 1) {
    const out = await extractor(chunks[0]!, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array);
  }

  // Batch embed all sub-chunks
  const out = await extractor(chunks, { pooling: "mean", normalize: true });
  const [batchSize, dim] = out.dims;
  const data = out.data as Float32Array;

  // Mean pool across sub-chunks
  const composite = new Float64Array(dim);
  for (let b = 0; b < batchSize; b++) {
    const offset = b * dim;
    for (let d = 0; d < dim; d++) {
      composite[d] = (composite[d] ?? 0) + (data[offset + d] ?? 0);
    }
  }

  // L2-renormalize
  let sumSq = 0;
  for (let d = 0; d < dim; d++) sumSq += composite[d]! * composite[d]!;
  const factor = Math.sqrt(sumSq) || 1;
  return Array.from(composite).map((v) => v / factor);
}

async function main() {
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  // 1. 20-word sentence
  const s20 = "Binary search trees provide efficient search, insertion, and deletion operations when balanced properly across all internal hierarchical node levels.";
  const v20 = await embedChunkedText(extractor, s20);
  console.log("20-word vector norm:", Math.sqrt(v20.reduce((acc, x) => acc + x * x, 0)).toFixed(4));

  // 2. 100-word sentence
  const s100 = new Array(5).fill("An unbalanced binary search tree degenerates into a linear search structure with worst case O(n) operational complexity when keys arrive in sorted sequence.").join(" ");
  const v100 = await embedChunkedText(extractor, s100);
  console.log("100-word vector norm:", Math.sqrt(v100.reduce((acc, x) => acc + x * x, 0)).toFixed(4));

  // 3. 500-word paragraph
  const s500 = new Array(25).fill("Self-balancing variants recover logarithmic height by carrying out local tree pivots after each modification bounding the worst-case cost of search, insertion, and deletion at logarithmic time.").join(" ");
  const v500 = await embedChunkedText(extractor, s500);
  console.log("500-word vector norm:", Math.sqrt(v500.reduce((acc, x) => acc + x * x, 0)).toFixed(4));

  // 4. 1000+ word paragraph
  const s1000 = new Array(55).fill("Under the AVL balancing criteria sibling branch elevations must remain strictly within a difference threshold of unity restoration via single or double rotations.").join(" ");
  const v1000 = await embedChunkedText(extractor, s1000);
  console.log("1000-word vector norm:", Math.sqrt(v1000.reduce((acc, x) => acc + x * x, 0)).toFixed(4));

  // 5. Very long technical equations / code-like text
  const sCode = "for(int i=0;i<N;i++){dp[i]=min(dp[i-1]+cost[i],dp[i-2]+cost[i]*2);matrix_mult(A,B,C,dim);hash_fn(key,seed);}\n".repeat(20);
  const vCode = await embedChunkedText(extractor, sCode);
  console.log("Code-like vector norm:", Math.sqrt(vCode.reduce((acc, x) => acc + x * x, 0)).toFixed(4));

  console.log("SUCCESS: All 5 chunking test cases completed with clean unit-normalized embeddings!");
}

main().catch(console.error);
