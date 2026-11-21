# Mode de jeu : l'API, sans réseau

Un mode de jeu multijoueur s'écrit avec ce dossier seul : aucun import de `sync/`, de `platform` ni de `Sync*`. Le même mode tourne autour d'un réseau ([GAME_MODE.md](../../sync/mode/GAME_MODE.md)) ou sur un seul client, sans réseau ([local/](local)).

## Les pièces

| Pièce | Rôle |
|---|---|
| `GameMode` | la définition que le lobby propose : `id`, `title`, `description`, `settings`, `participantSettings?`, et deux fabriques : `manager(values)` et `owner(values, manager)` |
| `GameModeManager` | le **gestionnaire** : il décide, ne tient jamais de moteur. `run(ctx)`, `onJoin`, `onQuit`, `onLost`, `onBack`, `onMessage`, `onAsk` |
| `GameModeOwner` | le **côté client** : il fabrique les moteurs (`createRun`, `createBattle`), les montre (`spectateRun`, `spectateBattle`) et entend le gestionnaire (`onState`, `onOrder`, `onAsk`) |
| `GameModeContext` | tout ce que le gestionnaire demande à l'infrastructure : membres, instances, état publié, canaux, temps, hasard |
| `GameModeShareable` | tout ce qui traverse l'API : du JSON, plus des `GameMember` |
| `HandleChannel` | `notify(msg)` et `ask(msg, timeoutMs?)` vers l'autre bout |

Un mode ne parle jamais d'un objet de l'autre côté : il envoie des valeurs partageables et reçoit les réponses.

## Ce qui traverse l'API : `GameModeShareable`

`null`, booléen, nombre fini, texte, tableau, objet de partageables, ou `GameMember`. Ni `Map`, `Set`, `Date`, `undefined`, `NaN`, cycle, fonction ni instance de classe. Un membre est envoyé sous son id et redevenu le membre de cet id à l'arrivée ; s'il est parti entre-temps on le rend quand même (il n'est plus dans `members()`). Le `LocalManager` fait passer **chaque** valeur par le même aller-retour que le réseau : un mode ne peut rien partager d'autre.

## Les instances (run, combat)

`ctx.openRun(owner, spec)` et `ctx.openBattle(owner, spec)` rendent un `InstanceHandle` : le propriétaire est **un membre**, jamais le gestionnaire. Le gestionnaire montre ou donne la main avec `spectate(who)`, `spectateAll()`, `control(who, info)`, `play(who, units, info?)`, retire avec `uncontrol`, `release`, `close`, et parle au propriétaire par `notify`/`ask`. Ce que le propriétaire lui dit arrive sur `said`.

Côté client, `createRun`/`createBattle` ne sont appelés **que chez le propriétaire** : ils font le vrai moteur et rendent le canal qui reçoit ce qu'on dit sur l'instance (`Heard` : qui parle, ce que le gestionnaire lui a donné avec `control`, et le message). Les autres clients tiennent une réplique que l'infrastructure construit seule depuis le même `spec` (un combat est chargé depuis sa sauvegarde, une run démarre nue depuis `spec.seed`), puis qui se met à jour par le flux du propriétaire. `spectateRun`/`spectateBattle` reçoivent une `InstanceView` (`engine`, `own`, `me`, `info`, `units`, et `say`/`ready` seulement si la main est donnée). Ils peuvent être **rappelés** pour la même instance quand `info` ou `units` changent (mise à jour) ; le `dispose` du dernier résultat n'est appelé qu'une fois, quand l'instance disparaît pour ce client.

## État publié et messagerie

Pas de store. `ctx.publish(key, value)`, `publishLazy(key, supplier)` et `unpublish(key)` publient un état **sans propriétaire** pour tous les clients : le dernier état de chaque clé est rejoué à qui arrive ou revient, et arrive chez le client par `onState` (`null` = retiré). `ctx.channel(member)` (et `ctx.broadcast`) dit quelque chose à un client (`onOrder`) ou lui demande (`onAsk`, avec délai possible). Dans l'autre sens, `GameModeOwner` reçoit en `owner(values, manager)` un `HandleChannel` vers le gestionnaire (`onMessage`, `onAsk`).

Un état est *level-triggered* (idempotent, rejoué), un ordre *edge-triggered* : aucun ordre n'est garanti entre un `publish` et un `notify`, donc un client ne suppose jamais « l'état est arrivé avant l'ordre ».

## Garanties (tenues par l'infrastructure, jamais par chaque mode)

1. **Séquençage** : `onJoin` une fois par join (les arrivés avant `run` compris, `joined` ensuite) ; `onQuit` une fois, et seulement après un `onJoin` accepté. Un mode n'initialise pas par `members()` mais dans `onJoin`, et tient sa propre `Map<id, …>` s'il veut se souvenir de quelqu'un.
2. **Déconnexion** : `onLost`/`onBack` sont une déconnexion que l'implémentation sait rattraper ; un mode peut les ignorer. Un départ est `onQuit`, qui invalide seul les instances du membre.
3. **Instances** : les unités d'un joueur qui se perd, revient ou part sont jouées par des bots puis rendues sans que le mode s'en mêle : le propriétaire de l'instance reçoit `{lost: id}`, `{back: id}` ou `{left: id}` pour un membre à qui le gestionnaire a donné la main. Si le propriétaire part, l'instance est invalidée (`invalidated`).
4. **Livraison** : un `notify` ou un `ask` n'est pas perdu en silence. Vers un membre qui a quitté, `notify` rend `false` et `ask` un `NoAnswerFault` de cause `quit` ; un délai dépassé donne la cause `timeout` ; sinon `unreachable`.
5. **Hors périmètre** : les rôles de la participation (`Placement`, spectateurs) restent dans `sync/session` ; regarder, c'est `spectate` sur le handle d'une instance.

## Des aides pour décider une seule fois

- `Settle<T>` : une décision à usage unique (`settle(v)` rend `false` si elle est déjà prise) pour un résultat de match, la fin d'une partie, un tour qui commence. Quand deux sources se rencontrent (`over` et `quit`, `expired` et `allArrived`), la première gagne.
- `Epoch` : un jeton qui avance à chaque tour ou match ; un rappel prend `epoch.current` à l'enregistrement et vérifie `epoch.is(token)` en s'exécutant.
- `lastOne(ctx, isPlaying, ending)` : à appeler depuis `onQuit` ; s'il ne reste qu'un joueur, il gagne, c'est dit une fois (avec le même `Settle` que la fin normale) et la partie se termine. Le Tournoi et le Maître du donjon l'utilisent ; la course a déjà son `lastStanding`.
- `Replayed<T>` : un observable qui dit sa dernière valeur à qui vient après.

## Les modes ([subs](subs))

Un dossier par mode, avec son gestionnaire et son côté client :

| Mode | Dossier | Notes |
|---|---|---|
| Duel aléatoire | `randomDuel/` | `RandomDuelManager`, `RandomDuelOwner` |
| Tournoi | `tournament/` | `TournamentManager`, `TournamentOwner`, `Bracket` ; une phase d'équipes (`TeamPhase` / `TeamPhaseClient`) |
| Draft, Sabotage | `draft/`, `sabotage/` | des phases du tournoi (`KitDraft`, `Saboteurs`) et leurs clients ; les questions passent par `Picker` (`ask`) |
| Maître du donjon | `dungeonMaster/` | `DungeonMasterManager`, `DungeonMasterOwner` |
| Run en table | `runTable/` | `RunTableManager`, `RunTableOwner`, `TableOwner` |
| Course de duels, Versus | `duelRace/` | `DuelRaceManager`, `DuelRaceOwner`, `DuelRound`, `LifeBook`, `ArrivalWatch`… |
| Constructeur de monstres | `monsterBuilder/` | `MonsterBuilderManager`, `MonsterBuilderOwner` (étend `DuelRaceOwner`), `DuelConversion`, `NecroSetup` — voir ci-dessous |
| (communs) | `duel/`, `choose/` | `DuelStage` (côté gestionnaire), `DuelClient` et `DuelOwner` (côté client), `Picker`/`PickerClient` |

### Constructeur de monstres

Réglages : `heros` (les X premiers arrivés, les autres sont nécromanciens), `vies` (des héros), `etages` (le premier héros qui franchit ce nombre d'étages gagne). Chacun joue un run à lui (`openRun(membre, { role })`).

- **Héros** : run normal. `DuelConversion` remplace chaque combat de la carte (étage courant et suivants) par une `DUEL_HALT` ; la halte de récompense du combat est gardée et payée (`DuelHalt.win`) quand le héros gagne son duel. Un duel perdu coûte une vie (`LifeBook`, héros seulement).
- **Nécromancien** : `NECRO_FLOOR` (`floor/subs/NecroFloor.ts`, étages sans fin via `FloorType.leadsTo`), groupe vide (`setUpNecro`), haltes de monstres (`NECRO_RECRUIT_HALT`) et d'ordre de deck (`CONDUCTOR_HALT`, `PROMPTER_HALT`), rangées de duels posées par `DuelLayers`. Vie infinie : il n'est pas dans le `LifeBook`. Les duels n'ont pas de minuterie.
- **Duel** : le manager réagit à la progression (`atDuel`). Dès qu'un héros et au moins un nécromancien attendent à une halte duel, un nécromancien est tiré au hasard et affronte le héros (un `DuelRound` par paire, le héros propriétaire du combat). Les autres nécromanciens qui attendent (et les héros éliminés) le regardent ; ensuite les deux combattants repartent (`ORDER_RESUME`).

## Jouer sans réseau : [local/](local)

`LocalGame` (`LocalManager`) fait tourner le gestionnaire et le côté client d'un mode sur le même client : `addMember`, `quit`, `lose`, `back`, `start`. Tout ce qui passe entre eux passe par le même aller-retour JSON et est livré plus tard, un à la fois, dans l'ordre d'envoi (comme par un réseau). Un moteur est fait une fois, par le client du propriétaire, et partagé : il n'y a pas de réplique.

Vérification : `grep -rn "sync/\|platform\|Sync" core/src/games/mecard/sim/mode/*.ts core/src/games/mecard/sim/mode/local` ne rend que des commentaires.
