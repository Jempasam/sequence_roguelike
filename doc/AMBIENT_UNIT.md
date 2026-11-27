# Ambiance d'unité

# Description
Une ambiance d'unité est un effet purement visuel qui joue sur ou autour des personnages affichés, sur la carte comme en combat : une buée, de la neige sur une tête, un oiseau qui s'y pose, deux voisins qui causent. Elle ne touche jamais la simulation et ne tire que dans le hasard de l'affichage.

Elle lit les unités que l'écran dit montrer (`context.units()`) : leurs pieds, le haut de leur image, la direction regardée et les cœurs affichés. Elle les relit à chaque image, ce qui suffit à les suivre et à savoir si elles bougent ; un défilement de la carte ou un redimensionnement compte comme un mouvement.

Chaque effet est la configuration d'une brique, qui rend une [scène](AMBIENT_SCENE.md) : on l'assemble avec `sceneEffect`, dans la [catégorie](AMBIENT.md#catégories-et-rythmes) `unit`.

# Exemple
- cold-breath : en toundra, chaque unité souffle de la buée devant elle.
- snow-cap : la neige s'entasse sur la tête d'une unité immobile et tombe quand elle bouge.
- perching-bird : un oiseau se pose sur une tête et repart au premier mouvement.
- coin-toss : deux héros se lancent une pièce sur la carte.

# Classes associées
- `AmbientUnit` ([ui/travel/ambient/AmbientContext.ts](../core/src/games/mecard/ui/travel/ambient/AmbientContext.ts)) : une unité telle qu'elle est affichée.
- `Choice` ([ui/travel/ambient/unit/selection.ts](../core/src/games/mecard/ui/travel/ambient/unit/selection.ts)) : qui un effet peut prendre : `bodies` (ni pilier, ni piège), `heroes`, `playerHeroes`, `carriers`, `weary`, `lastHeart`, `freshHeroes`, `petsByAFriend`, et les paires `pairsWithin`. Un pet est une unité jouée par un bot dont le deck n'est pas ordonné.
- `Tracked` ([ui/travel/ambient/unit/Tracked.ts](../core/src/games/mecard/ui/travel/ambient/unit/Tracked.ts)) : une unité suivie : a-t-elle bougé, depuis quand est-elle immobile, est-elle encore là.
- `following` ([ui/travel/ambient/unit/following.ts](../core/src/games/mecard/ui/travel/ambient/unit/following.ts)) : l'animation qui relit les unités à chaque image.
- `Puppet` ([ui/travel/ambient/unit/Puppet.ts](../core/src/games/mecard/ui/travel/ambient/unit/Puppet.ts)) : une particule placée à volonté.
- `Puff` ([ui/travel/ambient/unit/Puff.ts](../core/src/games/mecard/ui/travel/ambient/unit/Puff.ts)) : une bouffée de particules, et les ancres d'une unité : `head`, `mouth`, `middle`, `feet`.
- `aura` : des bouffées données encore et encore.
- `cap` : un tas sur la tête, qui tombe au mouvement.
- `perch` : un être qui arrive, se pose sur une tête et repart, avec ou sans butin.
- `hop` : un être qui va d'unité en unité.
- `companion` : ce qui reste auprès d'une unité : un halo, un feu follet qui s'enfuit, une main.
- `struggle` : le double d'une unité, aux yeux morts, qui se débat pour en sortir puis est rappelé d'un coup.
- `pair` : un échange à tour de rôle entre deux unités.
- `trail` : ce que les pas soulèvent.
- `juggle` : un objet porté, sorti de la poche, lancé en l'air puis rangé, aussitôt quand l'unité bouge.
- `doze` : un sommeil à l'arrêt, avec un sursaut au premier mouvement.

# Sous-dossier associé
- base : [core/src/games/mecard/ui/travel/ambient/unit/](../core/src/games/mecard/ui/travel/ambient/unit/)
- briques : [core/src/games/mecard/ui/travel/ambient/unit/subs/](../core/src/games/mecard/ui/travel/ambient/unit/subs/)
- tables des effets : [core/src/games/mecard/ui/travel/ambient/subs/units/](../core/src/games/mecard/ui/travel/ambient/subs/units/)

# Convention de nommage
- Un identifiant nomme ce qu'on voit, en anglais : `snow-cap`, `firefly-relay`.
- Dans la console du jeu, `travel ambient <effet>` lance un effet sur la carte ou l'arène affichée.

# Énumération
- Climat : cold-breath, snow-cap, rain-splashes, head-lamp.
- Visiteurs : perching-bird, curious-butterfly, shy-wisp, coin-magpie.
- État : weary-sweat, last-heart-soul, dozing, whistling-hero (carte).
- Liens, pas et jeux : footfall-puffs, party-chatter, firefly-relay, coin-toss (carte), juggling, pet-pat.
