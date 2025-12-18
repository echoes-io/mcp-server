import { defineRelations } from 'drizzle-orm';

import { arcs, chapters, embeddings, episodes, timelines } from './schema.js';

export const relations = defineRelations(
  {
    timelines,
    arcs,
    episodes,
    chapters,
    embeddings,
  },
  (r) => ({
    timelines: {
      arcs: r.many.arcs({
        from: r.timelines.id,
        to: r.arcs.timelineId,
      }),
    },
    arcs: {
      timeline: r.one.timelines({
        from: r.arcs.timelineId,
        to: r.timelines.id,
      }),
      episodes: r.many.episodes({
        from: r.arcs.id,
        to: r.episodes.arcId,
      }),
    },
    episodes: {
      arc: r.one.arcs({
        from: r.episodes.arcId,
        to: r.arcs.id,
      }),
      chapters: r.many.chapters({
        from: r.episodes.id,
        to: r.chapters.episodeId,
      }),
    },
    chapters: {
      episode: r.one.episodes({
        from: r.chapters.episodeId,
        to: r.episodes.id,
      }),
      embeddings: r.many.embeddings({
        from: r.chapters.id,
        to: r.embeddings.chapterId,
      }),
    },
    embeddings: {
      chapter: r.one.chapters({
        from: r.embeddings.chapterId,
        to: r.chapters.id,
      }),
    },
  }),
);
