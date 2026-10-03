// Pre-launch content check (AGENTS.md §13, task 8.4b): lists every placeholder still in the
// code and content — `TODO(owner)`, `TODO(owner-fr)` and the dummy `cadstudio.example`
// domain. Run `pnpm prelaunch`; exits with code 1 while anything is left.
//
// Sample clients/reviews live in the database (isSample = true) and are hidden when
// SHOW_SAMPLE_CONTENT=false; text set in admin (settings, prices) isn't checked here.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "content", "messages", "prisma"];
const SKIP = new Set(["node_modules", "generated", "migrations"]);
const PATTERNS = [
  { label: "TODO(owner)", regex: /TODO\(owner\)/ },
  { label: "TODO(owner-fr)", regex: /TODO\(owner-fr\)/ },
  { label: "dummy domain", regex: /cadstudio\.example/ },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(tsx?|mjs|json|md)$/.test(name)) yield path;
  }
}

const print = (line) => process.stdout.write(`${line}\n`);
let total = 0;
for (const { label, regex } of PATTERNS) {
  const hits = [];
  for (const root of ROOTS) {
    for (const file of files(root)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (regex.test(line))
            hits.push(`  ${relative(".", file)}:${index + 1}  ${line.trim().slice(0, 110)}`);
        });
    }
  }
  total += hits.length;
  print(`${label}: ${hits.length}`);
  for (const hit of hits) print(hit);
  print("");
}
print(total ? `${total} placeholder(s) left — see docs/PRE_LAUNCH.md.` : "No placeholders left.");
process.exitCode = total ? 1 : 0;
