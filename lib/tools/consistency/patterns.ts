// Patterns for detecting "first time" in kink field
export const KINK_FIRST_PATTERNS = [
  /\bprim[oa]-/i, // primo-plug, prima-volta
  /\bprim[oa]\s/i, // primo bacio, prima volta
  /\bfirst-/i, // first-time, first-kiss
  /\bfirst\s/i, // first time, first kiss
];

// Normalize kink token for comparison
export function normalizeKinkToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '-') // non-alphanumeric to dash
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-|-$/g, ''); // trim dashes
}

// Extract the "first" subject from a kink token
// "primo-plug" -> "plug", "prima volta anal" -> "volta-anal", "first-kiss" -> "kiss"
export function extractFirstSubject(token: string): string | null {
  const normalized = normalizeKinkToken(token);

  // Match patterns like "primo-X", "prima-X", "first-X"
  const match = normalized.match(/^(?:prim[oa]|first)-(.+)$/);
  if (match) return match[1];

  return null;
}

// Check if a kink token represents a "first time" event
export function isFirstTimeKink(token: string): boolean {
  return KINK_FIRST_PATTERNS.some((pattern) => pattern.test(token));
}

// Tokenize kink field (comma or pipe separated)
export function tokenizeKink(kink: string): string[] {
  return kink
    .split(/[,|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
