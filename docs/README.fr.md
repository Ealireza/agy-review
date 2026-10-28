# agy-review

**Un relecteur indépendant qui doit prouver ce qu'il avance.** Revue de code, revue de sécurité, délégation de tâches et traduction par Google Antigravity (`agy`), depuis Claude Code, Codex ou n'importe quel terminal. En lecture seule, sans demande d'autorisation, et chaque constat est vérifié par rapport à votre code réel avant que vous ne le voyiez.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · **Français**

Site web : https://ealireza.github.io/agy-review/ · Approfondissements (en anglais) : [AGENTS.md](AGENTS.md) pour les agents et les boucles, [SECURITY-REVIEW.md](SECURITY-REVIEW.md) pour la méthode de sécurité.

---

## Sommaire

1. Ce que vous obtenez
2. Pourquoi vous pouvez faire confiance au rapport
3. État : ce qui est vérifié et ce qui ne l'est pas
4. Prérequis
5. Installation
6. Premier lancement : vérifier sur votre machine
7. Utilisation : revue, sécurité, tâches, traduction, modèles
8. Utilisation depuis des agents, des sous-agents et des boucles
9. Modèle de sécurité
10. Dépannage
11. FAQ
12. Mise à jour, désinstallation, développement

---

## 1. Ce que vous obtenez

| Skill (Claude Code / Codex) | Commande (Claude Code) | Ce que ça fait |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | revue graduée des modifications git, d'une branche, d'un fichier, d'une plage de lignes, d'une fonction ou d'un extrait |
| `agy-security` / `security` | `/agy-review:security` | revue de sécurité : OWASP/CWE, exploitabilité, scénario d'attaque, scanner de secrets et de motifs dangereux, appelants et appelés comme contexte |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | confiez n'importe quelle tâche autonome (réécriture, résumé, rédaction, extraction) à Antigravity et récupérez le résultat |
| `agy-translate` / `translate` | `/agy-review:translate` | traduction avec ton, public et glossaire ; vérifie que le code, les URL, les espaces réservés et la structure ont été préservés |
| `agy-models` / `models` | `/agy-review:models` | liste les modèles de votre agy, en choisit un, l'enregistre pour le projet ou globalement, règle l'effort |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | vérifie les prérequis, installe le garde en lecture seule, prouve sur votre machine que les écritures sont bloquées |

Sous-agents pour Claude Code : `agy-reviewer`, `agy-security`, `agy-worker`. Le tout tient dans un seul dépôt et un seul script (`plugins/agy-review/scripts/agy-review.mjs`). Il n'y a pas de serveur, et aucun compte en dehors de votre propre connexion Antigravity.

## 2. Pourquoi vous pouvez faire confiance au rapport

Un modèle de langage qui relit du code invente parfois un problème. Cet outil ne le croit sur parole sur rien.

1. Le relecteur doit renvoyer un rapport JSON strict (imposé par `--json-schema`). Chaque constat porte le **code exact** qu'il concerne.
2. Le script recherche cette citation dans le fichier réel. **Introuvable : le constat est rejeté** et listé à part. **Trouvée sur une autre ligne : le numéro de ligne est corrigé.** Les citations trop courtes ou trop génériques pour prouver quoi que ce soit (`return null;`, `}`) sont rejetées. Une citation qui correspond à plusieurs endroits éloignés de la ligne citée est rejetée comme ambiguë.
3. Le verdict, les compteurs et la barrière CI sont **calculés par le script** à partir des seuls constats vérifiés, jamais recopiés depuis le modèle.
4. L'absence de constat vérifié n'est **pas** une approbation : si des constats ont été rejetés, si le modèle n'était pas d'accord, s'il n'a pas couvert le code, ou si l'un de plusieurs modèles a échoué, le verdict est `inconclusive` et le code de sortie est 4.
5. Les constats situés hors des lignes demandées sont signalés comme tels et ne bloquent jamais. Les constats à faible confiance sont listés mais non comptés.
6. La sévérité (impact) et la priorité (quand corriger) sont distinctes et maintenues cohérentes : critical est toujours P0, nit est toujours P3, les constats de style ne dépassent jamais low.

Ce qui reste possible : une citation exacte avec une conclusion erronée. La citation prouve que le code existe, pas que le raisonnement est juste ; c'est pourquoi chaque constat comporte un scénario concret et pourquoi vous devez lire les lignes citées avant d'agir.

Exemple réel, cet outil sur un petit fichier contenant deux bogues introduits volontairement (Claude Sonnet 4.6 via agy) : 4 constats vérifiés aux bonnes lignes avec CWE-89, CWE-78, CWE-22 et CWE-369, couverture 100 %, un doublon écarté, et le scanner a signalé indépendamment les deux mêmes lignes.

## 3. État : ce qui est vérifié et ce qui ne l'est pas

| Vérification | Résultat |
|---|---|
| Tests unitaires et de pipeline (`npm test`) : ancrage, périmètre, verdict, dédoublonnage, recherche de symboles, cibles, configuration, modèles, tâches, traduction, sécurité, masquage | 50 tests, tous réussis, avec un faux `agy` (y compris le pipeline agentique, la détection de changement de l'arborescence, un modèle en échec et la barrière `verify`) |
| Hook de garde (commandes autorisées et refusées, outils, astuces de guillemets, chemins d'identifiants) | tests automatisés, réussis |
| Manifestes Claude Code (`claude plugin validate`), plugin Antigravity (`agy plugin validate --strict`) | réussis |
| Codex 0.163.0 : ajout du marketplace, installation du plugin, skills découverts | vérifié sous Windows 11 |
| Revue statique, revue de sécurité et tâches avec le vrai agy 1.4.8 (Gemini 3.8 Flash et Claude Sonnet 4.6), exécutés avec Bun 1.3.14 | vérifié sous Windows 11 ; constats ancrés aux bonnes lignes |
| Deux revues indépendantes de la conception et du code (Opus : 25 constats ; Codex : 28 constats), les constats confirmés ayant été corrigés avec un test de non-régression chacun | fait, voir le journal des modifications |
| **Revues agentiques (`agy --dangerously-skip-permissions` plus le garde bloquant de vraies écritures)** | **non exécutées par l'auteur** |

La dernière ligne compte pour la sécurité et dépend de votre version d'agy ; exécutez donc `verify` une fois après l'installation et après chaque mise à jour d'agy (section 6). Les revues statiques, les revues de sécurité d'un symbole/fichier/extrait, les tâches et les traductions n'utilisent jamais cet indicateur et ne peuvent rien écrire.

Testé avec agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 et Node 24, Windows 11. macOS et Linux devraient fonctionner (agy utilise `~/.gemini/config/plugins` sur toutes les plateformes) mais n'ont pas été testés.

## 4. Prérequis

Rien d'autre : pas d'autres plugins, pas d'autres outils en ligne de commande.

| Nécessaire | Pourquoi | Comment l'obtenir | Comment vérifier |
|---|---|---|---|
| Antigravity CLI `agy` | fait le travail | https://antigravity.google/cli, puis lancez `agy` une fois et connectez-vous | `agy --version` |
| Bun (recommandé) **ou** Node.js 18.18+ | exécute le script et le hook de garde | https://bun.sh ou https://nodejs.org | `bun --version` / `node --version` |
| git | cibles git et recherche du code lié | https://git-scm.com | `git --version` |
| Claude Code **ou** Codex **ou** n'importe quel terminal | là où vous faites vos demandes | leurs guides d'installation | `claude --version` / `codex --version` |

Bun est la valeur par défaut dans toutes les instructions et dans le hook de garde (`bun guard.mjs || node guard.mjs`) ; Node fonctionne à l'identique. L'utilisation d'Antigravity est décomptée de votre propre quota. Une revue peut durer de quelques secondes à plusieurs minutes.

## 5. Installation

Choisissez l'hôte que vous utilisez ; plusieurs peuvent partager le même script et le même garde.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` vérifie agy, git et le garde, et installe le garde dans `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` est la preuve de sécurité en conditions réelles.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Redémarrez Codex, puis demandez en langage naturel : « Check my Antigravity review setup », « Review my changes with Antigravity », « Security-review the function saveUpload », « Translate README.md to German, friendly tone ».

1. **Installez le garde une fois depuis un terminal normal** (il écrit dans `~/.gemini/config/plugins`) : `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows : `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). Seules les revues git agentiques ont besoin du garde.
2. **Le bac à sable de Codex doit laisser agy travailler :** réseau sortant, accès en écriture à `~/.gemini/antigravity-cli` et un socket localhost. Avec `workspace-write`, il vous faudra probablement, dans `~/.codex/config.toml` :

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Si quelque chose reste bloqué, le skill nomme l'accès manquant et s'arrête ; il n'élargit jamais les permissions de lui-même. Le bon fonctionnement d'agy dans votre bac à sable Codex est la partie de la configuration Codex que l'auteur n'a pas pu tester ; exécutez donc aussi `verify` depuis Codex.

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

Le garde est un plugin Antigravity ordinaire. Copiez `plugins/agy-review/antigravity-plugin/readonly-review` vers `~/.gemini/config/plugins/readonly-review` ou lancez `--install-guard` ; vérifiez avec `agy plugin list`. Il ne fait rien tant qu'un prompt ne contient pas `AGY_READONLY_REVIEW`, de sorte que vos sessions agy habituelles restent inchangées. Il fournit aussi un skill `readonly-code-review` pour agy en mode interactif.

## 6. Premier lancement : vérifier sur votre machine

Exécutez-le une fois après l'installation et après chaque mise à jour d'agy : `/agy-review:verify`, le skill Codex `verify`, ou `--verify`. Il effectue un petit appel agy réel dans un dossier jetable : lire un fichier (doit fonctionner), écrire un fichier, rediriger vers un fichier et supprimer un fichier (tout cela doit être bloqué). Résultat attendu :

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Tout `FAIL` se termine par `NOT VERIFIED` et les revues agentiques restent désactivées : ouvrez une issue avec la sortie et votre `agy --version`. Un `verify` réussi est enregistré pour exactement ce garde et cette version d'agy ; **les revues agentiques refusent de démarrer sans lui**, et une mise à jour d'agy ou du garde l'invalide ; exécutez donc `verify` de nouveau après les mises à jour. Les modes statiques n'en ont pas besoin.

## 7. Utilisation

À lancer depuis la racine du dépôt.

### 7a. Revue : choisir la cible

| Vous voulez relire | Utilisez | Mode |
|---|---|---|
| le travail non validé | rien | agentique, lecture seule |
| une branche / les modifications indexées / un commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentique, lecture seule |
| un fichier ou une plage | `--file src/a.kt` ou `--file src/a.kt:40-80` (répétable) | statique |
| une fonction ou une classe | `--symbol parseConfig` (+ `--file` si le nom est ambigu) | statique |
| du code qui n'existe qu'en mémoire | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | statique |
| l'un de ces cas avec l'autorisation de consulter d'autres fichiers | ajoutez `--agentic` | agentique, lecture seule |

*Statique* : le script lit et numérote lui-même le code et le modèle n'a aucun outil ; rien ne peut donc être touché et rien ne peut être inventé à propos de fichiers qu'on ne lui a pas montrés. *Agentique* : le relecteur lit lui-même le dépôt à travers le hook de garde, qui bloque toute écriture.

Aidez le relecteur : `--context "what this code must do"`, `--focus "concurrency, error handling"` (ou des mots à la suite), `--context-lines N`.

Sortie : Markdown par défaut ; `--format json` pour les machines ; `--output file` ; `--fail-on high` (code de sortie 10 s'il existe un constat high ou critical vérifié) ; `--previous old.json` marque les constats comme nouveaux, persistants, résolus ou non signalés à nouveau.

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

`--security` (skill `agy-security`, commande `/agy-review:security`, sous-agent `agy-security`) fonctionne sur toutes les cibles ci-dessus et ajoute : une méthode de modélisation des menaces (source non fiable vers puits dangereux, avec les contrôles intermédiaires), la correspondance OWASP Top 10 (2021) et CWE, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, un scanner sans modèle pour les secrets et ~25 classes de motifs dangereux, et le **code lié** : ce que la cible appelle et qui l'appelle.

- Un secret codé en dur (clé privée, AWS, GitHub, Stripe, Slack, Google) est **masqué avant que quoi que ce soit ne soit envoyé à un modèle** et signalé comme constat par motif.
- Un `cve` dans un rapport est une affirmation du modèle et est toujours étiqueté `cve_verified: false` : confirmez-le sur NVD ou avec `osv-scanner` / `npm audit` / `pip-audit`. L'outil n'invente ni ne vérifie jamais de CVE.
- « Claude a écrit du code, relisez-le ainsi que son voisinage » : copiez la règle prête à l'emploi depuis `examples/` dans votre `CLAUDE.md` ou `AGENTS.md`, ou installez le hook Stop optionnel ou le hook pre-commit. Détails et recettes d'enchaînement : [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Tâches : `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Le modèle ne reçoit que le texte que vous transmettez et aucun outil. Le mode texte n'affiche que la réponse ; stderr indique le modèle et l'effort.

### 7d. Traduction : `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Options : `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` ou CSV ; `=` conserve le terme), `--keep a,b`, `--notes`, `--strict`. Les textes longs sont découpés sur les lignes vides (jamais à l'intérieur d'un bloc de code) et traduits morceau par morceau. Après la traduction, le script vérifie que le code délimité, le code en ligne, les URL, les espaces réservés (`{{x}}`, `${x}`, `%s`), les balises et les titres correspondent à la source, et signale chaque différence (`--strict` transforme une différence en code de sortie 11). Les skills vous interrogent d'abord sur le ton, le public et les termes, en ne posant que les questions dont ils ne peuvent pas déduire la réponse. Les vérifications automatiques ne peuvent pas juger la fluidité ; faites relire les textes importants par un lecteur natif.

### 7e. Modèles et effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Par exécution : `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Ordre de priorité : ligne de commande, fichier du projet, fichier utilisateur, valeur par défaut d'agy. `--effort auto` (la valeur par défaut) est un choix déterministe et expliqué : les revues s'adaptent à la quantité de code concernée (un axe sensible au risque, comme la sécurité, ajoute un cran), les tâches à la formulation (transformations mécaniques : low, raisonnement poussé : high) et à la longueur de l'entrée ; `max` n'est jamais automatique. Certains modèles n'acceptent pas `--effort` ; l'outil utilise alors la valeur par défaut du modèle et le signale. Si le filtre de contenu de Gemini refuse un prompt et que vous n'avez pas nommé de modèle, l'outil réessaie une fois avec un modèle non Gemini et le signale.

### 7f. Options et codes de sortie

`bun agy-review.mjs --help` liste tout. Codes de sortie : `0` ok · `1` erreur, délai dépassé ou réponse illisible · `2` erreur d'utilisation ou prérequis manquant · `3` l'arborescence de travail a changé pendant une revue agentique · `4` non concluant ou incomplet (**ce n'est pas un succès**) · `10` la barrière `--fail-on` a échoué (le rapport est valide) · `11` la vérification de la traduction a échoué avec `--strict`. Si plusieurs s'appliquent, `3` l'emporte sur `10`, et `10` sur `4` ; un rapport est écrit dans tous les cas sauf `1` et `2`, lisez donc `verdict` et `incomplete` dedans. Une arborescence de travail propre n'est pas une erreur : l'outil affiche « No changes to review » et se termine avec le code 0 sans appeler de modèle.

## 8. Utilisation depuis des agents, des sous-agents et des boucles

Chaque skill est un simple appel en ligne de commande avec un JSON stable, de sorte que n'importe quel agent peut l'utiliser : lancez le sous-agent `agy-reviewer`, `agy-security` ou `agy-worker` dans Claude Code, appelez les skills dans Codex, ou appelez le script depuis n'importe quel framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

On ne dit jamais au relecteur ce que vous avez modifié, chaque tour reste donc indépendant. Contrat complet, champs JSON, recettes de boucles et schémas de répartition : [AGENTS.md](AGENTS.md).

## 9. Modèle de sécurité

**Les revues statiques, les revues de sécurité d'un symbole/fichier/extrait, les tâches et les traductions** lancent agy sans aucun indicateur de permission et sans outils, dans un dossier temporaire vide : agy ne peut ni lire ni écrire vos fichiers ; les seules données qui sortent sont celles que le script a placées dans le prompt (avec les secrets reconnus masqués).

**Les revues agentiques** (cibles git, ou `--agentic`) démarrent agy avec `--dangerously-skip-permissions` pour que rien n'attende une confirmation, et s'appuient sur un hook de garde `PreToolUse` (`guard.mjs`) qui inspecte chaque appel d'outil et **refuse par défaut** :

- autorisés : les outils de consultation et de recherche de fichiers ; les commandes shell, simples ou enchaînées, construites uniquement à partir de sous-commandes `git` en lecture seule, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (sans `-delete`/`-exec`), PowerShell `Get-*`, `Select-String` et quelques autres (la liste figure dans `guard.mjs`) ;
- refusés : tout outil d'écriture/édition/notebook/image/planification/sous-agent/navigateur/web/MCP et tout outil inconnu ; les redirections, `$(...)`, les accents graves, les blocs de script, les constructions de type `eval` ; `git commit/push/checkout/reset/...` ; les interpréteurs et les gestionnaires de paquets ; `curl`, `ssh` ; la lecture des magasins d'identifiants (`.ssh`, `.aws`, `.gnupg`, clés privées) ;
- si le garde plante, il refuse ; le script refuse de démarrer une exécution agentique à moins que le garde ne soit installé, identique à celui fourni, **et qu'un `--verify` réussi ait été enregistré pour ce garde et cette version d'agy** ; avant et après l'exécution, il calcule l'empreinte de `git status`, des diffs suivis et indexés et du contenu de chaque fichier non suivi, et se termine avec le code 3 en émettant un avertissement si quoi que ce soit diffère.
- **Les secrets en mode agentique ne peuvent pas être masqués** avant que le relecteur ne lise les fichiers. L'outil les détecte, avertit et les liste dans `limitations` ; faites-les tourner, ou relisez avec `--file` / `--symbol`, où ils sont d'abord masqués.

Ce que ce n'est pas :

- **Pas un bac à sable du système d'exploitation.** Le garde filtre les noms d'outils et le texte des commandes ; le bac à sable propre à agy n'est pas disponible partout. Une injection de prompt délibérée cachée dans le code relu pourrait chercher une forme de commande que le filtre accepte. La vérification avant/après détecte les fichiers suivis modifiés et les nouveaux fichiers, pas les lectures.
- **Votre code est envoyé au modèle de Google** ; les lectures ne sont pas restreintes, hormis les chemins d'identifiants. Les fichiers `.env` du dépôt sont lisibles par les revues agentiques. Ne relisez pas du code que vous n'avez pas le droit de partager.
- git peut exécuter des programmes externes de diff ou de textconv configurés dans un dépôt : ne relisez que des dépôts de confiance.
- Les constats peuvent être erronés ou incomplets, et « aucun constat » ne signifie jamais « sûr ».

## 10. Dépannage

| Symptôme | Cause et solution |
|---|---|
| `Missing: agy CLI` | installez Antigravity CLI et lancez `agy` une fois pour vous connecter ; `agy --version` doit fonctionner dans le shell qui exécute le plugin |
| `Missing: read-only guard - missing/outdated` | lancez setup (`/agy-review:setup`, le skill Codex `setup`, ou `--install-guard`) ; seules les revues agentiques en ont besoin |
| `Not inside a git repository` (code 2) | faites `cd` vers la racine du dépôt, ou relisez du code avec `--file` / `--symbol` / `--stdin` |
| Verdict `inconclusive`, code 4 | ce n'est pas un succès : des constats ont été rejetés, le modèle n'était pas d'accord ou n'a pas couvert le code, ou un modèle a échoué. Réduisez le périmètre, ajoutez `--context`, ou essayez un autre `--model` |
| `blocked by Gemini's filters` | le filtre de sécurité de Gemini a refusé (fréquent pour les prompts de sécurité). Sans `--model`, l'outil réessaie avec un modèle non Gemini ; sinon choisissez-en un avec `--model` |
| `--effort is not supported for model` | géré automatiquement (la valeur par défaut du modèle est utilisée et signalée) |
| Revue vide, code 1 | vérifiez la connexion et le quota avec `agy -p "say hi"` ; augmentez `--timeout` pour les grosses cibles |
| Code 3 / arborescence de travail modifiée | quelque chose a modifié vos fichiers pendant une revue agentique (éditeur, build, ou contournement du garde). Vérifiez `git status` et `git diff` ; si ce n'est pas vous, traitez-le comme un événement de sécurité |
| Nombreux constats rejetés | le modèle a cité du code qui n'existe pas. Attendu parfois ; ils ne sont jamais comptés. Utilisez un `--model` plus performant ou un périmètre plus étroit |
| `--symbol` : « defined in several places » ou « not found » | passez `--file`, ou utilisez `--file path:A-B`. Le localisateur est heuristique (appariement d'accolades/indentation), pas un analyseur syntaxique |
| Codex : « blocked by sandbox » | voir 5b : le réseau, les écritures dans `~/.gemini/antigravity-cli` et un socket localhost doivent être autorisés |
| Windows : `agy` ou `bun` introuvable dans Claude/Codex | le shell de l'outil a un `PATH` différent ; lancez-le depuis un shell où la commande fonctionne |
| `verify` affiche FAIL | n'utilisez pas les revues agentiques sur du code important ; ouvrez une issue avec la sortie et `agy --version` |

## 11. FAQ

**Est-ce que ça modifie mon code ?** Non. Les modes statiques ne le peuvent pas ; le mode agentique bloque les écritures et avertit si votre arborescence diffère ensuite. Il ne fait jamais de commit, de stash ni de checkout.

**Bun est-il plus rapide que Node ici ?** Pas de façon mesurable. Sur la machine Windows de l'auteur, le démarrage prenait environ 56 ms avec Node et 64 ms avec Bun, et le hook de garde environ 60 ms contre 57 ms ; une revue prend des dizaines de secondes et ce temps est celui du modèle. Bun est la valeur par défaut documentée ; Node 18.18+ fonctionne de la même façon. Les deux sont couverts par le même code.

**Est-ce que ça coûte de l'argent ?** Le plugin est gratuit. Chaque revue consomme votre quota Antigravity.

**Quels fichiers Antigravity voit-il ?** Modes statiques : uniquement le code que le script envoie (plus du code lié borné pour `--security`). Modes agentiques : tout ce qu'il lit dans le dépôt, et n'importe où sur le disque sauf les chemins d'identifiants.

**Peut-il corriger les constats ?** Jamais. Un autre agent ou vous-même corrigez ; le relecteur ne fait que relire, il reste donc indépendant.

**Peut-il relire une pull request GitHub ?** Récupérez la branche en local et utilisez `--base`. Il n'y a pas d'accès à l'API GitHub.

**Pourquoi ne pas autoriser des commandes dans les paramètres d'agy ?** Testé : en mode headless, agy fait correspondre les autorisations de plusieurs mots exactement (`git status` oui, `git status --short` non) et un « allow » de hook ne l'emporte pas sur la vérification des permissions. Un hook ne peut refuser que de façon fiable, d'où skip-permissions plus un hook qui refuse par défaut pour le mode agentique, et aucun outil du tout pour le mode statique.

**Puis-je ajouter des commandes autorisées ou des règles de scanner ?** Modifiez `CMDS` / `GIT_OK` dans `guard.mjs` ou `RULES` dans `lib/security.mjs`, lancez `npm test`, puis `--install-guard`.

## 12. Mise à jour, désinstallation, développement

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

Après une mise à jour, relancez setup (il réinstalle un garde modifié) et verify.

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

Les issues et les pull requests sont les bienvenues, en particulier : résultats de `verify` sur macOS et Linux, réglages du bac à sable Codex qui fonctionnent, contournements du garde (signalez-les d'abord en privé si possible) et nouvelles règles de scanner. Traductions : copiez `README.md` vers `docs/README.<code>.md`, traduisez, et ajoutez la langue à la ligne du sélecteur partout.

## Licence

MIT, voir [LICENSE](../LICENSE).
