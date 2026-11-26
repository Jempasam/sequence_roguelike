# Titre : Objet

# Description : l'objet
Un objet est quelque chose qu'un personnage porte pendant toute la partie et qui le change pour de bon : une stat, une réaction à un coup, un soin après le combat. Il se branche au début de chaque combat par des observateurs et des modificateurs, comme un statut, puis se débranche à la fin du combat.

# Exemple : l'objet en jeu
- Pierre à aiguiser : +1 force, à chaque coup.
- Croc vampirique : chaque coup qui touche soigne 1 cœur.
- Amulette de vigueur : soigne 1 cœur à la fin de chaque round.
- Sac sans fond : +2 cartes dans la main.

# Mots clés associés : vocabulaire de l'objet
- `ITEM` : "objet" : ce qu'un personnage porte et qui l'aide tout le temps.
- `HEART` : "cœur" : l'unité de vie et de dégâts, que beaucoup d'objets soignent ou donnent.
- `BATTLE_ROUND` : "round" : le rythme de beaucoup d'effets d'objets.
- `FORCE`, `PRECISION`, `PORTEE`, `HEAL`, `SUMMON_STAT` : "force", "précision", "portée", "soin", "invocation" : les stats que les objets de stat modifient.
- `CARTE` : "carte" : les objets de main changent le nombre de cartes tenues ou piochées.

# Classes associées : code de l'objet
- `Item` ([core/src/games/mecard/sim/item/Item.ts](../core/src/games/mecard/sim/item/Item.ts)) : l'interface : `init`, `dispose` et `afterFight` optionnel.
- `AbstractItem` ([core/src/games/mecard/sim/item/subs/AbstractItem.ts](../core/src/games/mecard/sim/item/subs/AbstractItem.ts)) : nom, icône, description, couleur ; `init` reste à écrire.
- `StatItem` ([core/src/games/mecard/sim/item/subs/stat/StatItem.ts](../core/src/games/mecard/sim/item/subs/stat/StatItem.ts)) : un objet qui change des stats de l'unité.
- `Survivor` ([core/src/games/mecard/sim/item/Item.ts](../core/src/games/mecard/sim/item/Item.ts)) : ce qu'un combat laisse d'un personnage, pour les objets qui le soignent après.
- `PlugContext` ([core/src/games/mecard/sim/battle/Action.ts](../core/src/games/mecard/sim/battle/Action.ts)) : ce qu'un objet reçoit pour se brancher dans l'unité (`ctx.hold` garde chaque branchement).

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/item/](../core/src/games/mecard/sim/item/)
- sous-types : [core/src/games/mecard/sim/item/subs/](../core/src/games/mecard/sim/item/subs/), triés en `combat/`, `death/`, `gold/`, `hand/`, `heal/`, `stat/`, `status/`, `summon/`
- catalogue : [core/src/games/mecard/sim/catalog/items.ts](../core/src/games/mecard/sim/catalog/items.ts)

# Convention de nommage : individus de l'objet
- Constante : UPPER_SNAKE de l'anglais, par exemple `WHETSTONE`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Pierre à aiguiser".
- Fichier : une classe en PascalCase (`Banner.ts`), ou un regroupement en PascalCase pluriel (`HeartItems.ts`), dans le dossier de sa famille.
- Deux objets ne partagent pas de nom : vérifier avec `npm run cli -- list items`, ton des descriptions avec `--desc`.

# Énumération : individus de l'objet
Plus de quatre-vingts objets : `npm run cli -- list items --desc`.
