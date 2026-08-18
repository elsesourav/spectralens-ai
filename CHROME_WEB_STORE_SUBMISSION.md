# Chrome Web Store Submission

## Product
- **Name:** SpectraLens AI
- **Version:** 2.4.2
- **Purpose:** Instant on-page multi-engine AI search aggregation, text extraction, and on-device Optical Character Recognition (OCR) directly within web browsing workflows.

## Developer
- **Developer Name:** Sourav (elsesourav)
- **Developer Email:** elsesourav.auth@gmail.com
- **Website:** https://elsesourav.web.app

## Store Listing

### Name
SpectraLens AI — Multi-Engine AI Search, Screen OCR & Tab Tools

### Short Description
Fast multi-engine AI search aggregation, in-page text selection, and on-device Optical Character Recognition (OCR).

### Full Description
SpectraLens AI is an in-browser productivity and research companion that lets you query top AI search engines, extract on-screen text with offline OCR, and compare answers side-by-side without leaving your active tab.

KEY CAPABILITIES

1. Multi-Engine AI Search
- Query multiple search engines simultaneously, including Google AI Overview, Bing Copilot, Perplexity, Gemini, and Grok.
- View and switch between answers in a responsive, floating on-page panel.
- Control concurrent query limits directly from settings to balance speed and network usage.

2. On-Device Area OCR
- Select any portion of a webpage (images, diagrams, locked text) to extract text using a bundled, offline Tesseract.js engine.
- Screen crops are processed entirely in local browser memory and never uploaded to external servers.
- Extracted text is instantly pasted into your chat prompt for immediate querying.

3. Streamlined Research Workflow
- Draggable and resizable floating window that adapts to light and dark page backgrounds.
- Search history saved locally on your device (up to 20 items) with instant one-click deletion.
- Non-intrusive text selection and copy enablement on research pages with restrictive scripts.

PRIVACY & SECURITY
- Zero telemetry and zero analytics tracking.
- No user accounts, logins, or authentication required.
- All search requests are made directly from your browser to the designated search provider.
- All code and WebAssembly OCR components are packaged locally inside the extension.

LIMITATIONS
- Search responses depend on provider availability and rate limits.
- Requires an active internet connection to fetch AI search answers.

## Category
- **Primary Category:** Productivity
- **Secondary Category:** Search Tools

## Privacy
- **Privacy Policy URL:** `https://elsesourav.web.app/privacy-policy.html` *(Hosted copy of privacy-policy.html)*
- **Data Collected:** None. The extension does not collect, store, or transmit personally identifiable information, browsing history, or user telemetry.
- **Data Processed Locally:** User-entered search prompts, area OCR image crops (transient in memory), and user preferences (theme, enabled AI providers, local chat history).
- **Data Transmitted:** Search queries are transmitted directly to the selected public search provider (Google, Bing, Perplexity, Grok, Gemini) upon explicit user initiation.
- **Third Parties:** Direct connections to search engines selected by user (Google, Microsoft Bing, Perplexity AI, xAI Grok). No analytics or ad brokers.

## Permissions

| Permission | Justification |
| :--- | :--- |
| `storage` | Required to save user preferences (enabled AI engines, theme, concurrency) and recent query history locally on the user's device. |
| `activeTab` | Required to interact with the active browser tab when the user invokes the extension popup or floating tools. |
| `scripting` | Required to inject the in-page floating menu frame, area OCR selection overlay, and extract text from search tabs. |
| `offscreen` | Required to run the local Tesseract.js WebAssembly OCR engine in a sandboxed background document without blocking the UI. |
| `tabs` | Required to create background query tabs to fetch search answers and clean them up automatically when queries finish. |
| `declarativeNetRequest` | Required to temporarily block image and media loading on background scraping tabs to conserve user network bandwidth. |

## Host Permissions

| Host Pattern | Justification |
| :--- | :--- |
| `http://*/*` | Required to inject the floating research assistant and text selection tool on HTTP web pages and query search providers. |
| `https://*/*` | Required to inject the floating research assistant and text selection tool on secure HTTPS web pages and query search providers. |

## Distribution
- **Visibility:** Public
- **Regions:** All regions (Global distribution)
- **Pricing:** Free
- **In-app Purchases:** No

## Graphics
- **Extension Icon:**
  - 16x16: `assets/icons/16.png`
  - 24x24: `assets/icons/24.png`
  - 32x32: `assets/icons/32.png`
  - 48x48: `assets/icons/48.png`
  - 128x128: `assets/icons/128.png`
- **Store Screenshots Required (1280x800 or 640x400 PNG/JPEG):**
  - Screenshot 1: Floating SpectraLens AI window comparing answers from multiple AI engines.
  - Screenshot 2: Area OCR tool selecting on-screen text and converting it into a search query.
  - Screenshot 3: Extension popup with provider switches, concurrency slider, and copy unblocker.
  - Screenshot 4: Local chat history panel with search entries.
- **Promotional Tile (Optional):**
  - Small promo tile: 440x280 PNG
  - Marquee promo tile: 1400x560 PNG

## Reviewer Instructions
1. Install and enable the extension.
2. Open any standard webpage (e.g., https://en.wikipedia.org/wiki/Artificial_intelligence).
3. Click the floating SpectraLens AI widget at the top-right corner to open the in-page chat window.
4. Type any question (e.g. "What is Machine Learning?") and click Send. Answers from enabled providers will load concurrently.
5. Click the OCR Area Selector icon on the floating menu, drag a bounding box over any text on the page, and observe the extracted text populated in the chat input.
6. Click the extension toolbar icon to open the popup, configure active AI engines, or toggle the dark/light theme.
7. **Authentication:** No account, registration, or authentication is required.

## Support
- **Homepage:** https://elsesourav.web.app
- **Support:** https://github.com/elsesourav/spectralens-ai/issues
- **Contact Email:** elsesourav.auth@gmail.com
- **Privacy Policy:** https://elsesourav.web.app/privacy-policy.html

## Final Technical Checks
- **Manifest V3:** Verified compliant.
- **Build:** Verified deterministic Vite production build (`extension/`).
- **Tests:** 58 / 58 automated tests passing (`npm test`).
- **Security:** Strict `DOMParser` HTML sanitization, 0 inline script execution, 0 `eval()`.
- **Remote Code:** Zero remote JavaScript or dynamic script loading.
- **Secrets:** Zero hard-coded API keys, tokens, or credentials.
- **Permissions:** All 6 permissions are strictly necessary and justified.

## BLOCKERS
- **None (Code & Package Ready):** The production zip package `spectralens-ai-extension.zip` is complete and passes all automated checks.
- **Pre-Submission Manual Action:** Ensure `privacy-policy.html` is uploaded to `https://elsesourav.web.app/privacy-policy.html` (or your chosen hosting) before submitting the URL in the Developer Console.
