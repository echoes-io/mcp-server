import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseMarkdown } from '../../../utils.js';
import type { ChapterRef, Issue } from '../types.js';

// Common clothing items to look for
const CLOTHING_ITEMS = [
  'gonna',
  'minigonna',
  'vestito',
  'abito',
  'top',
  'camicia',
  'camicetta',
  'maglietta',
  'reggiseno',
  'mutandine',
  'slip',
  'tanga',
  'autoreggenti',
  'calze',
  'tacchi',
  'scarpe',
  'sandali',
  'giacca',
  'blazer',
  'pantaloni',
  'jeans',
  'shorts',
  'bikini',
  'costume',
  'pigiama',
];

// Patterns to find "never worn" claims
const NEVER_WORN_PATTERNS = [
  /non (l')?aveva(no)? mai (indossato|portato|messo)/gi,
  /non (l')?avevo mai (indossato|portato|messo)/gi,
  /mai (indossato|portato|messo) (prima|un[ao]?)/gi,
  /(comprato|acquistato).{0,30}mai (indossato|portato|messo)/gi,
];

interface OutfitRecord {
  ref: ChapterRef;
  character: string;
  items: string[];
  raw: string;
}

interface NeverWornClaim {
  ref: ChapterRef;
  text: string;
  items: string[];
}

// Parse outfit field: "Ele: gonna nera, top bianco | Nic: camicia"
function parseOutfitField(outfit: string): Array<{ character: string; items: string[] }> {
  const results: Array<{ character: string; items: string[] }> = [];

  // Split by | or newline for multiple characters
  const parts = outfit
    .split(/[|\n]/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    // Try to match "Character: outfit description"
    const match = part.match(/^([A-Za-z]+):\s*(.+)$/);
    if (match) {
      const character = match[1].toLowerCase();
      const description = match[2].toLowerCase();
      const foundItems = CLOTHING_ITEMS.filter((item) => description.includes(item));
      // Remove items that are substrings of other found items
      const items = foundItems.filter(
        (item) => !foundItems.some((otherItem) => otherItem !== item && otherItem.includes(item)),
      );
      if (items.length > 0) {
        results.push({ character, items });
      }
    } else {
      // No character prefix, try to extract items anyway
      const description = part.toLowerCase();
      const foundItems = CLOTHING_ITEMS.filter((item) => description.includes(item));
      // Remove items that are substrings of other found items
      const items = foundItems.filter(
        (item) => !foundItems.some((otherItem) => otherItem !== item && otherItem.includes(item)),
      );
      if (items.length > 0) {
        results.push({ character: 'unknown', items });
      }
    }
  }

  return results;
}

// Extract clothing items mentioned in "never worn" context
function extractNeverWornItems(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundItems = CLOTHING_ITEMS.filter((item) => lowerText.includes(item));

  // Remove items that are substrings of other found items (e.g., "gonna" when "minigonna" is found)
  return foundItems.filter(
    (item) => !foundItems.some((otherItem) => otherItem !== item && otherItem.includes(item)),
  );
}

function scanChapters(
  contentPath: string,
  arc: string,
): { outfits: OutfitRecord[]; claims: NeverWornClaim[] } {
  const outfits: OutfitRecord[] = [];
  const claims: NeverWornClaim[] = [];

  function scanDir(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const raw = readFileSync(fullPath, 'utf-8');
          const { metadata, content } = parseMarkdown(raw);

          if (metadata.arc !== arc) continue;

          const ref: ChapterRef = {
            arc: metadata.arc,
            episode: metadata.episode ?? 0,
            chapter: metadata.chapter ?? 0,
          };

          // Parse outfit field
          if (metadata.outfit) {
            const parsed = parseOutfitField(metadata.outfit);
            for (const { character, items } of parsed) {
              outfits.push({ ref, character, items, raw: metadata.outfit });
            }
          }

          // Find "never worn" claims in content
          for (const pattern of NEVER_WORN_PATTERNS) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
              // Get surrounding context
              const start = Math.max(0, (match.index ?? 0) - 100);
              const end = Math.min(content.length, (match.index ?? 0) + match[0].length + 100);
              const context = content.slice(start, end);

              const items = extractNeverWornItems(context);
              if (items.length > 0) {
                claims.push({ ref, text: context.replace(/\s+/g, ' ').trim(), items });
              }
            }
          }
        } catch {
          // Skip unparseable files
        }
      }
    }
  }

  scanDir(contentPath);

  // Sort by episode, then chapter
  const sortFn = (a: { ref: ChapterRef }, b: { ref: ChapterRef }) => {
    if (a.ref.episode !== b.ref.episode) return a.ref.episode - b.ref.episode;
    return a.ref.chapter - b.ref.chapter;
  };

  outfits.sort(sortFn);
  claims.sort(sortFn);

  return { outfits, claims };
}

export async function checkOutfitClaims(contentPath: string, arc: string): Promise<Issue[]> {
  const { outfits, claims } = scanChapters(contentPath, arc);

  if (claims.length === 0) return [];

  const issues: Issue[] = [];
  const seenIssues = new Set<string>(); // To avoid duplicates

  // For each "never worn" claim, check if the item appeared in earlier outfits
  for (const claim of claims) {
    for (const item of claim.items) {
      // Find earlier outfits with this item
      const earlierOutfits = outfits.filter(
        (o) =>
          o.items.includes(item) &&
          (o.ref.episode < claim.ref.episode ||
            (o.ref.episode === claim.ref.episode && o.ref.chapter < claim.ref.chapter)),
      );

      if (earlierOutfits.length > 0) {
        const first = earlierOutfits[0];
        const issueKey = `${claim.ref.arc}:${claim.ref.episode}:${claim.ref.chapter}:${item}`;

        if (!seenIssues.has(issueKey)) {
          seenIssues.add(issueKey);
          issues.push({
            type: 'OUTFIT_CONTRADICTION',
            severity: 'warning',
            message: `Claim "never worn ${item}" contradicts earlier outfit`,
            current: claim.ref,
            previous: first.ref,
            details: {
              item,
              claimText: claim.text.slice(0, 100),
              previousOutfit: first.raw,
            },
          });
        }
      }
    }
  }

  return issues;
}
