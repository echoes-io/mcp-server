import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { createEchoesRAG } from '../rag/index.js';
import { ENTITY_TYPES, RELATION_TYPES } from '../rag/schema.js';
import type { ToolConfig } from '../types.js';

export const graphExportConfig: ToolConfig = {
  name: 'graph-export',
  description: 'Export knowledge graph in JSON or DOT format.',
  arguments: {
    arc: 'Arc name to export.',
    format: 'Output format: json or dot.',
    entityTypes: 'Filter by entity types (comma-separated).',
    relationTypes: 'Filter by relation types (comma-separated).',
    characters: 'Filter by specific character names (comma-separated).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const graphExportSchema = z.object({
  arc: z.string().describe(graphExportConfig.arguments.arc),
  format: z.enum(['json', 'dot']).describe(graphExportConfig.arguments.format),
  entityTypes: z
    .array(z.enum(ENTITY_TYPES))
    .optional()
    .describe(graphExportConfig.arguments.entityTypes),
  relationTypes: z
    .array(z.enum(RELATION_TYPES))
    .optional()
    .describe(graphExportConfig.arguments.relationTypes),
  characters: z.array(z.string()).optional().describe(graphExportConfig.arguments.characters),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(graphExportConfig.arguments.dbPath),
});

export type GraphExportInput = z.infer<typeof graphExportSchema>;

interface GraphNode {
  id: string;
  name: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function graphExport(input: GraphExportInput) {
  const { arc, format, entityTypes, relationTypes, characters, dbPath } =
    graphExportSchema.parse(input);

  const { storage } = createEchoesRAG({ dbPath, arc });

  // Build graph from storage
  const entities = await storage.graph.getEntities();
  let nodes: GraphNode[] = entities.map((e) => ({ id: e.name, name: e.name, type: e.type }));

  const allRelations: GraphEdge[] = [];
  for (const entity of entities) {
    const rels = await storage.graph.getRelations(entity.id, 'out');
    for (const r of rels) {
      const source = entities.find((e) => e.id === r.sourceId);
      const target = entities.find((e) => e.id === r.targetId);
      if (source && target) {
        allRelations.push({ source: source.name, target: target.name, type: r.type });
      }
    }
  }
  let edges = allRelations;

  // Apply filters
  if (entityTypes) nodes = nodes.filter((n) => (entityTypes as string[]).includes(n.type));
  if (characters) nodes = nodes.filter((n) => characters.includes(n.name));
  if (relationTypes) edges = edges.filter((e) => (relationTypes as string[]).includes(e.type));

  const nodeIds = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  const graph: Graph = { nodes, edges };

  const content = format === 'json' ? toJSON(graph) : toDOT(graph);

  return { format, content, stats: { nodes: graph.nodes.length, edges: graph.edges.length } };
}

function toJSON(graph: Graph): string {
  return JSON.stringify(
    {
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        group: n.type === 'CHARACTER' ? 1 : n.type === 'LOCATION' ? 2 : 3,
      })),
      links: graph.edges.map((e) => ({ source: e.source, target: e.target, type: e.type })),
    },
    null,
    2,
  );
}

function toDOT(graph: Graph): string {
  const lines = ['digraph G {'];
  for (const n of graph.nodes) {
    const shape = n.type === 'CHARACTER' ? 'ellipse' : n.type === 'LOCATION' ? 'box' : 'diamond';
    lines.push(`    "${n.name}" [shape=${shape}];`);
  }
  for (const e of graph.edges) {
    lines.push(`    "${e.source}" -> "${e.target}" [label="${e.type}"];`);
  }
  lines.push('}');
  return lines.join('\n');
}
