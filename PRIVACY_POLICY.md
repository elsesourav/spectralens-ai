# Privacy Policy for SpectraLens AI

**Effective Date:** August 21, 2026  
**Last Updated:** August 21, 2026

SpectraLens AI ("we", "our", or "the Extension") is dedicated to uncompromising user privacy and data sovereignty. This Privacy Policy outlines our strict data handling practices for the SpectraLens AI Chrome Extension.

---

### 1. Single Purpose & Architecture Overview
SpectraLens AI provides on-page multi-engine AI search aggregation (ChatGPT, Claude, Gemini, Grok, Perplexity, Google Search), visual DOM element extraction, and on-device Optical Character Recognition (OCR) directly within your web browsing workflow.

---

### 2. Zero Data Collection & Zero Telemetry Guarantee
- **No Remote Telemetry or Tracking:** SpectraLens AI does **NOT** collect, track, record, profile, sell, or transmit any personally identifiable information, browsing history, keystrokes, or query prompts to any third-party analytics, telemetry, or developer servers.
- **No External Analytics SDKs:** The extension includes zero tracking pixels, zero analytics scripts (no Google Analytics, Sentry, Mixpanel, or PostHog), and zero advertising trackers.
- **Direct Browser Transport:** All prompt queries travel directly from your browser to the official AI provider (OpenAI, Anthropic, Google, xAI, Perplexity) via your active web session. There are zero intermediate or proxy servers intercepting or logging your queries.
- **No Accounts Required:** No registration, email collection, or account creation is required to use SpectraLens AI.

---

### 3. 100% On-Device Local Data Storage
- **Isolated Storage Sandbox:** All user preferences (active AI providers, 3-state theme modes, delays, copy rules) and conversation session logs are stored strictly on your local device using Chrome's private sandboxed `chrome.storage.local` API (LevelDB partition).
- **Data Export & Portability:** You have full ownership of your data. You can export your entire conversation history at any time as structured **JSON (`.json`)** or formatted **Markdown (`.md`)** for Obsidian, Notion, or personal archives.
- **One-Click Total Data Erasure:** You can clear individual chat sessions, wipe all conversation logs, or perform a full factory reset at any time with a single click.

---

### 4. Visual Element Scanner & On-Device OCR
- **Targeted DOM Parsing:** The Visual Element Scanner only reads HTML elements you explicitly hover over and click. It never scrapes or exfiltrates full page contents in the background.
- **Local WebAssembly OCR:** When selecting image regions or diagrams, screen capture bitmaps are processed in memory using a bundled, offline Tesseract.js WebAssembly engine in a sandboxed offscreen document. Images are transient in local memory and are never uploaded to any remote server.

---

### 5. Manifest V3 Permissions Justification
SpectraLens AI requests only the minimum permissions necessary for its single purpose:
- `storage`: Persists your chosen theme, widget preferences, domain rules, and chat history locally on your device.
- `activeTab`: Interacts with the active tab when you click the extension popup, in-page widget, or keyboard shortcut (`⌥ Option + A` / `Alt + A`).
- `scripting`: Injects the visual element selector overlay, copy unblocker styles, and extracts response DOM on query tabs.
- `offscreen`: Executes local WebAssembly OCR in a sandboxed background thread without blocking the browser UI.
- `tabs`: Creates and manages background query tabs to stream responses from enabled AI providers, auto-closing them when finished.
- `declarativeNetRequest`: Temporarily blocks heavy images/fonts on background query tabs to conserve user bandwidth.

---

### 6. Chrome Web Store Limited Use Compliance
SpectraLens AI adheres strictly to the **Chrome Web Store User Data Policy**, including all **Limited Use** requirements. We do not use or transfer user data for serving personalized advertising, credit evaluation, or data brokering.

---

### 7. Contact & Support
For questions regarding this Privacy Policy or extension security:
- **Developer:** Sourav (elsesourav)
- **Website:** https://elsesourav.web.app
- **Email:** elsesourav.auth@gmail.com
- **Issue Tracker:** https://github.com/elsesourav/spectralens-ai/issues
