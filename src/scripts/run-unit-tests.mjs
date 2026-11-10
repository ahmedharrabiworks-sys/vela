// Compiles the pure rule libraries and their tests, then runs them with
// node's own test runner. Usage: npm run test:unit
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const OUT = path.resolve(".unit-build");
const LIBS = ["opening-hours", "time-off", "ai-resolution", "weekly-hours-edit", "knowledge-base"];
const TESTS = fs.readdirSync("src/lib/__tests__").filter((f) => f.endsWith(".test.ts"));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "__tests__"), { recursive: true });
fs.writeFileSync(path.join(OUT, "package.json"), '{"type":"commonjs"}');

const compile = (from, to) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(from, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  fs.writeFileSync(to, outputText);
};
for (const lib of LIBS) compile(`src/lib/${lib}.ts`, path.join(OUT, `${lib}.js`));
for (const t of TESTS) compile(`src/lib/__tests__/${t}`, path.join(OUT, "__tests__", t.replace(/\.ts$/, ".js")));

const run = spawnSync(process.execPath, ["--test", ...TESTS.map((t) => path.join(OUT, "__tests__", t.replace(/\.ts$/, ".js")))], { stdio: "inherit", env: { ...process.env, TZ: "UTC" } });
fs.rmSync(OUT, { recursive: true, force: true });
process.exit(run.status ?? 1);
