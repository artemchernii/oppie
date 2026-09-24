// Validates commit messages against Conventional Commits.
//
// Shared by two callers so there is exactly one definition of "valid message":
//   .githooks/commit-msg              → node scripts/check-commits.js --file "$1"
//   .github/workflows/ci.yml          → node scripts/check-commits.js --range origin/master..HEAD --title "$PR_TITLE"
//
// Dependency-free on purpose: the repo has no tooling dependencies, and commitlint
// would pull in a config chain for what is one regex.

const { execFileSync } = require("child_process");

const TYPES = ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"];

// <type>[(scope)][!]: <description>
const HEADER = /^([a-z]+)(?:\(([^()]+)\))?(!)?: (.+)$/;
const HEADER_MAX = 100;

// Messages git generates itself. Blocking these would break routine merges and reverts.
const GENERATED = [/^Merge /, /^Revert "/, /^fixup! /, /^squash! /, /^amend! /];

const strip = (message) =>
  message
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .split("\n# ------------------------ >8 ------------------------")[0]
    .trim();

function check(header) {
  const errors = [];
  const warnings = [];

  if (!header) {
    errors.push("message is empty");
    return { errors, warnings };
  }
  if (GENERATED.some((pattern) => pattern.test(header))) {
    warnings.push("generated message, not validated: " + header.slice(0, 40));
    return { errors, warnings };
  }

  const match = header.match(HEADER);
  if (!match) {
    errors.push('expected "<type>(<scope>): <description>", got "' + header + '"');
    if (/^[A-Z]/.test(header)) errors.push("type must be one of: " + TYPES.join(", "));
    return { errors, warnings };
  }

  const [, type, scope, breaking, description] = match;

  if (!TYPES.includes(type)) errors.push('unknown type "' + type + '" — allowed: ' + TYPES.join(", "));
  if (scope && scope.trim() !== scope) errors.push('scope "' + scope + '" has surrounding whitespace');
  if (header.length > HEADER_MAX) errors.push("header is " + header.length + " chars, limit is " + HEADER_MAX);
  if (!description.trim()) errors.push("description is empty");
  if (description.endsWith(".")) errors.push('description ends with a full stop');
  if (/^[A-Z]/.test(description) && !/^[A-Z0-9]{2,}/.test(description)) warnings.push("description starts with a capital letter");
  if (breaking) warnings.push("marked as a breaking change — say why in a BREAKING CHANGE: footer");

  return { errors, warnings };
}

function report(label, message) {
  const header = strip(message).split("\n")[0] ?? "";
  const { errors, warnings } = check(header);
  const body = strip(message).split("\n").slice(1).join("\n").trim();

  warnings.forEach((warning) => console.log("  warn   " + label + ": " + warning));
  errors.forEach((error) => console.log("  error  " + label + ": " + error));
  if (!errors.length && !warnings.length) console.log("  ok     " + label + ": " + header);
  if (!errors.length && body.length > 0 && header.length + body.length > 0) {
    // Body is not validated, but a blank line between header and body is conventional.
    const secondLine = strip(message).split("\n")[1];
    if (secondLine && secondLine.trim() !== "") console.log("  warn   " + label + ": leave a blank line between header and body");
  }
  return errors.length > 0;
}

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};

const messages = [];
const title = flag("--title");
if (title) messages.push({ label: "PR title", message: title });

const file = flag("--file");
if (file) messages.push({ label: "commit-msg", message: require("fs").readFileSync(file, "utf8") });

const range = flag("--range");
if (range) {
  const hashes = execFileSync("git", ["rev-list", "--no-merges", range], { encoding: "utf8" }).split("\n").filter(Boolean);
  if (hashes.length === 0) console.log("  ok     range " + range + ": no non-merge commits to check");
  hashes.forEach((hash) => {
    const message = execFileSync("git", ["log", "-1", "--format=%B", hash], { encoding: "utf8" });
    messages.push({ label: hash.slice(0, 7), message });
  });
}

if (messages.length === 0) {
  console.log("usage: check-commits.js [--file <path>] [--range <revspec>] [--title <pr title>]");
  process.exit(2);
}

let failed = 0;
messages.forEach(({ label, message }) => {
  if (report(label, message)) failed += 1;
});

console.log("");
if (failed > 0) {
  console.log(failed + " of " + messages.length + " message(s) do not follow Conventional Commits.");
  console.log('Format: <type>(<scope>): <description> — e.g. "fix: keep empty unknowns visible"');
  process.exit(1);
}
console.log("Conventional Commits: " + messages.length + " message(s) checked.");
