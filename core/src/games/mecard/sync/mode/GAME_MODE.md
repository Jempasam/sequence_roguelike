# Protocole d'un mode de jeu sur un réseau

L'API d'un mode ne connaît pas le réseau : voir [MODE.md](../../sim/mode/MODE.md). Ce dossier est l'implémentation réseau : un *gestionnaire* (`GameModeHost`) sur le client principal, un *invité* (`GameModeGuest`) sur chaque client, et le même invité sur le client principal, qui court-circuite le réseau par des appels directs (`LocalSeat`).

## Les pièces

| Pièce | Rôle |
|---|---|
| [GameModeHost](GameModeHost.ts) | fournit le `GameModeContext` au gestionnaire du mode, suit qui a rejoint ou quitté, tient les instances et l'état publié |
| [GameModeGuest](GameModeGuest.ts) | fabrique l'`owner` du mode, y fait arriver ce que dit le gestionnaire, et rend au gestionnaire ce qu'il dit |
| [Seat](Seat.ts) | ce qu'un client demande au gestionnaire (`act`, `ask`, `reply`, `up`) : `RemoteSeat` par le lien, `LocalSeat` par des appels |
| [kinds](kinds.ts) | ce que le runner sait d'une instance qui est un run ou un combat : l'ouvrir, la montrer, la diffuser |
| [messages](messages.ts) | les sujets et le codec JSON (les `GameModeShareable` y passent par `encodeShareable` / `decodeShareable`) |
| [Audience](Audience.ts) | ceux qui suivent une instance |
| [gameModeAsLobbyMode](gameModeAsLobbyMode.ts) | met un `GameMode` dans un lobby : le gestionnaire sur le client principal, l'invité partout |
| [stateBridge](stateBridge.ts) | `StatePublisher` : une brique qui dit à ses spectateurs (`SyncSender`) publie ses messages comme états du jeu |

## Sujets (topics)

Du gestionnaire vers un client : `open-run`, `open-battle` (une instance est montrée, ou possédée), `close`, `follow`/`unfollow` (quelqu'un suit l'instance dont ce client est propriétaire), `order` (`{order}`), `state` (`{key, value}`), `route`/`route-ask` (ce qu'un contrôleur dit au propriétaire ; `id` 0 = le gestionnaire demande quelque chose au client), `answer`. D'un client vers le gestionnaire : `act`/`ask` (`id` 0 = au gestionnaire lui-même, sinon sur l'instance), `reply`, `u<id>` (le flux du propriétaire vers ceux qui suivent).

## Ce que l'hôte tient

- **Un seul `onJoin` par join** : il est appelé dans l'admission (`#admit`), y compris pour ceux qui arrivent avant `run` ; `joined` est émis juste après, une fois que `run` écoute. Un membre accepté entre dans `members()` ; un refusé non.
- **Un seul `onQuit`**, seulement si le membre a été accepté. Un membre qui part ou qui s'en va pour de bon fait la même chose côté mode.
- **`onLost`/`onBack`** : une déconnexion. L'hôte renvoie à ce client l'état publié et ses instances quand il revient ; le mode peut ignorer les deux.
- **Notices aux propriétaires** : pour un membre à qui le gestionnaire a donné la main (`control`/`play`) sur une instance, son propriétaire reçoit `{lost: id}`, `{back: id}` ou `{left: id}` (voir `#tellOwners`). C'est ce qui fait jouer les unités d'un absent par des bots : aucun mode ne le relaie lui-même.
- **Accueil d'un client** (`#greet`) : d'abord les états publiés (rejoués), ensuite ses instances ; le client dédoublonne les états identiques.
- **`ask` vers un client** : une réponse, ou un `NoAnswerFault` de cause `quit` (le client est parti), `timeout` (délai dépassé) ou `unreachable`. Une réponse tardive est jetée.
- **Valeurs** : ce qui part est converti en JSON (`encodeShareable`) et ce qui arrive est revivifié (`decodeShareable`) ; les membres passent par leur id.

## Un moteur, plusieurs copies

Une instance est faite chez son propriétaire seul (`createRun`/`createBattle` de l'`owner`), qui en est l'autorité. Ceux qui la suivent en tiennent une réplique que le jeu fabrique (`replica` de [kinds](kinds.ts) : un combat chargé depuis sa sauvegarde, une run nue depuis `spec.seed`), qu'ils reçoivent par le flux de l'instance (le propriétaire le dit au gestionnaire, qui le redistribue). Chaque client montre l'instance avec `spectateRun`/`spectateBattle`, y compris le propriétaire (l'écran est écrit une fois) ; `info` et `units` peuvent changer sous un même spectateur : l'appel est répété, et `dispose` n'est appelé qu'une fois, à la fin.

## Sans réentrance, rattrapage, livraison

- **Une entrée à la fois** : tout ce qui entre dans le gestionnaire (`run`, `onQuit`, `onLost`, `onBack`, `onMessage`, `onAsk`, `joined`) passe par `#enter` : ce qu'un handler fait déclencher (un join annoncé, un quit) arrive **après** son retour, dans l'ordre. `onJoin` seul est synchrone, il doit rendre l'admission.
- **Observables à état** : `said` et `invalidated` d'une instance rejouent leur dernière valeur à qui s'abonne après coup (`Replayed`). Pas `joined` : un `until(joined)` rejoué tournerait en boucle.
- **Livraison au retour** : ce qui est dit à un membre dont la connexion est perdue (`notify`, `broadcast`, `ask`, ce que le gestionnaire dit au propriétaire d'une instance, les réponses) est mis en file (`#missed`) et livré dans l'ordre à son retour, après les états et les instances rejoués. Un membre qui quitte n'en reçoit rien : ses `ask` rendent un `NoAnswerFault` de cause `quit`. Un `ask` à délai rend `timeout` sans attendre son retour.
- **Combats (R9, R15)** : déjà tenus par `BattleHost` : un plan porte son tour (`round`), un plan d'un autre tour ou d'un client qu'on n'attend pas est laissé de côté, le premier arrivé gagne ; un joueur perdu est joué par des bots sans rien rendre au milieu d'un tour, et n'est attendu de nouveau qu'au tour suivant (`#openRound`).
- **Joueur parti** : il reste dans les frises, grisé et sans nom. La sim ne passe que l'état (`gone` dans `BracketView` et dans le message des vies, `isGone` côté `LifeBook`/`LivesReceiver`) ; l'UI écrit « ??? ».
- **Pas encore** : un identifiant de question dans chaque `ask` (aujourd'hui `Picker` ferme un prompt dépassé avec l'ordre `{unprompt}`). Une course ne se joue pas sur un seul client (`LocalGame`) : le côté client d'une course tient la run d'un seul joueur.
