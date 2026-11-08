# Outil en ligne de commande

Sous-projet `command_line/`, dépend de `core` (`@game/core/mecard`). Sert à consulter les catalogues de Dungeon of the Mecard pendant le développement de nouvelles cartes, kits, monstres, objets : voir ce qui existe avant d'ajouter, éviter les doublons de nom, reprendre le ton des descriptions.

## Commandes

Depuis la racine du repo :

```
npm run cli -- catalogs                    # les catalogues et leur taille
npm run cli -- list <catalogue>            # les noms, un par ligne
npm run cli -- list <catalogue> --desc     # "Nom: description", une ligne par entrée
npm run cli -- list all [--desc]           # tous les catalogues, groupés
npm run cli -- sim [options]               # combats aléatoires en masse : winrates, équipes, kits custom
npm run cli -- --help
```

`sim` est documenté à part dans [SIM.md](SIM.md) ; `npm run cli -- sim --help` en donne le résumé.

Astuce : `npm run cli --silent -- list cards` supprime les lignes d'en-tête de npm (`> cli`, `> tsx ...`).

## Catalogues

| Catalogue | Source (`core/src/games/mecard/sim/catalog/`) | Contenu de `--desc` |
|---|---|---|
| `cards` | `ALL_CARDS` | la description de la carte |
| `kits` | `ALL_KITS` | cartes, objets, usables du kit |
| `monsters` | `ALL_MONSTERS` | PV, pioche, taille si définie, cartes |
| `pets` | `ALL_PETS` | comme `monsters` |
| `items` | `ALL_ITEMS` | la description de l'objet |
| `usables` | `ALL_USABLES` | la description de l'usable |
| `boosters` | `ALL_BOOSTERS` | les tirages (`2 parmi [...]`) |

Pour ajouter un catalogue : une entrée dans `CATALOGS` de `command_line/src/catalogs.ts`.

## Format de sortie

Texte brut UTF-8, sans couleur, dans l'ordre du catalogue. Les erreurs vont sur stderr avec le code de sortie 1.

`list <catalogue>` :

```
Gobelin
Archer
```

`list <catalogue> --desc` : une ligne par entrée. Les descriptions sont rendues comme dans le jeu (`mecardDisplay`), leurs retours à la ligne remplacés par un espace.

```
Estoc: Transperce tout sur 2 m devant : 2 dégâts + force à chaque unité.
Gobelin: PV 4, pioche 3, cartes [Chemin, Avancer, Avancer, Estoc]
Lancier: cartes [Avancer, ...], objets [], usables []
```

`list all` : un en-tête `# <catalogue> (<n>)` par catalogue, une ligne vide entre deux.

`catalogs` : `<catalogue> <n>` par ligne.
