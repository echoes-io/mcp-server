import z from 'zod';

import { DEFAULT_DB_PATH } from '../constants.js';
import { Database } from '../database/index.js';
import type { EntityType, RelationType } from '../database/schemas.js';
import type { ToolConfig } from '../types.js';

export const graphExportConfig: ToolConfig = {
  name: 'graph-export',
  description: 'Export knowledge graph in various formats (Mermaid, JSON, DOT).',
  arguments: {
    arc: 'Arc name to export.',
    format: 'Output format: mermaid, json, or dot.',
    entityTypes: 'Filter by entity types (comma-separated).',
    relationTypes: 'Filter by relation types (comma-separated).',
    characters: 'Filter by specific character names (comma-separated).',
    dbPath: `Database path (default: ${DEFAULT_DB_PATH}).`,
  },
};

export const graphExportSchema = z.object({
  arc: z.string().describe(graphExportConfig.arguments.arc),
  format: z.enum(['mermaid', 'json', 'dot']).describe(graphExportConfig.arguments.format),
  entityTypes: z
    .array(z.enum(['CHARACTER', 'LOCATION', 'EVENT', 'OBJECT', 'EMOTION']))
    .optional()
    .describe(graphExportConfig.arguments.entityTypes),
  relationTypes: z
    .array(
      z.enum([
        'LOVES',
        'HATES',
        'KNOWS',
        'RELATED_TO',
        'FRIENDS_WITH',
        'ENEMIES_WITH',
        'LOCATED_IN',
        'LIVES_IN',
        'TRAVELS_TO',
        'HAPPENS_BEFORE',
        'HAPPENS_AFTER',
        'CAUSES',
        'OWNS',
        'USES',
        'SEEKS',
      ]),
    )
    .optional()
    .describe(graphExportConfig.arguments.relationTypes),
  characters: z.array(z.string()).optional().describe(graphExportConfig.arguments.characters),
  dbPath: z.string().default(DEFAULT_DB_PATH).describe(graphExportConfig.arguments.dbPath),
});

export type GraphExportInput = z.infer<typeof graphExportSchema>;

interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
}

interface GraphEdge {
  source: string;
  target: string;
  type: RelationType;
  weight: number;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

async function buildGraph(dbPath: string, arc: string): Promise<Graph> {
  const db = new Database(dbPath);
  await db.connect();

  const entities = await db.getEntities(arc);
  const relations = await db.getRelations(arc);

  db.close();

  const nodes: GraphNode[] = entities.map((entity) => ({
    id: entity.name,
    name: entity.name,
    type: entity.type,
  }));

  const edges: GraphEdge[] = relations.map((relation) => ({
    source: relation.source_entity.split(':').pop() || '',
    target: relation.target_entity.split(':').pop() || '',
    type: relation.type,
    weight: relation.weight,
  }));

  return { nodes, edges };
}

function filterGraph(
  graph: Graph,
  filters: {
    entityTypes?: EntityType[];
    relationTypes?: RelationType[];
    characters?: string[];
  },
): Graph {
  let { nodes, edges } = graph;

  // Filter nodes by entity types
  if (filters.entityTypes) {
    nodes = nodes.filter((node) => filters.entityTypes?.includes(node.type));
  }

  // Filter nodes by character names
  if (filters.characters) {
    nodes = nodes.filter((node) => filters.characters?.includes(node.name));
  }

  // Filter edges by relation types
  if (filters.relationTypes) {
    edges = edges.filter((edge) => filters.relationTypes?.includes(edge.type));
  }

  // Remove edges that reference filtered-out nodes
  const nodeIds = new Set(nodes.map((node) => node.id));
  edges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  return { nodes, edges };
}

function toMermaid(graph: Graph): string {
  const lines = ['graph LR'];

  for (const edge of graph.edges) {
    const source = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
    const target = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`    ${source} -->|${edge.type}| ${target}`);
  }

  return lines.join('\n');
}

function toJSON(graph: Graph): string {
  const result = {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      group: node.type === 'CHARACTER' ? 1 : node.type === 'LOCATION' ? 2 : 3,
    })),
    links: graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight,
    })),
  };

  return JSON.stringify(result, null, 2);
}

function toDOT(graph: Graph): string {
  const lines = ['digraph G {'];

  // Add node definitions with types
  for (const node of graph.nodes) {
    const shape =
      node.type === 'CHARACTER' ? 'ellipse' : node.type === 'LOCATION' ? 'box' : 'diamond';
    lines.push(`    "${node.name}" [shape=${shape}];`);
  }

  // Add edges
  for (const edge of graph.edges) {
    lines.push(`    "${edge.source}" -> "${edge.target}" [label="${edge.type}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}

export async function graphExport(input: GraphExportInput) {
  const { arc, format, entityTypes, relationTypes, characters, dbPath } =
    graphExportSchema.parse(input);

  // Build graph from database
  let graph = await buildGraph(dbPath, arc);

  // Apply filters
  graph = filterGraph(graph, { entityTypes, relationTypes, characters });

  // Generate output based on format
  let content: string;
  switch (format) {
    case 'mermaid':
      content = toMermaid(graph);
      break;
    case 'json':
      content = toJSON(graph);
      break;
    case 'dot':
      content = toDOT(graph);
      break;
  }

  return {
    format,
    content,
    stats: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
  };
}
