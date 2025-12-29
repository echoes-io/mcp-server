import { Command } from '@commander-js/extra-typings';

import { DEFAULT_DB_PATH } from '../lib/constants.js';
import type { EntityType, RelationType } from '../lib/database/schemas.js';
import { runIndexTasks } from '../lib/indexer/tasks.js';
import { startServer } from '../lib/server.js';
import { checkConsistency, checkConsistencyConfig } from '../lib/tools/consistency/index.js';
import { graphExport, graphExportConfig } from '../lib/tools/graph-export.js';
import { history, historyConfig } from '../lib/tools/history.js';
import { indexConfig } from '../lib/tools/index.js';
import { type ListInput, list, listConfig } from '../lib/tools/list.js';
import { reviewGenerate, reviewGenerateConfig } from '../lib/tools/review-generate.js';
import { reviewStatus, reviewStatusConfig } from '../lib/tools/review-status.js';
import { search, searchConfig } from '../lib/tools/search.js';
import { stats, statsConfig } from '../lib/tools/stats.js';
import { wordsCount, wordsCountConfig } from '../lib/tools/words-count.js';
import { getPackageConfig } from '../lib/utils.js';

const packageConfig = getPackageConfig();

export const program = new Command()
  .name(packageConfig.name)
  .description(packageConfig.description)
  .version(packageConfig.version);

program
  .command(wordsCountConfig.name)
  .description(wordsCountConfig.description)
  .argument('<filePath...>', wordsCountConfig.arguments.filePath)
  .option('-d, --detailed', wordsCountConfig.arguments.detailed)
  .action(async (filePaths, { detailed }) => {
    try {
      filePaths.forEach((filePath, index) => {
        const result = wordsCount({ filePath, detailed });

        if (index > 0) {
          console.log('');
        }

        console.log(`📄 ${filePath}\n`);
        console.log(`   📝 Words:              ${result.words.toLocaleString()}`);
        console.log(`   🔤 Characters:         ${result.characters.toLocaleString()}`);
        console.log(`   🔡 Characters (no sp): ${result.charactersNoSpaces.toLocaleString()}`);
        console.log(`   ⏱️  Reading time:       ${result.readingTimeMinutes} min`);

        if (detailed) {
          console.log(`   💬 Sentences:          ${result.sentences?.toLocaleString()}`);
          console.log(`   📃 Paragraphs:         ${result.paragraphs?.toLocaleString()}`);
        }
      });
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command(statsConfig.name)
  .description(statsConfig.description)
  .option('--db <path>', 'Database path', DEFAULT_DB_PATH)
  .option('--arc <name>', statsConfig.arguments.arc)
  .option('--pov <name>', statsConfig.arguments.pov)
  .action(async ({ db, arc, pov }) => {
    try {
      const result = await stats({ arc, pov, dbPath: db });

      console.log('📊 Timeline Statistics\n');
      console.log(`   📚 Chapters:           ${result.totalChapters.toLocaleString()}`);
      console.log(`   📝 Total words:        ${result.totalWords.toLocaleString()}`);
      console.log(`   📈 Avg words/chapter:  ${result.averageWordsPerChapter.toLocaleString()}`);
      console.log(`   📁 Arcs:               ${result.arcs.join(', ')}`);
      console.log('   👤 POVs:');
      for (const [name, count] of Object.entries(result.povs).sort((a, b) => b[1] - a[1])) {
        console.log(`      - ${name}: ${count}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command(indexConfig.name)
  .description(indexConfig.description)
  .argument('[contentPath]', indexConfig.arguments.contentPath, './content')
  .option('--db <path>', 'Database path', DEFAULT_DB_PATH)
  .option('--arc <name>', indexConfig.arguments.arc)
  .option('--force', indexConfig.arguments.force)
  .action(async (contentPath, { db, arc, force }) => {
    try {
      // Use default renderer for CLI (shows progress bar)
      const result = await runIndexTasks({ contentPath, arc, force, dbPath: db });

      console.log('\n📊 Summary');
      console.log(`   📖 Indexed:   ${result.indexed} chapters`);
      console.log(`   ⏭️  Skipped:   ${result.skipped} chapters`);
      console.log(`   🗑️  Deleted:   ${result.deleted} chapters`);
      console.log(`   👤 Entities:  ${result.entities}`);
      console.log(`   🔗 Relations: ${result.relations}`);
    } catch (error) {
      console.error(`\n❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command(searchConfig.name)
  .description(searchConfig.description)
  .argument('<query>', searchConfig.arguments.query)
  .option('--db <path>', 'Database path', DEFAULT_DB_PATH)
  .option('--type <type>', searchConfig.arguments.type, 'chapters')
  .option('--arc <name>', searchConfig.arguments.arc)
  .option('--entity-type <type>', searchConfig.arguments.entityType)
  .option('--relation-type <type>', searchConfig.arguments.relationType)
  .option('--limit <n>', searchConfig.arguments.limit, '10')
  .action(async (query, { db, type, arc, entityType, relationType, limit }) => {
    try {
      const result = await search({
        query,
        type: type as 'chapters' | 'entities' | 'relations',
        arc,
        entityType,
        relationType,
        limit: Number.parseInt(limit, 10),
        dbPath: db,
      });

      if (result.type === 'chapters') {
        console.log(`🔍 Found ${result.results.length} chapters\n`);
        for (const ch of result.results) {
          console.log(`📖 ${ch.id} - ${ch.title} (${ch.pov})`);
          console.log(`   Score: ${ch.score.toFixed(3)} | Words: ${ch.word_count}`);
          console.log(`   ${ch.content.slice(0, 100)}...`);
          console.log('');
        }
      } else if (result.type === 'entities') {
        console.log(`🔍 Found ${result.results.length} entities\n`);
        for (const e of result.results) {
          console.log(`👤 ${e.name} (${e.type})`);
          console.log(`   ${e.description}`);
          console.log(`   Chapters: ${e.chapter_count} | Score: ${e.score.toFixed(3)}`);
          console.log('');
        }
      } else {
        console.log(`🔍 Found ${result.results.length} relations\n`);
        for (const r of result.results) {
          console.log(`🔗 ${r.source_entity} → ${r.type} → ${r.target_entity}`);
          console.log(`   ${r.description}`);
          console.log('');
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command(listConfig.name)
  .description(listConfig.description)
  .argument('<type>', listConfig.arguments.type)
  .option('--db <path>', 'Database path', DEFAULT_DB_PATH)
  .option('--arc <name>', listConfig.arguments.arc)
  .option('--entity-type <type>', listConfig.arguments.entityType)
  .option('--relation-type <type>', listConfig.arguments.relationType)
  .action(async (type, { db, arc, entityType, relationType }) => {
    try {
      const result = await list({
        type: type as 'entities' | 'relations',
        arc,
        entityType: entityType as ListInput['entityType'],
        relationType: relationType as ListInput['relationType'],
        dbPath: db,
      });

      if (result.type === 'entities') {
        console.log(`👤 Found ${result.results.length} entities\n`);
        for (const e of result.results) {
          console.log(`${e.name} (${e.type})`);
          console.log(`   ${e.description}`);
          /* c8 ignore start */
          if (Array.isArray(e.aliases) && e.aliases.length > 0) {
            console.log(`   Aliases: ${e.aliases.join(', ')}`);
          }
          /* c8 ignore stop */
          console.log(`   Chapters: ${e.chapter_count}`);
          console.log('');
        }
      } else {
        console.log(`🔗 Found ${result.results.length} relations\n`);
        for (const r of result.results) {
          const source = r.source_entity.split(':').pop();
          const target = r.target_entity.split(':').pop();
          console.log(`${source} → ${r.type} → ${target}`);
          console.log(`   ${r.description}`);
          console.log(`   Chapters: ${r.chapters.length}`);
          console.log('');
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/* c8 ignore start */
program
  .command('serve')
  .description('Start MCP server (for AI assistant integration)')
  .action(async () => {
    await startServer();
  });
/* c8 ignore stop */

program
  .command(checkConsistencyConfig.name)
  .description(checkConsistencyConfig.description)
  .argument('<arc>', checkConsistencyConfig.arguments.arc)
  .option('--content <path>', checkConsistencyConfig.arguments.contentPath, './content')
  .option('--db <path>', 'Database path', DEFAULT_DB_PATH)
  .option(
    '--rules <rules>',
    checkConsistencyConfig.arguments.rules,
    (val) =>
      val.split(',') as (
        | 'kink-firsts'
        | 'outfit-claims'
        | 'first-time-content'
        | 'relation-jump'
        | 'entity-duplicate'
      )[],
  )
  .option('--severity <level>', checkConsistencyConfig.arguments.severity)
  .option('--format <format>', 'Output format: text or json', 'text')
  .action(async (arc, { content, db, rules, severity, format }) => {
    try {
      const result = await checkConsistency({
        contentPath: content,
        arc,
        rules,
        severity: severity as 'error' | 'warning' | 'info' | undefined,
        dbPath: db,
      });

      if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`🔍 Consistency check for "${arc}"\n`);

      if (result.issues.length === 0) {
        console.log('✅ No issues found!');
        return;
      }

      console.log(`Found ${result.issues.length} issue(s):\n`);

      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${issue.message}`);
        console.log(`   Current: ep${issue.current.episode}:ch${issue.current.chapter}`);
        if (issue.previous) {
          console.log(`   Previous: ep${issue.previous.episode}:ch${issue.previous.chapter}`);
        }
        console.log('');
      }

      console.log('Summary:');
      console.log(`   ❌ Errors:   ${result.summary.errors}`);
      console.log(`   ⚠️  Warnings: ${result.summary.warnings}`);
      console.log(`   ℹ️  Info:     ${result.summary.info}`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('graph')
  .description(graphExportConfig.description)
  .argument('<arc>', graphExportConfig.arguments.arc)
  .option('--format <format>', 'Output format: mermaid, json, or dot', 'mermaid')
  .option('--db <path>', 'Database path', DEFAULT_DB_PATH)
  .option('--entity-types <types>', 'Filter by entity types (comma-separated)')
  .option('--relation-types <types>', 'Filter by relation types (comma-separated)')
  .option('--characters <names>', 'Filter by character names (comma-separated)')
  .action(async (arc, { format, db, entityTypes, relationTypes, characters }) => {
    try {
      const result = await graphExport({
        arc,
        format: format as 'mermaid' | 'json' | 'dot',
        entityTypes: entityTypes?.split(',') as EntityType[] | undefined,
        relationTypes: relationTypes?.split(',') as RelationType[] | undefined,
        characters: characters?.split(','),
        dbPath: db,
      });

      console.log(result.content);

      if (process.stderr.isTTY) {
        console.error(
          `\n📊 Graph exported: ${result.stats.nodes} nodes, ${result.stats.edges} edges`,
        );
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// History command
program
  .command('history')
  .description(historyConfig.description)
  .argument('<arc>', historyConfig.arguments.arc)
  .option('--character <character>', historyConfig.arguments.character)
  .option('--only <type>', historyConfig.arguments.only)
  .option('--search <term>', historyConfig.arguments.search)
  .option('--db <path>', historyConfig.arguments.dbPath, DEFAULT_DB_PATH)
  .action(async (arc, options) => {
    try {
      const result = await history({
        arc,
        character: options.character,
        only: options.only as 'kinks' | 'outfits' | 'locations' | 'relations' | undefined,
        search: options.search,
        dbPath: options.db,
      });

      console.log(`=== ${arc.toUpperCase()} - Arc History ===\n`);

      if (!options.only || options.only === 'kinks') {
        if (result.kinks.length > 0) {
          console.log('🔥 Kinks (chronological):');
          for (const kink of result.kinks) {
            const star = kink.isFirst ? ' ⭐' : '';
            console.log(`  ${kink.chapter}  ${kink.kink}${star}`);
          }
          console.log();
        }
      }

      if (!options.only || options.only === 'outfits') {
        if (result.outfits.length > 0) {
          console.log('👗 Outfits:');
          for (const outfit of result.outfits) {
            console.log(`  ${outfit.chapter}  ${outfit.character}: ${outfit.outfit}`);
          }
          console.log();
        }
      }

      if (!options.only || options.only === 'locations') {
        if (result.locations.length > 0) {
          console.log('📍 Locations:');
          for (const location of result.locations) {
            console.log(`  ${location.chapter}  ${location.location}`);
          }
          console.log();
        }
      }

      if (!options.only || options.only === 'relations') {
        if (result.relations.length > 0) {
          console.log('💕 Relations (from DB):');
          for (const relation of result.relations) {
            console.log(
              `  ${relation.chapter}  ${relation.source} → ${relation.type} → ${relation.target}`,
            );
          }
          console.log();
        }
      }

      if (
        result.kinks.length === 0 &&
        result.outfits.length === 0 &&
        result.locations.length === 0 &&
        result.relations.length === 0
      ) {
        console.log('No history found for the specified criteria.');
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Review generate command
program
  .command('review-generate')
  .description(reviewGenerateConfig.description)
  .argument('<arc>', reviewGenerateConfig.arguments.arc)
  .option('--output <file>', reviewGenerateConfig.arguments.output, '.echoes-review.yaml')
  .option('--filter <type>', reviewGenerateConfig.arguments.filter, 'pending')
  .option('--db <path>', reviewGenerateConfig.arguments.dbPath, DEFAULT_DB_PATH)
  .action(async (arc, options) => {
    try {
      const result = await reviewGenerate({
        arc,
        output: options.output,
        filter: options.filter as 'pending' | 'all',
        dbPath: options.db,
      });

      console.log(`📝 Review file generated: ${result.file}`);
      console.log(`📊 ${result.stats.entities} entities, ${result.stats.relations} relations`);

      // Write file to disk
      const fs = await import('node:fs/promises');
      await fs.writeFile(result.file, result.content, 'utf8');
      console.log(`✅ File written successfully`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Review status command
program
  .command('review-status')
  .description(reviewStatusConfig.description)
  .argument('<arc>', reviewStatusConfig.arguments.arc)
  .option('--db <path>', reviewStatusConfig.arguments.dbPath, DEFAULT_DB_PATH)
  .action(async (arc, options) => {
    try {
      const result = await reviewStatus({
        arc,
        dbPath: options.db,
      });

      console.log(`=== ${arc.toUpperCase()} - Review Status ===\n`);

      console.log('📊 Entities:');
      console.log(`  Pending: ${result.entities.pending}`);
      console.log(`  Approved: ${result.entities.approved}`);
      console.log(`  Modified: ${result.entities.modified}`);
      console.log(`  Rejected: ${result.entities.rejected}`);
      console.log(`  Total: ${result.entities.total}\n`);

      console.log('🔗 Relations:');
      console.log(`  Pending: ${result.relations.pending}`);
      console.log(`  Approved: ${result.relations.approved}`);
      console.log(`  Modified: ${result.relations.modified}`);
      console.log(`  Rejected: ${result.relations.rejected}`);
      console.log(`  Total: ${result.relations.total}`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });
