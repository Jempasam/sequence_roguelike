# Titre : Carte

# Description : la carte
Une carte est une fonction typée : elle reçoit ce que donne la carte à sa droite et donne à la carte à sa gauche (ou à la file d'exécution) une valeur de son type de sortie. Le joueur aligne des cartes en chaîne pendant la préparation, puis la chaîne est jouée. Une carte est une description partagée par tous ses exemplaires : elle ne porte aucun état.

Le type de sortie décide de ce que le jeu fait de la valeur : une action se joue, une préparation réécrit la chaîne en fin de préparation, un module, une bête ou un élément sont consommés par la carte qui les attend. Les fusions (collage, mélange, hasard) sont des cartes faites d'autres cartes.

# Exemple : Carte en jeu
- Avancer : avance de 2×agilité m, jusqu'au premier obstacle.
- Coup d'épée : frappe en arc devant, à 0,95×allonge m : 2+force dégâts physiques à chaque unité.
- Estoc : transperce tout sur 1,65×allonge m devant.
- Robot arc : carte module qui donne Viser puis Tir à un robot.

# Mots clés associés : vocabulaire de la carte
- `CARTE` : "carte" : l'objet de ce concept, nommé dans presque toutes les descriptions.
- `DECK` : "deck" : l'ensemble des cartes d'une unité, dans lequel on pioche.
- `COMPOSITE` : "fusion" : toute carte faite d'autres cartes.
- `FUSION` : "collage" : des cartes mises bout à bout, qui prennent la place d'une seule en fin de préparation.
- `MERGE` : "mélange" : deux cartes d'action jouées en même temps.
- `RANDOM` : "hasard" : deux cartes dont une seule est tirée en fin de préparation.
- `SUPPRESSION` : "suppression" : une carte retirée d'un deck pour de bon.
- `FORCE`, `PRECISION`, `AGILITE`, `PORTEE`, `ALLONGE` : "force", "précision", "agilité", "portée", "allonge" : les stats de l'unité que les chiffres d'une carte multiplient ou complètent.

# Classes associées : code de la carte
- `Card` ([core/src/games/mecard/sim/card/Card.ts](../core/src/games/mecard/sim/card/Card.ts)) : l'interface d'une carte (nom, description, rareté, types d'entrée et de sortie).
- `AbstractCard` ([core/src/games/mecard/sim/card/subs/AbstractCard.ts](../core/src/games/mecard/sim/card/subs/AbstractCard.ts)) : le socle commun des implémentations.
- `ActionCard` ([core/src/games/mecard/sim/card/subs/ActionCard.ts](../core/src/games/mecard/sim/card/subs/ActionCard.ts)) : une carte dont la valeur est une action jouée à l'exécution.
- `PrepCard` ([core/src/games/mecard/sim/card/subs/PrepCard.ts](../core/src/games/mecard/sim/card/subs/PrepCard.ts)) : une carte de préparation, qui agit sur la chaîne ou la bataille avant l'exécution.
- `ModifierCard` ([core/src/games/mecard/sim/card/subs/ModifierCard.ts](../core/src/games/mecard/sim/card/subs/ModifierCard.ts)) : une carte qui prend une action à sa droite et la modifie.
- `SecretCard` ([core/src/games/mecard/sim/card/subs/SecretCard.ts](../core/src/games/mecard/sim/card/subs/SecretCard.ts)) : la carte cachée, dont seule l'image est montrée.
- `CardType` ([core/src/games/mecard/sim/card/CardType.ts](../core/src/games/mecard/sim/card/CardType.ts)) : un type de valeur qui circule entre cartes (`ACTION`, `PREPARATION`, `ELEMENT`, `POTION`, `CARD`, `SECRET`, `MODULE`, `BEAST`).
- `CardChain` ([core/src/games/mecard/sim/card/CardChain.ts](../core/src/games/mecard/sim/card/CardChain.ts)) : la chaîne de cartes d'une unité, sa lecture, sa réécriture et sa résolution.
- `Reading` ([core/src/games/mecard/sim/card/Reading.ts](../core/src/games/mecard/sim/card/Reading.ts)) : la lecture d'une suite de cartes (qui prend quoi, quelle carte est jouable).
- `Rarity` ([core/src/games/mecard/sim/card/Rarity.ts](../core/src/games/mecard/sim/card/Rarity.ts)) : les quatre raretés (`COMMON`, `RARE`, `EPIC`, `LEGENDARY`), leur fréquence, leur prix et leur couleur.
- `RewriteContext`, `RewriteSpot` ([core/src/games/mecard/sim/card/Card.ts](../core/src/games/mecard/sim/card/Card.ts)) : ce que sait une carte qui réécrit la chaîne (hasard, voisines, deck).

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/card/](../core/src/games/mecard/sim/card/)
- sous-types : [core/src/games/mecard/sim/card/subs/](../core/src/games/mecard/sim/card/subs/), triés par famille (`attack/`, `movement/`, `combat/`, `summon/`, `status/`, `potion/`, `spell/`, `composite/`, `modifier/`, `chain/`, `beast/`, `mechanic/`, `chess/`...)
- catalogue : [core/src/games/mecard/sim/catalog/cards.ts](../core/src/games/mecard/sim/catalog/cards.ts)

# Convention de nommage : individus de la carte
- Constante : UPPER_SNAKE de l'anglais, par exemple `THRUST`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Estoc".
- Fichier : le nom de la classe en PascalCase (`Thrust.ts`) ou un regroupement en camelCase ou PascalCase pluriel (`Charges.ts`, `StatusCards.ts`).
- Deux cartes ne partagent pas le même nom affiché : vérifier avec `npm run cli -- list cards`, et lire le ton des descriptions avec `npm run cli -- list cards --desc`.

# Énumération : individus de la carte
Les cartes sont trop nombreuses pour un tableau : `npm run cli -- list cards --desc`.
