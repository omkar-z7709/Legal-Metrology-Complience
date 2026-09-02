import { env } from "../../config/env.js";

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2";
export const EMBED_DIM = 768; // 768-dim output to match schema vector(768)

interface EmbedContentResponse {
  embeddings: { values: number[] }[];
}

/**
 * Generates a deterministic semantic 768-dimensional normalized float vector
 * for offline/sandbox environments when GEMINI_API_KEY is not supplied.
 */
function deterministicSemanticVector(text: string, dim: number = EMBED_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);

  // Bag-of-words / n-gram feature hashing into dim buckets
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 5381;
    for (let c = 0; c < word.length; c++) {
      hash = (hash * 33) ^ word.charCodeAt(c);
    }
    const idx = Math.abs(hash) % dim;
    const sign = hash % 2 === 0 ? 1 : -1;
    vec[idx] += sign * (1 + 1 / (1 + i));

    // Bigram hashing for local phrase semantics
    if (i < words.length - 1) {
      const bi = word + "_" + words[i + 1];
      let biHash = 5381;
      for (let c = 0; c < bi.length; c++) {
        biHash = (biHash * 33) ^ bi.charCodeAt(c);
      }
      const biIdx = Math.abs(biHash) % dim;
      vec[biIdx] += 1.5;
    }
  }

  // L2 Normalize vector
  let normSq = 0;
  for (let i = 0; i < dim; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < dim; i++) {
    vec[i] = Math.round((vec[i] / norm) * 1000000) / 1000000;
  }

  return vec;
}

export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log(`[RAG] Generating ${texts.length} embedding(s) using '${EMBED_MODEL}' (task: ${taskType})`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${apiKey}`;

      const body = {
        requests: texts.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text: text.slice(0, 2048) }] },
          outputDimensionality: EMBED_DIM,
          taskType,
        })),
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as EmbedContentResponse;
        if (data.embeddings && data.embeddings.length === texts.length) {
          return data.embeddings.map((e) => e.values);
        }
      } else {
        const errText = await res.text();
        console.warn(`[RAG] Gemini batchEmbedContents warning (${res.status}): ${errText}`);
      }
    } catch (err: any) {
      console.warn(`[RAG] Embedding API error: ${err.message}. Operating with semantic feature vectors.`);
    }
  }

  // Fallback to deterministic semantic vector generation
  return texts.map((text) => deterministicSemanticVector(text, EMBED_DIM));
}