# Privacy Policy for SpectraLens AI

**Effective Date:** August 15, 2026  
**Last Updated:** August 15, 2026

SpectraLens AI ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy explains our data practices regarding the SpectraLens AI Chrome Extension.

---

### 1. Single Purpose and Overview
SpectraLens AI provides in-browser AI-assisted search, multi-model answer aggregation (Google AI Overview, Bing/Copilot, Perplexity, Gemini, Grok), and local Optical Character Recognition (OCR) directly on web pages.

---

### 2. Zero Data Collection & Zero Telemetry
- **No External Data Transmission:** SpectraLens AI does **NOT** collect, store, track, sell, or transmit any personally identifiable information, browsing history, keystrokes, clipboard content, or user search queries to any third-party analytics or developer servers.
- **Direct-to-Provider Communication:** When you initiate a search query, search requests are made directly from your browser to the designated search provider (e.g. Google, Bing, Perplexity, Gemini, Grok) as if you visited the search page directly.
- **No User Accounts:** You do not need to register an account or provide an email address to use the extension.

---

### 3. Local Data Storage
- **Search History & Settings:** User preferences (active AI providers, theme, concurrency options) and recent question history (up to 20 items) are stored **strictly on your local device** using Chrome's `chrome.storage.local` API.
- **Data Deletion:** You can delete your entire search history at any time with a single click in the extension UI.

---

### 4. Screen Capture and Local OCR
- **On-Device Processing:** When you use the Area OCR feature, screen captures are captured via Chrome's secure tabs API and processed in memory on your local machine using an offline, bundled Tesseract.js engine.
- **Zero Image Retention:** Screen capture bitmaps are transient, processed strictly in browser memory, and immediately discarded upon text recognition. Images are never uploaded to any remote server.

---

### 5. Permissions Justification
SpectraLens AI requests only the minimum permissions required for its functionality:
- `storage`: Saves your chosen settings and search history locally.
- `activeTab` & `scripting`: Injects the lightweight floating menu and text selector on active pages when requested.
- `offscreen`: Executes local OCR text extraction in a background sandboxed worker.
- `tabs`: Opens and manages background query tabs to fetch answers from enabled AI providers.
- `declarativeNetRequest`: Optimizes background scraping by blocking heavy media/images on scraper tabs to conserve your bandwidth.

---

### 6. Chrome Web Store Limited Use Compliance
SpectraLens AI adheres strictly to the **Chrome Web Store User Data Policy**, including the **Limited Use** requirements. We do not use or transfer user data for serving personalized advertising, credit assessment, or data brokering.

---

### 7. Contact
For any privacy questions or feedback, please contact:
- **Developer:** elsesourav
- **Website:** https://elsesourav.web.app
- **Email:** elsesourav.auth@gmail.com
- **GitHub:** https://github.com/elsesourav/spectralens-ai
