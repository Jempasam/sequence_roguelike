# Animations de coup (`raw_assets/mecard/fx/`)

Un coup (`Battle.strike` / `strikeMany`) peut porter un `Visual` dont la clé est **relative à ce dossier** :
`slash`, pas `fx/slash`. Le sim ne connaît ni le dossier ni les fichiers : l'UI résout la clé en
`mecard/fx/<clé>.png`. Sans visuel, ou sans image, l'UI dessine la zone du coup en polygone : rien n'est jamais
invisible ni cassé. Les constantes de visuels partagées par les cartes sont dans
`core/src/games/mecard/sim/card/subs/tools/blowLooks.ts`.

Chaque image est rendue depuis un `<nom>.pic.json` (skill `pixel-art`, `npm run art:changed`). Son JSON,
`<nom>.json`, suit l'image et décrit comment elle joue.

## Le JSON

```
{ "animation": { "form": "sweep", "impact": "impact", "trail": 2, "duration": 0.2 } }
```

Seul `form` est obligatoire, le reste a un défaut selon la forme. Toute clé inconnue ou valeur fausse est
refusée avec un message qui dit quoi écrire (`core/src/games/mecard/ui/look/fxAnimation.ts`).

| clé | sens |
|---|---|
| `form` | la forme, voir plus bas |
| `impact` | clé (sous `fx/`) d'une image de forme `hit`, jouée sur chaque unit touchée |
| `count` | traits (`claw`), chutes (`rain`), segments (`bolt`) |
| `spin` | degrés par seconde (`shot`) |
| `arc` | hauteur de la parabole en mètres, 0 pour un vol droit (`shot`) |
| `anchor` | pixel de l'image tenu fixe : `[x, y]`. Défaut : milieu de l'image pour `slam`, `bite`, `burst`, `shot`, `hit`, milieu du bord gauche pour les autres |
| `length`, `width` | taille utile du dessin en pixels, le long et en travers. Défaut : la case |
| `frames` | nombre de cases côte à côte dans l'image |
| `duration` | durée en secondes : la frappe **bloque la chaîne** pendant ce temps |
| `ease` | `linear`, `in`, `out`, `inout` |
| `fade` | part finale de la durée passée à disparaître, 0 pour rester net |
| `size` | `area` (épouse la zone), `fixed` (taille du dessin), `target` (taille de la cible) |
| `blend` | `alpha` ou `additive` |
| `trail` | copies de la lame laissées derrière elle (`sweep`) |
| `flip` | miroir quand le coup va vers la gauche |

## Les formes

| forme | usage | mouvement |
|---|---|---|
| `sweep` | épée, faux | la lame pivote d'un bord à l'autre de la zone, collée à son profil |
| `stab` | lance, dague | glisse jusqu'au bout de la zone puis revient |
| `slam` | marteau | tombe sur le milieu de la zone et s'écrase |
| `claw` | griffes | `count` traits parallèles, l'un après l'autre |
| `bite` | mâchoires | l'image deux fois en miroir, qui se referment |
| `burst` | massue, explosion | sur le milieu de la zone, grossit |
| `wave` | onde de choc | une marque par rayon, qui s'éloigne et s'estompe |
| `rain` | météores | `count` chutes à des endroits tirés dans la zone |
| `shot` | projectile, grenade | vole jusqu'au bout, tourne, monte avec `arc` |
| `stretch` | rayon, fouet | étiré de l'attaquant au bout |
| `bolt` | éclair | segments coudés, recoudés trois fois |
| `hit` | impact | posé sur chaque unit touchée, à sa taille |

Le hasard de `rain` et de `bolt` est de l'UI (`seededRandom`, une graine par coup joué).

## Variantes par tag

Le JSON d'un sprite d'unit (`raw_assets/mecard/units/<nom>.json`) peut porter `"tags"` : `walk`, `fly`, `crawl`,
`float`, `static` (déplacement) ; `soft`, `hard`, `ghost` (matière). On ne tague que les sprites qui diffèrent.
Pour un coup sur une unit taguée, l'UI cherche dans l'ordre :

1. `<nom>_<tag>` pour chaque tag de la cible (`slash_ghost`) ;
2. `<nom>` ;
3. la zone dessinée en polygone.

Une variante sans JSON reprend l'animation de `<nom>`.

## Teinte

La `coloration` du `Visual` recolore l'image : sa teinte remplace celle des pixels, leur luminosité et leur
saturation restent. Le blanc reste donc blanc, et un bleu pâle teinté en rouge donne du rose : une image faite pour
être teintée a des bords d'un bleu saturé. L'impact d'un coup prend la même teinte.

Les looks teintés sont dans `blowLooks.ts` (démoniaque, assassin) et `spellLook` (`tools/bolt.ts`) teinte le sort
avec la couleur de son élément.

Les lames (`slash`, `thrust`, `claws`) et le sort n'ont pas de contour : leur chaîne de rendu est
`alpha_thickness` puis un `gloom` léger, qui donnent un bord translucide. Une `light` forte les délave vers le blanc.

Un coup qui ne blesse pas passe par `Battle.showBlow`.

## Les voir

`debug anim [coup]` dans la console : le coup frappé en boucle d'une unit sur une autre, avec la teinte, la forme de
zone, la portée, la distance et la vitesse (jusqu'à 0,05) au choix. Le panneau dit quelle image a été trouvée et son rang
dans la chaîne, et si le coup est en lecture, en pause ou terminé. `Jouer` relance le coup, `Pause` le fige,
`Pas` avance d'une image (1/60 s), `Boucle : non` arrête la répétition automatique.
Les tests `test/src/games/mecard/ui/look/fxAssets.test.ts` vérifient que chaque visuel déclaré existe, que chaque
JSON est valide et que chaque variante a son image de base et une unit qui porte le tag.
