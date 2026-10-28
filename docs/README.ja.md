# agy-review

**根拠を示す、独立したレビュアー。** Google Antigravity（`agy`）によるコードレビュー、セキュリティレビュー、タスク委任、翻訳を、Claude Code、Codex、または任意のターミナルから利用できます。読み取り専用で、権限確認のプロンプトは出ず、すべての指摘は表示される前に実際のコードと照合されます。

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · **日本語** · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

ウェブサイト: https://ealireza.github.io/agy-review/ · 詳細ドキュメント（英語）: エージェントとループは [AGENTS.md](AGENTS.md)、セキュリティレビューの手法は [SECURITY-REVIEW.md](SECURITY-REVIEW.md)。

---

## 目次

1. 提供する機能
2. レポートを信頼できる理由
3. ステータス: 検証済みの項目と未検証の項目
4. 要件
5. インストール
6. 初回実行: お使いのマシンで検証する
7. 使い方: レビュー、セキュリティ、タスク、翻訳、モデル
8. エージェント、サブエージェント、ループからの利用
9. セキュリティモデル
10. トラブルシューティング
11. FAQ
12. 更新、アンインストール、開発

---

## 1. 提供する機能

| スキル（Claude Code / Codex） | コマンド（Claude Code） | 内容 |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | git の変更、ブランチ、ファイル、行範囲、単一の関数、スニペットを対象とした、重大度付きレビュー |
| `agy-security` / `security` | `/agy-review:security` | セキュリティレビュー: OWASP/CWE、悪用可能性、攻撃シナリオ、シークレットと危険なパターンのスキャナー、文脈としての呼び出し元と呼び出し先 |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | 完結した任意のタスク（書き直し、要約、下書き、抽出）を Antigravity に渡し、結果を受け取る |
| `agy-translate` / `translate` | `/agy-review:translate` | トーン、読者、用語集を指定した翻訳。コード、URL、プレースホルダー、構造が保たれているかを検証 |
| `agy-models` / `models` | `/agy-review:models` | agy で利用できるモデルの一覧表示、選択、プロジェクト単位またはグローバルでの保存、effort の設定 |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | 前提条件の確認、読み取り専用ガードのインストール、書き込みがブロックされることをお使いのマシンで実証 |

Claude Code 用サブエージェント: `agy-reviewer`、`agy-security`、`agy-worker`。すべてが 1 つのリポジトリと 1 つのスクリプト（`plugins/agy-review/scripts/agy-review.mjs`）で構成されています。サーバーはなく、ご自身の Antigravity ログイン以外のアカウントも不要です。

## 2. レポートを信頼できる理由

コードをレビューする言語モデルは、ときに存在しない問題を作り出します。このツールはモデルの言うことをそのまま信じません。

1. レビュアーは厳密な JSON レポートを返さなければなりません（`--json-schema` で強制）。各指摘には、その対象となる**正確なコード**が付きます。
2. スクリプトはその引用を実際のファイルから探します。**見つからない場合、その指摘は却下**され、別に一覧表示されます。**別の行で見つかった場合は、行番号が修正**されます。何かを証明するには短すぎる、または一般的すぎる引用（`return null;`、`}`）は却下されます。指摘された行から離れた複数の箇所に一致する引用は、曖昧として却下されます。
3. 判定、件数、CI ゲートは、検証済みの指摘のみから**スクリプトが算出**します。モデルの出力をそのままコピーすることはありません。
4. 検証済みの指摘がないことは承認を意味**しません**。指摘が却下された、モデルが同意しなかった、コードを網羅しなかった、または複数モデルのうち 1 つが失敗した場合、判定は `inconclusive`、終了コードは 4 になります。
5. 要求された行の外にある指摘にはラベルが付き、ゲートの判定には使われません。信頼度の低い指摘は一覧に載りますが、件数には含まれません。
6. 重大度（影響）と優先度（いつ修正するか）は別のものとして扱い、整合性を保ちます。critical は常に P0、nit は常に P3、スタイルに関する指摘は low を超えません。

それでも起こりうること: 引用は正しいが結論が誤っている場合です。引用が証明するのはコードが存在することであり、推論が正しいことではありません。そのため各指摘には具体的なシナリオが付いており、対応する前に引用された行を読む必要があります。

実例: 2 つのバグを仕込んだ小さなファイルに対してこのツールを実行しました（agy 経由の Claude Sonnet 4.6）。正しい行で CWE-89、CWE-78、CWE-22、CWE-369 の検証済みの指摘が 4 件、カバレッジ 100 %、重複 1 件を除外し、スキャナーも同じ 2 行を独自に検出しました。

## 3. ステータス: 検証済みの項目と未検証の項目

| 確認項目 | 結果 |
|---|---|
| 単体テストとパイプラインテスト（`npm test`）: グラウンディング、スコープ、判定、重複排除、シンボル検索、対象、設定、モデル、タスク、翻訳、セキュリティ、マスキング | 50 件のテストがすべて成功。偽の `agy` を使用（エージェントパイプライン、ツリー変更の検出、失敗するモデル、`verify` ゲートを含む） |
| ガードフック（許可・拒否されるコマンド、ツール、クォートによる回避、認証情報のパス） | 自動テスト、成功 |
| Claude Code のマニフェスト（`claude plugin validate`）、Antigravity プラグイン（`agy plugin validate --strict`） | 成功 |
| Codex 0.163.0: マーケットプレイスの追加、プラグインのインストール、スキルの検出 | Windows 11 で確認 |
| 実際の agy 1.4.8（Gemini 3.8 Flash と Claude Sonnet 4.6）に対する静的レビュー、セキュリティレビュー、タスク。Bun 1.3.14 で実行 | Windows 11 で確認。指摘は正しい行にグラウンディング |
| 設計とコードの独立した 2 件のレビュー（Opus: 指摘 25 件、Codex: 指摘 28 件）。確認された指摘は修正し、それぞれに回帰テストを追加 | 完了。changelog を参照 |
| **エージェントレビュー（`agy --dangerously-skip-permissions` と、実際の書き込みをブロックするガード）** | **作者は実行していません** |

最後の行は安全性に関わり、お使いの agy のバージョンに依存します。インストール後と agy を更新するたびに、`verify` を一度実行してください（セクション 6）。静的レビュー、シンボル/ファイル/スニペットのセキュリティレビュー、タスク、翻訳は、このフラグを使用せず、何も書き込めません。

テスト環境: agy 1.4.8、Codex CLI 0.163.0、Bun 1.3.14、Node 24、Windows 11。macOS と Linux でも動作するはずです（agy はすべてのプラットフォームで `~/.gemini/config/plugins` を使用します）が、未検証です。

## 4. 要件

これ以外は不要です。他のプラグインや他の CLI ツールは必要ありません。

| 必要なもの | 理由 | 入手方法 | 確認方法 |
|---|---|---|---|
| Antigravity CLI `agy` | 実際の処理を行う | https://antigravity.google/cli から入手し、`agy` を一度実行してサインイン | `agy --version` |
| Bun（推奨）**または** Node.js 18.18+ | スクリプトとガードフックを実行する | https://bun.sh または https://nodejs.org | `bun --version` / `node --version` |
| git | git 対象の処理と関連コードの検索 | https://git-scm.com | `git --version` |
| Claude Code **または** Codex **または** 任意のターミナル | 依頼を出す場所 | それぞれのインストールガイド | `claude --version` / `codex --version` |

すべての手順とガードフック（`bun guard.mjs || node guard.mjs`）では Bun が既定ですが、Node でも同じように動作します。Antigravity の使用量は、ご自身のクォータに計上されます。レビューには数秒から数分かかることがあります。

## 5. インストール

お使いのホストを選んでください。複数のホストで同じスクリプトとガードを共有できます。

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` は agy、git、ガードを確認し、ガードを `~/.gemini/config/plugins/readonly-review` にインストールします。`/agy-review:verify` は、実機での安全性の証明です。

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex を再起動し、普通の言葉で依頼してください。「Check my Antigravity review setup」「Review my changes with Antigravity」「Security-review the function saveUpload」「Translate README.md to German, friendly tone」など。

1. **通常のターミナルからガードを一度インストールします**（`~/.gemini/config/plugins` に書き込みます）: `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard`（Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`）。ガードが必要なのは、エージェントによる git レビューだけです。
2. **Codex のサンドボックスで agy の動作を許可する必要があります。** 外向きのネットワーク、`~/.gemini/antigravity-cli` への書き込み権限、localhost ソケットです。`workspace-write` では、おそらく `~/.codex/config.toml` に次の設定が必要です。

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   それでもブロックされる場合、スキルは不足しているアクセス権を示して停止します。権限を自動的に広げることはありません。お使いの Codex サンドボックス内で agy が正しく動作するかどうかは、Codex 向けセットアップのうち作者がテストできなかった部分です。そのため、Codex の内部からも `verify` を実行してください。

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

### 5d. Antigravity 側のみ

ガードは通常の Antigravity プラグインです。`plugins/agy-review/antigravity-plugin/readonly-review` を `~/.gemini/config/plugins/readonly-review` にコピーするか、`--install-guard` を実行してください。確認は `agy plugin list` で行います。プロンプトに `AGY_READONLY_REVIEW` が含まれていない限り何もしないため、通常の agy セッションには影響しません。対話型 agy 向けの `readonly-code-review` スキルも同梱されています。

## 6. 初回実行: お使いのマシンで検証する

インストール後と agy を更新するたびに、一度実行してください: `/agy-review:verify`、Codex の `verify` スキル、または `--verify`。使い捨てフォルダーで、小さな agy の実呼び出しを 1 回行います。ファイルの読み取り（成功する必要があります）、ファイルの書き込み、ファイルへのリダイレクト、ファイルの削除（すべてブロックされる必要があります）を試します。期待される出力:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

`FAIL` が 1 つでもあると `NOT VERIFIED` で終了し、エージェントレビューは無効のままになります。出力と `agy --version` を添えて issue を作成してください。`verify` に成功すると、このガードとこの agy のバージョンに対してのみ記録されます。**エージェントレビューは、これがなければ開始を拒否します。** agy またはガードを更新すると記録は無効になるため、更新後は再度 `verify` を実行してください。静的モードでは不要です。

## 7. 使い方

リポジトリのルートから実行してください。

### 7a. レビュー: 対象を選ぶ

| レビューしたい対象 | 使うもの | モード |
|---|---|---|
| コミットしていない作業 | なし | エージェント、読み取り専用 |
| ブランチ / ステージ済みの変更 / 1 つのコミット | `--base main` / `--staged` / `--commit <sha>`（+ `--paths a,b`） | エージェント、読み取り専用 |
| ファイルまたは範囲 | `--file src/a.kt` または `--file src/a.kt:40-80`（複数指定可） | 静的 |
| 1 つの関数またはクラス | `--symbol parseConfig`（名前が曖昧な場合は `--file` も指定） | 静的 |
| メモリ上にのみ存在するコード | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | 静的 |
| 上記のいずれかに、他のファイルを参照する許可を加える | `--agentic` を追加 | エージェント、読み取り専用 |

*静的*: スクリプト自身がコードを読み込んで行番号を付け、モデルにはツールが与えられません。そのため、何にも触れず、見せていないファイルについて何かが作り出されることもありません。*エージェント*: レビュアーがガードフックを通してリポジトリを自分で読み取ります。ガードフックはあらゆる書き込みをブロックします。

レビュアーを助けるオプション: `--context "what this code must do"`、`--focus "concurrency, error handling"`（または末尾に単語を追加）、`--context-lines N`。

出力: 既定は Markdown。機械向けには `--format json`、ファイルへは `--output file`、`--fail-on high`（検証済みの high または critical の指摘があれば終了コード 10）、`--previous old.json` は指摘を新規、継続、解消済み、再報告なしとして印を付けます。

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

`--security`（スキル `agy-security`、コマンド `/agy-review:security`、サブエージェント `agy-security`）は上記のすべての対象で動作し、次の機能が加わります。脅威モデルの手法（信頼できない入力元から危険な出力先まで、間にある制御を含む）、OWASP Top 10（2021）と CWE へのマッピング、`exploitability`（`demonstrated`、`likely`、`conditional`、`theoretical`）、`attack_scenario`、`data_flow`、シークレットと約 25 種類の危険なパターンを検出するモデル不要のスキャナー、そして**関連コード**（対象が呼び出すものと、対象を呼び出すもの）です。

- ハードコードされたシークレット（秘密鍵、AWS、GitHub、Stripe、Slack、Google）は、**モデルに何かを送る前にマスキング**され、パターンによる指摘として報告されます。
- レポート内の `cve` はモデルの主張であり、常に `cve_verified: false` と表示されます。NVD で、または `osv-scanner` / `npm audit` / `pip-audit` で確認してください。このツールは CVE を作り出すことも、検証することもありません。
- 「Claude が書いたコードを、周辺コードも含めてレビューする」: `examples/` にある既成のルールを `CLAUDE.md` または `AGENTS.md` にコピーするか、オプションの Stop フックや pre-commit フックをインストールしてください。詳細と連携レシピ: [SECURITY-REVIEW.md](SECURITY-REVIEW.md)。

### 7c. タスク: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

モデルに渡されるのは、指定したテキストのみで、ツールは与えられません。テキストモードでは回答のみを出力し、stderr にモデルと effort が報告されます。

### 7d. 翻訳: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

オプション: `--from`、`--variant`（pt-BR、zh-TW、de-CH など）、`--tone`（formal、neutral、friendly、casual、technical、marketing、literary、legal）、`--audience`、`--glossary`（JSON `{"repo":"مخزن","API":"="}` または CSV。`=` はその用語をそのまま残す）、`--keep a,b`、`--notes`、`--strict`。長いテキストは空行で分割され（コードブロックの内部では分割しません）、チャンクごとに翻訳されます。翻訳後、スクリプトはフェンス付きコード、インラインコード、URL、プレースホルダー（`{{x}}`、`${x}`、`%s`）、タグ、見出しが原文と一致するかを検証し、すべての差異を報告します（`--strict` を付けると、差異は終了コード 11 になります）。スキルは最初に、トーン、読者、用語についてお尋ねしますが、推測できないことだけを質問します。機械的なチェックでは文章の自然さを判断できないため、重要なテキストはネイティブの読者に確認してもらってください。

### 7e. モデルと effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

実行ごとの指定: `--model <id|name>`、`--models a,b`、`--effort auto|low|medium|high|xhigh|max`。優先順位: コマンドライン、プロジェクトファイル、ユーザーファイル、agy の既定値。`--effort auto`（既定）は、理由が説明される決定的な選択です。レビューでは対象範囲のコード量に応じて変わり（セキュリティのようにリスクに敏感な観点では 1 段階上がります）、タスクでは文言（機械的な変換は low、推論が重い場合は high）と入力の長さに応じて変わります。`max` が自動で選ばれることはありません。一部のモデルは `--effort` を受け付けません。その場合、ツールはモデルの既定値を使用し、その旨を伝えます。Gemini のコンテンツフィルターがプロンプトを拒否し、かつモデルを指定していなかった場合、ツールは Gemini 以外のモデルで 1 回だけ再試行し、その旨を伝えます。

### 7f. オプションと終了コード

`bun agy-review.mjs --help` ですべてを一覧できます。終了コード: `0` 正常 · `1` エラー、タイムアウト、または解析できない応答 · `2` 使い方の誤り、または前提条件の不足 · `3` エージェントレビュー中に作業ツリーが変更された · `4` 結論なし、または不完全（**合格ではありません**） · `10` `--fail-on` のゲートに失敗（レポートは有効） · `11` `--strict` で翻訳チェックに失敗。複数が該当する場合は、`3` が `10` より優先され、`10` が `4` より優先されます。`1` と `2` を除くすべての場合でレポートが書き出されるため、その中の `verdict` と `incomplete` を確認してください。クリーンな作業ツリーはエラーではありません。ツールは「No changes to review」と表示し、モデルを呼び出さずに終了コード 0 で終了します。

## 8. エージェント、サブエージェント、ループからの利用

すべてのスキルは、安定した JSON を返す単純な CLI 呼び出しなので、どのエージェントからでも使えます。Claude Code では `agy-reviewer`、`agy-security`、`agy-worker` サブエージェントを起動し、Codex ではスキルを呼び出し、その他のフレームワークからはスクリプトを直接呼び出せます。

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

レビュアーには、何を変更したかが一切伝えられないため、各ラウンドは独立したままです。完全な仕様、JSON フィールド、ループのレシピ、ファンアウトのパターン: [AGENTS.md](AGENTS.md)。

## 9. セキュリティモデル

**静的レビュー、シンボル/ファイル/スニペットのセキュリティレビュー、タスク、翻訳**では、agy を権限フラグなし、ツールなしで、空の一時フォルダー内で実行します。agy はあなたのファイルを読むことも書くこともできません。外部に出るデータは、スクリプトがプロンプトに入れたもの（認識されたシークレットはマスキング済み）だけです。

**エージェントレビュー**（git 対象、または `--agentic`）では、プロンプトで待たされないよう agy を `--dangerously-skip-permissions` 付きで起動し、すべてのツール呼び出しを検査して**既定で拒否**する `PreToolUse` ガードフック（`guard.mjs`）に頼ります。

- 許可: ファイルの閲覧と検索のツール。シェルコマンドは、単独でも連結でも、読み取り専用の `git` サブコマンド、`rg`、`grep`、`cat`、`ls`、`head`、`tail`、`wc`、`find`（`-delete`/`-exec` なし）、PowerShell の `Get-*`、`Select-String` など少数のものだけで構成される場合に限ります（一覧は `guard.mjs` にあります）。
- 拒否: すべての書き込み/編集/ノートブック/画像/スケジュール/サブエージェント/ブラウザー/Web/MCP ツールと未知のツール。リダイレクト、`$(...)`、バッククォート、スクリプトブロック、`eval` 系の構文。`git commit/push/checkout/reset/...`。インタープリターとパッケージマネージャー。`curl`、`ssh`。認証情報ストア（`.ssh`、`.aws`、`.gnupg`、秘密鍵）の読み取り。
- ガードがクラッシュした場合は拒否します。スクリプトは、ガードがインストールされていて、同梱のものと同一であり、**かつこのガードとこの agy のバージョンに対して成功した `--verify` が記録されている**場合を除き、エージェント実行の開始を拒否します。実行の前後に、`git status`、追跡済みおよびステージ済みの差分、未追跡ファイルすべての内容のフィンガープリントを取得し、何か違いがあれば警告とともに終了コード 3 で終了します。
- **エージェントモードでは、レビュアーがファイルを読む前にシークレットをマスキングすることはできません。** ツールはそれらを検出して警告し、`limitations` に一覧表示します。ローテーションするか、先にマスキングされる `--file` / `--symbol` でレビューしてください。

これが意味しないこと:

- **OS のサンドボックスではありません。** ガードはツール名とコマンド文字列をフィルタリングするだけで、agy 自身のサンドボックスはどこでも使えるわけではありません。レビュー対象のコードに仕込まれた意図的なプロンプトインジェクションが、フィルターを通過するコマンドの形を探し当てる可能性があります。実行前後のチェックで検出できるのは、変更された追跡ファイルと新しいファイルであり、読み取りは検出できません。
- **あなたのコードは Google のモデルに送信されます。** 認証情報のパスを除き、読み取りに制限はありません。リポジトリ内の `.env` ファイルは、エージェントレビューから読み取れます。共有してはならないコードはレビューしないでください。
- git は、リポジトリに設定された外部の diff プログラムや textconv プログラムを実行することがあります。信頼できるリポジトリだけをレビューしてください。
- 指摘は誤っていたり不完全だったりすることがあり、「指摘なし」は決して「安全」を意味しません。

## 10. トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| `Missing: agy CLI` | Antigravity CLI をインストールし、`agy` を一度実行してサインインしてください。プラグインを実行するシェルで `agy --version` が動作する必要があります |
| `Missing: read-only guard - missing/outdated` | セットアップを実行してください（`/agy-review:setup`、Codex の `setup` スキル、または `--install-guard`）。必要なのはエージェントレビューだけです |
| `Not inside a git repository`（終了コード 2） | リポジトリのルートに `cd` するか、`--file` / `--symbol` / `--stdin` でコードをレビューしてください |
| 判定 `inconclusive`、終了コード 4 | 合格ではありません。指摘が却下された、モデルが同意しなかった、コードを網羅しなかった、またはモデルの 1 つが失敗しました。範囲を絞る、`--context` を追加する、または別の `--model` を試してください |
| `blocked by Gemini's filters` | Gemini のセーフティフィルターが拒否しました（セキュリティ関連のプロンプトでよくあります）。`--model` がなければ、ツールは Gemini 以外のモデルで再試行します。そうでなければ `--model` で選んでください |
| `--effort is not supported for model` | 自動的に処理されます（モデルの既定値が使われ、その旨が報告されます） |
| 空のレビュー、終了コード 1 | `agy -p "say hi"` でサインインとクォータを確認してください。大きな対象では `--timeout` を増やしてください |
| 終了コード 3 / 作業ツリーが変更された | エージェントレビュー中に、何かがファイルを変更しました（エディター、ビルド、またはガードの回避）。`git status` と `git diff` を確認してください。ご自身で変更していない場合は、セキュリティ上の事象として扱ってください |
| 却下された指摘が多い | モデルが存在しないコードを引用しました。ときどき起こることで、件数には含まれません。より強力な `--model` を使うか、範囲を絞ってください |
| `--symbol`: "defined in several places" または "not found" | `--file` を指定するか、`--file path:A-B` を使ってください。検索はヒューリスティック（波括弧/インデントの対応）であり、パーサーではありません |
| Codex: "blocked by sandbox" | 5b を参照してください。ネットワーク、`~/.gemini/antigravity-cli` への書き込み、localhost ソケットを許可する必要があります |
| Windows: Claude/Codex 内で `agy` または `bun` が見つからない | ツールのシェルは `PATH` が異なります。そのコマンドが動作するシェルから起動してください |
| `verify` が FAIL を表示する | 重要なコードにエージェントレビューを使わないでください。出力と `agy --version` を添えて issue を作成してください |

## 11. FAQ

**コードを変更しますか?** いいえ。静的モードでは変更できません。エージェントモードは書き込みをブロックし、その後にツリーが異なっていれば警告します。コミット、stash、チェックアウトは一切行いません。

**ここでは Bun のほうが Node より速いですか?** 測定できる差はありません。作者の Windows マシンでは、起動時間は Node で約 56 ms、Bun で約 64 ms、ガードフックは約 60 ms 対 57 ms でした。レビューには数十秒かかり、その時間はモデルによるものです。Bun は文書上の既定ですが、Node 18.18+ でも同じように動作します。どちらも同じコードで対応しています。

**費用はかかりますか?** プラグインは無料です。各レビューはご自身の Antigravity クォータを消費します。

**Antigravity はどのファイルを見ますか?** 静的モード: スクリプトが送信するコードだけです（`--security` では、範囲を限定した関連コードが加わります）。エージェントモード: リポジトリ内で読み取ったすべてと、認証情報のパスを除くディスク上のあらゆる場所です。

**指摘を修正できますか?** 修正は一切行いません。修正するのは別のエージェントかあなたです。レビュアーはレビューするだけなので、独立性が保たれます。

**GitHub のプルリクエストをレビューできますか?** ブランチをローカルにチェックアウトして `--base` を使ってください。GitHub API へのアクセスはありません。

**agy の設定でコマンドを許可リストに入れないのはなぜですか?** テスト済みです。ヘッドレスモードでは、agy は複数語の許可を完全一致で照合し（`git status` は可、`git status --short` は不可）、フックの「許可」は権限チェックを上書きしません。フックが確実にできるのは拒否だけです。そのため、エージェントモードでは skip-permissions と既定で拒否するフックを組み合わせ、静的モードではツールをまったく与えません。

**許可するコマンドやスキャナーのルールを追加できますか?** `guard.mjs` の `CMDS` / `GIT_OK`、または `lib/security.mjs` の `RULES` を編集し、`npm test` を実行してから、`--install-guard` を実行してください。

## 12. 更新、アンインストール、開発

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

更新後は、セットアップを再度実行し（変更されたガードを再インストールします）、検証してください。

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

Issue とプルリクエストを歓迎します。特に歓迎するのは、macOS と Linux での `verify` の結果、動作する Codex サンドボックスの設定、ガードの回避方法（可能であれば最初に非公開で報告してください）、新しいスキャナールールです。翻訳: `README.md` を `docs/README.<code>.md` にコピーして翻訳し、すべての切り替え行にその言語を追加してください。

## License

MIT、[LICENSE](../LICENSE) を参照。
