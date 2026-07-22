// --- Mutations ---

export const QUEUE_MAGE_IMAGE = `
  mutation QueueMageImage($input: MageImageInput!) {
    queueMageImage(input: $input) {
      id
      prompt
      resolvedPrompt
      imageType
      mediaType
      arc
      folder
      number
      variant
      status
      position
      createdAt
    }
  }
`;

export const PAUSE_MAGE_QUEUE = `
  mutation PauseMageQueue {
    pauseMageQueue
  }
`;

export const RESUME_MAGE_QUEUE = `
  mutation ResumeMageQueue {
    resumeMageQueue
  }
`;

export const CANCEL_MAGE_JOB = `
  mutation CancelMageJob($id: ID!) {
    cancelMageJob(id: $id) {
      id
      status
    }
  }
`;

export const SAVE_MAGE_RESULT = `
  mutation SaveMageResult($id: ID!) {
    saveMageResult(id: $id) {
      id
      s3Key
      s3Uploaded
    }
  }
`;

export const COMMIT_MAGE_IMAGES = `
  mutation CommitMageImages($message: String) {
    commitMageImages(message: $message) {
      repo
      sha
      filesCommitted
      message
    }
  }
`;

// --- Queries ---

export const LIST_MAGE_JOBS = `
  query ListMageJobs($status: MageStatus, $limit: Int) {
    listMageJobs(status: $status, limit: $limit) {
      id
      prompt
      resolvedPrompt
      imageType
      mediaType
      arc
      folder
      number
      variant
      status
      position
      imageUrl
      s3Key
      s3Uploaded
      gitCommitted
      gitCommitSha
      error
      createdAt
      completedAt
    }
  }
`;

export const GET_MAGE_CONFIG = `
  query GetMageConfig {
    getMageConfig {
      isPaused
      deployment {
        id
        submitActionId
        pollActionId
        searchActionId
        discoveredAt
      }
      settings {
        modelId
        architecture
        resolution
        aspectRatio
        fastMode
      }
      auth {
        hasSession
        hasAuthToken
        sessionExpiresAt
        authTokenExpiresAt
      }
    }
  }
`;

export const LIST_MAGE_CHARACTERS = `
  query ListMageCharacters {
    listMageCharacters {
      id
      name
      username
      imageUrl
      timeline
      arc
      placeholder
    }
  }
`;
