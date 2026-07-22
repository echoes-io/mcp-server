# [8.1.0](https://github.com/echoes-io/mcp-server/compare/v8.0.1...v8.1.0) (2026-03-09)





## [10.0.1](https://github.com/echoes-io/mcp-server/compare/v10.0.0...v10.0.1) (2026-07-22)


### Bug Fixes

* align GraphQL queries and types to actual publisher schema ([76c30bf](https://github.com/echoes-io/mcp-server/commit/76c30bf164ee80597f6d956a09561f98f4a92f71))

## [10.0.0](https://github.com/echoes-io/mcp-server/compare/v9.0.0...v10.0.0) (2026-07-22)


### ⚠ BREAKING CHANGES

* all tools except words-count removed and replaced with mage_* tools
* remove lib/database/ and lib/indexer/ modules, all RAG operations now go through @flowrag/* packages.
* **consistency:** None
* Complete migration from Python to TypeScript/Node.js
* complete TypeScript migration to v6.0.0
* Complete rewrite of the MCP server from TypeScript to Python for access to superior ML/NLP ecosystem (LlamaIndex PropertyGraphIndex, spaCy, sentence-transformers).
* Complete GraphRAG implementation with hybrid fallback system
* Complete restructure of src/ folder, removed all previous implementations
* Remove dependencies on @echoes-io/models and @echoes-io/utils packages
* 'e5-large' provider no longer supported, use 'embeddinggemma' instead

### Features

* :arrow_up: Fixed package-lock ([9add583](https://github.com/echoes-io/mcp-server/commit/9add583c37b25f173063056192e509e81e797e14))
* :sparkles: Added `chapter-delete` and auto delete during sync ([b036211](https://github.com/echoes-io/mcp-server/commit/b03621166e30c1004d29e9267ecada70862974a3))
* :sparkles: Added the `book-generate` tool ([2922659](https://github.com/echoes-io/mcp-server/commit/292265933dd9729a9dca37b16a684363207a92fd))
* :sparkles: Added the `chapter-info`, `episode-info`, `words-count` and `timeline-sync` tools ([5212852](https://github.com/echoes-io/mcp-server/commit/521285285103b3e432e329c34bee2fdd02d06abd))
* :sparkles: Added the `chapter-refresh` tool ([0c632ee](https://github.com/echoes-io/mcp-server/commit/0c632ee601683f5b9c7ffd8c567c1a9dfb8d641b))
* :sparkles: Added the `stats` tool ([82afd12](https://github.com/echoes-io/mcp-server/commit/82afd126117ad8932b7026258d5ac0f0d682d386))
* :sparkles: Added the ability to be multi timeline ([6902de1](https://github.com/echoes-io/mcp-server/commit/6902de15fe5b83db6fd0912a1288fe01f62167b5))
* :sparkles: Added the new version of rag to index characters ([bec4e90](https://github.com/echoes-io/mcp-server/commit/bec4e90ccd045d350c236b670743ae719ee64549))
* :sparkles: Added the rag system ([04e8956](https://github.com/echoes-io/mcp-server/commit/04e895643b0f5dd18a611a7bf49e9383a2fb6780))
* :sparkles: Added the rag-context tool ([40c2133](https://github.com/echoes-io/mcp-server/commit/40c21334714bedcc3c90cbc1263997d01e4c4fcf))
* :sparkles: Added the tool to view the version ([2f70cfe](https://github.com/echoes-io/mcp-server/commit/2f70cfe6d5816002a812869dc2147bd4dea2e005))
* :sparkles: First empty implementation of the mcp server ([d098da2](https://github.com/echoes-io/mcp-server/commit/d098da2f1910f7673f45e212e18707cb1cca6ac1))
* :sparkles: Moving the `timeline` config from env var to param ([0abb622](https://github.com/echoes-io/mcp-server/commit/0abb62256a4f4136f4a1904eb870b10ffca4f955))
* add arc-resume tool for loading arc context ([f0feeac](https://github.com/echoes-io/mcp-server/commit/f0feeac876aba50bb185604e95d3cdcd86df7d2b))
* add automatic timeline detection for CLI commands ([be58d0a](https://github.com/echoes-io/mcp-server/commit/be58d0ac37547f5ce6cebf0e114dce03e5cab274))
* add early spaCy model validation in CLI ([397e1f6](https://github.com/echoes-io/mcp-server/commit/397e1f6972bb45db12f98003c42e46c7f90e4615))
* add episode-update tool and enhance chapter-delete ([b4ccad1](https://github.com/echoes-io/mcp-server/commit/b4ccad1d2939d985bc398980d7814f710f74c745))
* add timeline-overview tool ([177ac2b](https://github.com/echoes-io/mcp-server/commit/177ac2b0f88c650385b5eebb21c49651efd8a70f))
* **cli:** add list command for entities and relations ([43cda96](https://github.com/echoes-io/mcp-server/commit/43cda968e3f80a1ae418356317c876b303849d6b))
* **cli:** add progress bar for index command with listr2 ([ff14668](https://github.com/echoes-io/mcp-server/commit/ff1466851c0e05e73c2ee86feaba09cd7a3cc2f4))
* **cli:** add progress bar with ETA and summary stats ([eef3d37](https://github.com/echoes-io/mcp-server/commit/eef3d376abdce3a1bb9318ad7d90791d5ece9da8))
* complete Human-in-the-Loop (HITL) review system - Phase 2 ([7b26a84](https://github.com/echoes-io/mcp-server/commit/7b26a847177bcb8237b1a284b2c8133680cde8a1))
* complete TypeScript migration to v6.0.0 ([1eee88e](https://github.com/echoes-io/mcp-server/commit/1eee88e4ff7db5ea4d24748a23010443046995a0))
* configurable embedding model via ECHOES_EMBEDDING_MODEL env var ([c36ba24](https://github.com/echoes-io/mcp-server/commit/c36ba24b6e2cc8cbecf3e104d53d0b6259176675))
* **consistency:** complete outfit-claims rule and achieve 100% test coverage ([f54df05](https://github.com/echoes-io/mcp-server/commit/f54df05946a6e8025f18c09c3dee4948b32e949d))
* **database:** add schema versioning for controlled migrations ([2a0d8d9](https://github.com/echoes-io/mcp-server/commit/2a0d8d9f1864016f2ffec7ee500bca1aae20d8e7))
* **db:** add arc isolation for entities and relations ([161df44](https://github.com/echoes-io/mcp-server/commit/161df44dce9bc8293c57ae48273146c23d1c34c0))
* **embeddings:** add dtype support for quantized models ([1012933](https://github.com/echoes-io/mcp-server/commit/101293329424f8a94baab58ee3157d71b3aa758a))
* enhance semantic search with advanced embedding models ([1ebd969](https://github.com/echoes-io/mcp-server/commit/1ebd96947d9f5c61642fd32a1d98d11b65257dbc))
* enhance semantic search with advanced embedding models ([c822672](https://github.com/echoes-io/mcp-server/commit/c822672fac78cb2d290c476c318fe73d9f047a5a))
* **extractor:** add LLM-based entity/relation extraction with Gemini 3 Flash ([27b8a14](https://github.com/echoes-io/mcp-server/commit/27b8a14f9ea88cd2e0f8cab5c5db862ebabcbb69))
* finalize v6.0.0 release with TypeScript migration ([e8bb838](https://github.com/echoes-io/mcp-server/commit/e8bb83895a6476bdfa5fb9fd4fd1cca31e81324c))
* implement complete storage layer with Drizzle ORM and vector search ([0262331](https://github.com/echoes-io/mcp-server/commit/0262331aecffceaf75b113d1bef4f1391ce11dab))
* implement core types and markdown utilities with comprehensive tests ([61d0209](https://github.com/echoes-io/mcp-server/commit/61d02094afe204f4333bb4c816598444decd62c9))
* implement dual MCP/CLI interface with words-count tool ([fbfe0f9](https://github.com/echoes-io/mcp-server/commit/fbfe0f99aaeb31cf5067237aa149d40791f7f3ef))
* implement graph-export tool with Mermaid, JSON, and DOT formats ([0857736](https://github.com/echoes-io/mcp-server/commit/0857736c0d788ebc0722fc5892fcf5143edf6ec9))
* implement GraphRAG system with Italian character NER ([f16ca23](https://github.com/echoes-io/mcp-server/commit/f16ca2392b138ef023fc76c9c1d293db8de72b4c))
* implement history tool for character arc tracking ([7be0419](https://github.com/echoes-io/mcp-server/commit/7be0419d146e172d96cf967f7c91f7c48bf5802c))
* implement Human-in-the-Loop (HITL) review system - Phase 1 ([25ec2d5](https://github.com/echoes-io/mcp-server/commit/25ec2d593f343bd1884e72646b90e3222bcadc66))
* implement index-rag tool for GraphRAG chapter indexing ([056cee1](https://github.com/echoes-io/mcp-server/commit/056cee146682942dff5b9bbf72b17568166726fe))
* implement index-tracker tool for filesystem to database sync ([ab821cf](https://github.com/echoes-io/mcp-server/commit/ab821cf0904c91f4df55ab0903ed7d1c8d1dd3c3))
* implement rag-search tool for semantic chapter search ([32e5727](https://github.com/echoes-io/mcp-server/commit/32e5727bd1c7bb6c064ea5c42420e8b447490849))
* improve database management and spaCy handling ([ba42229](https://github.com/echoes-io/mcp-server/commit/ba422291d6be6bd0ce407ba8cc1b59f3c7963871))
* **index:** auto-reindex when package version changes ([e511b17](https://github.com/echoes-io/mcp-server/commit/e511b17f55b7f572489c69c424af06e3ea48a1f6))
* **index:** store entities and relations in LanceDB ([cd1d71f](https://github.com/echoes-io/mcp-server/commit/cd1d71f61f00c0b080bc9e5620b67e12b08df382))
* **kiro:** migrate from Amazon Q to Kiro agent configuration ([cb6860d](https://github.com/echoes-io/mcp-server/commit/cb6860d8aa1bbac138c1df7f20b68e4ca48e2145))
* migrate from TypeScript to Python ([b24c088](https://github.com/echoes-io/mcp-server/commit/b24c088b1602a98d5d26ddc37e20f9079c90f2d9))
* **prompts:** add dynamic MCP prompts with placeholder substitution ([d78e755](https://github.com/echoes-io/mcp-server/commit/d78e755a23b747a794a312282e9417b1c67937d8))
* **prompts:** add revise-arc prompt for arc-wide review ([6c470c2](https://github.com/echoes-io/mcp-server/commit/6c470c2a35b7e7ab97825f8b8e059f9b90e8ac00))
* **prompts:** implement MCP prompts system for timeline content creation ([deb9b85](https://github.com/echoes-io/mcp-server/commit/deb9b85216523a85ebe392514091a0b01eddb639))
* rename agent from 'default' to 'dev' and add code tool ([73abe4d](https://github.com/echoes-io/mcp-server/commit/73abe4de83b317cb0759aa9e91f587b13e522064))
* replace custom RAG with FlowRAG pipeline ([061ddf5](https://github.com/echoes-io/mcp-server/commit/061ddf51e7ec2aaec02ad8ff85113a6ec79041b0))
* revamp to thin GraphQL client for Mage image generation ([1296862](https://github.com/echoes-io/mcp-server/commit/129686247f3e15d9c1738bd4835064827cefab03))
* **search:** implement search-entities and search-relations tools ([e7a3c1c](https://github.com/echoes-io/mcp-server/commit/e7a3c1ca5793e83369c0d54efbcedc01cd956802))


### Bug Fixes

* :ambulance: Fixed a ricorsion ([6250563](https://github.com/echoes-io/mcp-server/commit/62505632c335d0b7530ce9827fbc1d54933bbc6c))
* :ambulance: Fixed string parsing and error display ([bbde118](https://github.com/echoes-io/mcp-server/commit/bbde1183b6cec0fc08e6a85342042db479da76b0))
* :bug: Fixed a bug preventing to create chapters ([f782718](https://github.com/echoes-io/mcp-server/commit/f7827186b48a79dc21b8462cf2e24c3b5acd2c76))
* :bug: Fixed the rag indexing with multi-arc in mind ([f2f47c8](https://github.com/echoes-io/mcp-server/commit/f2f47c8da30ac1141601060373fc4ad2e1d62319))
* :bug: Fixing bad filename template and episode 0 ([42eded5](https://github.com/echoes-io/mcp-server/commit/42eded5cb0f4c4129e463bf5595af563aa6ebf53))
* :construction_worker: Fixing the release process ([50d13f4](https://github.com/echoes-io/mcp-server/commit/50d13f47d3578057f3ca2abc34a772dee8506d3e))
* :white_check_mark: Fixed test model ([8d65cf7](https://github.com/echoes-io/mcp-server/commit/8d65cf71bac70b1532db193fdaba2d77b5378de7))
* **ci:** add model pre-download to prevent protobuf parsing failures ([9856b49](https://github.com/echoes-io/mcp-server/commit/9856b498b835cac04cc0484df2cff43e81307a26))
* **ci:** build with uv in workflow instead of semantic-release container ([6720b8f](https://github.com/echoes-io/mcp-server/commit/6720b8f1ecad17c69d676d7d54053decb739cfa3))
* **ci:** build with uv in workflow instead of semantic-release container ([e2877d3](https://github.com/echoes-io/mcp-server/commit/e2877d383a3a25cf5d90b5a721e39746914a2506))
* **ci:** configure git identity for release commits ([ff6ccf4](https://github.com/echoes-io/mcp-server/commit/ff6ccf4acdf51e56ad6b8ba4cc36e90414bf6007))
* **deps:** resolve all npm audit vulnerabilities ([f6fcb94](https://github.com/echoes-io/mcp-server/commit/f6fcb947151fac3c5e531f19bb255e1c1459cfe7))
* improve CLI defaults and UX ([50f1ab3](https://github.com/echoes-io/mcp-server/commit/50f1ab3d0b65928716c8aed52a8832191da6e0f7))
* prevent arc-resume from writing chapters without user confirmation ([236b2b7](https://github.com/echoes-io/mcp-server/commit/236b2b718d0a49438103dd4352964a9bd6ef0f0c))
* resolve biome lint warnings ([3271c8a](https://github.com/echoes-io/mcp-server/commit/3271c8ad862c95446d030e4be35cce286d88a0d6))
* **scanner:** normalize POV to lowercase ([7fc77fe](https://github.com/echoes-io/mcp-server/commit/7fc77fe919880d61499baf4a3d3460f5fb3fad03))
* **server:** add quiet mode to prevent MCP stdout corruption ([acdfe83](https://github.com/echoes-io/mcp-server/commit/acdfe836992b2bd4c4e1a3d7d65a0a1c8e6eabe9))
* **server:** require absolute paths for file and content_path parameters ([8396f0c](https://github.com/echoes-io/mcp-server/commit/8396f0c567bfc8cc65019a419ecc95865330df4a))
* specify explicit version in CLI for uvx compatibility ([6e6115f](https://github.com/echoes-io/mcp-server/commit/6e6115fd0c614d19ac52e624c1fd17ac38f4bfbb))
* stdio_server is a context manager, not a coroutine ([e95903a](https://github.com/echoes-io/mcp-server/commit/e95903a46be4be3668b7e34ccc80d1ee714d9d9c))
* update RAG provider types to match @echoes-io/rag v1.3.1 ([b500adb](https://github.com/echoes-io/mcp-server/commit/b500adb59bb55540fd1babb1eb4c09f8fb3acd49))
* use absolute import for spaCy utils in CLI ([ec180a4](https://github.com/echoes-io/mcp-server/commit/ec180a4059b3bf3e38582959ef32d26d1e211992))
* use absolute imports for uvx compatibility ([720bb8c](https://github.com/echoes-io/mcp-server/commit/720bb8cdb4e16861498edfcd020e210b52ae0156))


### Performance Improvements

* :arrow_up: Upped `@echoes-io/utils` to better support word counting ([19f4e90](https://github.com/echoes-io/mcp-server/commit/19f4e90888deaf4d334d1c971d853bca65fda1c6))
* :arrow_up: Upped `rag`, moving to `llamaindex` and `lancedb` ([fe919f7](https://github.com/echoes-io/mcp-server/commit/fe919f776862f8e0148b967e59d20a1ee88938ad))
* :arrow_up: Upped deps ([838557b](https://github.com/echoes-io/mcp-server/commit/838557b3205ec95351a8de878cfd48d7e6d9e61b))
* :fire: Removed `excerpt` in place of `summary` ([7462f78](https://github.com/echoes-io/mcp-server/commit/7462f78bc77692935dc6824d144c0865721eaea8))
* :sparkles: Using rag with sqlite ([cd4e746](https://github.com/echoes-io/mcp-server/commit/cd4e746cd265cc848a020f10f6466b16df8807ab))
* :truck: moved "arc-resume" from tool to input ([f8b9337](https://github.com/echoes-io/mcp-server/commit/f8b9337edc43959469c823d476e5b6ff39debcb4))
* :truck: Moved `chapter.excerpt` to `chapter.summary` and `chapter.date` type from `Date` to `string` ([8c0a1c9](https://github.com/echoes-io/mcp-server/commit/8c0a1c9b2921513f38e2cd9a21f196f1a83ade67))
* :truck: Renamed raf_data to rag ([af367f5](https://github.com/echoes-io/mcp-server/commit/af367f5336c678c7670214cad2be4ecd728aa96d))
* :zap: Using timeline as env var ([2097684](https://github.com/echoes-io/mcp-server/commit/20976847a9998c76efe522c4ae568caf26c49372))
* **ci:** releasing also on Github ([5022777](https://github.com/echoes-io/mcp-server/commit/5022777da9a7bf6423f133598b4eb89caaa80c80))
* **server:** add debug-cwd tool for troubleshooting path issues ([606968a](https://github.com/echoes-io/mcp-server/commit/606968abaa63713da59d80e6baaa39aae794dd4e))
* **server:** add debug-cwd tool for troubleshooting path issues ([0bff1f9](https://github.com/echoes-io/mcp-server/commit/0bff1f9f51944196beaeaadb24334d8d29a19df2))
* **server:** remove debug-cwd tool after path issue resolved ([d24d16e](https://github.com/echoes-io/mcp-server/commit/d24d16e25752616382eacba20dcc3944201f5dd0))


### Code Refactoring

* consolidate types, schemas and utils into src/ ([851400f](https://github.com/echoes-io/mcp-server/commit/851400fd400310e153a780e60e97d2dfef1c5d86))

## [9.0.0] - 2026-07-22

### 💥 Breaking Changes

- feat!: revamp to thin GraphQL client for Mage image generation

### 🐛 Bug Fixes

- fix(ci): configure git identity for release commits
- fix: resolve biome lint warnings
- fix(deps): resolve all npm audit vulnerabilities

### ### chore

- chore: :bookmark: release
- chore(deps): update all dependencies to latest versions
- chore: :bookmark: release
- chore(deps): bump zod ^4.3.6 → ^4.4.1
- chore(deps): bump flowrag packages to latest versions

### ### ci

- ci: drop node 20, test on 22+24, release on node 22

### ### build

- build: migrate from semantic-release to bonvoy

## [8.1.1] - 2026-05-13

### 🐛 Bug Fixes

- fix(ci): configure git identity for release commits
- fix: resolve biome lint warnings
- fix(deps): resolve all npm audit vulnerabilities

### ### chore

- chore(deps): update all dependencies to latest versions
- chore: :bookmark: release
- chore(deps): bump zod ^4.3.6 → ^4.4.1
- chore(deps): bump flowrag packages to latest versions

### ### ci

- ci: drop node 20, test on 22+24, release on node 22

### ### build

- build: migrate from semantic-release to bonvoy

## [8.1.0] - 2026-04-30

### 🐛 Bug Fixes

- fix(ci): configure git identity for release commits
- fix: resolve biome lint warnings
- fix(deps): resolve all npm audit vulnerabilities

### ### ci

- ci: drop node 20, test on 22+24, release on node 22

### ### build

- build: migrate from semantic-release to bonvoy

### ### chore

- chore(deps): bump zod ^4.3.6 → ^4.4.1
- chore(deps): bump flowrag packages to latest versions

### Features

* add timeline-overview tool ([177ac2b](https://github.com/echoes-io/mcp-server/commit/177ac2b0f88c650385b5eebb21c49651efd8a70f))

## [8.0.1](https://github.com/echoes-io/mcp-server/compare/v8.0.0...v8.0.1) (2026-03-08)


### Bug Fixes

* prevent arc-resume from writing chapters without user confirmation ([236b2b7](https://github.com/echoes-io/mcp-server/commit/236b2b718d0a49438103dd4352964a9bd6ef0f0c))

# [8.0.0](https://github.com/echoes-io/mcp-server/compare/v7.1.1...v8.0.0) (2026-03-08)


* feat!: replace custom RAG with FlowRAG pipeline ([061ddf5](https://github.com/echoes-io/mcp-server/commit/061ddf51e7ec2aaec02ad8ff85113a6ec79041b0))


### BREAKING CHANGES

* remove lib/database/ and lib/indexer/ modules,
all RAG operations now go through @flowrag/* packages.

- Add FlowRAG integration layer (lib/rag/): schema, parser, factory
- Rewire all tools to use FlowRAG storage (KV, vector, graph)
- Drop Mermaid export (JSON/DOT only)
- Remove direct deps: @google/genai, @huggingface/transformers,
  apache-arrow, @lancedb/lancedb, listr2
- Fix all 12 lint warnings (no-explicit-any, unused imports, formatting)
- Exclude type-only files from coverage
- Achieve 100% line/function coverage, 82% branch (249 tests)
- Delete ~930 LOC of custom RAG code (-4301/+2673 net)

## [7.1.1](https://github.com/echoes-io/mcp-server/compare/v7.1.0...v7.1.1) (2026-01-20)


### Performance Improvements

* :truck: moved "arc-resume" from tool to input ([f8b9337](https://github.com/echoes-io/mcp-server/commit/f8b9337edc43959469c823d476e5b6ff39debcb4))

# [7.1.0](https://github.com/echoes-io/mcp-server/compare/v7.0.0...v7.1.0) (2026-01-19)


### Features

* add arc-resume tool for loading arc context ([f0feeac](https://github.com/echoes-io/mcp-server/commit/f0feeac876aba50bb185604e95d3cdcd86df7d2b))

# [7.0.0](https://github.com/echoes-io/mcp-server/compare/v6.2.0...v7.0.0) (2026-01-05)


### Features

* complete Human-in-the-Loop (HITL) review system - Phase 2 ([7b26a84](https://github.com/echoes-io/mcp-server/commit/7b26a847177bcb8237b1a284b2c8133680cde8a1))
* **consistency:** complete outfit-claims rule and achieve 100% test coverage ([f54df05](https://github.com/echoes-io/mcp-server/commit/f54df05946a6e8025f18c09c3dee4948b32e949d))
* implement graph-export tool with Mermaid, JSON, and DOT formats ([0857736](https://github.com/echoes-io/mcp-server/commit/0857736c0d788ebc0722fc5892fcf5143edf6ec9))
* implement history tool for character arc tracking ([7be0419](https://github.com/echoes-io/mcp-server/commit/7be0419d146e172d96cf967f7c91f7c48bf5802c))
* implement Human-in-the-Loop (HITL) review system - Phase 1 ([25ec2d5](https://github.com/echoes-io/mcp-server/commit/25ec2d593f343bd1884e72646b90e3222bcadc66))


### BREAKING CHANGES

* **consistency:** None

Closes: Phase 2 Consistency Checker completion
Coverage: 100% (statements, functions, lines), 94.44% branches
Tests: 267 tests passing, 0 linting warnings

# [6.2.0](https://github.com/echoes-io/mcp-server/compare/v6.1.0...v6.2.0) (2025-12-28)


### Bug Fixes

* improve CLI defaults and UX ([50f1ab3](https://github.com/echoes-io/mcp-server/commit/50f1ab3d0b65928716c8aed52a8832191da6e0f7))


### Features

* **cli:** add list command for entities and relations ([43cda96](https://github.com/echoes-io/mcp-server/commit/43cda968e3f80a1ae418356317c876b303849d6b))
* **database:** add schema versioning for controlled migrations ([2a0d8d9](https://github.com/echoes-io/mcp-server/commit/2a0d8d9f1864016f2ffec7ee500bca1aae20d8e7))
* **embeddings:** add dtype support for quantized models ([1012933](https://github.com/echoes-io/mcp-server/commit/101293329424f8a94baab58ee3157d71b3aa758a))

# [6.1.0](https://github.com/echoes-io/mcp-server/compare/v6.0.0...v6.1.0) (2025-12-27)


### Features

* :arrow_up: Fixed package-lock ([9add583](https://github.com/echoes-io/mcp-server/commit/9add583c37b25f173063056192e509e81e797e14))
* **cli:** add progress bar for index command with listr2 ([ff14668](https://github.com/echoes-io/mcp-server/commit/ff1466851c0e05e73c2ee86feaba09cd7a3cc2f4))

# [6.0.0](https://github.com/echoes-io/mcp-server/compare/v5.8.2...v6.0.0) (2025-12-27)


* feat!: finalize v6.0.0 release with TypeScript migration ([e8bb838](https://github.com/echoes-io/mcp-server/commit/e8bb83895a6476bdfa5fb9fd4fd1cca31e81324c))


### BREAKING CHANGES

* Complete migration from Python to TypeScript/Node.js

- Migrated from Python to TypeScript/Node.js 20+
- Removed spaCy dependency - Gemini-only entity extraction
- Changed installation from uvx to npx echoes-mcp-server
- Requires GEMINI_API_KEY environment variable (no fallback)
- Reduced installation size from ~2GB to ~100MB
- Maintained 100% LanceDB schema compatibility with v5
- Centralized constants in lib/constants.ts
- Added model pre-download for CI stability

## [5.8.2](https://github.com/echoes-io/mcp-server/compare/v5.8.1...v5.8.2) (2025-12-27)


### Bug Fixes

* :white_check_mark: Fixed test model ([8d65cf7](https://github.com/echoes-io/mcp-server/commit/8d65cf71bac70b1532db193fdaba2d77b5378de7))
* **ci:** add model pre-download to prevent protobuf parsing failures ([9856b49](https://github.com/echoes-io/mcp-server/commit/9856b498b835cac04cc0484df2cff43e81307a26))

## [4.1.1](https://github.com/echoes-io/mcp-server/compare/v4.1.0...v4.1.1) (2025-12-20)


### Bug Fixes

* :construction_worker: Fixing the release process ([50d13f4](https://github.com/echoes-io/mcp-server/commit/50d13f47d3578057f3ca2abc34a772dee8506d3e))

# [4.1.0](https://github.com/echoes-io/mcp-server/compare/v4.0.0...v4.1.0) (2025-12-20)


### Features

* add automatic timeline detection for CLI commands ([be58d0a](https://github.com/echoes-io/mcp-server/commit/be58d0ac37547f5ce6cebf0e114dce03e5cab274))

# [4.0.0](https://github.com/echoes-io/mcp-server/compare/v3.0.0...v4.0.0) (2025-12-19)


### Features

* :sparkles: Added the rag-context tool ([40c2133](https://github.com/echoes-io/mcp-server/commit/40c21334714bedcc3c90cbc1263997d01e4c4fcf))
* implement complete storage layer with Drizzle ORM and vector search ([0262331](https://github.com/echoes-io/mcp-server/commit/0262331aecffceaf75b113d1bef4f1391ce11dab))
* implement core types and markdown utilities with comprehensive tests ([61d0209](https://github.com/echoes-io/mcp-server/commit/61d02094afe204f4333bb4c816598444decd62c9))
* implement dual MCP/CLI interface with words-count tool ([fbfe0f9](https://github.com/echoes-io/mcp-server/commit/fbfe0f99aaeb31cf5067237aa149d40791f7f3ef))
* implement GraphRAG system with Italian character NER ([f16ca23](https://github.com/echoes-io/mcp-server/commit/f16ca2392b138ef023fc76c9c1d293db8de72b4c))
* implement index-rag tool for GraphRAG chapter indexing ([056cee1](https://github.com/echoes-io/mcp-server/commit/056cee146682942dff5b9bbf72b17568166726fe))
* implement index-tracker tool for filesystem to database sync ([ab821cf](https://github.com/echoes-io/mcp-server/commit/ab821cf0904c91f4df55ab0903ed7d1c8d1dd3c3))
* implement rag-search tool for semantic chapter search ([32e5727](https://github.com/echoes-io/mcp-server/commit/32e5727bd1c7bb6c064ea5c42420e8b447490849))


### BREAKING CHANGES

* Complete GraphRAG implementation with hybrid fallback system

Features:
- Add GraphRAG with semantic, character, temporal, and location edges
- Implement hybrid RAG system (GraphRAG primary + sqlite-vec fallback)
- Create ItalianCharacterNER with 90%+ accuracy for character detection
- Add database synchronization for timeline/arc/episode/chapter records
- Support BGE-Base-v1.5, E5-Small-v2, and Gemini embedding providers

Performance:
- Index 466 chapters in <1 second (558 chapters/second)
- Sub-second search queries on large datasets
- Memory efficient: <50MB for 466 chapters
- Graceful fallback system ensures 100% uptime

Testing:
- Add full-scale integration tests with real timeline data
- Comprehensive character extraction validation
- Performance benchmarks and memory usage analysis
- 9/9 integration tests passing

Technical Implementation:
- GraphRAG: 4 edge types (semantic, character, temporal, location)
- Character NER: 100+ Italian common words filtering
- Database sync: Auto-create timeline hierarchy
- Hybrid search: GraphRAG → vector fallback with timeout protection
- Content-aware embeddings for realistic similarity scoring

Closes: Phase 1 (consolidation), Phase 2 (GraphRAG), Phase 3 (character detection)
Progress: 85% roadmap complete, ready for Phase 4 (missing MCP tools)
* Complete restructure of src/ folder, removed all previous implementations

# [3.0.0](https://github.com/echoes-io/mcp-server/compare/v2.2.0...v3.0.0) (2025-12-18)


### Code Refactoring

* consolidate types, schemas and utils into src/ ([851400f](https://github.com/echoes-io/mcp-server/commit/851400fd400310e153a780e60e97d2dfef1c5d86))


### BREAKING CHANGES

* Remove dependencies on @echoes-io/models and @echoes-io/utils packages

# [2.2.0](https://github.com/echoes-io/mcp-server/compare/v2.1.0...v2.2.0) (2025-12-16)


### Features

* enhance semantic search with advanced embedding models ([1ebd969](https://github.com/echoes-io/mcp-server/commit/1ebd96947d9f5c61642fd32a1d98d11b65257dbc))

# [2.1.0](https://github.com/echoes-io/mcp-server/compare/v2.0.0...v2.1.0) (2025-12-16)


### Features

* enhance semantic search with advanced embedding models ([c822672](https://github.com/echoes-io/mcp-server/commit/c822672fac78cb2d290c476c318fe73d9f047a5a))

# [2.0.0](https://github.com/echoes-io/mcp-server/compare/v1.9.1...v2.0.0) (2025-12-16)


### Bug Fixes

* update RAG provider types to match @echoes-io/rag v1.3.1 ([b500adb](https://github.com/echoes-io/mcp-server/commit/b500adb59bb55540fd1babb1eb4c09f8fb3acd49))


### BREAKING CHANGES

* 'e5-large' provider no longer supported, use 'embeddinggemma' instead

## [1.9.1](https://github.com/echoes-io/mcp-server/compare/v1.9.0...v1.9.1) (2025-12-15)


### Performance Improvements

* :arrow_up: Upped `rag`, moving to `llamaindex` and `lancedb` ([fe919f7](https://github.com/echoes-io/mcp-server/commit/fe919f776862f8e0148b967e59d20a1ee88938ad))

# [1.9.0](https://github.com/echoes-io/mcp-server/compare/v1.8.2...v1.9.0) (2025-12-12)


### Features

* rename agent from 'default' to 'dev' and add code tool ([73abe4d](https://github.com/echoes-io/mcp-server/commit/73abe4de83b317cb0759aa9e91f587b13e522064))

## [1.8.2](https://github.com/echoes-io/mcp-server/compare/v1.8.1...v1.8.2) (2025-12-11)


### Performance Improvements

* :arrow_up: Upped `@echoes-io/utils` to better support word counting ([19f4e90](https://github.com/echoes-io/mcp-server/commit/19f4e90888deaf4d334d1c971d853bca65fda1c6))

## [1.8.1](https://github.com/echoes-io/mcp-server/compare/v1.8.0...v1.8.1) (2025-12-09)


### Bug Fixes

* :ambulance: Fixed a ricorsion ([6250563](https://github.com/echoes-io/mcp-server/commit/62505632c335d0b7530ce9827fbc1d54933bbc6c))

# [1.8.0](https://github.com/echoes-io/mcp-server/compare/v1.7.0...v1.8.0) (2025-12-06)


### Features

* **prompts:** implement MCP prompts system for timeline content creation ([deb9b85](https://github.com/echoes-io/mcp-server/commit/deb9b85216523a85ebe392514091a0b01eddb639))

# [1.7.0](https://github.com/echoes-io/mcp-server/compare/v1.6.0...v1.7.0) (2025-12-05)


### Features

* :sparkles: Added the ability to be multi timeline ([6902de1](https://github.com/echoes-io/mcp-server/commit/6902de15fe5b83db6fd0912a1288fe01f62167b5))


### Performance Improvements

* :arrow_up: Upped deps ([838557b](https://github.com/echoes-io/mcp-server/commit/838557b3205ec95351a8de878cfd48d7e6d9e61b))

# [1.6.0](https://github.com/echoes-io/mcp-server/compare/v1.5.0...v1.6.0) (2025-12-03)


### Features

* **kiro:** migrate from Amazon Q to Kiro agent configuration ([cb6860d](https://github.com/echoes-io/mcp-server/commit/cb6860d8aa1bbac138c1df7f20b68e4ca48e2145))

# [1.5.0](https://github.com/echoes-io/mcp-server/compare/v1.4.2...v1.5.0) (2025-11-03)


### Features

* :sparkles: Added the new version of rag to index characters ([bec4e90](https://github.com/echoes-io/mcp-server/commit/bec4e90ccd045d350c236b670743ae719ee64549))

## [1.4.2](https://github.com/echoes-io/mcp-server/compare/v1.4.1...v1.4.2) (2025-10-30)


### Bug Fixes

* :ambulance: Fixed string parsing and error display ([bbde118](https://github.com/echoes-io/mcp-server/commit/bbde1183b6cec0fc08e6a85342042db479da76b0))

## [1.4.1](https://github.com/echoes-io/mcp-server/compare/v1.4.0...v1.4.1) (2025-10-30)


### Performance Improvements

* :truck: Renamed raf_data to rag ([af367f5](https://github.com/echoes-io/mcp-server/commit/af367f5336c678c7670214cad2be4ecd728aa96d))

# [1.4.0](https://github.com/echoes-io/mcp-server/compare/v1.3.4...v1.4.0) (2025-10-30)


### Features

* :sparkles: Moving the `timeline` config from env var to param ([0abb622](https://github.com/echoes-io/mcp-server/commit/0abb62256a4f4136f4a1904eb870b10ffca4f955))

## [1.3.4](https://github.com/echoes-io/mcp-server/compare/v1.3.3...v1.3.4) (2025-10-29)


### Performance Improvements

* :truck: Moved `chapter.excerpt` to `chapter.summary` and `chapter.date` type from `Date` to `string` ([8c0a1c9](https://github.com/echoes-io/mcp-server/commit/8c0a1c9b2921513f38e2cd9a21f196f1a83ade67))

## [1.3.3](https://github.com/echoes-io/mcp-server/compare/v1.3.2...v1.3.3) (2025-10-29)


### Bug Fixes

* :bug: Fixing bad filename template and episode 0 ([42eded5](https://github.com/echoes-io/mcp-server/commit/42eded5cb0f4c4129e463bf5595af563aa6ebf53))

## [1.3.2](https://github.com/echoes-io/mcp-server/compare/v1.3.1...v1.3.2) (2025-10-28)


### Bug Fixes

* :bug: Fixed the rag indexing with multi-arc in mind ([f2f47c8](https://github.com/echoes-io/mcp-server/commit/f2f47c8da30ac1141601060373fc4ad2e1d62319))

## [1.3.1](https://github.com/echoes-io/mcp-server/compare/v1.3.0...v1.3.1) (2025-10-28)


### Bug Fixes

* :bug: Fixed a bug preventing to create chapters ([f782718](https://github.com/echoes-io/mcp-server/commit/f7827186b48a79dc21b8462cf2e24c3b5acd2c76))

# [1.3.0](https://github.com/echoes-io/mcp-server/compare/v1.2.0...v1.3.0) (2025-10-28)


### Features

* :sparkles: Added the `book-generate` tool ([2922659](https://github.com/echoes-io/mcp-server/commit/292265933dd9729a9dca37b16a684363207a92fd))


### Performance Improvements

* :sparkles: Using rag with sqlite ([cd4e746](https://github.com/echoes-io/mcp-server/commit/cd4e746cd265cc848a020f10f6466b16df8807ab))

# [1.2.0](https://github.com/echoes-io/mcp-server/compare/v1.1.0...v1.2.0) (2025-10-27)


### Features

* :sparkles: Added the rag system ([04e8956](https://github.com/echoes-io/mcp-server/commit/04e895643b0f5dd18a611a7bf49e9383a2fb6780))

# [1.1.0](https://github.com/echoes-io/mcp-server/compare/v1.0.0...v1.1.0) (2025-10-24)


### Features

* :sparkles: Added `chapter-delete` and auto delete during sync ([b036211](https://github.com/echoes-io/mcp-server/commit/b03621166e30c1004d29e9267ecada70862974a3))
* :sparkles: Added the `chapter-info`, `episode-info`, `words-count` and `timeline-sync` tools ([5212852](https://github.com/echoes-io/mcp-server/commit/521285285103b3e432e329c34bee2fdd02d06abd))
* :sparkles: Added the `chapter-refresh` tool ([0c632ee](https://github.com/echoes-io/mcp-server/commit/0c632ee601683f5b9c7ffd8c567c1a9dfb8d641b))
* :sparkles: Added the `stats` tool ([82afd12](https://github.com/echoes-io/mcp-server/commit/82afd126117ad8932b7026258d5ac0f0d682d386))
* add episode-update tool and enhance chapter-delete ([b4ccad1](https://github.com/echoes-io/mcp-server/commit/b4ccad1d2939d985bc398980d7814f710f74c745))


### Performance Improvements

* :zap: Using timeline as env var ([2097684](https://github.com/echoes-io/mcp-server/commit/20976847a9998c76efe522c4ae568caf26c49372))

# 1.0.0 (2025-10-23)


### Features

* :sparkles: First empty implementation of the mcp server ([d098da2](https://github.com/echoes-io/mcp-server/commit/d098da2f1910f7673f45e212e18707cb1cca6ac1))
