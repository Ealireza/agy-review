# agy-review

**一个必须拿出证据的独立审查工具。** 通过 Google Antigravity（`agy`）执行代码审查、安全审查、任务委派和翻译，可从 Claude Code、Codex 或任意终端使用。只读、不会弹出 permission prompt，而且每条发现都会先对照真实代码核验，再呈现给你。

> ## 新功能：别再花 Claude 和 Codex 的 token 刷新 graphify 图谱
>
> **现在，每次 commit、merge、checkout 和 rebase 时，graphify 都会在后台通过 Antigravity 更新。你的 Agent 消耗 0 个 token，也不需要 API key。**
>
> 只需运行一条命令 `agy-review --graphify setup`，就能重新注册 graphify 的 git hook，让**每次图谱更新中最昂贵的部分（读取文档并用语言 model 为社区命名）交给便宜的 Antigravity model，而不是你的 Opus 或 Fable 会话。** `git commit` 不到一秒就会返回，图谱随后自行完成更新。
>
> 在一次真实的 Windows 运行中，某个 commit 同时修改了代码和文档，图谱更新只用了**一次 Antigravity 调用、22 秒，以及 0 个 Claude 或 Codex token。** 背后的 model 只能读取文本并返回文本：没有工具，也没有写入或执行权限。详情和设置方法见 7g 节。

[English](../README.md) · [فارسی](README.fa.md) · **简体中文** · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

网站：https://ealireza.github.io/agy-review/ · 深入了解（英文）：面向 Agent 和循环的 [docs/AGENTS.md](AGENTS.md)，以及介绍安全审查方法的 [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md)。

---

## 目录

1. 你能得到什么
2. 为什么这份报告值得信任
3. 当前状态：哪些已经验证，哪些还没有
4. 要求
5. 安装
6. 首次运行：在你的机器上验证
7. 用法：审查、安全、任务、翻译、model、graphify
8. 在 Agent、sub-agent 和循环中使用
9. 安全 model
10. 故障排查
11. 常见问题
12. 更新（如何获取新版本）、卸载、开发

---

## 1. 你能得到什么

| Skill（Claude Code / Codex） | 命令（Claude Code） | 功能 |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | 对 git 变更、branch、文件、行范围、单个函数或代码片段进行分级审查 |
| `agy-security` / `security` | `/agy-review:security` | 安全审查：OWASP/CWE、可利用性、攻击场景、密钥和不良模式扫描，并将调用方和被调用方作为上下文 |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | 把任意独立任务（改写、总结、起草、提取）交给 Antigravity，并取回结果 |
| `agy-translate` / `translate` | `/agy-review:translate` | 按指定语气、受众和术语表翻译；验证代码、URL、占位符和结构是否完整保留 |
| `agy-models` / `models` | `/agy-review:models` | 列出 agy 中的 model 及各自支持的 `--effort`，选择一个，并保存到项目或全局配置 |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **通过 git hook 在 Antigravity 上持续更新 graphify 图谱：0 个 Claude 或 Codex token，无需 API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | 检查前置条件、安装只读 guard，并在你的机器上证明写入已被阻止 |

Claude Code 提供这些 sub-agent：`agy-reviewer`、`agy-security`、`agy-worker`。所有内容都在同一个 repository 和同一个脚本（`plugins/agy-review/scripts/agy-review.mjs`）中。没有服务器，除了你自己的 Antigravity 登录外也不需要其他账号。

## 2. 为什么这份报告值得信任

语言 model 审查代码时，偶尔会凭空捏造问题。这个工具不会无条件相信它。

1. 审查者必须返回严格的 JSON 报告（由 `--json-schema` 强制执行）。每条发现都必须附带所针对的**确切代码**。
2. 脚本会在真实文件中查找这段引用。**找不到：拒绝该发现**，并单独列出。**在其他行找到：修正行号。** 太短或太宽泛、无法证明问题的引用（`return null;`、`}`）会被拒绝。如果同一引用在距离所报行很远的多个位置出现，也会因含义不明确而被拒绝。
3. 结论、数量和 CI gate **仅由脚本根据已验证的发现计算**，绝不会从 model 的输出中照抄。
4. 没有验证出问题**不代表**通过：如果有发现被拒绝、model 之间意见不一、代码覆盖不完整，或者多个 model 中有一个失败，结论就是 `inconclusive`，exit code 为 4。
5. 超出指定行范围的发现会被标记，绝不会触发 gate。低置信度发现会列出，但不计入数量。
6. 严重程度（影响）和优先级（何时修复）彼此独立，并保持一致：critical 始终是 P0，nit 始终是 P3，风格类发现最高只能是 low。

仍有一种可能：引用正确，但结论错误。引用只能证明代码确实存在，不能证明推理正确；因此每条发现都会给出具体场景，你也应该在采取行动前阅读所引用的行。

真实示例：用这个工具审查一个预先埋入两个 bug 的小文件（通过 agy 使用 Claude Sonnet 4.6），得到 4 条行号正确的已验证发现，分别对应 CWE-89、CWE-78、CWE-22 和 CWE-369，覆盖率 100 %，去掉一条重复发现，扫描器也独立标出了相同的两行。

## 3. 当前状态：哪些已经验证，哪些还没有

| 检查项 | 结果 |
|---|---|
| 单元和流水线测试（`npm test`）：证据核验、范围、结论、去重、符号查找器、目标、配置、model、任务、翻译、安全、脱敏 | 72 项测试全部通过，使用假 `agy`（包括 Agent 流水线、工作树变更检测、model 失败和 `verify` gate） |
| Guard hook（允许和拒绝的命令、工具、引号绕过技巧、凭据路径） | 自动化测试通过 |
| Claude Code manifest（`claude plugin validate`）、Antigravity plugin（`agy plugin validate --strict`） | 通过 |
| Codex 0.163.0：添加 marketplace、安装 plugin、发现 skill | 已在 Windows 11 上检查 |
| 使用真实 agy 1.4.8（Gemini 3.8 Flash 和 Claude Sonnet 4.6）执行静态审查、安全审查和任务，使用 Bun 1.3.14 运行 | 已在 Windows 11 上检查；发现都正确对应真实代码行 |
| 各 model 的 `--effort`：默认 model（low、medium、high）、名称中含 effort 的 model，以及不支持 `--effort` 的 Claude model | 已使用真实 agy 1.4.8 检查 |
| 在 Antigravity 上端到端运行 graphify：Windows 上使用真实 graphify 0.9.86 和真实 agy 1.4.8。git hook 在后台更新图谱（22 秒、1 次 Antigravity 调用，`git commit` 在 0.3 秒内返回），而且只有发生变化的文档被发送给 model | 已手动检查，也用假 graphify 和假 agy 做过测试 |
| 对设计和代码进行两次独立审查（Opus：25 条发现；Codex：28 条发现），确认的问题均已修复，并各有一项回归测试 | 已完成，见 changelog |
| **Agent 审查（`agy --dangerously-skip-permissions` 加上阻止真实写入的 guard）** | **作者尚未运行** |

作者尚未测试：`--graphify setup --yes` 在通过真实 `uv tool` 安装的 graphify 上的运行情况（手动测试使用的是 pip 安装的 graphify，其中已经有 `openai` 包）。Agent 审查这一项关系到安全，而且取决于你的 agy 版本，因此请在安装后以及每次更新 agy 后运行一次 `verify`（第 6 节）。对符号、文件或片段的静态审查和安全审查，以及任务和翻译，从不使用该 flag，也无法写入任何内容。

测试环境：agy 1.4.8、Codex CLI 0.163.0、Bun 1.3.14、Node 24 和 Windows 11。macOS 和 Linux 应该也能运行（agy 在所有平台上都使用 `~/.gemini/config/plugins`），但尚未测试。

## 4. 要求

没有其他要求：不需要其他 plugin，也不需要其他 CLI 工具。

| 需要 | 用途 | 获取方式 | 检查方式 |
|---|---|---|---|
| Antigravity CLI `agy` | 执行实际工作 | https://antigravity.google/cli，然后运行一次 `agy` 并登录 | `agy --version` |
| Bun（推荐）**或** Node.js 18.18+ | 运行脚本和 guard hook | https://bun.sh 或 https://nodejs.org | `bun --version` / `node --version` |
| git | 处理 git 目标和发现相关代码 | https://git-scm.com | `git --version` |
| Claude Code **或** Codex **或**任意终端 | 你发出请求的地方 | 各自的安装指南 | `claude --version` / `codex --version` |

所有说明和 guard hook（`bun guard.mjs || node guard.mjs`）默认都使用 Bun；Node 的效果完全一样。使用 Antigravity 会消耗你自己的 quota。一次审查可能耗时几秒到几分钟。

## 5. 安装

选择你使用的 host；多个 host 可以共用同一个脚本和 guard。

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` 会检查 agy、git 和 guard，并将 guard 安装到 `~/.gemini/config/plugins/readonly-review`。`/agy-review:verify` 是一次真实的安全验证。

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

重启 Codex，然后直接用自然语言提出请求："Check my Antigravity review setup"、"Review my changes with Antigravity"、"Security-review the function saveUpload"、"Translate README.md to German, friendly tone"。

1. **在普通终端中安装一次 guard**（它会写入 `~/.gemini/config/plugins`）：`bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard`（Windows：`%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`；文件夹名称是已安装的版本，所以更新后请使用实际存在的文件夹）。只有 Agent git 审查需要 guard。
2. **Codex 的 sandbox 必须允许 agy 工作：**需要出站网络、对 `~/.gemini/antigravity-cli` 的写入权限，以及本地主机 socket。使用 `workspace-write` 时，你可能需要在 `~/.codex/config.toml` 中加入：

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   如果仍有内容被阻止，skill 会指出缺少的权限并停止；它绝不会自行扩大权限。作者无法测试 Codex 设置中的这一部分：agy 能否在 Codex sandbox 中正常运行，所以也请从 Codex 内部运行一次 `verify`。

### 5c. 普通终端

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

提示：`alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`。

### 5d. 仅 Antigravity 端

这个 guard 是普通的 Antigravity plugin。将 `plugins/agy-review/antigravity-plugin/readonly-review` 复制到 `~/.gemini/config/plugins/readonly-review`，或者运行 `--install-guard`；用 `agy plugin list` 检查。除非 prompt 中包含 `AGY_READONLY_REVIEW`，否则它什么也不做，因此不会影响你自己的正常 agy 会话。它还附带一个用于交互式 agy 的 `readonly-code-review` skill。

## 6. 首次运行：在你的机器上验证

安装后以及每次更新 agy 后都运行一次：`/agy-review:verify`、Codex 的 `verify` skill 或 `--verify`。它会在临时文件夹中进行一次很小的真实 agy 调用：读取一个文件（必须成功），再尝试写入文件、重定向到文件和删除文件（必须全部被阻止）。预期输出：

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

任何 `FAIL` 最后都会显示 `NOT VERIFIED`，Agent 审查也会保持禁用：请带上输出和你的 `agy --version` 提交 issue。通过的 `verify` 只对当前这个 guard 和 agy 版本有效；**未通过验证时，Agent 审查会拒绝启动**。更新 agy 或 guard 会使验证失效，因此更新后要再次运行 `verify`。静态模式不需要验证。

## 7. 用法

请从 repository 根目录运行。

### 7a. 审查：选择目标

| 你要审查的内容 | 用法 | 模式 |
|---|---|---|
| 未 commit 的工作 | 无需参数 | Agent，只读 |
| 一个 branch / 已 staged 的变更 / 一个 commit | `--base main` / `--staged` / `--commit <sha>`（可加 `--paths a,b`） | Agent，只读 |
| 一个文件或行范围 | `--file src/a.kt` 或 `--file src/a.kt:40-80`（可重复使用） | 静态 |
| 一个函数或类 | `--symbol parseConfig`（名称有歧义时加 `--file`） | 静态 |
| 仅存在于内存中的代码 | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | 静态 |
| 以上任意目标，并允许查看其他文件 | 添加 `--agentic` | Agent，只读 |

*静态*：脚本自行读取代码并添加行号，model 不会获得任何工具，因此无法接触任何内容，也无法捏造未提供文件中的情况。*Agent*：审查者通过 guard hook 自行读取 repository，而 guard 会阻止所有写入。

帮助审查者理解上下文：`--context "what this code must do"`、`--focus "concurrency, error handling"`（或在命令后直接补充文字）、`--context-lines N`。

输出：默认为 Markdown；机器读取可用 `--format json`；写入文件用 `--output file`；`--fail-on high`（存在已验证的 high 或 critical 发现时以 10 退出）；`--previous old.json` 会将发现标为新增、仍存在、已解决或未再次报告。

```text
## Summary
**Verdict: request changes**. ...
Target: app.py:1-19 | mode: static | model: Claude Sonnet 4.6 | effort: model default (...)
Findings: 4 verified (2 critical, 1 high, 1 medium ...).
### Critical
- **SQL injection** - `app.py:6` [P0 | security | confidence high | CWE-89] (id 9a9fb99468)
  Evidence:
      cur.execute("SELECT * FROM users WHERE name = '" + name + "'")
  Problem: ...   Fix: ...
```

### 7b. 安全审查

`--security`（skill `agy-security`、命令 `/agy-review:security`、sub-agent `agy-security`）适用于上述所有目标，并增加以下内容：威胁 model 方法（从不可信来源追踪到危险接收点，同时分析中间控制措施）、OWASP Top 10（2021）和 CWE 映射、`exploitability`（`demonstrated`、`likely`、`conditional`、`theoretical`）、`attack_scenario`、`data_flow`、不依赖 model 的密钥及约 25 类不良模式扫描器，以及**相关代码**：目标调用了什么、谁调用了目标。

- 硬编码密钥（private key、AWS、GitHub、Stripe、Slack、Google）会在发送给 model 前**先脱敏**，并由模式扫描报告为一条发现。
- 报告中的 `cve` 是 model 的主张，始终标记为 `cve_verified: false`：请在 NVD 上确认，或使用 `osv-scanner` / `npm audit` / `pip-audit`。该工具绝不会捏造或验证 CVE。
- “Claude 写了代码，请审查代码及其相邻部分”：把 `examples/` 中现成的规则复制到你的 `CLAUDE.md` 或 `AGENTS.md`，或者安装可选的 Stop hook 或 pre-commit hook。详情和串联用法见 [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md)。

### 7c. 任务：`agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

model 只会收到你传入的文本，不会获得任何工具。文本模式只在 stdout 输出答案；stderr 会报告 model 和 effort。

### 7d. 翻译：`agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

选项：`--from`、`--variant`（pt-BR、zh-TW、de-CH……）、`--tone`（formal、neutral、friendly、casual、technical、marketing、literary、legal）、`--audience`、`--glossary`（JSON `{"repo":"مخزن","API":"="}` 或 CSV；`=` 表示保留该词）、`--keep a,b`、`--notes`、`--strict`。长文本会按空行拆分（绝不会在代码块中间拆分），再逐块翻译。翻译完成后，脚本会验证 fenced code、inline code、URL、占位符（`{{x}}`、`${x}`、`%s`）、tag 和标题是否与原文一致，并报告所有差异（`--strict` 会让差异触发 exit 11）。skill 会先询问语气、受众和术语，只问无法推断的内容。机器检查无法判断语言是否自然；重要文本请让母语读者复核。

### 7e. Model 和 effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

每次运行可用：`--model <id|name>`、`--models a,b`、`--effort auto|low|medium|high|xhigh|max`。优先级依次为命令行、项目文件、用户文件、agy 默认值。`--effort auto`（默认值）会以确定且有解释的方式选择：审查会根据范围内的代码量调整（安全等对风险敏感的重点会提高一级）；任务会根据措辞（机械转换用 low，需要大量推理用 high）和输入长度调整；绝不会自动选择 `max`。**effort 始终按 model 的能力匹配，绝不猜测。** 每个 model 对 `--effort` 的支持都不同：agy 的默认 model 提供 `low | medium | high`，名称中已经包含 effort 的 model（`gemini-3.8-flash-high`、`gpt-oss-120b-medium`）完全不接受 `--effort`，Claude model 也不支持。工具会询问 agy 当前 model 属于哪种情况（这是一次免费检查，约需四秒，不会发起 model 调用），并按 model 和 agy 版本将答案缓存到 `~/.agy-review-cache.json`。它会把你的 effort 调整到该 model 支持的最接近值（例如把 `xhigh` 调整为 `high`），报告中也会写明实际使用的值。如果 agy 的列表发生变化，工具会读取错误、修正缓存并重试一次。`--list-models` 会显示每个 model 支持的值（`--refresh` 会重新查询）。如果 Gemini 的内容过滤器拒绝 prompt，而你没有指定 model，工具会改用非 Gemini model 重试一次，并明确说明。

### 7f. 选项和 exit code

`bun agy-review.mjs --help` 会列出所有选项。Exit code：`0` 正常 · `1` 错误、超时或回复无法解析 · `2` 用法错误或缺少前置条件 · `3` Agent 审查期间工作树发生变化 · `4` 无法得出结论或结果不完整（**不代表通过**）· `10` `--fail-on` gate 失败（报告仍然有效）· `11` 使用 `--strict` 时翻译检查失败。如果同时满足多个条件，`3` 优先于 `10`，`10` 优先于 `4`；除 `1` 和 `2` 外，所有情况都会写出报告，所以请读取其中的 `verdict` 和 `incomplete`。干净的工作树不是错误：工具会输出 "No changes to review"，不调用 model，并以 0 退出。

### 7g. 在 Antigravity 上运行 graphify：图谱更新消耗零 Agent token

**如果你使用 [graphify](https://github.com/Graphify-Labs/graphify)，这是整个项目里省得最多的功能。** graphify 会把 repository 及其文档转换成知识图谱。大部分工作都是确定性的代码（tree-sitter、聚类、报告、缓存、merge），不产生费用。只有两个步骤需要语言 model：**对文档和论文做语义提取**，以及**为社区命名**。如果你不固定后端，graphify 会自行选择；在编码 Agent 中，它选到的就是编码 Agent（或其订阅）。因此，只要图谱刷新涉及文档，就会消耗你的 Opus、Fable 或 Codex token。

**`--graphify` 只把这两个步骤移到 Antigravity，其他部分完全不动。** 脚本会在 `127.0.0.1` 上启动一个小型本地服务器，使用 OpenAI 兼容协议，并通过 `agy` 返回答案；随后**把 graphify 的每个 LLM 步骤都固定到这个服务器**，让 graphify 绝不可能回退到你的编码 Agent 或付费 API key。不需要 Ollama，也不需要任何 key。（graphify 的设置把这个位置称为 "ollama"，实际含义只是“任意本地 OpenAI 兼容服务器”。）

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**为什么不需要写入或执行权限。** 你可能以为这需要 Python 和文件写入，但 model 只需读取文本并返回文本。graphify 自己写入 `graphify-out/`；本工具写入 hook、lock 文件和日志。服务器背后的 model 没有工具、文件和网络，隐藏在文档中的 prompt injection 无法让它执行任何操作。文档中识别出的密钥会在发送前脱敏。这延续了项目其他部分的只读承诺。

每个 repository 只需设置一次：

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

在 Claude Code 或 Codex 中，直接说 "set up graphify updates on Antigravity" 即可（skill `agy-graphify` / `graphify`，命令 `/agy-review:graphify`）。skill 在向 graphify 环境添加包之前会先询问你。

它会为你完成这些工作：

- **Hook：** `post-commit`、`post-merge`、`post-checkout`（仅 branch 切换）和 `post-rewrite`（amend、rebase）会以**分离进程**运行更新，因此 git 命令不到一秒就会返回。这些 hook 文件中的现有内容会保留。默认会**替换 graphify 自己的 hook**（它们只重建代码图谱，我们的 hook 也会做这些事，且功能更多；两个写入方同时修改同一图谱会产生竞争）。`--keep-graphify-hook` 会保留两套 hook；`--graphify hook-uninstall --restore-graphify` 会恢复 graphify 自己的 hook。工具会在 `~/.agy-review/runtime` 下保存一份副本，使 hook 在 plugin 更新后仍能工作。可用 `AGY_GRAPHIFY_SKIP=1 git commit ...` 跳过一次。
- **增量更新：** graphify 自己的缓存负责判断发生了什么变化；未变化的文档绝不会发送给 model。连续两个 commit 不会同时启动两次更新：第二次只会请求再执行一轮。
- **你的 Agent 不再为此浪费 token：** 如果 `CLAUDE.md` 或 `AGENTS.md` 中的 graphify 部分要求 Agent 重建图谱，`--graphify rules --write-rules` 会追加一条简短规则，让它不要这样做（绝不会编辑你自己的文字；如果文件不存在，也不会创建任何内容）。
- **默认便宜：** effort 使用 `low`，因为提取属于结构化工作。测试中，对同一文档使用 `low` 比 `high` 少用了约 40 倍的输出 token（685 对 29,996），耗时 15 秒而不是 207 秒。可用 `--set graphifyEffort=...` 修改，用 `--set graphifyModel=<id>` 选择 model（见 `--list-models`），用 `--set graphifyConcurrency=N` 并行调用，用 `--set graphifyLabels=false` 跳过社区命名。

局限也要说清楚：更新会消耗你的 **Antigravity quota**（目的就是用便宜 model 代替昂贵 model，而不是“免费”）。这条路径**不会提取图片**（graphify 会为该后端跳过图片，而 agy 也无法通过这条路径看到图片）。代码在本地解析；文档和论文会以文本形式发送给 Google 的 model。文档提取质量取决于你选择的 model。必须先安装 graphify（`uv tool install graphifyy`），而且它自己的 Python 需要 `openai` 包：`--graphify setup --yes` 会通过 `uv tool install --force "graphifyy[openai]"` 添加（也可用 `pipx inject graphifyy openai`）。详情、设置和故障排查见 [docs/GRAPHIFY.md](GRAPHIFY.md)。

## 8. 在 Agent、sub-agent 和循环中使用

每个 skill 都只是一次返回稳定 JSON 的普通 CLI 调用，因此任何 Agent 都能使用：在 Claude Code 中启动 `agy-reviewer`、`agy-security` 或 `agy-worker` sub-agent，在 Codex 中调用 skill，或者从任意框架调用脚本。

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

审查者不会被告知你改了什么，因此每一轮都保持独立。完整约定、JSON 字段、循环示例和扇出模式见 [docs/AGENTS.md](AGENTS.md)。

## 9. 安全 model

**静态审查、对符号/文件/片段的安全审查、任务和翻译**会在空的临时文件夹中运行 agy，不带任何权限 flag，也不提供工具：agy 无法读取或写入你的文件；只有脚本放入 prompt 的数据会离开本机（已对识别出的密钥进行脱敏）。

**Agent 审查**（git 目标或 `--agentic`）会使用 `--dangerously-skip-permissions` 启动 agy，避免等待权限 prompt，并依赖一个检查每次工具调用、**默认拒绝**的 `PreToolUse` guard hook（`guard.mjs`）：

- 允许：文件查看和搜索工具；单条或串联的 shell 命令，但只能由只读 `git` 子命令、`rg`、`grep`、`cat`、`ls`、`head`、`tail`、`wc`、`find`（不带 `-delete`/`-exec`）、PowerShell `Get-*`、`Select-String` 和少量其他命令构成（完整列表在 `guard.mjs` 中）；
- 拒绝：所有写入/编辑/notebook/图片/定时任务/sub-agent/浏览器/网页/MCP 工具和任何未知工具；重定向、`$(...)`、反引号、脚本块、类似 `eval` 的结构；`git commit/push/checkout/reset/...`；解释器和包管理器；`curl`、`ssh`；读取凭据存储（`.ssh`、`.aws`、`.gnupg`、private key）；
- guard 崩溃时也会拒绝；除非 guard 已安装、与随附版本完全一致，**而且已为当前 guard 和 agy 版本记录一次通过的 `--verify`**，否则脚本会拒绝启动 Agent 运行；运行前后，它会对 `git status`、已跟踪和 staged 的 diff、每个未跟踪文件的内容生成指纹。如果任何内容发生变化，就以 3 退出并给出警告。
- **Agent 模式中的密钥无法在审查者读取文件前脱敏。** 工具会检测并警告，在 `limitations` 中列出；请轮换这些密钥，或者改用 `--file` / `--symbol`，这样可以先脱敏再审查。

**graphify 更新**（`--graphify`）不会给 model 任何工具：model 通过只监听 `127.0.0.1` 的服务器接收文本；服务器要求一个只在单次更新期间存在的随机 bearer key，拒绝外部 `Host` header，并在不带任何权限 flag 的空临时文件夹中运行 `agy`。写入磁盘的是 graphify（`graphify-out/`）和本工具（git hook、`~/.agy-review/runtime`、lock 和日志）。这些 hook 会在每次 commit 时运行代码：这与使用 graphify 自带 hook 时给予的信任相同；`--graphify hook-uninstall` 可以将它们移除。

它不是什么：

- **它不是操作系统级 sandbox。** guard 只过滤工具名和命令文本；agy 自己的 sandbox 并非随处可用。审查代码中刻意构造的 prompt injection 可能会寻找过滤器接受的命令形式。前后检查能发现已跟踪文件被修改和新文件出现，但无法发现读取行为。
- **你的代码会发送给 Google 的 model**；除了凭据路径外，读取不受限制。Agent 审查可以读取 repository 中的 `.env` 文件。不要审查你无权分享的代码。
- git 可以运行 repository 中配置的外部 diff 或 textconv 程序：只审查你信任的 repository。
- 发现可能错误或不完整，“没有发现”绝不代表“安全”。

## 10. 故障排查

| 现象 | 原因和解决方法 |
|---|---|
| `Missing: agy CLI` | 安装 Antigravity CLI，然后运行一次 `agy` 并登录；运行 plugin 的 shell 中必须能执行 `agy --version` |
| `Missing: read-only guard - missing/outdated` | 运行设置（`/agy-review:setup`、Codex 的 `setup` skill 或 `--install-guard`）；只有 Agent 审查需要它 |
| `Not inside a git repository`（exit 2） | 用 `cd` 进入 repository 根目录，或用 `--file` / `--symbol` / `--stdin` 审查代码 |
| 结论为 `inconclusive`，exit 4 | 不代表通过：有发现被拒绝、model 意见不一或没有覆盖代码，或者某个 model 失败。缩小范围、添加 `--context`，或尝试其他 `--model` |
| `blocked by Gemini's filters` | Gemini 安全过滤器拒绝了请求（安全 prompt 中很常见）。未指定 `--model` 时，工具会改用非 Gemini model 重试；否则请用 `--model` 选择其他 model |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` 或 `conflicts with --effort` 或 `--effort is not supported` | 已在 1.0.1 修复：effort 会自动匹配 model，报告也会写明实际值。如果仍然出现，请运行 `--list-models --refresh`、更新 plugin（第 12 节），并报告问题 |
| graphify：`openai package ... missing` | graphify 自己的 Python 缺少 `openai` 包。运行 `--graphify setup --yes`，或运行 `uv tool install --force "graphifyy[openai]"`（pipx：`pipx inject graphifyy openai`） |
| graphify：commit 后图谱没有更新 | `--graphify status` 会显示 hook 和上次结果；读取 `graphify-out/.agy-update.log`；在前台运行一次 `--graphify update --debug`（它会把每次请求和回复保存在 `graphify-out/.agy-debug/`，其中包含你的文档）。如果还没有图谱，hook 不会做任何事：先用 `--graphify update --full` 构建一次 |
| graphify：某个分块出现 `agy returned no answer` | graphify 会在下次更新时重试该分块。用 `agy -p "say hi"` 检查登录和 quota，或用 `--set graphifyModel=<id>` 选择其他 model |
| graphify 警告 skill 与包版本不同 | 对本工具无影响；用 `uv tool upgrade graphifyy` 升级 graphify |
| 空审查，exit 1 | 用 `agy -p "say hi"` 检查登录和 quota；目标较大时提高 `--timeout` |
| Exit 3 / 工作树发生变化 | Agent 审查期间有内容修改了文件（编辑器、构建过程或绕过了 guard）。检查 `git status` 和 `git diff`；如果不是你改的，请按安全事件处理 |
| 大量发现被拒绝 | model 引用了并不存在的代码。这偶尔会发生；被拒绝的发现绝不会计数。使用更强的 `--model` 或缩小范围 |
| `--symbol`："defined in several places" 或 "not found" | 传入 `--file`，或使用 `--file path:A-B`。查找器采用启发式方法（匹配大括号/缩进），不是 parser |
| Codex："blocked by sandbox" | 见 5b：必须允许网络、写入 `~/.gemini/antigravity-cli` 和本地主机 socket |
| Windows：在 Claude/Codex 内找不到 `agy` 或 `bun` | 工具 shell 使用了不同的 `PATH`；请从能执行该命令的 shell 启动 |
| `verify` 输出 FAIL | 不要对重要代码使用 Agent 审查；请带上输出和 `agy --version` 提交 issue |

## 11. 常见问题

**它会修改我的代码吗？** 不会。静态模式无法修改；Agent 模式会阻止写入，并在之后发现工作树不同时发出警告。它绝不会 commit、stash 或 checkout 任何内容。

**在这里 Bun 比 Node 快吗？** 没有明显差别。在作者的 Windows 机器上，Node 启动约 56 ms，Bun 约 64 ms；guard hook 则约为 60 ms 和 57 ms。一次审查要几十秒，其中耗时的是 model。文档默认使用 Bun；Node 18.18+ 的效果相同。两者都由相同代码覆盖。

**会花钱吗？** plugin 免费。每次审查、任务、翻译和 graphify 更新都会消耗你的 Antigravity quota。

**graphify 需要 Ollama 或 API key 吗？** 不需要。graphify 有一个名为 "ollama" 的后端位置，含义是“任意本地 OpenAI 兼容服务器”；背后实际使用的是本工具的小型 Antigravity 服务器。唯一要安装的是 graphify 的 `openai` Python 包，`--graphify setup --yes` 会添加它。

**graphify 还会消耗我的 Claude 或 Codex token 吗？** 只有当你或你的 Agent 自行运行 `/graphify --update`、`graphify extract` 或类似命令，或者 `CLAUDE.md` / `AGENTS.md` 中有要求 Agent 重建图谱的部分时才会。使用 `--graphify rules --write-rules` 添加阻止这种行为的规则。

**Antigravity 能看到哪些文件？** 静态模式：只有脚本发送的代码（使用 `--security` 时还会带上范围受限的相关代码）。Agent 模式：它在 repository 中读取的任何内容，以及磁盘上除凭据路径外的任何位置。

**它能修复发现的问题吗？** 不能。由另一个 Agent 或你来修复；审查者只负责审查，因此能保持独立。

**它能审查 GitHub pull request 吗？** 在本地 checkout 对应 branch，然后使用 `--base`。它不访问 GitHub API。

**为什么不在 agy 设置中设置命令 allowlist？** 实测表明，在 headless 模式下，agy 只会精确匹配多个单词的授权（`git status` 可以，`git status --short` 不行），而 hook 的“允许”也无法覆盖权限检查。hook 只能可靠地拒绝，因此 Agent 模式使用 skip-permissions 加默认拒绝的 hook，静态模式则完全不提供工具。

**我能添加允许的命令或扫描规则吗？** 编辑 `CMDS` / `GIT_OK`（位于 `guard.mjs`）或 `RULES`（位于 `lib/security.mjs`），运行 `npm test`，再运行 `--install-guard`。

## 12. 更新、卸载、开发

### 如何更新到新版本

新 release 不会自动来到你手中：你要主动更新。分四步。

**1. 检查当前版本以及是否有更新版本**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

你也可以在 https://github.com/Ealireza/agy-review/releases 查看 release 列表，并阅读 [changelog](../CHANGELOG.md)。

**2. 更新你所用 host 的 plugin**

| Host | 命令（在普通终端中运行） | 然后 |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review`，然后运行 `claude plugin update agy-review@agy-review` | 重启 Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review`，然后运行 `codex plugin remove agy-review@agy-review` 和 `codex plugin add agy-review@agy-review` | 重启 Codex |
| 普通 clone | 在 clone 中运行 `git pull` | 无需其他操作 |

**3. 刷新 plugin 文件夹外的部分**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. 确认更新成功：** `--version` 显示新版本号，`--check` 对所有项目都显示 OK，`--list-models --refresh` 重新读取每个 model 支持的 `--effort`。

如果更新后出现问题：运行 `--check`，阅读故障排查表（第 10 节）；如果需要恢复旧版本，移除 plugin，然后用 `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review` 安装指定 release。你的设置（`.agy-review.json`）只是普通文件，更新绝不会改动它。

### 卸载

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

如果想彻底清理，请删除 `~/.agy-review`（runtime 副本）和 `~/.agy-review-cache.json`（effort 缓存）。

### 开发

```bash
npm test        # 73 tests, no agy, no network (uses a fake agy in fixtures/)
```

```text
.claude-plugin/marketplace.json  .agents/plugins/marketplace.json
plugins/agy-review/
  .claude-plugin/  .codex-plugin/        manifests
  commands/ skills/ agents/              Claude Code
  codex-skills/                          Codex
  prompts/ (rubric.md, security.md)  schema/review.schema.json
  scripts/agy-review.mjs  scripts/lib/   the wrapper (targets, grounding, merge, security, translate, config, agy)
  antigravity-plugin/readonly-review/    the Antigravity plugin: hooks.json, guard.mjs, skill
  scripts/lib/graphify.mjs, shim.mjs     graphify hooks and update; the local Antigravity server
docs/ (AGENTS.md, SECURITY-REVIEW.md, GRAPHIFY.md, README.<lang>.md, index.html = website)   examples/   test/   fixtures/
```

欢迎提交 issue 和 pull request，尤其欢迎提供：macOS 和 Linux 上的 `verify` 结果、可用的 Codex sandbox 设置、guard 绕过方式（如果可以，请先私下报告），以及新的扫描规则。翻译：将 `README.md` 复制到 `docs/README.<code>.md`，完成翻译，并把该语言加入各处的语言切换行。

## License

MIT，见 [LICENSE](../LICENSE)。
