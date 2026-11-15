# Méthode des transitions

Variante de [METHOD.md](METHOD.md) : on ne fait plus un fond de parallaxe mais une **transition**, un tableau de
calques qui bougent par-dessus l'écran pendant qu'il change derrière (une porte qui s'ouvre, une descente dans une
grotte). Tout ce qui concerne la fabrication d'un calque (§2 à §4 de METHOD : plans, formes, motifs, images
libres, profondeur, matériaux, chaîne de rendu, mise au point) **reste valable** ; ce document ne dit que ce qui
change. Exemples existants : `generated_assets/mecard/transitions/door.ora` et `cave.ora`.

Document vivant : chaque transition refaite corrige la méthode (journal en fin de page).

## Ce qui est différent d'un fond

| | Fond de parallaxe | Transition |
|---|---|---|
| Rôle | décor qui bouge un peu sous la souris | cache l'écran, puis le dévoile |
| Calques | 5 plans fixes, 1 = fond, 5 = cadre | autant que voulu, chacun avec sa trajectoire |
| Mouvement | `ranges` : distance et déformation | **pistes d'étapes** du champ `anim` (compilées en images clés dans le nom des calques) |
| Fichier | `generated_assets/mecard/parallax/<id>.ora` | `generated_assets/mecard/transitions/<nom>.ora` |
| Lu par | `loadParallaxPictures` | `Transition.fromImage` (`core/src/engine/ui/widget/Transition.ts`) |
| Fin | rien | un milieu où tout est couvert, puis la sortie |

Le moteur lit la transition (`readTransition`, `core/src/engine/ui/widget/TransitionScript.ts`) : tous les calques
traversent **les mêmes instants**, chacun bougé, agrandi et fondu d'une image clé à la suivante, avec un lissage
entrée-sortie. Elle prend la taille de l'écran en gardant le rapport de son canevas, le trop-plein coupé.

## Principe : on peint le milieu

**Chaque calque est peint tel qu'il est au milieu de l'animation** (l'instant `m`), là où la transition **couvre
tout le fond de l'image**. Conséquences :
- le `preview.png` du constructeur montre exactement le milieu : c'est l'image à juger, et la seule ;
- à l'image clé du milieu, chaque calque est **à sa place peinte : `0;0;1;1`** (aucun décalage, taille 1, opaque) ;
- les images clés **avant** le milieu partent d'un **début vide** (calque décalé hors du canevas, ou `z` 0, ou
  `a` 0) et **arrivent** à `0;0;1;1` ;
- les images clés **après** le milieu partent de `0;0;1;1` et **aboutissent à un canevas vide** (tout sorti, réduit
  ou fondu) ;
- le milieu se place **quand l'écran est couvert**, pas forcément au sommet du geste : le geste peut continuer
  après (un calque qui n'apparaît qu'après le milieu est à `a 0` à cet instant).

Donc une transition = un tableau peint une fois, plein, plus des trajectoires d'entrée et de sortie. On ne peint
pas « le début » ni « la fin » : ils n'existent que par les images clés.

**On ne teste jamais image par image** (trop lourd à relire) : on regarde le `preview.png`, puis le mouvement se
juge **dans le jeu**, par la commande `debug transition` (§4).

## Déroulé

1. Écrire le brief (METHOD §1) **et le scénario** (§1 ci-dessous).
2. Décider ce que montre le **milieu** : c'est ce qui se peint.
3. Fabriquer chaque calque tel qu'au milieu (METHOD §3), le rendre avec la chaîne de rendu (METHOD §4).
4. Écrire `anim` : entrée depuis le vide (première étape), milieu `m` à la place peinte, sortie vers le vide ;
   mettre dans la piste `global` ce que tous les calques font ensemble (§2).
5. Construire avec `npm run art:preview` (§3), regarder `preview.png`, puis jouer dans le jeu (§4) ; corriger, noter le journal.
6. Une fois la transition finie, supprimer son `preview.png` (temporaire, pas livré).

## 1. Brief et scénario

En plus du brief de METHOD, répondre à :
- **Ce qui est caché au milieu** : à l'instant `m`, l'écran doit être entièrement couvert (ou assez pour qu'on ne
  voie pas le changement). C'est la contrainte principale : tout le reste s'organise autour.
- **Début et fin** : au début, la transition ne couvre rien ; à la fin, elle ne couvre rien non plus (elle est
  sortie ou invisible). Le jeu la joue aussi à l'envers (`envers`) : le scénario doit rester lisible dans les deux
  sens, ou le dire.
- **Le geste** en une phrase, par exemple « une porte se dresse, s'ouvre, on la traverse » ; « on descend, le bord
  de la grotte monte et avale l'écran ».
- **La durée visée** : 1,5 s par défaut en essai ; chaque entrée de lieu la fixe elle-même. Un geste qui a besoin de
  plus de 6 images clés est probablement deux gestes.

Découper le scénario en **instants** (images clés) : un tableau avec une ligne par instant, une colonne par calque.
Les instants sont régulièrement espacés dans le temps, donc un geste lent prend plusieurs instants identiques.

## 2. Images clés

**On les écrit avec le champ `anim`** (voir « Écrire les images clés : le champ `anim` » plus bas) : le constructeur
les compile vers le format moteur décrit ici, et vérifie le milieu, le début et la fin. Ce qui suit dit **ce que
signifie chaque valeur** et les règles de composition, qui valent pour `anim` comme pour le format moteur.

Chaque calque porte la même suite d'images clés, au même nombre (sinon la lecture échoue). Une image clé s'écrit
`x;y`, `x;y;z` ou `x;y;z;a` :

| Champ | Rôle | Défaut |
|---|---|---|
| `x`, `y` | décalage depuis l'endroit où le calque est peint, en **largeurs et hauteurs du canevas** (0,5 = la moitié) | — |
| `z` | taille par rapport au calque peint, autour de son centre (0 = disparu) | 1 |
| `a` | opacité de 0 à 1, multipliée par celle du calque | 1 |

Règles de composition :
- **Le calque est peint tel qu'au milieu** (voir « Principe ») : `0;0;1;1` = à sa place peinte, c'est l'image clé
  du milieu, celle qui précède `m`. Toutes les autres le déplacent depuis cette place.
- **L'entrée** : la première image clé est le **début vide** (`x` ou `y` de ±1, ou `z` 0, ou `a` 0), les suivantes
  rapprochent le calque jusqu'à `0;0;1;1`. **La sortie** : après `0;0;1;1`, des images clés qui aboutissent à un
  **canevas vide** (sorti, réduit à `z` 0, ou `a` 0). Ne pas faire apparaître un calque d'un coup : il se fond
  (`a`) ou glisse, il ne surgit pas.
- **Début et fin sont vides pour tous les calques** : sinon un calque reste affiché avant ou après la transition.
- **Profondeur de scène** : les calques proches bougent plus que les lointains (même principe que le parallaxe),
  `z` plus grand en passant par le milieu pour ce qui est proche ; un grossissement fort (`z` 3 à 6) donne l'effet
  « on traverse ».
- Rien n'est dessiné hors du canevas : un calque plus grand que lui est coupé. Peindre large (comme les 24 px de
  marge du parallaxe) pour qu'un déplacement ne montre jamais de bord nu.
- Les images clés sont lissées entre elles (entrée-sortie) : pas besoin de les multiplier pour adoucir ; deux
  images clés identiques à la suite font une **pause**.
- **Ne pas trop découper un mouvement** : le lissage (`t*t*(3-2t)`, `Transition.ts`, `#frameAt`) part de vitesse
  zéro et revient à zéro à **chaque** image clé, donc un même geste réparti sur plusieurs images clés ralentit
  puis repart à chaque fois, et le mouvement avance « par à-coups ». Un geste continu (un zoom, une glissade) va
  d'une image clé à la suivante **en une seule étape** (`1 → 8`, pas `1 → 3 → 8`) ; on n'ajoute une image clé
  que pour un vrai changement de geste (arrêt, changement de direction ou de rôle du calque).
  **Le découpage peut aussi être voulu** : les arrêts répétés donnent un effet de **pas** (marche, avancée
  hésitante, tâtonnement). Dans ce cas, découper en étapes régulières et le dire dans le scénario ; sinon, une
  seule étape.

### Le milieu

Un jeton **`m`** après une image clé marque le milieu à cet instant : c'est là que le jeu change ce qui est derrière
(il appelle `onMiddle`). Sans `m`, le milieu est à mi-parcours.
- Mettre `m` sur **tous** les calques, après la même image clé (sinon erreur) ; ou sur un seul calque, il vaut pour
  tous.
- À cette image clé, l'écran doit être couvert (voir le brief). Un trou au milieu laisse voir le changement de
  décor.

### Écrire les images clés : le champ `anim`

Plutôt que de coller les images clés dans les noms (§3, ancien format, toujours lu), `parallax.json` peut porter un
champ **`anim`** : une ligne par piste, que `scripts/transitionAnim.ts` compile vers ces noms (le moteur ne change pas).
Les calques ont alors un `name` simple (sans espace).

```json
"anim": [
    "global: y=0.2 a=0 > y=0 a=1 m > hold > z*8 on=gate a=0",
    "stairs: > m > hold > y+0.6",
    "leaf:   a=0 > m > a=1 > hold",
    "gate:   > m > a=0 > hold"
]
```

- `<calque|global>: étape > étape …` ; **même nombre d'étapes partout**. La piste `global` bouge **tous** les calques
  (composée avec la leur) : y mettre l'entrée commune, le zoom « on traverse », la sortie. Un calque absent de `anim`
  suit seulement la globale. Plus d'oubli d'un calque dans un zoom.
- **La première étape est absolue** (`x= y= z= a=` ; vide = place peinte `0;0;1;1`) : erreur si elle est relative. Les
  suivantes sont **relatives à la précédente** : `y-0.5`, `z*3`, `a*0.5` (le chaînage est fait pour vous) ; ou absolues
  (`y=0`, `a=1`). `hold` ou vide = la précédente encore (pause). `repeat=N` répète l'étape en chaînant (pas répétés).
- `m` après une étape = le milieu (même rang sur toutes les pistes qui le marquent).
- **`on=x;y`** ou **`on=<calque>`** : le point autour duquel on zoome (défaut : centre du canevas ; calque : son centre
  peint). Gardé d'une étape à l'autre. Sur la globale, il évite de compenser le zoom par des `y` à la main.
À la construction, le tableau **composé** (globale × calque, `x;y;z;a` par étape) est affiché : on y lit le mouvement
sans rendu. **Erreurs** : première étape relative, pistes de longueurs différentes, `m` absent, au bord ou en désaccord,
calque décalé/zoomé au milieu (l'opacité y reste libre : une porte à deux images n'a aucune image tout opaque), calque
encore visible au début ou à la fin, `tag` manquant sur un calque.

**Tags** : chaque calque porte un `tag` dans `parallax.json`, qui dit ce qu'il représente et aide à trouver le problème.
- `border` : coupé sur **tous** ses bords, aucun bord de son image ne doit se voir (un fond, un contour). À ne mettre que
  si tous les bords sont concernés.
- `object` : tout autre calque ; ses bords sont des pixels transparents, il n'est pas coupé (un objet).

**Règles de rendu**, affichées à la construction en deux familles (il n'y a pas de moyen de les couper) :
- **pas intéressant** : on peut passer outre, mais plusieurs d'un coup, c'est bof. `simple-motion` (tous les calques
  bougent pareil), `simple-fade-in` / `simple-fade-out` (entrée ou sortie = un fondu égal), `center-zoom` (un zoom sans
  `on=` : il y a presque toujours une bonne raison de viser un point, rien n'est centré à 100 %).
- **bug visuel** : on doit en avoir **0**, ce sont de vrais problèmes. `pivot-jump` (point de zoom changé en plein
  zoom : le calque saute), `visible-border` (un calque `border` a un bord dans le canevas à une image clé où il est
  visible), `uncovered` (la boîte des calques opaques ne couvre pas le canevas au milieu, sans lire les pixels : un trou
  `erase` ou un calque à moitié opaque peut la déclencher à tort).

## 3. Assembler le `.ora`

Dans le `.ora`, le nom de chaque calque est le **script** que lit le moteur : `<nom> <image clé> <image clé> … [m]`,
séparés par des espaces. **C'est ce que `anim` produit** : on ne l'écrit à la main que pour un fichier sans `anim`
(ancien format, toujours lu).

```
porte 0;1;1;1 0;0;1;1 m 0;0;4;1 0;0;6;0
```

Quatre images clés : début hors du canevas (`y` 1), **milieu à sa place peinte** (`0;0;1;1`, suivi de `m`), puis
la sortie qui grossit et s'efface (`a` 0 à la fin). Le `m` suit la deuxième : le milieu tombe au tiers du parcours.
Le même, en `anim` : `"porte: y=1 > y=0 m > z=4 > z=6 a=0"`.

- L'ordre dans le `.ora` est celui d'un logiciel de dessin : le **plus haut** est devant.
- Un calque masqué est ignoré : s'en servir pour garder un brouillon.
- Chaque calque est positionné dans le canevas par son décalage `x`/`y` dans le `.ora` : c'est sa place peinte.
- Le canevas (taille du `.ora`) donne le rapport de la transition : le prendre au rapport de l'écran de jeu
  (816×444 comme les fonds, sauf raison contraire).
- Les calques sont rendus **un par un** comme des calques de parallaxe (METHOD §3, §4, avec la même chaîne de
  rendu, `towards` et `tint` du lieu). Les mettre à la même échelle que le canevas.

### Le dossier et la construction

Une transition se construit **comme un fond**, avec le même constructeur, dans
`raw_assets/mecard/transitions/<nom>/` :

```
parallax.json   sans "ranges" : c'est ce qui en fait une transition (pas de calque de réglages)
<calque>.pic.json …    un document par calque, peint tel qu'au milieu
preview.png     l'image fusionnée = le milieu de la transition, réécrite à chaque `npm run art:preview` (jamais par `art` ni `art:changed`, pas livrée)
```

Dans `parallax.json`, `size` est le canevas, `render` la chaîne commune (METHOD §4), `anim` l'animation (§2) et
`layers` les calques, avec un `name` simple (sans espace), **du plus haut (devant) au plus bas** :

```json
"anim": ["global: y=0.2 a=0 > y=0 a=1 m > z*4 a=0"],
"layers": [{"name": "wall", "picture": "wall.pic.json", "at": [0, 0]}]
```

Sans `anim`, le `name` porte les images clés (`"wall 0;1;1;1 0;0;1;1 m 0;0;4;1 0;0;4;0"`), ancien format.

```
npm run art:preview -- mecard/transitions/<nom>
```

écrit `generated_assets/mecard/transitions/<nom>.ora` (environ 10 s) **et met à jour `AssetPath.ts`** : le chemin est déjà
déclaré. `preview.png` montre le milieu, puisque les calques y sont à leur place peinte : s'il couvre tout le
fond et se lit bien, la transition est juste là où elle est cachée.

Les documents de calque ont la taille du canevas divisée par 3 (816×444 → 272×148) et se posent à `[0, 0]` :
une transition n'a pas de marge de mouvement, ses déplacements sont ses images clés. Les sources (images libres,
`parts/`, `sources/`, `SOURCES.md`) se rangent dans le même dossier, avec le même soin qu'un fond pour les licences.

## 4. Brancher et valider

1. **Le milieu se juge sur `preview.png`**, le mouvement **dans le jeu** (point 3). Pas de rendu image par image :
   c'est l'utilisateur qui teste le mouvement en jeu.
2. **Le chemin est déjà déclaré** par la construction (`AssetPath.ts`).
3. **L'utiliser** : une constante dans `core/src/games/mecard/sim/halt/transitions.ts` (le sim ne connaît que le
   chemin, jamais le fichier), puis la donner au type de lieu (`PlaceType.transition`) ou au combat.
   `placeTransitions()` (`ui/travel/placeLooks.ts`) la liste alors toute seule, sous le nom de son fichier.
4. **La jouer** dans le jeu lancé :
   ```
   debug transition <nom> [ms] [endroit|envers]
   ```
   Regarder : (a) l'écran est couvert au milieu, (b) rien ne surgit ni ne reste coincé au début et à la fin, (c) à
   `envers` c'est encore acceptable, (d) à 500 ms et à 3000 ms le geste tient encore. Les vérifier **dans le jeu
   qui tourne** : une image fixe ne montre pas un mouvement saccadé.
5. Le test des transitions (`test/src/engine/ui/widget/TransitionScript.test.ts`) couvre la lecture des noms ; les
   existences de fichiers se vérifient par les tests d'assets, pas dans le sim.

## Check-list

- [ ] scénario écrit, et le **milieu** décidé avant d'ouvrir un dessin
- [ ] calques peints tels qu'au milieu : `preview.png` couvre tout le fond
- [ ] `anim` écrite : ce que tous font ensemble dans `global` (zoom avec `on=` vers le point visé), le propre de
  chaque calque dans sa piste ; la construction n'affiche aucune erreur et le **tableau composé** se lit bien
- [ ] chaque calque a son `tag` (`border` seulement s'il est coupé sur tous ses bords)
- [ ] la construction annonce **0 bug visuel** ; les « pas intéressant » relus (plusieurs = bof)
- [ ] aucun bord nu visible pendant un déplacement (peint assez large)
- [ ] chaîne de rendu, `towards` et `tint` repris du lieu (METHOD §4)
- [ ] chemin déclaré, testé avec la commande `debug transition`, sources et licences notées

## Exemple complet : la porte de maison (`house-door`)

`raw_assets/mecard/transitions/house-door/` : une porte en bois dans un mur de maison en pierre, qui s'ouvre.

**Brief** : seuil d'une maison de pierre, pierres appareillées et mousse au pied, porte de planches à ferrures ;
brun-gris et or ; lumière d'en haut (270). Aucun fond derrière la porte : l'embrasure est évidée, on y voit
l'écran.

**Scénario** : le mur et la porte fermée apparaissent (c'est le milieu : le mur et la porte couvrent tout
l'écran) ; la porte s'ouvre vers nous ; on avance (le mur grossit autour de l'embrasure, le nouveau lieu se voit
par le trou) ; tout s'efface.

**Milieu** : placé **juste avant l'ouverture**, porte fermée. Le milieu peut donc tomber avant le geste principal :
ce qu'on choisit de peindre est l'instant où l'écran est couvert, le reste du geste vient après.

**Calques** (du devant au fond) et leur rôle :

| Calque | Contenu | Pourquoi un calque à lui |
|---|---|---|
| `leaf` | le battant ouvert, en trapèze (perspective) | la porte ouverte n'est pas la porte fermée : on ne peut pas tourner un calque |
| `door` | la porte fermée | fondue contre `leaf` pour figurer l'ouverture |
| `wall` | le mur, l'encadrement, **l'embrasure évidée** (`erase`) | on voit l'écran par le trou une fois la porte ouverte |

**Images clés** (7, `m` après la 3ᵉ ; milieu à 0,33) :

| Instant | wall | door | leaf |
|---|---|---|---|
| 0 début | y 0,15, a 0 | idem | idem |
| 1 entrée | y 0,05, a 0,7 | idem | a 0 |
| 2 **milieu** (`m`) | `0;0;1;1` | `0;0;1;1` | a 0 (n'existe pas encore) |
| 3 ouvre | en place | a 0,5 | a 0,5 |
| 4 ouverte | en place | **a 0** | **a 1** |
| 5 avance | z 3 | z 3 (a 0) | z 3 |
| 6 fin | z 8, **a 0** | a 0 | z 8, **a 0** |

### Ce que cet exemple a appris

- **Pas de rotation** : un calque ne fait que glisser, grossir et se fondre. Un battant qui s'ouvre = deux calques
  fondus l'un dans l'autre (fermé / ouvert en perspective), pas un battant qui tourne.
- **Zoom autour du centre du canevas** : pour que « on traverse » une embrasure, la centrer sur le canevas en x ;
  en y, elle dérive vers le bas en grossissant (le centre du zoom est celui du calque), c'est bien : on regarde
  vers l'intérieur.
- **Un trou se fait avec `erase`** dans le calque du mur : il laisse voir l'écran. Pas besoin d'un calque de fond
  derrière, mais alors **le milieu doit tomber quand le trou est bouché** (ici, porte fermée), sinon le
  changement de décor se voit à travers.
- **Le milieu n'est pas forcément le sommet du geste** : on le place où l'écran est couvert, et le geste continue
  après (ici, l'ouverture et la traversée viennent après `m`).
- **Un calque qui n'existe qu'après le milieu** (le battant ouvert) est à `a 0` à l'image clé du milieu et se fond
  ensuite : seule exception à `0;0;1;1` au milieu, puisqu'il n'est pas dans l'image peinte.
- **Toutes les fins à `a 0`** : à l'instant final plus rien n'est visible, quel que soit le zoom atteint.
- **Un encadrement plus clair que le mur** (même matériau, `odd` inversé) lit mieux que le même ton : à 3 pixels
  par texel, la différence de valeur compte plus que celle de teinte.
- **Un foyer** : un gros aplat de lumière devient un carré plat (METHOD, journal « lumière ») ; un petit foyer
  sombre avec une flamme ellipse se lit.

## Journal des révisions

- **Tags et classement des règles** : chaque calque a un `tag` (`border` / `object`), obligatoire. Les règles de rendu
  sont classées « pas intéressant » / « bug visuel » (0 visé) ; ajout de `center-zoom` et `visible-border` ; `reversal`
  et `ignore` supprimés (les étapes relatives ont réglé le premier, et couper un avertissement cachait les défauts).
  Les 11 transitions sont taguées (fonds, murs, anneaux de roche, ombres = `border`, le reste = `object`) : à relire.

- **Champ `anim`** : pistes d'étapes relatives, piste `global`, point de zoom `on=`, gardes du milieu et avertissements
  de rendu (voir §2). Cause : les zooms oubliaient des calques et les valeurs absolues cassaient le chaînage (herse
  qui redescendait). **Les 11 transitions sont converties** (`house-door`, `dungeon-door`, `gilded-door`,
  `warm-door`, `great-door`, `iron-bar-door`, `magic-portal`, `stone-bridge`, `cave-exit`, `cave-advance`,
  `spiral-stairs`) ; l'ancien format reste lu. En convertissant : les zooms communs passent dans `global` (les
  zooms qui différaient par calque deviennent un `z=` propre, relatif au zoom global), `cave-exit` zoome vers
  l'ouverture (`on=0.5;0.34`) au lieu de compenser par des `y`, `stone-bridge` entre maintenant par des calques
  tout à fait hors du canevas (le début devait être vide).

- **Porte à barreaux (`cage-door`), zoom global** : le zoom « on traverse » était sur le seul calque `wall`, donc
  les barreaux ne suivaient pas. Il passe dans `global` (`z*9 on=0.5;0.55`, centre de la porte lu sur le preview) et
  les calques ne gardent que leur geste propre (`bars: y-1`, la herse qui monte hors du canevas). Une seule étape de
  zoom (pas `4` puis `9`), précédée d'une pause (`hold`) pour que l'embrasure vide se lise ; la herse sort en une
  étape. Le tableau composé montre `bars` à `y -9.4` en fin : normal, le zoom multiplie son décalage.
- **Portail, v2** : le « zoom bizarre » venait de 7 étapes dont deux zooms successifs (`*4` puis `*2.25`, donc
  deux ralentis), de `z` propres absolus par calque (0,75 / 0,5 / 2,5…) qui divergeaient du zoom global, et d'un
  vortex absent au milieu (trou dans l'ellipse du portail). Refait en 4 étapes : entrée, milieu `m` (tout à
  `0;0;1;1`, vortex et runes compris), pause, **un seul** `z*8 on=0.5;0.5 a=0` ; seuls vortex et runes ont un
  petit `z*` relatif (1,4 et 1,25) pour l'effet d'aspiration. Le tableau composé le montre d'un coup d'œil :
  tous les calques finissent à 8 sauf ces deux-là. Lire ce tableau en premier pour diagnostiquer un zoom bizarre.
- **Escalier en colimaçon, v2** (refaite) : l'ancienne version (marches en bandes horizontales qui défilent) ne
  disait pas « colimaçon ». Nouveau scénario : vue plongeante dans la cage, on descend par un zoom centré. Milieu =
  puits elliptique de marches en éventail (anneau extérieur clair, anneau profond sombre, noyau central en briques)
  encadré de briques ; 5 calques (`newel`, `rim` bords à trou `erase`, `steps`, `deep`, `void` fond plein).
  Appris : (1) sans rotation, la spirale se lit par la **hauteur et le ton croissants d'une marche à l'autre**
  (`depth` et matériau suivent l'indice) et par l'assombrissement vers le centre ; (2) un puits rond sur écran
  large : étirer x (×1,35) pour l'ellipse, et le calque du fond doit être plein (le trou du `rim` ne montre jamais
  l'écran, le milieu couvre tout) ; (3) la profondeur du zoom vient de `z` propres par calque après `global`
  (`rim` ×2, `newel` ×1,8, `steps` ×1,4, `deep` ×1,1, `void` seulement le global) ; entrée `z` 0,45 à 1 et `a` 0,
  tous centrés par défaut, sans `on=`, le centre du puits étant celui du canevas ; (4) les calques se génèrent par
  un petit script (polygones en secteurs), à garder hors du dépôt.
- **Pont de pierre, v2** : le zoom visait le centre du canevas donc plongeait dans le sol ; `on=` vise maintenant le
  point de fuite (`global: ... z*2.5 on=0.5;0.39`, y = y du point de fuite / hauteur du document). Le bout du pont
  est avalé par un calque `fog` **opaque** : un aplat sombre au-dessus de l'horizon, puis des bandes de chaussée et
  de parapet (mêmes motifs `tiles`/`noise`, cellules plus fines, matériaux de plus en plus sombres) qui rejoignent
  le calque `bridge`, lequel est effacé (`erase`) au-dessus de la dernière bande. Appris : **tramer avec des trous
  d'alpha** (`noise` radius 0, `stripes` avec `null`) fait **contourner chaque pixel** par `outer_outline` (peigne
  ou grumeaux noirs) : jamais de brume en pixels épars ; un dégradé se fait en bandes opaques de plus en plus
  sombres. Un calque qui entre depuis le haut puis sort ne doit pas ensuite remonter : sortir par `a=0`.
- **Pont de pierre, v3** : la v2 avait un calque `fog` en aplat sombre sur tout le haut de l'écran (« la brume est
  horrible et couvre tout l'écran ») : le pont, les parapets et le vide étaient illisibles. Refait en vraie
  perspective, par un petit script (hors dépôt) qui écrit les `.pic.json` : un point de fuite (136, 50), un monde
  (largeur de chaussée, hauteur de parapet) et des **quadrilatères par tranche de distance `z`** (`x = 136 + lat*116/z`,
  `y = 50 + 98/z`), donc dalles, assises et merlons convergent vraiment. Le calque `bridge` ne va que jusqu'à `z` 4,4 ;
  le calque `end` (remplace `fog`) n'est qu'une **petite région autour du point de fuite** : 3 tranches opaques
  de plus en plus sombres (`z` 4 à 8) et une gueule noire au bout. Zoom `on=0.5;0.338` (y du point de fuite / 148).
  Appris : le noir plein écran se paie toujours en lisibilité, limiter l'ombre à ce qui est loin ; des plaques
  de dessus de merlon séparées font des « champignons », les omettre ; le vide du fond en bandes larges un peu plus
  claires vers l'horizon donne la profondeur sans brume.
- **Porte de donjon, v1** : mouvement saccadé en jeu, car le zoom était découpé en plusieurs images clés
  (`1 → 3 → 8`) et le lissage s'arrête à chacune ; règle ajoutée au §2 : un geste continu tient en une seule étape.
- **Transitions, v0** : document écrit d'après `Transition.ts` et `TransitionScript.ts`.
- **Porte de maison, v2** : refaite selon le « Principe » (milieu peint, entrée depuis le vide, sortie vers le
  vide). Plus de fond derrière la porte (`inside` et `glow` retirés) ; `m` placé juste avant l'ouverture, porte
  fermée, pour que le mur et la porte couvrent l'écran ; l'ouverture (fondu `door` → `leaf`) vient après le milieu.
  Le calque `leaf` est la seule exception à `0;0;1;1` au milieu (`a 0`).
- **Porte de maison, v1** :
  - le constructeur de parallaxe produit les transitions quand `parallax.json` n'a pas de `ranges` (aucun calque
    de réglages) ; l'indexation des assets déclare le chemin ;
  - 5 calques et 6 images clés suffisent pour un geste complet ;
  - **règle posée par l'utilisateur** : peindre le milieu (le `preview.png` le montre), images clés du vide à
    `0;0;1;1` puis au vide ; pas de test image par image (trop lourd), le mouvement se teste en jeu. Cet exemple,
    peint au repos, est à refaire dans ce sens.
- **Cave, calques plus grands que le canevas** : avec un `z` < 1 au début (0,35 à 0,85), le bord rectangulaire des
  calques apparaissait. Le milieu étant à `0;0;1;1`, on ne peut pas le corriger par une piste : on **peint chaque
  calque plus grand que le canevas** (3× : 816×444 en document, 2448×1332 px rendus) et on le pose avec un `at`
  négatif (`[-816, -444]`, en pixels rendus), centré, donc le zoom (autour du centre du calque) reste celui du
  canevas. Règle : marge ≥ `1/z_min` fois le canevas de chaque côté du centre (0,35 → 2,86×, pris 3×). Les formes
  se décalent du même `at` en unités de document (`+272`, `+148`) ; la roche texturée est prolongée sur tout le
  document. Le noir `black` est agrandi pareil. Le constructeur n'objecte pas à un calque plus grand que le canevas.
- **Cave (marche dans une cave), v2** : 5 anneaux de roche (`r1` devant à `r5` loin) au trou de plus en plus petit,
  plus un calque `black` plein dessous. Générés par un petit script (superellipse irrégulière : voûte arrondie,
  stalactites fines sur la voûte, quelques stalagmites au sol, `erase` du trou) puis un `.pic.json` par anneau.
  Mouvement : pas de `global`, chaque anneau a son zoom par étape (`q` de 1,7 pour le proche à 1,18 pour le
  lointain), 3 étapes avant le milieu (`1/q²`, `1/q`, `1`) et 3 après (`z*q`) : les arrêts du lissage font l'effet
  de **pas**, les proches grossissent plus vite que les lointains. Le noir s'allume dans l'entrée et ne fond
  qu'à la dernière étape. Appris : une bande « sol » en polygone bâti sur les mêmes points que le trou donne
  une barre horizontale (à éviter) ; des pointes tous les 3 points donnent une gueule, pas une cave (une pointe
  tous les 6, fines) ; les anneaux ne se distinguent que par la valeur : clair vers le fond, sombre devant.
