export type MageStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';

export interface MageCharacterRef {
  id: string;
  name: string;
  username: string;
  imageUrl: string;
}

export interface MageJob {
  id: string;
  prompt: string;
  resolvedPrompt?: string;
  imageType: string;
  mediaType?: string;
  arc: string;
  folder?: string;
  number?: number;
  variant?: string;
  characters?: MageCharacterRef[];
  status: MageStatus;
  position?: number;
  historyId?: string;
  imageUrl?: string;
  s3Key?: string;
  width?: number;
  height?: number;
  seed?: number;
  duration?: number;
  error?: string;
  s3Uploaded?: boolean;
  gitCommitted?: boolean;
  gitCommitSha?: string;
  createdAt: string;
  completedAt?: string;
}

export interface MageCharacter {
  id: string;
  name: string;
  username: string;
  imageUrl: string;
  timeline?: string;
  arc?: string;
  placeholder?: string;
}

export interface MageDeployment {
  id?: string;
  submitActionId?: string;
  pollActionId?: string;
  searchActionId?: string;
  discoveredAt?: string;
}

export interface MageSettings {
  modelId: string;
  architecture: string;
  resolution: string;
  aspectRatio: string;
  fastMode: boolean;
}

export interface MageAuthStatus {
  hasSession: boolean;
  hasAuthToken: boolean;
  sessionExpiresAt?: string;
  authTokenExpiresAt?: string;
  uid?: string;
}

export interface MageConfig {
  isPaused: boolean;
  deployment?: MageDeployment;
  settings?: MageSettings;
  auth?: MageAuthStatus;
}

export interface CommitResult {
  repo: string;
  sha: string;
  filesCommitted: number;
  message: string;
}

// --- Query responses ---

export interface MageJobConnection {
  items: MageJob[];
  nextToken?: string;
}

export interface ListMageJobsResponse {
  listMageJobs: MageJobConnection;
}

export interface ListMageCharactersResponse {
  listMageCharacters: MageCharacter[];
}

export interface GetMageConfigResponse {
  getMageConfig: MageConfig;
}

// --- Mutation responses ---

export interface QueueMageImageResponse {
  queueMageImage: MageJob;
}

export interface CancelMageJobResponse {
  cancelMageJob: MageJob;
}

export interface SaveMageResultResponse {
  saveMageResult: MageJob;
}

export interface CommitMageImagesResponse {
  commitMageImages: CommitResult[];
}

export interface PauseMageQueueResponse {
  pauseMageQueue: boolean;
}

export interface ResumeMageQueueResponse {
  resumeMageQueue: boolean;
}
