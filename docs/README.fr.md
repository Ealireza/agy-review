# agy-review

**Un relecteur indépendant qui doit montrer son travail.** Revue de code, revue de sécurité, délégation de tâches et traduction par Google Antigravity (`agy`), depuis Claude Code, Codex ou n’importe quel terminal. Lecture seule, aucun prompt d’autorisation, et chaque constat est vérifié dans votre véritable code avant de vous être présenté.

> ## NOUVEAU : ne dépensez plus de tokens Claude et Codex pour actualiser votre graphe graphify
>
> **Les mises à jour de graphify s’exécutent désormais sur Antigravity, en arrière-plan, à chaque commit, merge, checkout et rebase. Votre agent n’y consomme aucun token et vous n’avez besoin d’aucune API key.**
>
> Une seule commande, `agy-review --graphify setup`, réenregistre les hooks git de graphify afin que **la partie coûteuse de chaque mise à jour du graphe — lire vos documents et nommer les communautés avec un language model — soit confiée à un model Antigravity économique plutôt qu’à votre session Opus ou Fable.** `git commit` rend la main en une fraction de seconde, puis le graphe se met à jour tout seul.
>
> Lors d’un véritable essai sous Windows, un commit qui modifiait du code et un document a mis le graphe à jour en **22 secondes, avec un seul appel à Antigravity et 0 token Claude ou Codex.** Le model utilisé peut uniquement lire du texte et répondre en texte : il n’a aucun outil, ni droit d’écriture ou d’exécution. Détails et installation : section 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · **Français**

Site web : https://ealireza.github.io/agy-review/ · Pour aller plus loin (en anglais) : [docs/AGENTS.md](AGENTS.md) sur les agents et les boucles, [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) sur la méthode de revue de sécurité.

---

## Sommaire

1. Ce que vous obtenez
2. Pourquoi vous pouvez faire confiance au rapport
3. État : ce qui est vérifié et ce qui ne l’est pas
4. Prérequis
5. Installation
6. Premier lancement : vérification sur votre machine
7. Utilisation : revue, sécurité, tâches, traduction, models, graphify
8. Utilisation depuis des agents, sub-agents et boucles
9. Model de sécurité
10. Résolution des problèmes
11. FAQ
12. Mise à jour (obtenir une nouvelle version), désinstallation, développement

---

## 1. Ce que vous obtenez

| Skill (Claude Code / Codex) | Commande (Claude Code) | Fonction |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | revue notée des modifications git, d’une branch, d’un fichier, d’une plage de lignes, d’une fonction ou d’un extrait |
| `agy-security` / `security` | `/agy-review:security` | revue de sécurité : OWASP/CWE, exploitabilité, scénario d’attaque, détection des secrets et des motifs dangereux, fonctions appelantes et appelées comme contexte |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | confie à Antigravity toute tâche autonome (réécriture, résumé, rédaction, extraction) et renvoie le résultat |
| `agy-translate` / `translate` | `/agy-review:translate` | traduction adaptée au ton, au public et au glossaire ; vérifie que le code, les URL, les placeholders et la structure ont été conservés |
| `agy-models` / `models` | `/agy-review:models` | liste les models disponibles dans votre agy et les valeurs de `--effort` acceptées, permet d’en choisir un et de l’enregistrer pour le projet ou globalement |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **maintient un graphe graphify à jour sur Antigravity grâce aux hooks git : 0 token Claude ou Codex, aucune API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | vérifie les prérequis, installe la protection en lecture seule et prouve sur votre machine que les écritures sont bloquées |

Sub-agents pour Claude Code : `agy-reviewer`, `agy-security`, `agy-worker`. Tout tient dans un repository et un script (`plugins/agy-review/scripts/agy-review.mjs`). Il n’y a aucun serveur et aucun compte autre que votre propre connexion Antigravity.

## 2. Pourquoi vous pouvez faire confiance au rapport

Un language model chargé de relire du code inventera parfois un problème. Cet outil ne le croit jamais sur parole.

1. Le relecteur doit renvoyer un rapport JSON strict (imposé par `--json-schema`). Chaque constat inclut le **code exact** concerné.
2. Le script recherche cette citation dans le véritable fichier. **Introuvable : le constat est rejeté** et classé à part. **Trouvée sur une autre ligne : le numéro de ligne est corrigé.** Les citations trop courtes ou trop génériques pour prouver quoi que ce soit (`return null;`, `}`) sont rejetées. Une citation qui correspond à plusieurs emplacements éloignés de la ligne indiquée est rejetée comme ambiguë.
3. Le verdict, les totaux et la règle CI sont **calculés par le script** uniquement à partir des constats vérifiés, jamais repris du model.
4. N’avoir rien vérifié **ne vaut pas approbation** : si des constats ont été rejetés, si les models ne sont pas d’accord, si le code n’a pas été couvert ou si l’un des models a échoué, le verdict est `inconclusive` et l’exit code est 4.
5. Les constats hors des lignes demandées sont signalés et ne bloquent jamais. Ceux dont le niveau de confiance est faible sont affichés, mais pas comptés.
6. La gravité (impact) et la priorité (moment où corriger) sont distinctes et restent cohérentes : un problème critique est toujours P0, un détail est toujours P3, et un constat de style ne dépasse jamais le niveau faible.

Ce qui reste possible : une conclusion erronée appuyée par une citation correcte. La citation prouve que le code existe, pas que le raisonnement est juste. C’est pourquoi chaque constat présente un scénario concret et que vous devez lire les lignes citées avant d’agir.

Exemple réel, avec cet outil sur un petit fichier contenant deux bugs introduits exprès (Claude Sonnet 4.6 via agy) : 4 constats vérifiés aux bonnes lignes avec CWE-89, CWE-78, CWE-22 et CWE-369, couverture de 100 %, un doublon supprimé, et le scanner a signalé indépendamment les deux mêmes lignes.

## 3. État : ce qui est vérifié et ce qui ne l’est pas

| Vérification | Résultat |
|---|---|
| Tests unitaires et de pipeline (`npm test`) : ancrage, portée, verdict, dédoublonnage, recherche de symboles, cibles, configuration, models, tâches, traduction, sécurité, masquage | 73 tests, tous réussis, avec un faux `agy` (y compris le pipeline agentic, la détection des changements de l’arborescence, l’échec d’un model et la règle `verify`) |
| Guard hook (commandes et outils autorisés ou refusés, astuces de citation, chemins d’identifiants) | tests automatisés réussis |
| Manifests Claude Code (`claude plugin validate`), plugin Antigravity (`agy plugin validate --strict`) | réussi |
| Codex 0.163.0 : ajout du marketplace, installation du plugin, détection des skills | vérifié sous Windows 11 |
| Revue statique, revue de sécurité et tâches avec le véritable agy 1.4.8 (Gemini 3.8 Flash et Claude Sonnet 4.6), exécutées avec Bun 1.3.14 | vérifié sous Windows 11 ; constats rattachés aux bonnes lignes |
| `--effort` par model : model par défaut (low, medium, high), models dont le nom contient l’effort et models Claude sans `--effort` | vérifié avec le véritable agy 1.4.8 |
| graphify sur Antigravity, de bout en bout : véritable graphify 0.9.86 et véritable agy 1.4.8 sous Windows. Un hook git a mis le graphe à jour en arrière-plan (22 s, 1 appel Antigravity, `git commit` a rendu la main en 0.3 s) et seul le document modifié a été envoyé au model | vérifié manuellement et par des tests avec un faux graphify et un faux agy |
| Deux revues indépendantes de la conception et du code (Opus : 25 constats ; Codex : 28 constats), avec correction de chaque problème confirmé et ajout d’un test de non-régression | terminé, voir le changelog |
| **Revues agentic (`agy --dangerously-skip-permissions` avec la protection qui bloque les véritables écritures)** | **non exécutées par l’auteur** |

Non testé par l’auteur : `--graphify setup --yes` sur une véritable installation de graphify avec `uv tool` (le test manuel utilisait graphify depuis pip, où le package `openai` était déjà présent). La ligne agentic est importante pour la sécurité et dépend de votre version d’agy. Exécutez donc `verify` une fois après l’installation et après chaque mise à jour d’agy (section 6). Les revues statiques, les revues de sécurité d’un symbole, fichier ou extrait, les tâches et les traductions n’utilisent jamais ce flag et ne peuvent rien écrire.

Testé avec agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 et Node 24, sous Windows 11. macOS et Linux devraient fonctionner (agy utilise `~/.gemini/config/plugins` sur toutes les plateformes), mais n’ont pas été testés.

## 4. Prérequis

Rien d’autre : aucun autre plugin, aucun autre outil CLI.

| Nécessaire | Rôle | Installation | Vérification |
|---|---|---|---|
| Antigravity CLI `agy` | effectue le travail | https://antigravity.google/cli, puis exécutez `agy` une fois et connectez-vous | `agy --version` |
| Bun (recommandé) **ou** Node.js 18.18+ | exécute le script et le guard hook | https://bun.sh ou https://nodejs.org | `bun --version` / `node --version` |
| git | gère les cibles git et recherche le code lié aux constats | https://git-scm.com | `git --version` |
| Claude Code **ou** Codex **ou** n’importe quel terminal | là où vous formulez votre demande | leurs guides d’installation | `claude --version` / `codex --version` |

Bun est utilisé par défaut dans toutes les instructions et dans le guard hook (`bun guard.mjs || node guard.mjs`) ; Node fonctionne de la même façon. L’utilisation d’Antigravity est décomptée de votre propre quota. Une revue peut durer de quelques secondes à plusieurs minutes.

## 5. Installation

Choisissez votre environnement ; plusieurs peuvent partager le même script et la même protection.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` vérifie agy, git et la protection, puis installe celle-ci dans `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` apporte la preuve de sécurité en conditions réelles.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Redémarrez Codex, puis demandez en langage naturel : « Vérifie la configuration de mes revues Antigravity », « Relis mes modifications avec Antigravity », « Fais une revue de sécurité de la fonction saveUpload », « Traduis README.md en allemand, avec un ton amical ».

1. **Installez une fois la protection depuis un terminal normal** (elle écrit dans `~/.gemini/config/plugins`) : `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows : `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs` ; le nom du dossier correspond à la version installée, donc utilisez après une mise à jour le dossier qui existe). Seules les revues git agentic ont besoin de la protection.
2. **Le sandbox de Codex doit laisser agy fonctionner :** accès réseau sortant, droit d’écriture dans `~/.gemini/antigravity-cli` et socket localhost. Avec `workspace-write`, vous devrez probablement ajouter ceci dans `~/.codex/config.toml` :

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Si quelque chose reste bloqué, le skill indique l’accès manquant puis s’arrête ; il n’élargit jamais les autorisations de lui-même. Le bon fonctionnement d’agy dans votre sandbox est la partie de la configuration Codex que l’auteur n’a pas pu tester. Exécutez donc également `verify` depuis Codex.

### 5c. Terminal simple

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

Astuce : `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Côté Antigravity uniquement

La protection est un plugin Antigravity ordinaire. Copiez `plugins/agy-review/antigravity-plugin/readonly-review` vers `~/.gemini/config/plugins/readonly-review` ou exécutez `--install-guard` ; vérifiez avec `agy plugin list`. Elle ne fait rien sauf si un prompt contient `AGY_READONLY_REVIEW`, vos sessions agy habituelles restent donc inchangées. Elle fournit également un skill `readonly-code-review` pour l’utilisation interactive d’agy.

## 6. Premier lancement : vérification sur votre machine

Exécutez une fois après l’installation et après chaque mise à jour d’agy : `/agy-review:verify`, le skill `verify` de Codex ou `--verify`. Cette commande effectue un petit appel réel à agy dans un dossier temporaire : lire un fichier (doit fonctionner), écrire dans un fichier, rediriger vers un fichier et supprimer un fichier (tout doit être bloqué). Résultat attendu :

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Tout `FAIL` se termine par `NOT VERIFIED` et les revues agentic restent désactivées : ouvrez une issue avec la sortie et votre `agy --version`. Un `verify` réussi est enregistré uniquement pour cette protection et cette version d’agy ; **les revues agentic refusent de démarrer sans lui**, et une mise à jour d’agy ou de la protection l’invalide. Relancez donc `verify` après toute mise à jour. Les modes statiques n’en ont pas besoin.

## 7. Utilisation

Exécutez la commande depuis la racine du repository.

### 7a. Revue : choisir la cible

| Élément à relire | Utilisation | Mode |
|---|---|---|
| travail sans commit | rien | agentic, lecture seule |
| une branch / des modifications staged / un commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, lecture seule |
| un fichier ou une plage | `--file src/a.kt` ou `--file src/a.kt:40-80` (répétable) | statique |
| une fonction ou une classe | `--symbol parseConfig` (+ `--file` si le nom est ambigu) | statique |
| du code qui existe uniquement en mémoire | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | statique |
| l’un de ces éléments avec l’autorisation de consulter d’autres fichiers | ajoutez `--agentic` | agentic, lecture seule |

*Statique* : le script lit et numérote lui-même le code, et le model ne dispose d’aucun outil. Rien ne peut donc être modifié, et le model ne peut rien inventer sur les fichiers qui ne lui ont pas été montrés. *Agentic* : le relecteur consulte lui-même le repository à travers le guard hook, qui bloque toute écriture.

Aidez le relecteur : `--context "what this code must do"`, `--focus "concurrency, error handling"` (ou des mots à la fin), `--context-lines N`.

Sortie : Markdown par défaut ; `--format json` pour les machines ; `--output file` ; `--fail-on high` (exit 10 si un constat vérifié de niveau high ou critical existe) ; `--previous old.json` classe les constats comme nouveaux, persistants, résolus ou non signalés à nouveau.

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

### 7b. Revue de sécurité

`--security` (skill `agy-security`, commande `/agy-review:security`, sub-agent `agy-security`) fonctionne sur toutes les cibles ci-dessus et ajoute : une méthode de threat-model (de la source non fiable au point dangereux, avec les contrôles intermédiaires), une correspondance avec OWASP Top 10 (2021) et CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, un scanner sans model pour les secrets et environ 25 catégories de motifs dangereux, ainsi que le **code lié** : ce que la cible appelle et qui l’appelle.

- Un secret codé en dur (private key, AWS, GitHub, Stripe, Slack, Google) est **masqué avant tout envoi à un model** et signalé comme constat grâce à un motif.
- Un `cve` dans un rapport est une affirmation du model et porte toujours la mention `cve_verified: false` : confirmez-le sur NVD ou avec `osv-scanner` / `npm audit` / `pip-audit`. L’outil n’invente ni ne vérifie jamais les CVE.
- « Claude a écrit du code, relis-le avec le code voisin » : copiez la règle prête à l’emploi depuis `examples/` dans votre `CLAUDE.md` ou `AGENTS.md`, ou installez le Stop hook ou le hook pre-commit facultatif. Détails et recettes d’enchaînement : [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Tâches : `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Le model reçoit uniquement le texte que vous fournissez et ne dispose d’aucun outil. Le mode texte affiche seulement la réponse ; stderr indique le model et l’effort.

### 7d. Traduction : `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Options : `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` ou CSV ; `=` conserve le terme), `--keep a,b`, `--notes`, `--strict`. Les longs textes sont découpés aux lignes vides (jamais au milieu d’un bloc de code), puis traduits morceau par morceau. Après la traduction, le script vérifie que les blocs de code délimités, le code inline, les URL, les placeholders (`{{x}}`, `${x}`, `%s`), les tags et les titres correspondent à la source, et signale chaque différence (`--strict` transforme une différence en exit 11). Les skills commencent par vous interroger sur le ton, le public et les termes, mais demandent seulement ce qu’ils ne peuvent pas déduire. Les vérifications automatiques ne peuvent pas juger la fluidité ; pour les textes importants, faites relire la traduction par une personne native.

### 7e. Models et effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Pour une exécution : `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Ordre de priorité : ligne de commande, fichier du projet, fichier utilisateur, valeur par défaut d’agy. `--effort auto` (valeur par défaut) fait un choix déterministe et expliqué : pour les revues, l’effort dépend de la quantité de code concernée (un domaine sensible aux risques comme la sécurité ajoute un niveau) ; pour les tâches, il dépend du texte de la demande (faible pour une transformation mécanique, élevé pour un raisonnement complexe) et de la longueur de l’entrée ; `max` n’est jamais choisi automatiquement. **L’effort est toujours adapté au model, jamais deviné.** Chaque model interprète `--effort` à sa façon : le model par défaut d’agy propose `low | medium | high`, les models dont le nom contient l’effort (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) n’acceptent aucun `--effort`, et les models Claude ne le prennent pas en charge. L’outil demande à agy dans quel cas se trouve un model (vérification gratuite d’environ quatre secondes qui ne lance aucun appel de model), mémorise la réponse par model et version d’agy dans `~/.agy-review-cache.json`, ramène votre effort à la valeur acceptée la plus proche (`xhigh` devient par exemple `high`) et indique dans le rapport ce qui a réellement été utilisé. Si la liste d’agy change, l’erreur est lue, le cache corrigé et l’exécution retentée une fois. `--list-models` affiche les valeurs acceptées par chaque model (`--refresh` les redemande). Si le filtre de contenu de Gemini refuse un prompt et que vous n’avez pas nommé de model, l’outil réessaie une fois avec un model autre que Gemini et vous l’indique.

### 7f. Options et exit codes

`bun agy-review.mjs --help` affiche toutes les options. Exit codes : `0` succès · `1` erreur, délai dépassé ou réponse impossible à analyser · `2` erreur d’utilisation ou prérequis manquant · `3` arborescence de travail modifiée pendant une revue agentic · `4` résultat non concluant ou incomplet (**ce n’est pas une réussite**) · `10` échec de la règle `--fail-on` (le rapport reste valide) · `11` échec du contrôle de traduction avec `--strict`. Si plusieurs codes s’appliquent, `3` l’emporte sur `10`, et `10` sur `4` ; un rapport est écrit dans tous les cas sauf `1` et `2`. Lisez donc `verdict` et `incomplete` dans ce rapport. Une arborescence de travail propre n’est pas une erreur : l’outil affiche « No changes to review » et se termine avec 0 sans appeler de model.

### 7g. graphify sur Antigravity : zéro token d’agent pour les mises à jour du graphe

**Si vous utilisez [graphify](https://github.com/Graphify-Labs/graphify), c’est de loin la plus grande économie de tout le projet.** graphify transforme un repository et sa documentation en graphe de connaissances. L’essentiel du travail repose sur du code déterministe (tree-sitter, clustering, rapport, cache, merge) et ne coûte rien. Deux étapes nécessitent un language model : **l’extraction sémantique des documents et articles**, et **le nommage des communautés**. Si vous n’imposez pas de backend, graphify en choisit un lui-même ; dans un coding agent, ce sera le coding agent (ou son abonnement). Chaque actualisation du graphe qui touche un document est donc payée avec vos tokens Opus, Fable ou Codex.

**`--graphify` déplace exactement ces deux étapes vers Antigravity et ne touche à rien d’autre.** Le script démarre un petit serveur local sur `127.0.0.1`, compatible avec le protocole OpenAI, qui répond avec `agy`, puis **y rattache chaque étape LLM de graphify**. graphify ne peut donc jamais se rabattre sur votre coding agent ni sur une API key payante. Vous n’avez besoin ni d’Ollama ni d’une quelconque clé. (graphify nomme cet emplacement « ollama » dans ses paramètres : cela signifie simplement « n’importe quel serveur local compatible avec OpenAI ».)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Pourquoi aucun droit d’écriture ou d’exécution n’est nécessaire.** On pourrait croire que Python et des écritures de fichiers sont indispensables, mais le model doit seulement lire du texte et répondre en texte. graphify écrit lui-même dans `graphify-out/` ; cet outil écrit les hooks, un fichier de verrouillage et un journal. Le model derrière le serveur n’a accès ni aux outils, ni aux fichiers, ni au réseau, et une prompt injection cachée dans un document ne peut rien lui faire exécuter. Les secrets reconnus dans vos documents sont masqués avant leur envoi. La promesse de lecture seule du reste du projet est ainsi respectée.

À configurer une fois par repository :

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

Dans Claude Code ou Codex, demandez simplement : « configure les mises à jour de graphify sur Antigravity » (skill `agy-graphify` / `graphify`, commande `/agy-review:graphify`). Le skill demande votre accord avant d’ajouter un package à l’environnement de graphify.

Ce qu’il fait pour vous :

- **Hooks :** `post-commit`, `post-merge`, `post-checkout` (changements de branch uniquement) et `post-rewrite` (amend, rebase) lancent la mise à jour **de façon détachée**, si bien que la commande git rend la main en une fraction de seconde. Le contenu existant de ces fichiers de hook est conservé. Par défaut, **les propres hooks de graphify sont remplacés** (ils reconstruisent seulement le code, alors que les nôtres font cela et davantage ; deux processus qui écrivent dans le même graphe entreraient en conflit). `--keep-graphify-hook` conserve les deux ; `--graphify hook-uninstall --restore-graphify` restaure ceux de graphify. Une copie de cet outil dans `~/.agy-review/runtime` permet aux hooks de survivre aux mises à jour du plugin. Ignorez-les une fois avec `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **Incrémentiel :** le cache de graphify détermine ce qui a changé ; les documents inchangés ne sont jamais envoyés au model. Deux commits consécutifs ne lancent jamais deux mises à jour simultanées : le second demande simplement un passage supplémentaire.
- **Votre agent ne gaspille plus de tokens :** si `CLAUDE.md` ou `AGENTS.md` contient une section graphify qui demande à l’agent de reconstruire le graphe, `--graphify rules --write-rules` ajoute une courte règle qui lui demande de ne pas le faire (votre propre texte n’est jamais modifié, et rien n’est créé si ces fichiers n’existent pas).
- **Économique par défaut :** effort `low`, car l’extraction est un travail structuré. Lors d’un test, `low` a utilisé environ 40 fois moins de tokens de sortie que `high` pour le même document (685 contre 29,996) et a terminé en 15 secondes au lieu de 207. Modifiez-le avec `--set graphifyEffort=...`, choisissez le model avec `--set graphifyModel=<id>` (voir `--list-models`), utilisez `--set graphifyConcurrency=N` pour les appels parallèles et `--set graphifyLabels=false` pour ignorer le nommage des communautés.

Limites, en toute transparence : les mises à jour consomment votre **quota Antigravity** (c’est précisément le but : utiliser un model économique plutôt qu’un model coûteux, pas rendre l’opération « gratuite »). **Les images ne sont pas extraites** par cette méthode (graphify les ignore avec ce backend et agy ne peut pas les voir ainsi). Le code est analysé localement ; le texte des documents et articles est envoyé au model de Google. La qualité de leur extraction dépend du model choisi. graphify doit être installé (`uv tool install graphifyy`) et son propre Python a besoin du package `openai` : `--graphify setup --yes` l’ajoute avec `uv tool install --force "graphifyy[openai]"` (ou `pipx inject graphifyy openai`). Détails, paramètres et résolution des problèmes : [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. Utilisation depuis des agents, sub-agents et boucles

Chaque skill est un simple appel CLI avec du JSON stable, si bien que n’importe quel agent peut l’utiliser : lancez le sub-agent `agy-reviewer`, `agy-security` ou `agy-worker` dans Claude Code, appelez les skills dans Codex, ou lancez le script depuis n’importe quel framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

Le relecteur ne sait jamais ce que vous avez modifié, chaque tour reste donc indépendant. Contrat complet, champs JSON, recettes de boucles et modèles de fan-out : [docs/AGENTS.md](AGENTS.md).

## 9. Model de sécurité

**Les revues statiques, les revues de sécurité d’un symbole, fichier ou extrait, les tâches et les traductions** exécutent agy sans aucun flag d’autorisation et sans outil, dans un dossier temporaire vide : agy ne peut ni lire ni écrire vos fichiers ; seules les données placées dans le prompt par le script quittent la machine (après masquage des secrets reconnus).

**Les revues agentic** (cibles git ou `--agentic`) lancent agy avec `--dangerously-skip-permissions` pour qu’aucun prompt ne reste en attente, et s’appuient sur un guard hook `PreToolUse` (`guard.mjs`) qui inspecte chaque appel d’outil et **refuse par défaut** :

- autorisés : outils d’affichage et de recherche de fichiers ; commandes shell, seules ou enchaînées, composées uniquement de sous-commandes `git` en lecture seule, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (sans `-delete`/`-exec`), PowerShell `Get-*`, `Select-String` et quelques autres (la liste figure dans `guard.mjs`) ;
- refusés : tous les outils d’écriture, d’édition, de notebook, d’image, de planification, de sub-agent, de navigateur, de web et de MCP, ainsi que tout outil inconnu ; redirections, `$(...)`, backticks, blocs de script, constructions de type `eval` ; `git commit/push/checkout/reset/...` ; interpréteurs et gestionnaires de packages ; `curl`, `ssh` ; lecture des espaces d’identifiants (`.ssh`, `.aws`, `.gnupg`, private keys) ;
- si la protection plante, elle refuse l’action ; le script refuse de lancer une exécution agentic sauf si la protection est installée, identique à celle fournie, **et qu’un `--verify` réussi a été enregistré pour cette protection et cette version d’agy** ; avant et après l’exécution, il relève l’empreinte de `git status`, des diffs suivis et staged, ainsi que du contenu de chaque fichier non suivi, puis se termine avec 3 et un avertissement si quoi que ce soit diffère.
- **Les secrets ne peuvent pas être masqués en mode agentic** avant que le relecteur lise les fichiers. L’outil les détecte, avertit et les répertorie dans `limitations` ; faites-les expirer, ou utilisez `--file` / `--symbol`, où ils sont masqués avant l’envoi.

**Les mises à jour de graphify** (`--graphify`) ne donnent aucun outil au model : il reçoit du texte via un serveur qui écoute uniquement sur `127.0.0.1`, exige une bearer key aléatoire valable seulement le temps d’une mise à jour, rejette les en-têtes `Host` étrangers et exécute `agy` dans un dossier temporaire vide sans aucun flag d’autorisation. Les écritures sur disque sont effectuées par graphify (`graphify-out/`) et par cet outil (hooks git, `~/.agy-review/runtime`, verrou et journal). Les hooks exécutent du code à chaque commit : c’est la même confiance que vous accordez déjà aux hooks de graphify, et `--graphify hook-uninstall` les supprime.

Ce que cet outil n’est pas :

- **Ce n’est pas un sandbox d’OS.** La protection filtre les noms d’outils et le texte des commandes ; le propre sandbox d’agy n’est pas disponible partout. Une prompt injection délibérément cachée dans le code relu pourrait chercher une forme de commande acceptée par le filtre. La vérification avant/après détecte les fichiers suivis modifiés et les nouveaux fichiers, pas les lectures.
- **Votre code est envoyé au model de Google** ; les lectures ne sont pas limitées, à l’exception des chemins d’identifiants. Les fichiers `.env` du repository sont lisibles par les revues agentic. Ne faites pas relire du code que vous ne pouvez pas partager.
- git peut exécuter des programmes externes de diff ou textconv configurés dans un repository : relisez uniquement des repositories de confiance.
- Les constats peuvent être faux ou incomplets, et « aucun constat » ne signifie jamais « sécurisé ».

## 10. Résolution des problèmes

| Symptôme | Cause et solution |
|---|---|
| `Missing: agy CLI` | installez Antigravity CLI et exécutez `agy` une fois pour vous connecter ; `agy --version` doit fonctionner dans le shell qui lance le plugin |
| `Missing: read-only guard - missing/outdated` | lancez l’installation (`/agy-review:setup`, le skill `setup` de Codex ou `--install-guard`) ; seules les revues agentic en ont besoin |
| `Not inside a git repository` (exit 2) | placez-vous avec `cd` à la racine du repository, ou relisez le code avec `--file` / `--symbol` / `--stdin` |
| Verdict `inconclusive`, exit 4 | ce n’est pas une réussite : des constats ont été rejetés, les models ne sont pas d’accord ou n’ont pas couvert le code, ou l’un des models a échoué. Réduisez la portée, ajoutez `--context` ou essayez un autre `--model` |
| `blocked by Gemini's filters` | le filtre de sécurité de Gemini a refusé la demande (fréquent pour les prompts de sécurité). Sans `--model`, l’outil réessaie avec un model autre que Gemini ; sinon, choisissez-en un avec `--model` |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` ou `conflicts with --effort` ou `--effort is not supported` | corrigé dans 1.0.1 : l’effort est automatiquement adapté au model et le rapport indique la valeur utilisée. Si le problème persiste, exécutez `--list-models --refresh`, mettez le plugin à jour (section 12) et signalez-le |
| graphify : `openai package ... missing` | le Python de graphify n’a pas le package `openai`. Exécutez `--graphify setup --yes` ou `uv tool install --force "graphifyy[openai]"` (pipx : `pipx inject graphifyy openai`) |
| graphify : le graphe n’a pas été mis à jour après un commit | `--graphify status` affiche les hooks et le dernier résultat ; consultez `graphify-out/.agy-update.log` ; exécutez une fois `--graphify update --debug` au premier plan (chaque requête et réponse est conservée dans `graphify-out/.agy-debug/`, qui contient vos documents). Si aucun graphe n’existe encore, le hook ne fait rien : construisez-le une fois avec `--graphify update --full` |
| graphify : `agy returned no answer` pour un fragment | graphify retente ce fragment à la prochaine mise à jour. Vérifiez la connexion et le quota avec `agy -p "say hi"`, ou choisissez un autre model avec `--set graphifyModel=<id>` |
| graphify avertit que les versions du skill et du package diffèrent | sans conséquence pour cet outil ; mettez graphify à niveau avec `uv tool upgrade graphifyy` |
| Revue vide, exit 1 | vérifiez la connexion et le quota avec `agy -p "say hi"` ; augmentez `--timeout` pour les grosses cibles |
| Exit 3 / arborescence de travail modifiée | un élément a modifié vos fichiers pendant une revue agentic (éditeur, build ou contournement de la protection). Consultez `git status` et `git diff` ; si vous n’êtes pas à l’origine du changement, traitez-le comme un incident de sécurité |
| Beaucoup de constats rejetés | le model a cité du code qui n’existe pas. Cela arrive parfois ; ces constats ne sont jamais comptés. Utilisez un `--model` plus performant ou une portée plus étroite |
| `--symbol`: "defined in several places" ou "not found" | indiquez `--file` ou utilisez `--file path:A-B`. La recherche est heuristique (correspondance des accolades et de l’indentation), ce n’est pas un parser |
| Codex : « blocked by sandbox » | voir 5b : le réseau, les écritures dans `~/.gemini/antigravity-cli` et un socket localhost doivent être autorisés |
| Windows : `agy` ou `bun` introuvable dans Claude/Codex | le shell de l’outil utilise un autre `PATH` ; lancez-le depuis un shell où la commande fonctionne |
| `verify` affiche FAIL | n’utilisez pas les revues agentic sur du code important ; ouvrez une issue avec la sortie et `agy --version` |

## 11. FAQ

**Modifie-t-il mon code ?** Non. Les modes statiques ne le peuvent pas ; le mode agentic bloque les écritures et vous avertit si votre arborescence a changé ensuite. L’outil n’effectue jamais de commit, de stash ou de checkout.

**Bun est-il plus rapide que Node ici ?** Pas de manière mesurable. Sur la machine Windows de l’auteur, le démarrage prenait environ 56 ms avec Node contre 64 ms avec Bun, et le guard hook environ 60 ms contre 57 ms ; une revue dure plusieurs dizaines de secondes, et ce temps vient du model. Bun est utilisé par défaut dans la documentation ; Node 18.18+ fonctionne de la même façon. Les deux exécutent le même code.

**Est-ce payant ?** Le plugin est gratuit. Chaque revue, tâche, traduction et mise à jour de graphify consomme votre quota Antigravity.

**Ai-je besoin d’Ollama ou d’une API key pour graphify ?** Non. graphify possède un emplacement de backend appelé « ollama », qui signifie « n’importe quel serveur local compatible avec OpenAI » ; le serveur utilisé est le petit serveur Antigravity de cet outil. Seul le package Python `openai` de graphify doit être installé, ce que fait `--graphify setup --yes`.

**graphify continuera-t-il à consommer mes tokens Claude ou Codex ?** Seulement si vous ou votre agent lancez vous-même `/graphify --update`, `graphify extract` ou une commande similaire, ou si une section de `CLAUDE.md` / `AGENTS.md` demande à l’agent de reconstruire le graphe. Utilisez `--graphify rules --write-rules` pour ajouter la règle qui l’en empêche.

**Quels fichiers Antigravity peut-il voir ?** Modes statiques : seulement le code envoyé par le script (plus une quantité limitée de code lié pour `--security`). Modes agentic : tout ce qu’il lit dans le repository et partout ailleurs sur le disque, sauf dans les chemins d’identifiants.

**Peut-il corriger les constats ?** Jamais. Vous ou un autre agent effectuez les corrections ; le relecteur se limite à la revue, ce qui préserve son indépendance.

**Peut-il relire une pull request GitHub ?** Faites localement un checkout de la branch et utilisez `--base`. Il n’accède pas à l’API GitHub.

**Pourquoi ne pas autoriser certaines commandes dans les paramètres d’agy ?** Les tests montrent qu’en mode headless, agy fait correspondre exactement les autorisations de plusieurs mots (`git status` oui, `git status --short` non), et que l’autorisation d’un hook ne remplace pas la vérification des permissions. Un hook peut seulement refuser de façon fiable. D’où l’utilisation de skip-permissions avec un hook qui refuse par défaut en mode agentic, et l’absence totale d’outils en mode statique.

**Puis-je ajouter des commandes autorisées ou des règles au scanner ?** Modifiez `CMDS` / `GIT_OK` dans `guard.mjs` ou `RULES` dans `lib/security.mjs`, exécutez `npm test`, puis `--install-guard`.

## 12. Mise à jour, désinstallation, développement

### Mettre à jour vers une nouvelle version

Une nouvelle release ne vous parvient pas automatiquement : vous choisissez de mettre à jour. Quatre étapes.

**1. Vérifier votre version et l’existence d’une version plus récente**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

Vous pouvez aussi consulter la liste des releases sur https://github.com/Ealireza/agy-review/releases et le [changelog](../CHANGELOG.md).

**2. Mettre à jour le plugin pour votre environnement**

| Environnement | Commandes (à exécuter dans un terminal normal) | Ensuite |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` puis `claude plugin update agy-review@agy-review` | redémarrez Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review` puis `codex plugin remove agy-review@agy-review` et `codex plugin add agy-review@agy-review` | redémarrez Codex |
| Clone simple | `git pull` dans votre clone | rien |

**3. Actualiser les éléments qui se trouvent hors du dossier du plugin**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Vérifier que tout fonctionne :** `--version` affiche le nouveau numéro, `--check` indique OK partout, et `--list-models --refresh` relit les valeurs de `--effort` acceptées par chaque model.

Si quelque chose ne fonctionne plus après une mise à jour : exécutez `--check`, consultez le tableau de résolution des problèmes (section 10) et, si vous devez revenir à l’ancienne version, supprimez le plugin puis installez une release précise avec `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. Vos paramètres (`.agy-review.json`) sont de simples fichiers que les mises à jour ne modifient jamais.

### Désinstallation

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Supprimez `~/.agy-review` (copie du runtime) et `~/.agy-review-cache.json` (cache de l’effort) si vous ne voulez laisser aucune trace.

### Développement

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

Les issues et pull requests sont bienvenues, notamment pour : les résultats de `verify` sous macOS et Linux, des paramètres de sandbox Codex qui fonctionnent, les contournements de la protection (signalez-les d’abord en privé si possible) et de nouvelles règles de scanner. Traductions : copiez `README.md` vers `docs/README.<code>.md`, traduisez-le, puis ajoutez la langue à la ligne de sélection de langue partout.

## Licence

MIT, voir [LICENSE](../LICENSE).
