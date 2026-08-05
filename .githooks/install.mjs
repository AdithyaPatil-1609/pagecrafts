import { execFileSync } from "node:child_process";
import { copyFileSync, chmodSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

let gitDir;
try {
  gitDir = resolve(git(["rev-parse", "--absolute-git-dir"]));
} catch {
  process.exit(0);
}

const source = join(here, "pre-commit");
if (!existsSync(source)) {
  process.exit(0);
}

const hooksDir = join(gitDir, "hooks");
const target = join(hooksDir, "pre-commit");

try {
  mkdirSync(hooksDir, { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, 0o755);
  try {
    git(["config", "--unset-all", "core.hooksPath"]);
  } catch {}
  console.log("Branch guard installed: commits on main and master will be refused.");
} catch (error) {
  console.warn(`Could not install the branch guard: ${error.message}`);
}
