#!/usr/bin/env node
/**
 * Fails if any exported server action is missing an authorization check.
 *
 * Server actions are dispatched by action ID rather than by URL, so the route
 * matrix in src/proxy.ts never sees them — an action is reachable by posting a
 * Next-Action header to any page in the app, including public ones. Each one is
 * therefore its own public endpoint and has to authorize for itself.
 *
 * Run via `npm run check:guards`. Add an action, and this tells you before a
 * reviewer has to.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");

const EXPORT_PREFIXES = [
  "export async function ",
  "export function ",
  "export const ",
];

const GUARD_PATTERN =
  /getServerSession|requireSession|requireRole|requireAdmin|requireStaff|requireSuperAdmin|requireFeeAccess|requireFeeEditAccess|requireRecordStudentsAccess|requireStudentAccess|requireSelfOrAdmin|requirePlatformAdmin|userHasFeePermission|userHasFeeEditPermission/;

/** Actions that are deliberately callable by anyone, with the reason. */
const ALLOWLIST = new Set([
  // (none today — add as "relative/path.ts::actionName" with a comment)
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function exportedNameOn(line) {
  for (const prefix of EXPORT_PREFIXES) {
    if (line.startsWith(prefix)) {
      const match = line.slice(prefix.length).match(/^[A-Za-z0-9_$]+/);
      return match ? match[0] : null;
    }
  }
  return null;
}

const failures = [];

for (const file of walk(ROOT)) {
  const source = fs.readFileSync(file, "utf8");

  // Only whole-file server modules; an inline "use server" inside a component
  // is scoped to that function and is checked by its own caller.
  const firstCode = source.split("\n").find((l) => l.trim().length > 0) || "";
  if (!/^["']use server["'];?$/.test(firstCode.trim())) {
    continue;
  }

  const lines = source.split("\n");
  const marks = [];

  lines.forEach((line, index) => {
    const name = exportedNameOn(line);
    if (name) {
      marks.push({ name, index });
    }
  });

  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : lines.length;
    const body = lines.slice(mark.index, end).join("\n");
    const relative = path.relative(path.join(__dirname, ".."), file).replace(/\\/g, "/");

    if (ALLOWLIST.has(`${relative}::${mark.name}`)) {
      return;
    }

    // A type-only export carries no logic to guard.
    if (/^export (type|interface) /.test(lines[mark.index])) {
      return;
    }

    if (!GUARD_PATTERN.test(body)) {
      failures.push(`${relative}:${mark.index + 1}  ${mark.name}`);
    }
  });
}

if (failures.length > 0) {
  console.error(
    `\nUnguarded server actions (${failures.length}). Each is reachable ` +
      `without going through the route matrix:\n`
  );
  for (const failure of failures) {
    console.error("  " + failure);
  }
  console.error(
    "\nAdd a guard from src/lib/security/guard.ts as the first statement, or " +
      "add the action to ALLOWLIST in this script with a reason.\n"
  );
  process.exit(1);
}

console.log("All exported server actions carry an authorization check.");
