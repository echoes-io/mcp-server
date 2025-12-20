import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

export interface TimelineContext {
  timeline: string;
  contentPath: string;
  mode: 'single-timeline' | 'multi-timeline' | 'test';
}

/**
 * Auto-detect timeline and content path based on current working directory
 */
export function detectTimelineContext(cwd: string = process.cwd()): TimelineContext {
  const currentDir = basename(cwd);

  // Single Timeline Mode: timeline-* directory
  if (currentDir.startsWith('timeline-')) {
    const timeline = currentDir.replace('timeline-', '');
    const contentPath = resolve(cwd, 'content');

    console.error(`[DEBUG] Mode: single-timeline "${timeline}"`);
    return {
      timeline,
      contentPath,
      mode: 'single-timeline',
    };
  }

  // Multi-Timeline Mode: .github directory
  if (currentDir === '.github') {
    const parentDir = dirname(cwd);
    console.error(`[DEBUG] Mode: multi-timeline (scanning ${parentDir})`);

    // For multi-timeline, we need the timeline parameter
    throw new Error('Multi-timeline mode requires explicit timeline parameter');
  }

  // Test Mode: mcp-server directory
  if (currentDir === 'mcp-server') {
    console.error('[DEBUG] Mode: test from mcp-server (in-memory)');
    return {
      timeline: 'test',
      contentPath: resolve(cwd, 'test/fixtures'),
      mode: 'test',
    };
  }

  // Fallback: try to find timeline-* in parent directories
  let searchDir = cwd;
  for (let i = 0; i < 5; i++) {
    const dirName = basename(searchDir);
    if (dirName.startsWith('timeline-')) {
      const timeline = dirName.replace('timeline-', '');
      const contentPath = resolve(searchDir, 'content');

      console.error(`[DEBUG] Mode: single-timeline "${timeline}" (found in parent)`);
      return {
        timeline,
        contentPath,
        mode: 'single-timeline',
      };
    }

    const parent = dirname(searchDir);
    if (parent === searchDir) break; // reached root
    searchDir = parent;
  }

  throw new Error(
    'Could not detect timeline context. Run from:\n' +
      '  - timeline-* directory (single timeline mode)\n' +
      '  - .github directory (multi-timeline mode)\n' +
      '  - mcp-server directory (test mode)\n' +
      'Or provide explicit timeline parameter',
  );
}

/**
 * Get timeline context with optional override
 */
export function getTimelineContext(
  timelineOverride?: string,
  contentPathOverride?: string,
): TimelineContext {
  if (timelineOverride && contentPathOverride) {
    return {
      timeline: timelineOverride,
      contentPath: contentPathOverride,
      mode: 'single-timeline',
    };
  }

  const detected = detectTimelineContext();

  return {
    timeline: timelineOverride || detected.timeline,
    contentPath: contentPathOverride || detected.contentPath,
    mode: detected.mode,
  };
}
