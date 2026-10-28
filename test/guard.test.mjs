import assert from "node:assert/strict";
import test from "node:test";
import { decide, MARKER } from "../plugins/agy-review/antigravity-plugin/readonly-review/guard.mjs";

const run = (c) => decide({ lastUserInput: MARKER, toolCall: { name: "run_command", args: { CommandLine: c } } }).decision;
const tool = (name, args = {}) => decide({ lastUserInput: MARKER, toolCall: { name, args } }).decision;

test("allows read-only commands", () => {
  for (const c of ["git status --short", "git diff --stat HEAD~1", "git -C D:/x log -5 --oneline", "git diff main...HEAD -- src/a.kt",
    'rg -n "a -> b" src', "rg foo | head -20", "Get-ChildItem -Recurse -Name", "cd /p && git log -3", "git branch -a", "git stash list", "git config --get user.name", "rtk git diff"]) {
    assert.equal(run(c), "allow", c);
  }
});

test("denies writes, execution, network and obfuscation", () => {
  for (const c of ["git commit -m x", "git push", "git checkout main", "git branch -D x", "git reset --hard", "git stash", "git config user.name x", "git diff --output=out.txt",
    "echo hi > f.txt", "cat a; rm -rf x", "cat a | python -c 'x'", "Remove-Item x", "curl http://x", "find . -delete", "sort -o a b", "echo $(rm x)", "echo `rm x`",
    "Get-ChildItem | ForEach-Object { Remove-Item $_ }", "rg --pre ./evil foo", "npm install", "node a.js", "Invoke-WebRequest http://x"]) {
    assert.equal(run(c), "deny", c);
  }
});

test("quoted operators are not treated as redirection", () => {
  assert.equal(run('rg "x > y" src'), "allow");
  assert.equal(run('echo "$(rm x)"'), "deny");
});

test("reads are allowed, writes and unknown tools are denied", () => {
  for (const t of ["view_file", "grep_search", "list_dir", "find_by_name"]) assert.equal(tool(t, { AbsolutePath: "C:/code/a.kt" }), "allow", t);
  for (const t of ["write_to_file", "replace_file_content", "multi_replace_file_content", "sed_file", "notebook_edit", "read_url_content", "call_mcp_tool", "browser_subagent", "run_workflow", "unknown_tool"]) assert.equal(tool(t), "deny", t);
});

test("credential stores are not readable", () => {
  assert.equal(tool("view_file", { AbsolutePath: "C:/Users/me/.ssh/id_rsa" }), "deny");
  assert.equal(tool("view_file", { AbsolutePath: "/home/me/.aws/credentials" }), "deny");
});

test("is inert without the marker", () => {
  assert.equal(decide({ lastUserInput: "hello", toolCall: { name: "write_to_file", args: {} } }).decision, "ask");
});
