import {
  AutoConfig,
  type FeatureExtractionPipeline,
  pipeline,
  type Tensor,
} from '@huggingface/transformers';

import { DEFAULT_EMBEDDING_MODEL } from '../constants.js';

let extractor: FeatureExtractionPipeline | null = null;
let currentModel: string | null = null;
let cachedDimension: number | null = null;

export function getEmbeddingModel(): string {
  return process.env.ECHOES_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
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

async function getExtractor(model: string): Promise<FeatureExtractionPipeline> {
  if (extractor && currentModel === model) {
    return extractor;
  }

  extractor = await pipeline('feature-extraction', model, { dtype: 'fp32' });
  currentModel = model;

  // Cache dimension when loading model
  const config = await AutoConfig.from_pretrained(model);
  // @ts-expect-error hidden_size exists on transformer configs
  cachedDimension = config.hidden_size as number;

  return extractor;
}

export async function preloadModel(model?: string): Promise<void> {
  const m = model ?? getEmbeddingModel();
  await getExtractor(m);
}

export async function generateEmbedding(text: string, model?: string): Promise<number[]> {
  const m = model ?? getEmbeddingModel();
  const ext = await getExtractor(m);
  const output = (await ext(text, { pooling: 'mean', normalize: true })) as Tensor;
  return Array.from(output.data as Float32Array);
}

export async function generateEmbeddings(texts: string[], model?: string): Promise<number[][]> {
  if (texts.length === 0) return [];

  const m = model ?? getEmbeddingModel();
  const ext = await getExtractor(m);
  const output = (await ext(texts, { pooling: 'mean', normalize: true })) as Tensor;
  const data = output.data as Float32Array;
  const dim = output.dims[1];

  return texts.map((_, i) => Array.from(data.slice(i * dim, (i + 1) * dim)));
}

export function resetExtractor(): void {
  extractor = null;
  currentModel = null;
  cachedDimension = null;
}
