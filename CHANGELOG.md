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
- **Replaced the YouTube implementation** with the wiring from `duyvinh09/Module_IOS` `All_In_One.conf` (script commit `34865755`, 2025-05-20). `youtube.request` and `youtube.response` both call the pinned external `js/youtube.response.js`. Kept UDP/QUIC rejects, the googlevideo/stats/pagead/ptracking/qoe/`ctier` URL rewrites, and translated `[Map Local]` `initplayback&oad` to `[URL Rewrite] reject-200`. Dropped `engine=jsc` / `engine={{{script}}}` (not Shadowrocket syntax) and replaced any `{{{...}}}` arguments with the conf defaults (`lyricLang`/`captionLang` `vi`, `blockUpload`/`blockImmersive` true, `debug` false). Removed the vendored Maasea scripts because that repo has no license, so the script is not copied. The upstream `.sgmodule` still points at missing `youtube.response.preview.js` and was not used. Static validation passed; runtime compatibility not verified.
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
