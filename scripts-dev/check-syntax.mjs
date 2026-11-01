// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = walk(join(root, "scripts")).filter(file => file.endsWith(".mjs"));
for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
console.log(`Syntax checked ${files.length} module files.`);

function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
