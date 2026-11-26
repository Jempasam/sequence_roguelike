# Titre : Unité

# Description : l'unité
Une unité est un personnage dans un combat : elle a une position, une direction, des cœurs, des statuts, des decks de cartes et les étapes qu'il lui reste à jouer ce round. Elle ne vit que le temps du combat : ce qui dure d'un combat à l'autre (ses cartes, ses cœurs, ses objets) est rendu à la partie à la fin.

Une unité vient d'un personnage du groupe (aventurier, allié, familier recruté) ou d'un monstre. Elle est planifiée par un joueur, par un bot ou par un contrôleur donné, et appartient à une équipe.

# Exemple : l'unité en jeu
- Lancier : aventurier de départ à 4 cœurs rouges, qui joue des estocs.
- Gobelin : monstre dont le deck joue la même boucle à chaque round, que le joueur apprend à lire.
- Loup : familier, un monstre apprivoisé qui combat aux côtés du groupe.
- Mannequin : monstre immobile, cible des mesures de la simulation.

# Mots clés associés : vocabulaire de l'unité
- `UNIT` : "unité" : un personnage dans un combat.
- `HEART` : "cœur" : sa vie et les dégâts qu'elle reçoit.
- `MONSTER` : "monstre" : une unité jouée par le jeu, avec son deck.
- `PET` : "familier" : un monstre apprivoisé.
- `ADVENTURER` : "aventurier" : un personnage fait d'un kit.
- `DECK` : "deck" : ses cartes.
- `BATTLE_ROUND` : "round" : une préparation, puis tout le monde joue sa chaîne.
- `BATTLE_TURN` : "tour" : une étape de sa chaîne.
- `INVOCATION` : "invoquer" : amener une unité à côté de soi.
- `FEBRILE` : "fébrile" : une unité dont la moitié des cœurs ou plus sont vides.

# Classes associées : code de l'unité
- `Unit` ([core/src/games/mecard/sim/battle/Unit.ts](../core/src/games/mecard/sim/battle/Unit.ts)) : l'unité en combat, ses observables et sa chaîne.
- `UnitSpec` ([core/src/games/mecard/sim/battle/Unit.ts](../core/src/games/mecard/sim/battle/Unit.ts)) : de quoi elle est faite quand elle entre au combat.
- `UnitStats` ([core/src/games/mecard/sim/battle/Unit.ts](../core/src/games/mecard/sim/battle/Unit.ts)) : ses stats (force, précision, agilité, portée...).
- `Team` ([core/src/games/mecard/sim/battle/Team.ts](../core/src/games/mecard/sim/battle/Team.ts)) : un camp du combat.
- `Deck`, `Decks` ([core/src/games/mecard/sim/battle/Deck.ts](../core/src/games/mecard/sim/battle/Deck.ts)) : pioche, main et défausse d'un deck.
- `Battle` ([core/src/games/mecard/sim/battle/Battle.ts](../core/src/games/mecard/sim/battle/Battle.ts)) : le combat, qui fait jouer les unités.
- `Hero` ([core/src/games/mecard/sim/run/Hero.ts](../core/src/games/mecard/sim/run/Hero.ts)) : un personnage du groupe, gardé d'un combat à l'autre.
- `Monster` ([core/src/games/mecard/sim/catalog/monsters.ts](../core/src/games/mecard/sim/catalog/monsters.ts)) : une sorte de monstre : cœurs, pioche, deck en boucle.
- `Kit` ([core/src/games/mecard/sim/catalog/kits.ts](../core/src/games/mecard/sim/catalog/kits.ts)) : cartes, objets, utilisables et cœurs de départ d'un aventurier.
- `UnitController` ([core/src/games/mecard/sim/ai/UnitController.ts](../core/src/games/mecard/sim/ai/UnitController.ts)) : un bot qui joue à sa façon.

# Sous-dossier associé : emplacement du code
- instance : [core/src/games/mecard/sim/battle/](../core/src/games/mecard/sim/battle/)
- personnage du groupe : [core/src/games/mecard/sim/run/](../core/src/games/mecard/sim/run/)
- catalogues : [core/src/games/mecard/sim/catalog/](../core/src/games/mecard/sim/catalog/) (`monsters.ts`, `pets.ts`, `kits.ts`)
- IA : [core/src/games/mecard/sim/ai/](../core/src/games/mecard/sim/ai/)

# Convention de nommage : individus de l'unité
- Constante : UPPER_SNAKE de l'anglais, par exemple `GOBLIN`, `LANCER_KIT`, `WOLF`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Gobelin".
- Fichier : un catalogue regroupe les individus (`monsters.ts`, `pets.ts`, `kits.ts`) ; les images sont dans `units/`.
- Deux monstres, kits ou familiers ne partagent pas de nom : vérifier avec `npm run cli -- list monsters`, `list kits` et `list pets`.

# Énumération : individus de l'unité
Monstres, kits et familiers sont trop nombreux pour un tableau : `npm run cli -- list monsters --desc`, `list kits --desc`, `list pets --desc`.
