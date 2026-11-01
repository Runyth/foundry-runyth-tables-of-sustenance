// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
// Dependency-free validation for Runyth Tables of Sustenance.
import { accessSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(path.join(root, "module.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));

function assert(condition, message) {
  if (!condition) {
    process.stderr.write(`Check failed: ${message}\n`);
    process.exit(1);
  }
}

const version = manifest.version;
assert(manifest.id === "runyth-tables-of-sustenance", "manifest id");
assert(manifest.title === "Runyth Tables of Sustenance", "manifest title");
assert(manifest.license === "LICENSE", "manifest licence field");
assert(manifest.socket === true, "socket surface declared");
assert(manifest.url === "https://github.com/Runyth/foundry-runyth-tables-of-sustenance", "manifest url");
assert(manifest.manifest === "https://github.com/Runyth/foundry-runyth-tables-of-sustenance/releases/latest/download/module.json", "manifest URL");
assert(
  manifest.download === `https://github.com/Runyth/foundry-runyth-tables-of-sustenance/releases/download/v${version}/runyth-tables-of-sustenance-v${version}-mod.zip`,
  "manifest download URL"
);
assert(manifest.authors.length === 1, "manifest must carry exactly one author");
assert(manifest.authors[0].name === "Runyth", "manifest author organisation");
assert(manifest.compatibility.minimum === "13.347", "Foundry minimum pin");
assert(manifest.compatibility.verified === "13.351", "Foundry verified pin");
assert(manifest.compatibility.maximum === "13", "Foundry maximum pin");
assert(!(manifest.relationships?.requires?.length), "the system-neutral core declares no required modules");
assert(!(manifest.relationships?.systems), "the core binds no game system");

assert(packageJson.name === manifest.id, "package name");
assert(packageJson.version === version, "package version");
assert(packageJson.license === "AGPL-3.0-or-later", "package licence");
assert(packageLock.packages?.[""]?.version === version, "package-lock root version");
assert(packageLock.packages?.[""]?.license === "AGPL-3.0-or-later", "package-lock root licence");

const requiredFiles = [
  "module.json",
  "package.json",
  "package-lock.json",
  "LICENSE",
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "data/foods.json",
  "data/recipes.json",
  "data/tables.json",
  "data/content-index.json",
  ...manifest.esmodules,
  ...(manifest.styles ?? []),
  ...((manifest.languages ?? []).map((entry) => entry.path))
];
for (const relativePath of requiredFiles) {
  accessSync(path.join(root, relativePath));
}

for (const script of readdirSync(path.join(root, "scripts")).filter((name) => name.endsWith(".mjs"))) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, "scripts", script)], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

const data = JSON.parse(readFileSync(path.join(root, "data/content-index.json"), "utf8"));
assert(data.moduleId === manifest.id && data.version === version, "content index identity drift");
assert(data.totalFoods === 335 && data.totalRecipes === 190 && data.totalTables === 12, "content index catalogue drift");
assert(
  readdirSync(path.join(root, "assets/food")).some((name) => name.endsWith(".svg")),
  "food artwork assets present"
);

console.log(`Validated ${requiredFiles.length} required files and ${readdirSync(path.join(root, "scripts")).length} module sources.`);
