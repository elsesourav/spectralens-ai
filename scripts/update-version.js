import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const packageJsonPath = path.join(rootDir, "package.json");
const manifestPath = path.join(rootDir, "scripts", "manifest.json");

/**
 * Enforces the version limits: Max 9 (Major) . 99 (Minor) . 999 (Patch)
 * Automatically rolls over overflowed parts to the next higher level.
 */
export function normalizeVersion(major, minor, patch) {
  // Handle patch rollover (max 999 -> rolls over to minor)
  if (patch > 999) {
    minor += Math.floor(patch / 1000);
    patch = patch % 1000;
  }

  // Handle minor rollover (max 99 -> rolls over to major)
  if (minor > 99) {
    major += Math.floor(minor / 100);
    minor = minor % 100;
  }

  // Handle major boundary (max 9)
  if (major > 9) {
    major = 9;
    minor = 99;
    patch = 999;
  }

  return [major, minor, patch];
}

/**
 * Automatically increases version +1 on every build (one by one)
 * - Format: Major (max 9) . Minor (max 99) . Patch (max 999)
 * - Every build increments patch by +1 (e.g., 2.8.0 -> 2.8.1 -> 2.8.2)
 * - When patch > 999 -> patch = 0, minor += 1 (e.g., 2.8.999 -> 2.9.0)
 * - When minor > 99  -> minor = 0, major += 1 (e.g., 2.99.999 -> 3.0.0)
 * - Max boundary: 9.99.999
 */
export function calculateNextVersion(currentVersion) {
  const parts = String(currentVersion || "2.8.0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);

  let [major, minor, patch] = parts;

  // Increment by +1 on every build
  patch += 1;
  [major, minor, patch] = normalizeVersion(major, minor, patch);

  console.log(`🔧 [AutoVersion] Build increment (+1): ${currentVersion} -> ${major}.${minor}.${patch}`);
  return `${major}.${minor}.${patch}`;
}

/**
 * Updates only package.json and scripts/manifest.json
 * (Vite build automatically copies scripts/manifest.json into extension/ during build)
 */
function updateVersion() {
  if (!fs.existsSync(packageJsonPath)) {
    console.error("❌ package.json not found!");
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const currentVersion = pkg.version || "2.8.0";

  const nextVersion = calculateNextVersion(currentVersion);

  // 1. Update package.json
  pkg.version = nextVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

  // 2. Update scripts/manifest.json
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.version = nextVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }

  console.log(`📌 Version updated in package.json & scripts/manifest.json: ${currentVersion} -> ${nextVersion}`);
  return nextVersion;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  updateVersion();
}
