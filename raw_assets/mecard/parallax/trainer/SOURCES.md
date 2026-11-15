# Sources du fond « dresseur »

Cages, barreaux, enclos et cadre sont en formes élémentaires ; les trois bêtes viennent d'images libres
(Wikimedia Commons), converties en PNG dans `sources/` puis importées dans `parts/`.

| Bête | Fichier | Image | Auteur | Licence |
|---|---|---|---|---|
| Chien (cage de gauche) | `sources/husky.png` | [Sibirischer Husky (Doug).jpg](https://commons.wikimedia.org/wiki/File:Sibirischer_Husky_(Doug).jpg) | TomK32 (de.wikipedia) | Domaine public |
| Aigle (cage de droite) | `sources/eagle.png` | [Bald Eagle flying.jpg](https://commons.wikimedia.org/wiki/File:Bald_Eagle_flying.jpg) | Kissmykumbaya | CC0 |
| Monstre à cornes (enclos) | `sources/highland.png`, détourée en `sources/highland-cow.png` | [Highland-cattle-1161694.jpg](https://commons.wikimedia.org/wiki/File:Highland-cattle-1161694.jpg) | Miquel Rosselló Calafell | CC0 |

`highland-cow.png` : la vache de devant, découpée par un polygone tracé à la main (le fond d'herbe ne se retire pas
par une couleur), le reste transparent.

Imports :

```
import sources/husky.png --crop 150,40,1000,950 --width 54 --materials 2 --key "#dde4ee" --tolerance 75 --depth 4,8 -o parts/dog.pic.json
import sources/eagle.png --crop 360,170,600,360 --width 56 --materials 2 --key "#c8ccd2" --tolerance 60 --depth 4,8 -o parts/bird.pic.json
import sources/highland-cow.png --width 90 --materials 3 --depth 3,8 -o parts/beast.pic.json
```
