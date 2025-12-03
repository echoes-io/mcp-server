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
