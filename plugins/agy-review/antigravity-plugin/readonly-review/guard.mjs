// agy PreToolUse guard: read-only mode for headless code review.
// Inert unless the user prompt contains MARKER, so normal agy use is unchanged.
// Allows every read; hard-denies anything that could write, execute code or reach the network.
// Not an OS sandbox: a deny-by-default filter on tool name + command text.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const MARKER = "AGY_READONLY_REVIEW";
const READ_TOOLS = new Set(["view_file", "list_dir", "grep_search", "find_by_name", "command_status", "wait", "wait_5_seconds", "finish", "list_permissions", "list_resources", "read_resource", "send_message"]);
const SECRET_PATH = /(?:^|[\\/\s"'=~])(?:\.ssh|\.gnupg|\.aws)(?![\w.-])|id_(rsa|ed25519|ecdsa)|\.git-credentials|[\\/]\.gemini[\\/]antigravity-cli[\\/](settings|installation)/i;

const GIT_OK = new Set(["diff", "log", "show", "status", "ls-files", "grep", "blame", "rev-parse", "merge-base", "diff-tree", "diff-index", "diff-files", "cat-file", "ls-tree", "show-ref", "describe", "shortlog", "rev-list", "name-rev", "for-each-ref", "check-ignore", "count-objects", "reflog", "whatchanged", "branch", "remote", "tag", "stash", "config"]);
const GIT_BAD_FLAG = /^(--output|-O$|--open-files-in-pager|--exec|--ext-diff|-d$|-D$|-m$|-M$|-c$|-C$|-f$|--delete|--move|--copy|--set-upstream|--edit|--add|--unset|--replace|--remove|--global|--system|--file)/;
const CMDS = new Set(["rg", "grep", "egrep", "fgrep", "ls", "dir", "cat", "head", "tail", "wc", "sort", "uniq", "diff", "file", "stat", "tree", "pwd", "echo", "type", "findstr", "where", "which", "cut", "tr", "nl", "basename", "dirname", "realpath", "jq", "cd", "find",
  "get-content", "get-childitem", "select-string", "get-item", "get-location", "resolve-path", "test-path", "measure-object", "select-object", "sort-object", "write-output", "write-host", "set-location", "get-filehash"]);

// Quoted text is inert, except double quotes that can still run $(...) or backticks.
function stripQuoted(s) {
  return s.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, (m) => (/\$\(|`/.test(m) ? m : '""'));
}

function checkSegment(seg) {
  const t = seg.trim().split(/\s+/).filter(Boolean);
  while (t[0]?.toLowerCase() === "rtk") t.shift();
  if (!t.length) return null;
  const bin = t[0].toLowerCase().replace(/\.exe$/, "");
  if (bin === "git") {
    let i = 1;
    while (i < t.length && t[i].startsWith("-")) {
      if (t[i] === "-C") i += 2; else if (t[i] === "--no-pager") i += 1; else return `git option ${t[i]} not allowed`;
    }
    const sub = t[i];
    if (!GIT_OK.has(sub)) return `git ${sub ?? ""} is not a read-only subcommand`;
    const rest = t.slice(i + 1);
    if (rest.some((a) => GIT_BAD_FLAG.test(a))) return `git ${sub}: write/exec flag not allowed`;
    if (sub === "config" && !rest.some((a) => ["--get", "--list", "-l", "--get-all"].includes(a))) return "git config: only --get/--list";
    if (sub === "stash" && rest[0] !== "list" && rest[0] !== "show") return "git stash: only list/show";
    if (sub === "remote" && rest.length && !["-v", "get-url"].includes(rest[0])) return "git remote: only the offline forms -v and get-url"; // `show` contacts the remote
    if ((sub === "tag" || sub === "branch") && rest.some((a) => !a.startsWith("-"))) return `git ${sub}: no creating refs`;
    return null;
  }
  if (!CMDS.has(bin)) return `command '${t[0]}' is not on the read-only list`;
  if (bin === "sort" && t.some((a) => /^(-o|--output)/.test(a))) return "sort -o writes";
  if (bin === "find" && t.some((a) => /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/.test(a))) return "find action not allowed";
  if (bin === "rg" && t.some((a) => /^--pre/.test(a))) return "rg --pre runs commands";
  return null;
}

export function decide(input) {
  if (!String(input.lastUserInput ?? "").includes(MARKER)) return { decision: "ask" };
  const name = input.toolCall?.name ?? "";
  const args = input.toolCall?.args ?? {};
  const deny = (why) => ({ decision: "deny", reason: `Read-only review mode: ${why}. Use only read commands (git diff/log/show, rg, cat, ls) and file-viewing tools.` });
  if (name === "run_command") {
    const full = String(args.CommandLine ?? "");
    // Credential stores are off limits for shell commands too, not only for the file tools. Checked on the raw text, quotes included.
    if (SECRET_PATH.test(full)) return deny("path looks like a credential store");
    const bare = stripQuoted(full);
    if (/[<>]|\$\(|`|[{}]|\$env:|\bInvoke-|\biex\b/i.test(bare)) return deny("redirection, subshell or script block not allowed");
    for (const seg of bare.split(/&&|\|\||[;|&\n]/)) {
      const why = checkSegment(seg);
      if (why) return deny(why);
    }
    return { decision: "allow" };
  }
  if (READ_TOOLS.has(name)) {
    return SECRET_PATH.test(JSON.stringify(args)) ? deny("path looks like a credential store") : { decision: "allow" };
  }
  return deny(`tool '${name}' is not allowed`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let out;
  try {
    out = decide(JSON.parse(fs.readFileSync(0, "utf8")));
  } catch (e) {
    // Fail closed: an unreadable payload must not become an allow.
    out = { decision: "deny", reason: `guard error: ${e.message}` };
  }
  process.stdout.write(JSON.stringify(out));
}
