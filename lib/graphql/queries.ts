// --- Mutations ---

export const QUEUE_MAGE_IMAGE = `
  mutation QueueMageImage($input: QueueMageImageInput!) {
    queueMageImage(input: $input) {
      id
      prompt
      imageType
      arc
      episode
      number
      variant
      mediaType
      status
      createdAt
    }
  }
`;

export const PAUSE_MAGE_QUEUE = `
  mutation PauseMageQueue {
    pauseMageQueue {
      success
      message
    }
  }
`;

export const RESUME_MAGE_QUEUE = `
  mutation ResumeMageQueue {
    resumeMageQueue {
      success
      message
    }
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
      commits {
        repo
        sha
        filesCount
      }
    }
  }
`;

// --- Queries ---

export const LIST_MAGE_JOBS = `
  query ListMageJobs($status: MageJobStatus, $limit: Int) {
    listMageJobs(status: $status, limit: $limit) {
      items {
        id
        prompt
        imageType
        arc
        episode
        number
        variant
        mediaType
        status
        s3Key
        s3Uploaded
        gitCommitted
        createdAt
        completedAt
      }
    }
  }
`;

export const GET_MAGE_CONFIG = `
  query GetMageConfig {
    getMageConfig {
      queuePaused
      queueSize
      currentJob {
        id
        prompt
        arc
        status
      }
      circuitBreaker {
        open
        failures
        lastFailure
      }
      deployment {
        lastDiscover
      }
    }
  }
`;

export const LIST_MAGE_CHARACTERS = `
  query ListMageCharacters {
    listMageCharacters {
      items {
        placeholder
        username
        timeline
        arc
      }
    }
  }
`;
