# agy-review

**Un revisor independiente que tiene que demostrar lo que afirma.** Revisión de código, revisión de seguridad, delegación de tareas y traducción mediante Google Antigravity (`agy`), desde Claude Code, Codex o cualquier terminal. Solo lectura, sin solicitudes de permisos, y cada hallazgo se contrasta con tu código real antes de que lo veas.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · **Español** · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

Sitio web: https://ealireza.github.io/agy-review/ · Documentos en profundidad (en inglés): [AGENTS.md](AGENTS.md) para agentes y bucles, [SECURITY-REVIEW.md](SECURITY-REVIEW.md) para el método de seguridad.

---

## Contenido

1. Qué obtienes
2. Por qué puedes confiar en el informe
3. Estado: qué está verificado y qué no
4. Requisitos
5. Instalación
6. Primera ejecución: verifícalo en tu máquina
7. Uso: revisión, seguridad, tareas, traducción, modelos
8. Uso desde agentes, subagentes y bucles
9. Modelo de seguridad
10. Solución de problemas
11. Preguntas frecuentes
12. Actualizar, desinstalar, desarrollar

---

## 1. Qué obtienes

| Skill (Claude Code / Codex) | Comando (Claude Code) | Qué hace |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | revisión graduada de cambios de git, una rama, un archivo, un rango de líneas, una función o un fragmento |
| `agy-security` / `security` | `/agy-review:security` | revisión de seguridad: OWASP/CWE, explotabilidad, escenario de ataque, escáner de secretos y patrones peligrosos, llamadores y llamados como contexto |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | entrega a Antigravity cualquier tarea autocontenida (reescribir, resumir, redactar, extraer) y recibe el resultado |
| `agy-translate` / `translate` | `/agy-review:translate` | traducción con tono, audiencia y glosario; verifica que el código, las URL, los marcadores de posición y la estructura se conserven |
| `agy-models` / `models` | `/agy-review:models` | lista los modelos de tu agy, elige uno, guárdalo para el proyecto o de forma global y define el esfuerzo (effort) |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | comprueba los requisitos previos, instala la protección de solo lectura y demuestra en tu máquina que las escrituras están bloqueadas |

Subagentes para Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Todo es un único repositorio y un único script (`plugins/agy-review/scripts/agy-review.mjs`). No hay servidor ni ninguna cuenta aparte de tu propio inicio de sesión de Antigravity.

## 2. Por qué puedes confiar en el informe

Un modelo de lenguaje que revisa código a veces se inventa un problema. Esta herramienta no da por buena ninguna de sus afirmaciones.

1. El revisor debe devolver un informe JSON estricto (impuesto con `--json-schema`). Cada hallazgo incluye el **código exacto** al que se refiere.
2. El script busca esa cita en el archivo real. **No encontrada: el hallazgo se rechaza** y se lista aparte. **Encontrada en otra línea: se corrige el número de línea.** Se rechazan las citas demasiado cortas o genéricas para demostrar algo (`return null;`, `}`). Una cita que coincide con varios lugares alejados de la línea citada se rechaza por ambigua.
3. El veredicto, los recuentos y la puerta de CI los **calcula el script** únicamente a partir de hallazgos verificados, nunca los copia del modelo.
4. Que no haya nada verificado **no** es una aprobación: si se rechazaron hallazgos, el modelo discrepó, no cubrió el código o falló uno de varios modelos, el veredicto es `inconclusive` y el código de salida es 4.
5. Los hallazgos fuera de las líneas solicitadas se etiquetan y nunca bloquean. Los hallazgos de baja confianza se listan pero no se cuentan.
6. La severidad (impacto) y la prioridad (cuándo corregirlo) son independientes y se mantienen coherentes: critical es siempre P0, nit es siempre P3, y los hallazgos de estilo nunca superan low.

Lo que sigue siendo posible: una cita correcta con una conclusión equivocada. La cita demuestra que el código existe, no que el razonamiento sea correcto; por eso cada hallazgo incluye un escenario concreto y por eso conviene leer las líneas citadas antes de actuar.

Ejemplo real: esta herramienta sobre un archivo pequeño con dos errores plantados (Claude Sonnet 4.6 a través de agy): 4 hallazgos verificados en las líneas correctas con CWE-89, CWE-78, CWE-22 y CWE-369, cobertura del 100 %, un duplicado descartado, y el escáner señaló por su cuenta las mismas dos líneas.

## 3. Estado: qué está verificado y qué no

| Comprobación | Resultado |
|---|---|
| Pruebas unitarias y de canalización (`npm test`): anclaje al código, alcance, veredicto, deduplicación, buscador de símbolos, objetivos, configuración, modelos, tareas, traducción, seguridad, ocultación de secretos | 50 pruebas, todas pasan, con un `agy` simulado (incluidos el flujo agéntico, la detección de cambios en el árbol, un modelo que falla y la puerta `verify`) |
| Hook de protección (comandos permitidos y denegados, herramientas, trucos de comillas, rutas de credenciales) | pruebas automatizadas, pasan |
| Manifiestos de Claude Code (`claude plugin validate`), plugin de Antigravity (`agy plugin validate --strict`) | pasan |
| Codex 0.163.0: añadir marketplace, instalar plugin, skills detectadas | comprobado en Windows 11 |
| Revisión estática, revisión de seguridad y tareas con agy 1.4.8 real (Gemini 3.8 Flash y Claude Sonnet 4.6), ejecutado con Bun 1.3.14 | comprobado en Windows 11; hallazgos anclados en las líneas correctas |
| Dos revisiones independientes del diseño y del código (Opus: 25 hallazgos; Codex: 28 hallazgos), los confirmados corregidos con una prueba de regresión cada uno | hecho, véase el changelog |
| **Revisiones agénticas (`agy --dangerously-skip-permissions` más la protección que bloquea escrituras reales)** | **no ejecutadas por el autor** |

La última fila importa para la seguridad y depende de tu versión de agy, así que ejecuta `verify` una vez tras instalar y después de cada actualización de agy (sección 6). Las revisiones estáticas, las revisiones de seguridad de un símbolo/archivo/fragmento, las tareas y las traducciones nunca usan ese indicador y no pueden escribir nada.

Probado con agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 y Node 24, Windows 11. macOS y Linux deberían funcionar (agy usa `~/.gemini/config/plugins` en todas las plataformas) pero no se han probado.

## 4. Requisitos

Nada más: ni otros plugins ni otras herramientas de línea de comandos.

| Necesario | Para qué | Cómo obtenerlo | Cómo comprobarlo |
|---|---|---|---|
| Antigravity CLI `agy` | hace el trabajo | https://antigravity.google/cli, luego ejecuta `agy` una vez e inicia sesión | `agy --version` |
| Bun (recomendado) **o** Node.js 18.18+ | ejecuta el script y el hook de protección | https://bun.sh o https://nodejs.org | `bun --version` / `node --version` |
| git | objetivos de git y búsqueda de código relacionado | https://git-scm.com | `git --version` |
| Claude Code **o** Codex **o** cualquier terminal | desde donde lo pides | sus guías de instalación | `claude --version` / `codex --version` |

Bun es el valor predeterminado en todas las instrucciones y en el hook de protección (`bun guard.mjs || node guard.mjs`); Node funciona igual. El uso de Antigravity consume tu propia cuota. Una revisión puede tardar de unos segundos a varios minutos.

## 5. Instalación

Elige el entorno que uses; varios pueden compartir el mismo script y la misma protección.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` comprueba agy, git y la protección, e instala la protección en `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` es la prueba de seguridad en vivo.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Reinicia Codex y pide en lenguaje natural: «Comprueba mi configuración de revisión con Antigravity», «Revisa mis cambios con Antigravity», «Haz una revisión de seguridad de la función saveUpload», «Traduce README.md al alemán, tono cercano».

1. **Instala la protección una vez desde una terminal normal** (escribe en `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). Solo las revisiones agénticas de git necesitan la protección.
2. **El sandbox de Codex debe permitir que agy funcione:** red saliente, acceso de escritura a `~/.gemini/antigravity-cli` y un socket en localhost. Con `workspace-write` probablemente necesitarás, en `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Si algo sigue bloqueado, la skill indica el acceso que falta y se detiene; nunca amplía los permisos por sí misma. Que agy funcione correctamente dentro de tu sandbox de Codex es la parte de la configuración de Codex que el autor no pudo probar, así que ejecuta `verify` también desde dentro de Codex.

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

### 5d. Solo el lado de Antigravity

La protección es un plugin de Antigravity corriente. Copia `plugins/agy-review/antigravity-plugin/readonly-review` en `~/.gemini/config/plugins/readonly-review` o ejecuta `--install-guard`; compruébalo con `agy plugin list`. No hace nada a menos que un prompt contenga `AGY_READONLY_REVIEW`, de modo que tus sesiones normales de agy no cambian. También incluye una skill `readonly-code-review` para agy interactivo.

## 6. Primera ejecución: verifícalo en tu máquina

Ejecútalo una vez tras instalar y después de cada actualización de agy: `/agy-review:verify`, la skill `verify` de Codex o `--verify`. Hace una pequeña llamada real a agy en una carpeta desechable: leer un archivo (debe funcionar), escribir un archivo, redirigir a un archivo y borrar un archivo (todo esto debe estar bloqueado). Resultado esperado:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Cualquier `FAIL` termina con `NOT VERIFIED` y las revisiones agénticas siguen desactivadas: abre un issue con la salida y tu `agy --version`. Un `verify` correcto queda registrado para exactamente esta protección y esta versión de agy; **las revisiones agénticas se niegan a iniciarse sin él**, y una actualización de agy o de la protección lo invalida, así que vuelve a ejecutar `verify` tras las actualizaciones. Los modos estáticos no lo necesitan.

## 7. Uso

Ejecuta desde la raíz del repositorio.

### 7a. Revisión: elige el objetivo

| Quieres revisar | Usa | Modo |
|---|---|---|
| trabajo sin confirmar | nada | agéntico, solo lectura |
| una rama / cambios en el área de preparación / un commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agéntico, solo lectura |
| un archivo o un rango | `--file src/a.kt` o `--file src/a.kt:40-80` (repetible) | estático |
| una función o clase | `--symbol parseConfig` (+ `--file` si el nombre es ambiguo) | estático |
| código que solo existe en memoria | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | estático |
| cualquiera de los anteriores más permiso para mirar otros archivos | añade `--agentic` | agéntico, solo lectura |

*Estático*: el script lee y numera el código por sí mismo y el modelo no recibe herramientas, de modo que no se puede tocar nada ni inventar nada sobre archivos que no se le mostraron. *Agéntico*: el revisor lee el repositorio por sí mismo a través del hook de protección, que bloquea toda escritura.

Ayuda al revisor: `--context "what this code must do"`, `--focus "concurrency, error handling"` (o palabras al final), `--context-lines N`.

Salida: Markdown por defecto; `--format json` para máquinas; `--output file`; `--fail-on high` (código de salida 10 si existe un hallazgo verificado de nivel high o critical); `--previous old.json` marca los hallazgos como nuevos, persistentes, resueltos o no reportados de nuevo.

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

`--security` (skill `agy-security`, comando `/agy-review:security`, subagente `agy-security`) funciona con todos los objetivos anteriores y añade: un método de modelado de amenazas (de una fuente no confiable a un destino peligroso, con los controles intermedios), correspondencia con OWASP Top 10 (2021) y CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, un escáner sin modelo de secretos y unas 25 clases de patrones peligrosos, y **código relacionado**: a qué llama el objetivo y quién lo llama.

- Un secreto incrustado en el código (clave privada, AWS, GitHub, Stripe, Slack, Google) se **oculta antes de enviar nada a un modelo** y se reporta como hallazgo por patrón.
- Un `cve` en un informe es una afirmación del modelo y siempre se etiqueta como `cve_verified: false`: confírmalo en NVD o con `osv-scanner` / `npm audit` / `pip-audit`. La herramienta nunca inventa ni verifica CVE.
- «Claude escribió código, revísalo a él y a lo que lo rodea»: copia la regla ya preparada de `examples/` en tu `CLAUDE.md` o `AGENTS.md`, o instala el hook Stop opcional o el hook pre-commit. Detalles y recetas encadenadas: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Tareas: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

El modelo recibe solo el texto que le pasas y ninguna herramienta. El modo texto imprime solo la respuesta; stderr informa del modelo y del effort.

### 7d. Traducción: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Opciones: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` o CSV; `=` conserva el término), `--keep a,b`, `--notes`, `--strict`. Los textos largos se dividen en líneas en blanco (nunca dentro de un bloque de código) y se traducen fragmento a fragmento. Tras traducir, el script verifica que los bloques de código, el código en línea, las URL, los marcadores de posición (`{{x}}`, `${x}`, `%s`), las etiquetas y los encabezados coincidan con el original, y reporta cada diferencia (`--strict` convierte una diferencia en el código de salida 11). Las skills te entrevistan primero sobre tono, audiencia y términos, preguntando solo lo que no pueden deducir. Las comprobaciones automáticas no pueden juzgar la fluidez; haz que un hablante nativo revise los textos importantes.

### 7e. Modelos y effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Por ejecución: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Precedencia: línea de comandos, archivo del proyecto, archivo del usuario, valor predeterminado de agy. `--effort auto` (el valor por defecto) es una elección determinista y explicada: las revisiones escalan con la cantidad de código en el alcance (un enfoque sensible al riesgo, como la seguridad, añade un nivel), las tareas con la redacción (transformaciones mecánicas low, razonamiento intensivo high) y la longitud de la entrada; `max` nunca es automático. Algunos modelos no aceptan `--effort`; entonces la herramienta usa el valor predeterminado del modelo y lo indica. Si el filtro de contenido de Gemini rechaza un prompt y no indicaste un modelo, la herramienta reintenta una vez con un modelo que no sea Gemini y lo indica.

### 7f. Opciones y códigos de salida

`bun agy-review.mjs --help` lista todo. Códigos de salida: `0` correcto · `1` error, tiempo de espera agotado o respuesta no interpretable · `2` error de uso o falta un requisito previo · `3` el árbol de trabajo cambió durante una revisión agéntica · `4` no concluyente o incompleto (**no es un visto bueno**) · `10` falló la puerta `--fail-on` (el informe es válido) · `11` falló la comprobación de traducción con `--strict`. Si se aplican varios, `3` prevalece sobre `10`, y `10` sobre `4`; se escribe un informe en todos los casos salvo `1` y `2`, así que lee `verdict` e `incomplete` en él. Un árbol de trabajo limpio no es un error: la herramienta imprime "No changes to review" y termina con 0 sin llamar a ningún modelo.

## 8. Uso desde agentes, subagentes y bucles

Cada skill es una llamada de línea de comandos simple con JSON estable, así que cualquier agente puede usarla: lanza el subagente `agy-reviewer`, `agy-security` o `agy-worker` en Claude Code, llama a las skills en Codex o llama al script desde cualquier framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

Al revisor nunca se le dice qué has cambiado, de modo que cada ronda es independiente. Contrato completo, campos JSON, recetas de bucles y patrones de ejecución en paralelo: [AGENTS.md](AGENTS.md).

## 9. Modelo de seguridad

**Las revisiones estáticas, las revisiones de seguridad de un símbolo/archivo/fragmento, las tareas y las traducciones** ejecutan agy sin ningún indicador de permisos y sin herramientas, en una carpeta temporal vacía: agy no puede leer ni escribir tus archivos; lo único que sale es lo que el script puso en el prompt (con los secretos reconocidos ocultos).

**Las revisiones agénticas** (objetivos de git, o `--agentic`) inician agy con `--dangerously-skip-permissions` para que nada espere una confirmación, y se apoyan en un hook de protección `PreToolUse` (`guard.mjs`) que inspecciona cada llamada a una herramienta y **deniega por defecto**:

- permitido: herramientas de visualización y búsqueda de archivos; comandos de shell, individuales o encadenados, construidos solo con subcomandos de `git` de solo lectura, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (sin `-delete`/`-exec`), `Get-*` de PowerShell, `Select-String` y algunos más (la lista está en `guard.mjs`);
- denegado: toda herramienta de escritura/edición/notebook/imagen/programación/subagente/navegador/web/MCP y cualquier herramienta desconocida; redirección, `$(...)`, comillas invertidas, bloques de script, construcciones tipo `eval`; `git commit/push/checkout/reset/...`; intérpretes y gestores de paquetes; `curl`, `ssh`; la lectura de almacenes de credenciales (`.ssh`, `.aws`, `.gnupg`, claves privadas);
- si la protección falla, deniega; el script se niega a iniciar una ejecución agéntica a menos que la protección esté instalada, sea idéntica a la incluida, **y se haya registrado un `--verify` correcto para esta protección y esta versión de agy**; antes y después de la ejecución toma una huella de `git status`, de los diffs rastreados y preparados y del contenido de cada archivo sin rastrear, y termina con 3 y una advertencia si algo difiere.
- **Los secretos en modo agéntico no se pueden ocultar** antes de que el revisor lea los archivos. La herramienta los detecta, avisa y los lista en `limitations`; rótalos, o revisa con `--file` / `--symbol`, donde se ocultan primero.

Lo que esto no es:

- **No es un sandbox de sistema operativo.** La protección filtra nombres de herramientas y texto de comandos; el propio sandbox de agy no está disponible en todas partes. Una inyección de prompt deliberada oculta en el código revisado podría buscar una forma de comando que el filtro acepte. La comprobación de antes y después detecta archivos rastreados modificados y archivos nuevos, no lecturas.
- **Tu código se envía al modelo de Google**; las lecturas no tienen restricciones salvo las rutas de credenciales. Los archivos `.env` del repositorio son legibles por las revisiones agénticas. No revises código que no puedas compartir.
- git puede ejecutar programas externos de diff o textconv configurados en un repositorio: revisa solo repositorios de confianza.
- Los hallazgos pueden ser erróneos o incompletos, y «sin hallazgos» nunca significa «seguro».

## 10. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `Missing: agy CLI` | instala Antigravity CLI y ejecuta `agy` una vez para iniciar sesión; `agy --version` debe funcionar en el shell que ejecuta el plugin |
| `Missing: read-only guard - missing/outdated` | ejecuta setup (`/agy-review:setup`, la skill `setup` de Codex o `--install-guard`); solo las revisiones agénticas la necesitan |
| `Not inside a git repository` (código 2) | haz `cd` a la raíz del repositorio, o revisa código con `--file` / `--symbol` / `--stdin` |
| Veredicto `inconclusive`, código 4 | no es un visto bueno: se rechazaron hallazgos, el modelo discrepó o no cubrió el código, o falló un modelo. Reduce el alcance, añade `--context` o prueba otro `--model` |
| `blocked by Gemini's filters` | el filtro de seguridad de Gemini lo rechazó (habitual en prompts de seguridad). Sin `--model` la herramienta reintenta con un modelo que no sea Gemini; en caso contrario elige uno con `--model` |
| `--effort is not supported for model` | se gestiona automáticamente (se usa el valor predeterminado del modelo y se informa) |
| Revisión vacía, código 1 | comprueba el inicio de sesión y la cuota con `agy -p "say hi"`; aumenta `--timeout` para objetivos grandes |
| Código 3 / el árbol de trabajo cambió | algo modificó tus archivos durante una revisión agéntica (editor, compilación o una elusión de la protección). Revisa `git status` y `git diff`; si no los cambiaste tú, trátalo como un evento de seguridad |
| Muchos hallazgos rechazados | el modelo citó código que no está ahí. A veces es esperable; nunca se cuentan. Usa un `--model` más potente o un alcance más reducido |
| `--symbol`: "defined in several places" o "not found" | pasa `--file`, o usa `--file path:A-B`. El buscador es heurístico (emparejamiento de llaves/sangría), no un analizador sintáctico |
| Codex: "blocked by sandbox" | véase 5b: deben permitirse la red, las escrituras en `~/.gemini/antigravity-cli` y un socket en localhost |
| Windows: `agy` o `bun` no encontrado dentro de Claude/Codex | el shell de la herramienta tiene un `PATH` distinto; inicia desde un shell donde el comando funcione |
| `verify` muestra FAIL | no uses revisiones agénticas con código importante; abre un issue con la salida y `agy --version` |

## 11. Preguntas frecuentes

**¿Modifica mi código?** No. Los modos estáticos no pueden; el modo agéntico bloquea las escrituras y avisa si tu árbol difiere después. Nunca hace commit, stash ni checkout de nada.

**¿Es Bun más rápido que Node aquí?** No de forma medible. En la máquina Windows del autor el arranque fue de unos 56 ms con Node y 64 ms con Bun, y el hook de protección unos 60 ms frente a 57 ms; una revisión tarda decenas de segundos y ese tiempo es del modelo. Bun es el valor predeterminado documentado; Node 18.18+ funciona igual. Ambos están cubiertos por el mismo código.

**¿Cuesta dinero?** El plugin es gratuito. Cada revisión consume tu cuota de Antigravity.

**¿Qué archivos ve Antigravity?** Modos estáticos: solo el código que envía el script (más código relacionado acotado para `--security`). Modos agénticos: lo que lea en el repositorio y cualquier lugar del disco salvo las rutas de credenciales.

**¿Puede corregir los hallazgos?** Nunca lo hace. Otro agente o tú los corrigen; el revisor solo revisa, así que sigue siendo independiente.

**¿Puede revisar un pull request de GitHub?** Haz checkout de la rama en local y usa `--base`. No hay acceso a la API de GitHub.

**¿Por qué no permitir comandos en la configuración de agy?** Probado: en modo headless agy compara de forma exacta las autorizaciones de varias palabras (`git status` sí, `git status --short` no) y el «allow» de un hook no anula la comprobación de permisos. Un hook solo puede denegar de forma fiable, de ahí skip-permissions más un hook de denegación por defecto para el modo agéntico, y ninguna herramienta en absoluto para el modo estático.

**¿Puedo añadir comandos permitidos o reglas del escáner?** Edita `CMDS` / `GIT_OK` en `guard.mjs` o `RULES` en `lib/security.mjs`, ejecuta `npm test` y luego `--install-guard`.

## 12. Actualizar, desinstalar, desarrollar

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

Tras una actualización, ejecuta setup de nuevo (reinstala una protección modificada) y verify.

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

Los issues y pull requests son bienvenidos, sobre todo: resultados de `verify` en macOS y Linux, ajustes del sandbox de Codex que funcionen, elusiones de la protección (infórmalo primero en privado si puedes) y nuevas reglas del escáner. Traducciones: copia `README.md` a `docs/README.<code>.md`, tradúcelo y añade el idioma a la línea del selector en todas partes.

## Licencia

MIT, véase [LICENSE](../LICENSE).
