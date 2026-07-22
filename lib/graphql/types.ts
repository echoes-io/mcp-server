export type MageJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
export type MageImageType = 'scene' | 'chapter' | 'character';
export type MageMediaType = 'image' | 'video';

export interface MageJob {
  id: string;
  prompt: string;
  imageType: MageImageType;
  arc: string;
  episode?: string;
  number?: number;
  variant?: string;
  mediaType: MageMediaType;
  status: MageJobStatus;
  s3Key?: string;
  s3Uploaded?: boolean;
  gitCommitted?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface QueueMageImageResponse {
  queueMageImage: MageJob;
}

export interface ListMageJobsResponse {
  listMageJobs: {
    items: MageJob[];
  };
}

export interface PauseMageQueueResponse {
  pauseMageQueue: { success: boolean; message: string };
}

export interface ResumeMageQueueResponse {
  resumeMageQueue: { success: boolean; message: string };
}

export interface CancelMageJobResponse {
  cancelMageJob: { id: string; status: MageJobStatus };
}

export interface SaveMageResultResponse {
  saveMageResult: { id: string; s3Key: string; s3Uploaded: boolean };
}

export interface CommitMageImagesResponse {
  commitMageImages: {
    commits: Array<{ repo: string; sha: string; filesCount: number }>;
  };
}

export interface MageConfig {
  queuePaused: boolean;
  queueSize: number;
  currentJob?: {
    id: string;
    prompt: string;
    arc: string;
    status: MageJobStatus;
  };
  circuitBreaker: {
    open: boolean;
    failures: number;
    lastFailure?: string;
  };
  deployment: {
    lastDiscover?: string;
  };
}

export interface GetMageConfigResponse {
  getMageConfig: MageConfig;
}

export interface MageCharacter {
  placeholder: string;
  username: string;
  timeline: string;
  arc: string;
}

export interface ListMageCharactersResponse {
  listMageCharacters: {
    items: MageCharacter[];
  };
}
