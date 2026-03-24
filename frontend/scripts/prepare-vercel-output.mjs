import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const buildBase = path.join(projectRoot, "dist", "frontend", "browser");
const deployOut = path.join(projectRoot, "dist", "frontend", "vercel");

function exists(filePath) {
  return fs.existsSync(filePath);
}

function collectIndexDirs(rootDir, maxDepth = 4) {
  const results = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth) {
      return;
    }

    if (exists(path.join(currentDir, "index.html"))) {
      results.push(currentDir);
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      walk(path.join(currentDir, entry.name), depth + 1);
    }
  }

  if (exists(rootDir)) {
    walk(rootDir, 0);
  }

  return results;
}

function rankEnglishCandidate(candidateDir) {
  const rel = path.relative(buildBase, candidateDir).replace(/\\/g, "/");
  if (!rel) return 100;
  if (rel === "en") return 0;
  if (rel.endsWith("/en")) return 1;
  if (rel.includes("/ka") || rel === "ka") return 50;
  return 10;
}

function findEnglishRoot() {
  const discovered = collectIndexDirs(buildBase, 5);
  if (discovered.length === 0) {
    return null;
  }

  discovered.sort((a, b) => rankEnglishCandidate(a) - rankEnglishCandidate(b));
  return discovered[0];
}

function findKaSource() {
  const discovered = collectIndexDirs(buildBase, 5);
  const kaCandidate = discovered.find((dir) => {
    const rel = path.relative(buildBase, dir).replace(/\\/g, "/");
    return rel === "ka" || rel.endsWith("/ka") || rel.includes("/ka/");
  });
  if (kaCandidate) {
    return kaCandidate;
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
