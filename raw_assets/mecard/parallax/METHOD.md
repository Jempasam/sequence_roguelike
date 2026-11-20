# Méthode des fonds de parallaxe

Base commune pour refaire chaque fond. Document vivant : chaque fond refait corrige la méthode (voir le journal
en fin de page). Exemple complet : `raw_assets/mecard/parallax/butcher/`.

Le jeu lit `generated_assets/mecard/parallax/<id>.ora` (816×444) avant les png de `assets/mecard/parallax/<id>/`, par
`loadParallaxPictures` (`core/src/games/mecard/ui/travel/parallaxPictures.ts`).

## Déroulé

1. Écrire le brief (§1) et le découpage en plans (§2).
2. Créer le dossier (§ Fichiers), copier `parallax.json` du boucher, changer `towards` et `tint` (§4).
3. Construire les calques du fond vers l'avant (1 → 5), chacun mis au point seul (§ Mettre au point un calque).
4. `npm run art:preview -- mecard/parallax/<id>` (le seul à écrire `preview.png`), regarder `preview.png`, retoucher.
5. Valider dans le jeu (§5), puis noter dans le journal ce que ce fond a appris.

## Fichiers

```
raw_assets/mecard/parallax/<id>/
  parallax.json     la chaîne de rendu, les plages et les calques
  1.pic.json …      un document par calque, 1 = le fond, 5 = le cadre
  parts/            objets posés dans les calques (images importées, objets dessinés)
  sources/          images libres d'origine, en PNG
  SOURCES.md        origine et licence de chaque image libre
  preview.png       l'image fusionnée, réécrite à chaque `npm run art:preview` (jamais par `art` ni `art:changed`, pas livrée). Temporaire : à supprimer une fois le fond fini
```

`npm run art -- mecard/parallax` rend chaque calque avec le projet `picture` (`../picture/bin/picture.js`, ou la
variable `PICTURE`) et assemble `generated_assets/mecard/parallax/<id>.ora`. Un dossier qui contient un `parallax.json` est un
tableau : ses `.pic.json` ne deviennent pas des png séparés.

### parallax.json

```json
{
    "size": [816, 444],
    "ranges": "d=20:85,20:40 w=0:0",
    "render": { "light": 270, "steps": [ "…voir §4…" ] },
    "layers": [
        {"name": "5", "picture": "5.pic.json", "at": [-24, -24]},
        {"name": "4", "picture": "4.pic.json", "at": [-24, -24]},
        {"name": "3", "picture": "3.pic.json", "at": [-24, 15]},
        {"name": "2", "picture": "2.pic.json", "at": [-24, -24]},
        {"name": "1", "picture": "1.pic.json", "at": [-24, -24]}
    ]
}
```

- `ranges` : le calque de réglages `parallax [...]` (distance `d` et déformation `w`, du plus loin au plus près).
- `maxError` (optionnel, 0,02 par défaut) : chaque image du tableau est rangée en couleurs indexées, avec sa
  propre palette de 256 couleurs au plus, et le moins de couleurs possible tant qu'aucune couleur rendue ne
  s'écarte de plus de `maxError` (distance OKLab) de son remplacement. Le remplacement est une couleur de la
  palette, ou un tramage ordonné entre deux couleurs voisines. La construction affiche, pour chaque calque, le
  nombre de couleurs gardées et l'écart atteint ; `preview.png` montre le résultat indexé. Monter `maxError`
  allège le fichier ; le baisser si un dégradé se met à trembler.
- `render` : la chaîne de rendu de **tous** les calques (§4) ; les documents n'en portent pas.
- `layers` : du plus proche au plus lointain, comme un logiciel de dessin les liste. Chacun :
  - `name` : son nom dans le tableau ; `settings` (optionnel) : ses réglages propres, comme `"w=-0.1"`, écrits
    `5 [w=-0.1]` ;
  - soit `picture` (un document du dossier) et `at` (son coin haut gauche sur le canevas, en pixels),
  - soit `from: {"ora": "mecard/parallax/x.ora", "layer": "nom exact"}` pour reprendre un calque d'un autre
    tableau, à sa place.

## 1. Brief

Avant toute image, quelques lignes :
- le lieu, en une phrase ;
- 3 à 5 objets signature qui le font reconnaître au premier coup d'œil ;
- la couleur dominante et l'ambiance : elles donneront `towards` et `tint` (§4) ;
- la source de lumière : elle donne le `light` de la chaîne (270 = d'en haut).

Exemple, le boucher : arrière-boutique un peu inquiétante ; carcasses sur un rail à crochets, billot et
couperet, mur carrelé taché, étal ; rouge sombre et blanc sale ; lampe suspendue, d'en haut.

## 2. Découpage en 5 plans

Numérotés comme dans `alchemist.ora` : **1 = le plus lointain, 5 = le plus proche**.

| Calque | Contenu | Exemple du boucher |
|---|---|---|
| 1 | mur, sol, porte : couvre tout | carrelage, soubassement rouge, plancher, porte |
| 2 | meubles du fond | armoire, étal carrelé, viande, balance |
| 3 | objet central, le plus reconnaissable | rail et carcasses |
| 4 | premier plan, dans les coins | lampe, billot, couperet |
| 5 | cadre, construit pour chaque fond, avec un détail du lieu | planches, ferrures rivetées, rail à crochets |

**Taille commune** : chaque document fait 288×164 pixels ; le rendu les triple (864×492), posés à `"at": [-24, -24]`,
soit 24 px de marge autour du canevas pour le mouvement. Coordonnée sur le canevas = (coordonnée dans le document
− 8) × 3. Donc :
- le canevas visible va de 8 à 280 en x et de 8 à 156 en y dans le document ;
- le cadre (calque 5) occupe environ 20 px de chaque bord : rien d'important du contenu au-dessus de y ≈ 22
  ni sous y ≈ 142 ;
- les ornements du cadre se placent à partir de 9, sinon le bord du canevas les coupe ;
- pour décaler tout un calque, changer son `at` dans `parallax.json` plutôt que son document.

## 3. Construire un calque

Un document de calque :

```json
{
    "size": [288, 164],
    "seed": 4,
    "palette": ["#d8d2c0", "#5a3a24", "#2e2018", {"color": "#a83a30", "reflection": 0.3}],
    "shapes": [
        {"box": [104, 96, 96, 36], "fill": {"pattern": "tiles", "cell": [6, 6], "grout": 1, "materials": [0, 2]}, "depth": 4},
        {"ellipse": [112, 84, 22, 9], "material": 3, "depth": [6, 8], "relief": "dome"}
    ]
}
```

Autant de matériaux que nécessaire par calque (`palette`, 36 au plus ; les rangées de pixels les nomment `0`–`9` puis `a`–`z`). Seul l'éditeur web de `picture` ne charge que 4 matériaux. Les formes sont posées
dans l'ordre, la suivante recouvre la précédente. `seed` fixe le hasard des motifs.

Pour chaque élément, choisir la source dans cet ordre :
1. **Motif généré**, pour les surfaces : une forme avec `"fill": {"pattern": …, "materials": [...]}` au lieu de
   `"material"`. `tiles` (carrelage ; `offset: 0.5` pour des briques), `planks`, `noise` (taches ; un matériau
   `null` laisse voir ce qui est dessous), `stripes`. Leurs options : `picture list patterns`.
2. **Formes élémentaires**, pour les objets construits (armoire, étal, billot, rail, porte, lampe) : `box [x,y,w,h]`,
   `ellipse [x,y,w,h]`, `polygon [[x,y],…]`, `line [x1,y1,x2,y2]` (+ `width`). Un motif peut habiller une face
   (planches sur une porte d'armoire). `"erase": true` découpe (le trou du couperet).
3. **Image libre** (CC0 ou domaine public, Openverse / Wikimedia Commons), **obligatoire pour le vivant et
   l'organique** : animaux, créatures, crânes et os, plantes et feuillages, nourriture (carcasse, jambon). Les formes
   élémentaires y donnent des silhouettes naïves ; ne revenir aux formes que si aucune image ne convient, et le dire :
   - la convertir en PNG dans `sources/` (PowerShell `System.Drawing` pour un jpg) ;
   - `picture import sources/x.png --crop x,y,w,h --width N --materials 3 --key #rrggbb --tolerance T --depth a,b -o parts/x.pic.json`
     (`--key` + `--tolerance` : le fond à retirer ; les matériaux sortent du plus sombre au plus clair) ;
   - la poser par une forme `{"picture": "parts/x.pic.json", "at": [x, y], "materials": [...], "flip": true}` :
     `materials` réattribue ses couleurs à celles du calque (une photo noir et blanc devient de la viande), on la
     pose autant de fois qu'on veut ;
   - noter la source et la licence dans `SOURCES.md`.
4. **Dessin pixel-art** (`.pic.json` à la main, skill pixel-art), pour ce qui manque ou se lit mal ; à poser
   comme une image importée.

### Profondeur

Ne pas tout confier à `auto_depth`, qui arrondit tout pareil :
- formes : `"depth": [bord, cœur]` (0 à 10) et `"relief"` : `flat`, `bevel` (+ `"bevel": px`), `round-x`
  (cylindre vertical : billot, poteau), `round-y` (rail, plinthe), `dome` (poignée, ampoule, pièce de viande) ;
- motifs : ils creusent eux-mêmes (joints à −1) ;
- images posées : profondeur tirée de la luminosité à l'import (`--depth sombre,clair`), relevée par le `depth`
  de la forme ;
- plus un objet est proche, plus sa profondeur est haute : fond 2–3, meubles 3–6, premier plan 6–9, cadre 5–10.

### Matériaux

`light` pour ce qui éclaire (ampoule), `reflection` pour le métal et le carrelage. Pas de couleur pour figurer
une ombre ou un reflet : le rendu les calcule.

### Mettre au point un calque

```
node ../picture/bin/picture.js generate raw_assets/mecard/parallax/<id>/3.pic.json -p ./chaine.json -o essai.png -s 1
```

`-p` avec la chaîne de `parallax.json` copiée dans un fichier, pour le voir comme dans le tableau ; `-p color`
pour le dessin seul, `-p depth` pour la profondeur. `picture shapes x.pic.json -o y.pic.json` écrit la grille de
pixels d'un document à formes, pour la retoucher à la main.

### Référence des formes

Champs communs à toute forme :

| Champ | Rôle |
|---|---|
| `box` / `ellipse` `[x, y, w, h]` | rectangle / ellipse inscrite dans ce rectangle |
| `polygon [[x, y], …]` | polygone quelconque |
| `line [x1, y1, x2, y2]` + `width` (1) | trait |
| `picture "parts/x.pic.json"` + `at [x, y]` | pose un autre document ; `materials` remappe ses indices vers ceux du calque (`null` les retire), `flip: true` le retourne, `depth` (un nombre) relève sa profondeur |
| `material` | indice dans la palette (0 par défaut) |
| `fill {pattern, materials, …}` | motif au lieu d'un matériau ; `materials` : indices de la palette (`null` = laisser voir dessous) |
| `depth` | un nombre, ou `[bord, cœur]` ; absent : garde la profondeur de ce qui est dessous (taches) |
| `relief` | `flat` (défaut), `bevel` (+ `bevel`, 1), `round-x`, `round-y`, `dome` |
| `erase: true` | vide les pixels couverts |

Motifs (`materials` dans l'ordre indiqué, valeurs par défaut entre parenthèses) :

| Motif | `materials` | Options |
|---|---|---|
| `tiles` | carreau, joint, carreau différent | `cell [w, h]` (6, 6), `grout` (1), `offset` (0 ; 0,5 = briques), `odd` (0, part de carreaux différents), `groutDepth` (−1) |
| `planks` | bois, joint, planche différente | `width` (4), `axis` (`"x"` horizontales, `"y"` verticales), `joint` (1), `seams` (0,5, chance d'un joint transversal), `odd` (0), `unevenness` (0), `jointDepth` (−1) |
| `noise` | fond, tache, tache 2 | `density` (0,1, part de surface couverte), `radius` (0 = pixels isolés), `bump` (0) |
| `stripes` | bandes, en boucle | `width` (2), `axis`, `depths` (décalage par bande) |

Taches sur une surface déjà posée : une forme par-dessus avec
`"fill": {"pattern": "noise", "density": 0.012, "radius": 2, "materials": [null, 2]}` et sans `depth`.

### Référence de l'import

```
# jpg → png réduit (PowerShell)
Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile("x.jpg"); $b=New-Object System.Drawing.Bitmap $i,612,816; $b.Save("sources\x.png",[System.Drawing.Imaging.ImageFormat]::Png)
```

| Option | Rôle (défaut) |
|---|---|
| `--crop x,y,w,h` | ne prendre que ce rectangle de l'image |
| `--width N` | largeur du document en pixels, la hauteur suit (32) |
| `--materials N` | nombre de couleurs, 1 à 4 (4) |
| `--key #rrggbb` + `--tolerance T` | couleur de fond rendue vide, et à quelle distance (40, sur 0–255) ; la transparence du PNG compte aussi |
| `--depth sombre,clair` | profondeur donnée aux pixels les plus sombres et les plus clairs (3,8) |

Exemple réel, la carcasse du boucher (photo de carcasses claires sur fond sombre) :

```
node ../picture/bin/picture.js import raw_assets/mecard/parallax/butcher/sources/sheep-carcasses.png --crop 228,90,165,680 --width 22 --materials 3 --key "#202020" --tolerance 110 --depth 4,8 -o raw_assets/mecard/parallax/butcher/parts/carcass.pic.json
```

puis, dans le calque 3, posée trois fois : `{"picture": "parts/carcass.pic.json", "at": [91, 11], "materials": [0, 2, 1], "flip": true}`
(sombre → rouge sombre, moyen → gras, clair → viande).

## 4. Rendu

La chaîne de base, dans `"render"` de `parallax.json` :

```json
{
    "light": 270,
    "steps": [
        "occlusion",
        "shadow",
        "reflection",
        {"id": "contrast", "between": 0.7, "towards": "#7a5a4c"},
        "alpha_thickness",
        {"id": "outer_outline", "different_mat": true},
        "casted_shadow",
        "gloom",
        "smooth",
        {"id": "tint", "color": "#c01818", "amount": 0.12}
    ]
}
```

C'est `smooth_complete` avec deux étapes en plus :
- **`contrast`**, avant le contour : rapproche la teinte moyenne de chaque matériau de `towards`, en gardant
  `between` (0,7) de leur écart ; l'ombrage dans un matériau est gardé. Le contour reste ainsi le seul gros
  contraste. `towards` est une teinte de l'ambiance du lieu, la même pour tous les calques (sans elle, chaque
  calque irait vers sa propre moyenne). 0,5 délave trop.
- **`tint`**, tout à la fin, pour teinter aussi le contour : un léger filtre de la couleur du lieu.

Ce qui éclaire (`light`) n'est touché par aucune des deux.

Par fond, ne changent que `light`, `towards` et `tint.color` (boucher : 270, `#7a5a4c` brun-rouge, `#c01818` rouge).

## 5. Validation

1. Construire avec `npm run art:preview -- mecard/parallax/<id>`, puis regarder `preview.png`.
2. `debug parallax <id>` dans le jeu lancé, pour le mouvement.
3. Les anciens png de `assets/mecard/parallax/<id>/` restent jusqu'à accord, puis sont supprimés.
4. **Une fois le fond fini, supprimer `preview.png`** du dossier (il n'est ni livré ni utile, et chaque `art:preview` le réécrit).

## Journal des révisions

- **Boucher, v1** : formes élémentaires avant la conversion d'image pour les objets construits ; la profondeur est
  écrite par les générateurs au lieu de passer par `auto_depth`.
- **Boucher, v2** :
  - numérotation de `alchemist.ora`, 1 = fond et 5 = cadre (la v1 l'avait inversée) ;
  - une même taille de 288×164 pour tous les calques, ce qui rend l'alignement trivial ;
  - une photo noir et blanc convient très bien pour une carcasse : seuls la silhouette et le relief comptent, les
    couleurs se réattribuent ;
  - taches de sang en `noise` : densité autour de 0,01 sur un mur, au-delà ça fait du papier peint.
- **Boucher, v3** : le cadre est construit pour chaque fond, plus repris de l'alchimiste ; ses ornements à partir
  de 9 dans le document, sinon coupés.
- **Boucher, v4** : chaîne de rendu commune dans `parallax.json`.
- **Boucher, v5** : le contraste gênant est celui **entre matériaux**, pas l'ombrage : étape `contrast`,
  `between` 0,7.
- **Boucher, v6** : un léger filtre de la couleur du lieu en dernière étape (`tint`, 12 %).
- **Taverne, v1** :
  - tout en formes élémentaires, sans image libre : tonneaux couchés = ellipses `dome` en `planks` verticales,
    chopes = petite boîte `round-x` + mousse claire ;
  - la lumière (`light`) sert aussi de feu : un polygone en flammes dans l'âtre ;
  - un ornement au centre du cadre (enseigne) cache ce qui pend du plafond derrière : faire descendre la lampe
    sous y ≈ 30.
- **Vingt fonds, v1** (alchimiste à sorcière, faits en parallèle) :
  - **lumière** : un grand aplat `light` à 0,9 devient une tache blanche, et `tint` ne la teinte pas. Garder 0,9
    pour le petit élément central (flamme, arc), 0,5–0,6 pour le décor lumineux (fenêtres, liquides, cristaux), et
    une grande surface lumineuse en matériau normal vif. Deux sources `light` voisines se fondent en une seule ;
  - **`contrast`** délave les blancs et les couleurs vives vers `towards` : prendre des blancs très clairs
    (`#fffdf4`) et des couleurs plus vives que voulu ; pour une ambiance sombre, des matériaux de fond nettement
    plus sombres que l'objet central. Les matériaux se distinguent par la valeur plus que par la teinte ;
  - **emprises** : décider avant de dessiner la zone x de chaque objet des calques 2 à 4 ; le calque 4 va dans les
    coins, hors de l'objet du calque 3 ; un objet du calque 1 (fenêtre, cristal) se pose dans un vide des calques
    de devant ; un objet ne se pose qu'une fois, dans un seul calque ; rien d'important à x > 264 ;
  - **ornement central du cadre** (y 10 à 30) : il cache ce qui est derrière ; faire commencer l'objet mural sous
    y ≈ 45 et pendre les lampes dessous ou de côté ;
  - **formes** : évider (croissant, anneau, fer à cheval) par une forme puis une `erase` décalée ; une étoile ou un
    pentagramme en `line`, jamais en `polygon` qui se recoupe ; une surface horizontale naturelle (lac, colline) en
    polygone aux bords ondulés ; un objet posé a toujours un support visible ; la silhouette fait l'objet
    (enclume : table large, taille étroite, pied évasé ; coffre : couvercle en arche ; globe : pied, axe incliné,
    continents) ; une forme répétée complexe (engrenage) se génère par un petit script qui écrit le JSON ;
  - **motifs** : étoiles en `noise` `radius` 0 à densité 0,0025–0,005 ; ciel dégradé en `stripes` larges (14) ;
    un tas de pièces en `dome` empilés couverts de `tiles` fines (4×3, `offset` 0,5) ; pas de matériau à
    `reflection` dans un `noise` (taches blanches) ;
  - **extérieur** : 1 ciel et lointain, 2 troncs ou rochers du fond, 3 élément central, 4 premier plan, 5 cadre ;
  - **construction** : `npm run art -- mecard/parallax/<id>` prend environ 2 minutes, la lancer avec un long délai.
- **Sorcière v2, dresseur, stratège, tisserand, nécromancien** :
  - changer la teinte d'un fond = changer palettes, `towards` et `tint`, sans toucher aux formes ; éclaircir alors
    les objets et assombrir le mur, et garder une petite touche de couleur complémentaire contre le monochrome ;
  - une créature en cage : matériau mat bien plus clair que l'intérieur de la cage, jamais de `reflection` ;
  - un damier en `box` explicites, pas en `tiles` + `odd` (aléatoire) ; une toile tissée en `stripes` larges avec
    `depths` ; des fils tendus en `stripes` fines avec un matériau `null` ;
  - deux lumières de couleurs différentes dans un calque coûtent deux matériaux.
- **Menu principal** (9 calques, extérieur lumineux, calques à 6 à 11 matériaux) :
  - plus de 4 matériaux par calque est permis (ombre et lumière d'une montagne, plusieurs verts, bois/pierre/toit
    séparés) ; seul l'éditeur web de `picture` en charge 4 ;
  - `contrast` à 0,7 délave un extérieur clair : 0,9 garde les couleurs ;
  - un rocher se lit mieux en polygone irrégulier habillé de `tiles` (`offset` 0,5) qu'en ellipse `dome`, avec une
    crête claire et un cadre de pierres claires autour de l'entrée ;
  - un dégradé de ciel : une `box` par teinte, une bande de `stripes` fines (`width` 2, `axis` `"x"` pour des bandes
    horizontales) à chaque jonction ; `axis` `"y"` donne des bandes verticales.
- **Images libres (dresseur, dompteur, fonds génériques)** :
  - chercher par l'API de Commons (`generator=search`, namespace 6, `iiprop=extmetadata`, garder
    `LicenseShortName` CC0 ou Public domain), avec un User-Agent et en espaçant les requêtes (limite de débit,
    surtout à plusieurs) ; regarder une planche de miniatures avant de télécharger ;
  - choisir un sujet sur fond uni (ciel, neige, blanc, scan) : `--key` ne retire pas l'herbe ni un décor varié.
    Sinon détourer d'abord vers un PNG transparent (polygone à la main ou seuil de couleur, PowerShell
    `System.Drawing`) : l'import respecte la transparence ;
  - pour les petites tailles, un SVG CC0 (Openclipart, rendu par `Special:FilePath/<f>.svg?width=N`) se lit mieux
    qu'une photo ; un crâne ou une bête se prend de face ou de trois quarts, un profil ne se lit plus à 40 px ;
  - une créature recolorée : matériaux clairs bien plus clairs que voulu (`contrast`), l'ombre dans le matériau
    de fond (`materials [0,2,3]`), jamais de `reflection` ; une silhouette noire doit se poser sur un fond clair uni ;
  - un pain, un fruit : matériau mat, `--depth N,N` constant, sinon il pétille.
