export function getTimeline(): string {
  const timeline = process.env.ECHOES_TIMELINE;
  if (!timeline) {
    throw new Error('ECHOES_TIMELINE environment variable is not set');
  }
  return timeline;
}
