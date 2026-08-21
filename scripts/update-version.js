import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const packageJsonPath = path.join(rootDir, "package.json");
const manifestPath = path.join(rootDir, "scripts", "manifest.json");

/**
 * Enforces the version limits: Max 99 (Major) . 9 (Minor) . 99 (Patch) -> Max 99.9.99
 * Automatically rolls over overflowed parts to the next higher level.
 */
export function normalizeVersion(major, minor, patch) {
  // Handle patch rollover (max 99 -> rolls over to minor)
  if (patch > 99) {
    minor += Math.floor(patch / 100);
    patch = patch % 100;
  }

  // Handle minor rollover (max 9 -> rolls over to major)
  if (minor > 9) {
    major += Math.floor(minor / 10);
    minor = minor % 10;
  }

  // Handle major boundary (max 99.9.99)
  if (major > 99 || (major === 99 && minor >= 9 && patch >= 99)) {
    major = 99;
    minor = 9;
    patch = 99;
  }

  return [major, minor, patch];
}

/**
 * Automatically increases version +1 on every build (one by one)
 * - Format: Major (max 99) . Minor (max 9) . Patch (max 99)
 * - Every build increments patch by +1 (e.g., 2.9.80 -> 2.9.81)
 * - When patch > 99 -> patch = 0, minor += 1 (e.g., 2.8.99 -> 2.9.0)
 * - When minor > 9   -> minor = 0, major += 1 (e.g., 2.9.99 -> 3.0.0)
 * - Max boundary limit: 99.9.99
 */
export function calculateNextVersion(currentVersion) {
  const parts = String(currentVersion || "2.9.80")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);

  let [major, minor, patch] = parts;

  // Increment by +1 on every build
  patch += 1;
  [major, minor, patch] = normalizeVersion(major, minor, patch);

  console.log(
    `🔧 [AutoVersion] Build increment (+1): ${currentVersion} -> ${major}.${minor}.${patch}`,
  );
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
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(pkg, null, 2) + "\n",
    "utf8",
  );

  // 2. Update scripts/manifest.json
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.version = nextVersion;
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );
  }

  console.log(
    `📌 Version updated in package.json & scripts/manifest.json: ${currentVersion} -> ${nextVersion}`,
  );
  return nextVersion;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)
) {
  updateVersion();
}
