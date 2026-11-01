import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const sourceRoot = resolve(import.meta.dirname, "..");
const targetRoot = process.argv[2] ? resolve(process.argv[2]) : sourceRoot;
const manifestPath = join(targetRoot, "module.json");
if (!existsSync(manifestPath)) throw new Error(`Missing module manifest: ${manifestPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const missing = [];
const checked = new Set();

for (const path of [
  ...(manifest.esmodules ?? []),
  ...(manifest.scripts ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map(language => language.path)
]) checkRelative(path, "manifest");

const moduleFiles = walk(join(targetRoot, "scripts")).filter(path => path.endsWith(".mjs"));
for (const file of moduleFiles) {
  const source = readFileSync(file, "utf8");
  for (const specifier of staticImports(source)) {
    if (!specifier.startsWith(".")) continue;
    const resolved = resolve(dirname(file), specifier);
    checkAbsolute(resolved, `${relative(targetRoot, file)} import ${specifier}`);
  }
  for (const modulePath of moduleLocalPaths(source, manifest.id)) {
    checkRelative(modulePath, `${relative(targetRoot, file)} module path`);
  }
}

for (const template of walk(join(targetRoot, "templates")).filter(path => path.endsWith(".hbs"))) {
  const source = readFileSync(template, "utf8");
  for (const literalPath of localTemplatePaths(source)) checkRelative(literalPath, `${relative(targetRoot, template)} template path`);
}

if (missing.length) {
  throw new Error(`Runtime asset graph is incomplete:\n${missing.map(entry => `- ${entry}`).join("\n")}`);
}

console.log(`Validated runtime graph for ${manifest.id} ${manifest.version}: ${moduleFiles.length} ES modules, ${checked.size} referenced runtime paths.`);

function checkRelative(path, reason) {
  if (!path || /^(?:https?:|data:|#)/u.test(path)) return;
  checkAbsolute(resolve(targetRoot, path), `${reason}: ${path}`);
}

function checkAbsolute(path, reason) {
  checked.add(path);
  if (!existsSync(path)) missing.push(reason);
}

function staticImports(source) {
  const values = [];
  const patterns = [
    /(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gu,
    /import\(\s*["']([^"']+)["']\s*\)/gu
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return values;
}

function moduleLocalPaths(source, moduleId) {
  const values = [];
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const direct = new RegExp("modules/" + escaped + "/([^\\s\"'`<>]+)", "gu");
  for (const match of source.matchAll(direct)) values.push(match[1]);
  const interpolated = /modules\/\$\{MODULE_ID\}\/([^\s"'`<>${}]+?)(?=["'`])/gu;
  for (const match of source.matchAll(interpolated)) values.push(match[1]);
  return values;
}

function localTemplatePaths(source) {
  const values = [];
  for (const match of source.matchAll(/(?:src|href)=["'](?:modules\/[^/]+\/)?([^"']+)["']/gu)) {
    const value = match[1];
    if (/^(?:https?:|data:|#)/u.test(value)) continue;
    if (/^(?:assets|styles|scripts|lang|data|templates)\//u.test(value)) values.push(value);
  }
  return values;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
