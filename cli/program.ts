import { Command } from '@commander-js/extra-typings';

import { loadConfig } from '../lib/config.js';
import { createGraphQLClient } from '../lib/graphql/client.js';
import { startServer } from '../lib/server.js';
import { mageCharactersList } from '../lib/tools/mage-characters.js';
import { mageCommit } from '../lib/tools/mage-commit.js';
import {
  mageQueueAdd,
  mageQueueAddBulk,
  mageQueueCancel,
  mageQueueList,
  mageQueuePause,
  mageQueueResume,
} from '../lib/tools/mage-queue.js';
import { mageResultsList, mageResultsSave, mageResultsSaveAll } from '../lib/tools/mage-results.js';
import { mageStatus } from '../lib/tools/mage-status.js';
import { wordsCount, wordsCountConfig } from '../lib/tools/words-count.js';
import { getPackageConfig } from '../lib/utils.js';

const packageConfig = getPackageConfig();

export const program = new Command()
  .name(packageConfig.name)
  .description(packageConfig.description)
  .version(packageConfig.version);

// --- words-count ---

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

// --- serve ---

/* v8 ignore start */
program
  .command('serve')
  .description('Start MCP server (for AI assistant integration)')
  .action(async () => {
    await startServer();
  });
/* v8 ignore stop */

// --- Mage commands ---

const mage = program.command('mage').description('Mage image generation commands');

// mage status
mage
  .command('status')
  .description('Show Mage system status')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageStatus(client);

      const queueIcon = result.queue.paused ? '⏸️' : '▶️';
      console.log(
        `${queueIcon} Queue: ${result.queue.paused ? 'PAUSED' : 'ACTIVE'} (${result.queue.size} items)`,
      );

      if (result.queue.currentJob) {
        console.log(
          `   🔄 Processing: ${result.queue.currentJob.arc} — ${result.queue.currentJob.prompt.slice(0, 60)}...`,
        );
      }

      console.log(
        `\n📊 Results: ${result.results.total} total, ${result.results.unsaved} unsaved, ${result.results.uncommitted} uncommitted`,
      );

      if (result.circuitBreaker.open) {
        console.log(`\n🔴 Circuit breaker OPEN (${result.circuitBreaker.failures} failures)`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// mage characters
mage
  .command('characters')
  .description('List configured characters')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageCharactersList(client);

      console.log('👤 Characters:\n');
      for (const char of result.characters) {
        console.log(`   [${char.placeholder}] → @${char.username} (${char.timeline}/${char.arc})`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// mage queue
const queue = mage.command('queue').description('Queue management');

queue
  .command('add')
  .description('Queue a single image generation')
  .argument('<prompt>', 'Prompt (with [PLACEHOLDER] for characters)')
  .requiredOption('-t, --type <type>', 'Image type: scene, chapter, character')
  .requiredOption('-a, --arc <arc>', 'Arc name')
  .option('-e, --episode <episode>', 'Episode')
  .option('-n, --number <number>', 'Scene/chapter number', Number.parseInt)
  .option('-v, --variant <variant>', 'Variant letter')
  .option('-m, --media <media>', 'Media type: image or video')
  .action(async (prompt, opts) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const job = await mageQueueAdd(
        {
          prompt,
          imageType: opts.type as 'scene' | 'chapter' | 'character',
          arc: opts.arc,
          episode: opts.episode,
          number: opts.number,
          variant: opts.variant,
          mediaType: opts.media as 'image' | 'video' | undefined,
        },
        client,
      );
      console.log(`✅ Queued: ${job.id} (${job.arc} ${job.imageType} #${job.number ?? '?'})`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

queue
  .command('add-bulk')
  .description('Queue multiple generations (one prompt per line from stdin or argument)')
  .argument('<prompts>', 'Prompts separated by newlines')
  .requiredOption('-t, --type <type>', 'Image type: scene, chapter, character')
  .requiredOption('-a, --arc <arc>', 'Arc name')
  .option('-e, --episode <episode>', 'Episode')
  .action(async (prompts, opts) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageQueueAddBulk(
        {
          prompts,
          imageType: opts.type as 'scene' | 'chapter' | 'character',
          arc: opts.arc,
          episode: opts.episode,
        },
        client,
      );
      console.log(`✅ Queued ${result.queued} jobs`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

queue
  .command('list')
  .description('List queued and processing jobs')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageQueueList(client);

      if (result.processing.length > 0) {
        console.log('🔄 Processing:');
        for (const job of result.processing) {
          console.log(
            `   ${job.id} — ${job.arc} ${job.imageType} #${job.number ?? '?'}: ${job.prompt.slice(0, 50)}...`,
          );
        }
        console.log('');
      }

      if (result.queued.length > 0) {
        console.log('⏳ Queued:');
        for (const [i, job] of result.queued.entries()) {
          console.log(
            `   ${i + 1}. ${job.id} — ${job.arc} ${job.imageType} #${job.number ?? '?'}: ${job.prompt.slice(0, 50)}...`,
          );
        }
      } else {
        console.log('✅ Queue is empty');
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

queue
  .command('pause')
  .description('Pause the queue')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageQueuePause(client);
      console.log(`⏸️  ${result.message}`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

queue
  .command('resume')
  .description('Resume the queue')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageQueueResume(client);
      console.log(`▶️  ${result.message}`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

queue
  .command('cancel')
  .description('Cancel a queued job')
  .argument('<id>', 'Job ID (or prefix)')
  .action(async (id) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageQueueCancel({ id }, client);
      console.log(`🗑️  Cancelled: ${result.id} (${result.status})`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// mage results
const results = mage.command('results').description('Results management');

results
  .command('list')
  .description('List generated results')
  .option('--unsaved', 'Only show unsaved results')
  .option('-l, --limit <limit>', 'Max results', Number.parseInt)
  .action(async (opts) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageResultsList(
        { unsavedOnly: opts.unsaved, limit: opts.limit },
        client,
      );

      console.log(`📸 ${result.total} results:\n`);
      for (const job of result.results) {
        const saved = job.s3Uploaded ? '💾' : '⏳';
        const committed = job.gitCommitted ? '✅' : '📤';
        console.log(
          `   ${saved}${committed} ${job.id} — ${job.arc} ${job.imageType} #${job.number ?? '?'}${job.variant ?? ''}`,
        );
        console.log(`      ${job.prompt.slice(0, 70)}...`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

results
  .command('save')
  .description('Save a result to S3')
  .argument('<id>', 'Job ID')
  .action(async (id) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageResultsSave({ id }, client);
      console.log(`💾 Saved: ${result.id} → ${result.s3Key}`);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

results
  .command('save-all')
  .description('Save all unsaved results')
  .option('-a, --arc <arc>', 'Filter by arc')
  .action(async (opts) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageResultsSaveAll({ arc: opts.arc }, client);
      console.log(`💾 Saved ${result.saved} results`);
      for (const r of result.results) {
        console.log(`   ${r.id} → ${r.s3Key}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// mage commit
mage
  .command('commit')
  .description('Commit saved images to GitHub repos')
  .option('-m, --message <message>', 'Custom commit message')
  .action(async (opts) => {
    try {
      const config = loadConfig();
      const client = createGraphQLClient(config.publisherApiUrl, config.publisherApiKey);
      const result = await mageCommit({ message: opts.message }, client);

      if (result.commits.length === 0) {
        console.log('ℹ️  Nothing to commit');
        return;
      }

      console.log('✅ Committed:');
      for (const commit of result.commits) {
        console.log(`   ${commit.repo}: ${commit.sha.slice(0, 7)} (${commit.filesCount} files)`);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });
