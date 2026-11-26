# Titre : Réseau

# Description : le réseau
Le réseau fait jouer plusieurs joueurs sur une même partie, hébergée par l'un d'eux : le client principal tient l'autorité et chaque autre client se connecte à lui par un code de salon. Il est fait de deux couches : le moteur réseau, qui sait ouvrir des salons, des sessions et des connexions sans rien savoir du jeu, et la synchronisation du jeu, qui dit quoi envoyer et à qui pour le lobby, les parties et les combats.

Rien dans le réseau ne lève d'exception ni ne rejette de promesse : ce qui va mal est une valeur `Fault`, donnée sur les canaux `faulted` (traité) ou `ended` (arrêté).

## Moteur réseau : connexions, sessions et salons

Un salon est en étoile (un hôte, des clients qui ne se parlent pas) ou en maillage (des membres égaux). Chaque connexion a deux canaux : fiable et ordonné pour les événements, non fiable pour ce que le message suivant remplace. Une session survit à la connexion : un client qui revient sur une nouvelle connexion reste le même et reçoit de nouveau ses premiers messages.

- `PTPHostSocket` : l'hôte d'une étoile, une connexion WebRTC par client.
- `PTPClientSocket` : un client, une seule connexion, vers l'hôte.
- `PTPSymSocket` : un membre d'un maillage, une connexion avec chaque autre.
- `Signaling` : met en relation par un serveur (`ws://`) ou par un relais PeerJS (`peerjs://`, étoiles seulement).

## Synchronisation du jeu

- Lobby : les participants, le salon de discussion, le mode choisi et ses réglages, avant la partie.
- Mode de jeu : un gestionnaire sur le client principal décide, un invité sur chaque client fabrique les moteurs ; voir [MODE.md](../core/src/games/mecard/sim/mode/MODE.md) et [GAME_MODE.md](../core/src/games/mecard/sync/mode/GAME_MODE.md).
- Partie et combat : le propriétaire de l'instance fait tourner le vrai moteur et le diffuse ; les autres clients tiennent une réplique mise à jour par son flux.
- Un protocole se compose de la même façon : un sujet, une brique côté hôte, un récepteur ; l'état est salué à l'arrivée, et le départ, le retour et la reconnexion sont couverts.

# Exemple : le réseau en jeu
- Héberger : le joueur ouvre un salon, le serveur de signalisation lui donne un code, les autres l'entrent pour rejoindre.
- Reconnexion : un client dont la connexion tombe revient sur la même session et reçoit de nouveau l'état de la partie.
- Spectateur : un client suit un combat dont un autre est propriétaire, sans pouvoir y jouer.

# Classes associées : code du réseau
- `Connection` ([core/src/engine/net/Connection.ts](../core/src/engine/net/Connection.ts)) : un lien, ses canaux fiable et non fiable.
- `Session`, `SessionHost`, `SessionClient`, `SessionPeer` ([core/src/engine/net/Session.ts](../core/src/engine/net/Session.ts)) : l'identité qui survit aux connexions.
- `Room` ([core/src/engine/net/Room.ts](../core/src/engine/net/Room.ts)) : un salon, de capacité bornée.
- `Signaling`, `SignalingClient`, `signalingAt` ([core/src/engine/net/signalingAt.ts](../core/src/engine/net/signalingAt.ts)) : l'accès au serveur de signalisation, choisi par le schéma de l'adresse.
- `NetSync` ([core/src/engine/net/NetSync.ts](../core/src/engine/net/NetSync.ts)) : les clients d'une partie : l'hôte, ses spectateurs, leur état initial.
- `MemoryConnection` ([core/src/engine/net/MemoryConnection.ts](../core/src/engine/net/MemoryConnection.ts)) : un lien dans le programme, pour le joueur qui héberge et pour les tests.
- `Fault`, `NetFaults` ([core/src/engine/net/Fault.ts](../core/src/engine/net/Fault.ts)) : les erreurs comme valeurs, une sous-classe par cas.
- `SyncChannel` ([core/src/games/mecard/sync/SyncChannel.ts](../core/src/games/mecard/sync/SyncChannel.ts)) : où vont les messages d'un jeu (`SyncSender`, `SyncSource`).
- `Lobby`, `LobbyRoom`, `Roster` ([core/src/games/mecard/sync/lobby/Lobby.ts](../core/src/games/mecard/sync/lobby/Lobby.ts)) : le lobby et ses membres.
- `GameModeHost`, `GameModeGuest` ([core/src/games/mecard/sync/mode/](../core/src/games/mecard/sync/mode/)) : un mode de jeu sur le réseau.
- `BattleHost`, `BattleGuest`, `BattleBroadcaster`, `BattleReceiver` ([core/src/games/mecard/sync/battle/](../core/src/games/mecard/sync/battle/)) : la diffusion d'un combat.
- `RunHost`, `RunGuest`, `RunBroadcaster`, `RunReceiver` ([core/src/games/mecard/sync/run/](../core/src/games/mecard/sync/run/)) : la diffusion d'une partie.
- `ChatHost`, `ChatGuest` ([core/src/games/mecard/sync/chat/](../core/src/games/mecard/sync/chat/)) : la discussion du lobby.

# Sous-dossier associé : emplacement du code
- moteur : [core/src/engine/net/](../core/src/engine/net/)
- ports : [core/src/platform/NetPort.ts](../core/src/platform/NetPort.ts) et [core/src/platform/SyncPort.ts](../core/src/platform/SyncPort.ts)
- synchronisation du jeu : [core/src/games/mecard/sync/](../core/src/games/mecard/sync/), un sous-dossier par sujet (`lobby/`, `mode/`, `battle/`, `run/`, `progress/`, `chat/`, `participation/`)
- serveur de signalisation : [server/](../server/)

# Lien avec la simulation : ce que le réseau lui doit et lui apporte
- Il lit la simulation par ses observables seulement (`BattleBroadcaster`, `RunBroadcaster`) : la simulation ne sait ni qu'on la diffuse, ni qui la regarde, ni s'il y a plusieurs joueurs ([SIM.md](SIM.md)).
- Il lui doit ses sauvegardes : un combat ou une partie s'écrit en JSON et se recharge à l'identique, ce qui permet d'envoyer l'état, de le rejouer chez un spectateur et de détecter un désaccord (`BattleDesync`).
- Il lui doit la graine : à graine, unités et chaînes égales, chaque client refait le même round, donc seules les chaînes décidées circulent, pas chaque événement.
- Il lui apporte, côté mode de jeu, un cadre sans réseau (`GameMode`, [MODE.md](../core/src/games/mecard/sim/mode/MODE.md)) : le même mode tourne sur un seul client ou autour d'un réseau, parce qu'il ne partage que du JSON et des membres.
- Il lui apporte qui joue quoi : à la simulation, il remet les chaînes planifiées par chaque client, sans que la simulation ait à connaître humains, prêts ni multi.

# Lien avec l'interface de combat : ce que le réseau lui doit et lui apporte
- Il lui doit un combat qu'elle sait lire : un client reçoit une réplique à jour (`BattleReceiver`, `RunReceiver`), qu'il montre comme un combat local ([HUD.md](HUD.md)).
- Il lui apporte les droits du joueur : qui est le propriétaire, qui contrôle quelles unités, qui est seulement spectateur, ce que l'interface traduit en `viewpoint`, `isLocked`, `launchable`, `saysReady`.
- Il lui apporte les moments : début de préparation, lancement, fin de round ; l'interface y accroche ses animations.
- Il lui doit les plans du joueur : ce que l'interface envoie par `launch` devient un message (`PlanMessage`) vers l'hôte, qui le valide.
- Il ne lui impose pas d'écran à part : un spectateur et un joueur partagent l'interface, seuls les droits diffèrent.
