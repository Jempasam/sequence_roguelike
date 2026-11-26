# Titre : Utilisable

# Description : l'utilisable
Un utilisable est quelque chose qu'un personnage porte pour s'en servir une fois ou quelques fois, comme une potion, un élixir ou une fiole. Il se choisit pendant la préparation avec les chaînes, puis agit au début de l'exécution, après les effets de préparation, à un moment fixe du round. Il gère sa place dans la ceinture : il dépense une charge à chaque usage et la quitte une fois épuisé, sauf s'il se recharge à chaque combat.

# Exemple : l'utilisable en jeu
- Potion de soin : soigne 2 cœurs + soin.
- Élixir de force : +1 force ce round.
- Flasque de feu : l'ennemi le plus proche, à 5 m au plus, prend brûlure 2 rounds.
- Tourelle pliable : pose Tourelle à un mètre devant, 6 utilisations.

# Mots clés associés : vocabulaire de l'utilisable
- `USABLE` : "utilisable" : ce qu'un héros utilise quelques fois avant qu'il soit épuisé.
- `HEART` : "cœur" : beaucoup d'utilisables soignent ou donnent des cœurs.
- `BATTLE_ROUND` : "round" : la durée des élixirs.
- `FORCE`, `AGILITE`, `PORTEE`, `HEAL`, `SUMMON_STAT` : "force", "agilité", "portée", "soin", "invocation" : les stats dont leurs chiffres dépendent.
- `DISTANCE` : "m" : les portées des fioles et des téléportations.
- `INVOCATION` : "invoquer" : tourelles, leurres, cactus et bêtes qu'ils posent.

# Classes associées : code de l'utilisable
- `Usable` ([core/src/games/mecard/sim/usable/Usable.ts](../core/src/games/mecard/sim/usable/Usable.ts)) : l'interface : charges, recharge, `use(ctx, slot)`.
- `AbstractUsable` ([core/src/games/mecard/sim/usable/subs/AbstractUsable.ts](../core/src/games/mecard/sim/usable/subs/AbstractUsable.ts)) : nom, icône, description, charges, une charge dépensée après chaque usage.
- `RoundElixir` ([core/src/games/mecard/sim/usable/subs/elixir/RoundElixir.ts](../core/src/games/mecard/sim/usable/subs/elixir/RoundElixir.ts)) : un élixir dont l'effet dure un round.
- `Carried` ([core/src/games/mecard/sim/usable/Usable.ts](../core/src/games/mecard/sim/usable/Usable.ts)) : un utilisable dans une ceinture, avec ses charges restantes.
- `UsableSlot` ([core/src/games/mecard/sim/usable/Usable.ts](../core/src/games/mecard/sim/usable/Usable.ts)) : sa place dans la ceinture : `spend`, `remove`.
- `UnitContext` ([core/src/games/mecard/sim/battle/Action.ts](../core/src/games/mecard/sim/battle/Action.ts)) : ce que reçoit `use`.

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/usable/](../core/src/games/mecard/sim/usable/)
- sous-types : [core/src/games/mecard/sim/usable/subs/](../core/src/games/mecard/sim/usable/subs/), dont `elixir/`, `flask/` et `hand/`
- catalogue : [core/src/games/mecard/sim/catalog/usables.ts](../core/src/games/mecard/sim/catalog/usables.ts)

# Convention de nommage : individus de l'utilisable
- Constante : UPPER_SNAKE de l'anglais, par exemple `HEALING_POTION`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Potion de soin".
- Fichier : une classe en PascalCase (`Trumpet.ts`), ou un regroupement en PascalCase pluriel (`StatusElixirs.ts`).
- Deux utilisables ne partagent pas de nom : vérifier avec `npm run cli -- list usables`.

# Énumération : individus de l'utilisable
Une cinquantaine : `npm run cli -- list usables --desc`.
