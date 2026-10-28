# agy-review

**Un revisor independiente que tiene que mostrar su trabajo.** Revisión de código, revisión de seguridad, delegación de tareas y traducción con Google Antigravity (`agy`), desde Claude Code, Codex o cualquier terminal. Solo lectura, sin solicitudes de permisos, y cada hallazgo se comprueba contra tu código real antes de que lo veas.

> ## NUEVO: deja de gastar tokens de Claude y Codex para actualizar tu grafo de graphify
>
> **Las actualizaciones de graphify ahora se ejecutan en Antigravity, en segundo plano, con cada commit, merge, checkout y rebase. Tu agent gasta 0 tokens en ellas y no necesitas una API key.**
>
> Un solo comando, `agy-review --graphify setup`, vuelve a registrar los git hooks de graphify para que **la parte costosa de cada actualización del grafo (leer tu documentación y dar nombres a las comunidades con un model de lenguaje) la haga un model económico de Antigravity en vez de tu sesión de Opus o Fable.** `git commit` termina en una fracción de segundo y el grafo se pone al día por sí solo.
>
> En una ejecución real en Windows, un commit que cambió código y un documento actualizó el grafo en **22 segundos con una sola llamada a Antigravity y 0 tokens de Claude o Codex.** El model que hay detrás solo puede leer texto y responder con texto: no tiene herramientas ni permisos de escritura o ejecución. Detalles y configuración: sección 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · **Español** · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

Sitio web: https://ealireza.github.io/agy-review/ · Documentación detallada (en inglés): [docs/AGENTS.md](AGENTS.md) para agents y bucles, [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) para el método de seguridad.

---

## Contenido

1. Qué obtienes
2. Por qué puedes confiar en el informe
3. Estado: qué está verificado y qué no
4. Requisitos
5. Instalación
6. Primera ejecución: compruébalo en tu equipo
7. Uso: revisión, seguridad, tareas, traducción, models, graphify
8. Uso desde agents, sub-agents y bucles
9. Model de seguridad
10. Solución de problemas
11. Preguntas frecuentes
12. Actualizar (cómo obtener una versión nueva), desinstalar, desarrollar

---

## 1. Qué obtienes

| Skill (Claude Code / Codex) | Comando (Claude Code) | Qué hace |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | revisión con calificación de cambios de git, un branch, un archivo, un intervalo de líneas, una función o un fragmento |
| `agy-security` / `security` | `/agy-review:security` | revisión de seguridad: OWASP/CWE, explotabilidad, escenario de ataque, escáner de secretos y patrones peligrosos, y funciones que llaman o son llamadas como contexto |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | entrega a Antigravity cualquier tarea autocontenida (reescribir, resumir, redactar, extraer) y devuelve el resultado |
| `agy-translate` / `translate` | `/agy-review:translate` | traducción con tono, público y glosario; comprueba que se conserven el código, las URL, los marcadores y la estructura |
| `agy-models` / `models` | `/agy-review:models` | muestra los models de tu agy y el `--effort` que acepta cada uno, permite elegir uno y guardarlo para el proyecto o de forma global |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **mantiene actualizado un grafo de graphify en Antigravity mediante git hooks: 0 tokens de Claude o Codex, sin API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | comprueba los requisitos, instala la protección de solo lectura y demuestra en tu equipo que las escrituras están bloqueadas |

Sub-agents para Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Todo está en un único repository y un único script (`plugins/agy-review/scripts/agy-review.mjs`). No hay ningún servidor ni otra cuenta aparte de tu propio inicio de sesión de Antigravity.

## 2. Por qué puedes confiar en el informe

Un model que revisa código a veces inventa un problema. Esta herramienta no da por buena ninguna de sus afirmaciones.

1. El revisor debe devolver un informe JSON estricto (aplicado mediante `--json-schema`). Cada hallazgo incluye el **código exacto** al que se refiere.
2. El script busca esa cita en el archivo real. **Si no aparece, el hallazgo se rechaza** y se muestra por separado. **Si aparece en otra línea, se corrige el número de línea.** Se rechazan las citas demasiado cortas o genéricas para demostrar algo (`return null;`, `}`). Una cita que coincide en varios lugares alejados de la línea indicada se rechaza por ambigua.
3. El veredicto, los recuentos y la puerta de CI **los calcula el script** usando solo hallazgos verificados; nunca se copian del model.
4. No verificar nada **no** equivale a aprobar: si se rechazaron hallazgos, el model no coincidió, no se cubrió el código o falló uno de varios models, el veredicto es `inconclusive` y el exit code es 4.
5. Los hallazgos fuera de las líneas solicitadas se etiquetan y nunca bloquean. Los de baja confianza se muestran, pero no se cuentan.
6. La gravedad (impacto) y la prioridad (cuándo corregirlo) están separadas y son coherentes: critical siempre es P0, nit siempre es P3 y los hallazgos de estilo nunca superan low.

Aun puede ocurrir esto: una cita correcta con una conclusión equivocada. La cita demuestra que el código existe, no que el razonamiento sea correcto; por eso cada hallazgo incluye un escenario concreto y debes leer las líneas citadas antes de actuar.

Ejemplo real, con esta herramienta sobre un archivo pequeño que tenía dos errores intencionados (Claude Sonnet 4.6 mediante agy): 4 hallazgos verificados en las líneas correctas con CWE-89, CWE-78, CWE-22 y CWE-369, cobertura del 100 %, un duplicado descartado y el escáner señaló por separado las mismas dos líneas.

## 3. Estado: qué está verificado y qué no

| Comprobación | Resultado |
|---|---|
| Pruebas unitarias y del pipeline (`npm test`): fundamentación, alcance, veredicto, deduplicación, buscador de símbolos, objetivos, configuración, models, tareas, traducción, seguridad y censura | 72 pruebas, todas correctas, con un `agy` falso (incluidos el pipeline agentic, la detección de cambios en el árbol, un model que falla y la puerta `verify`) |
| Guard hook (comandos permitidos y denegados, herramientas, trucos con comillas, rutas de credenciales) | pruebas automatizadas correctas |
| Manifiestos de Claude Code (`claude plugin validate`), plugin de Antigravity (`agy plugin validate --strict`) | correcto |
| Codex 0.163.0: añadir marketplace, instalar plugin, detectar skills | comprobado en Windows 11 |
| Revisión estática, revisión de seguridad y tareas con agy 1.4.8 real (Gemini 3.8 Flash y Claude Sonnet 4.6), ejecutadas con Bun 1.3.14 | comprobado en Windows 11; hallazgos fundamentados en las líneas correctas |
| `--effort` por model: el model predeterminado (low, medium, high), models con el effort en el nombre y models de Claude sin `--effort` | comprobado con agy 1.4.8 real |
| graphify en Antigravity, de principio a fin: graphify 0.9.86 real más agy 1.4.8 real en Windows. Un git hook actualizó el grafo en segundo plano (22 s, 1 llamada a Antigravity, `git commit` terminó en 0.3 s) y solo se envió al model el documento modificado | comprobado manualmente y con pruebas que usan un graphify falso y un agy falso |
| Dos revisiones independientes del diseño y el código (Opus: 25 hallazgos; Codex: 28 hallazgos), con cada hallazgo confirmado corregido y cubierto por una prueba de regresión | terminado; consulta el changelog |
| **Revisiones agentic (`agy --dangerously-skip-permissions` más la protección que bloquea escrituras reales)** | **el autor no las ha ejecutado** |

El autor no ha probado `--graphify setup --yes` en una instalación real de graphify mediante `uv tool` (la prueba manual usó graphify desde pip, que ya incluía el paquete `openai`). La fila agentic es importante para la seguridad y depende de tu versión de agy, así que ejecuta `verify` una vez después de instalar y después de cada actualización de agy (sección 6). Las revisiones estáticas, las revisiones de seguridad de un símbolo/archivo/fragmento, las tareas y las traducciones nunca usan esa opción y no pueden escribir nada.

Probado con agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 y Node 24 en Windows 11. Debería funcionar en macOS y Linux (agy usa `~/.gemini/config/plugins` en todas las plataformas), pero no se ha probado.

## 4. Requisitos

Nada más: ningún otro plugin ni ninguna otra herramienta CLI.

| Necesitas | Para qué | Cómo obtenerlo | Cómo comprobarlo |
|---|---|---|---|
| Antigravity CLI `agy` | hace el trabajo | https://antigravity.google/cli, después ejecuta `agy` una vez e inicia sesión | `agy --version` |
| Bun (recomendado) **o** Node.js 18.18+ | ejecuta el script y el Guard hook | https://bun.sh o https://nodejs.org | `bun --version` / `node --version` |
| git | objetivos de git y código relacionado con los hallazgos | https://git-scm.com | `git --version` |
| Claude Code **o** Codex **o** cualquier terminal | desde donde haces la petición | sus guías de instalación | `claude --version` / `codex --version` |

Bun es la opción predeterminada en todas las instrucciones y en el Guard hook (`bun guard.mjs || node guard.mjs`); Node funciona igual. El uso de Antigravity consume tu propia quota. Una revisión puede tardar desde unos segundos hasta varios minutos.

## 5. Instalación

Elige el entorno que usas; varios pueden compartir el mismo script y la misma protección.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` comprueba agy, git y la protección, y la instala en `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` es la prueba de seguridad en vivo.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Reinicia Codex y pídeselo con lenguaje normal: "Comprueba mi configuración de revisión con Antigravity", "Revisa mis cambios con Antigravity", "Haz una revisión de seguridad de la función saveUpload", "Traduce README.md al alemán con un tono cercano".

1. **Instala la protección una vez desde una terminal normal** (escribe en `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; el nombre de la carpeta es la versión instalada, así que después de actualizar usa la carpeta que exista). Solo las revisiones agentic de git necesitan la protección.
2. **El sandbox de Codex debe permitir que agy funcione:** acceso de red saliente, acceso de escritura a `~/.gemini/antigravity-cli` y un socket de localhost. Con `workspace-write`, probablemente necesites esto en `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Si algo sigue bloqueado, la skill indica qué acceso falta y se detiene; nunca amplía los permisos por su cuenta. El autor no pudo probar si agy funciona correctamente dentro de la configuración del sandbox de Codex, así que ejecuta `verify` también desde Codex.

### 5c. Terminal normal

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

Consejo: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Solo en Antigravity

La protección es un plugin normal de Antigravity. Copia `plugins/agy-review/antigravity-plugin/readonly-review` en `~/.gemini/config/plugins/readonly-review` o ejecuta `--install-guard`; compruébalo con `agy plugin list`. No hace nada salvo que un prompt contenga `AGY_READONLY_REVIEW`, por lo que tus sesiones normales de agy no cambian. También incluye una skill `readonly-code-review` para usar agy de forma interactiva.

## 6. Primera ejecución: compruébalo en tu equipo

Ejecuta una vez después de instalar y después de cada actualización de agy: `/agy-review:verify`, la skill `verify` de Codex o `--verify`. Hace una pequeña llamada real a agy en una carpeta desechable: leer un archivo (debe funcionar), escribir un archivo, redirigir a un archivo y borrar un archivo (todo debe quedar bloqueado). Resultado esperado:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Cualquier `FAIL` termina con `NOT VERIFIED` y mantiene desactivadas las revisiones agentic: abre una incidencia con la salida y tu `agy --version`. Un `verify` correcto se registra exactamente para esta protección y esta versión de agy; **las revisiones agentic se niegan a empezar sin él**, y una actualización de agy o de la protección lo invalida, así que vuelve a ejecutar `verify` después de actualizar. Los modos estáticos no lo necesitan.

## 7. Uso

Ejecuta desde la raíz del repository.

### 7a. Revisión: elige el objetivo

| Qué quieres revisar | Usa | Modo |
|---|---|---|
| trabajo sin commit | nada | agentic, solo lectura |
| un branch / cambios preparados / un commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, solo lectura |
| un archivo o un intervalo | `--file src/a.kt` o `--file src/a.kt:40-80` (se puede repetir) | estático |
| una función o clase | `--symbol parseConfig` (+ `--file` si el nombre es ambiguo) | estático |
| código que solo existe en memoria | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | estático |
| cualquiera de los anteriores con permiso para mirar otros archivos | añade `--agentic` | agentic, solo lectura |

*Estático*: el script lee y numera el código por sí mismo y el model no recibe herramientas, así que no puede tocar nada ni inventar información sobre archivos que no se le mostraron. *Agentic*: el revisor lee el repository mediante el Guard hook, que bloquea cualquier escritura.

Ayuda al revisor: `--context "what this code must do"`, `--focus "concurrency, error handling"` (o palabras al final), `--context-lines N`.

Salida: Markdown de forma predeterminada; `--format json` para máquinas; `--output file`; `--fail-on high` (exit 10 si existe un hallazgo high o critical verificado); `--previous old.json` marca los hallazgos como nuevos, persistentes, resueltos o no encontrados de nuevo.

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

### 7b. Revisión de seguridad

`--security` (skill `agy-security`, comando `/agy-review:security`, sub-agent `agy-security`) funciona con todos los objetivos anteriores y añade: un método de model de amenazas (desde una fuente no confiable hasta un destino peligroso, con los controles intermedios), correspondencias con OWASP Top 10 (2021) y CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, un escáner sin model para secretos y unas 25 clases de patrones peligrosos, y **código relacionado**: qué llama el objetivo y quién lo llama.

- Un secreto escrito directamente en el código (clave privada, AWS, GitHub, Stripe, Slack, Google) se **censura antes de enviar nada a un model** y se informa como hallazgo de patrón.
- Un `cve` en un informe es una afirmación del model y siempre aparece como `cve_verified: false`: confírmalo en NVD o con `osv-scanner` / `npm audit` / `pip-audit`. La herramienta nunca inventa ni verifica CVE.
- "Claude escribió código, revísalo junto con sus archivos vecinos": copia la regla preparada de `examples/` a tu `CLAUDE.md` o `AGENTS.md`, o instala el Stop hook o el pre-commit hook opcional. Detalles y recetas de cadenas: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Tareas: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

El model solo recibe el texto que proporcionas y ninguna herramienta. El modo texto imprime solo la respuesta; stderr informa del model y del effort.

### 7d. Traducción: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Opciones: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` o CSV; `=` conserva el término), `--keep a,b`, `--notes`, `--strict`. Los textos largos se dividen por líneas en blanco (nunca dentro de un bloque de código) y se traducen por partes. Después, el script comprueba que el código cercado, el código en línea, las URL, los marcadores (`{{x}}`, `${x}`, `%s`), las etiquetas y los encabezados coincidan con el origen, e informa de cada diferencia (`--strict` convierte una diferencia en exit 11). Las skills primero te preguntan por el tono, el público y los términos, pero solo por lo que no puedan deducir. Las comprobaciones automáticas no pueden juzgar la fluidez; pide a una persona nativa que revise los textos importantes.

### 7e. Models y effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

En cada ejecución: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Precedencia: línea de comandos, archivo del proyecto, archivo del usuario, valor predeterminado de agy. `--effort auto` (el valor predeterminado) toma una decisión determinista y explicada: las revisiones se ajustan a la cantidad de código dentro del alcance (un enfoque sensible al riesgo, como la seguridad, añade un nivel), las tareas se ajustan a su redacción (transformaciones mecánicas en low, razonamiento intenso en high) y a la longitud de la entrada; `max` nunca se elige automáticamente. **El effort siempre se adapta al model, nunca se adivina.** Cada model entiende `--effort` de una forma: el model predeterminado de agy ofrece `low | medium | high`, los models con el effort en el nombre (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) no aceptan ningún `--effort`, y los models de Claude no lo admiten. La herramienta pregunta a agy en qué caso está un model (una comprobación gratuita que tarda unos cuatro segundos y no inicia ninguna llamada al model), recuerda la respuesta por model y versión de agy en `~/.agy-review-cache.json`, ajusta tu effort al valor aceptado más cercano (por ejemplo, `xhigh` pasa a `high`) y el informe indica qué se usó realmente. Si cambia la lista de agy, se lee el error, se corrige la caché y se vuelve a intentar una vez. `--list-models` muestra qué acepta cada model (`--refresh` vuelve a consultarlo). Si el filtro de contenido de Gemini rechaza un prompt y no indicaste un model, la herramienta reintenta una vez con un model que no sea Gemini y te avisa.

### 7f. Opciones y exit codes

`bun agy-review.mjs --help` muestra todo. Exit codes: `0` correcto · `1` error, tiempo agotado o respuesta que no se puede analizar · `2` error de uso o requisito ausente · `3` el árbol de trabajo cambió durante una revisión agentic · `4` no concluyente o incompleto (**no es un aprobado**) · `10` falló la puerta `--fail-on` (el informe es válido) · `11` falló la comprobación de traducción con `--strict`. Si se aplican varios, `3` prevalece sobre `10`, y `10` sobre `4`; se escribe un informe en todos los casos salvo `1` y `2`, así que lee `verdict` e `incomplete`. Un árbol de trabajo limpio no es un error: la herramienta imprime "No changes to review" y sale con 0 sin llamar a ningún model.

### 7g. graphify en Antigravity: cero tokens del agent para actualizar el grafo

**Si usas [graphify](https://github.com/Graphify-Labs/graphify), este es el mayor ahorro de todo el proyecto.** graphify convierte un repository y su documentación en un grafo de conocimiento. La mayor parte del trabajo es código determinista (tree-sitter, agrupación, informe, caché, merge) y no cuesta nada. Dos pasos necesitan un model de lenguaje: **la extracción semántica de documentos y artículos**, y **dar nombre a las comunidades**. Si no fijas un backend, graphify elige uno por sí mismo y, dentro de un coding agent, será ese coding agent (o su suscripción). Así, cada actualización del grafo que toca un documento se paga con tus tokens de Opus, Fable o Codex.

**`--graphify` mueve exactamente esos dos pasos a Antigravity y no cambia nada más.** El script inicia un pequeño servidor local en `127.0.0.1` que habla el protocolo compatible con OpenAI y responde mediante `agy`, después **fija en él cada paso LLM de graphify**, por lo que graphify nunca puede volver a tu coding agent ni a una API key de pago. No necesitas Ollama ni ninguna clave. (graphify llama "ollama" a ese espacio en su configuración: solo significa "cualquier servidor local compatible con OpenAI").

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Por qué no necesita permisos de escritura ni ejecución.** Podrías esperar que hicieran falta Python y escrituras de archivos, pero el model solo tiene que leer texto y responder con texto. graphify escribe `graphify-out/`; esta herramienta escribe los hooks, un archivo de bloqueo y un registro. El model que hay detrás del servidor no tiene herramientas, archivos ni red, y una inyección de prompt oculta en un documento no puede hacer que actúe. Los secretos reconocidos en tus documentos se censuran antes de enviarlos. Así se mantiene la promesa de solo lectura del resto del proyecto.

Configúralo una vez por repository:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

En Claude Code o Codex solo pide: "configura las actualizaciones de graphify en Antigravity" (skill `agy-graphify` / `graphify`, comando `/agy-review:graphify`). La skill pregunta antes de añadir un paquete al entorno de graphify.

Qué hace por ti:

- **Hooks:** `post-commit`, `post-merge`, `post-checkout` (solo cambios de branch) y `post-rewrite` (amend, rebase) ejecutan la actualización **desacoplada**, por lo que el comando git termina en una fracción de segundo. Se conserva el contenido existente de esos archivos hook. De forma predeterminada, **se sustituyen los hooks propios de graphify** (solo reconstruyen código, y los nuestros hacen eso y más; dos procesos escribiendo en el mismo grafo entrarían en conflicto). `--keep-graphify-hook` conserva ambos; `--graphify hook-uninstall --restore-graphify` restaura los de graphify. Una copia de esta herramienta en `~/.agy-review/runtime` permite que los hooks sobrevivan a las actualizaciones del plugin. Omítelo una vez con `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **Incremental:** la caché propia de graphify decide qué ha cambiado; los documentos sin cambios nunca se envían al model. Dos commits consecutivos nunca ejecutan dos actualizaciones a la vez: el segundo solicita otra ronda.
- **Tu agent deja de gastar tokens en esto:** si `CLAUDE.md` o `AGENTS.md` contiene una sección de graphify que pide al agent reconstruir el grafo, `--graphify rules --write-rules` añade una regla breve que le indica que no lo haga (tu texto nunca se edita y no se crea nada si los archivos no existen).
- **Económico por defecto:** effort `low`, porque la extracción es un trabajo estructurado. En una prueba, `low` usó unas 40 veces menos tokens de salida que `high` para el mismo documento (685 frente a 29,996) y terminó en 15 segundos en vez de 207. Cámbialo con `--set graphifyEffort=...`, elige el model con `--set graphifyModel=<id>` (consulta `--list-models`), usa `--set graphifyConcurrency=N` para llamadas en paralelo y `--set graphifyLabels=false` para omitir los nombres de las comunidades.

Límites, sin rodeos: las actualizaciones consumen tu **quota de Antigravity** (esa es la idea: un model económico en vez de uno caro, no que sea "gratis"). **Las imágenes no se extraen** por esta vía (graphify las omite para este backend y agy no puede verlas a través de él). El código se analiza localmente; los documentos y artículos son texto que se envía al model de Google. La calidad de la extracción depende del model que elijas. graphify debe estar instalado (`uv tool install graphifyy`) y su propio Python necesita el paquete `openai`: `--graphify setup --yes` lo añade con `uv tool install --force "graphifyy[openai]"` (o `pipx inject graphifyy openai`). Detalles, configuración y solución de problemas: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. Uso desde agents, sub-agents y bucles

Cada skill es una llamada CLI normal con JSON estable, así que cualquier agent puede usarla: inicia el sub-agent `agy-reviewer`, `agy-security` o `agy-worker` en Claude Code, llama a las skills en Codex o ejecuta el script desde cualquier framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

Al revisor nunca se le dice qué cambiaste, así que cada ronda sigue siendo independiente. Contrato completo, campos JSON, recetas de bucles y patrones de distribución: [docs/AGENTS.md](AGENTS.md).

## 9. Model de seguridad

**Las revisiones estáticas, las revisiones de seguridad de un símbolo/archivo/fragmento, las tareas y las traducciones** ejecutan agy sin ninguna opción de permisos y sin herramientas en una carpeta temporal vacía: agy no puede leer ni escribir tus archivos; solo sale la información que el script incluyó en el prompt (con los secretos reconocidos censurados).

**Las revisiones agentic** (objetivos git o `--agentic`) inician agy con `--dangerously-skip-permissions` para que nada espere un prompt, y dependen de un Guard hook `PreToolUse` (`guard.mjs`) que inspecciona cada llamada a herramientas y **deniega de forma predeterminada**:

- permitido: herramientas de visualización y búsqueda de archivos; comandos de shell, únicos o encadenados, compuestos solo por subcomandos `git` de solo lectura, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (sin `-delete`/`-exec`), `Get-*` de PowerShell, `Select-String` y algunos más (la lista está en `guard.mjs`);
- denegado: cualquier herramienta de escritura/edición/notebook/imagen/programación/sub-agent/navegador/web/MCP y cualquier herramienta desconocida; redirección, `$(...)`, backticks, bloques de script, construcciones parecidas a `eval`; `git commit/push/checkout/reset/...`; intérpretes y gestores de paquetes; `curl`, `ssh`; lectura de almacenes de credenciales (`.ssh`, `.aws`, `.gnupg`, claves privadas);
- si la protección falla, deniega; el script se niega a iniciar una ejecución agentic salvo que la protección esté instalada, sea idéntica a la incluida **y exista un `--verify` correcto registrado para esta protección y esta versión de agy**; antes y después de la ejecución crea huellas de `git status`, de los diffs rastreados y preparados, y del contenido de cada archivo no rastreado, y sale con 3 y una advertencia si algo cambia.
- **Los secretos en modo agentic no se pueden censurar** antes de que el revisor lea los archivos. La herramienta los detecta, avisa y los enumera en `limitations`; rótalos o revisa con `--file` / `--symbol`, donde se censuran primero.

**Las actualizaciones de graphify** (`--graphify`) no dan ninguna herramienta al model: recibe texto mediante un servidor que solo escucha en `127.0.0.1`, exige una clave bearer aleatoria que solo existe durante una actualización, rechaza encabezados `Host` externos y ejecuta `agy` en una carpeta temporal vacía sin ninguna opción de permisos. Lo que se escribe en disco lo escriben graphify (`graphify-out/`) y esta herramienta (git hooks, `~/.agy-review/runtime`, un bloqueo y un registro). Los hooks ejecutan código con cada commit: es la misma confianza que ya depositas en los hooks de graphify, y `--graphify hook-uninstall` los elimina.

Lo que esto no es:

- **No es un sandbox del sistema operativo.** La protección filtra nombres de herramientas y texto de comandos; el sandbox propio de agy no está disponible en todas partes. Una inyección de prompt deliberada y oculta en el código revisado podría buscar una forma de comando que el filtro acepte. La comprobación anterior y posterior detecta archivos rastreados modificados y archivos nuevos, no lecturas.
- **Tu código se envía al model de Google**; las lecturas no tienen restricciones salvo las rutas de credenciales. Las revisiones agentic pueden leer archivos `.env` del repository. No revises código que no puedas compartir.
- git puede ejecutar programas externos de diff o textconv configurados en un repository: revisa solo repositories de confianza.
- Los hallazgos pueden ser incorrectos o incompletos, y "sin hallazgos" nunca significa "seguro".

## 10. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `Missing: agy CLI` | instala Antigravity CLI y ejecuta `agy` una vez para iniciar sesión; `agy --version` debe funcionar en el shell que ejecuta el plugin |
| `Missing: read-only guard - missing/outdated` | ejecuta la configuración (`/agy-review:setup`, la skill `setup` de Codex o `--install-guard`); solo las revisiones agentic la necesitan |
| `Not inside a git repository` (exit 2) | usa `cd` para ir a la raíz del repository o revisa código con `--file` / `--symbol` / `--stdin` |
| Veredicto `inconclusive`, exit 4 | no es un aprobado: se rechazaron hallazgos, el model no coincidió o no cubrió el código, o falló otro model. Reduce el alcance, añade `--context` o prueba otro `--model` |
| `blocked by Gemini's filters` | el filtro de seguridad de Gemini lo rechazó (es habitual con prompts de seguridad). Sin `--model`, la herramienta reintenta con un model que no sea Gemini; de lo contrario, elige uno con `--model` |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` o `conflicts with --effort` o `--effort is not supported` | corregido en 1.0.1: el effort se adapta automáticamente al model y el informe indica qué se usó. Si aún aparece, ejecuta `--list-models --refresh`, actualiza el plugin (sección 12) e informa del problema |
| graphify: `openai package ... missing` | al Python propio de graphify le falta el paquete `openai`. Ejecuta `--graphify setup --yes` o `uv tool install --force "graphifyy[openai]"` (pipx: `pipx inject graphifyy openai`) |
| graphify: el grafo no se actualizó después de un commit | `--graphify status` muestra los hooks y el último resultado; lee `graphify-out/.agy-update.log`; ejecuta una vez `--graphify update --debug` en primer plano (conserva cada solicitud y respuesta en `graphify-out/.agy-debug/`, que contiene tu documentación). Si aún no hay grafo, el hook no hace nada: créalo una vez con `--graphify update --full` |
| graphify: `agy returned no answer` para una parte | graphify vuelve a intentar esa parte en la siguiente actualización. Comprueba el inicio de sesión y la quota con `agy -p "say hi"`, o elige otro model con `--set graphifyModel=<id>` |
| graphify avisa de que las versiones de la skill y el paquete son distintas | no afecta a esta herramienta; actualiza graphify con `uv tool upgrade graphifyy` |
| Revisión vacía, exit 1 | comprueba el inicio de sesión y la quota con `agy -p "say hi"`; aumenta `--timeout` para objetivos grandes |
| Exit 3 / el árbol de trabajo cambió | algo modificó tus archivos durante una revisión agentic (editor, compilación o una evasión de la protección). Comprueba `git status` y `git diff`; si no los cambiaste tú, trátalo como un incidente de seguridad |
| Muchos hallazgos rechazados | el model citó código que no existe. A veces ocurre; nunca se cuentan. Usa un `--model` más potente o un alcance menor |
| `--symbol`: "defined in several places" o "not found" | pasa `--file` o usa `--file path:A-B`. El buscador es heurístico (empareja llaves/sangría), no un analizador |
| Codex: "blocked by sandbox" | consulta 5b: se deben permitir la red, las escrituras en `~/.gemini/antigravity-cli` y un socket de localhost |
| Windows: no se encuentra `agy` o `bun` dentro de Claude/Codex | el shell de la herramienta tiene un `PATH` distinto; iníciala desde un shell donde funcione el comando |
| `verify` imprime FAIL | no uses revisiones agentic en código importante; abre una incidencia con la salida y `agy --version` |

## 11. Preguntas frecuentes

**¿Cambia mi código?** No. Los modos estáticos no pueden hacerlo; el modo agentic bloquea las escrituras y avisa si tu árbol cambia después. Nunca hace commit, stash ni checkout.

**¿Bun es más rápido que Node aquí?** No de forma apreciable. En el equipo Windows del autor, el inicio tardó unos 56 ms con Node y 64 ms con Bun, y el Guard hook unos 60 ms frente a 57 ms; una revisión tarda decenas de segundos y ese tiempo corresponde al model. Bun es la opción documentada predeterminada; Node 18.18+ funciona igual. Ambos están cubiertos por el mismo código.

**¿Cuesta dinero?** El plugin es gratis. Cada revisión, tarea, traducción y actualización de graphify consume tu quota de Antigravity.

**¿Necesito Ollama o una API key para graphify?** No. graphify tiene un espacio de backend llamado "ollama" que significa "cualquier servidor local compatible con OpenAI"; detrás está el pequeño servidor de Antigravity de esta herramienta. Lo único que debes instalar es el paquete de Python `openai` de graphify, que añade `--graphify setup --yes`.

**¿graphify seguirá gastando mis tokens de Claude o Codex?** Solo si tú o tu agent ejecutáis `/graphify --update`, `graphify extract` o algo parecido, o si una sección de `CLAUDE.md` / `AGENTS.md` indica al agent que reconstruya el grafo. Usa `--graphify rules --write-rules` para añadir la regla que lo evita.

**¿Qué archivos ve Antigravity?** Modos estáticos: solo el código que envía el script (más una cantidad limitada de código relacionado para `--security`). Modos agentic: cualquier cosa que lea en el repository y en cualquier lugar del disco salvo las rutas de credenciales.

**¿Puede corregir los hallazgos?** Nunca lo hace. Los corrige otro agent o tú; el revisor solo revisa y así mantiene su independencia.

**¿Puede revisar un pull request de GitHub?** Haz checkout del branch localmente y usa `--base`. No hay acceso a la API de GitHub.

**¿Por qué no crear una lista de comandos permitidos en la configuración de agy?** Se ha probado: en modo headless, agy compara de forma exacta los permisos de varias palabras (`git status` sí, `git status --short` no) y el "allow" de un hook no anula la comprobación de permisos. Un hook solo puede denegar con fiabilidad; por eso el modo agentic combina skip-permissions con un hook que deniega por defecto, y el modo estático no tiene herramientas.

**¿Puedo añadir comandos permitidos o reglas del escáner?** Edita `CMDS` / `GIT_OK` en `guard.mjs` o `RULES` en `lib/security.mjs`, ejecuta `npm test` y después `--install-guard`.

## 12. Actualizar, desinstalar, desarrollar

### Cómo actualizar a una versión nueva

Una release nueva no llega por sí sola: debes actualizarla de forma intencionada. Son cuatro pasos.

**1. Comprueba qué tienes y si hay algo más reciente**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

También puedes consultar la lista de release en https://github.com/Ealireza/agy-review/releases y el [changelog](../CHANGELOG.md).

**2. Actualiza el plugin para el entorno que usas**

| Entorno | Comandos (ejecútalos en una terminal normal) | Después |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` y después `claude plugin update agy-review@agy-review` | reinicia Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review` y después `codex plugin remove agy-review@agy-review` y `codex plugin add agy-review@agy-review` | reinicia Codex |
| Clon normal | `git pull` en tu clon | nada |

**3. Actualiza las partes que están fuera de la carpeta del plugin**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Confirma que ha funcionado:** `--version` muestra el número nuevo, `--check` indica OK para todo y `--list-models --refresh` vuelve a leer qué acepta cada model para `--effort`.

Si algo falla después de actualizar: ejecuta `--check`, consulta la tabla de solución de problemas (sección 10) y, si necesitas volver a la versión anterior, elimina el plugin e instala una release concreta con `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. Tu configuración (`.agy-review.json`) son archivos normales que las actualizaciones nunca tocan.

### Desinstalar

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Borra `~/.agy-review` (copia del runtime) y `~/.agy-review-cache.json` (caché del effort) si no quieres dejar nada.

### Desarrollo

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

Las incidencias y los pull requests son bienvenidos, sobre todo: resultados de `verify` en macOS y Linux, configuraciones del sandbox de Codex que funcionen, formas de saltarse la protección (informa primero en privado si puedes) y nuevas reglas del escáner. Traducciones: copia `README.md` a `docs/README.<code>.md`, tradúcelo y añade el idioma a la línea del selector en todas partes.

## Licencia

MIT, consulta [LICENSE](../LICENSE).
