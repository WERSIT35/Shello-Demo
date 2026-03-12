import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const app = express();
const port = Number(process.env.PORT) || 4200;
const locale = process.env.LOCALE || "ka";

const candidates = [
  path.join(process.cwd(), "dist", locale, "browser", locale),
  path.join(process.cwd(), "dist", locale, "browser"),
  path.join(process.cwd(), "dist", locale),
  path.join(process.cwd(), "dist", "browser", locale),
  path.join(process.cwd(), "dist", "browser"),
  path.join(process.cwd(), "dist")
];

let root = candidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html"))
);

if (!root) {
  const output = execSync("find /app/dist -name index.html 2>/dev/null || true")
    .toString()
    .trim();
  const matches = output ? output.split("\n").filter(Boolean) : [];
  const preferred = matches.find((item) => item.includes(`/${locale}/`)) || matches[0];
  if (preferred) {
    root = path.dirname(preferred);
  }
}

if (!root) {
  console.error("No index.html found in expected dist paths.");
  console.error(candidates.join("\n"));
  process.exit(1);
}

const indexFile = path.join(root, "index.html");

// Strip locale prefix when requests are routed via /ka/ or /en/
app.use((req, _res, next) => {
  const prefix = `/${locale}`;
  if (req.url === prefix || req.url.startsWith(`${prefix}/`)) {
    req.url = req.url.slice(prefix.length) || "/";
  }
  next();
});
app.use(express.static(root, { maxAge: "1y" }));
app.get("*", (_req, res) => {
  res.sendFile(indexFile);
});

app.listen(port, () => {
  console.log(`Static frontend listening on http://localhost:${port} (${locale})`);
});
