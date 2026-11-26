# Trajet d'ambiance

# Description
Un trajet d'ambiance est un effet purement visuel de la carte : un personnage, un groupe, un chariot ou un bateau sort d'une halte, entre dans l'écran, va d'une halte à une autre ou le traverse, en zigzaguant. Il ne touche jamais la simulation et ne tire que dans le hasard de l'affichage.

Les effets de particules et de petits êtres (météo, nuées, vols, éruptions) sont des [scènes d'ambiance](AMBIENT_SCENE.md).

Chaque trajet est une configuration de quatre briques indépendantes : où il va (itinéraire), par quel chemin (route), qui le fait (distribution) et comment cela se déplace (voyageur). Ajouter un personnage à une halte, c'est ajouter une ligne à la table des familles.

# Exemple
- stroll-magician : un prestidigitateur sort d'une halte de magicien, se balade et y rentre.
- swap-cart : un chariot et son cheval vont d'une halte qui vend à une autre.
- enemy-queue-leave : une file de monstres de la carte sort d'un combat et quitte l'écran.
- all-monster-party-in : un groupe de un à quatre monstres arrive du bord vers une halte de monstres.
- boat : un bateau entre par un côté de l'écran, tangue sur la mer du port et sort par l'autre.
- item-eject : un objet est jeté d'un coffre, tombe, rebondit et disparaît.

# Classes associées
- `AmbientEffect` ([ui/travel/ambient/AmbientEffect.ts](../core/src/games/mecard/ui/travel/ambient/AmbientEffect.ts)) : un effet d'ambiance, ce que `tripEffect` fabrique.
- `Itinerary` ([ui/travel/ambient/trip/Itinerary.ts](../core/src/games/mecard/ui/travel/ambient/trip/Itinerary.ts)) : d'où à où, tiré parmi les places de la carte : `stroll`, `leave`, `enter`, `swap`, `crossing`, `oneOf`, `when`.
- `Route` ([ui/travel/ambient/trip/Route.ts](../core/src/games/mecard/ui/travel/ambient/trip/Route.ts)) : le chemin tracé : `straight`, `wander` (zigzag à deux échelles : un zigzag net tous les 45 px et une ondulation douce tous les 90 à 200 px), `loop` (sort, se balade, revient). `wander` et `loop` passent par `uniform` : la vitesse est constante le long de la courbe, et `Traveler.procession` règle le retard des suiveurs pour que leur écart le long du chemin soit toujours le même, quelle que soit la durée du trajet.
- Le contexte donne `area()`, le rectangle de la carte affichée : les trajets qui sortent ou entrent par un bord (`edgeStop`, `crossing`) le font sur le bord de ce rectangle, où le personnage apparaît ou disparaît en fondu. Les particules d'ambiance ont leurs propres systèmes (`ambientAlpha`, `ambientAdditive` de `RunParticleLink`), vidés dès que la carte n'est plus affichée (halte, combat).
- `Cast` ([ui/travel/ambient/trip/Cast.ts](../core/src/games/mecard/ui/travel/ambient/trip/Cast.ts)) : les sprites qui font le trajet, le premier en tête et les autres derrière : un meneur et ses compagnons, une file, un chariot et son cheval.
- `Traveler` ([ui/travel/ambient/trip/Traveler.ts](../core/src/games/mecard/ui/travel/ambient/trip/Traveler.ts)) : la façon d'aller : `WALKER`, `COMPANY`, `CART`, `MINE_CART`, `BOAT`, `CREWED_BOAT`, `PRINTS`.
- `tripEffect` ([ui/travel/ambient/trip/tripEffect.ts](../core/src/games/mecard/ui/travel/ambient/trip/tripEffect.ts)) : assemble un itinéraire, une distribution et un voyageur en effet.
- `Family` ([ui/travel/ambient/subs/traffic/families.ts](../core/src/games/mecard/ui/travel/ambient/subs/traffic/families.ts)) : des haltes, un personnage et un voyageur, qui donnent quatre effets (`stroll-`, `leave-`, `enter-`, `swap-`).

# Sous-dossier associé
- base : [core/src/games/mecard/ui/travel/ambient/trip/](../core/src/games/mecard/ui/travel/ambient/trip/)
- effets : [core/src/games/mecard/ui/travel/ambient/subs/traffic/](../core/src/games/mecard/ui/travel/ambient/subs/traffic/)

# Convention de nommage
- Un effet de famille s'appelle `<schéma>-<famille>` : `stroll-`, `leave-`, `enter-` ou `swap-`, puis le nom de la famille en minuscules.
- Les listes de haltes des familles partagées (`CART_HALTS`, `MONSTER_HALTS`, `ITEM_HALTS`, `USABLE_HALTS`) sont dans [ui/travel/ambient/themes.ts](../core/src/games/mecard/ui/travel/ambient/themes.ts).
- Deux effets ne portent jamais le même identifiant. Dans la console du jeu, `travel ambient <effet>` lance un effet sur la carte affichée et `travel ambient` les lance tous.

# Énumération
- Les trajets de famille : alchemist, boss, butcher, cart, devil, enemy, mad-doctor, mage, magician, mechanic, necromancer, shaman, trainer, witch.
- Les files de la carte : `enemy-queue-between`, `enemy-queue-edge-to-edge`, `enemy-queue-enter`, `enemy-queue-leave`.
- Les groupes : `tavern-party-*` (kits, taverne) et `all-monster-party-*` (monstres du catalogue, haltes de monstres).
- Les objets jetés : `item-eject`, `usable-eject`.
- Les trajets à part : `edge-to-edge`, `boat`, `boat-fisher`, et `mine-cart`, `footprints`, `traveling-monster`, `monster-passing`, `monster-line` qui gardent leur nom d'avant.
