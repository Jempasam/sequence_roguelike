# Titre : Mécanique

# Description : la mécanique
Une mécanique est une règle de combat partagée par les cartes : une façon de se déplacer, de pousser, d'apparaître ou de se faire échanger. Chaque mécanique regroupe ses règles (agir et calculer), son mot clé, ses aperçus et les signaux qu'elle émet. Les cartes ne refont jamais ces règles : elles appellent la mécanique.

`relocation/` est le socle commun des déplacements : tout changement de pose est raconté par son signal précis (`WALKED`, `SHOVED`...), puis par `RELOCATED`.

# Exemple : Mécaniques en jeu
- Avancer : l'unité fait un pas après l'autre, jusqu'à ce que quelque chose la bloque, et signale la butée.
- Poussée violente : la poussée continue, ce qu'elle jette sur une unité blesse les deux et pousse l'autre à son tour.
- Téléportation : l'unité apparaît au point visé ou juste à côté, c'est le seul déplacement qui peut échouer.
- Invoquer : une unité entre dans l'arène devant celle qui l'appelle.

# Mots clés associés : vocabulaire des mécaniques
- `WALK` : "avancer" : aller pas à pas dans une direction, jusqu'à ce que quelque chose gêne.
- `TURN` : "pivoter" : changer la direction où regarde une unité.
- `VIOLENT_PUSH` : "poussée violente" : une poussée qui continue sur ce qu'elle heurte.
- `BLINKING` : "clignement" : aller droit à un point par-dessus tout, un peu à côté s'il est pris.
- `LEAPING` : "saut" : bondir par-dessus tout, rejeté de côté si l'on retombe sans place.
- `SWAPPING` : "échange de place" : deux unités prennent la place l'une de l'autre.
- `TELEPORT` : "téléportation" : apparaître en un point, ou tout à côté.
- `INVOCATION` : "invoquer" : amener une unité dans l'arène devant celle qui l'appelle.

# Classes associées : code des mécaniques
- `Trip`, `travel`, `move` ([core/src/games/mecard/sim/battle/mecanic/walk/walk.ts](../core/src/games/mecard/sim/battle/mecanic/walk/walk.ts)) : le trajet d'une marche, et son calcul pas à pas.
- `turn`, `Turning` ([core/src/games/mecard/sim/battle/mecanic/turn/turn.ts](../core/src/games/mecard/sim/battle/mecanic/turn/turn.ts)) : le pivotement d'une unité.
- `shove`, `Shove` ([core/src/games/mecard/sim/battle/mecanic/push/shove.ts](../core/src/games/mecard/sim/battle/mecanic/push/shove.ts)) : la poussée simple.
- `shoveViolently`, `ViolentShove` ([core/src/games/mecard/sim/battle/mecanic/push/violent.ts](../core/src/games/mecard/sim/battle/mecanic/push/violent.ts)) : la poussée qui se propage.
- `blink` ([core/src/games/mecard/sim/battle/mecanic/blink/blink.ts](../core/src/games/mecard/sim/battle/mecanic/blink/blink.ts)) : le clignement.
- `leap` ([core/src/games/mecard/sim/battle/mecanic/leap/leap.ts](../core/src/games/mecard/sim/battle/mecanic/leap/leap.ts)) : le saut.
- `swap` ([core/src/games/mecard/sim/battle/mecanic/swap/swap.ts](../core/src/games/mecard/sim/battle/mecanic/swap/swap.ts)) : l'échange de place.
- `teleport` ([core/src/games/mecard/sim/battle/mecanic/teleport/teleport.ts](../core/src/games/mecard/sim/battle/mecanic/teleport/teleport.ts)) : la téléportation.
- `summon`, `Summon` ([core/src/games/mecard/sim/battle/mecanic/summon/summon.ts](../core/src/games/mecard/sim/battle/mecanic/summon/summon.ts)) : l'invocation.
- `relocate`, `glide` ([core/src/games/mecard/sim/battle/mecanic/relocation/relocate.ts](../core/src/games/mecard/sim/battle/mecanic/relocation/relocate.ts)) : le socle des changements de pose.
- `JumpSignal`, `GlideSignal`, `RELOCATED` ([core/src/games/mecard/sim/battle/mecanic/relocation/signals.ts](../core/src/games/mecard/sim/battle/mecanic/relocation/signals.ts)) : les signaux communs, un saut instantané, un glissement avec durée, et le bilan de tout déplacement.
- `SignalKey`, `TriggerKey` ([core/src/games/mecard/sim/battle/ObserverMap.ts](../core/src/games/mecard/sim/battle/ObserverMap.ts)) : les clés d'observers des fichiers `signals.ts`, lues par `battle.observers.of(CLE)` ou `unit.observers.of(CLE)`.

# Sous-dossier associé : emplacement du code
- mécaniques : [core/src/games/mecard/sim/battle/mecanic/](../core/src/games/mecard/sim/battle/mecanic/)
- cartes qui les jouent : [core/src/games/mecard/sim/card/](../core/src/games/mecard/sim/card/), voir [CARD.md](CARD.md)

# Convention de nommage : individus des mécaniques
- Un dossier par mécanique, en camelCase, par exemple `walk/`, `teleport/`.
- Fichiers : `index.ts`, `keyword.ts` (son mot clé, n'importe que `semantic`), `<nom>.ts` (ses règles), `shown.ts` (ses aperçus), `signals.ts` (ses clés d'observers).
- Mot clé : UPPER_SNAKE de l'anglais, texte français en minuscules, par exemple `WALK` "avancer".
- Les règles s'importent par espace de noms (`import * as Walk from ".../mecanic/walk"`), les descriptions importent le mot clé depuis `keyword.ts`.
- Un texte nomme le mot clé de la règle réellement jouée, en effet comme en condition.

# Énumération : individus des mécaniques
| Nom affiché | Constante | Rôle |
| --- | --- | --- |
| Avancer | `WALK` | Marche pas à pas jusqu'à un obstacle (`walk/`). |
| Pivoter | `TURN` | Change la direction d'une unité (`turn/`). |
| Poussée violente | `VIOLENT_PUSH` | Poussée qui blesse et se propage (`push/`). |
| Clignement | `BLINKING` | Va à un point par-dessus tout (`blink/`). |
| Saut | `LEAPING` | Bondit par-dessus tout, rejeté si pas de place (`leap/`). |
| Échange de place | `SWAPPING` | Deux unités s'échangent (`swap/`). |
| Téléportation | `TELEPORT` | Apparaît au point visé ou à côté, peut échouer (`teleport/`). |
| Invoquer | `INVOCATION` | Amène une unité devant l'invocateur (`summon/`). |
| Déplacement | aucune | Socle commun, sans mot clé : pose, glissement, `RELOCATED` (`relocation/`). |
