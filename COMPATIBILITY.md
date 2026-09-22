# Compatibility Matrix

> **Note**: Static validation passed; runtime compatibility not verified unless explicitly noted.

| Module | Upstream Date | Runtime Verified | App Version | iOS | Shadowrocket | Status | Notes |
| ------ | ------------- | ---------------- | ----------- | --- | ------------ | ------ | ----- |
| YouTube Premium | 2025-05-20 | ❌ Unverified | Not tested | Not tested | Not tested | 🧪 Experimental | Ported from `duyvinh09/Module_IOS` `All_In_One.conf`: UDP reject, URL rewrites, initplayback reject-200 (Map Local equivalent), `youtube.request` + `youtube.response` sharing pinned `js/youtube.response.js` (`34865755`). Script not vendored (no upstream license). Static validation passed; runtime compatibility not verified. |
| Locket Gold | 2025-04-03 | ❌ Unverified | Not tested | Not tested | Not tested | 🧪 Experimental | RevenueCat endpoint modification; depends on MITM decryption. Static validation passed; runtime compatibility not verified. |
| Spotify Premium | 2024-04-01 | ❌ Unverified | Not tested | Not tested | Not tested | 🧪 Experimental | Partial unlock only (extreme audio quality and backend auth impossible via MITM-only). Static validation passed; runtime compatibility not verified. |
| Duolingo Super | 2025-03-01 | ❌ Unverified | Not tested | Not tested | Not tested | ⚠ Partial | Likely blocked by TLS pinning in recent app builds. Fixed JS syntax `const body` reassignment; client-side unlock only. |
| SoundCloud Go+ | 2025-01-01 | ❌ Unverified | Not tested | Not tested | Not tested | 🧪 Experimental | Configuration rewrite; server-side audio stream protection may prevent full Go+ audio quality. Static validation passed; runtime compatibility not verified. |
| Bilibili Ad Block | 2025-04-03 | ❌ Unverified | Not tested | Not tested | Not tested | 🧪 Experimental | Uses embedded MagicJS library. External protobuf scripts are commented out. Static validation passed; runtime compatibility not verified. |

## Status Legend

* ✅ **Working**: Fully verified on listed app/iOS/Shadowrocket versions.
* ⚠ **Partial**: Only some features work, or partial app support with known limitations.
* 🧪 **Experimental**: Static validation passed; runtime compatibility not verified or untested on recent app builds.
* ❌ **Broken**: Confirmed not functional or blocked by app protections (e.g. server verification, certificate pinning).
* 🗄 **Archived**: Deprecated and no longer maintained.
