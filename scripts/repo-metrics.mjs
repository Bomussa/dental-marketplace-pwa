import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import ts from "typescript";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean);
const byExt = new Map();
for (const file of tracked) {
  const ext = extname(file).toLowerCase() || "[no extension]";
  byExt.set(ext, (byExt.get(ext) || 0) + 1);
}
const sourceExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
let sourceFiles = 0;
let linesInSources = 0;
const counts = { functionDeclarations: 0, arrowFunctions: 0, functionExpressions: 0, methodDeclarations: 0, getters: 0, setters: 0, constructors: 0 };
let sqlFunctions = 0;
let sqlProcedures = 0;
const parseErrors = [];
for (const file of tracked) {
  const ext = extname(file).toLowerCase();
  if (sourceExts.has(ext)) {
    sourceFiles += 1;
    const text = readFileSync(file, "utf8");
    linesInSources += text.split(/\r?\n/).length;
    let kind = ts.ScriptKind.JS;
    if (ext === ".ts" || ext === ".mjs" || ext === ".cjs") kind = ts.ScriptKind.TS;
    if (ext === ".tsx") kind = ts.ScriptKind.TSX;
    if (ext === ".jsx") kind = ts.ScriptKind.JSX;
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    if (sourceFile.parseDiagnostics.length) parseErrors.push({ file, count: sourceFile.parseDiagnostics.length });
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node)) counts.functionDeclarations += 1;
      else if (ts.isArrowFunction(node)) counts.arrowFunctions += 1;
      else if (ts.isFunctionExpression(node)) counts.functionExpressions += 1;
      else if (ts.isMethodDeclaration(node)) counts.methodDeclarations += 1;
      else if (ts.isGetAccessorDeclaration(node)) counts.getters += 1;
      else if (ts.isSetAccessorDeclaration(node)) counts.setters += 1;
      else if (ts.isConstructorDeclaration(node)) counts.constructors += 1;
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  } else if (ext === ".sql") {
    const text = readFileSync(file, "utf8");
    sqlFunctions += (text.match(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/gi) || []).length;
    sqlProcedures += (text.match(/\bCREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\b/gi) || []).length;
  }
}
const javascriptTypescriptCallableImplementations = Object.values(counts).reduce((sum, value) => sum + value, 0);
const executableRoutineImplementationsIncludingSql = javascriptTypescriptCallableImplementations + sqlFunctions + sqlProcedures;
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), trackedFiles: tracked.length, sourceFiles, linesInJsTsSources: linesInSources, javascriptTypescriptCallableImplementations, javascriptTypescriptBreakdown: counts, sqlFunctions, sqlProcedures, executableRoutineImplementationsIncludingSql, parseErrors, filesByExtension: Object.fromEntries([...byExt.entries()].sort((a, b) => a[0].localeCompare(b[0]))) }, null, 2));
