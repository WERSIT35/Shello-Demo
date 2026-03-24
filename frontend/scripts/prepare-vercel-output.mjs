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
  if (rel.includes("/ka") || rel === "ka") return 100;
  if (!rel) return 0;
  if (rel === "en") return 1;
  if (rel.endsWith("/en")) return 2;
  return 5;
}

function extractAssetRefs(indexHtml) {
  const refs = [];
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(indexHtml)) !== null) {
    const value = match[1];
    if (!value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
      continue;
    }
    if (value.endsWith(".js") || value.endsWith(".css")) {
      refs.push(value);
    }
  }
  return refs;
}

function scoreCandidate(candidateDir) {
  const indexPath = path.join(candidateDir, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  const refs = extractAssetRefs(html);
  if (refs.length === 0) {
    return { missing: 999, total: 0 };
  }

  let missing = 0;
  for (const ref of refs) {
    const clean = ref.split("?")[0].split("#")[0];
    const normalized = clean.startsWith("/") ? clean.slice(1) : clean;
    const filePath = path.join(candidateDir, normalized);
    if (!exists(filePath)) {
      missing += 1;
    }
  }

  return { missing, total: refs.length };
}

function findEnglishRoot() {
  const discovered = collectIndexDirs(buildBase, 5);
  if (discovered.length === 0) {
    return null;
  }

  discovered.sort((a, b) => {
    const scoreA = scoreCandidate(a);
    const scoreB = scoreCandidate(b);
    if (scoreA.missing !== scoreB.missing) {
      return scoreA.missing - scoreB.missing;
    }
    if (scoreA.total !== scoreB.total) {
      return scoreB.total - scoreA.total;
    }
    return rankEnglishCandidate(a) - rankEnglishCandidate(b);
  });
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

function findFileByBasename(rootDir, basename, maxDepth = 8) {
  let found = null;

  function walk(currentDir, depth) {
    if (found || depth > maxDepth) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (found) {
        return;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isFile() && entry.name === basename) {
        found = fullPath;
        return;
      }

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      }
    }
  }

  if (exists(rootDir)) {
    walk(rootDir, 0);
  }

  return found;
}

function ensureReferencedAssetsPresent() {
  const indexPath = path.join(deployOut, "index.html");
  if (!exists(indexPath)) {
    return;
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const refs = extractAssetRefs(html);

  for (const ref of refs) {
    const clean = ref.split("?")[0].split("#")[0];
    const relativePath = clean.startsWith("/") ? clean.slice(1) : clean;
    const expectedPath = path.join(deployOut, relativePath);
    if (exists(expectedPath)) {
      continue;
    }

    const basename = path.basename(relativePath);
    const source = findFileByBasename(buildBase, basename);
    if (!source) {
      continue;
    }

    ensureDir(path.dirname(expectedPath));
    fs.copyFileSync(source, expectedPath);
  }
}

function mergeBuildArtifacts() {
  if (!exists(buildBase)) {
    return;
  }

  const entries = fs.readdirSync(buildBase, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "index.html") {
      continue;
    }

    const from = path.join(buildBase, entry.name);
    const to = path.join(deployOut, entry.name);

    if (entry.isDirectory()) {
      fs.cpSync(from, to, { recursive: true, force: true });
      continue;
    }

    fs.copyFileSync(from, to);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function rewriteBaseHref(indexPath, href) {
  if (!exists(indexPath)) {
    return;
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const next = html.replace(/<base\s+href="[^"]*"\s*>/i, `<base href="${href}">`);
  fs.writeFileSync(indexPath, next, "utf8");
}

function createEnglishMirror() {
  const enDir = path.join(deployOut, "en");
  fs.rmSync(enDir, { recursive: true, force: true });
  ensureDir(enDir);

  const entries = fs.readdirSync(deployOut, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "en") {
      continue;
    }

    const from = path.join(deployOut, entry.name);
    const to = path.join(enDir, entry.name);

    if (entry.isDirectory()) {
      fs.cpSync(from, to, { recursive: true, force: true });
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function main() {
  const englishRoot = findEnglishRoot();
  if (!englishRoot) {
    throw new Error(`Could not find index.html under ${buildBase}`);
  }

  fs.rmSync(deployOut, { recursive: true, force: true });
  ensureDir(path.dirname(deployOut));
  copyDir(englishRoot, deployOut);
  mergeBuildArtifacts();
  ensureReferencedAssetsPresent();

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

  // Keep canonical paths stable per locale.
  rewriteBaseHref(path.join(deployOut, "index.html"), "/");
  rewriteBaseHref(path.join(deployOut, "ka", "index.html"), "/ka/");

  createEnglishMirror();
  rewriteBaseHref(path.join(deployOut, "en", "index.html"), "/en/");

  console.log(`Prepared Vercel output at: ${deployOut}`);
}

main();
