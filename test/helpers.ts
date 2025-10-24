export function setTestTimeline(timeline = 'test-timeline') {
  process.env.ECHOES_TIMELINE = timeline;
}

export function clearTestTimeline() {
  delete process.env.ECHOES_TIMELINE;
}
