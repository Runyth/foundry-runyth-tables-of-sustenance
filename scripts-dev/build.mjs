import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const moduleId = "runyth-tables-of-sustenance";
const output = join(root, "dist", "module", moduleId);
rmSync(join(root, "dist", "module"), { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const entry of ["module.json", "LICENSE", "README.md", "scripts", "styles", "templates", "lang", "data", "assets"]) {
  const source = join(root, entry);
  if (!existsSync(source)) throw new Error(`Missing runtime entry: ${entry}`);
  cpSync(source, join(output, entry), { recursive: true });
}
const manifest = JSON.parse(readFileSync(join(root, "module.json"), "utf8"));
writeFileSync(join(output, "BUILD_INFO.json"), `${JSON.stringify({
  moduleId,
  version: manifest.version,
  builtAt: null,
  reproducibleBuild: true,
  foundryCompatibility: manifest.compatibility,
  systemNeutral: true,
  coreApi: "1.2.0",
  systemAdapterContract: "1.0.0",
  canonicalContent: { foods: 335, recipes: 190, tables: 12, fallbackIllustrations: 100 }
}, null, 2)}\n`);
execFileSync(process.execPath, [join(root, "scripts-dev/validate-runtime-assets.mjs"), output], { stdio: "inherit" });
console.log(`Built installable system-neutral module at ${output}`);
