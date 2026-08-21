# SpectraLens AI — Multi-Engine AI Companion, Visual Scanner & Tab Tools

<div align="center">
  <img src="src/assets/icons/128.png" width="110" height="110" alt="SpectraLens AI Logo" />
  <h3>Supercharge your browsing with simultaneous Multi-Engine AI, visual element scanning, offline OCR, and research productivity tools.</h3>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](MIT-LICENSE.txt)
  [![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25_On--Device-emerald.svg)](PRIVACY_POLICY.md)
  [![Tests Passing](https://img.shields.io/badge/Tests-276%20Passing-brightgreen.svg)](tests/test-extension.js)
</div>

---

## ⚡ Key Capabilities

- **🚀 Simultaneous Multi-Engine AI Querying**: Query **ChatGPT, Claude, Gemini, Grok, Perplexity, and Google Search** at once. Compare models side-by-side without opening multiple tabs.
- **💰 Zero API Token Costs**: Communicates directly through your active signed-in web sessions (`chatgpt.com`, `claude.ai`, `gemini.google.com`, `grok.com`, `perplexity.ai`, `google.com`). No paid API keys required.
- **🎯 Visual Element Scanner & Structured DOM Parser**: Point-and-click to scan any chart, table, paragraph, or code snippet into your prompt formatted as Markdown.
- **🔍 On-Device Screen Area OCR**: Crop any diagram or image on your screen and extract text using bundled, offline Tesseract.js WebAssembly.
- **🎨 3-State Theme Engine**:
  - **Page Theme**: Harmonizes widget background with host website colors and luminance.
  - **Dark Mode**: High-contrast glassmorphic dark palette.
  - **Light Mode**: Clean and crisp daylight appearance.
- **🛡️ Universal Copy & Context Menu Unblocker**: Strips anti-selection and anti-copy locks on restricted research and study websites.
- **⚡ Always Active Tab Worker**: Keeps background research tabs from sleeping or throttling JavaScript timers.
- **📖 In-Widget Guide & Help Center (`?` Icon)**: In-page user manual, model connectivity status, shortcuts cheat sheet, and searchable FAQ.
- **🔒 100% On-Device Privacy Hub**: Local storage footprint meter, full **JSON (`.json`)** & **Markdown (`.md`)** export, backup restore, and zero telemetry.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>⌥ Option + A</kbd> / <kbd>Alt + A</kbd> | **Toggle Floating Widget** | Opens or minimizes the in-page AI assistant. |
| <kbd>⌘ / Ctrl + Shift + S</kbd> | **Visual Element Scanner** | Activates point-and-click element inspection. |
| <kbd>Enter</kbd> | **Send Query** | Dispatches prompt to all enabled AI models. |
| <kbd>Shift + Enter</kbd> | **Line Break** | Adds a newline inside multi-line prompt mode. |
| <kbd>Esc</kbd> | **Dismiss Overlay** | Closes selector or active modal overlays. |

---

## 📦 Quick Installation (Load Unpacked)

1. **Download Archive**: Download [`spectralens-ai-extension.zip`](spectralens-ai-extension.zip) or clone this repository.
2. **Extract**: Unzip the archive to a local folder on your computer.
3. **Open Extensions Page**:
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`
   - Brave / Opera: Navigate to `brave://extensions/` or `opera://extensions/`
4. **Enable Developer Mode**: Toggle the **Developer Mode** switch in the top-right corner.
5. **Load Extension**: Click **"Load unpacked"** and select the extracted `extension/` directory.
6. **Pin to Toolbar**: Click the puzzle icon in Chrome and pin **SpectraLens AI**.

---

## 🛠️ Development & Building

```bash
# Clone the repository
git clone https://github.com/elsesourav/spectralens-ai.git
cd spectralens-ai

# Install dependencies
npm install

# Run Vite development server
npm run dev

# Run comprehensive automated test suite (276 unit & acceptance tests)
npm test

# Build production bundle and generate release zip
npm run build
```

---

## 🛡️ Privacy & Security Principles

SpectraLens AI is engineered from the ground up for strict privacy:
1. **Zero External Telemetry**: No Google Analytics, Sentry, Mixpanel, tracking pixels, or remote logging servers.
2. **Local Storage Sandbox**: All chats and configurations live strictly in your local Chrome LevelDB storage partition.
3. **Direct AI Transport**: Prompts stream directly between your browser and official AI domains without passing through intermediary proxy servers.
4. **Zero API Key Leak Risk**: Leverages your existing browser sessions directly.

Read our full [Privacy Policy](PRIVACY_POLICY.md).

---

## 📄 License & Credits

- Licensed under the [MIT License](MIT-LICENSE.txt).
- Developed with ❤️ by [Sourav (elsesourav)](https://elsesourav.web.app).
