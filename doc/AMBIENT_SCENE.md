# Scène d'ambiance

# Description
Une scène d'ambiance est un effet purement visuel de la carte fait de particules et de petits êtres : de la météo, de la fumée, une nuée, un vol d'oiseaux, un geyser. Elle ne touche jamais la simulation et ne tire que dans le hasard de l'affichage. C'est le pendant du [trajet d'ambiance](AMBIENT.md).

Chaque scène est la configuration d'une brique : où elle naît (point de naissance ou lieux), de quoi elle est faite (grain) et comment cela bouge (la brique). Ajouter un effet à un étage, c'est ajouter une entrée à la table de sa brique, avec sa [catégorie](AMBIENT.md#catégories-et-rythmes), puis la mettre dans la liste exportée par cette table. Sans `spacing`, elle prend celui de sa catégorie.

# Exemple
- snowfall : des flocons naissent au-dessus de l'écran et tombent sur la toundra.
- sea-mist : quatre nappes de brume glissent sur l'eau du port.
- butterflies : des papillons tournent autour d'un lieu de la forêt.
- snow-geese : un grand V d'oies traverse le ciel.
- leaping-fish : un poisson bondit hors de l'eau et fait une gerbe.
- rockfall : des rochers tombent près d'un combat et soulèvent la poussière.

# Classes associées
- `Scene` ([ui/travel/ambient/scene/Scene.ts](../core/src/games/mecard/ui/travel/ambient/scene/Scene.ts)) : ce que fabrique une brique : dit si la carte permet de la jouer et crée son animation, aucune tant qu'une image manque.
- `sceneEffect` ([ui/travel/ambient/scene/sceneEffect.ts](../core/src/games/mecard/ui/travel/ambient/scene/sceneEffect.ts)) : assemble une scène, ses étages, son poids et son espacement en effet.
- `Spot` ([ui/travel/ambient/scene/Spot.ts](../core/src/games/mecard/ui/travel/ambient/scene/Spot.ts)) : où cela naît : `topEdge`, `sideEdge`, `screen`, `band`, `atPlace`.
- `Grain` ([ui/travel/ambient/scene/Grain.ts](../core/src/games/mecard/ui/travel/ambient/scene/Grain.ts)) : de quoi c'est fait : couleurs, taille, image facultative, opacité, lueur.
- `Jet` ([ui/travel/ambient/scene/Jet.ts](../core/src/games/mecard/ui/travel/ambient/scene/Jet.ts)) : une gerbe lancée d'un point.
- `drift` : des grains émis en continu, qui tombent, montent ou filent au vent.
- `glide` : quelques grandes formes qui glissent d'un côté à l'autre.
- `swarm` : des êtres qui tournent autour d'un lieu.
- `flock` : un vol qui traverse le ciel de gauche à droite, en V ou dispersé.
- `leap` : un être qui bondit en arc, une fois ou plusieurs.
- `eruption` : des gerbes à un point, précédées ou accompagnées de formes qui tombent ou montent.

# Sous-dossier associé
- base : [core/src/games/mecard/ui/travel/ambient/scene/](../core/src/games/mecard/ui/travel/ambient/scene/)
- briques : [core/src/games/mecard/ui/travel/ambient/scene/subs/](../core/src/games/mecard/ui/travel/ambient/scene/subs/)
- tables du sol et de l'air : [core/src/games/mecard/ui/travel/ambient/subs/ground/](../core/src/games/mecard/ui/travel/ambient/subs/ground/)
- tables des êtres : [core/src/games/mecard/ui/travel/ambient/subs/creatures/](../core/src/games/mecard/ui/travel/ambient/subs/creatures/)

# Convention de nommage
- Un identifiant nomme ce qu'on voit, en anglais : `snowfall`, `snow-geese`.
- Les listes d'étages (`SNOW_FLOORS`, `ROT_FLOORS`...) sont dans [ui/travel/ambient/themes.ts](../core/src/games/mecard/ui/travel/ambient/themes.ts).
- Les images sont dans [raw_assets/mecard/ambient/](../raw_assets/mecard/ambient/), toutes chargées avec les sprites ; elles sont dessinées tournées vers la droite.
- Dans la console du jeu, `travel floor <étage>` puis `travel ambient <effet>` lance un effet.

# Énumération
- drift : leaves, cherry-petals, embers, campfire, gust, snowfall, blizzard, ice-glitter, cave-drips, rock-dust, rain, ash-fall, marsh-bubbles, pollen, sky-lanterns, chimney-smoke, soot.
- glide : fog, cloud-shadow, volcano-smoke, sea-mist.
- swarm : bats, fireflies, butterflies, flies, wisps.
- flock : bird-flock, seagulls, crows, bat-cloud, snow-geese.
- leap : leaping-fish, leaping-frogs.
- eruption : lava-geyser, explosion, rockfall, avalanche, steam-vent, marsh-burst, spectre-rise, flame-pillar, sea-spout.
