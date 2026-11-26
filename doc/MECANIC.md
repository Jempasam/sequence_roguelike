# Titre : Mécanique

# Description : la mécanique
La mécanique regroupe les cartes qui construisent des machines : un module est une pièce qui porte une suite de cartes, un robot est un corps invoqué qui rejoue ces cartes à chaque round. Le module circule d'une carte à l'autre comme une valeur de type `MODULE` : un robot le consomme à sa droite, et des cartes modificatrices le transforment avant.

Un module donne aussi une fonction `tune` qui règle le corps construit, et peut tirer au hasard ce qu'il joue, au moment où il est lu.

# Exemple : Mécanique en jeu
- Robot arc : module qui joue Viser puis Tir.
- Robot improvisé : invoque à 0.65 m devant un robot à cœurs bouclier, qui joue les cartes du module juste après son invocateur, à chaque round.
- Turbo : module modificateur, chaque Avancer devient une Charge d'estoc.
- Huile de moteur : utilisable, ce round chaque robot joue sa chaîne deux fois de suite.

# Mots clés associés : vocabulaire de la mécanique
- `INVOCATION` : "invoquer" : amener une unité dans l'arène devant celle qui l'appelle.
- `SUMMON_STAT` : "invocation" : le bonus de cœurs des unités invoquées.
- `BATTLE_ROUND` : "round" : le robot joue ses cartes à chaque round.
- `CARTE` : "carte" : un module est fait de cartes.

# Classes associées : code de la mécanique
- `Module` ([core/src/games/mecard/sim/card/CardType.ts](../core/src/games/mecard/sim/card/CardType.ts)) : la valeur d'un module, `cards(pick)` et `tune(body)`.
- `MODULE` ([core/src/games/mecard/sim/card/CardType.ts](../core/src/games/mecard/sim/card/CardType.ts)) : le type de carte qui porte un module.
- `ModuleCard` ([core/src/games/mecard/sim/card/subs/mechanic/ModuleCard.ts](../core/src/games/mecard/sim/card/subs/mechanic/ModuleCard.ts)) : un module fait d'une suite fixe de cartes.
- `ModuleModifierCard` ([core/src/games/mecard/sim/card/subs/mechanic/ModuleModifiers.ts](../core/src/games/mecard/sim/card/subs/mechanic/ModuleModifiers.ts)) : une carte qui prend un module et en rend un autre.
- `RobotCard` ([core/src/games/mecard/sim/card/subs/mechanic/RobotCard.ts](../core/src/games/mecard/sim/card/subs/mechanic/RobotCard.ts)) : une carte qui construit un robot à partir d'un module.
- `PawnRobot` ([core/src/games/mecard/sim/card/subs/chess/PawnRobot.ts](../core/src/games/mecard/sim/card/subs/chess/PawnRobot.ts)) : le robot pion, qui est aussi une pièce d'échecs.

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/card/subs/mechanic/](../core/src/games/mecard/sim/card/subs/mechanic/)
- carte : [core/src/games/mecard/sim/card/](../core/src/games/mecard/sim/card/), voir [CARD.md](CARD.md)

# Convention de nommage : individus de la mécanique
- Constante : UPPER_SNAKE de l'anglais, par exemple `BOW_MODULE`, `IMPROVISED_ROBOT`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Robot arc".
- Fichier : `ModuleCard.ts`, `ModuleModifiers.ts`, `RobotCard.ts`, un par classe ou famille.
- Les noms de cartes sont uniques : vérifier avec `npm run cli -- list cards`. `npm run cli -- convert monster:<nom> module` fabrique un module depuis une unité.

# Énumération : individus de la mécanique
| Nom affiché | Constante | Rôle |
| --- | --- | --- |
| Robot arc | `BOW_MODULE` | Module : Viser > Tir. |
| Robot explosif | `BLAST_MODULE` | Module : Viser > Bombe. |
| Robot taureau | `BULL_MODULE` | Module : Viser > Dash dégât. |
| Missile | `MISSILE` | Module : Avancer > Estoc > Avancer > Estoc. |
| Arme improvisée | `IMPROVISED_WEAPON` | Fin de préparation : se remplace par les cartes de son module. |
| Robot improvisé | `IMPROVISED_ROBOT` | Invoque un robot à cœurs bouclier qui joue le module. |
| Robot tank | `TANK_ROBOT` | Invoque un robot à 4 cœurs bouclier, qui attend entre chaque carte. |
| Blindage | `ARMOR_PLATING` | Module : ajoute Blocage en fin de module, et 1 cœur bouclier au robot. |
| Cœur de module | `MODULE_CORE` | Module : ajoute Blocage en tête. |
| Inverseur | `INVERTER` | Module : inverse l'ordre des cartes. |
| Mélangeur | `MODULE_MIXER` | Module : mélange l'ordre des cartes au hasard. |
| Propulseurs | `THRUSTERS` | Module : ajoute Avancer en tête. |
| Recyclage | `RECYCLING` | Module : retire la première carte. |
| Répétiteur | `REPEATER` | Module : duplique la dernière carte. |
| Tête chercheuse | `HOMING_HEAD` | Module : ajoute Viser avant chaque attaque. |
| Turbo | `TURBO` | Module : chaque Avancer devient une Charge d'estoc. |
