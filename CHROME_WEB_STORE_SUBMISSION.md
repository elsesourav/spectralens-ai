# Chrome Web Store Submission & Developer Console Guide

## Product Metadata
- **Name:** SpectraLens AI — Multi-Engine AI Companion, OCR & Tab Tools
- **Short Name:** SpectraLens AI
- **Version:** 2.9.77
- **Primary Purpose:** Instant on-page multi-engine AI search aggregation, visual DOM element extraction, on-device OCR, and tab productivity directly within web browsing workflows.

## Developer Contact
- **Developer Name:** Sourav (elsesourav)
- **Developer Email:** elsesourav.auth@gmail.com
- **Website / Homepage:** https://elsesourav.web.app
- **Support / Issue Tracker:** https://github.com/elsesourav/spectralens-ai/issues
- **Privacy Policy URL:** https://elsesourav.web.app/privacy-policy.html

---

## Store Listing Copy

### Extension Name
`SpectraLens AI — Multi-Engine AI Chat, Screen OCR & Tab Tools`

### Short Description (Max 132 chars)
`Compare ChatGPT, Claude, Gemini, Grok & Perplexity side-by-side on any page with visual element scanning, offline OCR & tab tools.`

### Detailed Store Description

```markdown
SpectraLens AI is a powerful, privacy-first in-browser productivity companion that allows you to query top AI models simultaneously, scan and extract on-screen elements with offline OCR, and unblock restricted text selection without leaving your active tab.

🚀 KEY CAPABILITIES & FEATURES:

1. Simultaneous Multi-Engine AI Querying
• Send your prompts simultaneously to leading AI models: ChatGPT, Claude, Gemini, Grok, Perplexity, and Google Search.
• Compare responses side-by-side in a sleek, glassmorphic floating window.
• Zero API Costs: Operates directly with your active web sessions without needing paid API tokens or subscription keys.
• Stream responses smoothly with independent model cancellation and stop-fetch controls.

2. Visual Element Scanner & On-Device OCR
• Point-and-click to scan any webpage element (paragraphs, tables, charts, or code blocks) directly into your prompt.
• Built-in offline WebAssembly OCR engine extracts text from images and diagrams entirely in local browser memory.
• Automatic structured DOM parsing formats HTML tables into clean Markdown tables and code snippets into fenced code blocks.

3. Adaptive Theme Engine & Ergonomic UI
• 3-State Theme Harmonization: 'Page Theme' dynamically detects the host website's background colors and luminance to blend seamlessly, alongside dedicated Dark Mode and Light Mode.
• Draggable, resizable, and auto-minimizing floating launcher with persistent position memory.
• Complete Keyboard Shortcuts support (⌥ Option + A / Alt + A to toggle, ⌘/Ctrl + Shift + S for Element Selector).

4. Tab Productivity & Research Tools
• Universal Copy & Context Menu Unblocker: Strips anti-selection, anti-copy, and context-menu locks on documentation and study sites.
• Always Active Tab Worker: Prevents background tabs from sleeping, pausing JavaScript timers, or freezing during long tasks.
• Full On-Page Help & Guide Center: In-widget interactive manual, shortcuts cheat sheet, model connectivity hub, and searchable FAQ.

🔒 PRIVACY, SECURITY & PERMISSIONS:

• 100% On-Device Local Sandboxing: All conversation histories, domain whitelists, and preferences are stored exclusively on your machine in Chrome's sandboxed LevelDB storage.
• Zero User Telemetry: Zero tracking pixels, zero analytics scripts (no Google Analytics, Sentry, or Mixpanel), and zero advertising trackers.
• Direct Browser Transport: Prompts travel directly between your browser and official AI domains without passing through third-party proxy servers.
• Complete Data Sovereignty: Export full chat histories to structured JSON or readable Markdown files, or wipe data with a single click.

💡 LIMITATIONS & REQUIREMENTS:
• Requires active internet access to communicate with AI providers.
• Response times vary based on official AI provider server loads.
```

---

## Category & Classification
- **Primary Category:** Productivity
- **Secondary Category:** Search Tools
- **Maturity / Rating:** General Audience (No adult content, no gambling, no paid transactions)

---

## Privacy & Single Purpose Disclosures

### Single Purpose Justification
> **Statement:** SpectraLens AI provides instantaneous on-page multi-engine AI search aggregation, visual DOM text extraction, and on-device OCR directly within the user's browsing workflow.

### Permission Justifications Table

| Permission | Source Files | Justification |
| :--- | :--- | :--- |
| `storage` | `utilsModule.js`, `bgUtils.js`, `ChatBot.jsx` | Required to persist user preferences (theme, model toggles, auto-hide delay, copy rules) and conversation logs locally on device. |
| `activeTab` | `background.js`, `AlwaysActiveToggle.jsx` | Required to interact with the active tab when the user triggers the toolbar popup, in-page floating widget, or shortcut. |
| `scripting` | `background.js`, `bgUtils.js`, `requestAi.js` | Required to inject the visual element selector overlay, copy unblocker styles, and extract answer DOM on query tabs. |
| `offscreen` | `bgUtils.js`, `worker.js` | Required to execute local Tesseract.js WebAssembly OCR in a sandboxed background thread without blocking the browser UI. |
| `tabs` | `background.js`, `requestAi.js` | Required to open and manage background query tabs for enabled AI providers and automatically close them upon completion. |
| `declarativeNetRequest` | `bgUtils.js` (`chromeTabMediaAccess`) | Required to temporarily suppress image and font downloads on background worker tabs to conserve user network bandwidth. |

### Host Permissions Justification

| Pattern | Justification |
| :--- | :--- |
| `http://*/*` | Required to inject the floating research assistant, text selection tools, and copy unblocker across standard HTTP websites. |
| `https://*/*` | Required to inject the floating research assistant, text selection tools, and copy unblocker across secure HTTPS websites and communicate with AI providers. |

---

## Chrome Web Store Data Safety Disclosures

| Store Field | Value | Explanation |
| :--- | :---: | :--- |
| **Authentication Info** | **NO** | No user account or registration is required to use SpectraLens AI. |
| **Personal Communications** | **NO** | User chats are strictly local and never transmitted to extension servers. |
| **Financial / Payment Data** | **NO** | SpectraLens AI is 100% free with no in-app purchases or payments. |
| **Health Info** | **NO** | No health data is accessed. |
| **Location Data** | **NO** | No GPS, IP geolocation, or location coordinates are collected. |
| **Web Browsing History** | **NO** | Extension does not track, record, or exfiltrate URLs visited by the user. |
| **User Activity / Analytics** | **NO** | Zero telemetry, zero analytics scripts, zero tracking cookies. |
| **Website Content** | **YES** | Only DOM nodes explicitly selected by the user via the Visual Element Selector or Area OCR. |

---

## Reviewer Testing Walkthrough

1. **In-Page Multi-Engine Chat**:
   - Open any public webpage (e.g. `https://en.wikipedia.org/wiki/Artificial_intelligence`).
   - Press `⌥ Option + A` (Mac) or `Alt + A` (Windows) or click the floating widget in the top right.
   - Enter a query (e.g. `"Explain quantum computing in simple terms"`) and click Send.
   - Observe responses streaming in parallel from all enabled AI providers.
2. **Visual Element Scanner**:
   - Click the crosshair icon in the widget chat input or header.
   - Hover over any table, paragraph, or code snippet on the webpage and click to attach it.
   - Observe the parsed Markdown content populated directly into the chat prompt.
3. **In-Widget Guide & Help Center**:
   - Click the `?` Question Mark icon in the sidebar (positioned right after Settings).
   - Test the real-time search filter across shortcuts, AI model cards, and FAQs.
4. **Options & Privacy Control Hub**:
   - Right-click the extension icon in Chrome toolbar and select **Options**.
   - Navigate through `#welcome`, `#guide`, `#providers`, `#settings`, `#shortcuts`, `#privacy`, and `#uninstall`.
   - In **Privacy & Data**, verify the live storage quota meter and test **Export History (.JSON / .MD)**.
5. **Universal Copy Unblocker**:
   - Toggle "Enable Copy Globally" in Options or popup on any restricted webpage.
   - Verify right-click and text selection are instantly unblocked.

---

## Technical Audit & Verification Summary
- **Manifest Version:** Manifest V3 Compliant (`scripts/manifest.json`)
- **Automated Tests:** **276 / 276 Tests Passing** (`npm test`)
- **Build Status:** Deterministic Vite build (`npm run build`)
- **Package Archive:** `./spectralens-ai-extension.zip`
- **Security Check:** Zero `eval()`, zero inline scripts, strict DOM sanitization, zero hardcoded API secrets.
