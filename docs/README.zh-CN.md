# agy-review

**一位必须展示自己依据的独立审查者。** 由 Google Antigravity（`agy`）提供代码审查、安全审查、任务委派和翻译，可从 Claude Code、Codex 或任意终端调用。只读，无权限提示，每条发现在呈现给你之前都会与你的真实代码核对。

[English](../README.md) · [فارسی](README.fa.md) · **简体中文** · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

网站：https://ealireza.github.io/agy-review/ · 深入文档（英文）：[AGENTS.md](AGENTS.md) 介绍智能体与循环，[SECURITY-REVIEW.md](SECURITY-REVIEW.md) 介绍安全审查方法。

---

## 目录

1. 你能得到什么
2. 为什么可以信任这份报告
3. 状态：哪些已验证，哪些未验证
4. 环境要求
5. 安装
6. 首次运行：在你的机器上验证
7. 用法：审查、安全、任务、翻译、模型
8. 在智能体、子智能体和循环中使用
9. 安全模型
10. 故障排查
11. 常见问题
12. 更新、卸载、开发

---

## 1. 你能得到什么

| 技能（Claude Code / Codex） | 命令（Claude Code） | 作用 |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | 对 git 变更、分支、文件、行范围、单个函数或代码片段进行分级审查 |
| `agy-security` / `security` | `/agy-review:security` | 安全审查：OWASP/CWE、可利用性、攻击场景、密钥与不良模式扫描器，并以调用方和被调用方作为上下文 |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | 把任何自包含的任务（改写、摘要、起草、提取）交给 Antigravity 并取回结果 |
| `agy-translate` / `translate` | `/agy-review:translate` | 按语气、受众和术语表翻译；校验代码、URL、占位符和结构是否完好保留 |
| `agy-models` / `models` | `/agy-review:models` | 列出你的 agy 中的模型，选择其一，保存为项目级或全局设置，并设定推理强度 |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | 检查前置条件，安装只读守卫，在你的机器上证明写入已被阻止 |

Claude Code 的子智能体：`agy-reviewer`、`agy-security`、`agy-worker`。一切都在一个仓库、一个脚本中（`plugins/agy-review/scripts/agy-review.mjs`）。没有服务器，除了你自己的 Antigravity 登录之外也没有其他账号。

## 2. 为什么可以信任这份报告

审查代码的语言模型有时会凭空编造问题。这个工具不会轻信它的任何一句话。

1. 审查者必须返回严格的 JSON 报告（由 `--json-schema` 强制）。每条发现都附带它所针对的**确切代码**。
2. 脚本会在真实文件中查找该引文。**未找到：该发现被拒绝**并单独列出。**在另一行找到：行号会被修正。**过短或过于通用而无法证明任何事情的引文（`return null;`、`}`）会被拒绝。与所引行相距较远的多处位置同时匹配的引文，会因有歧义而被拒绝。
3. 结论、计数和 CI 门禁**由脚本计算**，仅基于已验证的发现，绝不照搬模型的说法。
4. 没有已验证的发现**不等于**批准：如果有发现被拒绝、模型意见不一致、未覆盖代码，或多个模型中有一个失败，结论为 `inconclusive`，退出码为 4。
5. 超出请求行范围的发现会被标注，且永远不触发门禁。低置信度的发现会列出但不计数。
6. 严重程度（影响）与优先级（何时修复）相互独立且保持一致：critical 始终是 P0，nit 始终是 P3，风格类发现绝不高于 low。

仍然可能发生的情况：引文正确但结论错误。引文只能证明代码存在，不能证明推理正确；因此每条发现都带有具体场景，也因此你在采取行动前应当阅读所引用的行。

真实示例：用本工具审查一个埋有两个缺陷的小文件（通过 agy 使用 Claude Sonnet 4.6）：在正确的行上得到 4 条已验证的发现，分别对应 CWE-89、CWE-78、CWE-22 和 CWE-369，覆盖率 100 %，去除了一条重复项，扫描器也独立标出了同样的两行。

## 3. 状态：哪些已验证，哪些未验证

| 检查项 | 结果 |
|---|---|
| 单元与流水线测试（`npm test`）：grounding、范围、结论、去重、符号查找器、目标、配置、模型、任务、翻译、安全、脱敏 | 50 个测试，全部通过，使用伪造的 `agy`（包括 agentic 流水线、工作树变更检测、失败的模型和 `verify` 门禁） |
| 守卫钩子（允许与拒绝的命令、工具、引号技巧、凭据路径） | 自动化测试，通过 |
| Claude Code 清单（`claude plugin validate`）、Antigravity 插件（`agy plugin validate --strict`） | 通过 |
| Codex 0.163.0：添加 marketplace、安装插件、发现技能 | 已在 Windows 11 上检查 |
| 使用真实 agy 1.4.8（Gemini 3.8 Flash 与 Claude Sonnet 4.6）进行静态审查、安全审查和任务，使用 Bun 1.3.14 运行 | 已在 Windows 11 上检查；发现准确落在正确的行上 |
| 对设计与代码的两次独立审查（Opus：25 条发现；Codex：28 条发现），已确认的问题均已修复并各附一个回归测试 | 已完成，参见变更日志 |
| **Agentic 审查（`agy --dangerously-skip-permissions` 加上拦截真实写入的守卫）** | **作者未运行过** |

最后一行关系到安全，并且取决于你的 agy 版本，因此请在安装后以及每次 agy 更新后运行一次 `verify`（第 6 节）。静态审查、针对符号/文件/片段的安全审查、任务和翻译从不使用该标志，也无法写入任何内容。

测试环境：agy 1.4.8、Codex CLI 0.163.0、Bun 1.3.14 和 Node 24，Windows 11。macOS 和 Linux 应该可用（agy 在所有平台上都使用 `~/.gemini/config/plugins`），但未经测试。

## 4. 环境要求

不需要其他东西：不需要其他插件，不需要其他 CLI 工具。

| 需要 | 用途 | 获取方式 | 检查方式 |
|---|---|---|---|
| Antigravity CLI `agy` | 完成实际工作 | https://antigravity.google/cli，然后运行一次 `agy` 并登录 | `agy --version` |
| Bun（推荐）**或** Node.js 18.18+ | 运行脚本和守卫钩子 | https://bun.sh 或 https://nodejs.org | `bun --version` / `node --version` |
| git | git 目标以及查找相关代码 | https://git-scm.com | `git --version` |
| Claude Code **或** Codex **或** 任意终端 | 你发出请求的地方 | 它们各自的安装指南 | `claude --version` / `codex --version` |

在所有说明和守卫钩子中，Bun 是默认选项（`bun guard.mjs || node guard.mjs`）；Node 的效果完全相同。Antigravity 的使用会计入你自己的配额。一次审查可能耗时几秒到几分钟。

## 5. 安装

选择你使用的宿主；多个宿主可以共用同一个脚本和守卫。

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` 会检查 agy、git 和守卫，并把守卫安装到 `~/.gemini/config/plugins/readonly-review`。`/agy-review:verify` 是实时的安全证明。

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

重启 Codex，然后用自然语言提问：“检查我的 Antigravity 审查配置”“用 Antigravity 审查我的更改”“对函数 saveUpload 做安全审查”“把 README.md 翻译成德语，语气友好”。

1. **在普通终端中安装一次守卫**（它会写入 `~/.gemini/config/plugins`）：`bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard`（Windows：`%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`）。只有基于 git 的 agentic 审查需要守卫。
2. **Codex 的沙箱必须允许 agy 工作：**出站网络、对 `~/.gemini/antigravity-cli` 的写权限，以及一个 localhost 套接字。使用 `workspace-write` 时，你很可能需要在 `~/.codex/config.toml` 中加入：

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   如果仍有内容被阻止，技能会指出缺少的权限并停止；它绝不会自行扩大权限。agy 能否在你的 Codex 沙箱内正确运行，是作者无法测试的 Codex 配置部分，因此请在 Codex 内部也运行一次 `verify`。

### 5c. 纯终端

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

### 5d. 仅 Antigravity 一侧

守卫是一个普通的 Antigravity 插件。把 `plugins/agy-review/antigravity-plugin/readonly-review` 复制到 `~/.gemini/config/plugins/readonly-review`，或运行 `--install-guard`；用 `agy plugin list` 检查。除非提示词中包含 `AGY_READONLY_REVIEW`，否则它什么也不做，因此你平时的 agy 会话不受影响。它还附带一个供交互式 agy 使用的 `readonly-code-review` 技能。

## 6. 首次运行：在你的机器上验证

安装后以及每次 agy 更新后运行一次：`/agy-review:verify`、Codex 的 `verify` 技能，或 `--verify`。它会在一个临时文件夹中对 agy 发起一次小型实时调用：读取文件（必须成功），写入文件、重定向到文件、删除文件（必须全部被阻止）。预期结果：

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

任何 `FAIL` 都会以 `NOT VERIFIED` 结束，agentic 审查将保持禁用：请附上输出和你的 `agy --version` 提交 issue。`verify` 通过后，结果只针对这一个守卫和这一个 agy 版本记录；**没有它，agentic 审查拒绝启动**，而 agy 或守卫的更新会使其失效，因此更新后请再次运行 `verify`。静态模式不需要它。

## 7. 用法

在仓库根目录下运行。

### 7a. 审查：选择目标

| 你想审查 | 使用 | 模式 |
|---|---|---|
| 未提交的工作 | 无需参数 | agentic，只读 |
| 分支 / 暂存的更改 / 单个提交 | `--base main` / `--staged` / `--commit <sha>`（+ `--paths a,b`） | agentic，只读 |
| 文件或某个范围 | `--file src/a.kt` 或 `--file src/a.kt:40-80`（可重复） | 静态 |
| 单个函数或类 | `--symbol parseConfig`（名称有歧义时加 `--file`） | 静态 |
| 仅存在于内存中的代码 | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | 静态 |
| 以上任一种，并允许查看其他文件 | 加上 `--agentic` | agentic，只读 |

*静态*：脚本自己读取代码并为其编号，模型没有任何工具，因此不会碰到任何东西，也无法对未展示给它的文件凭空编造内容。*Agentic*：审查者通过守卫钩子自行读取仓库，守卫钩子会阻止每一次写入。

帮助审查者：`--context "what this code must do"`、`--focus "concurrency, error handling"`（或直接在末尾跟上关键词）、`--context-lines N`。

输出：默认为 Markdown；`--format json` 供机器使用；`--output file`；`--fail-on high`（存在已验证的 high 或 critical 发现时退出码为 10）；`--previous old.json` 会把发现标记为新增、持续存在、已解决或未再次报告。

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

`--security`（技能 `agy-security`，命令 `/agy-review:security`，子智能体 `agy-security`）适用于上面的每种目标，并额外提供：威胁建模方法（从不可信来源到危险汇点，并包含途中的控制措施）、OWASP Top 10（2021）与 CWE 映射、`exploitability`（`demonstrated`、`likely`、`conditional`、`theoretical`）、`attack_scenario`、`data_flow`、一个不依赖模型的、针对密钥和约 25 类不良模式的扫描器，以及**相关代码**：目标调用了什么，以及谁调用了它。

- 硬编码的密钥（私钥、AWS、GitHub、Stripe、Slack、Google）会在**任何内容发送给模型之前被脱敏**，并按模式作为发现报告。
- 报告中的 `cve` 是模型的断言，始终标记为 `cve_verified: false`：请在 NVD 上或用 `osv-scanner` / `npm audit` / `pip-audit` 确认。本工具从不凭空编造或验证 CVE。
- “Claude 写了代码，请审查它及其相邻代码”：把 `examples/` 中现成的规则复制到你的 `CLAUDE.md` 或 `AGENTS.md`，或安装可选的 Stop 钩子或 pre-commit 钩子。详情与链式用法：[SECURITY-REVIEW.md](SECURITY-REVIEW.md)。

### 7c. 任务：`agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

模型只会得到你传入的文本，没有任何工具。文本模式只打印答案；stderr 会报告模型和推理强度。

### 7d. 翻译：`agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

选项：`--from`、`--variant`（pt-BR、zh-TW、de-CH ...）、`--tone`（formal、neutral、friendly、casual、technical、marketing、literary、legal）、`--audience`、`--glossary`（JSON `{"repo":"مخزن","API":"="}` 或 CSV；`=` 表示保留该术语）、`--keep a,b`、`--notes`、`--strict`。长文本按空行拆分（绝不在代码块内部拆分），并逐块翻译。翻译完成后，脚本会校验围栏代码、行内代码、URL、占位符（`{{x}}`、`${x}`、`%s`）、标签和标题是否与原文一致，并报告每一处差异（`--strict` 会把差异变为退出码 11）。技能会先就语气、受众和术语向你提问，只问它们无法推断的内容。机器检查无法判断行文是否流畅；重要文本请让母语读者审阅。

### 7e. 模型与推理强度

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

每次运行可用：`--model <id|name>`、`--models a,b`、`--effort auto|low|medium|high|xhigh|max`。优先级：命令行、项目文件、用户文件、agy 默认值。`--effort auto`（默认）是一种确定性且附带解释的选择：审查按范围内的代码量缩放（如安全这类对风险敏感的关注点会再加一档），任务则按措辞（机械性转换用 low，重推理的用 high）和输入长度决定；`max` 绝不会自动选用。有些模型不接受 `--effort`；此时工具使用模型默认值并予以说明。如果 Gemini 的内容过滤器拒绝了某个提示词而你没有指定模型，工具会改用非 Gemini 模型重试一次并予以说明。

### 7f. 选项与退出码

`bun agy-review.mjs --help` 会列出全部内容。退出码：`0` 正常 · `1` 错误、超时或无法解析的回复 · `2` 用法错误或缺少前置条件 · `3` agentic 审查期间工作树发生了变化 · `4` 无定论或不完整（**不算通过**） · `10` `--fail-on` 门禁未通过（报告有效） · `11` 使用 `--strict` 时翻译检查失败。如果有多个条件同时成立，`3` 优先于 `10`，`10` 优先于 `4`；除 `1` 和 `2` 外，其他情况都会写出报告，因此请查看其中的 `verdict` 和 `incomplete`。工作树干净不算错误：工具会打印 "No changes to review" 并以 0 退出，不会调用模型。

## 8. 在智能体、子智能体和循环中使用

每个技能都是一次带稳定 JSON 的普通 CLI 调用，因此任何智能体都可以使用：在 Claude Code 中启动 `agy-reviewer`、`agy-security` 或 `agy-worker` 子智能体，在 Codex 中调用技能，或在任意框架中调用该脚本。

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

审查者从不被告知你改了什么，因此每一轮都保持独立。完整契约、JSON 字段、循环用法和扇出模式：[AGENTS.md](AGENTS.md)。

## 9. 安全模型

**静态审查、针对符号/文件/片段的安全审查、任务和翻译**在空的临时文件夹中运行 agy，不带任何权限标志，也不带任何工具：agy 无法读取或写入你的文件；唯一离开本机的数据，是脚本放进提示词里的内容（已识别的密钥会先脱敏）。

**Agentic 审查**（git 目标，或 `--agentic`）使用 `--dangerously-skip-permissions` 启动 agy，使任何操作都不必等待提示，并依赖一个 `PreToolUse` 守卫钩子（`guard.mjs`）检查每一次工具调用，且**默认拒绝**：

- 允许：文件查看与搜索工具；仅由只读 `git` 子命令、`rg`、`grep`、`cat`、`ls`、`head`、`tail`、`wc`、`find`（不含 `-delete`/`-exec`）、PowerShell 的 `Get-*`、`Select-String` 及少数其他命令构成的 shell 命令（单条或链式；完整列表见 `guard.mjs`）；
- 拒绝：所有写入/编辑/notebook/图像/定时/子智能体/浏览器/网页/MCP 工具以及任何未知工具；重定向、`$(...)`、反引号、脚本块、类 `eval` 构造；`git commit/push/checkout/reset/...`；解释器和包管理器；`curl`、`ssh`；读取凭据存储（`.ssh`、`.aws`、`.gnupg`、私钥）；
- 守卫崩溃时拒绝；除非守卫已安装、与随附版本一致，**并且已为此守卫和此 agy 版本记录过一次通过的 `--verify`**，否则脚本拒绝启动 agentic 运行；运行前后它会对 `git status`、已跟踪和已暂存的差异以及每个未跟踪文件的内容取指纹，一旦有任何不同就以退出码 3 退出并发出警告。
- **Agentic 模式下的密钥无法脱敏**，因为审查者会直接读取文件。工具会检测它们、发出警告并列在 `limitations` 中；请轮换这些密钥，或改用 `--file` / `--symbol` 审查，那样它们会先被脱敏。

它不是什么：

- **不是操作系统沙箱。**守卫只过滤工具名称和命令文本；agy 自带的沙箱并非处处可用。隐藏在被审查代码中的刻意提示词注入，可能找到过滤器会放行的命令形态。运行前后的比对能发现被修改的已跟踪文件和新文件，但发现不了读取行为。
- **你的代码会被发送到 Google 的模型**；除凭据路径外，读取不受限制。仓库中的 `.env` 文件可被 agentic 审查读取。不要审查你无权分享的代码。
- git 可以运行仓库中配置的外部 diff 或 textconv 程序：只审查你信任的仓库。
- 发现可能有误或不完整，而“没有发现”绝不等于“安全”。

## 10. 故障排查

| 现象 | 原因与解决办法 |
|---|---|
| `Missing: agy CLI` | 安装 Antigravity CLI 并运行一次 `agy` 登录；在运行插件的 shell 中 `agy --version` 必须可用 |
| `Missing: read-only guard - missing/outdated` | 运行 setup（`/agy-review:setup`、Codex 的 `setup` 技能，或 `--install-guard`）；只有 agentic 审查需要它 |
| `Not inside a git repository`（退出码 2） | `cd` 到仓库根目录，或用 `--file` / `--symbol` / `--stdin` 审查代码 |
| 结论 `inconclusive`，退出码 4 | 不算通过：发现被拒绝、模型意见不一致或未覆盖代码，或有一个模型失败。缩小范围、加上 `--context`，或换用其他 `--model` |
| `blocked by Gemini's filters` | Gemini 安全过滤器拒绝了请求（安全类提示词中很常见）。未指定 `--model` 时工具会改用非 Gemini 模型重试；否则请用 `--model` 选一个 |
| `--effort is not supported for model` | 自动处理（使用并报告模型默认值） |
| 审查结果为空，退出码 1 | 用 `agy -p "say hi"` 检查登录和配额；目标较大时调大 `--timeout` |
| 退出码 3 / 工作树已变更 | 在 agentic 审查期间有东西修改了你的文件（编辑器、构建，或守卫被绕过）。检查 `git status` 和 `git diff`；如果不是你改的，请视为安全事件 |
| 被拒绝的发现很多 | 模型引用了并不存在的代码。偶尔出现属于预期；它们永远不会被计数。改用更强的 `--model` 或更小的范围 |
| `--symbol`："defined in several places" 或 "not found" | 传入 `--file`，或使用 `--file path:A-B`。查找器是启发式的（花括号/缩进匹配），不是解析器 |
| Codex："blocked by sandbox" | 见 5b：必须允许网络、对 `~/.gemini/antigravity-cli` 的写入以及 localhost 套接字 |
| Windows：在 Claude/Codex 内找不到 `agy` 或 `bun` | 工具所用的 shell 有不同的 `PATH`；请从该命令可用的 shell 中启动 |
| `verify` 打印 FAIL | 不要在重要代码上使用 agentic 审查；请附上输出和 `agy --version` 提交 issue |

## 11. 常见问题

**它会修改我的代码吗？**不会。静态模式做不到；agentic 模式会阻止写入，并在之后你的工作树有差异时发出警告。它从不提交、储藏或检出任何内容。

**这里 Bun 比 Node 快吗？**没有可测量的差异。在作者的 Windows 机器上，启动耗时 Node 约 56 ms、Bun 约 64 ms，守卫钩子约 60 ms 对 57 ms；一次审查要花几十秒，而这些时间都花在模型上。Bun 是文档中的默认选项；Node 18.18+ 效果相同。两者由同一份代码覆盖。

**要花钱吗？**插件免费。每次审查会消耗你的 Antigravity 配额。

**Antigravity 能看到哪些文件？**静态模式：只有脚本发送的代码（对于 `--security`，另加有边界的相关代码）。Agentic 模式：它在仓库中读取的任何内容，以及磁盘上除凭据路径外的任何位置。

**它能修复这些发现吗？**从不。由另一个智能体或你来修复；审查者只负责审查，因此保持独立。

**能审查 GitHub 拉取请求吗？**在本地检出该分支并使用 `--base`。没有 GitHub API 访问。

**为什么不在 agy 的设置里用命令白名单？**已测试：在无头模式下，agy 对多词授权按完全匹配处理（`git status` 可以，`git status --short` 不行），并且钩子的“允许”无法覆盖权限检查。钩子只能可靠地拒绝，因此 agentic 模式采用 skip-permissions 加默认拒绝的钩子，静态模式则完全不提供工具。

**我能添加允许的命令或扫描规则吗？**编辑 `guard.mjs` 中的 `CMDS` / `GIT_OK` 或 `lib/security.mjs` 中的 `RULES`，运行 `npm test`，然后执行 `--install-guard`。

## 12. 更新、卸载、开发

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

更新后请再次运行 setup（它会重新安装已更改的守卫）并运行 verify。

```bash
npm test        # 50 tests, no agy, no network (uses a fake agy in fixtures/)
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
docs/ (AGENTS.md, SECURITY-REVIEW.md, README.<lang>.md, index.html = website)   examples/   test/   fixtures/
```

欢迎提交 issue 和 pull request，尤其是：在 macOS 和 Linux 上的 `verify` 结果、可用的 Codex 沙箱设置、守卫绕过（如可能请先私下报告）以及新的扫描规则。翻译：把 `README.md` 复制为 `docs/README.<code>.md`，翻译后，在所有文件的语言切换行中加入该语言。

## 许可证

MIT，参见 [LICENSE](../LICENSE)。
