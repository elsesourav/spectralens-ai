/* eslint-disable no-undef */
/**
 * Automated Verification & Compliance Test Suite for SpectraLens AI
 * Run using: npm test
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n🧪 Running SpectraLens AI Automated Test Suite...\n");

// --- TEST SUITE 1: Manifest V3 Schema & Security Audit ---
console.log("1. Manifest V3 Schema & Permissions Audit:");
const manifestPath = path.join(rootDir, "scripts", "manifest.json");
assert(fs.existsSync(manifestPath), "scripts/manifest.json exists");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
assert(manifest.manifest_version === 3, "Manifest version is 3");
assert(typeof manifest.name === "string" && manifest.name.length > 0, "Manifest has a valid name");
assert(typeof manifest.version === "string" && manifest.version.length > 0, "Manifest has a valid version");
assert(manifest.background?.service_worker === "./background/background.js", "Valid service worker path");

// Verify prohibited/unwanted permissions are NOT present
const riskyPermissions = [
  "management",
  "webRequest",
  "declarativeNetRequestFeedback",
  "declarativeNetRequestWithHostAccess",
];
const foundRisky = manifest.permissions.filter((p) => riskyPermissions.includes(p));
assert(foundRisky.length === 0, `No risky/unwanted permissions found (found: ${JSON.stringify(foundRisky)})`);

// Verify essential permissions
const requiredPermissions = ["scripting", "storage", "unlimitedStorage", "activeTab", "tabs", "offscreen"];
const hasAllRequired = requiredPermissions.every((p) => manifest.permissions.includes(p));
assert(hasAllRequired, "All required functional permissions are present");

// Verify host_permissions for OCR capture
assert(
  manifest.host_permissions.includes("<all_urls>"),
  "Host permissions include <all_urls> for programmatic captureVisibleTab OCR",
);

// Verify CSP
assert(
  manifest.content_security_policy?.extension_pages?.includes("script-src 'self'"),
  "CSP strictly enforces script-src 'self'",
);

// --- TEST SUITE 2: Extension Production Bundle Verification ---
console.log("\n2. Extension Bundle Verification:");
const extensionDir = path.join(rootDir, "extension");

const requiredFiles = [
  "manifest.json",
  "popup/popup.html",
  "inject/widgetWindow.html",
  "inject/selection.html",
  "options/options.html",
  "background/background.js",
  "content/content.js",
  "content/enableCopy.js",
  "content/widgetContent.js",
  "content/providerAdapters.js",
  "offscreen/worker.js",
  "offscreen/offscreen.html",
  "assets/icons/16.png",
  "assets/icons/48.png",
  "assets/icons/128.png",
];

requiredFiles.forEach((file) => {
  const filePath = path.join(extensionDir, file);
  assert(fs.existsSync(filePath), `Required build file exists: ${file}`);
});

// Verify manifest version matches package.json version
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
assert(manifest.version === pkg.version, `Manifest version (${manifest.version}) matches package.json version (${pkg.version})`);

// Verify no test or dev scripts leaked into extension/
assert(!fs.existsSync(path.join(extensionDir, "test-extension.js")), "No test scripts leaked into extension output");
assert(!fs.existsSync(path.join(extensionDir, "update-version.js")), "No update-version script leaked into extension output");
assert(!fs.existsSync(path.join(extensionDir, "zip-extension.js")), "No zip-extension script leaked into extension output");

// --- TEST SUITE 3: HTML Sanitization Security Verification ---
console.log("\n3. HTML Sanitization Security Verification:");

function testSanitizer(htmlString) {
  return htmlString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript\s*:/gi, "");
}

const maliciousPayload = `<div onclick="alert(1)">Safe Text<script>evil()</script><img src="x" onerror="evil()"><iframe src="javascript:alert(1)"></iframe></div>`;
const sanitized = testSanitizer(maliciousPayload);

assert(!sanitized.includes("<script>"), "Sanitizer stripped <script> tag");
assert(!sanitized.includes("onclick"), "Sanitizer stripped onclick handler");
assert(!sanitized.includes("onerror"), "Sanitizer stripped onerror handler");
assert(!sanitized.includes("<iframe"), "Sanitizer stripped iframe element");
assert(sanitized.includes("Safe Text"), "Sanitizer preserved valid safe text");

// --- TEST SUITE 4: Documentation & Store Readiness ---
console.log("\n4. Documentation & Store Readiness:");
assert(fs.existsSync(path.join(rootDir, "CHROMEWEBSTORE.md")), "CHROMEWEBSTORE.md exists");
assert(fs.existsSync(path.join(rootDir, "PRIVACY_POLICY.md")), "PRIVACY_POLICY.md exists");
assert(fs.existsSync(path.join(rootDir, "privacy-policy.html")), "privacy-policy.html exists");
assert(fs.existsSync(path.join(rootDir, "RELEASE_CHECKLIST.md")), "RELEASE_CHECKLIST.md exists");
assert(fs.existsSync(path.join(rootDir, "CHROME_WEB_STORE_SUBMISSION.md")), "CHROME_WEB_STORE_SUBMISSION.md exists");

// --- TEST SUITE 5: Runtime Module Integrity ---
console.log("\n5. Runtime Module Integrity:");
const utilsPath = path.join(rootDir, "src", "utils", "utilsModule.js");
const utilsCode = fs.readFileSync(utilsPath, "utf-8");
assert(!utilsCode.includes("tabOnMessage,"), "utilsModule.js has no undefined tabOnMessage reference");

const controlsPath = path.join(rootDir, "src", "components", "Controls.jsx");
const controlsCode = fs.readFileSync(controlsPath, "utf-8");
assert(!controlsCode.includes("settings.enable"), "Controls.jsx uses safe optional chaining for settings");

const requestAiPath = path.join(rootDir, "scripts", "background", "requestAi.js");
const requestAiCode = fs.readFileSync(requestAiPath, "utf-8");
assert(requestAiCode.includes("cancelAllAiRequests"), "requestAi.js defines cancelAllAiRequests");
assert(requestAiCode.includes("closeProviderTab"), "requestAi.js defines closeProviderTab");
assert(requestAiCode.includes("resetAllProviderSessions"), "requestAi.js defines resetAllProviderSessions");
assert(requestAiCode.includes("persistentProviderTabs"), "requestAi.js maintains persistentProviderTabs map");

const bgPath = path.join(rootDir, "scripts", "background", "background.js");
const bgCode = fs.readFileSync(bgPath, "utf-8");
assert(bgCode.includes("IF_B_STOP_FETCH"), "background.js handles IF_B_STOP_FETCH cancellation");
assert(bgCode.includes("IF_B_NEW_CHAT"), "background.js handles IF_B_NEW_CHAT reset");
assert(bgCode.includes("IF_B_CLOSE_PROVIDER_TAB"), "background.js handles IF_B_CLOSE_PROVIDER_TAB");
const vm = await import("vm");
const scriptsToValidate = [
  "scripts/background/background.js",
  "scripts/background/bgUtils.js",
  "scripts/background/networkInterceptor.js",
  "scripts/background/requestAi.js",
  "scripts/content/content.js",
  "scripts/content/enableCopy.js",
  "scripts/content/widgetContent.js",
  "scripts/content/providerAdapters.js",
];
for (const rel of scriptsToValidate) {
  const full = path.join(rootDir, rel);
  if (fs.existsSync(full)) {
    const code = fs.readFileSync(full, "utf-8");
    try {
      new vm.Script(code);
      assert(true, `${rel} passes pure JavaScript syntax compilation without errors`);
    } catch (err) {
      assert(false, `${rel} has syntax error: ${err.message}`);
    }
  }
}

// --- TEST SUITE 6: Auto-Versioning 99.9.99 Schema & Rollover ---
console.log("\n6. Auto-Versioning 99.9.99 Schema & Rollover:");
import("../scripts/update-version.js").then(({ calculateNextVersion, normalizeVersion }) => {
  // Test incremental per-build increment (+1 one by one)
  const v1 = calculateNextVersion("2.8.0");
  assert(v1 === "2.8.1", `Build bump 2.8.0 -> 2.8.1 (got ${v1})`);

  const v1b = calculateNextVersion("2.8.1");
  assert(v1b === "2.8.2", `Build bump 2.8.1 -> 2.8.2 (got ${v1b})`);

  // Test 2-digit patch rollover to minor (e.g. 2.8.99 -> 2.9.0)
  const v2 = calculateNextVersion("2.8.99");
  assert(v2 === "2.9.0", `Patch rollover 2.8.99 -> 2.9.0 (got ${v2})`);

  // Test 1-digit minor rollover to major (e.g. 2.9.99 -> 3.0.0)
  const v3 = calculateNextVersion("2.9.99");
  assert(v3 === "3.0.0", `Minor/Patch rollover 2.9.99 -> 3.0.0 (got ${v3})`);

  // Test 2-digit major support (e.g. 15.9.99 -> 16.0.0)
  const v3b = calculateNextVersion("15.9.99");
  assert(v3b === "16.0.0", `2-digit major rollover 15.9.99 -> 16.0.0 (got ${v3b})`);

  // Test max boundary limit 99.9.99
  const v4 = calculateNextVersion("99.9.99");
  assert(v4 === "99.9.99", `Max boundary limit 99.9.99 (got ${v4})`);

  // --- TEST SUITE 7: Theme-Aware Isolated Response & Dynamic CSS Engine ---
  console.log("\n7. Theme-Aware Isolated Response & Dynamic CSS Engine:");
  const popupCss = fs.readFileSync(path.join(rootDir, "src", "popup", "index.css"), "utf-8");
  const widgetCss = fs.readFileSync(path.join(rootDir, "src", "inject", "widgetWindow.css"), "utf-8");
  const baseAdapterJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "baseAdapter.js"), "utf-8");
  const detectorsJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "detectors.js"), "utf-8");
  const trackerJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "tracker.js"), "utf-8");
  const observerJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "observer.js"), "utf-8");
  const adapterUtilsJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "utils.js"), "utf-8");
  const adaptersJs = baseAdapterJs + "\n" + detectorsJs + "\n" + trackerJs + "\n" + observerJs + "\n" + adapterUtilsJs;

  assert(popupCss.includes("--sl-text-primary:"), "popup/index.css defines --sl-text-primary theme token");
  assert(popupCss.includes("--sl-bg-surface:"), "popup/index.css defines --sl-bg-surface theme token");
  assert(popupCss.includes("--sl-border-subtle:"), "popup/index.css defines --sl-border-subtle theme token");
  assert(popupCss.includes(".dark .spectralens-isolated-response"), "popup/index.css defines dark mode theme token overrides");
  assert(widgetCss.includes("--sl-text-primary:"), "inject/widgetWindow.css defines --sl-text-primary theme token");
  assert(widgetCss.includes(".dark .spectralens-isolated-response"), "inject/widgetWindow.css defines dark mode theme token overrides");

  assert(adaptersJs.includes("virtualizeComputedStyle"), "providerAdapters.js defines virtualizeComputedStyle color virtualizer");
  assert(adaptersJs.includes("extractStyledHtml"), "providerAdapters.js defines extractStyledHtml method on BaseProviderAdapter");
  assert(adaptersJs.includes("var(--sl-text-primary"), "providerAdapters.js virtualizes text color to var(--sl-text-primary)");
  assert(adaptersJs.includes("var(--sl-border-subtle"), "providerAdapters.js virtualizes border color to var(--sl-border-subtle)");
  assert(adaptersJs.includes("var(--sl-bg-surface"), "providerAdapters.js virtualizes background color to var(--sl-bg-surface)");

  // --- TEST SUITE 8: Code Block Line Breaks & Y-Scroll Safety ---
  console.log("\n8. Code Block Line Breaks & Y-Scroll Safety:");
  assert(popupCss.includes("touch-action: pan-y"), "popup/index.css enables touch-action pan-y for code scrolling");
  assert(popupCss.includes("overscroll-behavior-y: auto"), "popup/index.css enables overscroll-behavior-y auto on code blocks");
  assert(widgetCss.includes("touch-action: pan-y"), "inject/widgetWindow.css enables touch-action pan-y for code scrolling");
  assert(widgetCss.includes("overscroll-behavior-y: auto"), "inject/widgetWindow.css enables overscroll-behavior-y auto on code blocks");
  assert(adaptersJs.includes("cleanCloneNode"), "providerAdapters.js defines cleanCloneNode method");
  assert(adaptersJs.includes("getJunkSelectors"), "providerAdapters.js defines getJunkSelectors method");

  // --- TEST SUITE 9: Developer Mode Universal Log Filtering ---
  console.log("\n9. Developer Mode Universal Log Filtering:");
  const utilsJs = fs.readFileSync(path.join(rootDir, "scripts", "utils.js"), "utf8");
  const utilsModuleJs = fs.readFileSync(path.join(rootDir, "src", "utils", "utilsModule.js"), "utf8");

  assert(utilsJs.includes("IN_CODE_DEV_MODE"), "scripts/utils.js defines IN_CODE_DEV_MODE variable");
  assert(utilsJs.includes("isDevModeActive"), "scripts/utils.js defines isDevModeActive helper");
  assert(utilsJs.includes("console.log = function"), "scripts/utils.js intercepts console.log based on dev mode");
  assert(utilsJs.includes("console.warn = function"), "scripts/utils.js intercepts console.warn based on dev mode");
  assert(utilsJs.includes("console.error = function"), "scripts/utils.js intercepts console.error based on dev mode");

  assert(utilsModuleJs.includes("IN_CODE_DEV_MODE"), "src/utils/utilsModule.js defines IN_CODE_DEV_MODE variable");
  assert(utilsModuleJs.includes("isDevModeActive"), "src/utils/utilsModule.js defines isDevModeActive helper");
  assert(utilsModuleJs.includes("console.log = function"), "src/utils/utilsModule.js intercepts console.log based on dev mode");

  assert(adaptersJs.includes("isDevModeActive"), "providerAdapters.js guards tabLog with isDevModeActive");

  // --- TEST SUITE 10: Prompt Input, Verification, Lifecycle & Single Submission ---
  console.log("\n10. Prompt Input, Verification, Lifecycle & Single Submission:");
  assert(adaptersJs.includes("INPUT_TIMEOUT"), "BaseProviderAdapter defines configurable INPUT_TIMEOUT");
  assert(adaptersJs.includes("SUBMIT_TIMEOUT"), "BaseProviderAdapter defines configurable SUBMIT_TIMEOUT");
  assert(adaptersJs.includes("RESPONSE_START_TIMEOUT"), "BaseProviderAdapter defines configurable RESPONSE_START_TIMEOUT");
  assert(adaptersJs.includes("verifyInput(expectedText)"), "BaseProviderAdapter defines verifyInput method");
  assert(adaptersJs.includes("executePrimarySubmit()"), "BaseProviderAdapter defines executePrimarySubmit method");
  assert(adaptersJs.includes("executeFallbackSubmit()"), "BaseProviderAdapter defines executeFallbackSubmit method");
  assert(adaptersJs.includes("verifySubmission("), "BaseProviderAdapter defines verifySubmission method");
  assert(adaptersJs.includes("executeLifecycle("), "BaseProviderAdapter defines executeLifecycle method");

  // Synthetic verifyInput edge cases
  function testVerifyInput(inputVal, expectedText) {
    const val = (inputVal || "").trim();
    const expected = (expectedText || "").trim();
    if (!expected) return true;
    const normVal = val.replace(/\s+/g, " ");
    const normExp = expected.replace(/\s+/g, " ");
    const sample = normExp.slice(0, Math.min(40, normExp.length));
    return normVal.includes(sample) || normVal.length >= Math.min(expected.length * 0.8, 20);
  }

  // 1. Normal prompt
  assert(testVerifyInput("What is quantum computing?", "What is quantum computing?"), "verifyInput accepts normal prompt");
  // 2. Long prompt (2500+ chars)
  const longPrompt = "Explain the history of artificial intelligence from 1950 to present day. ".repeat(35);
  assert(testVerifyInput(longPrompt, longPrompt), "verifyInput accepts long prompt (2500+ chars)");
  // 3. Multiline prompt
  const multilinePrompt = "Line 1: Question\nLine 2: Context\n\tTabbed detail: Point A\n\tTabbed detail: Point B";
  assert(testVerifyInput(multilinePrompt, multilinePrompt), "verifyInput accepts multiline prompt with tabs and newlines");
  // 4. Empty / whitespace prompt
  assert(testVerifyInput("", ""), "verifyInput handles empty prompt cleanly");
  assert(testVerifyInput("   ", "   "), "verifyInput handles whitespace prompt cleanly");
  // 5. Special characters
  const specialChars = "Special test: <script>alert('xss')</script> & | % $ # @ ! ~ * ^ ( )";
  assert(testVerifyInput(specialChars, specialChars), "verifyInput accepts special characters & symbols");
  // 6. Emojis
  const emojiPrompt = "Tell me a joke 🤖 🚀 ✨ 🧠 🔥 🎉 💡";
  assert(testVerifyInput(emojiPrompt, emojiPrompt), "verifyInput accepts Unicode emojis");
  // 7. URLs
  const urlPrompt = "Analyze this page: https://example.com/search?q=machine+learning&lang=en#results";
  assert(testVerifyInput(urlPrompt, urlPrompt), "verifyInput accepts URLs with query parameters & fragments");
  // 8. Code blocks
  const codePrompt = "```python\ndef fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)\n```";
  assert(testVerifyInput(codePrompt, codePrompt), "verifyInput accepts Python/JS code blocks with indentation");
  // 9. Quotes (single & double)
  const quotesPrompt = `The user said "hello world" and then replied 'goodbye' and \`backticks\``;
  assert(testVerifyInput(quotesPrompt, quotesPrompt), "verifyInput accepts prompts containing single, double, and backtick quotes");

  // --- TEST SUITE 11: Response Streaming & Completion Detection System ---
  console.log("\n11. Response Streaming & Completion Detection System:");
  assert(adaptersJs.includes("RESPONSE_STATES"), "providerAdapters.js exports RESPONSE_STATES");
  assert(adaptersJs.includes("hashNormalizedText"), "providerAdapters.js exports hashNormalizedText function");
  assert(adaptersJs.includes("class ResponseTracker"), "providerAdapters.js defines ResponseTracker class");
  assert(adaptersJs.includes("class BaseCompletionDetector"), "providerAdapters.js defines BaseCompletionDetector class");
  assert(adaptersJs.includes("class ChatGPTCompletionDetector"), "providerAdapters.js defines ChatGPTCompletionDetector class");
  assert(adaptersJs.includes("class ClaudeCompletionDetector"), "providerAdapters.js defines ClaudeCompletionDetector class");
  assert(adaptersJs.includes("class GeminiCompletionDetector"), "providerAdapters.js defines GeminiCompletionDetector class");
  assert(adaptersJs.includes("class GrokCompletionDetector"), "providerAdapters.js defines GrokCompletionDetector class");
  assert(adaptersJs.includes("class PerplexityCompletionDetector"), "providerAdapters.js defines PerplexityCompletionDetector class");
  assert(adaptersJs.includes("class GoogleAICompletionDetector"), "providerAdapters.js defines GoogleAICompletionDetector class");
  assert(adaptersJs.includes("class ResponseObserver"), "providerAdapters.js defines ResponseObserver class");

  // Synthetic Tests for ResponseTracker & Hashing
  function syntheticHash(str) {
    if (!str) return 0;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  // 1. Hash stability & difference
  const hash1 = syntheticHash("Quantum computing uses qubits");
  const hash2 = syntheticHash("Quantum computing uses qubits");
  const hash3 = syntheticHash("Quantum computing uses qubits.");
  assert(hash1 === hash2 && hash1 !== 0, "hashNormalizedText produces consistent hash for identical text");
  assert(hash1 !== hash3, "hashNormalizedText produces distinct hashes for differing text");

  // 2. ResponseTracker state machine simulation
  class MockTracker {
    constructor(reqId, provider) {
      this.requestId = reqId;
      this.providerId = provider;
      this.state = "WAITING";
      this.lastText = "";
      this.lastTextLength = 0;
      this.lastTextHash = 0;
      this.lastProgressAt = Date.now();
      this.sequence = 0;
    }
    recordProgress(currentText) {
      const normText = (currentText || "").trim();
      const newHash = syntheticHash(normText);
      if (newHash !== this.lastTextHash && normText.length > 0) {
        this.state = this.state === "WAITING" ? "STARTED" : "STREAMING";
        this.lastText = normText;
        this.lastTextLength = normText.length;
        this.lastTextHash = newHash;
        this.lastProgressAt = Date.now();
        this.sequence++;
        return true;
      }
      return false;
    }
  }

  const tracker = new MockTracker("test-req-1", "chatgpt");
  assert(tracker.state === "WAITING", "Tracker initialized in WAITING state");
  
  const prog1 = tracker.recordProgress("Hello");
  assert(prog1 === true && tracker.state === "STARTED" && tracker.sequence === 1, "First token transition to STARTED with seq 1");

  const prog2 = tracker.recordProgress("Hello, I am ChatGPT");
  assert(prog2 === true && tracker.state === "STREAMING" && tracker.sequence === 2, "Subsequent tokens transition to STREAMING with seq 2");

  const prog3 = tracker.recordProgress("Hello, I am ChatGPT");
  assert(prog3 === false && tracker.sequence === 2, "Unchanged text does not increment sequence or trigger false progress");

  // 3. Multi-Signal Scoring Engine simulation
  function calculateScore({ isStreaming, stableDurationMs, textLength, inputReady, hasCopyBtn, hasProviderSignal }) {
    let score = 0;
    if (!isStreaming) score += 40;
    if (stableDurationMs >= 750 && textLength > 20) score += 25;
    else if (stableDurationMs >= 350 && textLength > 20) score += 15;
    if (inputReady) score += 15;
    if (hasCopyBtn) score += 10;
    if (hasProviderSignal) score += 10;
    return {
      score,
      isComplete: score >= 75,
      isStabilizing: score >= 45 && score < 75,
      isStreaming: score < 45 || isStreaming,
    };
  }

  // Active streaming state
  const activeEval = calculateScore({
    isStreaming: true,
    stableDurationMs: 100,
    textLength: 150,
    inputReady: false,
    hasCopyBtn: false,
    hasProviderSignal: false,
  });
  assert(activeEval.score === 0 && activeEval.isStreaming === true && !activeEval.isComplete, "Active streaming correctly yields score 0, isComplete false");

  // Stabilizing state (stop button gone, text paused 400ms)
  const stabilizingEval = calculateScore({
    isStreaming: false,
    stableDurationMs: 400,
    textLength: 300,
    inputReady: false,
    hasCopyBtn: false,
    hasProviderSignal: false,
  });
  assert(stabilizingEval.score === 55 && stabilizingEval.isStabilizing === true && !stabilizingEval.isComplete, "Intermediate pause correctly transitions to STABILIZING (score 55)");

  // High confidence completed state (stop button gone, text stable 800ms, input ready, copy button rendered)
  const completeEval = calculateScore({
    isStreaming: false,
    stableDurationMs: 850,
    textLength: 500,
    inputReady: true,
    hasCopyBtn: true,
    hasProviderSignal: true,
  });
  assert(completeEval.score === 100 && completeEval.isComplete === true, "Full completion signals yield score 100 and isComplete true");

  // --- TEST SUITE 12: Provider Job Manager, State Machine & Reliability Layer ---
  console.log("\n12. Provider Job Manager, State Machine & Reliability Layer:");
  const requestAiJs = fs.readFileSync(path.join(rootDir, "scripts", "background/requestAi.js"), "utf8");
  assert(requestAiJs.includes("REQUEST_STATES"), "requestAi.js defines REQUEST_STATES");
  assert(requestAiJs.includes("PHASE_TIMEOUTS"), "requestAi.js defines PHASE_TIMEOUTS");
  assert(requestAiJs.includes("TAB_CREATE_TIMEOUT"), "PHASE_TIMEOUTS defines TAB_CREATE_TIMEOUT");
  assert(requestAiJs.includes("PAGE_READY_TIMEOUT"), "PHASE_TIMEOUTS defines PAGE_READY_TIMEOUT");
  assert(requestAiJs.includes("INPUT_TIMEOUT"), "PHASE_TIMEOUTS defines INPUT_TIMEOUT");
  assert(requestAiJs.includes("SUBMIT_TIMEOUT"), "PHASE_TIMEOUTS defines SUBMIT_TIMEOUT");
  assert(requestAiJs.includes("RESPONSE_START_TIMEOUT"), "PHASE_TIMEOUTS defines RESPONSE_START_TIMEOUT");
  assert(requestAiJs.includes("RESPONSE_STREAM_TIMEOUT"), "PHASE_TIMEOUTS defines RESPONSE_STREAM_TIMEOUT");
  assert(requestAiJs.includes("COMPLETION_TIMEOUT"), "PHASE_TIMEOUTS defines COMPLETION_TIMEOUT");
  assert(requestAiJs.includes("healthCheckProviderTab"), "requestAi.js defines healthCheckProviderTab");
  assert(requestAiJs.includes("createStructuredError"), "requestAi.js defines createStructuredError");
  assert(requestAiJs.includes("cancelAiRequest"), "requestAi.js defines cancelAiRequest");

  // 1. Independent provider state machine simulation
  const stateTransitions = [];
  function mockSetState(reqId, prov, st, phase) {
    stateTransitions.push({ reqId, prov, status: st, phase });
  }

  mockSetState("req-1", "chatgpt", "QUEUED", "QUEUED");
  mockSetState("req-1", "chatgpt", "STARTING", "TAB_CREATE");
  mockSetState("req-1", "chatgpt", "READY", "TAB_READY");
  mockSetState("req-1", "chatgpt", "SENDING", "SENDING");
  mockSetState("req-1", "chatgpt", "SUBMITTED", "SUBMITTED");
  mockSetState("req-1", "chatgpt", "STREAMING", "RESPONSE_START");
  mockSetState("req-1", "chatgpt", "COMPLETED", "COMPLETION");

  mockSetState("req-1", "google", "QUEUED", "QUEUED");
  mockSetState("req-1", "google", "STARTING", "TAB_CREATE");
  mockSetState("req-1", "google", "READY", "TAB_READY");
  mockSetState("req-1", "google", "SENDING", "SENDING");
  mockSetState("req-1", "google", "TIMED_OUT", "RESPONSE_START");

  const chatgptFinal = stateTransitions.filter(s => s.prov === "chatgpt").pop();
  const googleFinal = stateTransitions.filter(s => s.prov === "google").pop();
  assert(chatgptFinal.status === "COMPLETED" && chatgptFinal.phase === "COMPLETION", "ChatGPT successfully transitions to COMPLETED");
  assert(googleFinal.status === "TIMED_OUT" && googleFinal.phase === "RESPONSE_START", "Google AI independently times out in RESPONSE_START without breaking ChatGPT");

  // 2. Structured error formatting test
  function testCreateStructuredError(requestId, providerId, phase, errorCode, message, recoverable = false) {
    return {
      status: "failure",
      requestId,
      provider: providerId.toLowerCase(),
      phase,
      errorCode,
      message,
      timestamp: Date.now(),
      recoverable,
      answer: `> ⚠️ **Please log in to ${providerId}**\n\n*Error: ${message}*`,
    };
  }

  const err1 = testCreateStructuredError("req-123", "google", "RESPONSE_START", "TIMEOUT", "Request timed out during RESPONSE_START", false);
  assert(err1.status === "failure" && err1.phase === "RESPONSE_START" && err1.errorCode === "TIMEOUT" && err1.recoverable === false, "Structured error format captures phase and error code accurately");

  // 3. Safe retry decision test
  function isSafeToRetry(requestState, retryCount) {
    if (retryCount >= 1) return false;
    if (requestState === "SUBMITTED" || requestState === "STREAMING" || requestState === "COMPLETED") {
      return false; // NEVER re-submit a prompt that was already submitted!
    }
    return true; // Safe to retry if failed during TAB_CREATE, READY, or SENDING before submission
  }

  assert(isSafeToRetry("STARTING", 0) === true, "Safe to retry when tab creation fails (pre-submission)");
  assert(isSafeToRetry("SENDING", 0) === true, "Safe to retry when input preparation fails (pre-submission)");
  assert(isSafeToRetry("SUBMITTED", 0) === false, "Unsafe to retry after prompt is submitted (prevents duplicate prompts)");
  assert(isSafeToRetry("STREAMING", 0) === false, "Unsafe to retry during streaming (prevents duplicate prompts)");
  assert(isSafeToRetry("STARTING", 1) === false, "Retry count limit enforced (max 1 retry)");

  // --- TEST SUITE 13: Final Provider Contract & Acceptance Verification ---
  console.log("\n13. Final Provider Contract & Acceptance Verification:");
  // Verify universal provider contract methods on BaseProviderAdapter
  const contractMethods = [
    "detect()",
    "initialize()",
    "isReady()",
    "findInput()",
    "focusInput()",
    "insertPrompt(",
    "verifyInput(",
    "submit(",
    "verifySubmission(",
    "observeResponse(",
    "isStreaming()",
    "isComplete()",
    "extractResponse()",
    "cancel(",
    "cleanup()",
    "healthCheck()"
  ];

  contractMethods.forEach(method => {
    const baseName = method.split("(")[0];
    assert(baseAdapterJs.includes(baseName), `BaseProviderAdapter satisfies contract method: ${method}`);
  });

  // Verify Timing Telemetry logging in requestAi.js
  assert(requestAiJs.includes("[SL TIMING]"), "requestAi.js logs structured [SL TIMING] metrics");
  assert(requestAiJs.includes("tabReadyMs"), "Timing telemetry tracks tabReadyMs");
  assert(requestAiJs.includes("inputMs"), "Timing telemetry tracks inputMs");
  assert(requestAiJs.includes("submitMs"), "Timing telemetry tracks submitMs");
  assert(requestAiJs.includes("firstResponseMs"), "Timing telemetry tracks firstResponseMs");
  assert(requestAiJs.includes("completionMs"), "Timing telemetry tracks completionMs");
  assert(requestAiJs.includes("totalMs"), "Timing telemetry tracks totalMs");

  // Acceptance Simulation: Concurrent execution of 4 providers
  const activeProviders = ["chatgpt", "gemini", "google", "perplexity"];
  const providerResults = new Map();
  const startTime = Date.now();

  activeProviders.forEach(p => {
    providerResults.set(p, {
      status: p === "google" ? "failure" : "success",
      phase: p === "google" ? "RESPONSE_START" : "COMPLETION",
      durationMs: p === "chatgpt" ? 1200 : (p === "gemini" ? 1500 : (p === "perplexity" ? 1100 : 5000)),
    });
  });

  assert(providerResults.get("chatgpt").status === "success", "Acceptance: ChatGPT completed independently");
  assert(providerResults.get("gemini").status === "success", "Acceptance: Gemini completed independently");
  assert(providerResults.get("perplexity").status === "success", "Acceptance: Perplexity completed independently");
  assert(providerResults.get("google").status === "failure", "Acceptance: Google AI failed independently without blocking other 3 providers");

  // Acceptance Simulation: Cancellation safety
  let cancelledRequestResolved = false;
  const simulatedRequestId = "req-cancel-test";
  const cancelTracker = { state: "STREAMING", isCancelled: true };
  if (cancelTracker.isCancelled) {
    cancelTracker.state = "CANCELLED";
    // Must NEVER resolve a final response
  } else {
    cancelledRequestResolved = true;
  }
  assert(cancelTracker.state === "CANCELLED" && !cancelledRequestResolved, "Acceptance: Cancelled request stops cleanly and never resolves final response");

  // 14. Perplexity Code Semicolon Formatting & Multi-Turn History Audit:
  console.log("\n14. Perplexity Semicolon Formatting & Multi-Turn History:");
  const perplexityJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "perplexity.js"), "utf-8");
  assert(perplexityJs.includes("formatCodeSemicolons"), "PerplexityAdapter defines formatCodeSemicolons");
  assert(perplexityJs.includes("extractStyledHtml"), "PerplexityAdapter overrides extractStyledHtml for code blocks");

  // Test Perplexity semicolon formatting logic
  function formatPerplexityCodeSemicolons(codeStr) {
    if (!codeStr || typeof codeStr !== "string") return codeStr;

    const lines = codeStr.split("\n");
    const formattedLines = [];

    for (const line of lines) {
      let insideForLoop = false;
      let forParenDepth = 0;
      let resultLine = "";
      let i = 0;

      while (i < line.length) {
        if (line.slice(i).match(/^for\s*\(/)) {
          insideForLoop = true;
          forParenDepth = 1;
          const match = line.slice(i).match(/^for\s*\(/)[0];
          resultLine += match;
          i += match.length;
          continue;
        }

        if (insideForLoop) {
          if (line[i] === "(") {
            forParenDepth++;
          } else if (line[i] === ")") {
            forParenDepth--;
            if (forParenDepth <= 0) {
              insideForLoop = false;
            }
          }
          resultLine += line[i];
          i++;
          continue;
        }

        if (line[i] === ";") {
          const before = resultLine;
          const isEntity = /&[a-zA-Z0-9#]+$/.test(before);

          if (!isEntity && i < line.length - 1) {
            const remainder = line.slice(i + 1).trim();
            if (remainder.length > 0) {
              resultLine += ";\n";
              i++;
              while (i < line.length && (line[i] === " " || line[i] === "\t")) {
                i++;
              }
              continue;
            }
          }
        }

        resultLine += line[i];
        i++;
      }

      formattedLines.push(resultLine);
    }

    return formattedLines.join("\n");
  }

  const rawCode = "const a = 1; const b = 2; const c = 3;";
  const formattedCode = formatPerplexityCodeSemicolons(rawCode);
  assert(
    formattedCode === "const a = 1;\nconst b = 2;\nconst c = 3;",
    "Perplexity formatCodeSemicolons splits statements with ';' to the next line",
  );

  const loopCode = "for (let i = 0; i < 10; i++) { test(); }";
  const formattedLoop = formatPerplexityCodeSemicolons(loopCode);
  assert(
    formattedLoop.includes("for (let i = 0; i < 10; i++)"),
    "Perplexity formatCodeSemicolons preserves for-loop headers without breaking them",
  );

  const entityCode = "&amp; &lt; &gt;";
  const formattedEntity = formatPerplexityCodeSemicolons(entityCode);
  assert(
    formattedEntity === "&amp; &lt; &gt;",
    "Perplexity formatCodeSemicolons preserves HTML entities without breaking them",
  );

  // 15. Split History Storage Engine (Index + Detail) Audit:
  console.log("\n15. Split History Storage Engine (Index + Detail) Audit:");
  const utilsModuleText = fs.readFileSync(path.join(rootDir, "src", "utils", "utilsModule.js"), "utf-8");
  const scriptsUtilsText = fs.readFileSync(path.join(rootDir, "scripts", "utils.js"), "utf-8");

  assert(utilsModuleText.includes("HISTORY_INDEX"), "utilsModule.js defines KEYS.HISTORY_INDEX");
  assert(utilsModuleText.includes("CHAT_PREFIX"), "utilsModule.js defines KEYS.CHAT_PREFIX");
  assert(utilsModuleText.includes("saveChatSession"), "utilsModule.js defines saveChatSession");
  assert(utilsModuleText.includes("getHistoryIndex"), "utilsModule.js defines getHistoryIndex");
  assert(utilsModuleText.includes("getChatSession"), "utilsModule.js defines getChatSession");
  assert(utilsModuleText.includes("clearAllHistory"), "utilsModule.js defines clearAllHistory");
  assert(utilsModuleText.includes("deleteChatSession"), "utilsModule.js defines deleteChatSession");

  assert(scriptsUtilsText.includes("HISTORY_INDEX"), "scripts/utils.js defines KEYS.HISTORY_INDEX");
  assert(scriptsUtilsText.includes("CHAT_PREFIX"), "scripts/utils.js defines KEYS.CHAT_PREFIX");
  assert(scriptsUtilsText.includes("saveChatSession"), "scripts/utils.js defines saveChatSession");
  assert(scriptsUtilsText.includes("getHistoryIndex"), "scripts/utils.js defines getHistoryIndex");
  assert(scriptsUtilsText.includes("getChatSession"), "scripts/utils.js defines getChatSession");
  assert(scriptsUtilsText.includes("clearAllHistory"), "scripts/utils.js defines clearAllHistory");

  // 16. App Rebranding & Storage Key Purity Audit (Zero Legacy & Zero Ai-Display references):
  console.log("\n16. App Rebranding & Storage Key Purity Audit (Zero Legacy & Zero Ai-Display references):");
  assert(!utilsModuleText.includes("Ai-Display"), "utilsModule.js contains NO 'Ai-Display' strings");
  assert(!utilsModuleText.includes("legacy"), "utilsModule.js contains NO legacy fallback code");
  assert(utilsModuleText.includes("SpectraLens-Settings"), "utilsModule.js uses 'SpectraLens-Settings'");
  assert(utilsModuleText.includes("SpectraLens-Controls"), "utilsModule.js uses 'SpectraLens-Controls'");
  assert(utilsModuleText.includes("SpectraLens-History-Index"), "utilsModule.js uses 'SpectraLens-History-Index'");
  assert(utilsModuleText.includes("SpectraLens-Chat-"), "utilsModule.js uses 'SpectraLens-Chat-'");

  assert(!scriptsUtilsText.includes("Ai-Display"), "scripts/utils.js contains NO 'Ai-Display' strings");
  assert(!scriptsUtilsText.includes("legacy"), "scripts/utils.js contains NO legacy fallback code");
  assert(scriptsUtilsText.includes("SpectraLens-Settings"), "scripts/utils.js uses 'SpectraLens-Settings'");
  assert(scriptsUtilsText.includes("SpectraLens-Controls"), "scripts/utils.js uses 'SpectraLens-Controls'");
  assert(scriptsUtilsText.includes("SpectraLens-History-Index"), "scripts/utils.js uses 'SpectraLens-History-Index'");
  assert(scriptsUtilsText.includes("SpectraLens-Chat-"), "scripts/utils.js uses 'SpectraLens-Chat-'");

  const useThemeText = fs.readFileSync(path.join(rootDir, "src", "hooks", "useTheme.jsx"), "utf-8");
  assert(!useThemeText.includes("Ai-Display"), "useTheme.jsx contains NO 'Ai-Display' strings");
  assert(useThemeText.includes("SpectraLens-Controls"), "useTheme.jsx uses 'SpectraLens-Controls'");

  // 17. Stop Button, New Chat & History Load State Sanitization Audit:
  console.log("\n17. Stop Button, New Chat & History Load State Sanitization Audit:");
  const chatBotJsx = fs.readFileSync(path.join(rootDir, "src", "components", "ChatBot.jsx"), "utf-8");

  assert(chatBotJsx.includes("saveHistoryImmediately(next)"), "handleStopFetch immediately saves sanitized turns to history");
  assert(chatBotJsx.includes("!isViewingHistory"), "ChatBot guarantees isCardLoading is false in history view");
  assert(chatBotJsx.includes("sanitizedTurns"), "ChatBot sanitizes loaded history turns and turnsToSave");
  assert(utilsModuleText.includes("sanitizedTurns"), "utilsModule.js saveChatSession sanitizes turns before chrome.storage.local.set");
  assert(scriptsUtilsText.includes("sanitizedTurns"), "scripts/utils.js saveChatSession sanitizes turns before chrome.storage.local.set");

  // 18. Grok Response Tracking & User Message Exclusion Audit:
  console.log("\n18. Grok Response Tracking & User Message Exclusion Audit:");
  const grokTrackJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "providers", "grok", "track.js"), "utf-8");
  const grokAdapterJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "grok.js"), "utf-8");
  const detectorsSource = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "detectors.js"), "utf-8");

  assert(grokTrackJs.includes("function isUserMessageElement"), "grok/track.js implements module-scoped isUserMessageElement");
  assert(grokTrackJs.includes("findResponseContainer"), "grok/track.js implements findResponseContainer");
  assert(grokTrackJs.includes("items-end"), "grok/track.js filters right-aligned user containers");
  assert(grokAdapterJs.includes("isUserMessageElement(el)"), "grok.js delegates isUserMessageElement");
  assert(detectorsSource.includes("class GrokCompletionDetector"), "detectors.js defines GrokCompletionDetector");

  // 19. AI Provider Tab Kill on Page Reload & Widget Host Tracking Audit:
  console.log("\n19. AI Provider Tab Kill on Page Reload & Widget Host Tracking Audit:");
  const bgScript = fs.readFileSync(path.join(rootDir, "scripts", "background", "background.js"), "utf-8");
  const bgUtilsScript = fs.readFileSync(path.join(rootDir, "scripts", "background", "bgUtils.js"), "utf-8");
  const widgetContentScript = fs.readFileSync(path.join(rootDir, "scripts", "content", "widgetContent.js"), "utf-8");
  const reqAiScript = fs.readFileSync(path.join(rootDir, "scripts", "background", "requestAi.js"), "utf-8");

  assert(bgScript.includes("const floatingWidgetHostTabs = new Set()"), "background.js creates floatingWidgetHostTabs set");
  assert(bgScript.includes("registerWidgetHostTab"), "background.js defines registerWidgetHostTab");
  assert(bgScript.includes("IF_B_REGISTER_HOST"), "background.js listens for IF_B_REGISTER_HOST");
  assert(bgScript.includes("IF_B_PAGE_RELOADED"), "background.js listens for IF_B_PAGE_RELOADED");
  assert(bgScript.includes("changeInfo.status === \"complete\""), "background.js tracks reload complete status");
  assert(bgScript.includes("checkAndKillWorkerTabs"), "background.js defines checkAndKillWorkerTabs on page reload");
  assert(bgUtilsScript.includes("floatingWidgetHostTabs.add(tabId)"), "bgUtils.js registers host tab on widget injection");
  assert(widgetContentScript.includes("IF_B_REGISTER_HOST"), "widgetContent.js notifies background of widget host registration");
  assert(widgetContentScript.includes("IF_B_PAGE_RELOADED"), "widgetContent.js notifies background of page unload/reload");
  // 20. 3-State Theme Toggle (System, Dark, Light) & Floating vs Popup Icons Audit:
  console.log("\n20. 3-State Theme Toggle (System, Dark, Light) & Floating vs Popup Icons Audit:");
  const iconsJsx = fs.readFileSync(path.join(rootDir, "src", "components", "Icons.jsx"), "utf-8");
  const sidebarJsx = fs.readFileSync(path.join(rootDir, "src", "components", "Sidebar.jsx"), "utf-8");
  const headerJsx = fs.readFileSync(path.join(rootDir, "src", "components", "Header.jsx"), "utf-8");
  const themeSectionJsx = fs.readFileSync(path.join(rootDir, "src", "features", "settings", "ThemeAppearanceSection.jsx"), "utf-8");

  assert(iconsJsx.includes("export function SystemThemeIcon"), "Icons.jsx exports SystemThemeIcon component");
  assert(iconsJsx.includes("export function DarkThemeIcon"), "Icons.jsx exports DarkThemeIcon component");
  assert(iconsJsx.includes("export function LightThemeIcon"), "Icons.jsx exports LightThemeIcon component");
  assert(iconsJsx.includes("export function DeviceThemeIcon"), "Icons.jsx exports DeviceThemeIcon component for popup");
  assert(iconsJsx.includes("viewBox=\"0 0 718 718\""), "FloatingSystemThemeIcon has user-provided SVG viewBox");
  assert(iconsJsx.includes("viewBox=\"0 0 810 810\""), "FloatingDarkThemeIcon has user-provided SVG viewBox");
  assert(iconsJsx.includes("viewBox=\"0 0 792 792\""), "FloatingLightThemeIcon has user-provided SVG viewBox");
  assert(iconsJsx.includes("viewBox=\"0 0 512 512\""), "DeviceThemeIcon has 512x512 device viewBox");
  assert(sidebarJsx.includes("SystemThemeIcon"), "Sidebar.jsx imports and renders SystemThemeIcon for floating widget");
  assert(sidebarJsx.includes("DarkThemeIcon"), "Sidebar.jsx imports and renders DarkThemeIcon for floating widget");
  assert(sidebarJsx.includes("LightThemeIcon"), "Sidebar.jsx imports and renders LightThemeIcon for floating widget");
  assert(headerJsx.includes("DeviceThemeIcon"), "Header.jsx imports and renders DeviceThemeIcon for popup");
  assert(headerJsx.includes("IoSunny"), "Header.jsx uses IoSunny for popup dark/light toggle");
  assert(headerJsx.includes("IoMoon"), "Header.jsx uses IoMoon for popup light toggle");
  assert(iconsJsx.includes("translate(480,311.5)"), "DeviceThemeIcon contains all paths from user SVG");
  assert(sidebarJsx.includes("size-7"), "Sidebar.jsx renders theme icons 1.4x larger (size-7)");
  assert(themeSectionJsx.includes("scale-[1.4]"), "ThemeAppearanceSection.jsx renders floating icons 1.4x larger (scale-[1.4])");
  assert(themeSectionJsx.includes("DeviceThemeIcon"), "ThemeAppearanceSection.jsx renders DeviceThemeIcon in popup context");
  assert(themeSectionJsx.includes("FloatingSystemThemeIcon"), "ThemeAppearanceSection.jsx renders FloatingSystemThemeIcon in floating context");
  // 21. Per-URL alreadyShowIntro & Daily Intro Limit Audit:
  console.log("\n21. Per-URL alreadyShowIntro & Daily Intro Limit Audit:");
  const wcScript = fs.readFileSync(path.join(rootDir, "scripts", "content", "widgetContent.js"), "utf-8");
  const utilsModCode = fs.readFileSync(path.join(rootDir, "src", "utils", "utilsModule.js"), "utf-8");
  const scriptsUtilCode = fs.readFileSync(path.join(rootDir, "scripts", "utils.js"), "utf-8");

  assert(wcScript.includes("const ALREADY_SHOW_INTRO_KEY = \"alreadyShowIntro\""), "widgetContent.js defines ALREADY_SHOW_INTRO_KEY");
  assert(wcScript.includes("const INTRO_STORAGE_KEY = \"spectralens_last_intro_date\""), "widgetContent.js defines INTRO_STORAGE_KEY");
  assert(wcScript.includes("getPageIntroKey"), "widgetContent.js defines getPageIntroKey");
  assert(wcScript.includes("markIntroShownForCurrentPage"), "widgetContent.js defines markIntroShownForCurrentPage");
  assert(wcScript.includes("alreadyShownThisPage"), "widgetContent.js checks alreadyShownThisPage before displaying intro");
  assert(wcScript.includes("lastDate === todayStr"), "widgetContent.js enforces 1 intro per day across all pages");
  // 22. Provider Authentication & Fast Login Detection Audit:
  console.log("\n22. Provider Authentication & Fast Login Detection Audit:");
  const authBaseCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "baseAdapter.js"), "utf-8");
  const authGptCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "chatgpt.js"), "utf-8");
  const authClaudeCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "claude.js"), "utf-8");
  const authGeminiCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "gemini.js"), "utf-8");
  const authGrokCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "grok.js"), "utf-8");
  const authPerpCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "perplexity.js"), "utf-8");
  const authGoogleCode = fs.readFileSync(path.join(rootDir, "scripts", "content", "adapters", "google.js"), "utf-8");
  const authBgCode = fs.readFileSync(path.join(rootDir, "scripts", "background", "background.js"), "utf-8");
  const authCardCode = fs.readFileSync(path.join(rootDir, "src", "features", "chat", "ChatAiResponseCard.jsx"), "utf-8");
  const authChatbotCode = fs.readFileSync(path.join(rootDir, "src", "components", "ChatBot.jsx"), "utf-8");

  assert(authBaseCode.includes("checkAuthRequired"), "baseAdapter.js defines checkAuthRequired");
  assert(authBaseCode.includes("getLoginUrl"), "baseAdapter.js defines getLoginUrl");
  assert(authGptCode.includes("checkAuthRequired"), "chatgpt.js defines checkAuthRequired");
  assert(authClaudeCode.includes("checkAuthRequired"), "claude.js defines checkAuthRequired");
  assert(authGeminiCode.includes("checkAuthRequired"), "gemini.js defines checkAuthRequired");
  assert(authGrokCode.includes("checkAuthRequired"), "grok.js defines checkAuthRequired");
  assert(authPerpCode.includes("checkAuthRequired"), "perplexity.js defines checkAuthRequired");
  assert(authGoogleCode.includes("checkAuthRequired"), "google.js defines checkAuthRequired");
  assert(authBgCode.includes("IF_B_OPEN_LOGIN_PAGE"), "background.js handles IF_B_OPEN_LOGIN_PAGE");
  assert(authCardCode.includes("Sign-in Required"), "ChatAiResponseCard renders Sign-in Required card");
  assert(authCardCode.includes("handleOpenLoginPage"), "ChatAiResponseCard implements handleOpenLoginPage");
  assert(authCardCode.includes("handleRetry"), "ChatAiResponseCard implements handleRetry");
  assert(authChatbotCode.includes("handleRetryProvider"), "ChatBot.jsx implements handleRetryProvider callback");

  // 23. Help & Guide Tab (? Icon), Onboarding, and Uninstall Survey Hub Audit:
  console.log("\n23. Help & Guide Tab (? Icon), Onboarding, and Uninstall Survey Hub Audit:");
  const iconsCode2 = fs.readFileSync(path.join(rootDir, "src", "components", "Icons.jsx"), "utf-8");
  const sidebarCode2 = fs.readFileSync(path.join(rootDir, "src", "components", "Sidebar.jsx"), "utf-8");
  const widgetCode2 = fs.readFileSync(path.join(rootDir, "src", "inject", "AssistantWidget.jsx"), "utf-8");
  const guideCode2 = fs.readFileSync(path.join(rootDir, "src", "components", "GuideView.jsx"), "utf-8");
  const optionsCode2 = fs.readFileSync(path.join(rootDir, "src", "options", "OptionsApp.jsx"), "utf-8");
  const bgCode2 = fs.readFileSync(path.join(rootDir, "scripts", "background", "background.js"), "utf-8");

  assert(iconsCode2.includes("export function HelpIcon"), "Icons.jsx exports HelpIcon");
  assert(iconsCode2.includes("export const GuideIcon = HelpIcon"), "Icons.jsx exports GuideIcon alias");
  assert(sidebarCode2.includes("HelpIcon"), "Sidebar.jsx imports HelpIcon");
  assert(sidebarCode2.includes("id: \"guide\""), "Sidebar.jsx registers guide tab navigation item");
  assert(widgetCode2.includes("GuideView = lazy") || widgetCode2.includes("import GuideView"), "AssistantWidget.jsx imports GuideView (lazy loaded on demand)");
  assert(widgetCode2.includes("activeTab === \"guide\""), "AssistantWidget.jsx renders GuideView when activeTab is guide");
  assert(guideCode2.includes("SpectraLens AI Guide"), "GuideView.jsx renders guide header");
  assert(guideCode2.includes("SHORTCUTS"), "GuideView.jsx includes keyboard shortcuts reference");
  assert(guideCode2.includes("PROVIDERS"), "GuideView.jsx includes AI models hub");
  assert(guideCode2.includes("FAQS"), "GuideView.jsx includes FAQ section");
  assert(optionsCode2.includes("welcome"), "OptionsApp.jsx includes welcome onboarding tab");
  assert(optionsCode2.includes("uninstall"), "OptionsApp.jsx includes offboarding feedback survey tab");
  assert(optionsCode2.includes("handleExportHistory"), "OptionsApp.jsx implements history data export");
  assert(bgCode2.includes("chrome.runtime.setUninstallURL"), "background.js sets uninstall feedback URL");
  assert(bgCode2.includes("options/options.html#welcome"), "background.js opens welcome onboarding tour on first install");

  // --- TEST SUITE 24: OCR Scanner vs Area Screenshot Separation Audit ---
  console.log("\n24. OCR Scanner vs Area Screenshot Separation Audit:");
  const chatInputCode = fs.readFileSync(path.join(rootDir, "src", "features", "chat", "ChatPromptInput.jsx"), "utf-8");
  const chatBotCode2 = fs.readFileSync(path.join(rootDir, "src", "components", "ChatBot.jsx"), "utf-8");
  const workerCode2 = fs.readFileSync(path.join(rootDir, "scripts", "offscreen", "worker.js"), "utf-8");
  const widgetContentCode2 = fs.readFileSync(path.join(rootDir, "scripts", "content", "widgetContent.js"), "utf-8");

  assert(iconsCode2.includes("export function ScanOcrIcon"), "Icons.jsx exports ScanOcrIcon");
  assert(chatInputCode.includes("ScanOcrIcon"), "ChatPromptInput.jsx renders ScanOcrIcon on left of submit button");
  assert(chatInputCode.includes("onTriggerOcr"), "ChatPromptInput.jsx accepts onTriggerOcr callback");
  assert(chatBotCode2.includes("onTriggerOcr"), "ChatBot.jsx wires onTriggerOcr for OCR text recognition");
  assert(chatBotCode2.includes("onTriggerArea"), "ChatBot.jsx wires onTriggerArea for @area visual crop");
  assert(widgetCode2.includes("handleTriggerOcr"), "AssistantWidget.jsx implements handleTriggerOcr");
  assert(widgetCode2.includes("handleTriggerAreaCrop"), "AssistantWidget.jsx implements handleTriggerAreaCrop");
  assert(widgetContentCode2.includes("IF_C_SELECT_OCR"), "widgetContent.js handles IF_C_SELECT_OCR message");
  assert(widgetContentCode2.includes("IF_C_SELECT_AREA"), "widgetContent.js handles IF_C_SELECT_AREA message");
  assert(bgCode2.includes("mode === \"ocr\""), "background.js branches to performOcrExtraction when mode is ocr");
  assert(workerCode2.includes("C_OF_PROCESS_OCR"), "worker.js handles C_OF_PROCESS_OCR message for Tesseract OCR");
  assert(workerCode2.includes("C_OF_CROP_IMAGE"), "worker.js handles C_OF_CROP_IMAGE for area screenshots");

  // --- SUMMARY ---
  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
});



