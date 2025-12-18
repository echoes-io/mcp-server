/**
 * Improved Named Entity Recognition for Character Detection
 * Optimized for Italian storytelling content
 */

import type { ChapterMetadata } from '../types/frontmatter.js';

export interface CharacterNER {
  extractCharacters(text: string, metadata?: Partial<ChapterMetadata>): string[];
  extractMainCharacters(
    chapters: Array<{ content: string; metadata: Partial<ChapterMetadata> }>,
  ): string[];
}

/**
 * Rule-based NER optimized for Italian names and storytelling
 */
export class ItalianCharacterNER implements CharacterNER {
  private commonWords: Set<string>;
  private namePatterns: RegExp[];
  private dialoguePatterns: RegExp[];

  constructor() {
    // Common Italian words to exclude (expanded list)
    this.commonWords = new Set([
      // Pronouns and articles
      'io',
      'tu',
      'lui',
      'lei',
      'noi',
      'voi',
      'loro',
      'il',
      'la',
      'lo',
      'gli',
      'le',
      'un',
      'una',
      'uno',
      // Common verbs
      'sono',
      'sei',
      'è',
      'siamo',
      'siete',
      'hanno',
      'ho',
      'hai',
      'ha',
      'abbiamo',
      'avete',
      'fanno',
      'faccio',
      'fai',
      'fa',
      'facciamo',
      'fate',
      'vado',
      'vai',
      'va',
      'andiamo',
      'andate',
      'vanno',
      'dico',
      'dici',
      'dice',
      'diciamo',
      'dite',
      'dicono',
      'vedo',
      'vedi',
      'vede',
      'vediamo',
      'vedete',
      'vedono',
      // Common words and negations
      'non',
      'no',
      'sì',
      'si',
      'ne',
      'ci',
      'vi',
      'mi',
      'ti',
      'se',
      'ma',
      'o',
      'e',
      'che',
      'di',
      'da',
      'in',
      'con',
      'su',
      'per',
      'tra',
      'fra',
      'tutto',
      'tutti',
      'tutte',
      'niente',
      'nulla',
      'qualcosa',
      'qualcuno',
      'qualche',
      'altro',
      'altri',
      'altre',
      'voglio',
      'vuoi',
      'vuole',
      'vogliamo',
      'volete',
      'vogliono',
      'posso',
      'puoi',
      'può',
      'possiamo',
      'potete',
      'possono',
      'devo',
      'devi',
      'deve',
      'dobbiamo',
      'dovete',
      'devono',
      'perfetto',
      'perfetta',
      'perfetti',
      'perfette',
      'sento',
      'senti',
      'sente',
      'sentiamo',
      'sentite',
      'sentono',
      'sto',
      'stai',
      'sta',
      'stiamo',
      'state',
      'stanno',
      'anche',
      'ancora',
      'allora',
      'quindi',
      'però',
      'infatti',
      'comunque',
      'davvero',
      'veramente',
      // Common adjectives/adverbs
      'bene',
      'male',
      'molto',
      'poco',
      'tanto',
      'più',
      'meno',
      'sempre',
      'mai',
      'già',
      'ancora',
      'oggi',
      'ieri',
      'domani',
      'quando',
      'dove',
      'come',
      'perché',
      'perch',
      'cosa',
      'chi',
      'quale',
      'quanto',
      'ogni',
      'ogni',
      'solo',
      'prima',
      'dopo',
      'mentre',
      'durante',
      'contro',
      'senza',
      'dentro',
      'fuori',
      'sopra',
      'sotto',
      // Common nouns
      'casa',
      'tempo',
      'giorno',
      'notte',
      'mattina',
      'sera',
      'anno',
      'mese',
      'settimana',
      'ora',
      'minuto',
      'occhi',
      'mano',
      'mani',
      'testa',
      'cuore',
      'mente',
      'corpo',
      'voce',
      'parole',
      'parola',
      // Locations (generic)
      'milano',
      'roma',
      'londra',
      'italia',
      'inghilterra',
      'città',
      'paese',
      'posto',
      'luogo',
      // Common expressions
      'cazzo',
      'merda',
      'cristo',
      'dio',
      'madonna',
      'boh',
      'ecco',
      'allora',
      'però',
      'quindi',
      'infatti',
      'comunque',
      'insomma',
      'davvero',
      'veramente',
      'sicuramente',
      'probabilmente',
      // English common words (mixed content)
      'the',
      'and',
      'you',
      'that',
      'was',
      'for',
      'are',
      'with',
      'his',
      'they',
      'this',
      'have',
      'from',
      'not',
      'but',
      'what',
      'can',
      'out',
      'other',
      'were',
      'all',
      'your',
      'when',
      'said',
      'there',
      'each',
      'which',
      'she',
      'how',
      'will',
      'about',
      'get',
      'made',
      'may',
    ]);

    // Patterns for Italian names
    this.namePatterns = [
      /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/g, // Capitalized words (potential names)
    ];

    // Dialogue patterns to identify speakers
    this.dialoguePatterns = [
      /"([^"]*)",?\s*(?:dice|chiede|risponde|sussurra|grida)\s+([A-Z][a-z]+)/gi,
      /([A-Z][a-z]+)\s*:\s*"([^"]*)"/gi,
      /([A-Z][a-z]+)\s+(?:dice|chiede|risponde|sussurra|grida)\s*:/gi,
    ];
  }

  extractCharacters(text: string, metadata?: Partial<ChapterMetadata>): string[] {
    const characters = new Set<string>();

    // 1. Add POV character if available
    if (metadata?.pov && this.isValidName(metadata.pov)) {
      characters.add(this.normalizeName(metadata.pov));
    }

    // 2. Extract from outfit metadata (reliable source)
    if (metadata?.outfit) {
      const outfitNames = this.extractFromOutfit(metadata.outfit);
      for (const name of outfitNames) {
        characters.add(name);
      }
    }

    // 3. Extract from dialogue patterns (high confidence)
    const dialogueNames = this.extractFromDialogue(text);
    for (const name of dialogueNames) {
      characters.add(name);
    }

    // 4. Extract from name patterns with frequency filtering
    const patternNames = this.extractFromPatterns(text);
    for (const name of patternNames) {
      characters.add(name);
    }

    // 5. Filter and validate results
    const validCharacters = Array.from(characters)
      .filter((name) => this.isValidCharacterName(name))
      .slice(0, 8); // Limit to 8 most likely characters

    return validCharacters;
  }

  extractMainCharacters(
    chapters: Array<{ content: string; metadata: Partial<ChapterMetadata> }>,
  ): string[] {
    const characterFreq = new Map<string, number>();
    const characterContexts = new Map<string, Set<string>>();

    // Extract characters from all chapters
    chapters.forEach((chapter) => {
      const chars = this.extractCharacters(chapter.content, chapter.metadata);
      chars.forEach((char) => {
        characterFreq.set(char, (characterFreq.get(char) || 0) + 1);

        if (!characterContexts.has(char)) {
          characterContexts.set(char, new Set());
        }
        characterContexts.get(char)?.add(chapter.metadata.arc || 'unknown');
      });
    });

    // Score characters based on frequency and context diversity
    const scoredCharacters = Array.from(characterFreq.entries())
      .map(([name, freq]) => {
        const contexts = characterContexts.get(name)?.size || 0;
        const score = freq * (1 + contexts * 0.5); // Bonus for appearing in multiple arcs
        return { name, freq, contexts, score };
      })
      .filter((char) => char.freq >= 3) // Must appear in at least 3 chapters
      .sort((a, b) => b.score - a.score);

    return scoredCharacters.slice(0, 20).map((char) => char.name);
  }

  private extractFromOutfit(outfit: string): string[] {
    const names: string[] = [];
    const matches = outfit.match(/([A-Z][a-z]+):/g);

    if (matches) {
      matches.forEach((match) => {
        const name = match.replace(':', '').trim();
        if (this.isValidName(name)) {
          names.push(this.normalizeName(name));
        }
      });
    }

    return names;
  }

  private extractFromDialogue(text: string): string[] {
    const names = new Set<string>();

    this.dialoguePatterns.forEach((pattern) => {
      let match: RegExpExecArray | null = pattern.exec(text);
      while (match !== null) {
        // Extract potential names from different capture groups
        for (let i = 1; i < match.length; i++) {
          const potential = match[i];
          if (potential && this.isValidName(potential)) {
            names.add(this.normalizeName(potential));
          }
        }
        match = pattern.exec(text);
      }
    });

    return Array.from(names);
  }

  private extractFromPatterns(text: string): string[] {
    const nameFreq = new Map<string, number>();

    this.namePatterns.forEach((pattern) => {
      let match: RegExpExecArray | null = pattern.exec(text);
      while (match !== null) {
        const name = match[0].trim();
        if (this.isValidName(name)) {
          nameFreq.set(name, (nameFreq.get(name) || 0) + 1);
        }
        match = pattern.exec(text);
      }
    });

    // Return names that appear multiple times
    return Array.from(nameFreq.entries())
      .filter(([_, freq]) => freq >= 2)
      .map(([name, _]) => name);
  }

  private isValidName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 20) return false;

    // Must start with capital letter
    if (name[0] !== name[0].toUpperCase()) return false;

    // Check against common words
    if (this.commonWords.has(name.toLowerCase())) return false;

    // Must contain only letters (and spaces for compound names)
    if (!/^[A-Za-z\s]+$/.test(name)) return false;

    return true;
  }

  private isValidCharacterName(name: string): boolean {
    if (!this.isValidName(name)) return false;

    // Additional checks for character names

    // Exclude obvious non-names
    const excludePatterns = [
      /^(chapter|capitolo|episodio|parte|arc|timeline)$/i,
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
      /^(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)$/i,
      /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i,
    ];

    return !excludePatterns.some((pattern) => pattern.test(name));
  }

  private normalizeName(name: string): string {
    // Normalize case: first letter uppercase, rest lowercase
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
}

/**
 * Factory function to create character NER
 */
export function createCharacterNER(): CharacterNER {
  return new ItalianCharacterNER();
}
