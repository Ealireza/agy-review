# agy-review

**Ein unabhängiger Reviewer, der seine Arbeit belegen muss.** Code-Review, Sicherheitsprüfung, Aufgabendelegation und Übersetzung mit Google Antigravity (`agy`) – aus Claude Code, Codex oder jedem Terminal. Schreibgeschützt, ohne Berechtigungsabfragen, und jeder Fund wird an deinem echten Code geprüft, bevor du ihn siehst.

> ## NEU: Verschwende keine Claude- und Codex-token mehr darauf, deinen graphify-Graphen zu aktualisieren
>
> **graphify-Updates laufen jetzt bei jedem commit, merge, checkout und rebase im Hintergrund auf Antigravity. Dein Agent verbraucht dafür 0 token, und du brauchst keinen API key.**
>
> Ein einziger Befehl, `agy-review --graphify setup`, registriert die git hooks von graphify neu. Dadurch erledigt **ein günstiges Antigravity-model statt deiner Opus- oder Fable-Sitzung den teuren Teil jedes Graph-Updates: deine Dokumentation lesen und Communities mit einem model benennen.** `git commit` ist in einem Sekundenbruchteil fertig, und der Graph wird selbstständig nachgezogen.
>
> In einem echten Lauf unter Windows aktualisierte ein commit mit Änderungen an Code und Dokumentation den Graphen in **22 Sekunden, mit einem einzigen Antigravity-Aufruf und 0 Claude- oder Codex-token.** Das model dahinter kann nur Text lesen und Text ausgeben: Es hat keine Tools und keine Schreib- oder Ausführungsrechte. Details und Einrichtung: Abschnitt 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · **Deutsch** · [Français](README.fr.md)

Website: https://ealireza.github.io/agy-review/ · Vertiefende Texte (Englisch): [docs/AGENTS.md](AGENTS.md) zu Agents und Schleifen, [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) zur Sicherheitsmethode.

---

## Inhalt

1. Was du bekommst
2. Warum du dem Bericht vertrauen kannst
3. Status: Was geprüft ist und was nicht
4. Voraussetzungen
5. Installation
6. Erster Lauf: auf deinem Rechner prüfen
7. Verwendung: Review, Sicherheit, Aufgaben, Übersetzung, models, graphify
8. Verwendung aus Agents, sub-agents und Schleifen
9. Sicherheits-model
10. Fehlerbehebung
11. FAQ
12. Aktualisieren (neue Version beziehen), deinstallieren, entwickeln

---

## 1. Was du bekommst

| Skill (Claude Code / Codex) | Befehl (Claude Code) | Funktion |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | bewertet git-Änderungen, eine branch, eine Datei, einen Zeilenbereich, eine Funktion oder einen Ausschnitt |
| `agy-security` / `security` | `/agy-review:security` | Sicherheitsprüfung: OWASP/CWE, Ausnutzbarkeit, Angriffsszenario, Scanner für Geheimnisse und gefährliche Muster sowie aufrufende und aufgerufene Funktionen als Kontext |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | übergibt eine eigenständige Aufgabe (umschreiben, zusammenfassen, entwerfen, extrahieren) an Antigravity und gibt das Ergebnis zurück |
| `agy-translate` / `translate` | `/agy-review:translate` | übersetzt mit gewünschtem Ton, Zielgruppe und Glossar; prüft, ob Code, URLs, Platzhalter und Struktur erhalten blieben |
| `agy-models` / `models` | `/agy-review:models` | listet die models in deinem agy und die jeweils akzeptierten `--effort`-Werte auf; wählt eines und speichert es für das Projekt oder global |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **hält einen graphify-Graphen über git hooks auf Antigravity aktuell: 0 Claude- oder Codex-token, kein API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | prüft Voraussetzungen, installiert den Schreibschutz und belegt auf deinem Rechner, dass Schreibzugriffe blockiert sind |

Sub-agents für Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Alles steckt in einem repository und einem Script (`plugins/agy-review/scripts/agy-review.mjs`). Es gibt keinen Server und neben deinem eigenen Antigravity-Login kein weiteres Konto.

## 2. Warum du dem Bericht vertrauen kannst

Ein model, das Code prüft, erfindet manchmal ein Problem. Dieses Tool glaubt ihm nichts ungeprüft.

1. Der Reviewer muss einen streng strukturierten JSON-Bericht zurückgeben (erzwungen durch `--json-schema`). Jeder Fund enthält den **exakten betroffenen Code**.
2. Das Script sucht dieses Zitat in der echten Datei. **Nicht gefunden: Der Fund wird verworfen** und separat aufgeführt. **In einer anderen Zeile gefunden: Die Zeilennummer wird korrigiert.** Zu kurze oder allgemeine Zitate, die nichts belegen (`return null;`, `}`), werden verworfen. Ein Zitat, das weit von der angegebenen Zeile entfernt mehrfach vorkommt, wird als mehrdeutig verworfen.
3. Urteil, Anzahl und CI-Gate werden **vom Script berechnet** – ausschließlich aus bestätigten Funden und niemals aus dem model kopiert.
4. Kein bestätigter Fund ist **keine** Freigabe: Wurden Funde verworfen, waren models uneinig, wurde der Code nicht abgedeckt oder fiel eines von mehreren models aus, lautet das Urteil `inconclusive`, und der exit code ist 4.
5. Funde außerhalb der angeforderten Zeilen werden markiert und beeinflussen das Gate nie. Funde mit geringer Zuverlässigkeit werden aufgeführt, aber nicht gezählt.
6. Schweregrad (Auswirkung) und Priorität (Zeitpunkt der Behebung) sind getrennt und bleiben stimmig: Kritisch ist immer P0, eine Kleinigkeit immer P3, und Stilprobleme liegen nie über „niedrig“.

Weiterhin möglich ist ein korrektes Zitat mit einer falschen Schlussfolgerung. Das Zitat beweist, dass der Code existiert, nicht dass die Begründung stimmt. Deshalb enthält jeder Fund ein konkretes Szenario, und deshalb solltest du vor einer Änderung die genannten Zeilen lesen.

Echtes Beispiel mit diesem Tool und einer kleinen Datei mit zwei absichtlich eingebauten Fehlern (Claude Sonnet 4.6 über agy): 4 bestätigte Funde in den richtigen Zeilen mit CWE-89, CWE-78, CWE-22 und CWE-369, 100 % Abdeckung, ein entferntes Duplikat, und der Scanner markierte unabhängig davon dieselben zwei Zeilen.

## 3. Status: Was geprüft ist und was nicht

| Prüfung | Ergebnis |
|---|---|
| Unit- und Pipeline-Tests (`npm test`): Belegprüfung, Umfang, Urteil, Deduplizierung, Symbolsuche, Ziele, Konfiguration, models, Aufgaben, Übersetzung, Sicherheit, Schwärzung | 72 Tests, alle erfolgreich, mit einem simulierten `agy` (einschließlich agentischer Pipeline, Erkennung von Änderungen am Arbeitsbaum, einem ausfallenden model und dem `verify`-Gate) |
| Guard hook (erlaubte und verbotene Befehle, Tools, Tricks mit Anführungszeichen, Pfade zu Zugangsdaten) | automatisierte Tests, erfolgreich |
| Claude Code-Manifeste (`claude plugin validate`), Antigravity-plugin (`agy plugin validate --strict`) | erfolgreich |
| Codex 0.163.0: marketplace hinzugefügt, plugin installiert, skills erkannt | unter Windows 11 geprüft |
| Statischer Review, Sicherheitsprüfung und Aufgaben mit echtem agy 1.4.8 (Gemini 3.8 Flash und Claude Sonnet 4.6), ausgeführt mit Bun 1.3.14 | unter Windows 11 geprüft; Funde in den richtigen Zeilen belegt |
| `--effort` je model: Standard-model (low, medium, high), models mit effort im Namen und Claude-models ohne `--effort` | mit echtem agy 1.4.8 geprüft |
| graphify auf Antigravity, vollständig: echtes graphify 0.9.86 plus echtes agy 1.4.8 unter Windows. Ein git hook aktualisierte den Graphen im Hintergrund (22 s, 1 Antigravity-Aufruf, `git commit` kehrte nach 0.3 s zurück), und nur das geänderte Dokument wurde an das model gesendet | manuell sowie mit Tests mit simuliertem graphify und agy geprüft |
| Zwei unabhängige Reviews von Design und Code (Opus: 25 Funde; Codex: 28 Funde), bestätigte Punkte jeweils mit Regressionstest behoben | erledigt, siehe changelog |
| **Agentische Reviews (`agy --dangerously-skip-permissions` plus Guard, der echte Schreibzugriffe blockiert)** | **vom Autor nicht ausgeführt** |

Vom Autor nicht getestet: `--graphify setup --yes` mit einer echten `uv tool`-Installation von graphify (beim manuellen Test kam graphify aus pip und enthielt das Paket `openai` bereits). Die Zeile zu agentischen Reviews ist sicherheitsrelevant und hängt von deiner agy-Version ab. Führe deshalb nach der Installation und nach jedem agy-Update einmal `verify` aus (Abschnitt 6). Statische Reviews, Sicherheitsprüfungen eines Symbols/einer Datei/eines Ausschnitts, Aufgaben und Übersetzungen verwenden dieses Flag nie und können nichts schreiben.

Getestet mit agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 und Node 24 unter Windows 11. macOS und Linux sollten funktionieren (agy verwendet auf allen Plattformen `~/.gemini/config/plugins`), wurden aber nicht getestet.

## 4. Voraussetzungen

Sonst nichts: keine weiteren plugins, keine weiteren CLI-Tools.

| Benötigt | Wozu | Bezugsquelle | Prüfung |
|---|---|---|---|
| Antigravity CLI `agy` | erledigt die Arbeit | https://antigravity.google/cli, danach `agy` einmal ausführen und anmelden | `agy --version` |
| Bun (empfohlen) **oder** Node.js 18.18+ | führt das Script und den Guard hook aus | https://bun.sh oder https://nodejs.org | `bun --version` / `node --version` |
| git | git-Ziele und zu Funden gehörender Code | https://git-scm.com | `git --version` |
| Claude Code **oder** Codex **oder** ein beliebiges Terminal | dort stellst du deine Anfrage | jeweilige Installationsanleitung | `claude --version` / `codex --version` |

Bun ist in allen Anleitungen und im Guard hook der Standard (`bun guard.mjs || node guard.mjs`); Node funktioniert genauso. Die Nutzung von Antigravity wird auf deine eigene quota angerechnet. Ein Review kann wenige Sekunden bis mehrere Minuten dauern.

## 5. Installation

Wähle deinen Host. Mehrere Hosts können dasselbe Script und denselben Guard verwenden.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` prüft agy, git und den Guard und installiert ihn unter `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` ist der praktische Sicherheitsnachweis.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Starte Codex neu und frage dann in normaler Sprache: „Prüfe meine Antigravity-Review-Einrichtung“, „Prüfe meine Änderungen mit Antigravity“, „Führe eine Sicherheitsprüfung der Funktion saveUpload durch“, „Übersetze README.md ins Deutsche, in freundlichem Ton“.

1. **Installiere den Guard einmal aus einem normalen Terminal** (er schreibt nach `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; der Ordnername ist die installierte Version, verwende nach einem Update also den vorhandenen Ordner). Nur agentische git-Reviews brauchen den Guard.
2. **Der sandbox von Codex muss agy arbeiten lassen:** ausgehende Netzwerkverbindungen, Schreibzugriff auf `~/.gemini/antigravity-cli` und einen localhost-Socket. Mit `workspace-write` brauchst du in `~/.codex/config.toml` wahrscheinlich:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Falls weiterhin etwas blockiert wird, nennt der skill den fehlenden Zugriff und stoppt. Er erweitert Berechtigungen nie selbst. Ob agy in deinem Codex-sandbox korrekt läuft, konnte der Autor an der Codex-Einrichtung nicht testen. Führe `verify` deshalb auch in Codex aus.

### 5c. Normales Terminal

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

Tipp: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Nur Antigravity

Der Guard ist ein gewöhnliches Antigravity-plugin. Kopiere `plugins/agy-review/antigravity-plugin/readonly-review` nach `~/.gemini/config/plugins/readonly-review` oder führe `--install-guard` aus. Prüfe ihn mit `agy plugin list`. Er tut nichts, solange ein prompt nicht `AGY_READONLY_REVIEW` enthält; deine normalen agy-Sitzungen bleiben also unverändert. Außerdem enthält er einen `readonly-code-review`-skill für interaktives agy.

## 6. Erster Lauf: auf deinem Rechner prüfen

Führe dies einmal nach der Installation und nach jedem agy-Update aus: `/agy-review:verify`, den Codex-skill `verify` oder `--verify`. Dabei erfolgt ein kleiner echter agy-Aufruf in einem temporären Ordner: Eine Datei lesen (muss funktionieren), eine Datei schreiben, in eine Datei umleiten und eine Datei löschen (muss alles blockiert werden). Erwartete Ausgabe:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Jedes `FAIL` endet mit `NOT VERIFIED`, und agentische Reviews bleiben deaktiviert. Eröffne dann ein Issue mit der Ausgabe und deiner `agy --version`. Ein erfolgreiches `verify` wird genau für diesen Guard und diese agy-Version gespeichert. **Agentische Reviews starten ohne diesen Nachweis nicht**, und ein Update von agy oder Guard macht ihn ungültig. Führe `verify` nach Updates also erneut aus. Statische Modi brauchen ihn nicht.

## 7. Verwendung

Führe die Befehle im Stammverzeichnis des repository aus.

### 7a. Review: Ziel auswählen

| Zu prüfen | Verwendung | Modus |
|---|---|---|
| nicht committete Arbeit | nichts | agentisch, schreibgeschützt |
| eine branch / vorgemerkte Änderungen / ein commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentisch, schreibgeschützt |
| eine Datei oder ein Bereich | `--file src/a.kt` oder `--file src/a.kt:40-80` (wiederholbar) | statisch |
| eine Funktion oder Klasse | `--symbol parseConfig` (+ `--file`, falls der Name mehrdeutig ist) | statisch |
| Code, der nur im Speicher existiert | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | statisch |
| eines dieser Ziele plus Erlaubnis, andere Dateien anzusehen | `--agentic` hinzufügen | agentisch, schreibgeschützt |

*Statisch*: Das Script liest und nummeriert den Code selbst, und das model erhält keine Tools. So kann nichts verändert werden, und es kann nichts über Dateien erfunden werden, die ihm nicht gezeigt wurden. *Agentisch*: Der Reviewer liest das repository selbst über den Guard hook, der jeden Schreibzugriff blockiert.

Hilf dem Reviewer mit `--context "what this code must do"`, `--focus "concurrency, error handling"` (oder nachgestellten Wörtern) und `--context-lines N`.

Ausgabe: standardmäßig Markdown; `--format json` für Maschinen; `--output file`; `--fail-on high` (exit 10, wenn ein bestätigter Fund mit hohem oder kritischem Schweregrad existiert); `--previous old.json` markiert Funde als neu, fortbestehend, behoben oder nicht erneut gemeldet.

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

### 7b. Sicherheitsprüfung

`--security` (skill `agy-security`, Befehl `/agy-review:security`, sub-agent `agy-security`) funktioniert mit jedem obigen Ziel und ergänzt: eine Bedrohungs-model-Methode (von einer nicht vertrauenswürdigen Quelle zu einer gefährlichen Senke, einschließlich der dazwischenliegenden Kontrollen), Zuordnung zu OWASP Top 10 (2021) und CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, einen model-freien Scanner für Geheimnisse und etwa 25 Klassen gefährlicher Muster sowie **zugehörigen Code**: was das Ziel aufruft und von wo es aufgerufen wird.

- Ein fest codiertes Geheimnis (privater Schlüssel, AWS, GitHub, Stripe, Slack, Google) wird **geschwärzt, bevor irgendetwas an ein model gesendet wird**, und anhand des Musters als Fund gemeldet.
- Ein `cve` in einem Bericht ist eine Behauptung des models und immer mit `cve_verified: false` gekennzeichnet. Bestätige sie auf NVD oder mit `osv-scanner` / `npm audit` / `pip-audit`. Das Tool erfindet oder bestätigt niemals CVEs.
- „Claude hat Code geschrieben; prüfe ihn und seine Nachbarn“: Kopiere die fertige Regel aus `examples/` in deine `CLAUDE.md` oder `AGENTS.md`, oder installiere den optionalen Stop hook oder pre-commit hook. Details und Abläufe: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Aufgaben: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Das model erhält nur den übergebenen Text und keine Tools. Im Textmodus erscheint auf stdout nur die Antwort; stderr meldet model und effort.

### 7d. Übersetzung: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Optionen: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` oder CSV; `=` behält den Begriff bei), `--keep a,b`, `--notes`, `--strict`. Lange Texte werden an Leerzeilen in Abschnitte geteilt (nie innerhalb eines Codeblocks) und abschnittsweise übersetzt. Danach prüft das Script, ob Codeblöcke, Inline-Code, URLs, Platzhalter (`{{x}}`, `${x}`, `%s`), tags und Überschriften mit der Quelle übereinstimmen, und meldet jede Abweichung (`--strict` macht daraus exit 11). Die skills fragen zuerst nach Ton, Zielgruppe und Begriffen – aber nur, wenn sie diese nicht selbst ableiten können. Maschinelle Prüfungen können Sprachqualität nicht bewerten; wichtige Texte sollte ein Muttersprachler prüfen.

### 7e. Models und effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Pro Lauf: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Vorrang: Befehlszeile, Projektdatei, Benutzerdatei, agy-Standard. `--effort auto` (der Standard) ist eine deterministische und erklärte Wahl: Reviews skalieren mit der Menge des betroffenen Codes (ein risikorelevanter Fokus wie Sicherheit erhöht um eine Stufe), Aufgaben mit ihrer Formulierung (mechanische Umwandlungen niedrig, anspruchsvolle Überlegungen hoch) und der Eingabelänge; `max` wird nie automatisch gewählt. **Der effort wird immer an das model angepasst und nie geraten.** Jedes model versteht unter `--effort` etwas anderes: Das Standard-model von agy bietet `low | medium | high`; models mit effort im Namen (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) akzeptieren gar kein `--effort`, und Claude-models unterstützen es nicht. Das Tool fragt agy, zu welchem Fall ein model gehört (eine kostenlose Prüfung, die etwa vier Sekunden dauert und keinen model-Aufruf startet), speichert die Antwort je model und agy-Version in `~/.agy-review-cache.json`, setzt deinen effort auf den nächsten akzeptierten Wert (zum Beispiel wird `xhigh` zu `high`) und nennt im Bericht den tatsächlich verwendeten Wert. Ändert sich die Liste von agy, wird der Fehler gelesen, der Cache korrigiert und der Lauf einmal wiederholt. `--list-models` zeigt, was jedes model akzeptiert (`--refresh` fragt erneut ab). Lehnt Geminis Inhaltsfilter einen prompt ab und hast du kein model festgelegt, versucht es das Tool einmal mit einem Nicht-Gemini-model und weist darauf hin.

### 7f. Optionen und exit codes

`bun agy-review.mjs --help` listet alles auf. Exit codes: `0` OK · `1` Fehler, Zeitüberschreitung oder nicht lesbare Antwort · `2` Anwendungsfehler oder fehlende Voraussetzung · `3` der Arbeitsbaum änderte sich während eines agentischen Reviews · `4` nicht schlüssig oder unvollständig (**kein Erfolg**) · `10` das `--fail-on`-Gate schlug fehl (der Bericht ist gültig) · `11` Übersetzungsprüfung mit `--strict` fehlgeschlagen. Treffen mehrere zu, hat `3` Vorrang vor `10` und `10` vor `4`. Außer bei `1` und `2` wird immer ein Bericht geschrieben; lies darin also `verdict` und `incomplete`. Ein sauberer Arbeitsbaum ist kein Fehler: Das Tool gibt „No changes to review“ aus, beendet sich mit 0 und ruft kein model auf.

### 7g. graphify auf Antigravity: null Agent-token für Graph-Updates

**Wenn du [graphify](https://github.com/Graphify-Labs/graphify) verwendest, sparst du hier im gesamten Projekt am meisten.** graphify macht aus einem repository und seiner Dokumentation einen Wissensgraphen. Der Großteil der Arbeit ist deterministischer Code (tree-sitter, Clustering, Bericht, Cache, Zusammenführung) und kostet nichts. Zwei Schritte brauchen ein model: **die semantische Extraktion von Dokumenten und Fachartikeln** und **die Benennung von Communities**. Wenn du kein Backend festlegst, wählt graphify selbst eines. Innerhalb eines Coding-Agents ist das der Coding-Agent beziehungsweise dessen Abonnement. So bezahlst du jede Graph-Aktualisierung, die ein Dokument betrifft, mit deinen Opus-, Fable- oder Codex-token.

**`--graphify` verschiebt genau diese beiden Schritte zu Antigravity und lässt alles andere unverändert.** Das Script startet auf `127.0.0.1` einen kleinen lokalen Server, der das OpenAI-kompatible Protokoll spricht und mit `agy` antwortet. Danach **bindet es jeden LLM-Schritt von graphify fest an diesen Server**, sodass graphify nie auf deinen Coding-Agent oder einen kostenpflichtigen API key zurückfallen kann. Du brauchst weder Ollama noch irgendeinen Schlüssel. (graphify nennt diesen Platz in den Einstellungen „ollama“; gemeint ist lediglich „ein beliebiger lokaler OpenAI-kompatibler Server“.)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Warum keine Schreib- oder Ausführungsrechte nötig sind.** Vielleicht erwartest du, dass hierfür Python und Dateischreibzugriffe nötig sind. Das model muss aber nur Text lesen und Text ausgeben. graphify selbst schreibt `graphify-out/`; dieses Tool schreibt die hooks, eine Sperrdatei und ein Log. Das model hinter dem Server hat keine Tools, keine Dateien und kein Netzwerk. Eine in einem Dokument versteckte prompt injection kann es zu nichts veranlassen. Erkannte Geheimnisse in deiner Dokumentation werden vor dem Senden geschwärzt. So bleibt das Schreibschutzversprechen des übrigen Projekts erhalten.

Einmal pro repository einrichten:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

Bitte in Claude Code oder Codex einfach darum, „graphify-Updates auf Antigravity einzurichten“ (skill `agy-graphify` / `graphify`, Befehl `/agy-review:graphify`). Der skill fragt nach, bevor er der Umgebung von graphify ein Paket hinzufügt.

Das erledigt es für dich:

- **Hooks:** `post-commit`, `post-merge`, `post-checkout` (nur branch-Wechsel) und `post-rewrite` (amend, rebase) führen das Update **abgekoppelt** aus; der git-Befehl kehrt deshalb in einem Sekundenbruchteil zurück. Vorhandener Inhalt dieser hook-Dateien bleibt erhalten. Standardmäßig werden **die eigenen hooks von graphify ersetzt** (sie bauen nur Code neu auf; unsere tun das und mehr, und zwei Schreibprozesse auf demselben Graphen würden kollidieren). `--keep-graphify-hook` behält beide; `--graphify hook-uninstall --restore-graphify` stellt die graphify-eigenen wieder her. Eine Kopie dieses Tools unter `~/.agy-review/runtime` sorgt dafür, dass die hooks plugin-Updates überstehen. Einmalig überspringen mit `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **Inkrementell:** Der eigene Cache von graphify entscheidet, was sich geändert hat. Unveränderte Dokumente werden nie an das model gesendet. Zwei commits direkt nacheinander starten nie zwei Updates gleichzeitig; der zweite fordert einen weiteren Durchlauf an.
- **Dein Agent verbraucht dafür keine token mehr:** Enthält `CLAUDE.md` oder `AGENTS.md` einen graphify-Abschnitt, der den Agent zum Neuaufbau des Graphen auffordert, hängt `--graphify rules --write-rules` eine kurze Gegenregel an (dein eigener Text wird nie bearbeitet, und wenn die Dateien nicht existieren, wird nichts erstellt).
- **Standardmäßig günstig:** effort `low`, weil die Extraktion strukturierte Arbeit ist. In einem Test verbrauchte `low` für dasselbe Dokument etwa 40-mal weniger Ausgabe-token als `high` (685 statt 29,996) und war in 15 statt 207 Sekunden fertig. Ändere ihn mit `--set graphifyEffort=...`, wähle das model mit `--set graphifyModel=<id>` (siehe `--list-models`), nutze `--set graphifyConcurrency=N` für parallele Aufrufe und `--set graphifyLabels=false`, um die Benennung von Communities auszulassen.

Ehrliche Grenzen: Updates verwenden deine **Antigravity-quota** (genau darum geht es: ein günstiges statt eines teuren models, nicht „kostenlos“). **Bilder werden auf diesem Weg nicht extrahiert** (graphify überspringt sie für dieses Backend, und agy kann sie darüber nicht sehen). Code wird lokal geparst; Dokumente und Fachartikel gehen als Text an Googles model. Die Qualität der Dokumentextraktion hängt von deinem gewählten model ab. graphify muss installiert sein (`uv tool install graphifyy`), und sein eigenes Python braucht das Paket `openai`: `--graphify setup --yes` fügt es mit `uv tool install --force "graphifyy[openai]"` hinzu (oder `pipx inject graphifyy openai`). Details, Einstellungen und Fehlerbehebung: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. Verwendung aus Agents, sub-agents und Schleifen

Jeder skill ist ein einfacher CLI-Aufruf mit stabilem JSON, sodass jeder Agent ihn verwenden kann: Starte in Claude Code den sub-agent `agy-reviewer`, `agy-security` oder `agy-worker`, rufe die skills in Codex auf oder verwende das Script aus einem beliebigen Framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

Dem Reviewer wird nie gesagt, was du geändert hast. So bleibt jeder Durchlauf unabhängig. Vollständiger Vertrag, JSON-Felder, Schleifenrezepte und Fan-out-Muster: [docs/AGENTS.md](AGENTS.md).

## 9. Sicherheits-model

**Statische Reviews, Sicherheitsprüfungen eines Symbols/einer Datei/eines Ausschnitts, Aufgaben und Übersetzungen** führen agy ohne Berechtigungs-Flag und ohne Tools in einem leeren temporären Ordner aus. agy kann deine Dateien weder lesen noch schreiben. Nur die Daten, die das Script in den prompt eingefügt hat, verlassen den Rechner (erkannte Geheimnisse werden geschwärzt).

**Agentische Reviews** (git-Ziele oder `--agentic`) starten agy mit `--dangerously-skip-permissions`, damit nichts auf eine Abfrage wartet, und verlassen sich auf einen `PreToolUse`-Guard hook (`guard.mjs`), der jeden Tool-Aufruf prüft und **standardmäßig ablehnt**:

- erlaubt: Tools zum Anzeigen und Suchen von Dateien; einzelne oder verkettete Shell-Befehle, die nur aus schreibgeschützten `git`-Unterbefehlen, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (ohne `-delete`/`-exec`), PowerShell-`Get-*`, `Select-String` und einigen weiteren bestehen (die Liste steht in `guard.mjs`);
- verboten: jedes Tool zum Schreiben/Bearbeiten, für Notebooks/Bilder/Zeitpläne/sub-agents/Browser/Web/MCP sowie jedes unbekannte Tool; Umleitungen, `$(...)`, Backticks, Scriptblöcke, `eval`-ähnliche Konstrukte; `git commit/push/checkout/reset/...`; Interpreter und Paketmanager; `curl`, `ssh`; Lesen von Zugangsdaten-Speichern (`.ssh`, `.aws`, `.gnupg`, private Schlüssel);
- stürzt der Guard ab, lehnt er ab; das Script startet keinen agentischen Lauf, solange der Guard nicht installiert und mit der mitgelieferten Version identisch ist **und für genau diesen Guard und diese agy-Version ein erfolgreiches `--verify` gespeichert wurde**; vor und nach dem Lauf erstellt es Fingerabdrücke von `git status`, den diffs verfolgter und vorgemerkter Dateien sowie dem Inhalt jeder nicht verfolgten Datei und beendet sich bei Abweichungen mit exit 3 und einer Warnung;
- **Geheimnisse im agentischen Modus können nicht geschwärzt werden**, bevor der Reviewer die Dateien liest. Das Tool erkennt sie, warnt und führt sie unter `limitations` auf. Rotiere sie oder prüfe mit `--file` / `--symbol`, wobei sie zuerst geschwärzt werden.

**graphify-Updates** (`--graphify`) geben dem model überhaupt keine Tools. Es erhält Text über einen Server, der nur auf `127.0.0.1` lauscht, einen zufälligen Bearer-Schlüssel verlangt, der nur für die Dauer eines Updates existiert, fremde `Host`-Header ablehnt und `agy` ohne Berechtigungs-Flag in einem leeren temporären Ordner ausführt. Auf die Festplatte schreiben graphify (`graphify-out/`) und dieses Tool (git hooks, `~/.agy-review/runtime`, eine Sperre und ein Log). Die hooks führen bei jedem commit Code aus. Das ist dasselbe Vertrauen, das du bereits den graphify-eigenen hooks gibst; `--graphify hook-uninstall` entfernt sie.

Was es nicht ist:

- **Kein OS-sandbox.** Der Guard filtert Toolnamen und Befehlstext; agys eigener sandbox ist nicht überall verfügbar. Eine absichtliche, im geprüften Code versteckte prompt injection könnte nach einer akzeptierten Befehlsform suchen. Die Vorher-/Nachher-Prüfung erkennt veränderte verfolgte Dateien und neue Dateien, aber keine Lesezugriffe.
- **Dein Code wird an Googles model gesendet**; Lesezugriffe sind abgesehen von Pfaden zu Zugangsdaten nicht eingeschränkt. `.env`-Dateien im repo sind für agentische Reviews lesbar. Prüfe keinen Code, den du nicht weitergeben darfst.
- git kann externe diff- oder textconv-Programme ausführen, die in einem repository konfiguriert sind. Prüfe nur repositories, denen du vertraust.
- Funde können falsch oder unvollständig sein, und „keine Funde“ bedeutet nie „sicher“.

## 10. Fehlerbehebung

| Symptom | Ursache und Lösung |
|---|---|
| `Missing: agy CLI` | installiere die Antigravity CLI und führe `agy` einmal aus, um dich anzumelden; `agy --version` muss in der Shell funktionieren, die das plugin ausführt |
| `Missing: read-only guard - missing/outdated` | führe die Einrichtung aus (`/agy-review:setup`, den Codex-skill `setup` oder `--install-guard`); nur agentische Reviews brauchen ihn |
| `Not inside a git repository` (exit 2) | wechsle mit `cd` in das Stammverzeichnis des repository oder prüfe Code mit `--file` / `--symbol` / `--stdin` |
| Urteil `inconclusive`, exit 4 | kein Erfolg: Funde wurden verworfen, models waren uneinig oder deckten den Code nicht ab, oder ein model fiel aus. Grenze den Umfang ein, ergänze `--context` oder probiere ein anderes `--model` |
| `blocked by Gemini's filters` | Geminis Sicherheitsfilter hat abgelehnt (bei Sicherheits-prompts häufig). Ohne `--model` versucht es das Tool mit einem Nicht-Gemini-model erneut; andernfalls wähle eines mit `--model` |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` oder `conflicts with --effort` oder `--effort is not supported` | in 1.0.1 behoben: Der effort wird automatisch an das model angepasst, und der Bericht nennt den verwendeten Wert. Falls der Fehler weiter auftritt, führe `--list-models --refresh` aus, aktualisiere das plugin (Abschnitt 12) und melde ihn |
| graphify: `openai package ... missing` | Im eigenen Python von graphify fehlt das Paket `openai`. Führe `--graphify setup --yes` oder `uv tool install --force "graphifyy[openai]"` aus (pipx: `pipx inject graphifyy openai`) |
| graphify: Der Graph wurde nach einem commit nicht aktualisiert | `--graphify status` zeigt die hooks und das letzte Ergebnis; lies `graphify-out/.agy-update.log`; führe einmal `--graphify update --debug` im Vordergrund aus (jede Anfrage und Antwort bleibt dabei in `graphify-out/.agy-debug/`; diese Dateien enthalten deine Dokumentation). Ohne vorhandenen Graphen tut der hook nichts: Erstelle ihn einmal mit `--graphify update --full` |
| graphify: `agy returned no answer` für einen Abschnitt | graphify versucht den Abschnitt beim nächsten Update erneut. Prüfe Anmeldung und quota mit `agy -p "say hi"` oder wähle mit `--set graphifyModel=<id>` ein anderes model |
| graphify warnt, dass skill- und Paketversion unterschiedlich sind | für dieses Tool harmlos; aktualisiere graphify mit `uv tool upgrade graphifyy` |
| Leerer Review, exit 1 | prüfe Anmeldung und quota mit `agy -p "say hi"`; erhöhe bei großen Zielen `--timeout` |
| Exit 3 / Arbeitsbaum geändert | Etwas hat deine Dateien während eines agentischen Reviews verändert (Editor, Build oder Umgehung des Guards). Prüfe `git status` und `git diff`; falls die Änderung nicht von dir stammt, behandle sie als Sicherheitsvorfall |
| Viele verworfene Funde | Das model hat Code zitiert, den es nicht gibt. Das kommt vor; solche Funde werden nie gezählt. Verwende ein stärkeres `--model` oder einen engeren Umfang |
| `--symbol`: „defined in several places“ oder „not found“ | gib `--file` an oder verwende `--file path:A-B`. Die Suche arbeitet heuristisch (Klammer-/Einrückungsabgleich) und ist kein Parser |
| Codex: „blocked by sandbox“ | siehe 5b: Netzwerk, Schreibzugriff auf `~/.gemini/antigravity-cli` und ein localhost-Socket müssen erlaubt sein |
| Windows: `agy` oder `bun` in Claude/Codex nicht gefunden | Die Tool-Shell verwendet einen anderen `PATH`; starte sie aus einer Shell, in der der Befehl funktioniert |
| `verify` gibt FAIL aus | verwende agentische Reviews nicht für wichtigen Code; eröffne ein Issue mit der Ausgabe und `agy --version` |

## 11. FAQ

**Ändert es meinen Code?** Nein. Statische Modi können das nicht; der agentische Modus blockiert Schreibzugriffe und warnt, wenn sich dein Arbeitsbaum danach unterscheidet. Es führt nie commit, stash oder checkout aus.

**Ist Bun hier schneller als Node?** Nicht messbar. Auf dem Windows-Rechner des Autors dauerte der Start mit Node etwa 56 ms und mit Bun 64 ms, der Guard hook etwa 60 ms gegenüber 57 ms. Ein Review dauert zig Sekunden, und diese Zeit geht für das model drauf. Bun ist der dokumentierte Standard; Node 18.18+ funktioniert genauso. Beide werden vom selben Code abgedeckt.

**Kostet es Geld?** Das plugin ist kostenlos. Jeder Review, jede Aufgabe, jede Übersetzung und jedes graphify-Update verwendet deine Antigravity-quota.

**Brauche ich Ollama oder einen API key für graphify?** Nein. graphify hat einen Backend-Platz namens „ollama“, der „jeder lokale OpenAI-kompatible Server“ bedeutet. Dahinter steht der kleine Antigravity-Server dieses Tools. Installiert werden muss nur das Python-Paket `openai` von graphify, das `--graphify setup --yes` hinzufügt.

**Verbraucht graphify weiterhin meine Claude- oder Codex-token?** Nur wenn du oder dein Agent selbst `/graphify --update`, `graphify extract` oder etwas Ähnliches ausführt, oder wenn ein Abschnitt in `CLAUDE.md` / `AGENTS.md` den Agent zum Neuaufbau des Graphen auffordert. Mit `--graphify rules --write-rules` fügst du die Regel hinzu, die das verhindert.

**Welche Dateien sieht Antigravity?** Statische Modi: nur den vom Script gesendeten Code (plus begrenzten zugehörigen Code für `--security`). Agentische Modi: alles, was es im repository liest, sowie alles auf der Festplatte außer Pfaden zu Zugangsdaten.

**Kann es die Funde beheben?** Nein. Ein anderer Agent oder du behebt sie; der Reviewer prüft nur und bleibt dadurch unabhängig.

**Kann es einen GitHub pull request prüfen?** Checke die branch lokal aus und verwende `--base`. Es gibt keinen Zugriff auf die GitHub API.

**Warum nicht Befehle in agys Einstellungen erlauben?** Getestet: Im Headless-Modus gleicht agy mehrteilige Freigaben exakt ab (`git status` ja, `git status --short` nein), und „allow“ eines hooks überstimmt die Berechtigungsprüfung nicht. Ein hook kann nur zuverlässig ablehnen. Daher verwendet der agentische Modus Skip-Permissions plus einen standardmäßig ablehnenden hook, während der statische Modus gar keine Tools erhält.

**Kann ich erlaubte Befehle oder Scanner-Regeln hinzufügen?** Bearbeite `CMDS` / `GIT_OK` in `guard.mjs` oder `RULES` in `lib/security.mjs`, führe `npm test` und danach `--install-guard` aus.

## 12. Aktualisieren, deinstallieren, entwickeln

### Auf eine neue Version aktualisieren

Ein neues release kommt nicht von selbst zu dir; du aktualisierst bewusst. Vier Schritte.

**1. Prüfe deine aktuelle Version und ob es eine neuere gibt**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

Du kannst auch die release-Liste unter https://github.com/Ealireza/agy-review/releases und den [changelog](../CHANGELOG.md) lesen.

**2. Aktualisiere das plugin für deinen Host**

| Host | Befehle (in einem normalen Terminal ausführen) | Danach |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` und danach `claude plugin update agy-review@agy-review` | Claude Code neu starten |
| Codex | `codex plugin marketplace upgrade agy-review` und danach `codex plugin remove agy-review@agy-review` und `codex plugin add agy-review@agy-review` | Codex neu starten |
| Normaler clone | `git pull` in deinem clone | nichts |

**3. Aktualisiere die Teile außerhalb des plugin-Ordners**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Prüfe den Erfolg:** `--version` zeigt die neue Nummer, `--check` meldet für alles OK, und `--list-models --refresh` liest neu ein, welche `--effort`-Werte jedes model akzeptiert.

Falls nach einem Update etwas nicht funktioniert, führe `--check` aus und lies die Tabelle zur Fehlerbehebung (Abschnitt 10). Brauchst du die alte Version zurück, entferne das plugin und installiere mit `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review` ein bestimmtes release. Deine Einstellungen (`.agy-review.json`) sind einfache Dateien und werden von Updates nie verändert.

### Deinstallation

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Lösche `~/.agy-review` (runtime-Kopie) und `~/.agy-review-cache.json` (effort-Cache), wenn nichts zurückbleiben soll.

### Entwicklung

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

Issues und pull requests sind willkommen, besonders: `verify`-Ergebnisse unter macOS und Linux, funktionierende Codex-sandbox-Einstellungen, Umgehungen des Guards (wenn möglich zuerst vertraulich melden) und neue Scanner-Regeln. Übersetzungen: Kopiere `README.md` nach `docs/README.<code>.md`, übersetze es und ergänze die Sprache überall in der Umschalterzeile.

## Lizenz

MIT, siehe [LICENSE](../LICENSE).
