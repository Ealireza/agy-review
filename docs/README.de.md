# agy-review

**Ein unabhängiger Reviewer, der seine Arbeit belegen muss.** Code-Review, Sicherheits-Review, Aufgabendelegation und Übersetzung durch Google Antigravity (`agy`), aus Claude Code, Codex oder jedem Terminal. Nur lesend, ohne Berechtigungsabfragen, und jeder Befund wird mit Ihrem echten Code abgeglichen, bevor Sie ihn sehen.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · **Deutsch** · [Français](README.fr.md)

Website: https://ealireza.github.io/agy-review/ · Vertiefung (auf Englisch): [AGENTS.md](AGENTS.md) für Agenten und Schleifen, [SECURITY-REVIEW.md](SECURITY-REVIEW.md) für die Sicherheitsmethode.

---

## Inhalt

1. Was Sie bekommen
2. Warum Sie dem Bericht vertrauen können
3. Status: Was geprüft ist und was nicht
4. Voraussetzungen
5. Installation
6. Erster Lauf: auf Ihrem Rechner prüfen
7. Nutzung: Review, Sicherheit, Aufgaben, Übersetzung, Modelle
8. Nutzung aus Agenten, Sub-Agenten und Schleifen
9. Sicherheitsmodell
10. Fehlerbehebung
11. FAQ
12. Aktualisieren, deinstallieren, entwickeln

---

## 1. Was Sie bekommen

| Skill (Claude Code / Codex) | Befehl (Claude Code) | Was er tut |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | abgestuftes Review von Git-Änderungen, einem Branch, einer Datei, einem Zeilenbereich, einer Funktion oder einem Snippet |
| `agy-security` / `security` | `/agy-review:security` | Sicherheits-Review: OWASP/CWE, Ausnutzbarkeit, Angriffsszenario, Scanner für Secrets und schlechte Muster, Aufrufer und Aufgerufene als Kontext |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | übergibt jede in sich geschlossene Aufgabe (umschreiben, zusammenfassen, entwerfen, extrahieren) an Antigravity und liefert das Ergebnis zurück |
| `agy-translate` / `translate` | `/agy-review:translate` | Übersetzung mit Tonfall, Zielgruppe und Glossar; prüft, ob Code, URLs, Platzhalter und Struktur erhalten blieben |
| `agy-models` / `models` | `/agy-review:models` | listet die Modelle in Ihrem agy auf, wählt eines aus, speichert es für das Projekt oder global, legt den Aufwand fest |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | prüft die Voraussetzungen, installiert den Nur-Lese-Guard und belegt auf Ihrem Rechner, dass Schreibzugriffe blockiert werden |

Sub-Agenten für Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Alles liegt in einem Repository und einem Skript (`plugins/agy-review/scripts/agy-review.mjs`). Es gibt keinen Server und kein Konto außer Ihrem eigenen Antigravity-Login.

## 2. Warum Sie dem Bericht vertrauen können

Ein Sprachmodell, das Code prüft, erfindet gelegentlich ein Problem. Dieses Werkzeug nimmt nichts auf bloßes Wort hin.

1. Der Reviewer muss einen strikten JSON-Bericht liefern (erzwungen durch `--json-schema`). Jeder Befund enthält den **exakten Code**, auf den er sich bezieht.
2. Das Skript sucht dieses Zitat in der echten Datei. **Nicht gefunden: Der Befund wird abgelehnt** und gesondert aufgelistet. **In einer anderen Zeile gefunden: Die Zeilennummer wird korrigiert.** Zitate, die zu kurz oder zu allgemein sind, um etwas zu belegen (`return null;`, `}`), werden abgelehnt. Ein Zitat, das an mehreren, weit von der angegebenen Zeile entfernten Stellen passt, wird als mehrdeutig abgelehnt.
3. Urteil, Zähler und CI-Gate werden **vom Skript berechnet**, ausschließlich aus verifizierten Befunden und niemals vom Modell übernommen.
4. Nichts Verifiziertes ist **keine** Freigabe: Wurden Befunde abgelehnt, hat das Modell widersprochen, den Code nicht abgedeckt oder ist eines von mehreren Modellen ausgefallen, lautet das Urteil `inconclusive` und der Exit-Code ist 4.
5. Befunde außerhalb der angeforderten Zeilen werden gekennzeichnet und lösen nie das Gate aus. Befunde mit geringer Konfidenz werden aufgelistet, aber nicht mitgezählt.
6. Schweregrad (Auswirkung) und Priorität (wann zu beheben) sind getrennt und werden konsistent gehalten: critical ist immer P0, nit ist immer P3, Stilbefunde liegen nie über low.

Was weiterhin möglich ist: ein korrektes Zitat mit einer falschen Schlussfolgerung. Das Zitat belegt, dass der Code existiert, nicht dass die Begründung stimmt; deshalb hat jeder Befund ein konkretes Szenario, und deshalb sollten Sie die zitierten Zeilen lesen, bevor Sie handeln.

Reales Beispiel, dieses Werkzeug auf einer kleinen Datei mit zwei eingebauten Fehlern (Claude Sonnet 4.6 über agy): 4 verifizierte Befunde an den richtigen Zeilen mit CWE-89, CWE-78, CWE-22 und CWE-369, Abdeckung 100 %, ein Duplikat verworfen, und der Scanner markierte unabhängig davon dieselben zwei Zeilen.

## 3. Status: Was geprüft ist und was nicht

| Prüfung | Ergebnis |
|---|---|
| Unit- und Pipeline-Tests (`npm test`): Verankerung, Geltungsbereich, Urteil, Deduplizierung, Symbolsuche, Ziele, Konfiguration, Modelle, Aufgaben, Übersetzung, Sicherheit, Schwärzung | 50 Tests, alle bestanden, mit einem Fake-`agy` (einschließlich der agentischen Pipeline, der Erkennung von Änderungen am Verzeichnisbaum, eines ausfallenden Modells und des `verify`-Gates) |
| Guard-Hook (erlaubte und verbotene Befehle, Werkzeuge, Quoting-Tricks, Pfade zu Zugangsdaten) | automatisierte Tests, bestanden |
| Claude-Code-Manifeste (`claude plugin validate`), Antigravity-Plugin (`agy plugin validate --strict`) | bestanden |
| Codex 0.163.0: Marketplace hinzufügen, Plugin installieren, Skills gefunden | unter Windows 11 geprüft |
| Statisches Review, Sicherheits-Review und Aufgaben mit echtem agy 1.4.8 (Gemini 3.8 Flash und Claude Sonnet 4.6), ausgeführt mit Bun 1.3.14 | unter Windows 11 geprüft; Befunde an den richtigen Zeilen verankert |
| Zwei unabhängige Reviews von Design und Code (Opus: 25 Befunde; Codex: 28 Befunde), die bestätigten behoben, jeweils mit einem Regressionstest | erledigt, siehe Changelog |
| **Agentische Reviews (`agy --dangerously-skip-permissions` plus der Guard, der echte Schreibzugriffe blockiert)** | **vom Autor nicht ausgeführt** |

Die letzte Zeile ist für die Sicherheit wichtig und hängt von Ihrer agy-Version ab. Führen Sie daher `verify` einmal nach der Installation und nach jedem agy-Update aus (Abschnitt 6). Statische Reviews, Sicherheits-Reviews eines Symbols/einer Datei/eines Snippets, Aufgaben und Übersetzungen verwenden diese Option nie und können nichts schreiben.

Getestet mit agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 und Node 24, Windows 11. macOS und Linux sollten funktionieren (agy verwendet auf allen Plattformen `~/.gemini/config/plugins`), sind aber ungetestet.

## 4. Voraussetzungen

Sonst nichts: keine weiteren Plugins, keine weiteren CLI-Werkzeuge.

| Benötigt | Wozu | Wie man es bekommt | Wie man es prüft |
|---|---|---|---|
| Antigravity CLI `agy` | erledigt die Arbeit | https://antigravity.google/cli, dann `agy` einmal ausführen und anmelden | `agy --version` |
| Bun (empfohlen) **oder** Node.js 18.18+ | führt das Skript und den Guard-Hook aus | https://bun.sh oder https://nodejs.org | `bun --version` / `node --version` |
| git | Git-Ziele und Auffinden von zugehörigem Code | https://git-scm.com | `git --version` |
| Claude Code **oder** Codex **oder** ein beliebiges Terminal | wo Sie Ihre Anfrage stellen | deren Installationsanleitungen | `claude --version` / `codex --version` |

Bun ist in allen Anleitungen und im Guard-Hook der Standard (`bun guard.mjs || node guard.mjs`); Node funktioniert identisch. Die Antigravity-Nutzung wird auf Ihr eigenes Kontingent angerechnet. Ein Review kann von Sekunden bis zu mehreren Minuten dauern.

## 5. Installation

Wählen Sie den Host, den Sie verwenden; mehrere können dasselbe Skript und denselben Guard teilen.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` prüft agy, git und den Guard und installiert den Guard nach `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` ist der Live-Sicherheitsnachweis.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Starten Sie Codex neu und fragen Sie dann in normaler Sprache: "Check my Antigravity review setup", "Review my changes with Antigravity", "Security-review the function saveUpload", "Translate README.md to German, friendly tone".

1. **Installieren Sie den Guard einmal aus einem normalen Terminal** (er schreibt nach `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). Nur agentische Git-Reviews benötigen den Guard.
2. **Die Sandbox von Codex muss agy arbeiten lassen:** ausgehendes Netzwerk, Schreibzugriff auf `~/.gemini/antigravity-cli` und einen Localhost-Socket. Mit `workspace-write` brauchen Sie in `~/.codex/config.toml` wahrscheinlich:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Wenn dennoch etwas blockiert wird, benennt der Skill den fehlenden Zugriff und hält an; er erweitert niemals von selbst Berechtigungen. Ob agy innerhalb Ihrer Codex-Sandbox korrekt läuft, konnte der Autor im Codex-Setup nicht testen. Führen Sie `verify` daher auch aus Codex heraus aus.

### 5c. Reines Terminal

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

### 5d. Nur die Antigravity-Seite

Der Guard ist ein gewöhnliches Antigravity-Plugin. Kopieren Sie `plugins/agy-review/antigravity-plugin/readonly-review` nach `~/.gemini/config/plugins/readonly-review` oder führen Sie `--install-guard` aus; prüfen Sie mit `agy plugin list`. Er tut nichts, solange ein Prompt nicht `AGY_READONLY_REVIEW` enthält, Ihre normalen agy-Sitzungen bleiben also unverändert. Außerdem liefert er einen Skill `readonly-code-review` für das interaktive agy mit.

## 6. Erster Lauf: auf Ihrem Rechner prüfen

Führen Sie dies einmal nach der Installation und nach jedem agy-Update aus: `/agy-review:verify`, den Codex-Skill `verify` oder `--verify`. Es führt einen kleinen Live-Aufruf von agy in einem Wegwerf-Ordner aus: eine Datei lesen (muss funktionieren), eine Datei schreiben, in eine Datei umleiten und eine Datei löschen (alles muss blockiert werden). Erwartet:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Jedes `FAIL` endet mit `NOT VERIFIED`, und agentische Reviews bleiben deaktiviert: Eröffnen Sie ein Issue mit der Ausgabe und Ihrer `agy --version`. Ein bestandenes `verify` wird genau für diesen Guard und diese agy-Version festgehalten; **agentische Reviews starten ohne es nicht**, und ein agy- oder Guard-Update macht es ungültig, führen Sie `verify` nach Updates also erneut aus. Statische Modi brauchen es nicht.

## 7. Nutzung

Aus dem Wurzelverzeichnis des Repositorys ausführen.

### 7a. Review: das Ziel wählen

| Sie möchten prüfen | Verwenden | Modus |
|---|---|---|
| nicht committete Arbeit | nichts | agentisch, nur lesend |
| einen Branch / gestagte Änderungen / einen Commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentisch, nur lesend |
| eine Datei oder einen Bereich | `--file src/a.kt` oder `--file src/a.kt:40-80` (wiederholbar) | statisch |
| eine Funktion oder Klasse | `--symbol parseConfig` (+ `--file`, falls der Name mehrdeutig ist) | statisch |
| Code, der nur im Speicher existiert | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | statisch |
| eines davon plus Erlaubnis, andere Dateien anzusehen | `--agentic` hinzufügen | agentisch, nur lesend |

*Statisch*: Das Skript liest und nummeriert den Code selbst, das Modell erhält keine Werkzeuge; so kann nichts berührt und nichts über Dateien erfunden werden, die ihm nicht gezeigt wurden. *Agentisch*: Der Reviewer liest das Repository selbst über den Guard-Hook, der jeden Schreibzugriff blockiert.

Dem Reviewer helfen: `--context "was dieser Code leisten muss"`, `--focus "concurrency, error handling"` (oder nachgestellte Wörter), `--context-lines N`.

Ausgabe: standardmäßig Markdown; `--format json` für Maschinen; `--output file`; `--fail-on high` (Exit 10, wenn ein verifizierter Befund der Stufe high oder critical existiert); `--previous old.json` markiert Befunde als neu, fortbestehend, behoben oder nicht erneut gemeldet.

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

### 7b. Sicherheits-Review

`--security` (Skill `agy-security`, Befehl `/agy-review:security`, Sub-Agent `agy-security`) funktioniert mit jedem der oben genannten Ziele und ergänzt: eine Bedrohungsmodell-Methode (nicht vertrauenswürdige Quelle bis zur gefährlichen Senke, mit den Kontrollen dazwischen), Zuordnung zu OWASP Top 10 (2021) und CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, einen modellfreien Scanner für Secrets und etwa 25 Klassen schlechter Muster sowie **zugehörigen Code**: was das Ziel aufruft und wer es aufruft.

- Ein fest eincodiertes Secret (privater Schlüssel, AWS, GitHub, Stripe, Slack, Google) wird **geschwärzt, bevor irgendetwas an ein Modell gesendet wird**, und per Muster als Befund gemeldet.
- Eine `cve` in einem Bericht ist die Behauptung des Modells und wird stets mit `cve_verified: false` gekennzeichnet: Bestätigen Sie sie in der NVD oder mit `osv-scanner` / `npm audit` / `pip-audit`. Das Werkzeug erfindet oder verifiziert niemals CVEs.
- "Claude hat Code geschrieben, prüfe ihn und seine Nachbarn": Kopieren Sie die fertige Regel aus `examples/` in Ihre `CLAUDE.md` oder `AGENTS.md`, oder installieren Sie den optionalen Stop-Hook oder Pre-Commit-Hook. Details und Ketten-Rezepte: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Aufgaben: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Das Modell erhält nur den Text, den Sie übergeben, und keine Werkzeuge. Der Textmodus gibt nur die Antwort aus; stderr meldet Modell und Aufwand.

### 7d. Übersetzung: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Optionen: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` oder CSV; `=` behält den Begriff bei), `--keep a,b`, `--notes`, `--strict`. Lange Texte werden an Leerzeilen getrennt (nie innerhalb eines Codeblocks) und abschnittsweise übersetzt. Nach der Übersetzung prüft das Skript, ob umzäunter Code, Inline-Code, URLs, Platzhalter (`{{x}}`, `${x}`, `%s`), Tags und Überschriften mit dem Original übereinstimmen, und meldet jede Abweichung (`--strict` macht aus einer Abweichung Exit 11). Die Skills befragen Sie zuerst zu Tonfall, Zielgruppe und Begriffen und fragen nur, was sie nicht ableiten können. Maschinelle Prüfungen können die Sprachqualität nicht beurteilen; lassen Sie wichtige Texte von Muttersprachlern prüfen.

### 7e. Modelle und Aufwand

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Pro Lauf: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Rangfolge: Kommandozeile, Projektdatei, Benutzerdatei, agy-Standard. `--effort auto` (der Standard) ist eine deterministische, begründete Wahl: Reviews skalieren mit der Menge des Codes im Geltungsbereich (ein risikosensibler Fokus wie Sicherheit fügt eine Stufe hinzu), Aufgaben mit der Formulierung (mechanische Umwandlungen low, denkintensive high) und der Eingabelänge; `max` wird nie automatisch gewählt. Manche Modelle akzeptieren `--effort` nicht; das Werkzeug verwendet dann den Modellstandard und weist darauf hin. Wenn der Inhaltsfilter von Gemini einen Prompt ablehnt und Sie kein Modell angegeben haben, versucht es das Werkzeug einmal mit einem Nicht-Gemini-Modell erneut und weist darauf hin.

### 7f. Optionen und Exit-Codes

`bun agy-review.mjs --help` listet alles auf. Exit-Codes: `0` ok · `1` Fehler, Timeout oder nicht auswertbare Antwort · `2` Verwendungsfehler oder fehlende Voraussetzung · `3` der Arbeitsbaum hat sich während eines agentischen Reviews geändert · `4` nicht eindeutig oder unvollständig (**keine Freigabe**) · `10` das `--fail-on`-Gate ist fehlgeschlagen (der Bericht ist gültig) · `11` die Übersetzungsprüfung ist mit `--strict` fehlgeschlagen. Treffen mehrere zu, hat `3` Vorrang vor `10` und `10` vor `4`; in jedem Fall außer `1` und `2` wird ein Bericht geschrieben, lesen Sie darin also `verdict` und `incomplete`. Ein sauberer Arbeitsbaum ist kein Fehler: Das Werkzeug gibt "No changes to review" aus und beendet sich mit 0, ohne ein Modell aufzurufen.

## 8. Nutzung aus Agenten, Sub-Agenten und Schleifen

Jeder Skill ist ein einfacher CLI-Aufruf mit stabilem JSON, sodass jeder Agent ihn nutzen kann: den Sub-Agenten `agy-reviewer`, `agy-security` oder `agy-worker` in Claude Code starten, die Skills in Codex aufrufen oder das Skript aus jedem Framework heraus aufrufen.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

Dem Reviewer wird nie gesagt, was Sie geändert haben, daher bleibt jede Runde unabhängig. Vollständiger Vertrag, JSON-Felder, Schleifen-Rezepte und Fan-out-Muster: [AGENTS.md](AGENTS.md).

## 9. Sicherheitsmodell

**Statische Reviews, Sicherheits-Reviews eines Symbols/einer Datei/eines Snippets, Aufgaben und Übersetzungen** führen agy ohne jede Berechtigungsoption und ohne Werkzeuge in einem leeren temporären Ordner aus: agy kann Ihre Dateien weder lesen noch schreiben; die einzigen Daten, die das System verlassen, sind die, die das Skript in den Prompt gelegt hat (mit geschwärzten erkannten Secrets).

**Agentische Reviews** (Git-Ziele oder `--agentic`) starten agy mit `--dangerously-skip-permissions`, damit nichts auf eine Abfrage wartet, und verlassen sich auf einen `PreToolUse`-Guard-Hook (`guard.mjs`), der jeden Werkzeugaufruf prüft und **standardmäßig verweigert**:

- erlaubt: Werkzeuge zum Anzeigen und Durchsuchen von Dateien; Shell-Befehle, einzeln oder verkettet, die ausschließlich aus schreibgeschützten `git`-Unterbefehlen, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (ohne `-delete`/`-exec`), PowerShell `Get-*`, `Select-String` und einigen weiteren bestehen (die Liste steht in `guard.mjs`);
- verweigert: jedes Schreib-/Bearbeiten-/Notebook-/Bild-/Zeitplan-/Sub-Agent-/Browser-/Web-/MCP-Werkzeug und jedes unbekannte Werkzeug; Umleitung, `$(...)`, Backticks, Skriptblöcke, `eval`-artige Konstrukte; `git commit/push/checkout/reset/...`; Interpreter und Paketmanager; `curl`, `ssh`; das Lesen von Speichern für Zugangsdaten (`.ssh`, `.aws`, `.gnupg`, private Schlüssel);
- stürzt der Guard ab, verweigert er; das Skript startet keinen agentischen Lauf, es sei denn, der Guard ist installiert, identisch mit dem mitgelieferten, **und ein bestandenes `--verify` wurde für diesen Guard und diese agy-Version festgehalten**; vor und nach dem Lauf bildet es einen Fingerabdruck von `git status`, den nachverfolgten und gestagten Diffs und dem Inhalt jeder nicht nachverfolgten Datei und beendet sich mit 3 und einer Warnung, wenn etwas abweicht.
- **Secrets im agentischen Modus lassen sich nicht schwärzen**, bevor der Reviewer die Dateien liest. Das Werkzeug erkennt sie, warnt und listet sie in `limitations` auf; rotieren Sie sie, oder prüfen Sie mit `--file` / `--symbol`, wo sie zuerst geschwärzt werden.

Was dies nicht ist:

- **Keine Betriebssystem-Sandbox.** Der Guard filtert Werkzeugnamen und Befehlstext; die eigene Sandbox von agy ist nicht überall verfügbar. Eine gezielte Prompt-Injection im geprüften Code könnte nach einer Befehlsform suchen, die der Filter akzeptiert. Die Vorher-nachher-Prüfung erkennt geänderte nachverfolgte Dateien und neue Dateien, keine Lesezugriffe.
- **Ihr Code wird an das Modell von Google gesendet**; Lesezugriffe sind bis auf die Pfade zu Zugangsdaten unbeschränkt. `.env`-Dateien im Repository sind für agentische Reviews lesbar. Prüfen Sie keinen Code, den Sie nicht teilen dürfen.
- git kann in einem Repository konfigurierte externe Diff- oder Textconv-Programme ausführen: Prüfen Sie nur Repositorys, denen Sie vertrauen.
- Befunde können falsch oder unvollständig sein, und "keine Befunde" bedeutet nie "sicher".

## 10. Fehlerbehebung

| Symptom | Ursache und Lösung |
|---|---|
| `Missing: agy CLI` | Antigravity CLI installieren und `agy` einmal ausführen, um sich anzumelden; `agy --version` muss in der Shell funktionieren, die das Plugin ausführt |
| `Missing: read-only guard - missing/outdated` | Setup ausführen (`/agy-review:setup`, den Codex-Skill `setup` oder `--install-guard`); nur agentische Reviews brauchen ihn |
| `Not inside a git repository` (Exit 2) | mit `cd` ins Repository-Stammverzeichnis wechseln oder Code mit `--file` / `--symbol` / `--stdin` prüfen |
| Urteil `inconclusive`, Exit 4 | keine Freigabe: Befunde wurden abgelehnt, das Modell hat widersprochen oder den Code nicht abgedeckt, oder ein Modell ist ausgefallen. Geltungsbereich eingrenzen, `--context` hinzufügen oder ein anderes `--model` versuchen |
| `blocked by Gemini's filters` | der Sicherheitsfilter von Gemini hat abgelehnt (häufig bei Sicherheits-Prompts). Ohne `--model` versucht das Werkzeug es mit einem Nicht-Gemini-Modell erneut; andernfalls eines mit `--model` wählen |
| `--effort is not supported for model` | wird automatisch behandelt (der Modellstandard wird verwendet und gemeldet) |
| Leeres Review, Exit 1 | Anmeldung und Kontingent mit `agy -p "say hi"` prüfen; `--timeout` für große Ziele erhöhen |
| Exit 3 / Arbeitsbaum geändert | etwas hat Ihre Dateien während eines agentischen Reviews verändert (Editor, Build oder ein Guard-Bypass). `git status` und `git diff` prüfen; wenn Sie sie nicht geändert haben, als Sicherheitsvorfall behandeln |
| Viele abgelehnte Befunde | das Modell hat Code zitiert, der nicht existiert. Gelegentlich zu erwarten; sie werden nie mitgezählt. Ein stärkeres `--model` oder einen engeren Geltungsbereich verwenden |
| `--symbol`: "defined in several places" oder "not found" | `--file` übergeben oder `--file path:A-B` verwenden. Die Suche ist heuristisch (Klammer-/Einrückungsabgleich), kein Parser |
| Codex: "blocked by sandbox" | siehe 5b: Netzwerk, Schreibzugriffe auf `~/.gemini/antigravity-cli` und ein Localhost-Socket müssen erlaubt sein |
| Windows: `agy` oder `bun` in Claude/Codex nicht gefunden | die Shell des Werkzeugs hat einen anderen `PATH`; aus einer Shell starten, in der der Befehl funktioniert |
| `verify` gibt FAIL aus | keine agentischen Reviews für wichtigen Code verwenden; Issue mit der Ausgabe und `agy --version` eröffnen |

## 11. FAQ

**Ändert es meinen Code?** Nein. Statische Modi können das nicht; der agentische Modus blockiert Schreibzugriffe und warnt, wenn Ihr Baum danach abweicht. Es führt niemals Commit, Stash oder Checkout aus.

**Ist Bun hier schneller als Node?** Nicht messbar. Auf dem Windows-Rechner des Autors lag der Start bei etwa 56 ms mit Node und 64 ms mit Bun, der Guard-Hook bei etwa 60 ms gegenüber 57 ms; ein Review dauert Dutzende Sekunden, und diese Zeit entfällt auf das Modell. Bun ist der dokumentierte Standard; Node 18.18+ funktioniert gleich. Beide werden vom selben Code abgedeckt.

**Kostet es Geld?** Das Plugin ist kostenlos. Jedes Review verbraucht Ihr Antigravity-Kontingent.

**Welche Dateien sieht Antigravity?** Statische Modi: nur den Code, den das Skript sendet (plus begrenzten zugehörigen Code bei `--security`). Agentische Modi: alles, was es im Repository liest, und überall auf dem Datenträger außer den Pfaden zu Zugangsdaten.

**Kann es die Befunde beheben?** Nie. Ein anderer Agent oder Sie beheben; der Reviewer prüft nur, so bleibt er unabhängig.

**Kann es einen GitHub-Pull-Request prüfen?** Checken Sie den Branch lokal aus und verwenden Sie `--base`. Es gibt keinen Zugriff auf die GitHub-API.

**Warum Befehle nicht in den agy-Einstellungen auf eine Allowlist setzen?** Getestet: Im Headless-Modus gleicht agy mehrwortige Freigaben exakt ab (`git status` ja, `git status --short` nein), und das "allow" eines Hooks überschreibt die Berechtigungsprüfung nicht. Ein Hook kann nur zuverlässig verweigern, daher skip-permissions plus ein standardmäßig verweigernder Hook im agentischen Modus und gar keine Werkzeuge im statischen Modus.

**Kann ich erlaubte Befehle oder Scanner-Regeln hinzufügen?** Bearbeiten Sie `CMDS` / `GIT_OK` in `guard.mjs` oder `RULES` in `lib/security.mjs`, führen Sie `npm test` aus und danach `--install-guard`.

## 12. Aktualisieren, deinstallieren, entwickeln

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

Führen Sie nach einem Update das Setup erneut aus (es installiert einen geänderten Guard neu) und anschließend verify.

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

Issues und Pull Requests sind willkommen, insbesondere: `verify`-Ergebnisse unter macOS und Linux, funktionierende Codex-Sandbox-Einstellungen, Guard-Bypässe (melden Sie sie wenn möglich zuerst privat) und neue Scanner-Regeln. Übersetzungen: `README.md` nach `docs/README.<code>.md` kopieren, übersetzen und die Sprache überall in die Sprachumschalter-Zeile aufnehmen.

## Lizenz

MIT, siehe [LICENSE](../LICENSE).
