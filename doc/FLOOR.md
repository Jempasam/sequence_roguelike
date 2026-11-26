# Titre : Étage

# Description : l'étage
Un étage est un niveau du donjon, avec sa propre carte : des combats et des haltes reliés entre eux, dont le dernier combat est celui du boss. Le vaincre ouvre les sorties vers les étages suivants, d'un niveau plus difficile. Chaque sorte d'étage dit comment elle se présente (fond, décor) et remplit sa carte elle-même.

# Exemple : l'étage en jeu
- Grotte : des gobelins et leurs amis, gardés par un golem runique ; l'étage où commence chaque partie.
- Forêt : des chasseurs rapides, et un troll au bout ; plus d'hôpitaux, de tavernes et de dresseurs.
- Port : des pirates et un capitaine Kraken au bout ; il ramène à la Grotte, un niveau plus difficile.

# Mots clés associés : vocabulaire de l'étage
- `FLOOR` : "étage" : un niveau du donjon, avec sa propre carte.
- `FIGHT` : "combat" : ce que l'étage pose sur ses places.
- `HALT` : "halte" : l'autre sorte de place de sa carte.
- `TRAVEL_STEP` : "étape" : une place de la carte.

# Classes associées : code de l'étage
- `Floor` ([core/src/games/mecard/sim/floor/Floor.ts](../core/src/games/mecard/sim/floor/Floor.ts)) : un étage joué, avec son niveau et `fillMap`.
- `FloorType` ([core/src/games/mecard/sim/floor/Floor.ts](../core/src/games/mecard/sim/floor/Floor.ts)) : une sorte d'étage : nom, icône, fond, décors, `create(level)`.
- `FloorContext` ([core/src/games/mecard/sim/floor/Floor.ts](../core/src/games/mecard/sim/floor/Floor.ts)) : ce qu'un étage peut faire en remplissant sa carte (`addFight`, `addHalt`, `link`).
- `AbstractFloor` ([core/src/games/mecard/sim/floor/subs/AbstractFloor.ts](../core/src/games/mecard/sim/floor/subs/AbstractFloor.ts)) : construit la structure de la carte ; chaque étage ne choisit que ses combats.
- `FLOOR_LINKS` ([core/src/games/mecard/sim/catalog/floors.ts](../core/src/games/mecard/sim/catalog/floors.ts)) : où mène chaque sorte d'étage.

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/floor/](../core/src/games/mecard/sim/floor/)
- sous-types : [core/src/games/mecard/sim/floor/subs/](../core/src/games/mecard/sim/floor/subs/)
- combats par étage : [core/src/games/mecard/sim/floor/fights/](../core/src/games/mecard/sim/floor/fights/)

# Convention de nommage : individus de l'étage
- Constante : UPPER_SNAKE de l'anglais suivi de `_FLOOR`, par exemple `CAVE_FLOOR`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Grotte".
- Fichier : `<Nom>Floor.ts` en PascalCase, avec ses combats dans `fights/<nom>Fights.ts`.
- Pas de commande de catalogue pour les étages : vérifier les noms dans `core/src/games/mecard/sim/catalog/floors.ts`.

# Énumération : individus de l'étage
Du plus facile au plus difficile (chaque étage mène aux deux suivants, le Port revient à la Grotte).

| Nom affiché | Constante | Rôle |
| --- | --- | --- |
| Grotte | `CAVE_FLOOR` | Gobelins, golem runique au bout ; premier étage. |
| Toundra | `TUNDRA_FLOOR` | Froid, loups, géant de givre au bout. |
| Mine | `MINE_FLOOR` | Robots et pierre, robot megalaser au bout. |
| Cimetière | `GRAVEYARD_FLOOR` | Morts-vivants, roi liche au bout. |
| Enfer | `HELL_FLOOR` | Feu et rage, le diable au bout. |
| Volcan | `VOLCANO_FLOOR` | Lave, lézards de feu, dragon de magma au bout. |
| Marais | `SWAMP_FLOOR` | Boue, poisons, crapauds, hydre au bout. |
| Dojo | `DOJO_FLOOR` | Lames rapides, shogun fantôme au bout. |
| Usine gobelin | `FACTORY_FLOOR` | Robots et gobelins pilotes, mécha-gobelin au bout. |
| Forêt | `FOREST_FLOOR` | Chasseurs rapides, troll au bout. |
| Château | `CASTLE_FLOOR` | Gardes et chevaliers, seigneur noir au bout. |
| Port | `HARBOR_FLOOR` | Pirates et quais, capitaine Kraken au bout. |
| Antre du nécromancien | `NECRO_FLOOR` | Étage posé par un mode de jeu seulement. |
| Atelier | `UPGRADE_FLOOR` | Étage posé par un mode de jeu seulement. |
