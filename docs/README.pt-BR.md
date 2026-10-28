# agy-review

**Um revisor independente que precisa mostrar o próprio trabalho.** Revisão de código, revisão de segurança, delegação de tarefas e tradução pelo Google Antigravity (`agy`), a partir do Claude Code, do Codex ou de qualquer terminal. Somente leitura, sem pedidos de permissão, e cada achado é conferido com o seu código real antes de chegar a você.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Português (BR)** · [Deutsch](README.de.md) · [Français](README.fr.md)

Site: https://ealireza.github.io/agy-review/ · Aprofundamento (em inglês): [AGENTS.md](AGENTS.md) para agentes e loops, [SECURITY-REVIEW.md](SECURITY-REVIEW.md) para o método de segurança.

---

## Sumário

1. O que você recebe
2. Por que você pode confiar no relatório
3. Status: o que foi verificado e o que não foi
4. Requisitos
5. Instalação
6. Primeira execução: verifique na sua máquina
7. Uso: revisão, segurança, tarefas, tradução, modelos
8. Uso a partir de agentes, subagentes e loops
9. Modelo de segurança
10. Solução de problemas
11. Perguntas frequentes
12. Atualizar, desinstalar, desenvolver

---

## 1. O que você recebe

| Skill (Claude Code / Codex) | Comando (Claude Code) | O que faz |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | revisão graduada de alterações do git, de um branch, de um arquivo, de um intervalo de linhas, de uma função ou de um trecho |
| `agy-security` / `security` | `/agy-review:security` | revisão de segurança: OWASP/CWE, explorabilidade, cenário de ataque, scanner de segredos e padrões ruins, chamadores e chamados como contexto |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | entrega qualquer tarefa autocontida (reescrever, resumir, redigir, extrair) ao Antigravity e devolve o resultado |
| `agy-translate` / `translate` | `/agy-review:translate` | tradução com tom, público e glossário; verifica se código, URLs, placeholders e estrutura foram preservados |
| `agy-models` / `models` | `/agy-review:models` | lista os modelos do seu agy, escolhe um, salva para o projeto ou globalmente, define o esforço |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | verifica os pré-requisitos, instala o guard somente leitura, comprova na sua máquina que as gravações são bloqueadas |

Subagentes para o Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Tudo está em um único repositório e um único script (`plugins/agy-review/scripts/agy-review.mjs`). Não há servidor, nem conta além do seu próprio login no Antigravity.

## 2. Por que você pode confiar no relatório

Um modelo de linguagem que revisa código às vezes inventa um problema. Esta ferramenta não aceita nada apenas pela palavra dele.

1. O revisor precisa devolver um relatório JSON estrito (imposto por `--json-schema`). Cada achado traz o **código exato** a que se refere.
2. O script procura essa citação no arquivo real. **Não encontrada: o achado é rejeitado** e listado à parte. **Encontrada em outra linha: o número da linha é corrigido.** Citações curtas ou genéricas demais para provar algo (`return null;`, `}`) são rejeitadas. Uma citação que coincide com vários trechos distantes da linha indicada é rejeitada por ambiguidade.
3. O veredito, as contagens e o gate de CI são **calculados pelo script** apenas a partir de achados verificados, nunca copiados do modelo.
4. Nada verificado **não** é uma aprovação: se achados foram rejeitados, se o modelo discordou, se não cobriu o código ou se um dos vários modelos falhou, o veredito é `inconclusive` e o código de saída é 4.
5. Achados fora das linhas solicitadas recebem um rótulo e nunca bloqueiam. Achados de baixa confiança são listados, mas não contados.
6. Severidade (impacto) e prioridade (quando corrigir) são separadas e mantidas coerentes: critical é sempre P0, nit é sempre P3, achados de estilo nunca ficam acima de low.

O que ainda é possível: uma citação correta com uma conclusão errada. A citação prova que o código existe, não que o raciocínio está certo; por isso cada achado traz um cenário concreto e por isso você deve ler as linhas citadas antes de agir.

Exemplo real, esta ferramenta em um arquivo pequeno com dois bugs plantados (Claude Sonnet 4.6 via agy): 4 achados verificados nas linhas certas, com CWE-89, CWE-78, CWE-22 e CWE-369, cobertura de 100 %, um duplicado descartado, e o scanner apontou de forma independente as mesmas duas linhas.

## 3. Status: o que foi verificado e o que não foi

| Verificação | Resultado |
|---|---|
| Testes unitários e de pipeline (`npm test`): ancoragem, escopo, veredito, deduplicação, localizador de símbolos, alvos, configuração, modelos, tarefas, tradução, segurança, redação | 50 testes, todos passam, com um `agy` falso (incluindo o pipeline agentic, a detecção de alteração da árvore, um modelo com falha e o gate do `verify`) |
| Hook guard (comandos permitidos e negados, ferramentas, truques de aspas, caminhos de credenciais) | testes automatizados, passam |
| Manifestos do Claude Code (`claude plugin validate`), plugin do Antigravity (`agy plugin validate --strict`) | passam |
| Codex 0.163.0: adicionar marketplace, instalar plugin, skills descobertas | verificado no Windows 11 |
| Revisão estática, revisão de segurança e tarefas com o agy 1.4.8 real (Gemini 3.8 Flash e Claude Sonnet 4.6), executadas com Bun 1.3.14 | verificado no Windows 11; achados ancorados nas linhas certas |
| Duas revisões independentes do design e do código (Opus: 25 achados; Codex: 28 achados), com os confirmados corrigidos e um teste de regressão para cada | concluído, veja o changelog |
| **Revisões agentic (`agy --dangerously-skip-permissions` mais o guard bloqueando gravações reais)** | **não executadas pelo autor** |

A última linha importa para a segurança e depende da versão do seu agy; portanto execute `verify` uma vez após a instalação e após cada atualização do agy (seção 6). Revisões estáticas, revisões de segurança de um símbolo/arquivo/trecho, tarefas e traduções nunca usam essa flag e não podem gravar nada.

Testado com agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 e Node 24, Windows 11. macOS e Linux deveriam funcionar (o agy usa `~/.gemini/config/plugins` em todas as plataformas), mas não foram testados.

## 4. Requisitos

Nada além disso: nenhum outro plugin, nenhuma outra ferramenta de linha de comando.

| Necessário | Para quê | Como obter | Como conferir |
|---|---|---|---|
| Antigravity CLI `agy` | faz o trabalho | https://antigravity.google/cli, depois execute `agy` uma vez e faça login | `agy --version` |
| Bun (recomendado) **ou** Node.js 18.18+ | executa o script e o hook guard | https://bun.sh ou https://nodejs.org | `bun --version` / `node --version` |
| git | alvos git e localização de código relacionado | https://git-scm.com | `git --version` |
| Claude Code **ou** Codex **ou** qualquer terminal | onde você faz o pedido | os respectivos guias de instalação | `claude --version` / `codex --version` |

O Bun é o padrão em todas as instruções e no hook guard (`bun guard.mjs || node guard.mjs`); o Node funciona de forma idêntica. O uso do Antigravity consome a sua própria cota. Uma revisão pode levar de segundos a vários minutos.

## 5. Instalação

Escolha o host que você usa; vários podem compartilhar o mesmo script e o mesmo guard.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` verifica o agy, o git e o guard, e instala o guard em `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` é a prova de segurança ao vivo.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Reinicie o Codex e peça em linguagem natural: "Check my Antigravity review setup", "Review my changes with Antigravity", "Security-review the function saveUpload", "Translate README.md to German, friendly tone".

1. **Instale o guard uma vez a partir de um terminal normal** (ele grava em `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). Somente as revisões git agentic precisam do guard.
2. **O sandbox do Codex precisa permitir que o agy trabalhe:** rede de saída, acesso de gravação a `~/.gemini/antigravity-cli` e um socket localhost. Com `workspace-write` você provavelmente precisará, em `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Se algo ainda estiver bloqueado, a skill informa o acesso que falta e para; ela nunca amplia permissões por conta própria. Se o agy funciona corretamente dentro do sandbox do seu Codex é a parte da configuração do Codex que o autor não conseguiu testar; portanto execute `verify` também de dentro do Codex.

### 5c. Terminal comum

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

Dica: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Somente o lado do Antigravity

O guard é um plugin comum do Antigravity. Copie `plugins/agy-review/antigravity-plugin/readonly-review` para `~/.gemini/config/plugins/readonly-review` ou execute `--install-guard`; confira com `agy plugin list`. Ele não faz nada a menos que um prompt contenha `AGY_READONLY_REVIEW`, portanto as suas sessões normais do agy não mudam. Ele também inclui uma skill `readonly-code-review` para o agy interativo.

## 6. Primeira execução: verifique na sua máquina

Execute uma vez após instalar e após cada atualização do agy: `/agy-review:verify`, a skill `verify` do Codex ou `--verify`. Ele faz uma pequena chamada ao vivo ao agy em uma pasta descartável: ler um arquivo (deve funcionar), gravar um arquivo, redirecionar para um arquivo e apagar um arquivo (todos devem ser bloqueados). Esperado:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Qualquer `FAIL` termina com `NOT VERIFIED` e as revisões agentic permanecem desativadas: abra uma issue com a saída e o resultado de `agy --version`. Um `verify` bem-sucedido é registrado exatamente para este guard e esta versão do agy; **as revisões agentic se recusam a iniciar sem ele**, e uma atualização do agy ou do guard o invalida, portanto execute `verify` novamente após as atualizações. Os modos estáticos não precisam dele.

## 7. Uso

Execute a partir da raiz do repositório.

### 7a. Revisão: escolha o alvo

| Você quer revisar | Use | Modo |
|---|---|---|
| trabalho não commitado | nada | agentic, somente leitura |
| um branch / alterações staged / um commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, somente leitura |
| um arquivo ou um intervalo | `--file src/a.kt` ou `--file src/a.kt:40-80` (repetível) | estático |
| uma função ou classe | `--symbol parseConfig` (+ `--file` se o nome for ambíguo) | estático |
| código que existe apenas na memória | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | estático |
| qualquer um destes mais permissão para olhar outros arquivos | adicione `--agentic` | agentic, somente leitura |

*Estático*: o próprio script lê e numera o código e o modelo não recebe ferramentas, portanto nada pode ser tocado e nada pode ser inventado sobre arquivos que não lhe foram mostrados. *Agentic*: o revisor lê o repositório por conta própria através do hook guard, que bloqueia toda gravação.

Ajude o revisor: `--context "o que este código deve fazer"`, `--focus "concurrency, error handling"` (ou palavras no final), `--context-lines N`.

Saída: Markdown por padrão; `--format json` para máquinas; `--output file`; `--fail-on high` (saída 10 se existir um achado high ou critical verificado); `--previous old.json` marca os achados como novos, persistentes, resolvidos ou não reportados novamente.

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

### 7b. Revisão de segurança

`--security` (skill `agy-security`, comando `/agy-review:security`, subagente `agy-security`) funciona com todos os alvos acima e acrescenta: um método de modelagem de ameaças (fonte não confiável até o sink perigoso, com os controles no caminho), mapeamento para OWASP Top 10 (2021) e CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, um scanner sem modelo para segredos e cerca de 25 classes de padrões ruins, e **código relacionado**: o que o alvo chama e quem o chama.

- Um segredo embutido no código (chave privada, AWS, GitHub, Stripe, Slack, Google) é **redigido antes de qualquer envio a um modelo** e reportado como achado por padrão.
- Um `cve` em um relatório é uma afirmação do modelo e é sempre rotulado como `cve_verified: false`: confirme no NVD ou com `osv-scanner` / `npm audit` / `pip-audit`. A ferramenta nunca inventa nem verifica CVEs.
- "O Claude escreveu código, revise-o e o que está ao redor": copie a regra pronta de `examples/` para o seu `CLAUDE.md` ou `AGENTS.md`, ou instale o hook Stop opcional ou o hook de pre-commit. Detalhes e receitas de encadeamento: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Tarefas: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

O modelo recebe apenas o texto que você passa e nenhuma ferramenta. O modo texto imprime somente a resposta; o stderr informa o modelo e o esforço.

### 7d. Tradução: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Opções: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` ou CSV; `=` mantém o termo), `--keep a,b`, `--notes`, `--strict`. Textos longos são divididos em linhas em branco (nunca dentro de um bloco de código) e traduzidos trecho por trecho. Após traduzir, o script verifica se código em bloco, código inline, URLs, placeholders (`{{x}}`, `${x}`, `%s`), tags e títulos correspondem à origem, e relata cada diferença (`--strict` transforma uma diferença em saída 11). As skills primeiro entrevistam você sobre tom, público e termos, perguntando apenas o que não conseguem deduzir. Verificações automáticas não avaliam a fluência; peça a um leitor nativo que confira textos importantes.

### 7e. Modelos e esforço

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Por execução: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Precedência: linha de comando, arquivo do projeto, arquivo do usuário, padrão do agy. `--effort auto` (o padrão) é uma escolha determinística e explicada: revisões escalam com a quantidade de código no escopo (um foco sensível a risco, como segurança, acrescenta um nível), tarefas com a redação (transformações mecânicas low, as que exigem raciocínio high) e com o tamanho da entrada; `max` nunca é automático. Alguns modelos não aceitam `--effort`; a ferramenta então usa o padrão do modelo e informa isso. Se o filtro de conteúdo do Gemini recusar um prompt e você não tiver indicado um modelo, a ferramenta tenta mais uma vez com um modelo que não seja Gemini e informa isso.

### 7f. Opções e códigos de saída

`bun agy-review.mjs --help` lista tudo. Códigos de saída: `0` ok · `1` erro, timeout ou resposta não interpretável · `2` erro de uso ou pré-requisito ausente · `3` a árvore de trabalho mudou durante uma revisão agentic · `4` inconclusivo ou incompleto (**não é aprovação**) · `10` o gate `--fail-on` falhou (o relatório é válido) · `11` a verificação da tradução falhou com `--strict`. Se vários se aplicarem, `3` prevalece sobre `10`, e `10` sobre `4`; um relatório é gravado em todos os casos, exceto `1` e `2`, portanto leia `verdict` e `incomplete` nele. Uma árvore de trabalho limpa não é um erro: a ferramenta imprime "No changes to review" e sai com 0 sem chamar um modelo.

## 8. Uso a partir de agentes, subagentes e loops

Cada skill é uma chamada de CLI simples com JSON estável, de modo que qualquer agente pode usá-la: inicie o subagente `agy-reviewer`, `agy-security` ou `agy-worker` no Claude Code, chame as skills no Codex ou chame o script a partir de qualquer framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

O revisor nunca é informado sobre o que você alterou, de modo que cada rodada permanece independente. Contrato completo, campos JSON, receitas de loop e padrões de fan-out: [AGENTS.md](AGENTS.md).

## 9. Modelo de segurança

**Revisões estáticas, revisões de segurança de um símbolo/arquivo/trecho, tarefas e traduções** executam o agy sem nenhuma flag de permissão e sem ferramentas, em uma pasta temporária vazia: o agy não consegue ler nem gravar os seus arquivos; os únicos dados que saem são os que o script colocou no prompt (com os segredos reconhecidos redigidos).

**Revisões agentic** (alvos git, ou `--agentic`) iniciam o agy com `--dangerously-skip-permissions` para que nada espere por um prompt, e dependem de um hook guard `PreToolUse` (`guard.mjs`) que inspeciona cada chamada de ferramenta e **nega por padrão**:

- permitido: ferramentas de visualização e busca de arquivos; comandos de shell, isolados ou encadeados, construídos apenas com subcomandos `git` somente leitura, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (sem `-delete`/`-exec`), `Get-*` do PowerShell, `Select-String` e mais alguns (a lista está em `guard.mjs`);
- negado: toda ferramenta de gravação/edição/notebook/imagem/agendamento/subagente/navegador/web/MCP e qualquer ferramenta desconhecida; redirecionamento, `$(...)`, crases, blocos de script, construções do tipo `eval`; `git commit/push/checkout/reset/...`; interpretadores e gerenciadores de pacotes; `curl`, `ssh`; leitura de repositórios de credenciais (`.ssh`, `.aws`, `.gnupg`, chaves privadas);
- se o guard travar, ele nega; o script se recusa a iniciar uma execução agentic a menos que o guard esteja instalado, idêntico ao incluído, **e que um `--verify` bem-sucedido tenha sido registrado para este guard e esta versão do agy**; antes e depois da execução ele calcula a impressão digital de `git status`, dos diffs rastreados e staged e do conteúdo de todo arquivo não rastreado, e sai com 3 e um aviso se algo diferir.
- **Segredos no modo agentic não podem ser redigidos** antes de o revisor ler os arquivos. A ferramenta os detecta, avisa e os lista em `limitations`; rotacione-os, ou revise com `--file` / `--symbol`, onde são redigidos primeiro.

O que isto não é:

- **Não é um sandbox de SO.** O guard filtra nomes de ferramentas e o texto dos comandos; o sandbox próprio do agy não está disponível em todo lugar. Uma injeção de prompt deliberada escondida no código revisado poderia procurar um formato de comando que o filtro aceite. A verificação antes/depois detecta arquivos rastreados modificados e arquivos novos, não leituras.
- **Seu código é enviado ao modelo do Google**; as leituras são irrestritas, exceto nos caminhos de credenciais. Arquivos `.env` no repositório podem ser lidos por revisões agentic. Não revise código que você não pode compartilhar.
- O git pode executar programas externos de diff ou textconv configurados em um repositório: revise repositórios em que você confia.
- Os achados podem estar errados ou incompletos, e "nenhum achado" nunca significa "seguro".

## 10. Solução de problemas

| Sintoma | Causa e correção |
|---|---|
| `Missing: agy CLI` | instale o Antigravity CLI e execute `agy` uma vez para fazer login; `agy --version` precisa funcionar no shell que executa o plugin |
| `Missing: read-only guard - missing/outdated` | execute o setup (`/agy-review:setup`, a skill `setup` do Codex ou `--install-guard`); somente as revisões agentic precisam dele |
| `Not inside a git repository` (saída 2) | use `cd` para a raiz do repositório ou revise código com `--file` / `--symbol` / `--stdin` |
| Veredito `inconclusive`, saída 4 | não é aprovação: achados foram rejeitados, o modelo discordou ou não cobriu o código, ou um modelo falhou. Restrinja o escopo, adicione `--context` ou tente outro `--model` |
| `blocked by Gemini's filters` | o filtro de segurança do Gemini recusou (comum em prompts de segurança). Sem `--model`, a ferramenta tenta novamente com um modelo que não seja Gemini; caso contrário, escolha um com `--model` |
| `--effort is not supported for model` | tratado automaticamente (o padrão do modelo é usado e informado) |
| Revisão vazia, saída 1 | verifique o login e a cota com `agy -p "say hi"`; aumente `--timeout` para alvos grandes |
| Saída 3 / árvore de trabalho alterada | algo modificou os seus arquivos durante uma revisão agentic (editor, build ou um bypass do guard). Verifique `git status` e `git diff`; se você não os alterou, trate como um evento de segurança |
| Muitos achados rejeitados | o modelo citou código que não existe. Às vezes é esperado; eles nunca são contados. Use um `--model` mais forte ou um escopo mais restrito |
| `--symbol`: "defined in several places" ou "not found" | passe `--file` ou use `--file path:A-B`. O localizador é heurístico (correspondência de chaves/indentação), não um parser |
| Codex: "blocked by sandbox" | veja 5b: rede, gravações em `~/.gemini/antigravity-cli` e um socket localhost precisam ser permitidos |
| Windows: `agy` ou `bun` não encontrado dentro do Claude/Codex | o shell da ferramenta tem um `PATH` diferente; inicie a partir de um shell em que o comando funcione |
| `verify` imprime FAIL | não use revisões agentic em código importante; abra uma issue com a saída e `agy --version` |

## 11. Perguntas frequentes

**Ele altera o meu código?** Não. Os modos estáticos não conseguem; o modo agentic bloqueia gravações e avisa se a sua árvore for diferente depois. Ele nunca faz commit, stash nem checkout de nada.

**O Bun é mais rápido que o Node aqui?** Não de forma mensurável. Na máquina Windows do autor, a inicialização levou cerca de 56 ms com Node e 64 ms com Bun, e o hook guard cerca de 60 ms contra 57 ms; uma revisão leva dezenas de segundos e esse tempo é o do modelo. O Bun é o padrão documentado; o Node 18.18+ funciona da mesma forma. Ambos são cobertos pelo mesmo código.

**Custa dinheiro?** O plugin é gratuito. Cada revisão consome a sua cota do Antigravity.

**Quais arquivos o Antigravity vê?** Modos estáticos: apenas o código que o script envia (mais código relacionado limitado, para `--security`). Modos agentic: tudo o que ele ler no repositório e em qualquer lugar do disco, exceto os caminhos de credenciais.

**Ele pode corrigir os achados?** Nunca. Outro agente ou você faz a correção; o revisor apenas revisa, e assim permanece independente.

**Ele pode revisar um pull request do GitHub?** Faça checkout do branch localmente e use `--base`. Não há acesso à API do GitHub.

**Por que não colocar os comandos em uma lista de permissão nas configurações do agy?** Testado: no modo headless, o agy compara concessões de várias palavras de forma exata (`git status` sim, `git status --short` não) e o "allow" de um hook não sobrepõe a verificação de permissão. Um hook só consegue negar de forma confiável; daí skip-permissions mais um hook com negação por padrão no modo agentic, e nenhuma ferramenta no modo estático.

**Posso adicionar comandos permitidos ou regras do scanner?** Edite `CMDS` / `GIT_OK` em `guard.mjs` ou `RULES` em `lib/security.mjs`, execute `npm test` e depois `--install-guard`.

## 12. Atualizar, desinstalar, desenvolver

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

Após uma atualização, execute o setup novamente (ele reinstala um guard alterado) e o verify.

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

Issues e pull requests são bem-vindos, especialmente: resultados de `verify` no macOS e no Linux, configurações de sandbox do Codex que funcionem, bypasses do guard (informe em particular primeiro, se puder) e novas regras do scanner. Traduções: copie `README.md` para `docs/README.<code>.md`, traduza e adicione o idioma à linha do seletor de idiomas em todos os lugares.

## Licença

MIT, veja [LICENSE](../LICENSE).
