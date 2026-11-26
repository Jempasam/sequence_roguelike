# Titre : Combat

# Description : le combat
Un combat est une place de la carte où le groupe affronte des unités jouées par le jeu. Chaque combat appartient à une catégorie qui dit ce que la carte en montre avant qu'on le livre : un combat ordinaire, une élite, une agression, une embuscade ou un boss. Ce que rapporte un combat gagné n'est pas à lui : c'est la halte posée après lui sur la même place.

# Exemple : le combat en jeu
- Patrouille de gobelins : combat, deux gobelins devant et un archer qui les couvre.
- Hôpital de campagne : élite, deux soigneurs gobelins qui remettent debout deux brutes.
- Brigands de la caverne : agression, un cogneur et un archer barrent la route.

# Mots clés associés : vocabulaire du combat
- `FIGHT` : "combat" : une place de la carte où l'on se bat.
- `MONSTER` : "monstre" : ce que le groupe affronte.
- `ADVENTURER` : "aventurier" : ce qu'affrontent les agressions et les embuscades.
- `FLOOR` : "étage" : le boss en garde les sorties.
- `REWARD` : "récompense" : ce qu'on choisit après la victoire.

# Classes associées : code du combat
- `FightType` ([core/src/games/mecard/sim/fight/FightType.ts](../core/src/games/mecard/sim/fight/FightType.ts)) : une sorte de combat : nom, catégorie, monstres, `create(run, place)`.
- `FightCategory` ([core/src/games/mecard/sim/fight/FightCategory.ts](../core/src/games/mecard/sim/fight/FightCategory.ts)) : ce que la carte dit d'un combat avant de le livrer.
- `Fight` ([core/src/games/mecard/sim/fight/Fight.ts](../core/src/games/mecard/sim/fight/Fight.ts)) : un combat en cours, avec `FightStage` pour y poser les monstres.
- `StandardFight` ([core/src/games/mecard/sim/fight/StandardFight.ts](../core/src/games/mecard/sim/fight/StandardFight.ts)) : le combat ordinaire.
- `KitFightType` ([core/src/games/mecard/sim/fight/KitFightType.ts](../core/src/games/mecard/sim/fight/KitFightType.ts)) : un combat contre des aventuriers faits d'un kit.
- `GhostFightType` ([core/src/games/mecard/sim/fight/GhostFightType.ts](../core/src/games/mecard/sim/fight/GhostFightType.ts)) : un combat contre le groupe d'une partie précédente.
- `FightContext` ([core/src/games/mecard/sim/fight/FightType.ts](../core/src/games/mecard/sim/fight/FightType.ts)) : ce que le tirage d'un combat sait de la partie.

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/fight/](../core/src/games/mecard/sim/fight/)
- combats de chaque étage : [core/src/games/mecard/sim/floor/fights/](../core/src/games/mecard/sim/floor/fights/)
- catalogue : [core/src/games/mecard/sim/catalog/fightTypes.ts](../core/src/games/mecard/sim/catalog/fightTypes.ts)

# Convention de nommage : individus du combat
- Constante : UPPER_SNAKE de l'anglais, par exemple `BATTLE` pour une catégorie.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Patrouille de gobelins".
- Fichier : `<étage>Fights.ts` en camelCase, regroupant les combats d'un étage ; les combats « dessinés » à la main sont décrits dans `designed.ts`.
- Un `id` unique nomme chaque combat dans une sauvegarde ou une commande. Vérifier les noms avec `npm run cli -- list fights`.

# Énumération : individus du combat
Catégories ; les combats eux-mêmes sont trop nombreux (`npm run cli -- list fights --desc`).

| Nom affiché | Constante | Rôle |
| --- | --- | --- |
| Agression | `AGGRESSION` | Des aventuriers attaquent, joués par la meilleure IA. |
| Boss | `BOSS` | Le gardien de l'étage ; le vaincre ouvre ses sorties. |
| Combat | `BATTLE` | Des monstres. |
| Élite | `ELITE` | Des monstres plus nombreux qu'en combat. |
| Embuscade | `AMBUSH` | Comme une agression, mais on ne voit que la main des aventuriers, pas leur chaîne. |
