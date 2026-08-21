# SpectraLens AI — Production Release Checklist & QA Report

**Version:** 2.9.77  
**Date:** August 21, 2026  
**Build Target:** Manifest V3 / Chrome Web Store  
**Package:** `spectralens-ai-extension.zip`  
**Test Status:** 276 / 276 Passing Automated Tests  

---

## 1. Release Verification Checklist

- [x] **Production build passes cleanly** (`npm run build` with zero errors or warnings)
- [x] **Manifest V3 valid** (Valid schema, no deprecated fields, correct action and background definitions)
- [x] **Icons present & crisp** (16px, 24px, 32px, 48px, 128px png icons in `assets/icons/`)
- [x] **Zero hardcoded secrets / API keys** (Verified by GitHub Secret Scanning and codebase grep)
- [x] **Developer Mode OFF by default** (`IN_CODE_DEV_MODE = false` to keep DevTools clean)
- [x] **Least-privilege permissions** (Strictly pruned to 6 essential permissions)
- [x] **Zero remote executable code** (All JS, CSS, and WASM packages bundled locally)
- [x] **Privacy policy updated** (`PRIVACY_POLICY.md` and web-ready `privacy-policy.html`)
- [x] **Chrome Web Store listing ready** (Detailed copy in `CHROME_WEB_STORE_SUBMISSION.md`)
- [x] **Reviewer testing instructions documented** (Complete step-by-step walkthrough)
- [x] **Release zip package generated** (`spectralens-ai-extension.zip` created via `npm run zip`)
- [x] **Package integrity verified** (Manifest at zip root, zero `.DS_Store` or development files)
- [x] **Multi-Engine AI querying tested** (ChatGPT, Claude, Gemini, Grok, Perplexity, Google Search)
- [x] **Visual Element Scanner & OCR tested** (Structured DOM markdown converter and Tesseract.js worker)
- [x] **3-State Theme Engine tested** (Page Theme harmonization, Dark mode, Light mode)
- [x] **Always Active Tab worker tested** (Spoofed visibility lifecycle across background tabs)
- [x] **Universal Copy Unblocker tested** (Real-time storage listener and cross-tab broadcasts)
- [x] **In-Widget Guide & Help Center tested** (Lazy-loaded `GuideView.jsx` on demand)
- [x] **Options & Privacy Hub tested** (Live LevelDB quota meter, JSON/Markdown exports, restore parser)
- [x] **Offboarding Feedback Survey tested** (Local drafts, prefilled GitHub/Email dispatch)
- [x] **Security & XSS audit complete** (`DOMParser` HTML sanitization, 0 XSS vulnerabilities)
- [x] **Dependency audit complete** (`npm audit` reporting 0 vulnerabilities)

---

## 2. Release Specifications

| Specification | Value |
| :--- | :--- |
| **VERSION** | `2.9.77` |
| **BUILD PIPELINE** | Vite 6 + React 19 + TailwindCSS (Production Minified) |
| **ZIP ARCHIVE** | `spectralens-ai-extension.zip` |
| **ZIP SIZE** | ~20.81 MB (Includes local offline Tesseract.js WebAssembly engine) |
| **PERMISSIONS** | `["scripting", "storage", "activeTab", "tabs", "declarativeNetRequest", "offscreen"]` |
| **HOST PERMISSIONS** | `["http://*/*", "https://*/*"]` |
| **SUPPORTED AI ENGINES** | ChatGPT, Claude, Gemini, Grok, Perplexity, Google Search |
| **USER PRIVACY** | 100% On-Device LevelDB storage; Zero external telemetry |
| **DATA PORTABILITY** | Full JSON (`.json`) and Markdown (`.md`) history export + import restore |
| **PRIVACY POLICY** | `https://elsesourav.web.app/privacy-policy.html` |
| **KNOWN BLOCKERS** | **None** |

---

## 3. QA Test Matrix

### 3.1 Functional Journey
1. **Clean Installation**: Extension loads unpacked from `extension/` or from `spectralens-ai-extension.zip` cleanly without errors. Onboarding `#welcome` opens on first install.
2. **Toolbar Popup Launch**: Instant open (<100ms) with theme toggle, floating widget switcher, always-active tab toggle, and copy unblocker.
3. **Floating AI Assistant Widget**: Draggable, resizable, auto-minimizing, and dynamically harmonizes with host page background colors.
4. **Visual Element Scanner**: Interactive crosshair inspects and parses tables into Markdown tables and code snippets into fenced code blocks.
5. **Multi-Engine AI Querying**: Simultaneous dispatch across ChatGPT, Claude, Gemini, Grok, Perplexity, and Google Search with streaming card responses and individual stop buttons.
6. **In-Widget Guide & Help (`?`)**: Lazy loads on first click without increasing initial bundle payload.
7. **Options & Privacy Hub**: Real-time storage footprint calculation, full backup exports, import restoration, and live storage keys inspector table.
8. **Universal Copy Unblocker**: Real-time storage sync and broadcast messaging strips anti-copy locks on all open tabs immediately.
9. **Offboarding / Feedback Survey**: Saves feedback drafts locally with 1-click dispatch to GitHub Issues or email.

### 3.2 Failure Modes & Resilience
- **Offline / Network Outage**: AI response cards display clean retry states with direct login/reconnect links.
- **Provider Authentication Expired**: Clean "Sign-in Required" card with instant 1-click login button.
- **Tab Inactivity**: Always Active worker keeps research tabs responsive.
- **Corrupted Storage**: Automatic default fallbacks with zero component crashes.
