# agy-review

**Um revisor independente que precisa mostrar seu trabalho.** Revisão de código, revisão de segurança, delegação de tarefas e tradução pelo Google Antigravity (`agy`), usando Claude Code, Codex ou qualquer terminal. Somente leitura, sem prompts de permissão, e cada achado é conferido no seu código real antes de chegar até você.

> ## NOVO: pare de gastar tokens do Claude e do Codex para atualizar seu grafo do graphify
>
> **Agora as atualizações do graphify rodam no Antigravity, em segundo plano, a cada commit, merge, checkout e rebase. Seu agent gasta 0 tokens com elas e você não precisa de API key.**
>
> Um único comando, `agy-review --graphify setup`, registra novamente os git hooks do graphify para que **a parte cara de cada atualização do grafo (ler sua documentação e nomear comunidades com um model de linguagem) seja feita por um model barato do Antigravity, e não pela sua sessão do Opus ou Fable.** O `git commit` termina em uma fração de segundo e o grafo se atualiza sozinho.
>
> Em uma execução real no Windows, um commit que alterou código e um documento atualizou o grafo em **22 seconds com uma única chamada ao Antigravity e 0 tokens do Claude ou do Codex.** O model usado só pode ler e responder texto: ele não tem ferramentas nem permissão de escrita ou execução. Veja os detalhes e a configuração na seção 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Português (BR)** · [Deutsch](README.de.md) · [Français](README.fr.md)

Site: https://ealireza.github.io/agy-review/ · Conteúdo detalhado (em inglês): [docs/AGENTS.md](AGENTS.md) sobre agents e loops, [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) sobre o método de segurança.

---

## Sumário

1. O que você recebe
2. Por que você pode confiar no relatório
3. Status: o que foi verificado e o que não foi
4. Requisitos
5. Instalação
6. Primeira execução: verifique na sua máquina
7. Uso: revisão, segurança, tarefas, tradução, models, graphify
8. Uso com agents, sub-agents e loops
9. Model de segurança
10. Solução de problemas
11. Perguntas frequentes
12. Atualização (como obter uma nova versão), desinstalação e desenvolvimento

---

## 1. O que você recebe

| Skill (Claude Code / Codex) | Comando (Claude Code) | O que faz |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | revisão com classificação de alterações do git, de uma branch, arquivo, intervalo de linhas, função ou trecho de código |
| `agy-security` / `security` | `/agy-review:security` | revisão de segurança: OWASP/CWE, possibilidade de exploração, cenário de ataque, scanner de segredos e padrões ruins, além de funções chamadoras e chamadas como contexto |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | entrega qualquer tarefa autocontida (reescrever, resumir, redigir, extrair) ao Antigravity e devolve o resultado |
| `agy-translate` / `translate` | `/agy-review:translate` | tradução com tom, público e glossário; verifica se código, URLs, placeholders e estrutura foram preservados |
| `agy-models` / `models` | `/agy-review:models` | lista os models do seu agy e o `--effort` aceito por cada um, permite escolher um e salvá-lo para o projeto ou globalmente |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **mantém o grafo do graphify atualizado no Antigravity por meio de git hooks: 0 tokens do Claude ou do Codex, sem API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | confere os pré-requisitos, instala a proteção somente leitura e comprova na sua máquina que escritas são bloqueadas |

Sub-agents do Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Tudo fica em um único repository e em um único script (`plugins/agy-review/scripts/agy-review.mjs`). Não há servidor nem outra conta além do seu próprio login no Antigravity.

## 2. Por que você pode confiar no relatório

Às vezes, um model de linguagem que revisa código inventa um problema. Esta ferramenta não aceita a palavra dele sem comprovação.

1. O revisor precisa retornar um relatório JSON estrito (imposto por `--json-schema`). Cada achado inclui o **código exato** ao qual se refere.
2. O script procura essa citação no arquivo real. **Não encontrou: o achado é rejeitado** e aparece em uma lista separada. **Encontrou em outra linha: o número da linha é corrigido.** Citações curtas ou genéricas demais para provar algo (`return null;`, `}`) são rejeitadas. Uma citação que aparece em vários lugares distantes da linha indicada é rejeitada por ser ambígua.
3. O veredito, as contagens e a barreira de CI são **calculados pelo script** apenas com base nos achados verificados; nunca são copiados do model.
4. Nenhum achado verificado **não** significa aprovação: se houve achados rejeitados, os models discordaram, o código não foi coberto ou um dos vários models falhou, o veredito é `inconclusive` e o exit code é 4.
5. Achados fora das linhas solicitadas são identificados e nunca bloqueiam. Os de baixa confiança aparecem na lista, mas não entram na contagem.
6. Severidade (impacto) e prioridade (quando corrigir) são separadas e permanecem coerentes: critical é sempre P0, nit é sempre P3 e achados de estilo nunca passam de low.

Ainda pode acontecer de uma citação estar correta e a conclusão estar errada. A citação prova que o código existe, não que o raciocínio esteja certo; por isso, cada achado traz um cenário concreto, e você deve ler as linhas indicadas antes de agir.

Exemplo real desta ferramenta em um arquivo pequeno com dois bugs inseridos de propósito (Claude Sonnet 4.6 via agy): 4 achados verificados nas linhas corretas, com CWE-89, CWE-78, CWE-22 e CWE-369, cobertura de 100 %, uma duplicata descartada e o scanner identificando de forma independente as mesmas duas linhas.

## 3. Status: o que foi verificado e o que não foi

| Verificação | Resultado |
|---|---|
| Testes unitários e do pipeline (`npm test`): fundamentação, escopo, veredito, remoção de duplicatas, busca de símbolos, alvos, configuração, models, tarefas, tradução, segurança, redação de dados sensíveis | 72 testes, todos aprovados, com um `agy` falso (incluindo o pipeline agentic, a detecção de mudanças na árvore, um model com falha e a barreira `verify`) |
| Guard hook (comandos e ferramentas permitidos e negados, truques com aspas, caminhos de credenciais) | testes automatizados aprovados |
| Manifestos do Claude Code (`claude plugin validate`), plugin do Antigravity (`agy plugin validate --strict`) | aprovado |
| Codex 0.163.0: adição do marketplace, instalação do plugin, descoberta de skills | verificado no Windows 11 |
| Revisão estática, revisão de segurança e tarefas com o agy 1.4.8 real (Gemini 3.8 Flash e Claude Sonnet 4.6), executadas com Bun 1.3.14 | verificado no Windows 11; achados fundamentados nas linhas corretas |
| `--effort` por model: o model padrão (low, medium, high), models que trazem o effort no nome e models Claude sem `--effort` | verificado com o agy 1.4.8 real |
| graphify no Antigravity, de ponta a ponta: graphify 0.9.86 real com agy 1.4.8 real no Windows. Um git hook atualizou o grafo em segundo plano (22 s, 1 chamada ao Antigravity, `git commit` concluído em 0.3 s), e apenas o documento alterado foi enviado ao model | verificado manualmente e por testes com graphify e agy falsos |
| Duas revisões independentes do design e do código (Opus: 25 achados; Codex: 28 achados), com cada item confirmado corrigido e acompanhado por um teste de regressão | concluído; veja o changelog |
| **Revisões agentic (`agy --dangerously-skip-permissions` com a proteção bloqueando escritas reais)** | **não executadas pelo autor** |

Não foi testado pelo autor: `--graphify setup --yes` em uma instalação real do graphify feita com `uv tool` (o teste manual usou graphify instalado com pip, que já tinha o pacote `openai`). A linha agentic é importante para a segurança e depende da versão do seu agy. Por isso, execute `verify` uma vez depois da instalação e após cada atualização do agy (seção 6). Revisões estáticas, revisões de segurança de um símbolo/arquivo/trecho, tarefas e traduções nunca usam essa flag e não conseguem escrever nada.

Testado com agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 e Node 24 no Windows 11. Deve funcionar no macOS e Linux (agy usa `~/.gemini/config/plugins` em todas as plataformas), mas ainda não foi testado neles.

## 4. Requisitos

Nada além disso: nenhum outro plugin e nenhuma outra ferramenta CLI.

| Necessário | Por quê | Como obter | Como verificar |
|---|---|---|---|
| Antigravity CLI `agy` | faz o trabalho | https://antigravity.google/cli, depois execute `agy` uma vez e entre na sua conta | `agy --version` |
| Bun (recomendado) **ou** Node.js 18.18+ | executa o script e o guard hook | https://bun.sh ou https://nodejs.org | `bun --version` / `node --version` |
| git | fornece alvos do git e encontra código relacionado aos achados | https://git-scm.com | `git --version` |
| Claude Code **ou** Codex **ou** qualquer terminal | onde você faz o pedido | os respectivos guias de instalação | `claude --version` / `codex --version` |

Bun é o padrão em todas as instruções e no guard hook (`bun guard.mjs || node guard.mjs`); Node funciona da mesma forma. O uso do Antigravity consome sua própria quota. Uma revisão pode levar de alguns segundos a vários minutos.

## 5. Instalação

Escolha o host que você usa; vários podem compartilhar o mesmo script e a mesma proteção.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` verifica agy, git e a proteção, e instala a proteção em `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` é a comprovação de segurança em execução real.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Reinicie o Codex e peça em linguagem natural: "Verifique a configuração da minha revisão com Antigravity", "Revise minhas alterações com Antigravity", "Faça uma revisão de segurança da função saveUpload", "Traduza README.md para alemão, com tom amigável".

1. **Instale a proteção uma vez, em um terminal comum** (ela escreve em `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; o nome da pasta é a versão instalada, então, após uma atualização, use a pasta que existir). Somente revisões agentic de git precisam da proteção.
2. **O sandbox do Codex precisa permitir que o agy funcione:** acesso à rede externa, permissão de escrita em `~/.gemini/antigravity-cli` e um socket localhost. Com `workspace-write`, provavelmente será necessário adicionar isto a `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Se algo ainda estiver bloqueado, a skill informa qual acesso está faltando e para; ela nunca amplia permissões sozinha. O autor não conseguiu testar se o agy funciona corretamente dentro do sandbox do Codex. Por isso, execute `verify` também de dentro do Codex.

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

### 5d. Somente no Antigravity

A proteção é um plugin comum do Antigravity. Copie `plugins/agy-review/antigravity-plugin/readonly-review` para `~/.gemini/config/plugins/readonly-review` ou execute `--install-guard`; verifique com `agy plugin list`. Ela não faz nada a menos que um prompt contenha `AGY_READONLY_REVIEW`, então suas sessões normais do agy não mudam. O plugin também inclui uma skill `readonly-code-review` para uso interativo no agy.

## 6. Primeira execução: verifique na sua máquina

Execute uma vez após a instalação e depois de cada atualização do agy: `/agy-review:verify`, a skill `verify` do Codex ou `--verify`. O comando faz uma pequena chamada real ao agy em uma pasta descartável: lê um arquivo (deve funcionar), escreve em um arquivo, redireciona para um arquivo e exclui um arquivo (tudo isso deve ser bloqueado). Resultado esperado:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Qualquer `FAIL` termina com `NOT VERIFIED`, e as revisões agentic continuam desativadas: abra uma issue com a saída e a sua `agy --version`. Um `verify` aprovado fica registrado exatamente para essa proteção e essa versão do agy; **revisões agentic se recusam a iniciar sem ele**, e uma atualização do agy ou da proteção invalida o registro. Portanto, execute `verify` novamente após atualizações. Os modos estáticos não precisam dele.

## 7. Uso

Execute na raiz do repository.

### 7a. Revisão: escolha o alvo

| O que você quer revisar | Use | Modo |
|---|---|---|
| trabalho sem commit | nada | agentic, somente leitura |
| uma branch / alterações em staging / um commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, somente leitura |
| um arquivo ou intervalo | `--file src/a.kt` ou `--file src/a.kt:40-80` (pode repetir) | estático |
| uma função ou classe | `--symbol parseConfig` (+ `--file` se o nome for ambíguo) | estático |
| código que só existe na memória | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | estático |
| qualquer item acima com permissão para consultar outros arquivos | adicione `--agentic` | agentic, somente leitura |

*Estático*: o próprio script lê e numera o código, e o model não recebe ferramentas. Nada pode ser alterado, e ele não pode inventar informações sobre arquivos que não viu. *Agentic*: o revisor lê o repository por conta própria, passando pelo guard hook que bloqueia qualquer escrita.

Ajude o revisor: `--context "what this code must do"`, `--focus "concurrency, error handling"` (ou palavras no fim do comando), `--context-lines N`.

Saída: Markdown por padrão; `--format json` para máquinas; `--output file`; `--fail-on high` (exit 10 se houver um achado high ou critical verificado); `--previous old.json` marca os achados como novos, persistentes, resolvidos ou não relatados novamente.

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

`--security` (skill `agy-security`, comando `/agy-review:security`, sub-agent `agy-security`) funciona com todos os alvos acima e acrescenta: um método de threat model (da origem não confiável ao destino perigoso, incluindo os controles no caminho), mapeamento para OWASP Top 10 (2021) e CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, um scanner sem model para segredos e cerca de 25 classes de padrões ruins, além de **código relacionado**: o que o alvo chama e quem o chama.

- Um segredo escrito diretamente no código (chave privada, AWS, GitHub, Stripe, Slack, Google) é **ocultado antes que qualquer conteúdo seja enviado a um model** e relatado como achado por padrão.
- Um `cve` em um relatório é uma afirmação do model e sempre recebe o rótulo `cve_verified: false`: confirme no NVD ou com `osv-scanner` / `npm audit` / `pip-audit`. A ferramenta nunca inventa nem verifica CVEs.
- "Claude escreveu código; revise esse código e os arquivos vizinhos": copie a regra pronta de `examples/` para seu `CLAUDE.md` ou `AGENTS.md`, ou instale o Stop hook ou pre-commit hook opcional. Detalhes e receitas de encadeamento: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Tarefas: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

O model recebe apenas o texto que você fornece e nenhuma ferramenta. O modo texto imprime apenas a resposta; stderr informa o model e o effort.

### 7d. Tradução: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Opções: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` ou CSV; `=` mantém o termo), `--keep a,b`, `--notes`, `--strict`. Textos longos são divididos nas linhas em branco (nunca dentro de um bloco de código) e traduzidos em partes. Depois da tradução, o script verifica se blocos de código delimitados, código inline, URLs, placeholders (`{{x}}`, `${x}`, `%s`), tags e títulos correspondem ao original, e relata cada diferença (`--strict` transforma qualquer diferença em exit 11). Primeiro, as skills perguntam sobre tom, público e termos, mas somente o que não conseguem deduzir. Verificações automáticas não avaliam fluência; peça para uma pessoa nativa revisar textos importantes.

### 7e. Models e effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Por execução: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Precedência: linha de comando, arquivo do projeto, arquivo do usuário, padrão do agy. `--effort auto` (o padrão) é uma escolha determinística e explicada: as revisões aumentam o effort conforme a quantidade de código no escopo (um foco sensível a risco, como segurança, acrescenta um nível); nas tarefas, a escolha depende do texto do pedido (transformações mecânicas usam low, raciocínio complexo usa high) e do tamanho da entrada; `max` nunca é automático. **O effort sempre é ajustado ao model, sem adivinhação.** Cada model trata `--effort` de uma forma: o model padrão do agy oferece `low | medium | high`; models com o effort no nome (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) não aceitam `--effort`; e os models Claude não oferecem suporte. A ferramenta pergunta ao agy qual é o caso do model (uma verificação gratuita que leva cerca de quatro segundos e não inicia nenhuma chamada ao model), guarda a resposta por model e versão do agy em `~/.agy-review-cache.json`, ajusta seu effort para o valor aceito mais próximo pelo model (por exemplo, `xhigh` vira `high`) e informa no relatório o valor realmente usado. Se a lista do agy mudar, o erro é lido, o cache é corrigido e a execução é repetida uma vez. `--list-models` mostra o que cada model aceita (`--refresh` consulta de novo). Se o filtro de conteúdo do Gemini recusar um prompt e você não tiver escolhido um model, a ferramenta tenta uma vez com um model que não seja Gemini e avisa.

### 7f. Opções e exit codes

`bun agy-review.mjs --help` lista tudo. Exit codes: `0` sucesso · `1` erro, timeout ou resposta impossível de interpretar · `2` erro de uso ou pré-requisito ausente · `3` a árvore de trabalho mudou durante uma revisão agentic · `4` inconclusivo ou incompleto (**não é aprovação**) · `10` a barreira `--fail-on` falhou (o relatório é válido) · `11` a verificação da tradução falhou com `--strict`. Se mais de um se aplicar, `3` tem precedência sobre `10`, e `10` sobre `4`; um relatório é gravado em todos os casos, exceto `1` e `2`. Portanto, leia `verdict` e `incomplete` nele. Uma árvore de trabalho limpa não é erro: a ferramenta imprime "No changes to review" e encerra com 0 sem chamar um model.

### 7g. graphify no Antigravity: zero tokens de agent para atualizar o grafo

**Se você usa [graphify](https://github.com/Graphify-Labs/graphify), esta é a maior economia de todo o projeto.** O graphify transforma um repository e sua documentação em um grafo de conhecimento. A maior parte do trabalho é feita por código determinístico (tree-sitter, agrupamento, relatório, cache, merge) e não custa nada. Duas etapas precisam de um model de linguagem: **extração semântica de documentos e artigos** e **nomeação de comunidades**. Se você não fixar um backend, o graphify escolhe um por conta própria; dentro de um agent de programação, ele escolhe o próprio agent de programação (ou a assinatura correspondente). Assim, cada atualização do grafo que envolve um documento gasta seus tokens do Opus, Fable ou Codex.

**`--graphify` transfere exatamente essas duas etapas para o Antigravity e não mexe no restante.** O script inicia um pequeno servidor local em `127.0.0.1`, compatível com o protocolo OpenAI, que responde usando `agy`. Em seguida, **fixa nele todas as etapas de LLM do graphify**, para que o graphify nunca volte ao seu agent de programação nem a uma API key paga. Você não precisa de Ollama nem de qualquer chave. (Nas configurações do graphify, esse slot é chamado de "ollama": significa apenas "qualquer servidor local compatível com OpenAI".)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Por que não é preciso ter permissão de escrita ou execução.** Pode parecer que isso exige Python e escrita em arquivos, mas o model só precisa ler e responder texto. O próprio graphify escreve em `graphify-out/`; esta ferramenta grava os hooks, um arquivo de bloqueio e um log. O model por trás do servidor não tem ferramentas, arquivos nem rede, e uma injeção de prompt escondida em um documento não consegue fazê-lo agir. Segredos reconhecidos na sua documentação são ocultados antes do envio. Assim, a promessa de somente leitura do restante do projeto é mantida.

Configure uma vez em cada repository:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

No Claude Code ou Codex, basta pedir: "configure as atualizações do graphify no Antigravity" (skill `agy-graphify` / `graphify`, comando `/agy-review:graphify`). A skill pede confirmação antes de adicionar um pacote ao ambiente do graphify.

O que ele faz por você:

- **Hooks:** `post-commit`, `post-merge`, `post-checkout` (somente ao trocar de branch) e `post-rewrite` (amend, rebase) executam a atualização **desanexada**, então o comando git termina em uma fração de segundo. O conteúdo existente desses arquivos de hook é preservado. Por padrão, **os hooks do próprio graphify são substituídos** (eles reconstroem apenas o código; os nossos fazem isso e mais, e dois processos escrevendo no mesmo grafo entrariam em conflito). `--keep-graphify-hook` mantém os dois; `--graphify hook-uninstall --restore-graphify` restaura os hooks do graphify. Uma cópia desta ferramenta em `~/.agy-review/runtime` faz os hooks sobreviverem às atualizações do plugin. Ignore uma vez com `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **Incremental:** o cache do próprio graphify decide o que mudou; documentos inalterados nunca são enviados ao model. Dois commits seguidos nunca iniciam duas atualizações ao mesmo tempo: o segundo solicita mais uma rodada.
- **Seu agent para de gastar tokens com isso:** se `CLAUDE.md` ou `AGENTS.md` tiver uma seção do graphify que instrua o agent a reconstruir o grafo, `--graphify rules --write-rules` acrescenta uma regra curta para impedi-lo (seu texto nunca é editado, e nada é criado se os arquivos não existirem).
- **Barato por padrão:** effort `low`, pois a extração é um trabalho estruturado. Em um teste, `low` usou cerca de 40 vezes menos tokens de saída que `high` para o mesmo documento (685 contra 29,996) e terminou em 15 segundos, em vez de 207. Altere com `--set graphifyEffort=...`, escolha o model com `--set graphifyModel=<id>` (veja `--list-models`), use `--set graphifyConcurrency=N` para chamadas paralelas e `--set graphifyLabels=false` para pular a nomeação de comunidades.

Limites, sem rodeios: as atualizações usam sua **quota do Antigravity** (esse é o objetivo: usar um model barato em vez de um caro, não ser "grátis"). **Imagens não são extraídas** por esse caminho (o graphify as ignora nesse backend, e o agy não consegue vê-las por ele). O código é analisado localmente; documentos e artigos são enviados como texto ao model do Google. A qualidade da extração depende do model escolhido. O graphify precisa estar instalado (`uv tool install graphifyy`), e o Python dele precisa do pacote `openai`: `--graphify setup --yes` adiciona o pacote com `uv tool install --force "graphifyy[openai]"` (ou `pipx inject graphifyy openai`). Detalhes, configurações e solução de problemas: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. Uso com agents, sub-agents e loops

Cada skill é uma chamada CLI simples com JSON estável, então qualquer agent pode usá-la: inicie o sub-agent `agy-reviewer`, `agy-security` ou `agy-worker` no Claude Code, chame as skills no Codex ou execute o script a partir de qualquer framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

O revisor nunca recebe a informação do que você alterou, por isso cada rodada permanece independente. Contrato completo, campos JSON, receitas de loop e padrões de distribuição: [docs/AGENTS.md](AGENTS.md).

## 9. Model de segurança

**Revisões estáticas, revisões de segurança de símbolo/arquivo/trecho, tarefas e traduções** executam o agy sem nenhuma flag de permissão e sem ferramentas, em uma pasta temporária vazia: o agy não consegue ler nem escrever seus arquivos; os únicos dados enviados são os que o script colocou no prompt (com segredos reconhecidos ocultados).

**Revisões agentic** (alvos git ou `--agentic`) iniciam o agy com `--dangerously-skip-permissions` para que nada fique esperando um prompt, e dependem de um guard hook `PreToolUse` (`guard.mjs`) que inspeciona cada chamada de ferramenta e **nega por padrão**:

- permitido: ferramentas de visualização e busca de arquivos; comandos de shell, únicos ou encadeados, formados apenas por subcomandos somente leitura do `git`, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (sem `-delete`/`-exec`), PowerShell `Get-*`, `Select-String` e alguns outros (a lista está em `guard.mjs`);
- negado: qualquer ferramenta de escrita/edição/notebook/imagem/agendamento/sub-agent/navegador/web/MCP e qualquer ferramenta desconhecida; redirecionamento, `$(...)`, crases, blocos de script e construções semelhantes a `eval`; `git commit/push/checkout/reset/...`; interpretadores e gerenciadores de pacotes; `curl`, `ssh`; leitura de repositórios de credenciais (`.ssh`, `.aws`, `.gnupg`, chaves privadas);
- se a proteção falhar, ela nega a operação; o script se recusa a iniciar uma execução agentic, a menos que a proteção esteja instalada, seja idêntica à incluída no pacote e **haja um `--verify` aprovado registrado para essa proteção e essa versão do agy**; antes e depois da execução, ele calcula impressões digitais de `git status`, dos diffs rastreados e preparados e do conteúdo de cada arquivo não rastreado, e encerra com 3 e um aviso se algo estiver diferente.
- **Segredos no modo agentic não podem ser ocultados** antes que o revisor leia os arquivos. A ferramenta os detecta, avisa e lista em `limitations`; troque os segredos ou revise com `--file` / `--symbol`, onde eles são ocultados primeiro.

**Atualizações do graphify** (`--graphify`) não dão nenhuma ferramenta ao model: ele recebe texto por um servidor que escuta apenas em `127.0.0.1`, exige uma chave bearer aleatória que só existe durante uma atualização, rejeita headers `Host` externos e executa `agy` em uma pasta temporária vazia sem nenhuma flag de permissão. O que é gravado em disco é escrito pelo graphify (`graphify-out/`) e por esta ferramenta (git hooks, `~/.agy-review/runtime`, um bloqueio e um log). Os hooks executam código a cada commit: é a mesma confiança que você já deposita nos hooks do próprio graphify, e `--graphify hook-uninstall` os remove.

O que isto não é:

- **Não é um sandbox do sistema operacional.** A proteção filtra nomes de ferramentas e texto de comandos; o sandbox do próprio agy não está disponível em todos os lugares. Uma injeção de prompt deliberada, escondida no código revisado, pode procurar um formato de comando aceito pelo filtro. A verificação de antes e depois detecta arquivos rastreados modificados e arquivos novos, mas não leituras.
- **Seu código é enviado ao model do Google**; as leituras não têm restrição, exceto nos caminhos de credenciais. Arquivos `.env` no repository podem ser lidos em revisões agentic. Não revise código que você não possa compartilhar.
- o git pode executar programas externos de diff ou textconv configurados em um repository: revise somente repositories nos quais você confia.
- Os achados podem estar errados ou incompletos, e "nenhum achado" nunca significa "seguro".

## 10. Solução de problemas

| Sintoma | Causa e correção |
|---|---|
| `Missing: agy CLI` | instale a Antigravity CLI e execute `agy` uma vez para entrar na conta; `agy --version` precisa funcionar no shell que executa o plugin |
| `Missing: read-only guard - missing/outdated` | execute a configuração (`/agy-review:setup`, a skill `setup` do Codex ou `--install-guard`); somente revisões agentic precisam dela |
| `Not inside a git repository` (exit 2) | use `cd` para ir à raiz do repository ou revise o código com `--file` / `--symbol` / `--stdin` |
| Veredito `inconclusive`, exit 4 | não é aprovação: achados foram rejeitados, os models discordaram ou não cobriram o código, ou um model falhou. Reduza o escopo, adicione `--context` ou tente outro `--model` |
| `blocked by Gemini's filters` | o filtro de segurança do Gemini recusou o conteúdo (algo comum em prompts de segurança). Sem `--model`, a ferramenta tenta novamente com um model que não seja Gemini; caso contrário, escolha outro com `--model` |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` ou `conflicts with --effort` ou `--effort is not supported` | corrigido na versão 1.0.1: o effort é ajustado automaticamente ao model, e o relatório informa o valor usado. Se ainda aparecer, execute `--list-models --refresh`, atualize o plugin (seção 12) e relate o problema |
| graphify: `openai package ... missing` | o Python do graphify não tem o pacote `openai`. Execute `--graphify setup --yes` ou `uv tool install --force "graphifyy[openai]"` (pipx: `pipx inject graphifyy openai`) |
| graphify: o grafo não foi atualizado após um commit | `--graphify status` mostra os hooks e o último resultado; leia `graphify-out/.agy-update.log`; execute `--graphify update --debug` uma vez em primeiro plano (ele mantém cada requisição e resposta em `graphify-out/.agy-debug/`, que contém sua documentação). Se ainda não houver um grafo, o hook não faz nada: crie o primeiro com `--graphify update --full` |
| graphify: `agy returned no answer` em uma parte | o graphify tenta novamente na próxima atualização. Confira o login e a quota com `agy -p "say hi"` ou escolha outro model com `--set graphifyModel=<id>` |
| graphify avisa que as versões da skill e do pacote são diferentes | não afeta esta ferramenta; atualize o graphify com `uv tool upgrade graphifyy` |
| Revisão vazia, exit 1 | confira o login e a quota com `agy -p "say hi"`; aumente `--timeout` para alvos grandes |
| Exit 3 / árvore de trabalho alterada | algo modificou seus arquivos durante uma revisão agentic (editor, build ou falha na proteção). Confira `git status` e `git diff`; se a mudança não foi sua, trate-a como um evento de segurança |
| Muitos achados rejeitados | o model citou código que não existe. Isso é esperado às vezes; esses achados nunca entram na contagem. Use um `--model` mais forte ou reduza o escopo |
| `--symbol`: "defined in several places" ou "not found" | passe `--file` ou use `--file path:A-B`. A busca é heurística (correspondência de chaves/indentação), não um parser |
| Codex: "blocked by sandbox" | veja 5b: a rede, escritas em `~/.gemini/antigravity-cli` e um socket localhost precisam ser permitidos |
| Windows: `agy` ou `bun` não encontrado dentro de Claude/Codex | o shell da ferramenta tem um `PATH` diferente; inicie a ferramenta em um shell no qual o comando funcione |
| `verify` imprime FAIL | não use revisões agentic em código importante; abra uma issue com a saída e a sua `agy --version` |

## 11. Perguntas frequentes

**A ferramenta altera meu código?** Não. Os modos estáticos não conseguem fazer isso; o modo agentic bloqueia escritas e avisa se sua árvore estiver diferente depois. Ela nunca cria commits, stashes ou faz checkout de nada.

**Bun é mais rápido que Node aqui?** Não de forma perceptível. Na máquina Windows do autor, a inicialização levou cerca de 56 ms com Node e 64 ms com Bun, e o guard hook levou cerca de 60 ms contra 57 ms; uma revisão leva dezenas de segundos, e esse tempo vem do model. Bun é o padrão documentado; Node 18.18+ funciona da mesma forma. Ambos são cobertos pelo mesmo código.

**Custa dinheiro?** O plugin é gratuito. Cada revisão, tarefa, tradução e atualização do graphify usa sua quota do Antigravity.

**Preciso de Ollama ou de uma API key para o graphify?** Não. O graphify tem um slot de backend chamado "ollama", que significa "qualquer servidor local compatível com OpenAI"; por trás dele está o pequeno servidor Antigravity desta ferramenta. A única coisa que você precisa instalar é o pacote Python `openai` do graphify, adicionado por `--graphify setup --yes`.

**O graphify ainda gasta meus tokens do Claude ou Codex?** Só se você ou seu agent executar `/graphify --update`, `graphify extract` ou algo parecido diretamente, ou se uma seção de `CLAUDE.md` / `AGENTS.md` instruir o agent a reconstruir o grafo. Use `--graphify rules --write-rules` para adicionar a regra que impede isso.

**Quais arquivos o Antigravity vê?** Modos estáticos: somente o código enviado pelo script (mais uma quantidade limitada de código relacionado no caso de `--security`). Modos agentic: tudo o que ele ler no repository e em qualquer lugar do disco, exceto caminhos de credenciais.

**Ele pode corrigir os achados?** Nunca. Outro agent ou você faz as correções; o revisor só revisa e, assim, permanece independente.

**Ele pode revisar um pull request do GitHub?** Faça checkout local da branch e use `--base`. Não há acesso à API do GitHub.

**Por que não criar uma lista de comandos permitidos nas configurações do agy?** Foi testado: no modo headless, o agy exige correspondência exata para permissões com várias palavras (`git status` funciona, `git status --short` não), e o "allow" de um hook não substitui a verificação de permissão. Um hook só consegue negar de forma confiável. Daí o uso de skip-permissions com um hook que nega por padrão no modo agentic, e nenhuma ferramenta no modo estático.

**Posso adicionar comandos permitidos ou regras de scanner?** Edite `CMDS` / `GIT_OK` em `guard.mjs` ou `RULES` em `lib/security.mjs`, execute `npm test` e depois `--install-guard`.

## 12. Atualização, desinstalação e desenvolvimento

### Como atualizar para uma nova versão

Uma nova release não chega até você sozinha: a atualização é intencional. São quatro passos.

**1. Confira sua versão e se existe uma mais nova**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

Você também pode ver a lista de releases em https://github.com/Ealireza/agy-review/releases e o [changelog](../CHANGELOG.md).

**2. Atualize o plugin do host que você usa**

| Host | Comandos (execute em um terminal comum) | Depois |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` e depois `claude plugin update agy-review@agy-review` | reinicie o Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review` e depois `codex plugin remove agy-review@agy-review` e `codex plugin add agy-review@agy-review` | reinicie o Codex |
| Clone comum | `git pull` no seu clone | nada |

**3. Atualize as partes que ficam fora da pasta do plugin**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Confirme que funcionou:** `--version` mostra o novo número, `--check` indica OK em tudo e `--list-models --refresh` consulta novamente o que cada model aceita em `--effort`.

Se algo quebrar depois de uma atualização, execute `--check`, leia a tabela de solução de problemas (seção 10) e, se precisar voltar à versão anterior, remova o plugin e instale uma release específica com `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. Suas configurações (`.agy-review.json`) são arquivos comuns que as atualizações nunca alteram.

### Desinstalação

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Exclua `~/.agy-review` (cópia do runtime) e `~/.agy-review-cache.json` (cache de effort) se quiser remover tudo.

### Desenvolvimento

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

Issues e pull requests são bem-vindos, principalmente: resultados de `verify` no macOS e Linux, configurações funcionais do sandbox do Codex, falhas na proteção (se possível, relate em privado primeiro) e novas regras de scanner. Para traduzir: copie `README.md` para `docs/README.<code>.md`, faça a tradução e adicione o idioma à linha de seleção em todos os arquivos.

## Licença

MIT, consulte [LICENSE](../LICENSE).
