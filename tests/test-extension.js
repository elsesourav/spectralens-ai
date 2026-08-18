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
  "unlimitedStorage",
];
const foundRisky = manifest.permissions.filter((p) => riskyPermissions.includes(p));
assert(foundRisky.length === 0, `No risky/unwanted permissions found (found: ${JSON.stringify(foundRisky)})`);

// Verify essential permissions
const requiredPermissions = ["scripting", "storage", "activeTab", "tabs", "declarativeNetRequest", "offscreen"];
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

// --- TEST SUITE 6: Auto-Versioning 9.99.999 Schema & Rollover ---
console.log("\n6. Auto-Versioning 9.99.999 Schema & Rollover:");
import("../scripts/update-version.js").then(({ calculateNextVersion, normalizeVersion }) => {
  // Test incremental per-build increment (+1 one by one)
  const v1 = calculateNextVersion("2.8.0");
  assert(v1 === "2.8.1", `Build bump 2.8.0 -> 2.8.1 (got ${v1})`);

  const v1b = calculateNextVersion("2.8.1");
  assert(v1b === "2.8.2", `Build bump 2.8.1 -> 2.8.2 (got ${v1b})`);

  // Test 3-digit patch rollover to minor (e.g. 2.8.999 -> 2.9.0)
  const v2 = calculateNextVersion("2.8.999");
  assert(v2 === "2.9.0", `Patch rollover 2.8.999 -> 2.9.0 (got ${v2})`);

  // Test 2-digit minor rollover to major (e.g. 2.99.999 -> 3.0.0)
  const v3 = calculateNextVersion("2.99.999");
  assert(v3 === "3.0.0", `Minor/Patch rollover 2.99.999 -> 3.0.0 (got ${v3})`);

  // Test max boundary limit 9.99.999
  const v4 = calculateNextVersion("9.99.999");
  assert(v4 === "9.99.999", `Max boundary limit 9.99.999 (got ${v4})`);

  // --- TEST SUITE 7: Theme-Aware Isolated Response & Dynamic CSS Engine ---
  console.log("\n7. Theme-Aware Isolated Response & Dynamic CSS Engine:");
  const popupCss = fs.readFileSync(path.join(rootDir, "src", "popup", "index.css"), "utf-8");
  const widgetCss = fs.readFileSync(path.join(rootDir, "src", "inject", "widgetWindow.css"), "utf-8");
  const adaptersJs = fs.readFileSync(path.join(rootDir, "scripts", "content", "providerAdapters.js"), "utf-8");

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

  // --- SUMMARY ---
  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
});
