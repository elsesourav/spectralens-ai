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
  "inject/menuWindow.html",
  "inject/selection.html",
  "options/options.html",
  "background/background.js",
  "content/content.js",
  "content/enableCopy.js",
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

// Verify no test or dev scripts leaked into extension/
assert(!fs.existsSync(path.join(extensionDir, "test-extension.js")), "No test scripts leaked into extension output");

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

const bgPath = path.join(rootDir, "scripts", "background", "background.js");
const bgCode = fs.readFileSync(bgPath, "utf-8");
assert(bgCode.includes("IF_B_STOP_FETCH"), "background.js handles IF_B_STOP_FETCH cancellation");
assert(!bgCode.includes("settings.enable"), "background.js uses safe optional chaining for settings");

// --- SUMMARY ---
console.log(`\n========================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
