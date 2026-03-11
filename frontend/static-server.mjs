import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const port = Number(process.env.PORT) || 4200;
const locale = process.env.LOCALE || "ka";

const candidates = [
  path.join(process.cwd(), "dist", locale, "browser", locale),
  path.join(process.cwd(), "dist", locale, "browser"),
  path.join(process.cwd(), "dist", "browser", locale),
  path.join(process.cwd(), "dist", "browser")
];

const root = candidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html"))
);

if (!root) {
  console.error("No index.html found in expected dist paths.");
  console.error(candidates.join("\n"));
  process.exit(1);
}

const indexFile = path.join(root, "index.html");

app.use(express.static(root, { maxAge: "1y" }));
app.get("*", (_req, res) => {
  res.sendFile(indexFile);
});

app.listen(port, () => {
  console.log(`Static frontend listening on http://localhost:${port} (${locale})`);
});
