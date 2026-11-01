import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const moduleId = "runyth-tables-of-sustenance";
const version = JSON.parse(readFileSync(join(root, "module.json"), "utf8")).version;
const dist = join(root, "dist");
const staging = join(dist, "staging");
const moduleBuild = join(dist, "module", moduleId);

execFileSync(process.execPath, [join(root, "scripts-dev/build.mjs")], { stdio: "inherit" });
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

const installStage = join(staging, "installable", moduleId);
cpSync(moduleBuild, installStage, { recursive: true });
zipDirectory(join(staging, "installable"), join(dist, `${moduleId}-v${version}-installable.zip`));

const sourceStage = join(staging, "source", moduleId);
mkdirSync(sourceStage, { recursive: true });
for (const entry of readdirSync(root)) {
  if (["dist", ".git", "node_modules"].includes(entry)) continue;
  cpSync(join(root, entry), join(sourceStage, entry), { recursive: true });
}
zipDirectory(join(staging, "source"), join(dist, `${moduleId}-v${version}-source.zip`));

const docsName = `${moduleId}-v${version}-documentation-audit`;
const docsStage = join(staging, "documentation", docsName);
mkdirSync(docsStage, { recursive: true });
cpSync(join(root, "docs"), join(docsStage, "docs"), { recursive: true });
for (const entry of ["README.md", "module.json", "LICENSE"]) cpSync(join(root, entry), join(docsStage, entry), { recursive: true });
cpSync(join(root, "data", "content-index.json"), join(docsStage, "content-index.json"));
zipDirectory(join(staging, "documentation"), join(dist, `${docsName}.zip`));

console.log("Created release archives:");
for (const file of readdirSync(dist).filter(name => name.endsWith(".zip")).sort()) console.log(`- ${file}`);

function zipDirectory(cwd, destination) {
  rmSync(destination, { force: true });
  execFileSync("python3", [join(root, "scripts-dev/deterministic-zip.py"), cwd, destination], { stdio: "inherit" });
}
