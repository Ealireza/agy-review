# agy-review

**作業内容を必ず示す、独立したレビュアー。** Claude Code、Codex、または任意のターミナルから、Google Antigravity（`agy`）にコードレビュー、セキュリティレビュー、タスクの委任、翻訳を任せられます。読み取り専用で、権限確認の prompt は不要です。各 finding は、表示前に実際のコードと照合されます。

> ## NEW: graphify グラフの更新に Claude と Codex の token を使うのはやめよう
>
> **graphify の更新は、commit、merge、checkout、rebase のたびに Antigravity 上でバックグラウンド実行されるようになりました。Agent が使う token は 0。API key も不要です。**
>
> `agy-review --graphify setup` を一度実行すると、graphify の git hook が再登録されます。これにより、**グラフ更新で負荷の高い処理（ドキュメントの読み取りと、言語 model によるコミュニティ名の生成）は、Opus や Fable のセッションではなく、安価な Antigravity model が担当します。** `git commit` は一瞬で戻り、グラフは自動で追いつきます。
>
> Windows での実際の実行では、コードとドキュメントを変更した commit のグラフ更新が、**Antigravity の呼び出し 1 回、Claude または Codex の token 0 で 22 秒**で完了しました。その model ができるのは、テキストを読んでテキストで答えることだけです。ツールも、書き込み権限も、exec 権限もありません。詳細とセットアップ方法はセクション 7g を参照してください。

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · **日本語** · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

Web サイト: https://ealireza.github.io/agy-review/ · 詳細ガイド（英語）: Agent とループについては [docs/AGENTS.md](AGENTS.md)、セキュリティ手法については [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md)。

---

## 目次

1. 得られるもの
2. レポートを信頼できる理由
3. 状況: 検証済みのものと未検証のもの
4. 要件
5. インストール
6. 初回実行: 自分の環境で検証する
7. 使い方: レビュー、セキュリティ、タスク、翻訳、model、graphify
8. Agent、sub-agent、ループから使う
9. セキュリティ model
10. トラブルシューティング
11. FAQ
12. 更新（新しいバージョンの入手方法）、アンインストール、開発

---

## 1. 得られるもの

| Skill (Claude Code / Codex) | コマンド (Claude Code) | 機能 |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | git の変更、branch、ファイル、行範囲、1 つの関数、コード片を段階評価付きでレビュー |
| `agy-security` / `security` | `/agy-review:security` | セキュリティレビュー: OWASP/CWE、悪用可能性、攻撃シナリオ、機密情報と危険なパターンのスキャナー、呼び出し元と呼び出し先をコンテキストに追加 |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | 単独で完結する任意のタスク（書き直し、要約、下書き、抽出）を Antigravity に渡し、結果を取得 |
| `agy-translate` / `translate` | `/agy-review:translate` | 文体、読者、用語集を指定して翻訳し、コード、URL、プレースホルダー、構造が保たれたことを検証 |
| `agy-models` / `models` | `/agy-review:models` | agy 内の model と、それぞれが受け付ける `--effort` を一覧表示。model を選び、プロジェクト単位または全体に保存 |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **git hook を通じて Antigravity 上で graphify グラフを最新に保つ: Claude または Codex の token は 0、API key は不要** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | 前提条件を確認し、読み取り専用 guard をインストール。書き込みがブロックされることを自分の環境で証明 |

Claude Code 用の sub-agent: `agy-reviewer`、`agy-security`、`agy-worker`。すべて 1 つの repository と 1 本のスクリプト（`plugins/agy-review/scripts/agy-review.mjs`）にまとまっています。サーバーはなく、自分の Antigravity ログイン以外のアカウントも不要です。

## 2. レポートを信頼できる理由

コードをレビューする言語 model は、ときどき存在しない問題を作り出します。このツールは、model の言葉をうのみにしません。

1. レビュアーは厳密な JSON レポートを返す必要があります（`--json-schema` で強制）。各 finding には、対象となる**実際のコードそのもの**が含まれます。
2. スクリプトは、その引用を実ファイル内で検索します。**見つからなければ finding は却下**され、別に一覧表示されます。**別の行で見つかった場合は、行番号を修正**します。証拠にならないほど短い、または一般的な引用（`return null;`、`}`）は却下されます。指定行から離れた複数箇所に一致する引用も、曖昧なため却下されます。
3. 判定、件数、CI gate は、検証済みの finding だけを使って**スクリプトが計算**します。model の出力をそのまま使うことはありません。
4. 検証済みの finding が 0 件でも、承認を意味するわけでは**ありません**。finding が却下された、model 間で意見が分かれた、コードを十分に確認していない、複数 model のいずれかが失敗した場合、判定は `inconclusive`、exit code は 4 です。
5. 指定範囲外の finding にはラベルが付き、gate の判定には使われません。信頼度の低い finding は表示されますが、件数には含まれません。
6. 重大度（影響）と優先度（いつ直すか）は分けて扱い、整合性を保ちます。critical は必ず P0、nit は必ず P3、スタイル上の finding が low を超えることはありません。

それでも、正しいコードを引用しながら結論を間違える可能性はあります。引用が証明するのは、そのコードが存在することだけで、推論の正しさではありません。そのため各 finding には具体的なシナリオが付き、対応前に該当行を読むことが重要です。

実例: 意図的に 2 つのバグを入れた小さなファイルを、このツールでレビューしました（agy 経由の Claude Sonnet 4.6）。正しい行に CWE-89、CWE-78、CWE-22、CWE-369 の検証済み finding が 4 件、カバレッジは 100 %、重複 1 件は除外され、スキャナーも同じ 2 行を独立して検出しました。

## 3. 状況: 検証済みのものと未検証のもの

| 確認項目 | 結果 |
|---|---|
| Unit test とパイプラインテスト（`npm test`）: grounding、scope、verdict、dedupe、symbol finder、targets、config、models、tasks、translation、security、redaction | fake `agy` を使った 73 tests がすべて成功（agentic パイプライン、tree 変更検出、失敗する model、`verify` gate を含む） |
| Guard hook（許可・拒否されるコマンド、ツール、引用符を使った回避、認証情報のパス） | 自動テストに成功 |
| Claude Code manifest（`claude plugin validate`）、Antigravity plugin（`agy plugin validate --strict`） | 成功 |
| Codex 0.163.0: marketplace の追加、plugin のインストール、skill の検出 | Windows 11 で確認済み |
| 実際の agy 1.4.8（Gemini 3.8 Flash と Claude Sonnet 4.6）に対する静的レビュー、セキュリティレビュー、タスク。Bun 1.3.14 で実行 | Windows 11 で確認済み。finding は正しい行に対応 |
| model ごとの `--effort`: デフォルト model（low、medium、high）、名前に effort が入る model、`--effort` 非対応の Claude model | 実際の agy 1.4.8 で確認済み |
| Antigravity 上の graphify を最初から最後まで実行: Windows 上の実際の graphify 0.9.86 と agy 1.4.8。git hook がバックグラウンドでグラフを更新（22 s、Antigravity の呼び出し 1 回、`git commit` は 0.3 s で復帰）し、変更したドキュメントだけを model に送信 | 手動確認済み。fake graphify と fake agy を使ったテストでも確認済み |
| 設計とコードを 2 系統で独立レビュー（Opus: 25 findings、Codex: 28 findings）。確認できたものは、それぞれ回帰テストを追加して修正 | 完了。changelog を参照 |
| **Agentic レビュー（`agy --dangerously-skip-permissions` と、実際の書き込みをブロックする guard の組み合わせ）** | **作者は未実行** |

作者が未検証の項目: `--graphify setup --yes` を、`uv tool` で実際にインストールした graphify に対して実行すること（手動テストでは pip 版の graphify を使い、`openai` package はすでに入っていました）。agentic の項目は安全性に関わり、agy のバージョンにも依存します。インストール後と agy の更新後には、必ず `verify` を 1 回実行してください（セクション 6）。静的レビュー、symbol/file/snippet のセキュリティレビュー、タスク、翻訳では、このフラグを使わず、何も書き込めません。

agy 1.4.8、Codex CLI 0.163.0、Bun 1.3.14、Node 24、Windows 11 でテスト済みです。macOS と Linux でも動くはずですが（agy はすべてのプラットフォームで `~/.gemini/config/plugins` を使用）、未検証です。

## 4. 要件

ほかには何も要りません。別の plugin も CLI ツールも不要です。

| 必要なもの | 用途 | 入手方法 | 確認方法 |
|---|---|---|---|
| Antigravity CLI `agy` | 処理を実行 | https://antigravity.google/cli, から入手し、`agy` を一度実行してサインイン | `agy --version` |
| Bun（推奨）**または** Node.js 18.18+ | スクリプトと guard hook を実行 | https://bun.sh または https://nodejs.org | `bun --version` / `node --version` |
| git | git の対象指定と、finding に関連するコードの検索 | https://git-scm.com | `git --version` |
| Claude Code **または** Codex **または**任意のターミナル | 指示を出す場所 | それぞれのインストールガイド | `claude --version` / `codex --version` |

すべての手順と guard hook では Bun がデフォルトです（`bun guard.mjs || node guard.mjs`）。Node でもまったく同じように動きます。Antigravity の使用量は、自分の quota から消費されます。レビューには数秒から数分かかります。

## 5. インストール

利用するホストを選んでください。複数のホストで同じスクリプトと guard を共有できます。

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` は agy、git、guard を確認し、guard を `~/.gemini/config/plugins/readonly-review` にインストールします。`/agy-review:verify` は、実環境で安全性を証明します。

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex を再起動し、普通の言葉で依頼します。例: "Antigravity のレビュー設定を確認して"、"Antigravity で変更をレビューして"、"関数 saveUpload をセキュリティレビューして"、"README.md を親しみやすい文体のドイツ語に翻訳して"。

1. **通常のターミナルから guard を一度インストールします**（`~/.gemini/config/plugins` に書き込みます）: `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard`（Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`。フォルダー名はインストール済みのバージョンなので、更新後は実在するフォルダーを使ってください）。guard が必要なのは、agentic git レビューだけです。
2. **Codex の sandbox で agy が動くようにします:** 外向きのネットワーク、`~/.gemini/antigravity-cli` への書き込み、localhost socket が必要です。`workspace-write` を使う場合、通常は `~/.codex/config.toml` に次の設定が必要です。

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   それでも何かがブロックされた場合、skill は不足している権限を具体的に示して停止します。勝手に権限を広げることはありません。Codex sandbox 内で agy が正しく動くかどうかは、作者が Codex のセットアップで検証できなかった部分です。Codex 内からも `verify` を実行してください。

### 5c. 通常のターミナル

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

ヒント: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`。

### 5d. Antigravity 側だけ

guard は通常の Antigravity plugin です。`plugins/agy-review/antigravity-plugin/readonly-review` を `~/.gemini/config/plugins/readonly-review` にコピーするか、`--install-guard` を実行します。確認は `agy plugin list` で行えます。prompt に `AGY_READONLY_REVIEW` が含まれない限り何もしないため、普段の agy セッションには影響しません。対話形式の agy 用に `readonly-code-review` skill も付属します。

## 6. 初回実行: 自分の環境で検証する

インストール後と agy の更新後に一度、`/agy-review:verify`、Codex の `verify` skill、または `--verify` を実行してください。使い捨てフォルダー内で、小さな live agy 呼び出しを 1 回行います。ファイルの読み取り（成功する必要あり）、ファイルへの書き込み、ファイルへのリダイレクト、ファイルの削除（すべてブロックされる必要あり）を試します。期待される出力:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

`FAIL` が 1 つでもあると `NOT VERIFIED` で終了し、agentic レビューは無効のままです。出力と `agy --version` を添えて issue を開いてください。成功した `verify` は、その guard と agy バージョンの組み合わせに対してのみ記録されます。**記録がなければ agentic レビューは開始されません**。agy または guard を更新すると記録は無効になるため、更新後は `verify` を再実行してください。静的モードでは不要です。

## 7. 使い方

repository のルートで実行してください。

### 7a. レビュー: 対象を選ぶ

| レビューしたいもの | 指定方法 | モード |
|---|---|---|
| 未 commit の作業 | 何も指定しない | agentic、読み取り専用 |
| branch / staged 変更 / 1 つの commit | `--base main` / `--staged` / `--commit <sha>`（必要なら `--paths a,b`） | agentic、読み取り専用 |
| ファイルまたは行範囲 | `--file src/a.kt` または `--file src/a.kt:40-80`（複数指定可） | static |
| 1 つの関数またはクラス | `--symbol parseConfig`（名前が曖昧なら `--file` も指定） | static |
| メモリ上にしかないコード | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | static |
| 上記のいずれかに加え、ほかのファイルの参照も許可 | `--agentic` を追加 | agentic、読み取り専用 |

*Static*: スクリプト自身がコードを読み、行番号を付けます。model にツールは与えられないため、何も変更できず、渡されていないファイルについて作り話もできません。*Agentic*: レビュアー自身が guard hook 経由で repository を読みます。guard hook はすべての書き込みをブロックします。

レビュアーに情報を与えるには、`--context "what this code must do"`、`--focus "concurrency, error handling"`（または末尾に自由記述）、`--context-lines N` を使います。

デフォルトの出力は Markdown。機械処理向けは `--format json`、ファイル出力は `--output file`、検証済みの high または critical finding がある場合に exit 10 とするには `--fail-on high`、finding を new、persisting、resolved、not-reported-again に分類するには `--previous old.json` を使います。

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

### 7b. セキュリティレビュー

`--security`（skill `agy-security`、コマンド `/agy-review:security`、sub-agent `agy-security`）は上記のすべての対象で使え、次の情報を追加します。脅威 model の手法（信頼できない入力元から危険な出力先まで、途中の対策も含む）、OWASP Top 10 (2021) と CWE の対応、`exploitability`（`demonstrated`、`likely`、`conditional`、`theoretical`）、`attack_scenario`、`data_flow`、機密情報と約 25 種類の危険なパターンを検出する model 非依存スキャナー、さらに**関連コード**として、対象が呼び出すコードと対象を呼び出すコードです。

- ハードコードされた機密情報（private key、AWS、GitHub、Stripe、Slack、Google）は、**model に送る前に伏せ字**にし、パターン検出による finding として報告します。
- レポート内の `cve` は model の主張で、必ず `cve_verified: false` と表示されます。NVD、`osv-scanner`、`npm audit`、`pip-audit` で確認してください。このツールが CVE を作り出したり、検証したりすることはありません。
- 「Claude が書いたコードと、その周辺をレビューする」場合は、`examples/` にある既成のルールを `CLAUDE.md` または `AGENTS.md` にコピーするか、任意の Stop hook または pre-commit hook をインストールします。詳細と連鎖レシピは [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) を参照してください。

### 7c. タスク: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

model に渡るのは、指定したテキストだけです。ツールは渡りません。テキストモードでは回答だけを標準出力に出し、stderr には model と effort を出します。

### 7d. 翻訳: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

オプション: `--from`、`--variant`（pt-BR、zh-TW、de-CH ...）、`--tone`（formal、neutral、friendly、casual、technical、marketing、literary、legal）、`--audience`、`--glossary`（JSON `{"repo":"مخزن","API":"="}` または CSV。`=` は語をそのまま残す指定）、`--keep a,b`、`--notes`、`--strict`。長いテキストは空行で分割し（コードブロック内では分割しません）、まとまりごとに翻訳します。翻訳後、fenced code、inline code、URL、プレースホルダー（`{{x}}`、`${x}`、`%s`）、tag、見出しがソースと一致するか検証し、差分をすべて報告します（`--strict` を使うと差分が exit 11 になります）。skill は先に文体、読者、用語について質問し、推測できないことだけを確認します。機械的なチェックでは自然さを判断できません。重要な文章はネイティブの読者にも確認してもらってください。

### 7e. Model と effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

実行ごとの指定: `--model <id|name>`、`--models a,b`、`--effort auto|low|medium|high|xhigh|max`。優先順位は、コマンドライン、プロジェクトファイル、ユーザーファイル、agy のデフォルトです。デフォルトの `--effort auto` は、決定的な手順で理由も示して選ばれます。レビューは対象コード量に応じて調整され、セキュリティのようなリスク重視の focus なら 1 段階上がります。タスクは文面に応じて、機械的な変換なら low、推論が多ければ high になり、入力の長さも考慮されます。`max` が自動で選ばれることはありません。**effort は常に model に合わせ、推測では決めません。** `--effort` の意味は model ごとに異なります。agy のデフォルト model は `low | medium | high` に対応し、名前に effort が含まれる model（`gemini-3.8-flash-high`、`gpt-oss-120b-medium`）は `--effort` をまったく受け付けず、Claude model も非対応です。ツールは agy に model の種類を問い合わせます（約 4 秒の無料チェックで、model 呼び出しは開始しません）。結果を model と agy のバージョンごとに `~/.agy-review-cache.json` へ保存し、指定した effort を model が受け付ける最も近い値に調整します（例: `xhigh` は `high`）。レポートには実際に使った値が表示されます。agy の一覧が変わった場合は、エラーを読み、cache を修正して 1 回だけ再試行します。`--list-models` は各 model が受け付ける値を表示し、`--refresh` で再問い合わせします。model を明示していないときに Gemini のコンテンツフィルターが prompt を拒否した場合は、Gemini 以外の model で 1 回だけ再試行し、そのことを表示します。

### 7f. オプションと exit code

`bun agy-review.mjs --help` ですべての項目を確認できます。Exit codes: `0` 成功 · `1` エラー、タイムアウト、または解析不能な応答 · `2` 使用方法の誤り、または前提条件の不足 · `3` agentic レビュー中に working tree が変化 · `4` inconclusive または incomplete（**pass ではありません**） · `10` `--fail-on` gate が失敗（レポート自体は有効） · `11` `--strict` による翻訳チェックの失敗。複数に該当する場合は `3` が `10` より優先され、`10` が `4` より優先されます。`1` と `2` 以外は必ずレポートが書かれるため、その中の `verdict` と `incomplete` を確認してください。working tree が clean でもエラーではありません。ツールは "No changes to review" と表示し、model を呼ばずに exit 0 で終了します。

### 7g. Antigravity 上の graphify: グラフ更新に使う Agent token はゼロ

**[graphify](https://github.com/Graphify-Labs/graphify) を使っているなら、これはプロジェクト全体で最大の節約になります。** graphify は repository とドキュメントを knowledge graph に変換します。処理の大半は決定的なコード（tree-sitter、clustering、report、cache、merge）で、費用はかかりません。言語 model が必要なのは 2 箇所、**ドキュメントと論文からの意味抽出**と**コミュニティ名の生成**です。backend を固定しない場合、graphify は自動で 1 つ選びます。coding Agent 内では、それが coding Agent 自身（またはそのサブスクリプション）になります。そのため、ドキュメントを含むグラフ更新のたびに、Opus、Fable、Codex の token を消費します。

**`--graphify` は、この 2 つの処理だけを Antigravity に移し、ほかには一切触れません。** スクリプトは `127.0.0.1` 上で OpenAI 互換プロトコルを話す小さなローカルサーバーを起動し、`agy` で応答します。そして、**graphify のすべての LLM 処理をこのサーバーに固定**します。これにより、graphify が coding Agent や有料の API key にフォールバックすることはありません。Ollama も key も不要です。（graphify の設定ではこの枠を "ollama" と呼びますが、意味は単に「任意のローカル OpenAI 互換サーバー」です。）

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**書き込み権限や exec 権限が不要な理由。** Python とファイル書き込みが必要に見えますが、model が行うのはテキストを読み、テキストで答えることだけです。`graphify-out/` への書き込みは graphify 自身が行い、このツールは hook、lock ファイル、ログを書き込みます。サーバーの背後にいる model は、ツール、ファイル、ネットワークを一切使えません。ドキュメントに prompt injection が隠されていても、model に何かを実行させることはできません。ドキュメント内で認識された機密情報は、送信前に伏せ字になります。これにより、プロジェクトのほかの部分と同じ読み取り専用の約束を守れます。

repository ごとに一度セットアップします。

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

Claude Code または Codex では、"set up graphify updates on Antigravity" と依頼するだけです（skill `agy-graphify` / `graphify`、コマンド `/agy-review:graphify`）。graphify の環境に package を追加する前に、skill が確認を求めます。

自動で行われること:

- **Hooks:** `post-commit`、`post-merge`、`post-checkout`（branch の切り替えのみ）、`post-rewrite`（amend、rebase）が更新を**切り離して**実行するため、git コマンドは一瞬で戻ります。既存の hook ファイルの内容は保持されます。デフォルトでは、**graphify 自身の hook を置き換えます**（graphify の hook はコードだけを再構築し、この hook はそれ以上の処理を行います。2 つの書き込み元が同じグラフを更新すると競合します）。`--keep-graphify-hook` で両方を残せます。`--graphify hook-uninstall --restore-graphify` で graphify 自身の hook に戻せます。`~/.agy-review/runtime` にこのツールのコピーを置くため、plugin の更新後も hook は動き続けます。1 回だけスキップするには `AGY_GRAPHIFY_SKIP=1 git commit ...` を使います。
- **Incremental:** 何が変わったかは graphify 自身の cache が判断します。変更のないドキュメントは model に送られません。commit を 2 回続けても、更新が同時に 2 つ走ることはありません。2 回目は、もう 1 周の実行を予約します。
- **Agent が token を浪費しなくなります:** `CLAUDE.md` または `AGENTS.md` の graphify セクションが Agent にグラフの再構築を指示している場合、`--graphify rules --write-rules` は、それをしないよう伝える短いルールを追記します。既存の文章は編集せず、ファイルが存在しなければ何も作りません。
- **デフォルトで安価:** 抽出は構造化された作業なので、effort は `low` です。テストでは、同じドキュメントに対して `low` は `high` より出力 token が約 40 分の 1（685 対 29,996）で、207 秒ではなく 15 秒で完了しました。`--set graphifyEffort=...` で変更できます。model は `--set graphifyModel=<id>`（`--list-models` を参照）、並列呼び出し数は `--set graphifyConcurrency=N` で選べます。コミュニティ名の生成を省くには `--set graphifyLabels=false` を使います。

正直な制限: 更新は自分の **Antigravity quota** を使います（高価な model の代わりに安価な model を使うことが目的で、「無料」ではありません）。この経路では**画像を抽出しません**（graphify はこの backend では画像を飛ばし、agy もこの経路から画像を見られません）。コードはローカルで解析し、ドキュメントと論文のテキストは Google の model に送られます。ドキュメント抽出の品質は、選んだ model に左右されます。graphify はインストール済みである必要があり（`uv tool install graphifyy`）、graphify 自身の Python には `openai` package が必要です。`--graphify setup --yes` は `uv tool install --force "graphifyy[openai]"`（または `pipx inject graphifyy openai`）で追加します。詳細、設定、トラブルシューティングは [docs/GRAPHIFY.md](GRAPHIFY.md) を参照してください。

## 8. Agent、sub-agent、ループから使う

どの skill も、安定した JSON を返す通常の CLI 呼び出しなので、任意の Agent から使えます。Claude Code では `agy-reviewer`、`agy-security`、`agy-worker` sub-agent を起動し、Codex では skill を呼び出します。任意のフレームワークからスクリプトを直接呼ぶこともできます。

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

レビュアーには変更内容を伝えないため、各ラウンドは独立性を保ちます。完全な仕様、JSON フィールド、ループのレシピ、fan-out パターンは [docs/AGENTS.md](AGENTS.md) を参照してください。

## 9. セキュリティ model

**静的レビュー、symbol/file/snippet のセキュリティレビュー、タスク、翻訳**では、権限フラグを付けず、空の一時フォルダー内でツールなしの agy を実行します。agy はファイルを読み書きできません。外部に出るデータは、スクリプトが prompt に入れたものだけです（認識された機密情報は伏せ字になります）。

**Agentic レビュー**（git 対象、または `--agentic`）では、権限確認の prompt で待たないよう `--dangerously-skip-permissions` を付けて agy を起動し、各ツール呼び出しを検査して**デフォルトで拒否**する `PreToolUse` guard hook（`guard.mjs`）に依存します。

- 許可: ファイル表示・検索ツール。読み取り専用の `git` subcommand、`rg`、`grep`、`cat`、`ls`、`head`、`tail`、`wc`、`find`（`-delete`/`-exec` なし）、PowerShell の `Get-*`、`Select-String` など、限られたコマンドだけで構成された単独または連結 shell コマンド（一覧は `guard.mjs`）。
- 拒否: すべての書き込み/edit/notebook/image/schedule/sub-agent/browser/web/MCP ツールと未知のツール。リダイレクト、`$(...)`、backtick、スクリプトブロック、`eval` に似た構文。`git commit/push/checkout/reset/...`。インタープリターと package manager。`curl`、`ssh`。認証情報ストア（`.ssh`、`.aws`、`.gnupg`、private key）の読み取り。
- guard がクラッシュした場合も拒否します。guard がインストール済みで、同梱版と同一であり、**その guard と agy バージョンに対する `--verify` の成功記録がある**場合にだけ、スクリプトは agentic 実行を開始します。実行前後には `git status`、tracked diff、staged diff、すべての untracked ファイルの内容から fingerprint を作り、何か違えば警告とともに exit 3 で終了します。
- **agentic モードの機密情報は、レビュアーがファイルを読む前に伏せ字にできません。** ツールは検出して警告し、`limitations` に一覧表示します。該当情報を無効化するか、先に伏せ字にできる `--file` / `--symbol` でレビューしてください。

**graphify 更新**（`--graphify`）では、model にツールを一切与えません。model は `127.0.0.1` だけで待ち受けるサーバー経由でテキストを受け取ります。このサーバーは 1 回の更新中だけ存在するランダムな bearer key を要求し、外部の `Host` header を拒否します。また、権限フラグなしの `agy` を空の一時フォルダーで実行します。ディスクへの書き込みは graphify（`graphify-out/`）とこのツール（git hook、`~/.agy-review/runtime`、lock、ログ）が行います。hook は commit のたびにコードを実行します。これは graphify 自身の hook にすでに与えているのと同じ信頼です。`--graphify hook-uninstall` で削除できます。

この仕組みでは実現しないこと:

- **OS sandbox ではありません。** guard はツール名とコマンド文字列をフィルターします。agy 自身の sandbox は、どこでも使えるわけではありません。レビュー対象コードに意図的な prompt injection が隠されていると、フィルターを通るコマンド形式を探される可能性があります。前後のチェックで検出できるのは、変更された tracked ファイルと新しいファイルで、読み取りは検出できません。
- **コードは Google の model に送られます**。認証情報のパスを除き、読み取りに制限はありません。repository 内の `.env` ファイルも agentic レビューから読めます。共有できないコードはレビューしないでください。
- git は、repository で設定された外部 diff または textconv プログラムを実行できます。信頼できる repository だけをレビューしてください。
- finding は間違っていたり不完全だったりすることがあります。「finding なし」が「安全」を意味することはありません。

## 10. トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| `Missing: agy CLI` | Antigravity CLI をインストールし、`agy` を一度実行してサインインします。plugin を実行する shell で `agy --version` が動く必要があります |
| `Missing: read-only guard - missing/outdated` | setup（`/agy-review:setup`、Codex の `setup` skill、または `--install-guard`）を実行します。必要なのは agentic レビューだけです |
| `Not inside a git repository` (exit 2) | repository のルートへ `cd` するか、`--file` / `--symbol` / `--stdin` でコードをレビューします |
| Verdict `inconclusive`, exit 4 | pass ではありません。finding が却下された、model が同意しなかった、コードを十分に確認しなかった、または model の 1 つが失敗しています。範囲を狭め、`--context` を追加するか、別の `--model` を試してください |
| `blocked by Gemini's filters` | Gemini のセーフティフィルターが拒否しました（セキュリティ prompt ではよくあります）。`--model` を指定していなければ Gemini 以外の model で再試行します。指定済みなら `--model` で別の model を選んでください |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` or `conflicts with --effort` or `--effort is not supported` | 1.0.1 で修正済みです。effort は model に自動で合わせられ、実際に使った値がレポートに表示されます。まだ出る場合は `--list-models --refresh` を実行し、plugin を更新（セクション 12）して報告してください |
| graphify: `openai package ... missing` | graphify 自身の Python に `openai` package がありません。`--graphify setup --yes`、または `uv tool install --force "graphifyy[openai]"`（pipx: `pipx inject graphifyy openai`）を実行してください |
| graphify: commit 後にグラフが更新されない | `--graphify status` で hook と最後の結果を確認し、`graphify-out/.agy-update.log` を読みます。`--graphify update --debug` を一度 foreground で実行してください（各 request と reply を `graphify-out/.agy-debug/` に保存します。中にはドキュメントが含まれます）。グラフがまだない場合、hook は何もしません。`--graphify update --full` で一度構築してください |
| graphify: chunk に対して `agy returned no answer` | 次の更新で graphify がその chunk を再試行します。`agy -p "say hi"` でサインインと quota を確認するか、`--set graphifyModel=<id>` で別の model を選んでください |
| graphify が skill と package のバージョン不一致を警告する | このツールには無害です。`uv tool upgrade graphifyy` で graphify を更新してください |
| 空のレビュー、exit 1 | `agy -p "say hi"` でサインインと quota を確認します。大きな対象では `--timeout` を増やしてください |
| Exit 3 / working tree changed | agentic レビュー中に何かがファイルを変更しました（エディター、build、guard の回避など）。`git status` と `git diff` を確認してください。自分が変更していない場合は、セキュリティ上の問題として扱ってください |
| 多数の finding が却下される | model が存在しないコードを引用しています。ときどき起きますが、件数には含まれません。より強力な `--model` を使うか、対象を狭めてください |
| `--symbol`: "defined in several places" or "not found" | `--file` を指定するか、`--file path:A-B` を使います。finder は heuristic（brace/indent matching）であり、parser ではありません |
| Codex: "blocked by sandbox" | 5b を参照してください。network、`~/.gemini/antigravity-cli` への書き込み、localhost socket を許可する必要があります |
| Windows: Claude/Codex 内で `agy` または `bun` が見つからない | ツールの shell では `PATH` が異なります。そのコマンドが動く shell から起動してください |
| `verify` が FAIL を表示する | 重要なコードに agentic レビューを使わないでください。出力と `agy --version` を添えて issue を開いてください |

## 11. FAQ

**コードを変更しますか？** いいえ。static モードでは変更できず、agentic モードは書き込みをブロックし、処理後に tree が変わっていれば警告します。commit、stash、checkout は一切行いません。

**ここでは Bun のほうが Node より速いですか？** 体感できる差はありません。作者の Windows 環境では、起動時間は Node が約 56 ms、Bun が 64 ms、guard hook は約 60 ms 対 57 ms でした。レビューには数十秒かかり、その大半は model の時間です。ドキュメントでは Bun をデフォルトとしていますが、Node 18.18+ でも同じように動きます。どちらも同じコードでカバーされています。

**料金はかかりますか？** plugin は無料です。レビュー、タスク、翻訳、graphify 更新のたびに、自分の Antigravity quota を使います。

**graphify に Ollama または API key は必要ですか？** いいえ。graphify には "ollama" という名前の backend 枠があり、これは「任意のローカル OpenAI 互換サーバー」を意味します。その背後で動くのが、このツールの小さな Antigravity サーバーです。インストールが必要なのは graphify の `openai` Python package だけで、`--graphify setup --yes` が追加します。

**graphify は引き続き Claude または Codex の token を使いますか？** 自分または Agent が `/graphify --update`、`graphify extract` などを直接実行した場合、または `CLAUDE.md` / `AGENTS.md` のセクションが Agent にグラフ再構築を指示した場合だけです。`--graphify rules --write-rules` を使うと、それを止めるルールを追加できます。

**Antigravity から見えるファイルは？** Static モード: スクリプトが送るコードだけです（`--security` では範囲を制限した関連コードも含む）。Agentic モード: repository 内で読み取ったものと、認証情報のパスを除くディスク上の任意の場所です。

**finding を修正できますか？** しません。別の Agent または自分で修正します。レビュアーはレビューだけを行うため、独立性を保てます。

**GitHub pull request をレビューできますか？** branch をローカルに checkout し、`--base` を使ってください。GitHub API にはアクセスしません。

**agy の設定でコマンドを allow-list にしないのはなぜ？** テストの結果、headless モードの agy は複数語の許可を完全一致で判定します（`git status` は許可、`git status --short` は不許可）。また、hook の "allow" は権限チェックを上書きしません。hook が確実にできるのは拒否だけです。そのため agentic モードでは skip-permissions とデフォルト拒否の hook を組み合わせ、static モードではツールを一切与えません。

**許可するコマンドやスキャナールールを追加できますか？** `CMDS` / `GIT_OK`（`guard.mjs`）または `RULES`（`lib/security.mjs`）を編集し、`npm test`、`--install-guard` の順に実行してください。

## 12. 更新、アンインストール、開発

### 新しいバージョンへの更新方法

新しい release は自動では届きません。明示的に更新します。手順は 4 つです。

**1. 現在のバージョンと、新しいバージョンの有無を確認する**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

https://github.com/Ealireza/agy-review/releases の release 一覧と [changelog](../CHANGELOG.md) も確認できます。

**2. 利用するホストの plugin を更新する**

| ホスト | コマンド（通常のターミナルで実行） | その後 |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` and then `claude plugin update agy-review@agy-review` | Claude Code を再起動 |
| Codex | `codex plugin marketplace upgrade agy-review` and then `codex plugin remove agy-review@agy-review` and `codex plugin add agy-review@agy-review` | Codex を再起動 |
| 通常の clone | clone 内で `git pull` | 何もしない |

**3. plugin フォルダー外にある部分を更新する**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. 正しく更新できたか確認する:** `--version` が新しい番号を示し、`--check` がすべてに OK を返し、`--list-models --refresh` が各 model の対応 `--effort` を読み直せば完了です。

更新後に問題が起きた場合は、`--check` を実行し、トラブルシューティング表（セクション 10）を確認してください。以前のバージョンに戻す必要がある場合は、plugin を削除し、`git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. で特定の release をインストールします。設定（`.agy-review.json`）は通常のファイルで、更新時に変更されません。

### アンインストール

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

何も残したくない場合は、`~/.agy-review`（runtime コピー）と `~/.agy-review-cache.json`（effort cache）を削除してください。

### 開発

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

issue と pull request を歓迎します。特に求めているのは、macOS と Linux での `verify` 結果、動作する Codex sandbox 設定、guard の回避方法（可能なら先に非公開で報告してください）、新しいスキャナールールです。翻訳では `README.md` を `docs/README.<code>.md` にコピーして翻訳し、すべての言語切り替え行にその言語を追加してください。

## License

MIT。詳しくは [LICENSE](../LICENSE) を参照してください。
