# agy-review

**자신이 한 일을 직접 증명하는 독립 리뷰어입니다.** Claude Code, Codex 또는 어떤 터미널에서든 Google Antigravity(`agy`)로 코드 리뷰, 보안 리뷰, 작업 위임, 번역을 수행합니다. 읽기 전용이고 권한을 묻는 prompt가 없으며, 모든 발견 사항은 표시되기 전에 실제 코드와 대조됩니다.

> ## 새 기능: graphify 그래프를 갱신하는 데 Claude와 Codex token을 쓰지 마세요
>
> **이제 graphify 업데이트는 commit, merge, checkout, rebase 때마다 Antigravity에서 백그라운드로 실행됩니다. Agent는 여기에 token 0개를 쓰며 API key도 필요 없습니다.**
>
> `agy-review --graphify setup` 명령 하나면 graphify의 git hook을 다시 등록합니다. 그러면 **그래프를 업데이트할 때 비용이 많이 드는 부분(문서를 읽고 언어 model로 커뮤니티 이름을 짓는 작업)을 Opus나 Fable 세션 대신 저렴한 Antigravity model이 처리합니다.** `git commit`은 순식간에 끝나고 그래프는 알아서 최신 상태를 따라갑니다.
>
> Windows에서 실제로 실행했을 때, 코드와 문서 하나가 바뀐 commit의 그래프를 **22초 만에 Antigravity 호출 한 번과 Claude 또는 Codex token 0개로 업데이트했습니다.** 이 작업의 model은 텍스트를 읽고 텍스트로 답할 수만 있습니다. 도구도 없고 쓰기 또는 실행 권한도 없습니다. 자세한 설명과 설정 방법은 7g 절을 참고하세요.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · **한국어** · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

웹사이트: https://ealireza.github.io/agy-review/ · 상세 문서(영어): Agent와 반복 실행은 [docs/AGENTS.md](AGENTS.md), 보안 검토 방식은 [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md)를 참고하세요.

---

## 목차

1. 제공 기능
2. 보고서를 신뢰할 수 있는 이유
3. 상태: 검증된 것과 검증되지 않은 것
4. 요구 사항
5. 설치
6. 첫 실행: 내 환경에서 검증하기
7. 사용법: 리뷰, 보안, 작업, 번역, model, graphify
8. Agent, sub-agent, 반복 작업에서 사용하기
9. 보안 model
10. 문제 해결
11. 자주 묻는 질문
12. 업데이트(새 버전 받기), 제거, 개발

---

## 1. 제공 기능

| Skill (Claude Code / Codex) | 명령 (Claude Code) | 하는 일 |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | git 변경 사항, branch, 파일, 줄 범위, 함수 하나 또는 코드 조각을 등급별로 리뷰 |
| `agy-security` / `security` | `/agy-review:security` | 보안 리뷰: OWASP/CWE, 악용 가능성, 공격 시나리오, secret 및 위험 패턴 스캐너, 호출자와 피호출자를 맥락으로 제공 |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | 독립적으로 처리할 수 있는 작업(다시 쓰기, 요약, 초안, 추출)을 Antigravity에 맡기고 결과 받기 |
| `agy-translate` / `translate` | `/agy-review:translate` | 어조, 독자, 용어집을 반영해 번역하고 코드, URL, placeholder, 구조가 유지됐는지 검증 |
| `agy-models` / `models` | `/agy-review:models` | agy에 있는 model과 각 model이 허용하는 `--effort`를 확인하고 하나를 골라 프로젝트 또는 전역 설정에 저장 |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **git hook을 통해 Antigravity에서 graphify 그래프를 최신 상태로 유지: Claude 또는 Codex token 0개, API key 불필요** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | 필수 항목을 확인하고 읽기 전용 guard를 설치한 뒤, 실제 환경에서 쓰기가 차단되는지 증명 |

Claude Code용 sub-agent는 `agy-reviewer`, `agy-security`, `agy-worker`입니다. 모든 기능은 하나의 repository와 하나의 스크립트(`plugins/agy-review/scripts/agy-review.mjs`)에 들어 있습니다. 서버는 없으며, 본인의 Antigravity 로그인 외에 다른 계정도 필요 없습니다.

## 2. 보고서를 신뢰할 수 있는 이유

언어 model이 코드를 리뷰하면 가끔 존재하지 않는 문제를 지어냅니다. 이 도구는 model의 말을 그대로 믿지 않습니다.

1. 리뷰어는 엄격한 JSON 보고서를 반환해야 합니다(`--json-schema`로 강제). 각 발견 사항에는 대상이 된 **정확한 코드**가 들어갑니다.
2. 스크립트는 그 인용문을 실제 파일에서 찾습니다. **찾지 못하면 발견 사항을 거부**하고 별도로 표시합니다. **다른 줄에서 찾으면 줄 번호를 바로잡습니다.** 증거가 되기엔 너무 짧거나 일반적인 인용문(`return null;`, `}`)은 거부합니다. 인용한 줄에서 멀리 떨어진 여러 위치에 같은 내용이 있으면 모호한 것으로 보고 거부합니다.
3. 판정, 개수, CI gate는 model에서 복사하지 않고, **검증된 발견 사항만으로 스크립트가 계산**합니다.
4. 검증된 내용이 없다고 해서 **승인된 것은 아닙니다**. 발견 사항이 거부됐거나, model끼리 의견이 다르거나, 코드를 충분히 다루지 않았거나, 여러 model 중 하나라도 실패하면 판정은 `inconclusive`이고 exit code는 4입니다.
5. 요청한 줄 밖의 발견 사항에는 별도 표시가 붙고 gate에 영향을 주지 않습니다. 신뢰도가 낮은 발견 사항은 목록에는 나오지만 개수에는 포함되지 않습니다.
6. 심각도(영향)와 우선순위(언제 고칠지)는 따로 관리하면서 일관성을 유지합니다. critical은 항상 P0, nit은 항상 P3이며, 스타일 관련 발견 사항은 low보다 높을 수 없습니다.

여전히 가능한 오류가 있습니다. 인용한 코드는 맞지만 결론이 틀릴 수 있습니다. 인용문은 코드의 존재만 증명할 뿐 추론이 맞다는 뜻은 아닙니다. 그래서 각 발견 사항에 구체적인 시나리오가 있으며, 조치하기 전에 인용된 줄을 직접 읽어야 합니다.

실제 예시: 의도적으로 버그 두 개를 심은 작은 파일을 이 도구로 리뷰했습니다(agy를 통한 Claude Sonnet 4.6). 올바른 줄에서 발견 사항 4개를 검증했습니다(CWE-89, CWE-78, CWE-22, CWE-369). 범위는 100 %였으며, 중복 하나를 제거했고, 스캐너도 같은 두 줄을 독립적으로 찾아냈습니다.

## 3. 상태: 검증된 것과 검증되지 않은 것

| 확인 항목 | 결과 |
|---|---|
| 단위 및 pipeline 테스트(`npm test`): 근거 확인, 범위, 판정, 중복 제거, symbol finder, 대상, 설정, model, 작업, 번역, 보안, redaction | 가짜 `agy`를 사용한 72개 테스트 모두 통과(agentic pipeline, 작업 트리 변경 감지, 실패하는 model, `verify` gate 포함) |
| Guard hook(허용/거부 명령, 도구, 인용문 우회, 인증 정보 경로) | 자동화 테스트 통과 |
| Claude Code manifest(`claude plugin validate`), Antigravity plugin(`agy plugin validate --strict`) | 통과 |
| Codex 0.163.0: marketplace 추가, plugin 설치, skill 검색 | Windows 11에서 확인 |
| 실제 agy 1.4.8(Gemini 3.8 Flash와 Claude Sonnet 4.6)을 대상으로 한 정적 리뷰, 보안 리뷰, 작업을 Bun 1.3.14로 실행 | Windows 11에서 확인, 발견 사항의 근거가 올바른 줄에 있음 |
| model별 `--effort`: 기본 model(low, medium, high), 이름에 effort가 포함된 model, `--effort`가 없는 Claude model | 실제 agy 1.4.8에서 확인 |
| Antigravity의 graphify 전체 흐름: Windows에서 실제 graphify 0.9.86과 실제 agy 1.4.8 사용. git hook이 백그라운드에서 그래프를 업데이트(22 s, Antigravity 호출 1회, `git commit`은 0.3 s 만에 반환)했고, 변경된 문서만 model에 전송 | 수동 확인 및 가짜 graphify와 가짜 agy를 사용한 테스트 완료 |
| 설계와 코드에 대한 독립 리뷰 두 차례(Opus: 발견 사항 25개, Codex: 28개), 확인된 항목은 각각 회귀 테스트와 함께 수정 | 완료, changelog 참고 |
| **Agentic 리뷰(`agy --dangerously-skip-permissions`와 실제 쓰기를 막는 guard)** | **작성자가 실행하지 않음** |

작성자가 테스트하지 않은 항목: `--graphify setup --yes`를 실제 `uv tool`로 설치한 graphify에서 실행(수동 테스트는 이미 `openai` package가 있던 pip 설치 graphify를 사용). agentic 항목은 안전에 중요하고 agy 버전에 따라 달라지므로, 설치 후와 agy를 업데이트할 때마다 `verify`를 한 번 실행하세요(6절). 정적 리뷰, symbol/파일/코드 조각의 보안 리뷰, 작업, 번역에서는 이 flag를 사용하지 않으며 아무것도 쓸 수 없습니다.

agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14, Node 24, Windows 11에서 테스트했습니다. macOS와 Linux에서도 작동할 것으로 보이지만(agy는 모든 플랫폼에서 `~/.gemini/config/plugins` 사용), 테스트하지 않았습니다.

## 4. 요구 사항

이외에는 아무것도 필요하지 않습니다. 다른 plugin이나 CLI 도구는 필요 없습니다.

| 필요한 항목 | 필요한 이유 | 설치 방법 | 확인 방법 |
|---|---|---|---|
| Antigravity CLI `agy` | 실제 작업 수행 | https://antigravity.google/cli, 여기에서 설치한 뒤 `agy`를 한 번 실행하고 로그인 | `agy --version` |
| Bun(권장) **또는** Node.js 18.18+ | 스크립트와 guard hook 실행 | https://bun.sh 또는 https://nodejs.org | `bun --version` / `node --version` |
| git | git 대상과 발견 사항 관련 코드 처리 | https://git-scm.com | `git --version` |
| Claude Code **또는** Codex **또는** 아무 터미널 | 요청을 입력할 환경 | 각 설치 안내서 | `claude --version` / `codex --version` |

모든 안내와 guard hook에서는 Bun이 기본입니다(`bun guard.mjs || node guard.mjs`). Node도 똑같이 작동합니다. Antigravity 사용량은 본인의 quota에서 차감됩니다. 리뷰에는 몇 초에서 몇 분까지 걸릴 수 있습니다.

## 5. 설치

사용하는 host를 고르세요. 여러 host가 같은 스크립트와 guard를 함께 사용할 수 있습니다.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup`은 agy, git, guard를 확인하고 `~/.gemini/config/plugins/readonly-review`에 guard를 설치합니다. `/agy-review:verify`는 실제 환경에서 안전을 증명합니다.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex를 다시 시작한 뒤 평범한 문장으로 요청하세요. "Check my Antigravity review setup", "Review my changes with Antigravity", "Security-review the function saveUpload", "Translate README.md to German, friendly tone".

1. **일반 터미널에서 guard를 한 번 설치하세요**(`~/.gemini/config/plugins`에 씁니다): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; 폴더 이름은 설치된 버전이므로 업데이트 후에는 실제로 존재하는 폴더를 사용하세요). agentic git 리뷰에서만 guard가 필요합니다.
2. **Codex의 sandbox에서 agy가 작동할 수 있어야 합니다:** 외부 network, `~/.gemini/antigravity-cli` 쓰기 권한, localhost socket이 필요합니다. `workspace-write`에서는 보통 `~/.codex/config.toml`에 다음 설정이 필요합니다.

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   여전히 차단되는 항목이 있으면 skill이 부족한 권한을 정확히 알려 주고 중단합니다. 알아서 권한을 넓히지 않습니다. 작성자가 테스트하지 못한 부분은 Codex sandbox 안에서 agy가 제대로 실행되는지 여부이므로 Codex 안에서도 `verify`를 실행하세요.

### 5c. 일반 터미널

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

팁: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Antigravity 쪽만 설치

guard는 일반 Antigravity plugin입니다. `plugins/agy-review/antigravity-plugin/readonly-review`를 `~/.gemini/config/plugins/readonly-review`로 복사하거나 `--install-guard`를 실행한 뒤 `agy plugin list`로 확인하세요. prompt에 `AGY_READONLY_REVIEW`가 없으면 아무 일도 하지 않으므로 평소 agy 세션은 달라지지 않습니다. 대화형 agy를 위한 `readonly-code-review` skill도 함께 제공합니다.

## 6. 첫 실행: 내 환경에서 검증하기

설치 후와 agy를 업데이트할 때마다 `/agy-review:verify`, Codex의 `verify` skill 또는 `--verify`를 한 번 실행하세요. 임시 폴더에서 작은 agy 호출 하나를 실제로 수행합니다. 파일 읽기는 성공해야 하고, 파일 쓰기, 파일로 redirect, 파일 삭제는 모두 차단되어야 합니다. 예상 결과는 다음과 같습니다.

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

`FAIL`이 하나라도 있으면 마지막에 `NOT VERIFIED`가 표시되고 agentic 리뷰는 비활성화됩니다. 출력과 `agy --version`을 첨부해 issue를 등록하세요. 통과한 `verify` 결과는 해당 guard와 해당 agy 버전에만 유효합니다. **이 결과가 없으면 agentic 리뷰가 시작되지 않으며**, agy나 guard가 업데이트되면 무효가 되므로 다시 `verify`를 실행하세요. 정적 모드에는 필요 없습니다.

## 7. 사용법

repository 루트에서 실행하세요.

### 7a. 리뷰: 대상 선택

| 리뷰하려는 대상 | 사용 방법 | 모드 |
|---|---|---|
| commit하지 않은 작업 | 아무것도 지정하지 않음 | agentic, 읽기 전용 |
| branch / staged 변경 / commit 하나 | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, 읽기 전용 |
| 파일 또는 줄 범위 | `--file src/a.kt` 또는 `--file src/a.kt:40-80` (여러 번 지정 가능) | 정적 |
| 함수 또는 클래스 하나 | `--symbol parseConfig` (이름이 모호하면 `--file` 추가) | 정적 |
| 메모리에만 있는 코드 | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | 정적 |
| 위 대상 중 하나와 다른 파일을 볼 권한 | `--agentic` 추가 | agentic, 읽기 전용 |

*정적*: 스크립트가 직접 코드를 읽고 줄 번호를 붙이며, model에는 도구가 없습니다. 따라서 어떤 것도 건드릴 수 없고, 보지 않은 파일에 대한 내용을 지어낼 수도 없습니다. *Agentic*: 리뷰어가 모든 쓰기를 막는 guard hook을 통해 repository를 직접 읽습니다.

리뷰어에게 도움을 주려면 `--context "what this code must do"`, `--focus "concurrency, error handling"`(또는 뒤에 일반 문장), `--context-lines N`을 사용하세요.

기본 출력은 Markdown입니다. 기계 처리용은 `--format json`, 파일 출력은 `--output file`, 검증된 high 또는 critical 발견 사항이 있을 때 exit 10을 내보내려면 `--fail-on high`, 발견 사항을 신규/지속/해결/재보고되지 않음으로 표시하려면 `--previous old.json`을 사용하세요.

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

### 7b. 보안 리뷰

`--security`(skill `agy-security`, 명령 `/agy-review:security`, sub-agent `agy-security`)는 위의 모든 대상에서 작동하며 다음을 추가합니다. 위협 model 방식(신뢰할 수 없는 source부터 위험한 sink까지 중간 control 포함), OWASP Top 10(2021) 및 CWE mapping, `exploitability`(`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, model 없이 작동하는 secret 및 약 25개 위험 패턴 scanner, 그리고 대상이 호출하는 코드와 대상을 호출하는 코드를 보여 주는 **관련 코드**입니다.

- 하드코딩된 secret(private key, AWS, GitHub, Stripe, Slack, Google)은 **model로 보내기 전에 가려지며**, 패턴에 따른 발견 사항으로 보고됩니다.
- 보고서의 `cve`는 model의 주장이고 항상 `cve_verified: false`로 표시됩니다. NVD 또는 `osv-scanner` / `npm audit` / `pip-audit`로 확인하세요. 이 도구는 CVE를 지어내거나 검증하지 않습니다.
- "Claude가 작성한 코드와 주변 코드를 리뷰해 줘": `examples/`에 준비된 규칙을 `CLAUDE.md` 또는 `AGENTS.md`에 복사하거나 선택 사항인 Stop hook 또는 pre-commit hook을 설치하세요. 자세한 설명과 연결 방법은 [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md)를 참고하세요.

### 7c. 작업: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

model에는 전달한 텍스트만 주어지고 도구는 없습니다. 텍스트 모드에서는 답만 출력하고, stderr에는 model과 effort가 표시됩니다.

### 7d. 번역: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

옵션: `--from`, `--variant`(pt-BR, zh-TW, de-CH ...), `--tone`(formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary`(JSON `{"repo":"مخزن","API":"="}` 또는 CSV, `=`는 용어 유지), `--keep a,b`, `--notes`, `--strict`. 긴 텍스트는 빈 줄을 기준으로 나눠서(코드 블록 안에서는 나누지 않음) 덩어리별로 번역합니다. 번역 후에는 fenced code, inline code, URL, placeholder(`{{x}}`, `${x}`, `%s`), tag, heading이 원문과 같은지 확인하고 차이를 모두 보고합니다(`--strict`에서는 차이가 있으면 exit 11). skill은 먼저 어조, 독자, 용어를 물어보되 추론할 수 없는 것만 질문합니다. 자동 검사는 자연스러움을 판단할 수 없으므로 중요한 글은 원어민에게 확인받으세요.

### 7e. Model과 effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

실행별 설정: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. 우선순위는 명령줄, 프로젝트 파일, 사용자 파일, agy 기본값 순입니다. `--effort auto`(기본값)는 근거가 명확한 결정론적 선택입니다. 리뷰는 범위에 포함된 코드 양에 따라 조정되고(보안처럼 위험에 민감한 초점이면 한 단계 추가), 작업은 문구(기계적 변환은 low, 추론이 많은 작업은 high)와 입력 길이에 따라 조정되며, `max`는 자동으로 선택되지 않습니다. **effort는 항상 model에 맞춰지고 추측하지 않습니다.** model마다 `--effort`의 의미가 다릅니다. agy의 기본 model은 `low | medium | high`를 제공하고, 이름에 effort가 들어간 model(`gemini-3.8-flash-high`, `gpt-oss-120b-medium`)은 `--effort`를 전혀 받지 않으며, Claude model은 이를 지원하지 않습니다. 도구는 agy에 model 유형을 묻고(model 호출을 시작하지 않는 무료 확인이며 약 4초 소요), model 및 agy 버전별 답을 `~/.agy-review-cache.json`에 기억합니다. 지정한 effort를 model이 허용하는 가장 가까운 값으로 조정하고(예: `xhigh`는 `high`가 됨) 실제 사용한 값을 보고서에 표시합니다. agy 목록이 바뀌면 오류를 읽어 cache를 고치고 한 번 다시 시도합니다. `--list-models`는 각 model이 허용하는 값을 보여 주며(`--refresh`를 사용하면 다시 확인), Gemini의 콘텐츠 필터가 prompt를 거부했는데 model을 직접 지정하지 않았다면 Gemini가 아닌 model로 한 번 다시 시도하고 그 사실을 알립니다.

### 7f. 옵션과 exit code

`bun agy-review.mjs --help`에 모든 옵션이 나옵니다. Exit code: `0` 정상 · `1` 오류, timeout 또는 parsing할 수 없는 응답 · `2` 사용 오류 또는 필수 항목 누락 · `3` agentic 리뷰 중 작업 트리 변경 · `4` inconclusive 또는 불완전(**통과가 아님**) · `10` `--fail-on` gate 실패(보고서는 유효) · `11` `--strict`를 사용한 번역 검사 실패. 여러 조건이 겹치면 `3`이 `10`보다 우선하고 `10`이 `4`보다 우선합니다. `1`과 `2`를 제외한 모든 경우에 보고서가 작성되므로 `verdict`와 `incomplete`를 확인하세요. 깨끗한 작업 트리는 오류가 아닙니다. 도구는 "No changes to review"를 출력하고 model을 호출하지 않은 채 exit 0으로 끝납니다.

### 7g. Antigravity의 graphify: 그래프 업데이트에 Agent token 0개

**[graphify](https://github.com/Graphify-Labs/graphify)를 사용한다면 이 기능이 프로젝트 전체에서 가장 큰 비용을 아껴 줍니다.** graphify는 repository와 문서를 지식 그래프로 바꿉니다. 대부분은 결정론적 코드(tree-sitter, clustering, report, cache, merge)로 처리되어 비용이 들지 않습니다. 언어 model이 필요한 단계는 두 가지뿐입니다. **문서와 논문에서 의미를 추출하는 작업**, 그리고 **커뮤니티 이름 짓기**입니다. backend를 고정하지 않으면 graphify가 직접 선택하며, coding Agent 안에서는 그 coding Agent(또는 구독)가 선택됩니다. 따라서 문서가 포함된 그래프를 새로 고칠 때마다 Opus, Fable 또는 Codex token을 쓰게 됩니다.

**`--graphify`는 정확히 이 두 단계만 Antigravity로 옮기고 나머지는 그대로 둡니다.** 스크립트는 `127.0.0.1`에서 OpenAI 호환 protocol을 사용하고 `agy`로 응답하는 작은 로컬 서버를 시작한 뒤, **graphify의 모든 LLM 단계를 그 서버에 고정**합니다. 따라서 coding Agent나 유료 API key로 fallback할 수 없습니다. Ollama나 다른 key도 필요 없습니다. (graphify 설정에서 이 slot을 "ollama"라고 부르지만, 이는 "로컬 OpenAI 호환 서버"라는 뜻일 뿐입니다.)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**쓰기나 실행 권한이 필요 없는 이유.** Python 실행과 파일 쓰기가 필요할 것 같지만, model은 텍스트를 읽고 텍스트로 답하기만 하면 됩니다. graphify가 직접 `graphify-out/`에 쓰고, 이 도구는 hook, lock 파일, log를 씁니다. 서버 뒤의 model은 도구, 파일, network에 접근할 수 없으므로 문서 속 prompt injection이 어떤 행동도 시킬 수 없습니다. 문서에서 인식된 secret은 전송 전에 가려집니다. 덕분에 프로젝트의 나머지 기능과 같은 읽기 전용 약속을 지킬 수 있습니다.

repository마다 한 번 설정하세요.

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

Claude Code나 Codex에서는 "set up graphify updates on Antigravity"라고 요청하면 됩니다(skill `agy-graphify` / `graphify`, 명령 `/agy-review:graphify`). skill은 graphify 환경에 package를 추가하기 전에 확인을 받습니다.

자동으로 처리되는 내용:

- **Hook:** `post-commit`, `post-merge`, `post-checkout`(branch 전환만), `post-rewrite`(amend, rebase)가 업데이트를 **분리된 프로세스에서** 실행하므로 git 명령은 순식간에 끝납니다. 기존 hook 파일 내용은 유지됩니다. 기본적으로 **graphify 자체 hook은 교체됩니다**(그 hook은 코드만 다시 빌드하고 이 도구는 같은 작업에 더 많은 일을 하므로, 두 writer가 그래프 하나를 동시에 쓰면 충돌합니다). `--keep-graphify-hook`을 사용하면 둘 다 유지하고, `--graphify hook-uninstall --restore-graphify`를 사용하면 graphify 자체 hook을 되돌립니다. 이 도구의 복사본이 `~/.agy-review/runtime`에 있어 plugin을 업데이트해도 hook이 유지됩니다. 한 번 건너뛰려면 `AGY_GRAPHIFY_SKIP=1 git commit ...`을 사용하세요.
- **증분 처리:** graphify의 cache가 무엇이 바뀌었는지 판단하며, 변경되지 않은 문서는 model에 전송하지 않습니다. commit 두 개가 연달아 생겨도 업데이트 두 개를 동시에 실행하지 않습니다. 두 번째 작업은 한 번 더 실행하도록 요청합니다.
- **Agent가 더 이상 token을 낭비하지 않음:** `CLAUDE.md` 또는 `AGENTS.md`의 graphify 절에 그래프를 다시 빌드하라는 지시가 있으면 `--graphify rules --write-rules`가 Agent에게 그러지 말라는 짧은 규칙을 추가합니다(기존 텍스트는 수정하지 않으며 파일이 없으면 아무것도 만들지 않음).
- **기본값부터 저렴함:** 추출은 구조화된 작업이므로 effort는 `low`입니다. 테스트에서는 같은 문서에 `low`를 사용했을 때 `high`보다 출력 token이 약 40배 적었고(685 대 29,996), 15초 만에 끝났습니다. 반면 high는 207초가 걸렸습니다. `--set graphifyEffort=...`로 바꾸고, `--set graphifyModel=<id>`로 model을 고르고(`--list-models` 참고), `--set graphifyConcurrency=N`으로 병렬 호출 수를 정하고, `--set graphifyLabels=false`로 커뮤니티 이름 짓기를 건너뛸 수 있습니다.

솔직한 한계: 업데이트는 **Antigravity quota**를 사용합니다(무료라는 뜻이 아니라 비싼 model 대신 저렴한 model을 쓰는 것이 목적). 이 경로에서는 **이미지를 추출하지 않습니다**(graphify가 이 backend에서 이미지를 건너뛰며 agy도 이 경로로 이미지를 볼 수 없음). 코드는 로컬에서 parsing하고, 문서와 논문은 텍스트로 Google model에 전송합니다. 문서 추출 품질은 선택한 model에 따라 달라집니다. graphify가 설치되어 있어야 하며(`uv tool install graphifyy`), graphify 자체 Python에 `openai` package가 필요합니다. `--graphify setup --yes`는 `uv tool install --force "graphifyy[openai]"`로 이를 추가합니다(또는 `pipx inject graphifyy openai`). 자세한 설명, 설정, 문제 해결은 [docs/GRAPHIFY.md](GRAPHIFY.md)를 참고하세요.

## 8. Agent, sub-agent, 반복 작업에서 사용하기

모든 skill은 안정적인 JSON을 제공하는 평범한 CLI 호출이므로 어떤 Agent에서도 사용할 수 있습니다. Claude Code에서 `agy-reviewer`, `agy-security`, `agy-worker` sub-agent를 만들거나, Codex에서 skill을 호출하거나, 어떤 framework에서든 스크립트를 호출하세요.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

리뷰어에게 변경한 내용을 알려 주지 않으므로 각 반복은 독립성을 유지합니다. 전체 계약, JSON 필드, 반복 실행 방법, fan-out 패턴은 [docs/AGENTS.md](AGENTS.md)를 참고하세요.

## 9. 보안 model

**정적 리뷰, symbol/파일/코드 조각의 보안 리뷰, 작업, 번역**은 권한 flag나 도구 없이 빈 임시 폴더에서 agy를 실행합니다. agy는 파일을 읽거나 쓸 수 없고, 외부로 나가는 데이터는 스크립트가 prompt에 넣은 내용뿐입니다(인식된 secret은 가려짐).

**Agentic 리뷰**(git 대상 또는 `--agentic`)는 권한 prompt를 기다리지 않도록 `--dangerously-skip-permissions`로 agy를 시작하고, 모든 도구 호출을 검사해 **기본적으로 거부**하는 `PreToolUse` guard hook(`guard.mjs`)에 의존합니다.

- 허용: 파일 보기 및 검색 도구. 읽기 전용 `git` 하위 명령, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find`(`-delete`/`-exec` 제외), PowerShell `Get-*`, `Select-String`과 몇 가지 도구만으로 구성된 단일 또는 연결 shell 명령(전체 목록은 `guard.mjs`에 있음)
- 거부: 모든 쓰기/편집/notebook/이미지/schedule/sub-agent/browser/web/MCP 도구와 알 수 없는 도구, redirect, `$(...)`, backtick, 스크립트 블록, `eval`류 구성, `git commit/push/checkout/reset/...`, interpreter와 package manager, `curl`, `ssh`, 인증 정보 저장소(`.ssh`, `.aws`, `.gnupg`, private key) 읽기
- guard가 crash하면 거부합니다. 설치된 guard가 번들된 것과 동일하고, **해당 guard와 agy 버전으로 통과한 `--verify` 결과가 기록되어 있지 않으면** 스크립트는 agentic 실행을 시작하지 않습니다. 실행 전후에 `git status`, tracked 및 staged diff, 모든 untracked 파일의 내용을 fingerprint하고, 하나라도 달라지면 경고와 함께 exit 3으로 끝납니다.
- **agentic 모드에서는 리뷰어가 파일을 읽기 전에 secret을 가릴 수 없습니다.** 도구는 이를 감지해 경고하고 `limitations`에 나열합니다. secret을 교체하거나, 먼저 가려 주는 `--file` / `--symbol`을 사용해 리뷰하세요.

**graphify 업데이트**(`--graphify`)에서는 model에 도구를 전혀 주지 않습니다. model은 `127.0.0.1`에서만 listen하는 서버를 통해 텍스트를 받고, 이 서버는 업데이트 한 번 동안만 존재하는 무작위 bearer key를 요구하고 외부 `Host` header를 거부하며 권한 flag 없이 빈 임시 폴더에서 `agy`를 실행합니다. 디스크에는 graphify가 자체 파일(`graphify-out/`)을 쓰고 이 도구가 git hook, `~/.agy-review/runtime`, lock, log를 씁니다. hook은 commit할 때마다 코드를 실행합니다. 이는 graphify 자체 hook에도 이미 부여한 신뢰와 같으며 `--graphify hook-uninstall`로 제거할 수 있습니다.

다음 기능은 제공하지 않습니다.

- **OS sandbox가 아닙니다.** guard는 도구 이름과 명령 텍스트를 거릅니다. agy 자체 sandbox는 모든 환경에서 사용할 수 없습니다. 리뷰 대상 코드에 의도적으로 숨긴 prompt injection이 필터가 허용하는 명령 형태를 찾을 수도 있습니다. 전후 검사는 수정된 tracked 파일과 새 파일을 감지하지만 읽기는 감지하지 못합니다.
- **코드는 Google model로 전송됩니다.** 인증 정보 경로를 제외하면 읽기에 제한이 없습니다. agentic 리뷰에서는 repository의 `.env` 파일도 읽을 수 있습니다. 공유할 수 없는 코드는 리뷰하지 마세요.
- git은 repository에 설정된 외부 diff 또는 textconv 프로그램을 실행할 수 있습니다. 신뢰하는 repository만 리뷰하세요.
- 발견 사항은 틀리거나 빠질 수 있으며, "발견 사항 없음"이 "안전함"을 뜻하지 않습니다.

## 10. 문제 해결

| 증상 | 원인 및 해결 방법 |
|---|---|
| `Missing: agy CLI` | Antigravity CLI를 설치하고 `agy`를 한 번 실행해 로그인하세요. plugin을 실행하는 shell에서 `agy --version`이 작동해야 합니다. |
| `Missing: read-only guard - missing/outdated` | setup(`/agy-review:setup`, Codex `setup` skill 또는 `--install-guard`)을 실행하세요. agentic 리뷰에서만 필요합니다. |
| `Not inside a git repository` (exit 2) | repository 루트로 `cd`하거나 `--file` / `--symbol` / `--stdin`으로 코드를 리뷰하세요. |
| 판정 `inconclusive`, exit 4 | 통과가 아닙니다. 발견 사항이 거부됐거나, model끼리 의견이 다르거나, 코드를 충분히 다루지 않았거나, 한 model이 실패했습니다. 범위를 좁히고 `--context`를 추가하거나 다른 `--model`을 사용하세요. |
| `blocked by Gemini's filters` | Gemini 보안 필터가 거부했습니다(보안 prompt에서 자주 발생). `--model`을 지정하지 않았다면 Gemini가 아닌 model로 다시 시도합니다. 아니면 `--model`로 다른 model을 고르세요. |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` 또는 `conflicts with --effort` 또는 `--effort is not supported` | 1.0.1에서 수정됐습니다. effort가 자동으로 model에 맞춰지고 보고서에 실제 사용 값이 표시됩니다. 계속 보이면 `--list-models --refresh`를 실행하고 plugin을 업데이트한 뒤(12절) 보고해 주세요. |
| graphify: `openai package ... missing` | graphify 자체 Python에 `openai` package가 없습니다. `--graphify setup --yes` 또는 `uv tool install --force "graphifyy[openai]"`를 실행하세요(pipx: `pipx inject graphifyy openai`). |
| graphify: commit 후 그래프가 업데이트되지 않음 | `--graphify status`에서 hook과 마지막 결과를 확인하고 `graphify-out/.agy-update.log`를 읽으세요. foreground에서 `--graphify update --debug`를 한 번 실행하세요(각 요청과 응답은 문서 내용이 포함된 `graphify-out/.agy-debug/`에 보관됨). 그래프가 아직 없으면 hook은 아무것도 하지 않습니다. `--graphify update --full`로 한 번 빌드하세요. |
| graphify: chunk에서 `agy returned no answer` | 다음 업데이트 때 graphify가 그 chunk를 다시 시도합니다. `agy -p "say hi"`로 로그인과 quota를 확인하거나 `--set graphifyModel=<id>`로 다른 model을 선택하세요. |
| graphify에서 skill과 package 버전이 다르다고 경고 | 이 도구에는 문제가 없습니다. `uv tool upgrade graphifyy`로 graphify를 업데이트하세요. |
| 빈 리뷰, exit 1 | `agy -p "say hi"`로 로그인과 quota를 확인하고 큰 대상에는 `--timeout`을 늘리세요. |
| Exit 3 / 작업 트리 변경 | agentic 리뷰 중 무언가가 파일을 수정했습니다(editor, build 또는 guard 우회). `git status`와 `git diff`를 확인하세요. 본인이 바꾸지 않았다면 보안 사고로 취급하세요. |
| 거부된 발견 사항이 많음 | model이 존재하지 않는 코드를 인용했습니다. 가끔 생기는 정상적인 상황이며 개수에는 포함되지 않습니다. 더 강한 `--model`을 사용하거나 범위를 좁히세요. |
| `--symbol`: "defined in several places" 또는 "not found" | `--file`을 함께 전달하거나 `--file path:A-B`를 사용하세요. finder는 parser가 아니라 brace/indent 기반 heuristic입니다. |
| Codex: "blocked by sandbox" | 5b를 참고하세요. network, `~/.gemini/antigravity-cli` 쓰기, localhost socket을 허용해야 합니다. |
| Windows: Claude/Codex 안에서 `agy` 또는 `bun`을 찾지 못함 | 도구 shell의 `PATH`가 다릅니다. 해당 명령이 작동하는 shell에서 시작하세요. |
| `verify`가 FAIL 출력 | 중요한 코드에 agentic 리뷰를 사용하지 마세요. 출력과 `agy --version`을 첨부해 issue를 등록하세요. |

## 11. 자주 묻는 질문

**코드를 변경하나요?** 아니요. 정적 모드는 변경할 수 없습니다. agentic 모드는 쓰기를 막고 작업 트리가 나중에 달라지면 경고합니다. commit, stash, checkout을 하지 않습니다.

**여기서는 Bun이 Node보다 빠른가요?** 체감할 만큼 빠르지 않습니다. 작성자의 Windows 환경에서 시작 시간은 Node 약 56 ms, Bun 약 64 ms였고 guard hook은 각각 약 60 ms와 57 ms였습니다. 리뷰에는 수십 초가 걸리며 대부분 model 시간입니다. 문서에서는 Bun을 기본으로 사용하지만 Node 18.18+도 똑같이 작동합니다. 둘 다 같은 코드로 테스트합니다.

**비용이 드나요?** plugin은 무료입니다. 각 리뷰, 작업, 번역, graphify 업데이트는 본인의 Antigravity quota를 사용합니다.

**graphify에 Ollama나 API key가 필요한가요?** 아니요. graphify에는 "ollama"라는 backend slot이 있는데, 이는 "로컬 OpenAI 호환 서버"라는 뜻입니다. 실제 서버는 이 도구의 작은 Antigravity 서버입니다. 설치해야 하는 유일한 항목은 graphify의 `openai` Python package이며 `--graphify setup --yes`가 추가합니다.

**graphify가 계속 Claude 또는 Codex token을 쓰나요?** 본인이나 Agent가 `/graphify --update`, `graphify extract` 같은 명령을 직접 실행하거나 `CLAUDE.md` / `AGENTS.md`에서 Agent에게 그래프를 다시 빌드하라고 지시한 경우에만 그렇습니다. `--graphify rules --write-rules`로 이를 막는 규칙을 추가하세요.

**Antigravity는 어떤 파일을 보나요?** 정적 모드에서는 스크립트가 보낸 코드만 봅니다(`--security`에서는 제한된 관련 코드 포함). Agentic 모드에서는 repository에서 읽는 모든 파일과, 인증 정보 경로를 제외한 디스크의 모든 위치를 볼 수 있습니다.

**발견 사항을 고칠 수도 있나요?** 절대 고치지 않습니다. 다른 Agent나 사용자가 수정합니다. 리뷰어는 리뷰만 하므로 독립성을 유지합니다.

**GitHub pull request를 리뷰할 수 있나요?** branch를 로컬에서 checkout한 뒤 `--base`를 사용하세요. GitHub API에는 접근하지 않습니다.

**agy 설정에서 명령 allow-list를 쓰지 않는 이유는 무엇인가요?** 테스트 결과, headless 모드의 agy는 여러 단어로 된 허용 항목을 정확히 일치시켰고(`git status`는 허용, `git status --short`는 거부), hook의 "allow"는 권한 검사를 덮어쓰지 못했습니다. hook은 확실하게 거부만 할 수 있으므로 agentic 모드에서는 skip-permissions와 기본 거부 hook을 함께 사용하고, 정적 모드에서는 도구를 전혀 주지 않습니다.

**허용 명령이나 scanner 규칙을 추가할 수 있나요?** `CMDS` / `GIT_OK`는 `guard.mjs`에서, `RULES`는 `lib/security.mjs`에서 수정하고 `npm test`를 실행한 뒤 `--install-guard`를 실행하세요.

## 12. 업데이트, 제거, 개발

### 새 버전으로 업데이트하는 방법

새 release는 자동으로 설치되지 않습니다. 직접 업데이트해야 합니다. 네 단계입니다.

**1. 현재 버전과 새 버전이 있는지 확인**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

https://github.com/Ealireza/agy-review/releases 의 release 목록과 [changelog](../CHANGELOG.md)도 확인할 수 있습니다.

**2. 사용하는 host의 plugin 업데이트**

| Host | 명령(일반 터미널에서 실행) | 그다음 |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` 후 `claude plugin update agy-review@agy-review` | Claude Code 다시 시작 |
| Codex | `codex plugin marketplace upgrade agy-review` 후 `codex plugin remove agy-review@agy-review`, `codex plugin add agy-review@agy-review` | Codex 다시 시작 |
| 일반 clone | clone에서 `git pull` | 없음 |

**3. plugin 폴더 밖에 있는 부분 새로 고침**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. 제대로 됐는지 확인:** `--version`에 새 버전이 표시되고, `--check`가 모든 항목에서 OK를 출력하며, `--list-models --refresh`가 각 model이 허용하는 `--effort`를 다시 읽어야 합니다.

업데이트 후 문제가 생기면 `--check`를 실행하고 문제 해결 표(10절)를 읽으세요. 이전 버전이 필요하면 plugin을 제거하고 다음 명령으로 특정 release를 설치하세요: `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. 설정(`.agy-review.json`)은 업데이트가 건드리지 않는 일반 파일입니다.

### 제거

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

아무것도 남기고 싶지 않다면 `~/.agy-review`(runtime 복사본)와 `~/.agy-review-cache.json`(effort cache)을 삭제하세요.

### 개발

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

Issue와 pull request를 환영합니다. 특히 macOS와 Linux의 `verify` 결과, 실제로 작동하는 Codex sandbox 설정, guard 우회 방법(가능하면 먼저 비공개로 보고), 새 scanner 규칙이 필요합니다. 번역하려면 `README.md`를 `docs/README.<code>.md`로 복사해 번역하고 모든 언어 전환 줄에 해당 언어를 추가하세요.

## 라이선스

MIT입니다. [LICENSE](../LICENSE)를 참고하세요.
