# Titre : Halte

# Description : la halte
Une halte est une place de la carte où le groupe s'arrête pour choisir, acheter ou changer quelque chose : un coffre, une forge, une taverne, un hôpital. Elle dit ce qu'elle demande et ce qui en résulte par son contexte de halte, sans rien tirer elle-même ; son apparence est une donnée, de sorte qu'elle tourne sans interface.

Un personnage tient la halte et parle dans une bulle. Une halte quittée sans avoir rien changé peut être visitée de nouveau, telle quelle.

# Exemple : la halte en jeu
- Forge : améliore une carte du deck.
- Magasin : vend des cartes, des utilisables et un objet contre de l'or, et permet de retirer une carte.
- Hôpital : soigne le groupe.
- Récompense de combat : ce que le groupe choisit après avoir gagné un combat.

# Mots clés associés : vocabulaire de la halte
- `HALT` : "halte" : une place où le groupe s'arrête.
- `GOLD` : "or" : ce qu'on dépense dans les haltes.
- `CARTE` : "carte" : la plupart des haltes en donnent, en changent ou en retirent.
- `DECK` : "deck" : ce que les haltes de deck modifient.
- `ITEM` : "objet" : ce que donnent certaines haltes.
- `USABLE` : "utilisable" : ce que vendent ou donnent certaines haltes.
- `SUPPRESSION` : "suppression" : le retrait définitif d'une carte.
- `UNIT` : "unité" : ce que les haltes de monstres recrutent ou changent.
- `REWARD` : "récompense" : ce qu'on choisit après un combat gagné.

# Classes associées : code de la halte
- `Halt` ([core/src/games/mecard/sim/halt/Halt.ts](../core/src/games/mecard/sim/halt/Halt.ts)) : une halte en cours, avec `start` et `stop`.
- `HaltType` ([core/src/games/mecard/sim/halt/HaltType.ts](../core/src/games/mecard/sim/halt/HaltType.ts)) : une sorte de halte : icône et `create(run)`.
- `AbstractHalt` ([core/src/games/mecard/sim/halt/subs/AbstractHalt.ts](../core/src/games/mecard/sim/halt/subs/AbstractHalt.ts)) : le socle des haltes.
- `HaltContext` ([core/src/games/mecard/sim/halt/HaltContext.ts](../core/src/games/mecard/sim/halt/HaltContext.ts)) : ce qu'une halte demande au joueur (dialogues, choix de cartes).
- `SceneLook` ([core/src/games/mecard/sim/halt/SceneLook.ts](../core/src/games/mecard/sim/halt/SceneLook.ts)) : le décor et le personnage de la halte, en données.
- `PlaceType` ([core/src/games/mecard/sim/run/PlaceType.ts](../core/src/games/mecard/sim/run/PlaceType.ts)) : ce que partagent les sortes de halte et de combat.

# Sous-dossier associé : emplacement du code
- type : [core/src/games/mecard/sim/halt/](../core/src/games/mecard/sim/halt/)
- sous-types : [core/src/games/mecard/sim/halt/subs/](../core/src/games/mecard/sim/halt/subs/), triés en `deck/`, `gift/`, `great/`, `master/`, `dark/`, `monster/`, `necro/`, `party/`, `reward/`, `duel/`
- catalogue : [core/src/games/mecard/sim/catalog/halts.ts](../core/src/games/mecard/sim/catalog/halts.ts)

# Convention de nommage : individus de la halte
- Constante : UPPER_SNAKE de l'anglais suivi de `_HALT`, par exemple `FORGE_HALT`.
- Nom affiché : français, majuscule initiale, sans article, par exemple "Forge".
- Fichier : `<Nom>Halt.ts` en PascalCase, dans le dossier de sa famille.
- Identifiant : un `id` unique (`forge`, `greatForge`...) qui nomme la halte dans une sauvegarde ; `haltById` lève une erreur s'il est inconnu.

# Énumération : individus de la halte
Une trentaine de haltes simples, plus leurs variantes. Familles (fonctions de `catalog/halts.ts`) :

| Famille | Constante | Rôle |
| --- | --- | --- |
| Simples | `simpleHalts()` | Hôpital, Magasin, Coffre, Oubli, Autel sacrificiel, Forge, Boucher, Enchanteur, Alchimiste, Marchand ambulant, Sorcière, Inventeur, Taverne, Dresseur, Démon, Antiquaire, Magicien, Docteur Fou, Tisserand, Stratège, Nécromancien. |
| Maîtres | `masterHalts()` | Variantes qui fusionnent leur don avec des améliorations : Maître dresseur, magicien, inventeur, Coffre de maître. |
| Grandes | `greatHalts()` | Variantes qui travaillent plus loin : Grand forgeron, grand magasin, grand hôpital, sorcière, marchand ambulant, magicien, coffre. |
| Sombres | `darkHalts()` | Variantes qui travaillent avec les monstres : Archidémon, Chirurgien des monstres, Taverne mal famée, Dompteur, Mage, Mécanicien, Shaman. |
| Récompenses | `rewardHalts()` | Posées après un combat : Récompense de combat, d'élite, de boss, Butin des monstres. |
| Modes | `modeHalts()` | Posées par un mode de jeu seulement : Duel, Parc à monstres, Antre des monstres, Chef d'orchestre, Souffleur. |
| Sortie | `EXIT_HALT` | La sortie de l'étage. |
