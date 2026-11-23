# Kit report

Winrate de chaque kit en **équipe de 2 avec l'Épéiste**, contre un combat tiré au hasard parmi les quatre biomes (couches 0 à 3).

## Commande

```
npm run cli --silent -- sim --match "{kits}+kit:Épéiste/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --games 200 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

- 54 kits, 200 combats chacun : 10 800 combats en 21,7 minutes (12 threads).
- IA par défaut (`kit=smart`, `monster=deck`), `--seed 1`, `--soft-win`, arène vide (aucun hazard).
- Aucun timeout.
- L'Épéiste joue aussi la ligne « Épéiste » : il a alors un deuxième Épéiste comme coéquipier.

## Lire la marge

La marge (±) est celle de l'intervalle de confiance à 95 %, en points de pourcentage. Deux kits dont les intervalles se chevauchent ne se distinguent pas. Avec 200 combats, la marge va de ±1 à ±6 points par kit ; sur le total, elle est de ±0,6.

## Résultats

Triés par winrate décroissant.

| Kit | Winrate | Marge (±) | Rounds |
|---|---|---|---|
| Martyr | 99,5 % | 1,3 | 5,1 |
| Bagarreur | 97,0 % | 2,5 | 5,9 |
| Chevalier noir | 96,5 % | 2,7 | 5,3 |
| Démoniste | 96,0 % | 2,8 | 4,5 |
| Géomancien | 96,0 % | 2,8 | 6,0 |
| Gobelin Explosif | 96,0 % | 2,8 | 4,8 |
| Chronomancien | 95,5 % | 3,0 | 4,9 |
| Pêcheur | 95,5 % | 3,0 | 5,8 |
| Berserker | 94,5 % | 3,2 | 5,2 |
| Cavalier | 94,5 % | 3,2 | 5,1 |
| Druide | 94,5 % | 3,2 | 6,6 |
| Épéiste | 94,5 % | 3,2 | 6,4 |
| Chevalier | 94,0 % | 3,4 | 6,6 |
| Pyromancien | 94,0 % | 3,4 | 5,4 |
| Acrobate | 93,5 % | 3,5 | 5,4 |
| Samurai de l'ombre | 93,5 % | 3,5 | 5,3 |
| Mage des plantes | 93,0 % | 3,6 | 6,2 |
| Prêtre | 93,0 % | 3,6 | 8,3 |
| Saigneur | 93,0 % | 3,6 | 6,4 |
| Canonnier | 92,5 % | 3,7 | 5,8 |
| Archère | 91,5 % | 3,9 | 4,7 |
| Assassin | 91,0 % | 4,0 | 4,7 |
| Médecin de la peste | 91,0 % | 4,0 | 7,1 |
| Voleur d'ombre | 91,0 % | 4,0 | 4,6 |
| Duelliste | 90,5 % | 4,1 | 5,5 |
| Grand Méchant Loup | 90,5 % | 4,1 | 6,0 |
| Lancier | 90,5 % | 4,1 | 4,7 |
| Mécanicien | 90,5 % | 4,1 | 6,2 |
| Spectre | 90,5 % | 4,1 | 5,8 |
| Ingénieur de tourelles | 89,5 % | 4,3 | 6,3 |
| Sorceleur | 89,5 % | 4,3 | 6,6 |
| Chasseur | 89,0 % | 4,4 | 4,2 |
| Gravitationniste | 89,0 % | 4,4 | 5,8 |
| Guerrier bête | 89,0 % | 4,4 | 5,8 |
| Piquier | 89,0 % | 4,4 | 5,5 |
| Prestidigitateur | 89,0 % | 4,4 | 8,2 |
| Taxidermiste | 88,0 % | 4,5 | 6,4 |
| Mage | 87,0 % | 4,7 | 6,2 |
| Torero | 86,5 % | 4,7 | 7,1 |
| Marionnettiste | 85,5 % | 4,9 | 6,8 |
| Artificière | 85,0 % | 4,9 | 5,9 |
| Sorcier des marais | 85,0 % | 4,9 | 6,9 |
| Cheval | 84,0 % | 5,1 | 8,2 |
| Hypnotiseur | 84,0 % | 5,1 | 7,6 |
| Lame-mage | 83,0 % | 5,2 | 6,0 |
| Mage des bulles | 83,0 % | 5,2 | 7,4 |
| Chaman | 82,5 % | 5,3 | 6,3 |
| Apothicaire | 81,5 % | 5,4 | 7,0 |
| Souffleur de bulles | 81,5 % | 5,4 | 6,3 |
| Spirite | 81,5 % | 5,4 | 6,8 |
| Taximage | 81,5 % | 5,4 | 7,2 |
| Tempétiste | 81,5 % | 5,4 | 7,1 |
| Joueur d'échecs | 78,0 % | 5,7 | 8,0 |
| Homme de verre | 69,5 % | 6,3 | 7,0 |
| **Total (10 800 combats)** | **89,4 %** | **0,6** | **6,1** |

## Lecture

- **Homme de verre** est le seul vrai point faible (69,5 %, ±6,3). Joueur d'échecs (78 %) est le suivant.
- **Martyr** est tout en haut (99,5 %).
- Le reste est regroupé entre 81 % et 96 % ; beaucoup d'écarts restent à l'intérieur de la marge d'erreur.
- Un premier essai à 20 combats par kit (marge de ±8 à ±20 points) donnait des valeurs très différentes pour plusieurs kits (Mage 100 % contre 87 % ici, Cheval 60 % contre 84 %, Tempétiste 95 % contre 81,5 %) : il était dominé par le bruit.
