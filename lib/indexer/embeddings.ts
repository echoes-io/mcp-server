import {
  AutoConfig,
  type FeatureExtractionPipeline,
  pipeline,
  type Tensor,
} from '@huggingface/transformers';

import { DEFAULT_EMBEDDING_MODEL } from '../constants.js';

type DType = 'fp32' | 'fp16' | 'q8' | 'q4';

let extractor: FeatureExtractionPipeline | null = null;
let currentModel: string | null = null;
let currentDtype: DType | null = null;
let cachedDimension: number | null = null;

export function getEmbeddingModel(): string {
  return process.env.ECHOES_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingDtype(): DType {
  return (process.env.ECHOES_EMBEDDING_DTYPE as DType) ?? 'fp32';
}

export async function getEmbeddingDimension(model?: string): Promise<number> {
  const m = model ?? getEmbeddingModel();

  if (cachedDimension && currentModel === m) {
    return cachedDimension;
  }

  const config = await AutoConfig.from_pretrained(m);
  // @ts-expect-error hidden_size exists on transformer configs
  return config.hidden_size as number;
}

async function getExtractor(model: string, dtype: DType): Promise<FeatureExtractionPipeline> {
  if (extractor && currentModel === model && currentDtype === dtype) {
    return extractor;
  }

  extractor = await pipeline('feature-extraction', model, { dtype });
  currentModel = model;
  currentDtype = dtype;

  // Cache dimension when loading model
  const config = await AutoConfig.from_pretrained(model);
  // @ts-expect-error hidden_size exists on transformer configs
  cachedDimension = config.hidden_size as number;

  return extractor;
}

export async function preloadModel(model?: string, dtype?: DType): Promise<void> {
  const m = model ?? getEmbeddingModel();
  const d = dtype ?? getEmbeddingDtype();
  await getExtractor(m, d);
}

export async function generateEmbedding(
  text: string,
  model?: string,
  dtype?: DType,
): Promise<number[]> {
  const m = model ?? getEmbeddingModel();
  const d = dtype ?? getEmbeddingDtype();
  const ext = await getExtractor(m, d);
  const output = (await ext(text, { pooling: 'mean', normalize: true })) as Tensor;
  return Array.from(output.data as Float32Array);
}

export async function generateEmbeddings(
  texts: string[],
  model?: string,
  dtype?: DType,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const m = model ?? getEmbeddingModel();
  const d = dtype ?? getEmbeddingDtype();
  const ext = await getExtractor(m, d);
  const output = (await ext(texts, { pooling: 'mean', normalize: true })) as Tensor;
  const data = output.data as Float32Array;
  const dim = output.dims[1];

  return texts.map((_, i) => Array.from(data.slice(i * dim, (i + 1) * dim)));
}

export function resetExtractor(): void {
  extractor = null;
  currentModel = null;
  currentDtype = null;
  cachedDimension = null;
}
