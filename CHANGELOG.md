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
- Documented known `TypeError: Assignment to constant variable` bug in Duolingo script on `/subscribers/` endpoint.
