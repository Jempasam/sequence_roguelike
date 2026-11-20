# GameMode : décrire un mode multi sans code réseau

Un mode de jeu multijoueur s'écrit en implémentant `GameMode` ([GameMode.ts](GameMode.ts)) : aucune ligne de réseau. Un *runner*
([GameModeHost.ts](GameModeHost.ts), [GameModeGuest.ts](GameModeGuest.ts)) assemble derrière cette API les briques qui existaient
déjà (`GameSession`, `Participation`, `Run/BattleBroadcaster`, `Run/BattleReceiver`…), qui gardent leurs tests.
`gameModeAsLobbyMode(def, bench)` ([gameModeAsLobbyMode.ts](gameModeAsLobbyMode.ts)) le branche sur le lobby, inchangé.

## Principes

1. **Une instance = un `Run`** (travel et battles compris) **ou un `Battle` seul**. Elle a **un propriétaire** qui fait autorité :
   un participant, ou le gestionnaire. Les autres reçoivent une réplique (`spectate`) et, avec le contrôle (`control`), envoient
   des intentions que le propriétaire résout (`onRunIntent`, `onBattleIntent`).
2. **Le gestionnaire est maître de tout** : il ouvre, ferme, fait suivre, donne et retire le contrôle. Un client ne se retire
   jamais seul : il le demande avec `tellManager`, et le mode décide.
3. **Gestionnaire et joueur ne se connaissent pas.** Un même client est les deux, sans que le code du mode le sache : il y a
   **un objet `GameMode` par rôle** (`GameModeDef.create`, appelé pour chacun). Le runner court-circuite en interne
   (même engine, pas de deuxième copie : `LocalSeat`).
4. **Événements ≠ états.** `order` est un événement sans mémoire. `publish` est un état nommé dont le runner garde la dernière
   valeur, rejouée à qui arrive ou revient ; `publish(key, supplier)` est évalué à chaque envoi (une durée restante).

## Les pièces

| Pièce | Rôle |
|---|---|
| `Audience` | `SyncSender` vers les participants qui suivent *une* instance : `add` rejoue les premiers messages (`onPeer`) à celui-là seul |
| `GameModeHost` | gestionnaire sur `HostStage` : session, instances, états publiés, ordres, minuteries ; implémente `GameModeContext` |
| `HostInstance` | une par `openRun/openBattle` : moteur du gestionnaire (le sien, ou réplique après `watch`), propriétaire, suiveurs, contrôleurs |
| `GameModeGuest` | joueur : instances reçues (`GuestInstance`), états reçus, `Me` ; même code partout |
| `Seat` | ce que le joueur demande à « l'autre côté » : `RemoteSeat` (topics du lien) ou `LocalSeat` (appels directs) |

## Protocole (un topic = un type d'événement)

| Topic | Sens | Contenu | Rejoué |
|---|---|---|---|
| `participate` / `participation` | existant | rejoindre/quitter ; rôle et siège | oui |
| `open-run`, `open-battle` | gestionnaire → p | `{id, spec, own, info}` ; rappelé avec une autre `info` | oui, pour chaque instance suivie ou possédée |
| `close` | gestionnaire → p | `{id}` | non |
| `follow` / `unfollow` | gestionnaire → propriétaire client | `{id}` : diffuser / arrêter | oui |
| `i<N>` | instance → audience | messages des `Broadcaster` (`run:`, `travel:`, `battle:`) | oui (`onPeer`) |
| `u<N>` | propriétaire client → gestionnaire | idem, reçu par un `Receiver` | greeté sur `follow` |
| `intent` | contrôleur → gestionnaire | `{id, intent}` | non |
| `route` | gestionnaire → propriétaire client | `{id, from, name, info, intent}` | non |
| `order` | gestionnaire → p | `{order}` | non |
| `state` | gestionnaire → p | `{key, value}`, `value: null` = retiré | oui, dernière valeur par clé |
| `tell` | p → gestionnaire | `{message}` | non |

### Flux

- **`openRun(owner, spec)`** : le propriétaire est le gestionnaire → il crée par `createRun(spec)`, un `RunBroadcaster` écrit
  sur l'`Audience`. Le propriétaire est un client → `open{own:true}` lui est envoyé, il crée de son côté et ne diffuse rien
  tant que personne ne suit.
- **`spectate(who)`** : `open{own:false}` à `who` (réplique = `createRun(spec)` + `RunReceiver` sur `i<N>`), puis
  `audience.add(who)` rejoue l'état courant. Si le propriétaire est un client, le gestionnaire crée sa propre réplique,
  reçoit `u<N>` (`follow` envoyé) et la rediffuse : `Receiver → Broadcaster`.
- **`control(who, info)`** : `spectate` + `info` mémorisée. Une intention arrive sur `intent` ; propriétaire gestionnaire →
  `onXxxIntent(who, info, moteur, intention)` ; propriétaire client → routée sur `route` avec `info`. Un refus rejoue la
  réplique du contrôleur (resynchro), jamais d'exception.
- **`close()`** : `close` à tous, `valid()` passe à `false`, `invalidated` est émis une fois.
- **Un participant s'en va** : perdu ou parti (`gone = false`), il garde ses instances ; parti pour de bon (`gone = true`),
  celles qu'il possède sont invalidées. Un participant qui revient reçoit ses `open`, ses flux et ses `state`.
- **Au rejoint** : un participant est « prêt » quand la session l'a admis (son client écoute alors) : les suivis demandés avant
  (`onJoin`) lui sont envoyés à ce moment.

## Ce qui est fait, et ce qui diffère du plan

- **Modes portés** : « duel aléatoire » ([RandomDuelMode.ts](../lobby/modes/RandomDuelMode.ts)), run coop et ennemi
  ([RunTableMode.ts](../lobby/modes/RunTableMode.ts)), course de duels et versus
  ([DuelRaceTableMode.ts](../lobby/modes/DuelRaceTableMode.ts)). Les anciens assembleurs (`RunMode`, `DuelRaceMode`,
  `DuelRaceHost`, `DuelRaceGuest`, `LocalLink`, `RemoteHub`, `RemotePlayer`, `Players`, `Versus*`) sont supprimés.
  `RunHost` et `RunGuest` restent : la commande `host` de la console et `MecardViewer` s'en servent encore.
- **Noms** : `GameMember` (le `Member` de `Gathering` existe déjà), `InstanceHandle` (`Handle` existe dans `faults`),
  `openManagedRun` et `openManagedBattle` pour une instance dont le gestionnaire est propriétaire.
- **Réutiliser une brique qui parle à un `SyncSender`** : [stateBridge.ts](stateBridge.ts). `StatePublisher` publie ses
  messages comme des états (`LifeBook` et `Deadline` servent tels quels) ; `StateSource` rend les états reçus à une
  brique qui écoute (`LivesReceiver`, `DeadlineReceiver`).
- **Les briques qui suivent une salle** (`DuelRound`) reçoivent une `EventRoom` que le mode renseigne à la main, et
  `DuelRound` ouvre ses batailles par un `DuelBattles` : le mode les ouvre avec `openManagedBattle`.
- **Le joueur d'une course** reste un `DuelRacePlayer` : son `HubPort` est un [ModeHub](../modes/players/ModeHub.ts)
  alimenté par `onOrder`, `onState` et `onShowBattle`.
- **Le propriétaire d'une table** (run coop et ennemi) est le premier membre admis, c'est-à-dire le client du
  gestionnaire : il joue ce que les autres ne jouent pas et lance les rondes (`order`), les autres clients disent leurs
  plans par l'intention de leur run.
- **Un client qui arrive en retard** n'a plus de rôle fixé par le lobby : il demande à rejoindre comme les autres et le
  mode décide (`onJoin`). `LobbyGuest` donne donc toujours le lien.
- Un refus d'intention est rejoué (resynchro) quand le propriétaire est le gestionnaire ; pour un propriétaire client,
  il n'y a pas de retour.

- **Réglages par participant** : `GameModeDef.participantSettings` (des `ChoiceSetting`) déclare ce que chaque client règle pour
  lui-même, dans la barre sous la zone de connexion du lobby ([ParticipantSettingsBar](../../ui/lobby/ParticipantSettingsBar.ts)).
  Les valeurs partent avec le `join` du message `participate` (`options`), sont vérifiées par le gestionnaire (initiales si
  invalides) et lues par le mode dans `onJoin(ctx, who)` via `who.options`. Verrouillés une fois dans la partie ; un client qui
  arrive en retard à un mode qui en a attend son clic sur « Rejoindre la partie ». Premier usage : « Run mixte »
  ([RunTableMode.ts](../lobby/modes/RunTableMode.ts)), réglage `camp` (allié / ennemi), sièges par `mixedSeats`.

## Écrire un mode

```ts
class DuelAleatoire implements GameMode {
    async run(ctx: GameModeContext) { /* séquençage principal */ }
    createRun(spec: unknown) { ... }
    createBattle(spec: unknown) { ... }
    onShowBattle(me: Me, battle: Battle, info: unknown) { /* l'écran */ }
}
```

Un `GameModeDef` (`id`, `title`, `description`, `settings`, `create`) déclare le mode au lobby : `description` est la phrase
ou deux que la carte du mode y affiche.

Tout sauf `run`, `createRun` et `createBattle` a un défaut vide. Specs, ordres, états, intentions : JSON opaque, lu et
validé par le mode (jamais d'exception : une `Fault`). Pour les erreurs du réseau, voir [faults.ts](../faults.ts).
