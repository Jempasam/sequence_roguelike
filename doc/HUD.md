# Titre : Interface de combat

# Description : l'interface de combat
L'interface de combat est tout ce qui entoure l'arène pendant un combat : les cartes de la main, la chaîne en cours de composition, les decks, les cœurs et statuts des unités, les boutons de lecture et les bulles d'explication. Elle est faite de composants du moteur d'interface posés dans les zones d'une grille, chacune ayant sa place à chaque phase du combat (pioche, préparation, exécution, fin).

Elle ne décide de rien : elle lit le combat par un hôte (`HudHost`) et n'agit que par des actions (`HudActions`). Le sens des textes vient de la simulation ; icônes, surlignage et explications au survol sont de son ressort.

# Exemple : l'interface de combat en jeu
- Main : des cartes (`CardView`) en éventail, dont on tire celles qu'on met dans la chaîne.
- Chaîne : une rangée de cartes liées (`ChainStrip`), avec les liens dessinés dessous.
- Cœurs sur l'arène : des cœurs (`ArenaHearts`) suivent chaque unité à l'écran.
- Info-bulle : un survol de carte ou de mot affiche une bulle (`DetailTooltip`) qui l'explique.

# Classes associées : code de l'interface de combat
- `Hud` ([core/src/games/mecard/ui/battle/Hud.ts](../core/src/games/mecard/ui/battle/Hud.ts)) : l'ensemble, reconstruit depuis le jeu ; `HudHost` et `HudActions` en sont les deux interfaces.
- `battleGrid` ([core/src/games/mecard/ui/hud/BattleGrid.ts](../core/src/games/mecard/ui/hud/BattleGrid.ts)) : les zones de l'écran de combat.
- `CardView` ([core/src/games/mecard/ui/hud/CardView.ts](../core/src/games/mecard/ui/hud/CardView.ts)) : une carte dessinée, en main, en chaîne ou en miniature ; `CardFlight` la fait voler depuis la pioche.
- `ChainStrip` ([core/src/games/mecard/ui/hud/ChainStrip.ts](../core/src/games/mecard/ui/hud/ChainStrip.ts)) : une chaîne de cartes et les liens entre elles.
- `DeckView`, `DeckPile` ([core/src/games/mecard/ui/hud/DeckView.ts](../core/src/games/mecard/ui/hud/DeckView.ts)) : un deck offert, une pile de cartes.
- `HeartView`, `ArenaHearts` ([core/src/games/mecard/ui/hud/HeartView.ts](../core/src/games/mecard/ui/hud/HeartView.ts)) : un cœur et les cœurs sur l'arène.
- `StatusList`, `StatusProcessList` ([core/src/games/mecard/ui/hud/StatusList.ts](../core/src/games/mecard/ui/hud/StatusList.ts)) : les statuts et processus d'une unité.
- `BagView` ([core/src/games/mecard/ui/hud/BagView.ts](../core/src/games/mecard/ui/hud/BagView.ts)) : la ceinture d'objets et d'utilisables.
- `DetailTooltip`, `Detail` ([core/src/games/mecard/ui/hud/DetailTooltip.ts](../core/src/games/mecard/ui/hud/DetailTooltip.ts)) : les explications au survol.
- `PlayControl`, `PlayControlView` ([core/src/games/mecard/ui/hud/PlayControl.ts](../core/src/games/mecard/ui/hud/PlayControl.ts)) : la lecture d'un combat (pause, lent, normal, rapide).
- `QuitPopup` ([core/src/games/mecard/ui/hud/QuitPopup.ts](../core/src/games/mecard/ui/hud/QuitPopup.ts)) : la fenêtre qui demande si on retourne au menu.

# Sous-dossier associé : emplacement du code
- composants : [core/src/games/mecard/ui/hud/](../core/src/games/mecard/ui/hud/)
- assemblage : [core/src/games/mecard/ui/battle/](../core/src/games/mecard/ui/battle/)
- moteur d'interface : [core/src/engine/ui/](../core/src/engine/ui/), voir [ENGINE.md](ENGINE.md)

# Lien avec la simulation : ce que l'interface lui doit et lui apporte
- Elle lit la simulation par ses observables et son journal ([SIM.md](SIM.md)), jamais l'inverse : la simulation n'importe rien de l'interface et tourne sans elle (tests, ligne de commande).
- Elle n'a besoin de la simulation que pour savoir quoi montrer : ce qu'elle montre (cœurs, statuts, chaînes, texte des cartes) est un sens que la simulation envoie, elle seule en décide l'apparence.
- Elle apporte à la simulation les choix du joueur : poser une carte, retirer, changer de variante, activer un utilisable, lancer le round. Ce ne sont que des appels de `HudActions` ; la règle reste dans la simulation.
- Les animations se jouent sur la chaîne d'animation de l'écran, branchées sur les observables de la simulation, strictement l'une après l'autre ; la simulation n'attend jamais l'écran.

# Lien avec le réseau : ce que l'interface lui doit et lui apporte
- Elle ne sait pas si le combat est local ou répliqué : `HudHost.battle` est le combat de la simulation, qu'il vienne de l'hôte ou d'un `BattleReceiver` ([NETWORK.md](NETWORK.md)).
- Le réseau lui apporte ce qu'elle doit montrer chez un spectateur ou un invité : un combat à jour, et les droits que l'hôte a donnés. Ces droits arrivent comme `viewpoint` (l'équipe vue en entier), `isLocked` (unités qu'on ne planifie pas), `launchable` et `saysReady` (le bouton lance le round ou dit seulement « prêt »).
- Elle apporte au réseau le plan du joueur : les chaînes composées et le « prêt » sortent par `launch`, et c'est la couche réseau qui les emballe (`PlanMessage`) et les envoie à l'hôte.
- Elle doit tenir qu'un état reçu arrive d'un coup et se joue derrière, à son rythme : un spectateur peut avoir plusieurs rounds de retard et les rattraper.
