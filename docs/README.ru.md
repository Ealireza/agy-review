# agy-review

**Независимый ревьюер, который обязан показывать доказательства.** Проверка кода и безопасности, делегирование задач и перевод через Google Antigravity (`agy`) из Claude Code, Codex или любого терминала. Работает только на чтение, не запрашивает разрешений, а каждый результат сверяется с вашим реальным кодом до того, как вы его увидите.

> ## НОВОЕ: больше не тратьте token Claude и Codex на обновление графа graphify
>
> **Теперь graphify обновляется через Antigravity в фоне при каждом commit, merge, checkout и rebase. Ваш Agent тратит на это 0 token, и API key не нужен.**
>
> Одна команда, `agy-review --graphify setup`, заново регистрирует git hook для graphify, чтобы **дорогая часть каждого обновления графа — чтение документации и присвоение имён сообществам с помощью языкового model — выполнялась дешёвым model Antigravity, а не вашей сессией Opus или Fable.** `git commit` завершается за долю секунды, а граф догоняет изменения сам.
>
> В реальном запуске на Windows commit, изменивший код и документ, обновил граф за **22 seconds с одним вызовом Antigravity и 0 token Claude или Codex.** Этот model может только читать и возвращать текст: у него нет инструментов, прав на запись или выполнение команд. Подробности и настройка — в разделе 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · **Русский** · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

Сайт: https://ealireza.github.io/agy-review/ · Подробные материалы (на английском): [docs/AGENTS.md](AGENTS.md) об Agent и циклах, [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) о методике проверки безопасности.

---

## Содержание

1. Что вы получаете
2. Почему отчёту можно доверять
3. Статус: что проверено, а что нет
4. Требования
5. Установка
6. Первый запуск: проверка на вашем компьютере
7. Использование: проверка, безопасность, задачи, перевод, model, graphify
8. Использование из Agent, sub-agent и циклов
9. Модель безопасности
10. Решение проблем
11. Частые вопросы
12. Обновление до новой версии, удаление и разработка

---

## 1. Что вы получаете

| skill (Claude Code / Codex) | Команда (Claude Code) | Что она делает |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | оценочная проверка изменений git, branch, файла, диапазона строк, одной функции или фрагмента |
| `agy-security` / `security` | `/agy-review:security` | проверка безопасности: OWASP/CWE, возможность эксплуатации, сценарий атаки, поиск секретов и опасных шаблонов, вызывающий и вызываемый код как контекст |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | передаёт Antigravity любую самостоятельную задачу — переписать, кратко изложить, подготовить черновик или извлечь данные — и возвращает результат |
| `agy-translate` / `translate` | `/agy-review:translate` | переводит с учётом тона, аудитории и глоссария; проверяет, что код, URL, заполнители и структура сохранились |
| `agy-models` / `models` | `/agy-review:models` | показывает model в вашем agy и допустимый `--effort` для каждого, позволяет выбрать model и сохранить выбор для проекта или глобально |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **поддерживает граф graphify актуальным через Antigravity и git hook: 0 token Claude или Codex, без API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | проверяет зависимости, устанавливает защиту только для чтения и доказывает на вашем компьютере, что запись заблокирована |

Для Claude Code доступны sub-agent: `agy-reviewer`, `agy-security`, `agy-worker`. Всё находится в одном repository и одном скрипте (`plugins/agy-review/scripts/agy-review.mjs`). Сервера нет, и кроме вашей учётной записи Antigravity ничего регистрировать не нужно.

## 2. Почему отчёту можно доверять

Языковой model, проверяющий код, иногда выдумывает проблемы. Этот инструмент не верит ему на слово.

1. Ревьюер обязан вернуть отчёт в строгом формате JSON (это задаёт `--json-schema`). К каждому результату прилагается **точный код**, которого он касается.
2. Скрипт ищет эту цитату в реальном файле. **Не найдена — результат отклоняется** и показывается отдельно. **Найдена на другой строке — номер строки исправляется.** Слишком короткие или общие цитаты, которые ничего не доказывают (`return null;`, `}`), отклоняются. Если цитата встречается в нескольких местах далеко от указанной строки, она тоже отклоняется как неоднозначная.
3. Вердикт, количество результатов и проверка CI **вычисляются скриптом** только по подтверждённым результатам и никогда не копируются из ответа model.
4. Отсутствие подтверждённых результатов — **не** одобрение: если результаты были отклонены, model разошлись во мнении, код покрыт не полностью или один из нескольких model завершился с ошибкой, вердикт будет `inconclusive`, а exit code — 4.
5. Результаты за пределами запрошенных строк помечаются и никогда не влияют на порог. Результаты с низкой уверенностью показываются, но не учитываются.
6. Серьёзность (последствия) и приоритет (когда исправлять) разделены и согласованы: critical всегда P0, nit всегда P3, а замечания по стилю никогда не выше low.

Что всё ещё возможно: цитата верна, а вывод ошибочен. Цитата доказывает наличие кода, но не правильность рассуждений. Поэтому у каждого результата есть конкретный сценарий, а перед исправлением стоит прочитать указанные строки.

Реальный пример: инструмент проверил небольшой файл с двумя специально внесёнными ошибками (Claude Sonnet 4.6 через agy) и выдал 4 подтверждённых результата на правильных строках с CWE-89, CWE-78, CWE-22 и CWE-369, покрытие 100 %, удалил один дубликат, а встроенный сканер независимо отметил те же две строки.

## 3. Статус: что проверено, а что нет

| Проверка | Результат |
|---|---|
| Модульные и конвейерные тесты (`npm test`): привязка к коду, область проверки, вердикт, удаление дублей, поиск символов, цели, конфигурация, model, задачи, перевод, безопасность, скрытие секретов | 72 теста, все проходят с поддельным `agy` (включая Agent-конвейер, обнаружение изменений дерева, сбой model и порог `verify`) |
| Защитный hook (разрешённые и запрещённые команды, инструменты, приёмы с кавычками, пути к учётным данным) | автоматические тесты проходят |
| Манифесты Claude Code (`claude plugin validate`), plugin Antigravity (`agy plugin validate --strict`) | проходят |
| Codex 0.163.0: добавление marketplace, установка plugin, обнаружение skill | проверено на Windows 11 |
| Статическая проверка, проверка безопасности и задачи с реальным agy 1.4.8 (Gemini 3.8 Flash и Claude Sonnet 4.6), запущенные через Bun 1.3.14 | проверено на Windows 11; результаты привязаны к правильным строкам |
| `--effort` для каждого model: model по умолчанию (low, medium, high), model с effort в имени и model Claude без `--effort` | проверено с реальным agy 1.4.8 |
| Полный цикл graphify через Antigravity: настоящий graphify 0.9.86 и настоящий agy 1.4.8 на Windows. git hook обновил граф в фоне (22 s, 1 вызов Antigravity, `git commit` завершился за 0.3 s), а model получил только изменённый документ | проверено вручную и тестами с поддельными graphify и agy |
| Две независимые проверки архитектуры и кода (Opus: 25 результатов; Codex: 28 результатов), подтверждённые проблемы исправлены и для каждой добавлен регрессионный тест | готово, см. changelog |
| **Agent-проверки (`agy --dangerously-skip-permissions` вместе с защитой, блокирующей реальные записи)** | **автор не запускал** |

Автор не проверял `--graphify setup --yes` на реальной установке graphify через `uv tool` (в ручном тесте использовался graphify из pip, где пакет `openai` уже был). Строка про Agent-проверки важна для безопасности и зависит от версии agy, поэтому запускайте `verify` после установки и каждого обновления agy (раздел 6). Статические проверки, проверки безопасности символа, файла или фрагмента, задачи и переводы этот флаг не используют и ничего записать не могут.

Проверено с agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14, Node 24 и Windows 11. macOS и Linux должны работать (agy везде использует `~/.gemini/config/plugins`), но не проверялись.

## 4. Требования

Больше ничего: никаких других plugin или CLI-инструментов.

| Что нужно | Зачем | Где взять | Как проверить |
|---|---|---|---|
| Antigravity CLI `agy` | выполняет работу | https://antigravity.google/cli, затем один раз запустите `agy` и войдите | `agy --version` |
| Bun (рекомендуется) **или** Node.js 18.18+ | запускает скрипт и защитный hook | https://bun.sh или https://nodejs.org | `bun --version` / `node --version` |
| git | выбирает цели git и связанный с результатом код | https://git-scm.com | `git --version` |
| Claude Code **или** Codex **или** любой терминал | откуда вы отправляете запрос | инструкции по установке этих инструментов | `claude --version` / `codex --version` |

Во всех инструкциях и в защитном hook по умолчанию используется Bun (`bun guard.mjs || node guard.mjs`); Node работает так же. Использование Antigravity расходует вашу quota. Проверка может занять от нескольких секунд до нескольких минут.

## 5. Установка

Выберите среду, которой пользуетесь; несколько сред могут использовать общий скрипт и защиту.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` проверяет agy, git и защиту, затем устанавливает защиту в `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` выполняет живую проверку безопасности.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Перезапустите Codex, затем попросите обычным текстом: «Проверь мою настройку проверки через Antigravity», «Проверь мои изменения через Antigravity», «Проверь безопасность функции saveUpload», «Переведи README.md на немецкий дружелюбным тоном».

1. **Один раз установите защиту из обычного терминала** (она записывается в `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; имя папки совпадает с установленной версией, поэтому после обновления используйте существующую папку). Защита нужна только для Agent-проверок git.
2. **sandbox Codex должен позволять agy работать:** нужен исходящий доступ к сети, запись в `~/.gemini/antigravity-cli` и локальный сокет. Для `workspace-write`, скорее всего, потребуется добавить в `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Если что-то всё ещё заблокировано, skill назовёт недостающий доступ и остановится; он никогда не расширяет разрешения сам. Автор не смог проверить, правильно ли agy работает внутри sandbox Codex, поэтому запустите `verify` и из Codex.

### 5c. Обычный терминал

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

Совет: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Только сторона Antigravity

Защита — обычный plugin Antigravity. Скопируйте `plugins/agy-review/antigravity-plugin/readonly-review` в `~/.gemini/config/plugins/readonly-review` или запустите `--install-guard`; проверьте через `agy plugin list`. Она ничего не делает, если prompt не содержит `AGY_READONLY_REVIEW`, поэтому ваши обычные сессии agy не меняются. В комплект также входит skill `readonly-code-review` для интерактивного agy.

## 6. Первый запуск: проверка на вашем компьютере

После установки и каждого обновления agy один раз запускайте `/agy-review:verify`, skill `verify` в Codex или `--verify`. Инструмент делает один небольшой живой вызов agy во временной папке: читает файл (должно сработать), записывает файл, перенаправляет вывод в файл и удаляет файл (всё это должно быть заблокировано). Ожидаемый результат:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Любой `FAIL` заканчивается строкой `NOT VERIFIED`, а Agent-проверки остаются отключёнными: создайте issue и приложите вывод вместе с результатом `agy --version`. Успешный `verify` сохраняется только для этой защиты и этой версии agy; **без него Agent-проверки не запускаются**, а обновление agy или защиты отменяет результат, поэтому после обновлений запускайте `verify` снова. Статическим режимам он не нужен.

## 7. Использование

Запускайте из корня repository.

### 7a. Проверка: выберите цель

| Что проверить | Что использовать | Режим |
|---|---|---|
| незакоммиченные изменения | ничего | Agent, только чтение |
| branch / staged-изменения / один commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | Agent, только чтение |
| файл или диапазон | `--file src/a.kt` или `--file src/a.kt:40-80` (можно повторять) | статический |
| одну функцию или класс | `--symbol parseConfig` (+ `--file`, если имя неоднозначно) | статический |
| код, который есть только в памяти | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | статический |
| любую из этих целей с разрешением читать другие файлы | добавьте `--agentic` | Agent, только чтение |

*Статический режим*: скрипт сам читает и нумерует код, а model не получает инструменты, поэтому ничего нельзя изменить или выдумать о непоказанных файлах. *Agent-режим*: ревьюер сам читает repository через защитный hook, который блокирует любую запись.

Помогите ревьюеру: `--context "what this code must do"`, `--focus "concurrency, error handling"` (или текст в конце команды), `--context-lines N`.

По умолчанию выводится Markdown; для машин используйте `--format json`; для файла — `--output file`; `--fail-on high` возвращает exit 10, если есть подтверждённый результат уровня high или critical; `--previous old.json` помечает результаты как новые, сохранившиеся, исправленные или больше не обнаруженные.

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

### 7b. Проверка безопасности

`--security` (skill `agy-security`, команда `/agy-review:security`, sub-agent `agy-security`) работает с любой целью выше и добавляет: метод моделирования угроз (от ненадёжного источника до опасной точки с учётом промежуточных мер защиты), сопоставление с OWASP Top 10 (2021) и CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, независимый от model сканер секретов и примерно 25 классов опасных шаблонов, а также **связанный код**: что вызывает цель и кто вызывает её.

- Жёстко заданный секрет (закрытый ключ, AWS, GitHub, Stripe, Slack, Google) **скрывается до отправки в model** и отмечается как результат по шаблону.
- `cve` в отчёте — утверждение model, которое всегда помечено `cve_verified: false`: подтвердите его через NVD или с помощью `osv-scanner` / `npm audit` / `pip-audit`. Инструмент не выдумывает и не подтверждает CVE.
- «Claude написал код — проверь его и соседний код»: скопируйте готовое правило из `examples/` в `CLAUDE.md` или `AGENTS.md` либо установите необязательный Stop hook или pre-commit hook. Подробности и цепочки команд: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Задачи: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Выбранный model получает только переданный вами текст и никаких инструментов. Текстовый режим печатает только ответ; stderr сообщает model и effort.

### 7d. Перевод: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Параметры: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` или CSV; `=` сохраняет термин), `--keep a,b`, `--notes`, `--strict`. Длинные тексты делятся по пустым строкам (никогда внутри блока кода) и переводятся по частям. После перевода скрипт проверяет, что блоки кода, inline-код, URL, заполнители (`{{x}}`, `${x}`, `%s`), tag и заголовки совпадают с исходником, и сообщает о каждом отличии (`--strict` превращает отличие в exit 11). Этот skill сначала спрашивает о тоне, аудитории и терминах, причём только о том, что нельзя определить автоматически. Автоматические проверки не оценивают естественность языка; важный текст стоит показать носителю.

### 7e. Выбор model и effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Для отдельного запуска: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Приоритет: командная строка, файл проекта, файл пользователя, значение agy по умолчанию. `--effort auto` (по умолчанию) выбирает effort детерминированно и объясняет выбор: для проверок учитывается объём кода (рискованная тема вроде безопасности добавляет один уровень), для задач — формулировка (простые преобразования получают low, задачи с серьёзными рассуждениями — high) и размер входных данных; `max` никогда не выбирается автоматически. **Effort всегда согласуется с model, а не угадывается.** У каждого model своё понимание `--effort`: model agy по умолчанию предлагает `low | medium | high`, model с effort в имени (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) вообще не принимают `--effort`, а model Claude его не поддерживают. Инструмент спрашивает agy, к какому случаю относится model (бесплатная проверка занимает около четырёх секунд и не запускает model), сохраняет ответ для каждой пары model и версии agy в `~/.agy-review-cache.json`, приводит ваш effort к ближайшему поддерживаемому значению (например, `xhigh` становится `high`) и указывает в отчёте фактически использованный вариант. Если список agy изменится, инструмент прочитает ошибку, исправит cache и повторит запуск один раз. `--list-models` показывает допустимые значения для каждого model (`--refresh` запрашивает их заново). Если фильтр содержимого Gemini отклонит prompt и вы не указали model, инструмент один раз повторит запрос с model не от Gemini и сообщит об этом.

### 7f. Параметры и exit code

`bun agy-review.mjs --help` показывает все параметры. Значения exit code: `0` — всё в порядке · `1` — ошибка, тайм-аут или ответ невозможно разобрать · `2` — ошибка использования или отсутствует зависимость · `3` — рабочее дерево изменилось во время Agent-проверки · `4` — результат неоднозначен или неполон (**это не успешная проверка**) · `10` — порог `--fail-on` не пройден (отчёт действителен) · `11` — проверка перевода с `--strict` не пройдена. Если подходят несколько кодов, `3` важнее `10`, а `10` важнее `4`; отчёт записывается всегда, кроме случаев `1` и `2`, поэтому читайте поля `verdict` и `incomplete`. Чистое рабочее дерево не считается ошибкой: инструмент печатает "No changes to review" и завершает работу с кодом 0, не вызывая model.

### 7g. graphify через Antigravity: ноль Agent token на обновление графа

**Если вы используете [graphify](https://github.com/Graphify-Labs/graphify), это самая большая экономия во всём проекте.** graphify превращает repository и документацию в граф знаний. Большая часть работы выполняется детерминированным кодом (tree-sitter, кластеризация, отчёт, cache, merge) и ничего не стоит. Языковой model нужен на двух этапах: **семантическое извлечение данных из документации и статей** и **именование сообществ**. Если backend не закреплён, graphify выбирает его сам, а внутри coding Agent им становится сам coding Agent (или его подписка). Поэтому каждое обновление графа, затрагивающее документ, оплачивается вашими token Opus, Fable или Codex.

**`--graphify` переносит ровно эти два этапа в Antigravity, не меняя остального.** Скрипт запускает небольшой локальный сервер на `127.0.0.1`, который поддерживает протокол, совместимый с OpenAI, и отвечает через `agy`, затем **закрепляет за ним каждый LLM-этап graphify**, поэтому graphify не сможет вернуться к вашему coding Agent или платному API key. Ollama и любые ключи не нужны. (В настройках graphify этот слот называется "ollama": это всего лишь «любой локальный сервер, совместимый с OpenAI».)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Почему права на запись или выполнение команд не нужны.** Может показаться, что здесь нужны Python и запись файлов, но model должен лишь читать и возвращать текст. graphify сам записывает `graphify-out/`; этот инструмент записывает hook, файл блокировки и log. Работающий за сервером model не имеет инструментов, файлов и сети, поэтому внедрённый в документ prompt не может заставить его что-либо сделать. Распознанные секреты в документах скрываются перед отправкой. Так сохраняется обещание остального проекта работать только на чтение.

Настройте один раз для каждого repository:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

В Claude Code или Codex просто попросите: «Настрой обновление graphify через Antigravity» (skill `agy-graphify` / `graphify`, команда `/agy-review:graphify`). Перед добавлением пакета в среду graphify skill спросит разрешение.

Что инструмент делает для вас:

- **git hook:** `post-commit`, `post-merge`, `post-checkout` (только переключение branch) и `post-rewrite` (amend, rebase) запускают обновление **отдельным процессом**, поэтому команда git завершается за долю секунды. Существующее содержимое этих файлов hook сохраняется. По умолчанию **собственные hook graphify заменяются** (они перестраивают только код, а наши делают это и больше; два процесса записи в один граф создадут гонку). `--keep-graphify-hook` сохраняет оба; `--graphify hook-uninstall --restore-graphify` возвращает собственные hook graphify. Копия инструмента в `~/.agy-review/runtime` позволяет hook переживать обновления plugin. Чтобы один раз пропустить обновление, используйте `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **Инкрементальность:** собственный cache graphify определяет, что изменилось; неизменённые документы никогда не отправляются model. Два commit подряд не запускают два обновления одновременно: второй запрашивает ещё один проход.
- **Ваш Agent больше не тратит на это token:** если в `CLAUDE.md` или `AGENTS.md` есть раздел graphify, требующий от Agent перестроить граф, `--graphify rules --write-rules` добавит короткое правило, которое запрещает это делать (ваш текст не редактируется, а если файлов нет, ничего не создаётся).
- **Дёшево по умолчанию:** effort `low`, потому что извлечение данных — структурированная работа. В тесте `low` использовал примерно в 40 раз меньше выходных token, чем `high`, для одного документа (685 против 29,996) и завершился за 15 секунд вместо 207. Измените значение через `--set graphifyEffort=...`, выберите model через `--set graphifyModel=<id>` (см. `--list-models`), задайте параллельные вызовы через `--set graphifyConcurrency=N` и отключите именование сообществ через `--set graphifyLabels=false`.

Честные ограничения: обновления расходуют вашу **quota Antigravity** (в этом и смысл: дешёвый model вместо дорогого, а не «бесплатно»). **Изображения этим способом не извлекаются** (graphify пропускает их для этого backend, а agy не может их видеть через него). Код разбирается локально; текст документации и статей отправляется model Google. Качество извлечения из документов зависит от выбранного model. graphify должен быть установлен (`uv tool install graphifyy`), а его Python должен содержать пакет `openai`: `--graphify setup --yes` добавляет его командой `uv tool install --force "graphifyy[openai]"` (или `pipx inject graphifyy openai`). Подробности, настройки и решение проблем: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. Использование из Agent, sub-agent и циклов

Каждый skill — обычный вызов CLI со стабильным JSON, поэтому им может пользоваться любой Agent: запускайте sub-agent `agy-reviewer`, `agy-security` или `agy-worker` в Claude Code, вызывайте skill в Codex или запускайте скрипт из любого фреймворка.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

Ревьюеру никогда не сообщают, что вы изменили, поэтому каждый проход остаётся независимым. Полный контракт, поля JSON, рецепты циклов и схемы параллельного запуска: [docs/AGENTS.md](AGENTS.md).

## 9. Модель безопасности

**Статические проверки, проверки безопасности символа, файла или фрагмента, задачи и переводы** запускают agy без флагов разрешений и без инструментов в пустой временной папке: agy не может читать или записывать ваши файлы; наружу уходят только данные, которые скрипт поместил в prompt (распознанные секреты скрываются).

**Agent-проверки** (цели git или `--agentic`) запускают agy с `--dangerously-skip-permissions`, чтобы ничего не ожидало prompt, и полагаются на защитный hook `PreToolUse` (`guard.mjs`), который проверяет каждый вызов инструмента и **по умолчанию всё запрещает**:

- разрешены: просмотр файлов и поиск; одиночные и составные shell-команды только из доступных для чтения подкоманд `git`, а также `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (без `-delete`/`-exec`), PowerShell `Get-*`, `Select-String` и ещё несколько команд (список находится в `guard.mjs`);
- запрещены: все инструменты записи, редактирования, notebook, изображений, расписаний, sub-agent, браузера, web и MCP, а также любые неизвестные инструменты; перенаправление, `$(...)`, обратные кавычки, блоки скриптов, конструкции вроде `eval`; `git commit/push/checkout/reset/...`; интерпретаторы и менеджеры пакетов; `curl`, `ssh`; чтение хранилищ учётных данных (`.ssh`, `.aws`, `.gnupg`, закрытые ключи);
- если защита аварийно завершается, она запрещает действие; скрипт не запускает Agent-проверку, пока защита не установлена, не совпадает с включённой в пакет **и для этой защиты и версии agy не сохранён успешный `--verify`**; до и после запуска он снимает отпечатки `git status`, diff отслеживаемых и staged-файлов и содержимого всех неотслеживаемых файлов, а при любом отличии завершает работу с кодом 3 и предупреждением.
- **Секреты в Agent-режиме нельзя скрыть** до того, как ревьюер прочитает файлы. Инструмент обнаруживает их, предупреждает и перечисляет в `limitations`; замените их или проверяйте через `--file` / `--symbol`, где они скрываются заранее.

**Обновления graphify** (`--graphify`) вообще не дают model инструментов: он получает текст через сервер, который слушает только `127.0.0.1`, требует случайный bearer-ключ, существующий только во время одного обновления, отклоняет чужие заголовки `Host` и запускает `agy` в пустой временной папке без флагов разрешений. На диск пишут graphify (`graphify-out/`) и этот инструмент (git hook, `~/.agy-review/runtime`, блокировка и log). Этот hook выполняет код при каждом commit: это тот же уровень доверия, который вы уже даёте собственным hook graphify, а `--graphify hook-uninstall` удаляет их.

Чем это не является:

- **Это не OS sandbox.** Защита фильтрует имена инструментов и текст команд; собственный sandbox agy доступен не везде. Намеренно внедрённый в проверяемый код prompt может попытаться найти разрешённую форму команды. Проверка до и после запуска обнаруживает изменения отслеживаемых и новые файлы, но не чтение.
- **Ваш код отправляется model Google**; чтение не ограничено, кроме путей к учётным данным. Agent-проверка может читать файлы `.env` в repository. Не проверяйте код, которым нельзя делиться.
- git может запускать внешние программы diff или textconv, настроенные в repository: проверяйте только доверенные repository.
- Результаты могут быть ошибочными или неполными, а «ничего не найдено» никогда не означает «безопасно».

## 10. Решение проблем

| Симптом | Причина и решение |
|---|---|
| `Missing: agy CLI` | установите Antigravity CLI и один раз запустите `agy`, чтобы войти; `agy --version` должен работать в shell, где запускается plugin |
| `Missing: read-only guard - missing/outdated` | запустите настройку (`/agy-review:setup`, skill `setup` в Codex или `--install-guard`); она нужна только Agent-проверкам |
| `Not inside a git repository` (exit 2) | перейдите командой `cd` в корень repository или проверяйте код через `--file` / `--symbol` / `--stdin` |
| Вердикт `inconclusive`, exit 4 | это не успешная проверка: результаты отклонены, model разошлись во мнении, код покрыт не полностью или один model завершился с ошибкой. Сузьте область, добавьте `--context` или попробуйте другой `--model` |
| `blocked by Gemini's filters` | фильтр безопасности Gemini отклонил запрос (часто бывает с prompt о безопасности). Без `--model` инструмент повторит запрос с model не от Gemini; иначе выберите его через `--model` |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` или `conflicts with --effort` или `--effort is not supported` | исправлено в 1.0.1: effort автоматически согласуется с model, а в отчёте указывается фактическое значение. Если ошибка осталась, запустите `--list-models --refresh`, обновите plugin (раздел 12) и сообщите о проблеме |
| graphify: `openai package ... missing` | в Python-среде graphify нет пакета `openai`. Запустите `--graphify setup --yes` или `uv tool install --force "graphifyy[openai]"` (для pipx: `pipx inject graphifyy openai`) |
| graphify: граф не обновился после commit | `--graphify status` показывает hook и последний результат; прочитайте `graphify-out/.agy-update.log`; один раз запустите `--graphify update --debug` на переднем плане (каждый запрос и ответ сохраняется в `graphify-out/.agy-debug/`, где будет ваша документация). Если графа ещё нет, hook ничего не делает: один раз создайте его через `--graphify update --full` |
| graphify: `agy returned no answer` для части | graphify повторит эту часть при следующем обновлении. Проверьте вход и quota командой `agy -p "say hi"` или выберите другой model через `--set graphifyModel=<id>` |
| graphify предупреждает, что версии skill и пакета различаются | для этого инструмента это безвредно; обновите graphify командой `uv tool upgrade graphifyy` |
| Пустой отчёт, exit 1 | проверьте вход и quota командой `agy -p "say hi"`; увеличьте `--timeout` для больших целей |
| Exit 3 / рабочее дерево изменилось | что-то изменило файлы во время Agent-проверки (редактор, сборка или обход защиты). Проверьте `git status` и `git diff`; если изменения сделали не вы, считайте это событием безопасности |
| Много отклонённых результатов | model процитировал отсутствующий код. Иногда это ожидаемо; такие результаты никогда не учитываются. Используйте более сильный `--model` или сузьте область |
| `--symbol`: "defined in several places" или "not found" | передайте `--file` или используйте `--file path:A-B`. Поиск эвристический (скобки и отступы), а не полноценный parser |
| Codex: "blocked by sandbox" | см. 5b: нужны сеть, запись в `~/.gemini/antigravity-cli` и локальный сокет |
| Windows: `agy` или `bun` не найден внутри Claude/Codex | shell инструмента использует другой `PATH`; запускайте его из shell, где команда работает |
| `verify` печатает FAIL | не используйте Agent-проверки для важного кода; создайте issue с выводом и результатом `agy --version` |

## 11. Частые вопросы

**Инструмент изменяет мой код?** Нет. Статические режимы не могут этого сделать; Agent-режим блокирует запись и предупреждает, если после запуска дерево отличается. Инструмент никогда не выполняет commit, stash или checkout.

**Bun здесь быстрее Node?** Заметной разницы нет. На Windows автора запуск занимал около 56 ms с Node и 64 ms с Bun, а защитный hook — около 60 ms против 57 ms; проверка длится десятки секунд, и это время тратит model. В документации по умолчанию используется Bun; Node 18.18+ работает так же. Оба покрыты одним кодом.

**Это стоит денег?** Этот plugin бесплатен. Каждая проверка, задача, перевод и обновление graphify расходует вашу quota Antigravity.

**Нужен ли Ollama или API key для graphify?** Нет. В graphify есть backend-слот с именем "ollama", который означает «любой локальный сервер, совместимый с OpenAI»; за ним стоит небольшой сервер Antigravity из этого инструмента. Нужно установить только Python-пакет `openai` для graphify, который добавляет `--graphify setup --yes`.

**graphify всё ещё будет тратить мои token Claude или Codex?** Только если вы или ваш Agent сами запустите `/graphify --update`, `graphify extract` или похожую команду либо если раздел `CLAUDE.md` / `AGENTS.md` требует от Agent перестроить граф. Добавьте запрещающее правило через `--graphify rules --write-rules`.

**Какие файлы видит Antigravity?** В статических режимах — только код, который отправляет скрипт (и ограниченный связанный код для `--security`). В Agent-режимах — всё, что он прочитает в repository и на диске вне путей к учётным данным.

**Инструмент может исправить результаты?** Нет. Исправления делает другой Agent или вы; ревьюер только проверяет и поэтому остаётся независимым.

**Он может проверить pull request на GitHub?** Сделайте checkout branch локально и используйте `--base`. Доступа к GitHub API нет.

**Почему бы не добавить разрешённые команды в настройки agy?** Проверено: в headless-режиме agy требует точного совпадения многословных разрешений (`git status` подходит, `git status --short` — нет), а действие «разрешить» из hook не отменяет проверку разрешений. Надёжно hook умеет только запрещать, поэтому Agent-режим использует skip-permissions и защиту, которая по умолчанию всё запрещает, а статический режим не использует инструменты вообще.

**Можно добавить разрешённые команды или правила сканера?** Измените `CMDS` / `GIT_OK` в `guard.mjs` или `RULES` в `lib/security.mjs`, запустите `npm test`, затем `--install-guard`.

## 12. Обновление, удаление и разработка

### Как обновиться до новой версии

Новая release не устанавливается сама: обновление запускаете вы. Четыре шага.

**1. Проверьте текущую версию и наличие более новой**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

Список release также доступен по адресу https://github.com/Ealireza/agy-review/releases, а изменения перечислены в [changelog](../CHANGELOG.md).

**2. Обновите plugin для своей среды**

| Среда | Команды (запускайте в обычном терминале) | Затем |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` и затем `claude plugin update agy-review@agy-review` | перезапустите Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review`, затем `codex plugin remove agy-review@agy-review` и `codex plugin add agy-review@agy-review` | перезапустите Codex |
| Обычный clone | `git pull` в вашем clone | ничего |

**3. Обновите части вне папки plugin**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Проверьте результат:** `--version` показывает новый номер, `--check` сообщает OK для всех пунктов, а `--list-models --refresh` заново считывает допустимые значения `--effort` для каждого model.

Если после обновления что-то сломалось: запустите `--check`, прочитайте таблицу решения проблем (раздел 10), а если нужно вернуться к старой версии, удалите plugin и установите конкретную release командой `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. Ваши настройки (`.agy-review.json`) — обычные файлы, которые обновления не затрагивают.

### Удаление

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Удалите `~/.agy-review` (копия runtime) и `~/.agy-review-cache.json` (cache effort), если не хотите оставлять ничего.

### Разработка

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

Будем рады issue и pull request, особенно с результатами `verify` на macOS и Linux, рабочими настройками sandbox Codex, способами обойти защиту (по возможности сначала сообщите приватно) и новыми правилами сканера. Для перевода: скопируйте `README.md` в `docs/README.<code>.md`, переведите и добавьте язык в строку переключателя во всех файлах.

## Лицензия

MIT, см. [LICENSE](../LICENSE).
