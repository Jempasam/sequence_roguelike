# Titre : Moteur

# Description : le moteur
Le moteur est la partie de `core` qui ne sait rien d'un jeu en particulier : rendu, interface, entrées, sons, images, réseau, sauvegarde, particules. Les jeux (comme Dungeon of the Mecard) se construisent dessus. Il n'accède jamais à l'environnement (`window`, `fetch`, `process`, `setTimeout`...) : tout passe par les ports de `Platform`, que `web/` et `desktop/` implémentent chacun.

# Exemple : le moteur en jeu
- `Painter` : dessine des formes et des sprites sur une surface, avec lots et textures.
- `UiRoot` : la racine de l'interface, qui route les événements et repeint les zones sales.
- `InputSystem` : lit clavier, souris et manette, et les rend sous forme d'actions nommées.
- `SaveSlot` : écrit et relit une sauvegarde avec enveloppe, version et somme de contrôle.

# Classes associées : code du moteur
- `Platform` ([core/src/platform/Platform.ts](../core/src/platform/Platform.ts)) : tout ce dont `core` a besoin de son environnement ; un port par besoin (`GfxPort`, `InputPort`, `AudioPort`, `AssetsPort`, `StoragePort`, `NetPort`, `SyncPort`, `TimerPort`, `LoopPort`, `ClipboardPort`).
- `Gpu`, `Painter`, `Sprite`, `Texture`, `Shader`, `Camera` ([core/src/engine/gpu/](../core/src/engine/gpu/)) : le rendu en WebGL.
- `Atlas`, `PagedAtlas`, `Packer` ([core/src/engine/atlas/](../core/src/engine/atlas/)) : l'empaquetage des images en atlas de textures.
- `Component`, `Container`, `UiRoot`, `Layer`, `AnimationChain`, `Theme` ([core/src/engine/ui/](../core/src/engine/ui/)) : l'interface, ses composants (`widget/`) et ses mises en page (`layout/`).
- `InputSystem`, `ActionMap`, `Binding` ([core/src/engine/input/](../core/src/engine/input/)) : les entrées et leur affectation à des actions.
- `Assets`, `MemoryAssets`, `AssetPath` ([core/src/engine/assets/](../core/src/engine/assets/)) : le chargement des images et des sons par chemin.
- `SoundPlayer`, `SoundSettings` ([core/src/engine/audio/](../core/src/engine/audio/)) : les sons, leurs filtres et leurs réglages.
- `BitmapFont`, `TextLayout` ([core/src/engine/text/](../core/src/engine/text/)) : les polices bitmap et la mise en page du texte.
- `decodePng`, `decodeOra` ([core/src/engine/image/](../core/src/engine/image/)) : le décodage des images.
- `SaveSlot`, `Envelope` ([core/src/engine/save/](../core/src/engine/save/)) : les sauvegardes.
- `ParticleSystem` ([core/src/engine/particles/](../core/src/engine/particles/)) : les particules.
- `Console`, `Command` ([core/src/engine/console/](../core/src/engine/console/)) : la console de commandes du jeu.
- `Observable`, `Scope`, `Removable` ([core/src/lifetime/](../core/src/lifetime/)) : les observateurs et la durée de vie des abonnements.
- `Keyword`, `Text`, `Shown` ([core/src/semantic/](../core/src/semantic/)) : le texte sémantique, des phrases faites de mots clés que l'interface interprète.
- `Color`, `Mat4`, `Vec3`, `Quat` ([core/src/engine/math/](../core/src/engine/math/)) : les maths de rendu.
- `Session`, `Connection`, `Room` ([core/src/engine/net/](../core/src/engine/net/)) : le réseau, voir [NETWORK.md](NETWORK.md).

# Sous-dossier associé : emplacement du code
- moteur : [core/src/engine/](../core/src/engine/), un sous-dossier par domaine (`assets`, `atlas`, `audio`, `console`, `gpu`, `image`, `input`, `math`, `net`, `particles`, `save`, `text`, `ui`)
- ports : [core/src/platform/](../core/src/platform/)
- durée de vie : [core/src/lifetime/](../core/src/lifetime/)
- sémantique : [core/src/semantic/](../core/src/semantic/)
- adapters : [web/](../web/) (navigateur) et [desktop/](../desktop/) (SDL et Node)
