# Format de la documentation

Les fichiers de `doc/` documentent l'architecture et les concepts du jeu. Tous suivent la même structure.

Certains concepts sont énumérables : ils désignent une espèce dont il existe des individus (par exemple une carte, un monstre, un objet).

## Sections d'un concept

Chaque concept est décrit par les parties suivantes, dans cet ordre :

| Section | Contenu |
| --- | --- |
| `# Titre` | Le titre du concept. |
| `# Description` | Une courte description du concept. |
| `# Exemple` | Un exemple d'utilisation. |
| `# Mots clés associés` | Les mots clés et classes supportés par semtext. |
| `# Classes associées` | Les classes du code liées au concept. |
| `# Sous-dossier associé` | Le dossier du code qui contient le concept. |
| `# Convention de nommage` | La convention de nommage des individus, pour un concept énumérable. |
| `# Énumération` | La liste des individus, seulement s'ils sont assez peu nombreux pour que cela vaille le coup. |

## Format du contenu de chaque section

### `# Titre`
- Une seule ligne, au format des titres décrit plus bas : le nom du concept au singulier, avec une majuscule.
- Aucun contenu sous le titre : la section `# Description` suit directement.

### `# Description`
- Un ou deux paragraphes de prose, trois ou quatre phrases au plus.
- Dit ce qu'est le concept et son rôle dans le jeu, sans détailler les individus ni le code.
- Le premier mot clé de semtext rencontré s'écrit tel quel, pour que le lecteur retrouve le vocabulaire du jeu.

### `# Exemple`
- Pas de code : une liste à puces, une puce par exemple, au format `` - nom : description ``.
- Le nom est celui d'un exemple concret (pour un concept énumérable, un individu réel, avec son nom affiché).
- La description dit en une phrase ce que fait cet exemple, ou comment le concept y est utilisé.

### `# Mots clés associés`
- Liste à puces, un mot clé par ligne : `` - `NOM_CONSTANTE` : "mot affiché" : sens en une phrase. ``
- `NOM_CONSTANTE` est la constante de `sim/base/keywords.ts` (UPPER_SNAKE, préfixe `BATTLE_` ou `TRAVEL_` selon la phase).
- Le mot affiché est le texte français du `Keyword`. Une phrase le reprend avec `.as("forme accordée")`.
- Seuls les mots clés dont la phrase d'un individu du concept se sert sont listés. Section omise si aucun.

### `# Classes associées`
- Liste à puces, une classe ou un type par ligne : `` - `NomDeClasse` ([chemin/relatif.ts](../chemin/relatif.ts)) : rôle en une phrase. ``
- Classe de base d'abord (souvent `Abstract...`), puis les classes d'implémentation, puis les interfaces de contexte.
- Les chemins sont relatifs au fichier de doc et cliquables.

### `# Sous-dossier associé`
- Liste à puces, une puce par racine du concept (il peut y en avoir plusieurs), au format `` - racine : chemin ``.
- La racine nomme ce que le dossier contient : `type` (la définition abstraite du concept), `instance` (ses exemplaires en cours de jeu), etc.
- Le chemin est cliquable et relatif à la racine du dépôt : `` [core/src/.../card/](../core/src/.../card/) ``.
- Si une racine a un dossier `subs/`, une puce de plus indique le dossier des sous-types.

### `# Convention de nommage`
- Concept énumérable seulement.
- Trois puces : le nom de la constante exportée (UPPER_SNAKE), le nom affiché (français, majuscule initiale, sans article), le nom du fichier (PascalCase pour une classe, camelCase pour un regroupement).
- Suivies d'une puce sur ce qui interdit un doublon de nom, avec la commande `npm run cli -- <commande>` qui permet de vérifier.

### `# Énumération`
- Concept énumérable dont les individus tiennent en une page au plus.
- Tableau Markdown : une ligne par individu, colonnes `Nom affiché`, `Constante`, `Rôle en une phrase`, trié par famille puis par ordre alphabétique.
- Au-delà, renvoyer à la commande du catalogue (`npm run cli -- ...`) au lieu de lister.

## Plusieurs concepts dans un même fichier

Pour décrire plusieurs concepts dans le même fichier, chaque section descend d'un niveau (`##` au lieu de `#`). Le titre de niveau 1 décrit alors un seul des concepts.

## Format des titres

Chaque titre porte un nom standard suivi d'une précision propre au concept :

```
# [TITRE STANDARD] : [PRÉCISION POUR CE CONCEPT]
```
