import { config } from 'dotenv';

export interface AppConfig {
  publisherApiUrl: string;
  publisherApiKey: string;
  timeline: string | undefined;
}

/**
 * Detects the timeline name from the current working directory path.
 * Matches `timeline-<name>` in the path (e.g., `/home/user/timeline-eros/` → `eros`).
 */
export function detectTimeline(cwd: string): string | undefined {
  const match = cwd.match(/timeline-([\w-]+)/);
  return match?.[1];
}

/**
 * Loads configuration from .env (without overriding existing env vars)
 * and validates that required variables are present.
 *
 * @throws {Error} if required env vars are missing.
 */
export function loadConfig(): AppConfig {
  // Load .env from cwd without overriding existing env vars
  config();

  const publisherApiUrl = process.env.PUBLISHER_API_URL;
  const publisherApiKey = process.env.PUBLISHER_API_KEY;

  const missing: string[] = [];
  if (!publisherApiUrl) missing.push('PUBLISHER_API_URL');
  if (!publisherApiKey) missing.push('PUBLISHER_API_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Add them to a .env file in the timeline repo root or pass them in the MCP config.',
    );
  }

  return {
    publisherApiUrl: publisherApiUrl as string,
    publisherApiKey: publisherApiKey as string,
    timeline: detectTimeline(process.cwd()),
  };
}
