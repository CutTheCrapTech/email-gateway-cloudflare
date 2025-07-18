import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import fs from "fs-extra";

// --- Path Definitions ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const codeDir = path.join(projectRoot, "extensions");
const outDir = path.join(projectRoot, "dist");

// Manifest paths
const manifestsDir = path.join(codeDir, "manifests");
const chromeManifestDir = path.join(manifestsDir, "chrome");
const firefoxManifestDir = path.join(manifestsDir, "firefox");

// --- ESBuild Configuration ---
const esbuildConfig = {
  entryPoints: [
    path.join(codeDir, "src", "popup.ts"),
    path.join(codeDir, "src", "options.ts"),
    path.join(codeDir, "src", "background.ts"),
  ],
  bundle: true,
  format: "esm",
  target: "es2020",
  loader: { ".ts": "ts" },
};

const contentScriptConfig = {
  entryPoints: [path.join(codeDir, "src", "content.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  loader: { ".ts": "ts" },
};

async function buildExtension(buildConfig) {
  const { name, manifestDir } = buildConfig;
  const extensionOutDir = path.join(outDir, name);
  const commonPublicDir = path.join(codeDir, "public");

  console.log(`\nBuilding "${name}" extension...`);

  try {
    await fs.emptyDir(extensionOutDir);
    console.log(`[${name}] Cleaned output directory: ${extensionOutDir}`);

    await fs.copy(commonPublicDir, extensionOutDir);
    console.log(`[${name}] Copied shared assets from 'extensions/public'`);

    const manifestSrc = path.join(manifestDir, "manifest.json");
    const manifestDest = path.join(extensionOutDir, "manifest.json");
    await fs.copy(manifestSrc, manifestDest);
    console.log(`[${name}] Copied browser-specific manifest.json`);

    await esbuild.build({
      ...esbuildConfig,
      outdir: extensionOutDir,
    });

    await esbuild.build({
      ...contentScriptConfig,
      outdir: extensionOutDir,
    });

    console.log(`[${name}] Successfully bundled TypeScript scripts`);
    console.log(`[${name}] Build completed in: ${extensionOutDir}`);
  } catch (err) {
    console.error(`[${name}] Build failed:`, err);
    process.exit(1);
  }
}

async function createZipArchive(sourceDir, outPath) {
  const archiveName = path.basename(outPath);
  console.log(`Creating zip archive: ${archiveName}...`);
  try {
    // Using the same zip command from the original prepublishOnly script
    execSync(`cd ${sourceDir} && zip -r ${outPath} .`);
    console.log(`✅ Successfully created ${outPath}`);
  } catch (err) {
    console.error(`❌ Failed to create zip archive ${archiveName}:`, err);
    process.exit(1);
  }
}

async function main() {
  await fs.emptyDir(outDir);
  console.log('Cleaned root "dist" directory');

  await fs.copy(
    path.join(projectRoot, "extension-config.json"),
    path.join(outDir, "extension-config.json"),
  );

  const builds = [
    { name: "chrome", manifestDir: chromeManifestDir },
    { name: "firefox", manifestDir: firefoxManifestDir },
  ];

  for (const buildConfig of builds) {
    await buildExtension(buildConfig);
  }

  console.log(`
✅ All builds completed successfully`);

  // --- Create ZIP archives ---
  await createZipArchive(
    path.join(outDir, "chrome"),
    path.join(outDir, "chrome-extension.zip"),
  );
  await createZipArchive(
    path.join(outDir, "firefox"),
    path.join(outDir, "firefox-extension.zip"),
  );
}

main().catch((err) => {
  console.error("Build process failed:", err);
  process.exit(1);
});
