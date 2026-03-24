import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const buildBase = path.join(projectRoot, "dist", "frontend", "browser");
const deployOut = path.join(projectRoot, "dist", "frontend", "vercel");

function exists(filePath) {
  return fs.existsSync(filePath);
}

function findEnglishRoot() {
  const candidates = [
    buildBase,
    path.join(buildBase, "browser"),
    path.join(buildBase, "shellotech"),
    path.join(buildBase, "en")
  ];

  for (const candidate of candidates) {
    if (exists(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

function findKaSource() {
  const candidates = [
    path.join(buildBase, "ka"),
    path.join(buildBase, "browser", "ka"),
    path.join(buildBase, "shellotech", "ka"),
    path.join(buildBase, "en", "ka")
  ];

  for (const candidate of candidates) {
    if (exists(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const englishRoot = findEnglishRoot();
  if (!englishRoot) {
    throw new Error(`Could not find index.html under ${buildBase}`);
  }

  fs.rmSync(deployOut, { recursive: true, force: true });
  ensureDir(path.dirname(deployOut));
  copyDir(englishRoot, deployOut);

  const kaSource = findKaSource();
  if (kaSource) {
    const kaDest = path.join(deployOut, "ka");
    fs.rmSync(kaDest, { recursive: true, force: true });
    copyDir(kaSource, kaDest);
  }

  // If no KA build exists, keep routing stable by mirroring EN.
  const kaIndex = path.join(deployOut, "ka", "index.html");
  if (!exists(kaIndex)) {
    ensureDir(path.join(deployOut, "ka"));
    fs.copyFileSync(path.join(deployOut, "index.html"), kaIndex);
  }

  console.log(`Prepared Vercel output at: ${deployOut}`);
}

main();
