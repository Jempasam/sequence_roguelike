# Titre : Simulation

# Description : la simulation
La simulation est le cœur de Dungeon of the Mecard : toutes les règles du jeu (combats, cartes, objets, étages, haltes, partie) sans aucune entrée-sortie ni dessin. Elle est pure et à graine : mêmes unités, même graine et mêmes chaînes donnent toujours le même combat, et elle tourne sans interface ni réseau, dans les tests comme en ligne de commande (`npm run cli -- sim`).

Elle ne connaît ni l'interface ni le réseau. Elle dit ce qui se passe par des observables (signaux et événements du combat) et ne parle d'images que par des clés libres (`Visual`) qu'elle ne résout jamais. L'interface et le réseau se branchent sur elle ; elle n'importe rien d'eux.

# Exemple : la simulation en jeu
- Un combat : `Battle` joue un round entier d'un coup et écrit ce qui arrive dans son journal ; l'écran le rejoue ensuite à son rythme.
- Une sauvegarde : un combat s'écrit en JSON et se recharge à l'identique, ce qui permet à un spectateur de le refaire.
- La simulation en masse : la ligne de commande joue des milliers de combats pour mesurer l'équilibrage.

# Mots clés associés : vocabulaire de la simulation
- `BATTLE_ROUND` : "round" : une préparation, puis l'exécution de toutes les chaînes.
- `BATTLE_TURN` : "tour" : une étape d'une chaîne.
- `TRAVEL_STEP` : "étape" : une place de la carte d'un étage.
- `UNIT` : "unité" : un personnage dans un combat.
- `CARTE` : "carte" : ce que les unités jouent.

La simulation dit ce que les mots veulent dire, jamais comment ils s'affichent : icônes, surlignage et explications au survol sont à l'interface (voir [HUD.md](HUD.md)).

# Classes associées : code de la simulation
- `Battle` ([core/src/games/mecard/sim/battle/Battle.ts](../core/src/games/mecard/sim/battle/Battle.ts)) : le combat, ses phases (pioche, préparation, exécution, fin), son journal et ses signaux.
- `BattleSignals` ([core/src/games/mecard/sim/battle/signals.ts](../core/src/games/mecard/sim/battle/signals.ts)) : tout ce qu'un combat dit pendant qu'il se joue, un observable par sorte d'événement.
- `Observable` ([core/src/games/mecard/sim/base/Observable.ts](../core/src/games/mecard/sim/base/Observable.ts)) : le seul moyen dont la simulation parle au-dehors.
- `Visual` ([core/src/games/mecard/sim/base/Visual.ts](../core/src/games/mecard/sim/base/Visual.ts)) : une clé d'image libre, résolue par l'interface seulement.
- `Rng` ([core/src/games/mecard/sim/base/Rng.ts](../core/src/games/mecard/sim/base/Rng.ts)) : le hasard à graine.
- `Run` ([core/src/games/mecard/sim/run/Run.ts](../core/src/games/mecard/sim/run/Run.ts)) : la partie entière : groupe, or, voyage d'étage en étage.
- `Travel` ([core/src/games/mecard/sim/travel/Travel.ts](../core/src/games/mecard/sim/travel/Travel.ts)) : le voyage entre les combats.
- `GameMode` ([core/src/games/mecard/sim/mode/GameMode.ts](../core/src/games/mecard/sim/mode/GameMode.ts)) : un mode multijoueur, écrit sans réseau (voir [MODE.md](../core/src/games/mecard/sim/mode/MODE.md)).
- `Bot`, `LookaheadAi` ([core/src/games/mecard/sim/ai/](../core/src/games/mecard/sim/ai/)) : les IA qui planifient les chaînes.
- Sauvegardes ([core/src/games/mecard/sim/save/](../core/src/games/mecard/sim/save/)) : `battleSave`, `runSave`, `travelSave`, `historySave` écrivent et relisent l'état en JSON.

# Sous-dossier associé : emplacement du code
- simulation : [core/src/games/mecard/sim/](../core/src/games/mecard/sim/), un sous-dossier par concept : [card/](CARD.md), [item/](ITEM.md), [usable/](USABLE.md), [fight/](FIGHT.md), [floor/](FLOOR.md), [halt/](HALT.md), `battle/`, `heart/`, `status/`, `hazard/`, `potion/`, `element/`, `process/`, `run/`, `travel/`, `mode/`, `ai/`, `analysis/`, `catalog/`, `save/`
- tests : [test/src/games/mecard/sim/](../test/src/games/mecard/sim/), au même chemin que le code testé

# Ce que la simulation vaut pour l'interface
- Les observables du combat (`Battle.signals`, journal d'événements) sont la source de toute animation : l'écran s'y abonne et rejoue les événements l'un après l'autre à son rythme, sans jamais piloter la simulation. Voir [HUD.md](HUD.md).
- Les descriptions de cartes, objets et utilisables sont des textes sémantiques : l'interface choisit comment les montrer.
- Les images arrivent comme des `Visual` : l'interface les charge et tolère qu'un fichier manque.

# Ce que la simulation vaut pour le réseau
- Un combat ou une partie se sauvegarde et se recharge à l'identique : c'est ce que le propriétaire envoie, et chaque client le rejoue lui-même. Voir [NETWORK.md](NETWORK.md).
- Elle ne connaît ni joueur, ni humain, ni multi : le moteur de combat ou de partie ne sait pas qui le regarde. Le réseau n'est branché que par ses observables.
- Un mode de jeu (`GameMode`) ne partage que du JSON et des membres : il tourne pareil autour d'un réseau ou sur un seul client.
