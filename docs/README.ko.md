# agy-review

**작업 근거를 보여 주어야 하는 독립 리뷰어.** Google Antigravity(`agy`)가 수행하는 코드 리뷰, 보안 리뷰, 작업 위임, 번역을 Claude Code, Codex 또는 아무 터미널에서 사용할 수 있습니다. 읽기 전용이며 권한 확인 프롬프트가 없고, 모든 지적 사항은 사용자에게 보이기 전에 실제 코드와 대조됩니다.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · **한국어** · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

웹사이트: https://ealireza.github.io/agy-review/ · 심층 문서(영어): 에이전트와 루프는 [AGENTS.md](AGENTS.md), 보안 리뷰 방법은 [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

---

## 목차

1. 제공 기능
2. 리포트를 신뢰할 수 있는 이유
3. 상태: 검증된 것과 검증되지 않은 것
4. 요구 사항
5. 설치
6. 첫 실행: 내 컴퓨터에서 검증하기
7. 사용법: 리뷰, 보안, 작업, 번역, 모델
8. 에이전트, 서브 에이전트, 루프에서 사용하기
9. 보안 모델
10. 문제 해결
11. FAQ
12. 업데이트, 제거, 개발

---

## 1. 제공 기능

| 스킬(Claude Code / Codex) | 명령(Claude Code) | 기능 |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | git 변경 사항, 브랜치, 파일, 줄 범위, 함수 하나 또는 스니펫에 대한 등급별 리뷰 |
| `agy-security` / `security` | `/agy-review:security` | 보안 리뷰: OWASP/CWE, 악용 가능성, 공격 시나리오, 시크릿 및 위험 패턴 스캐너, 컨텍스트로서의 호출자와 피호출자 |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | 독립적으로 완결되는 작업(다시 쓰기, 요약, 초안 작성, 추출)을 Antigravity에 맡기고 결과를 받아옴 |
| `agy-translate` / `translate` | `/agy-review:translate` | 어조, 대상 독자, 용어집을 지정한 번역. 코드, URL, 플레이스홀더, 구조가 그대로 유지되었는지 검증 |
| `agy-models` / `models` | `/agy-review:models` | agy에서 사용할 수 있는 모델 목록 확인, 모델 선택, 프로젝트별 또는 전역 저장, effort 설정 |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | 사전 요구 사항 확인, 읽기 전용 가드 설치, 쓰기가 차단됨을 내 컴퓨터에서 실증 |

Claude Code용 서브 에이전트: `agy-reviewer`, `agy-security`, `agy-worker`. 모든 것이 하나의 저장소와 하나의 스크립트(`plugins/agy-review/scripts/agy-review.mjs`)로 이루어져 있습니다. 서버는 없으며, 본인의 Antigravity 로그인 외에 별도 계정도 필요 없습니다.

## 2. 리포트를 신뢰할 수 있는 이유

코드를 리뷰하는 언어 모델은 때때로 존재하지 않는 문제를 지어냅니다. 이 도구는 모델의 말을 그대로 믿지 않습니다.

1. 리뷰어는 엄격한 JSON 리포트를 반환해야 합니다(`--json-schema`로 강제). 각 지적 사항에는 해당 내용의 **정확한 코드**가 포함됩니다.
2. 스크립트는 그 인용문을 실제 파일에서 찾습니다. **찾지 못하면 해당 지적 사항은 거부**되고 별도로 나열됩니다. **다른 줄에서 발견되면 줄 번호가 수정**됩니다. 무언가를 입증하기에는 너무 짧거나 일반적인 인용문(`return null;`, `}`)은 거부됩니다. 인용된 줄에서 멀리 떨어진 여러 곳과 일치하는 인용문은 모호하다는 이유로 거부됩니다.
3. 판정, 건수, CI 게이트는 검증된 지적 사항만으로 **스크립트가 계산**하며, 모델의 값을 그대로 복사하지 않습니다.
4. 검증된 것이 없다는 것이 승인을 의미하지는 **않습니다**. 지적 사항이 거부되었거나, 모델이 동의하지 않았거나, 코드를 모두 다루지 못했거나, 여러 모델 중 하나가 실패했다면 판정은 `inconclusive`이고 종료 코드는 4입니다.
5. 요청한 줄 밖에 있는 지적 사항은 별도로 표시되며 게이트에는 영향을 주지 않습니다. 신뢰도가 낮은 지적 사항은 나열되지만 집계에는 포함되지 않습니다.
6. 심각도(영향)와 우선순위(언제 고칠지)는 별개이며 일관성을 유지합니다. critical은 항상 P0, nit은 항상 P3이며, 스타일 관련 지적 사항은 low를 넘지 않습니다.

여전히 가능한 경우: 인용은 정확하지만 결론이 틀린 경우입니다. 인용문은 코드가 존재함을 증명할 뿐 추론이 옳다는 것을 증명하지는 않습니다. 그래서 각 지적 사항에 구체적인 시나리오가 있으며, 조치하기 전에 인용된 줄을 직접 읽어야 합니다.

실제 사례: 버그 두 개를 심은 작은 파일에 이 도구를 실행했습니다(agy를 통한 Claude Sonnet 4.6). CWE-89, CWE-78, CWE-22, CWE-369에 해당하는 검증된 지적 사항 4건이 올바른 줄에서 나왔고, 커버리지는 100 %, 중복 1건은 제외되었으며, 스캐너도 같은 두 줄을 독립적으로 표시했습니다.

## 3. 상태: 검증된 것과 검증되지 않은 것

| 점검 항목 | 결과 |
|---|---|
| 단위 및 파이프라인 테스트(`npm test`): 그라운딩, 범위, 판정, 중복 제거, 심볼 탐색, 대상, 설정, 모델, 작업, 번역, 보안, 마스킹 | 테스트 50개 모두 통과. 가짜 `agy` 사용(에이전트 파이프라인, 트리 변경 감지, 실패하는 모델, `verify` 게이트 포함) |
| 가드 훅(허용 및 거부되는 명령, 도구, 따옴표를 이용한 우회, 자격 증명 경로) | 자동화 테스트, 통과 |
| Claude Code 매니페스트(`claude plugin validate`), Antigravity 플러그인(`agy plugin validate --strict`) | 통과 |
| Codex 0.163.0: 마켓플레이스 추가, 플러그인 설치, 스킬 탐지 | Windows 11에서 확인 |
| 실제 agy 1.4.8(Gemini 3.8 Flash 및 Claude Sonnet 4.6)에 대한 정적 리뷰, 보안 리뷰, 작업. Bun 1.3.14로 실행 | Windows 11에서 확인. 지적 사항이 올바른 줄에 그라운딩됨 |
| 설계와 코드에 대한 독립 리뷰 2건(Opus: 지적 25건, Codex: 지적 28건). 확인된 항목은 수정했으며 각각 회귀 테스트를 추가 | 완료. changelog 참조 |
| **에이전트 리뷰(`agy --dangerously-skip-permissions`와 실제 쓰기를 차단하는 가드)** | **작성자가 실행하지 않음** |

마지막 행은 안전성과 관련되며 사용 중인 agy 버전에 따라 달라지므로, 설치 후와 agy를 업데이트할 때마다 `verify`를 한 번 실행하십시오(6장). 정적 리뷰, 심볼/파일/스니펫 보안 리뷰, 작업, 번역은 이 플래그를 사용하지 않으며 아무것도 쓸 수 없습니다.

테스트 환경: agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14, Node 24, Windows 11. macOS와 Linux에서도 동작할 것으로 보이나(agy는 모든 플랫폼에서 `~/.gemini/config/plugins`를 사용합니다) 테스트되지 않았습니다.

## 4. 요구 사항

그 외에는 필요 없습니다. 다른 플러그인이나 다른 CLI 도구는 필요하지 않습니다.

| 필요한 것 | 이유 | 구하는 방법 | 확인 방법 |
|---|---|---|---|
| Antigravity CLI `agy` | 실제 작업을 수행 | https://antigravity.google/cli 에서 설치한 뒤 `agy`를 한 번 실행하여 로그인 | `agy --version` |
| Bun(권장) **또는** Node.js 18.18+ | 스크립트와 가드 훅을 실행 | https://bun.sh 또는 https://nodejs.org | `bun --version` / `node --version` |
| git | git 대상 처리 및 관련 코드 탐색 | https://git-scm.com | `git --version` |
| Claude Code **또는** Codex **또는** 아무 터미널 | 요청을 입력하는 곳 | 각 제품의 설치 가이드 | `claude --version` / `codex --version` |

모든 안내와 가드 훅(`bun guard.mjs || node guard.mjs`)에서 Bun이 기본값이며, Node도 동일하게 동작합니다. Antigravity 사용량은 본인의 할당량에서 차감됩니다. 리뷰는 몇 초에서 몇 분까지 걸릴 수 있습니다.

## 5. 설치

사용하는 호스트를 선택하십시오. 여러 호스트가 같은 스크립트와 가드를 공유할 수 있습니다.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup`은 agy, git, 가드를 확인하고 가드를 `~/.gemini/config/plugins/readonly-review`에 설치합니다. `/agy-review:verify`는 실제 환경에서 수행하는 안전성 증명입니다.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex를 다시 시작한 뒤 일상적인 말로 요청하십시오. "Check my Antigravity review setup", "Review my changes with Antigravity", "Security-review the function saveUpload", "Translate README.md to German, friendly tone" 등입니다.

1. **일반 터미널에서 가드를 한 번 설치하십시오**(`~/.gemini/config/plugins`에 기록합니다): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard`(Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). 가드가 필요한 것은 에이전트 방식의 git 리뷰뿐입니다.
2. **Codex의 샌드박스가 agy의 동작을 허용해야 합니다.** 외부로 나가는 네트워크, `~/.gemini/antigravity-cli`에 대한 쓰기 권한, localhost 소켓이 필요합니다. `workspace-write`에서는 `~/.codex/config.toml`에 다음 설정이 필요할 가능성이 높습니다.

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   그래도 막히는 부분이 있으면 스킬이 부족한 접근 권한을 알려 주고 중단합니다. 스스로 권한을 넓히는 일은 없습니다. 사용 중인 Codex 샌드박스 안에서 agy가 올바르게 동작하는지는 작성자가 테스트하지 못한 Codex 설정 부분이므로, Codex 안에서도 `verify`를 실행하십시오.

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

### 5d. Antigravity 쪽만 사용

가드는 일반적인 Antigravity 플러그인입니다. `plugins/agy-review/antigravity-plugin/readonly-review`를 `~/.gemini/config/plugins/readonly-review`에 복사하거나 `--install-guard`를 실행하고, `agy plugin list`로 확인하십시오. 프롬프트에 `AGY_READONLY_REVIEW`가 들어 있지 않으면 아무 동작도 하지 않으므로 평소의 agy 세션에는 영향이 없습니다. 대화형 agy용 `readonly-code-review` 스킬도 함께 제공됩니다.

## 6. 첫 실행: 내 컴퓨터에서 검증하기

설치 후와 agy를 업데이트할 때마다 한 번 실행하십시오: `/agy-review:verify`, Codex의 `verify` 스킬 또는 `--verify`. 임시 폴더에서 작은 agy 실제 호출을 한 번 수행합니다. 파일 읽기(성공해야 함), 파일 쓰기, 파일로 리다이렉트, 파일 삭제(모두 차단되어야 함)를 시도합니다. 예상 결과:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

`FAIL`이 하나라도 있으면 `NOT VERIFIED`로 끝나며 에이전트 리뷰는 비활성 상태로 유지됩니다. 출력 내용과 `agy --version`을 첨부해 이슈를 등록하십시오. `verify`에 통과하면 이 가드와 이 agy 버전에 대해서만 기록됩니다. **에이전트 리뷰는 이 기록이 없으면 시작을 거부하며**, agy나 가드를 업데이트하면 기록이 무효가 되므로 업데이트 후에는 `verify`를 다시 실행하십시오. 정적 모드에는 필요하지 않습니다.

## 7. 사용법

저장소의 루트에서 실행하십시오.

### 7a. 리뷰: 대상 선택

| 리뷰하려는 대상 | 사용할 것 | 모드 |
|---|---|---|
| 커밋하지 않은 작업 | 없음 | 에이전트, 읽기 전용 |
| 브랜치 / 스테이징된 변경 / 커밋 하나 | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | 에이전트, 읽기 전용 |
| 파일 또는 범위 | `--file src/a.kt` 또는 `--file src/a.kt:40-80` (반복 가능) | 정적 |
| 함수 또는 클래스 하나 | `--symbol parseConfig` (이름이 모호하면 `--file` 추가) | 정적 |
| 메모리에만 있는 코드 | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | 정적 |
| 위 중 하나에 더해 다른 파일을 볼 수 있는 권한 | `--agentic` 추가 | 에이전트, 읽기 전용 |

*정적*: 스크립트가 직접 코드를 읽고 줄 번호를 매기며 모델에는 도구가 주어지지 않습니다. 따라서 아무것도 건드릴 수 없고, 보여 주지 않은 파일에 대해 내용을 지어낼 수도 없습니다. *에이전트*: 리뷰어가 가드 훅을 거쳐 저장소를 직접 읽습니다. 가드 훅은 모든 쓰기를 차단합니다.

리뷰어를 돕는 옵션: `--context "what this code must do"`, `--focus "concurrency, error handling"`(또는 끝에 단어 추가), `--context-lines N`.

출력: 기본은 Markdown이며, 기계용으로는 `--format json`, 파일로는 `--output file`, `--fail-on high`(검증된 high 또는 critical 지적 사항이 있으면 종료 코드 10), `--previous old.json`은 지적 사항을 새로 발생, 지속, 해결됨, 재보고 없음으로 표시합니다.

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

`--security`(스킬 `agy-security`, 명령 `/agy-review:security`, 서브 에이전트 `agy-security`)는 위의 모든 대상에서 동작하며 다음을 추가합니다. 위협 모델 방식(신뢰할 수 없는 소스에서 위험한 싱크까지, 그 사이의 통제 포함), OWASP Top 10(2021) 및 CWE 매핑, `exploitability`(`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, 시크릿과 약 25가지 위험 패턴 유형을 찾는 모델 없는 스캐너, 그리고 **관련 코드**(대상이 호출하는 것과 대상을 호출하는 것)입니다.

- 하드코딩된 시크릿(개인 키, AWS, GitHub, Stripe, Slack, Google)은 **모델에 무엇이든 전송하기 전에 마스킹**되며 패턴 기반 지적 사항으로 보고됩니다.
- 리포트의 `cve`는 모델의 주장이며 항상 `cve_verified: false`로 표시됩니다. NVD에서, 또는 `osv-scanner` / `npm audit` / `pip-audit`로 확인하십시오. 이 도구는 CVE를 지어내거나 검증하지 않습니다.
- "Claude가 작성한 코드를 이웃 코드와 함께 리뷰하기": `examples/`에 있는 준비된 규칙을 `CLAUDE.md` 또는 `AGENTS.md`에 복사하거나, 선택 사항인 Stop 훅 또는 pre-commit 훅을 설치하십시오. 자세한 내용과 연계 레시피: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. 작업: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

모델은 전달한 텍스트만 받으며 도구는 주어지지 않습니다. 텍스트 모드에서는 답변만 출력하고, 모델과 effort는 stderr로 보고합니다.

### 7d. 번역: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

옵션: `--from`, `--variant`(pt-BR, zh-TW, de-CH 등), `--tone`(formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary`(JSON `{"repo":"مخزن","API":"="}` 또는 CSV. `=`는 해당 용어를 그대로 둡니다), `--keep a,b`, `--notes`, `--strict`. 긴 텍스트는 빈 줄 기준으로 나뉘며(코드 블록 내부는 절대 나누지 않음) 청크 단위로 번역됩니다. 번역 후 스크립트는 펜스 코드, 인라인 코드, URL, 플레이스홀더(`{{x}}`, `${x}`, `%s`), 태그, 제목이 원문과 일치하는지 검증하고 모든 차이를 보고합니다(`--strict`를 쓰면 차이가 종료 코드 11이 됩니다). 스킬은 먼저 어조, 대상 독자, 용어를 묻지만, 추론할 수 없는 것만 묻습니다. 기계적 검사로는 문장의 자연스러움을 판단할 수 없으므로 중요한 텍스트는 원어민이 확인하도록 하십시오.

### 7e. 모델과 effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

실행별 지정: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. 우선순위: 명령줄, 프로젝트 파일, 사용자 파일, agy 기본값. `--effort auto`(기본값)는 근거가 설명되는 결정적 선택입니다. 리뷰는 범위 내 코드의 양에 비례하고(보안처럼 위험에 민감한 초점은 한 단계 올라감), 작업은 표현(기계적 변환은 low, 추론 비중이 큰 작업은 high)과 입력 길이에 따라 정해지며, `max`는 자동으로 선택되지 않습니다. 일부 모델은 `--effort`를 받지 않습니다. 그 경우 도구는 모델 기본값을 사용하고 그 사실을 알립니다. Gemini의 콘텐츠 필터가 프롬프트를 거부했고 모델을 지정하지 않았다면, 도구는 Gemini가 아닌 모델로 한 번 재시도하고 그 사실을 알립니다.

### 7f. 옵션과 종료 코드

`bun agy-review.mjs --help`로 전체 목록을 볼 수 있습니다. 종료 코드: `0` 정상 · `1` 오류, 타임아웃 또는 해석할 수 없는 응답 · `2` 사용법 오류 또는 사전 요구 사항 누락 · `3` 에이전트 리뷰 중 작업 트리가 변경됨 · `4` 결론 불가 또는 불완전(**통과가 아님**) · `10` `--fail-on` 게이트 실패(리포트는 유효) · `11` `--strict`에서 번역 검사 실패. 여러 코드가 해당되면 `3`이 `10`보다, `10`이 `4`보다 우선합니다. `1`과 `2`를 제외한 모든 경우에 리포트가 작성되므로 그 안의 `verdict`와 `incomplete`를 확인하십시오. 깨끗한 작업 트리는 오류가 아닙니다. 도구는 "No changes to review"를 출력하고 모델을 호출하지 않은 채 종료 코드 0으로 끝납니다.

## 8. 에이전트, 서브 에이전트, 루프에서 사용하기

모든 스킬은 안정적인 JSON을 반환하는 평범한 CLI 호출이므로 어떤 에이전트에서도 사용할 수 있습니다. Claude Code에서는 `agy-reviewer`, `agy-security`, `agy-worker` 서브 에이전트를 띄우고, Codex에서는 스킬을 호출하며, 다른 프레임워크에서는 스크립트를 직접 호출하면 됩니다.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

리뷰어에게는 무엇을 변경했는지 전혀 알려 주지 않으므로 각 라운드는 독립적으로 유지됩니다. 전체 규약, JSON 필드, 루프 레시피, 팬아웃 패턴: [AGENTS.md](AGENTS.md).

## 9. 보안 모델

**정적 리뷰, 심볼/파일/스니펫 보안 리뷰, 작업, 번역**은 agy를 권한 플래그 없이, 도구 없이, 빈 임시 폴더에서 실행합니다. agy는 사용자의 파일을 읽거나 쓸 수 없으며, 외부로 나가는 데이터는 스크립트가 프롬프트에 넣은 것(인식된 시크릿은 마스킹됨)뿐입니다.

**에이전트 리뷰**(git 대상 또는 `--agentic`)는 프롬프트 때문에 멈추지 않도록 agy를 `--dangerously-skip-permissions`로 시작하고, 모든 도구 호출을 검사하여 **기본적으로 거부**하는 `PreToolUse` 가드 훅(`guard.mjs`)에 의존합니다.

- 허용: 파일 보기 및 검색 도구. 셸 명령은 단독이든 연결이든, 읽기 전용 `git` 하위 명령, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find`(`-delete`/`-exec` 제외), PowerShell `Get-*`, `Select-String` 및 몇 가지 더로만 구성된 경우에 한합니다(목록은 `guard.mjs`에 있음).
- 거부: 모든 쓰기/편집/노트북/이미지/스케줄/서브 에이전트/브라우저/웹/MCP 도구와 알 수 없는 도구. 리다이렉션, `$(...)`, 백틱, 스크립트 블록, `eval` 유사 구문. `git commit/push/checkout/reset/...`. 인터프리터와 패키지 관리자. `curl`, `ssh`. 자격 증명 저장소(`.ssh`, `.aws`, `.gnupg`, 개인 키) 읽기.
- 가드가 중단되면 거부합니다. 스크립트는 가드가 설치되어 있고 번들된 것과 동일하며, **이 가드와 이 agy 버전에 대해 통과한 `--verify`가 기록되어 있지 않으면** 에이전트 실행 시작을 거부합니다. 실행 전후에 `git status`, 추적 및 스테이징된 diff, 추적되지 않는 모든 파일의 내용에 대한 지문을 만들어 비교하며, 하나라도 다르면 경고와 함께 종료 코드 3으로 끝납니다.
- **에이전트 모드에서는 리뷰어가 파일을 읽기 전에 시크릿을 마스킹할 수 없습니다.** 도구가 이를 탐지해 경고하고 `limitations`에 나열합니다. 시크릿을 교체하거나, 먼저 마스킹이 적용되는 `--file` / `--symbol`로 리뷰하십시오.

이것이 아닌 것:

- **OS 샌드박스가 아닙니다.** 가드는 도구 이름과 명령 텍스트를 필터링할 뿐이며, agy 자체 샌드박스는 모든 환경에서 사용할 수 있는 것이 아닙니다. 리뷰 대상 코드에 의도적으로 숨겨진 프롬프트 인젝션이 필터를 통과하는 명령 형태를 찾아낼 수 있습니다. 실행 전후 검사는 수정된 추적 파일과 새 파일은 잡아내지만 읽기는 잡아내지 못합니다.
- **코드가 Google의 모델로 전송됩니다.** 자격 증명 경로를 제외하면 읽기에는 제한이 없습니다. 저장소 안의 `.env` 파일은 에이전트 리뷰가 읽을 수 있습니다. 공유해서는 안 되는 코드는 리뷰하지 마십시오.
- git은 저장소에 설정된 외부 diff 또는 textconv 프로그램을 실행할 수 있습니다. 신뢰할 수 있는 저장소만 리뷰하십시오.
- 지적 사항은 틀리거나 불완전할 수 있으며, "지적 사항 없음"은 결코 "안전함"을 뜻하지 않습니다.

## 10. 문제 해결

| 증상 | 원인과 해결 방법 |
|---|---|
| `Missing: agy CLI` | Antigravity CLI를 설치하고 `agy`를 한 번 실행해 로그인하십시오. 플러그인을 실행하는 셸에서 `agy --version`이 동작해야 합니다 |
| `Missing: read-only guard - missing/outdated` | setup을 실행하십시오(`/agy-review:setup`, Codex의 `setup` 스킬 또는 `--install-guard`). 에이전트 리뷰에만 필요합니다 |
| `Not inside a git repository`(종료 코드 2) | 저장소 루트로 `cd`하거나, `--file` / `--symbol` / `--stdin`으로 코드를 리뷰하십시오 |
| 판정 `inconclusive`, 종료 코드 4 | 통과가 아닙니다. 지적 사항이 거부되었거나, 모델이 동의하지 않았거나, 코드를 모두 다루지 못했거나, 모델 하나가 실패했습니다. 범위를 좁히거나, `--context`를 추가하거나, 다른 `--model`을 시도하십시오 |
| `blocked by Gemini's filters` | Gemini 안전 필터가 거부했습니다(보안 관련 프롬프트에서 흔함). `--model`이 없으면 도구가 Gemini가 아닌 모델로 재시도하고, 그렇지 않으면 `--model`로 직접 선택하십시오 |
| `--effort is not supported for model` | 자동으로 처리됩니다(모델 기본값을 사용하고 그 사실을 보고함) |
| 빈 리뷰, 종료 코드 1 | `agy -p "say hi"`로 로그인과 할당량을 확인하십시오. 큰 대상에는 `--timeout`을 늘리십시오 |
| 종료 코드 3 / 작업 트리 변경됨 | 에이전트 리뷰 중 무언가가 파일을 수정했습니다(편집기, 빌드 또는 가드 우회). `git status`와 `git diff`를 확인하십시오. 직접 변경하지 않았다면 보안 사고로 간주하십시오 |
| 거부된 지적 사항이 많음 | 모델이 존재하지 않는 코드를 인용했습니다. 가끔 있을 수 있는 일이며 집계에는 포함되지 않습니다. 더 강력한 `--model`을 쓰거나 범위를 좁히십시오 |
| `--symbol`: "defined in several places" 또는 "not found" | `--file`을 지정하거나 `--file path:A-B`를 사용하십시오. 탐색기는 휴리스틱(중괄호/들여쓰기 매칭)이며 파서가 아닙니다 |
| Codex: "blocked by sandbox" | 5b를 참조하십시오. 네트워크, `~/.gemini/antigravity-cli` 쓰기, localhost 소켓이 허용되어야 합니다 |
| Windows: Claude/Codex 안에서 `agy` 또는 `bun`을 찾을 수 없음 | 도구 셸의 `PATH`가 다릅니다. 해당 명령이 동작하는 셸에서 시작하십시오 |
| `verify`가 FAIL을 출력함 | 중요한 코드에는 에이전트 리뷰를 사용하지 마십시오. 출력 내용과 `agy --version`을 첨부해 이슈를 등록하십시오 |

## 11. FAQ

**내 코드를 변경하나요?** 아니요. 정적 모드는 변경할 수 없습니다. 에이전트 모드는 쓰기를 차단하고, 이후 트리가 달라져 있으면 경고합니다. 커밋, stash, 체크아웃은 절대 하지 않습니다.

**여기서는 Bun이 Node보다 빠른가요?** 측정 가능한 수준으로는 아닙니다. 작성자의 Windows 컴퓨터에서 시작 시간은 Node가 약 56 ms, Bun이 약 64 ms였고, 가드 훅은 약 60 ms 대 57 ms였습니다. 리뷰는 수십 초가 걸리며 그 시간은 모델이 차지합니다. Bun은 문서상의 기본값이고 Node 18.18+도 동일하게 동작합니다. 둘 다 같은 코드로 지원됩니다.

**비용이 드나요?** 플러그인은 무료입니다. 각 리뷰는 본인의 Antigravity 할당량을 사용합니다.

**Antigravity는 어떤 파일을 보나요?** 정적 모드: 스크립트가 보내는 코드뿐입니다(`--security`에서는 범위가 제한된 관련 코드가 추가됩니다). 에이전트 모드: 저장소에서 읽는 모든 것과, 자격 증명 경로를 제외한 디스크상의 모든 위치입니다.

**지적 사항을 고쳐 주나요?** 절대 고치지 않습니다. 다른 에이전트나 사용자가 고칩니다. 리뷰어는 리뷰만 하므로 독립성이 유지됩니다.

**GitHub 풀 리퀘스트를 리뷰할 수 있나요?** 브랜치를 로컬에 체크아웃하고 `--base`를 사용하십시오. GitHub API 접근은 없습니다.

**agy 설정에서 명령을 허용 목록에 넣지 않는 이유는 무엇인가요?** 테스트했습니다. 헤드리스 모드에서 agy는 여러 단어로 된 허용 항목을 정확히 일치시켜 비교하며(`git status`는 되고 `git status --short`는 안 됨), 훅의 "허용"은 권한 검사를 덮어쓰지 못합니다. 훅이 확실하게 할 수 있는 것은 거부뿐입니다. 그래서 에이전트 모드에서는 skip-permissions와 기본 거부 훅을 함께 사용하고, 정적 모드에서는 도구를 전혀 주지 않습니다.

**허용 명령이나 스캐너 규칙을 추가할 수 있나요?** `guard.mjs`의 `CMDS` / `GIT_OK` 또는 `lib/security.mjs`의 `RULES`를 수정하고 `npm test`를 실행한 뒤 `--install-guard`를 실행하십시오.

## 12. 업데이트, 제거, 개발

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

업데이트 후에는 setup을 다시 실행하고(변경된 가드를 다시 설치합니다) verify를 실행하십시오.

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

이슈와 풀 리퀘스트를 환영합니다. 특히 macOS와 Linux에서의 `verify` 결과, 동작하는 Codex 샌드박스 설정, 가드 우회 사례(가능하면 먼저 비공개로 보고해 주십시오), 새로운 스캐너 규칙이 도움이 됩니다. 번역: `README.md`를 `docs/README.<code>.md`로 복사해 번역하고, 모든 곳의 언어 전환 줄에 해당 언어를 추가하십시오.

## License

MIT, [LICENSE](../LICENSE) 참조.
