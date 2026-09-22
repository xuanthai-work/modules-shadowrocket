# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-22

### Added
- **New Modular Architecture**: Separated into `modules/stable/`, `modules/experimental/`, `modules/archived/`, and `scripts/{app}/`.
- **Automated Build Pipeline**: `tools/build.js` generates deterministic `dist/all-in-one.module` with deduplication and configurable `script-path` base URL.
- **Strict Validator**: `tools/validate.js` checks metadata, malformed sections, unrendered placeholders, broken local files, regex validity, duplicate rules/hosts.
- **Offline Unit Tests**: `tests/unit/test-scripts.js` using Node.js native test runner and mock Shadowrocket runtime environment (`$request`, `$response`, `$done`).
- **Compatibility Matrix**: `COMPATIBILITY.md` detailing status and limitations.
- **Security & Dependency Matrix**: `DEPENDENCIES.md` documenting external dependencies and risk levels.
- **GitHub Actions CI**: Automated validation, test suite, and clean build checks on every push and PR.
- **Standalone Bilibili Module**: Extracted standalone `modules/experimental/bilibili.module` from the old monolithic config.

### Changed
- **Reworked YouTube module** to a "full blocker" superset (structure credits: @DivineEngine, @app2smile, @Maasea, @VirgilClyne, @ddgksf2013, @deezertidal). Combines two complementary mechanisms: (1) the vendored Maasea scripts (Apache-2.0, pinned `65075cd`) via three handlers — `youtube.response` (UI-ad removal, PiP/background, caption/lyric translation; pattern covers `browse|next|player|search|reel/reel_watch_sequence|guide|account/get_setting|get_watch|log_event|config`), `youtube.request.init` (googlevideo initplayback `&ack` bootstrap), and `youtube.request.log_event`; and (2) `[URL Rewrite]` rules that block video-layer ads (`initplayback&oad`, `&oad` overlays, `stats/ads`, `pagead|ptracking`, `qoe?adcontext`, and `ctier=L` quality-tier removal). Converted the upstream `[Map Local]` initplayback rule into an equivalent `[URL Rewrite] reject-200`; ensured the `videoplayback\?` exclusion is escaped. Replaced Surge-style `{{{...}}}` templates with concrete default JSON (unquoted booleans); no `engine=script`. MITM: `-redirector*.googlevideo.com, *.googlevideo.com, www.youtube.com, s.youtube.com, youtubei.googleapis.com`. Runtime not verified.
- Reorganized `js/` directory into structured `scripts/{app}/` with consistent naming conventions.
- Standardized metadata headers (`#!name`, `#!desc`, `#!author`, `#!version`, `#!last-tested`, `#!homepage`) across all modules.
- Replaced unrendered `{{{...}}}` placeholders in YouTube module arguments with sensible defaults (`debug: false`, `enablePIP: true`).
- Commented out untrusted, unpinned external protobuf scripts in Bilibili module.
- Relocated `spotify.module`, `duolingo.module`, `soundcloud.module`, and `bilibili.module` to `modules/experimental/`.
- Updated README with MITM security notice, installation guides, and testing workflow.

### Fixed
- Fixed critical syntax error in `all-in-one.conf` where `[Script]` was corrupted as `Script]`.
- Resolved fragmented multiple `[MITM]`, `[Script]`, and `[URL Rewrite]` blocks into a unified build process.
- Replaced hardcoded `raw.githubusercontent.com/dhungx/.../main/` URLs with relative paths and dynamic build base URLs.
- Fixed `TypeError: Assignment to constant variable` in Duolingo `super.js` on the `/subscribers/` endpoint by declaring `body` with `let` instead of `const`; removed the now-stale "known bug" note from `modules/experimental/duolingo.module`.
- `tools/build.js`: `--include-experimental` now merges `modules/stable/` + `modules/experimental/` (no hardcoded module list); an empty `modules/stable/` without the flag now produces an explicit, clearly-labelled empty `all-in-one.module` instead of a misleading partial merge.
- `tools/validate.js`: now requires `#!last-tested` and `#!homepage` metadata (in addition to `#!name`, `#!desc`, `#!author`, `#!version`) and validates direct inline regex patterns in `[Rewrite]` sections.
