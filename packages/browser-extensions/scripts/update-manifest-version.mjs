import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

// --- Path Definitions ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");

const manifestPaths = [
  path.join(projectRoot, "extensions", "manifests", "chrome", "manifest.json"),
  path.join(projectRoot, "extensions", "manifests", "firefox", "manifest.json"),
];

async function syncManifestVersions() {
  try {
    const packageJson = await fs.readJson(packageJsonPath);
    const newVersion = packageJson.version;

    if (!newVersion) {
      throw new Error("Version not found in package.json");
    }

    console.log(`Syncing manifest files to version: ${newVersion}`);

    for (const manifestPath of manifestPaths) {
      const manifest = await fs.readJson(manifestPath);
      manifest.version = newVersion;
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      const manifestName = path.basename(path.dirname(manifestPath));
      console.log(`- Updated ${manifestName} manifest`);
    }

    console.log("\n✅ All manifest versions are now in sync.");
  } catch (err) {
    console.error("\n❌ Error syncing manifest versions:", err);
    process.exit(1);
  }
}

syncManifestVersions();
