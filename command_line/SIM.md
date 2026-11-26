# `sim` : combats aléatoires en masse

Une seule commande, une seule simulation : on **décrit des combats** (qui joue de chaque côté, avec quelles sources), `sim` en joue des centaines de chaque sorte, et le résultat est un tableau : une **ligne** par combat décrit, une **colonne** par statistique demandée. Résumé des options : `npm run cli -- sim --help` (et `sim --help match | out | define | ai`).

```
npm run cli -- sim --match "<alliés>/<adversaires>" [options]
```

## Lire le tableau

- Une ligne est un combat décrit par `--match` (ou l'un des combats que ses `{}` énumèrent). Sa première colonne, par défaut, est le **winrate** = victoires / (victoires + défaites + nuls), du côté des alliés (le côté gauche du `/`).
- `--out` choisit les colonnes : `n` (nombre de combats), `ci` (marge de l'intervalle de confiance à 95 %, en points de pourcentage), `draws`, `timeouts`, `rounds` (moyens), `errors` (effets en erreur), `wins`, `softwins`, `losses`, `softlosses`. `total` n'est pas une colonne : il ajoute une dernière ligne avec tous les combats du tableau réunis.
- **Timeout** : un combat encore en cours après `--max-rounds` (60), ou bloqué (`--stall` rounds de suite sans qu'aucune unité ne gagne ni ne perde de vie : par exemple deux unités qui ne se rencontrent jamais). Il est compté à part, hors du winrate. Beaucoup de timeouts signalent un pilotage qui ne finit pas les combats (voir `--ai`).
- **L'arène est vide** : `sim` ne pose aucun hazard (pilier, mur, canon, etc.), même pour un combat tiré d'un biome (`--fight`). Les hazards sont ceux d'un combat du jeu (`list hazards`, `list fights`) et ne sont pas encore joués ici.
- Les lignes sont indépendantes : même `--seed`, même résultat, quelles que soient les autres lignes ou descriptions. La graine d'une ligne ne dépend que de **qui joue** (les combattants de la ligne), pas de la façon dont c'est écrit.

## `--match` : décrire les combats

`--match` s'écrit **alliés/adversaires** (un seul `/` hors parenthèses). Chaque côté est une liste de **sources** séparées par `+`. `--match` est répétable : les lignes de chaque description se suivent dans le tableau.

Rien n'est tiré ni complété sans l'écrire : `kit:Pêcheur` face à une équipe de deux reste un Pêcheur seul. Pour des coéquipiers au hasard, on les écrit : `kit:Pêcheur+random:kits+random:kits`.

### Les sources

Une source propose un certain nombre de **combats** (`count`), et `get(i)` donne les combattants du combat n° `i`.

| Source | Combats | Les combattants du combat i |
|---|---|---|
| `Nom`, `kit:Nom`, `monster:Nom`, `pet:Nom` | 1 | ce combattant du jeu ; le préfixe est nécessaire si le nom est à la fois un kit et un monstre. `Nom*3` en met trois |
| `kit(Nom=…)`, `pet(Nom=…)` | 1 | un kit ou un familier **défini en place**, deck mélangé (voir « Kits et monstres à la volée ») |
| `monster(Nom=size:N,…)` | 1 | un monstre **défini en place**, deck trié : `size:N` (taille de la chaîne) est obligatoire et le deck est donné en entier, dans l'ordre où il se joue |
| `kits`, `monsters`, `pets`, `all` | taille du groupe | le i-ième membre du groupe (du jeu) |
| `fight:cave` (ou `forest`, `mine`, `hell`) | nombre de combats du biome | les monstres du combat i : un combat entier de la carte du biome (couches `--layer`, sorte `--fight`) |
| `biome:cave` (…) | nombre de monstres du biome | le i-ième monstre du biome, seul |
| `cross(A,B)` | `A × B` | les combattants de A puis ceux de B, tous les couples |
| `[A,B,C]` | somme | les combats de A, puis ceux de B, puis ceux de C (plusieurs sources en une) |
| `sum(A,B)` | le plus grand | les combattants du combat i de A et du combat i de B, **appariés** (au lieu de croisés) ; la plus courte repart du début quand elle est épuisée |
| `random:S` | 1 | un combat de S tiré au hasard ; il écarte les kits déjà pris tant qu'il y en a d'autres |
| `set:A:S` | celui de S | les mêmes que S, et **retient** le combat rendu sous le nom `A` pour ce combat |
| `get:A` | 1 | ce que `set:A` a retenu dans ce combat |
| `S*N` | celui de S | les combattants de S répétés N fois (N de 1 à 7) : des **copies**, d'un seul tirage |
| `@fichier` | celui de la source décrite | voir « Un fichier est une source » |

`sum` n'est pas `cross` : `cross(A,B)` donne **toutes** les paires (`A × B` combats, la diagonale comprise), `sum(A,B)` apparie le combat i de A avec le combat i de B. Avec la même source des deux côtés, `sum(kits,kits)` donne `(Mage,Mage)`, `(Archère,Archère)`… : un kit doublé. `sum(kits,monsters)` donne un combat par kit, les monstres revenant en boucle ; `sum(kits,monster:Gobelin)` met un Gobelin avec chaque kit.

Les combats de biome sont énumérés de façon déterministe : une carte du biome est tirée avec `--seed`, et tous ses combats de la couche et de la sorte demandées forment la liste (donc des lignes stables d'une exécution à l'autre).

`encounter:Gobelin*3+Archer` reste accepté pour les adversaires : des monstres précis (7 au plus).

### Les `{}` : une ligne par combat

`{source}` autour d'une source **de la racine d'une équipe** (pas dans une autre source) la **parcourt** : une ligne pour chacun de ses combats.

```
--match "{kits}/random:fight:cave"                # chaque kit seul contre un combat de grotte au hasard
--match "{kit:Pêcheur}+random:kits/{monsters}"    # Pêcheur + un kit au hasard contre chaque monstre
--match "{kits}/{monsters}"                       # une ligne par couple (kit, monstre)
```

- **Plusieurs `{}` se croisent**, côtés confondus : `{kits}/{monsters}` donne une ligne par couple. C'est un mécanisme de lignes ; il n'a rien à voir avec la source `cross(A,B)`, qui est une source comme les autres (`{cross(kits,monsters)}`, `random:cross(kits,monsters)`).
- Une source de plusieurs combats qui n'est ni entre `{}` ni sous `random:` est une erreur : écrire `{kits}` (une ligne chacun) ou `random:kits` (un tiré).
- Pas de `{}` à l'intérieur d'une source : `random:{kits}`, `[{kits},A]` et `cross({kits},A)` sont refusés.

### Copies et miroirs : `set:` et `get:`

`set:A:S` décore la source `S` : quand elle est résolue pour un combat, elle retient ce qu'elle a donné sous le nom `A`. `get:A` le redonne. Les noms sont libres (lettres, chiffres, `_`, `-`) et il y en a autant qu'on veut.

```
--match "{set:m:monsters}+get:m/kit:Pêcheur"       # chaque monstre avec une copie de lui-même
--match "{set:k:kits}/get:k"                        # miroir : chaque kit contre lui-même
--match "set:a:random:kits+get:a+get:a/…"           # un kit au hasard, trois fois
--match "set:a:random:kits+set:b:random:kits+get:a+get:b/…"   # deux kits au hasard, chacun en double
--match "{monsters*2}/…"                            # chaque monstre en deux exemplaires
```

**Quand les sources sont résolues** : pour chaque combat joué, toutes les sources le sont une fois, dans l'ordre de lecture (les racines des alliés de gauche à droite, puis celles des adversaires). Le registre des noms vit le temps d'**un** combat et est partagé par les deux côtés ; rien ne passe d'un combat au suivant. Vérifié avant le premier combat :

- `get:A` doit venir **après** un `set:A` dans l'ordre de lecture ;
- un nom n'est défini qu'une fois ;
- pas de `set:` à l'intérieur d'une union `[…]` (une seule de ses parties est résolue) ; `get:` y est permis ;
- `random:kits*2` donne **un** kit en double (une copie), pas deux tirages : pour deux kits différents, `random:kits+random:kits`.

### Un fichier est une source

`@fichier` se lit comme une source, partout où une source est permise. Le fichier est lu, on retire les **commentaires** (`#` jusqu'à la fin de la ligne), puis **tous les blancs** (espaces, retours à la ligne), pour obtenir une seule ligne, interprétée comme le texte d'une source. On peut donc écrire une grosse définition ou une liste sur plusieurs lignes commentées :

```
# monstres.txt
[
  monster:Gobelin,         # le plus faible
  monster:Archer,
  monster(Brute=size:2,draw:2,heart:rouge*5,Estoc,Estoc,Esquive)
]
```

`--match "{kit:Mage}/{@monstres.txt}"`. Les noms avec blancs (`Gobelin cavalier`) deviennent `Gobelincavalier` sur une ligne : les noms se comparent sans casse, sans accents et **sans blancs**, donc les deux écritures sont acceptées. Un chemin de fichier ne peut pas contenir `/`, `+`, `,` ni de crochets (chemin relatif d'un seul niveau, ou séparateur `\` sous Windows).

## `--out` : les colonnes

Une liste de colonnes, dans l'ordre voulu (défaut : `winrate`), et la sortie générale `total`. `--sort` prend une colonne ou `name` ; `--top` et `--flip` portent sur les lignes.

```
--out winrate,n,ci,rounds,total
```

## Kits et monstres à la volée

Il n'y a **plus d'option `--def`** : un combattant à tester avant de l'implémenter s'écrit dans `--match`, comme une source (`kit(Nom=…)`, `pet(Nom=…)`, `monster(Nom=size:N,…)`). Pour en définir plusieurs, on met une liste dans un **fichier lu comme une source** :

```
# mes-kits.def
[
  kit(Duelliste=Avancer*3,Viser,Estoc*3,Esquive,item:Grimoire),   # un classique
  kit(Piquier+=@Piquier,Estoc*2,-Viser)                           # le Piquier un peu changé
]
```

`--match "{@mes-kits.def}/random:fight:cave"` : une ligne par kit du fichier. Les kits définis se nomment aussi dans `--ai` (`--ai "deck,Duelliste=smart3"`). Un combattant défini est **à part** : il ne remplace pas celui du jeu qui porte son nom, et `@Base` ne part que d'un kit, d'un monstre ou d'un familier du jeu (pas d'une autre définition du fichier).

| Élément | Sens |
|---|---|
| `Carte`, `Carte*N` | cartes, dans l'ordre du deck |
| `item:Nom[*N]` | objets de départ, d'un kit ou d'un monstre |
| `usable:Nom[*N]` | usables de départ, d'un kit ou d'un monstre (aucun monstre du jeu n'en a) |
| `@Base` | part d'un kit ou monstre du jeu ; `@kit:X` / `@monster:X` si le nom est ambigu |
| `-Carte`, `-item:Nom`, `-usable:Nom` (`*N` ok) | retire ce que `@Base` apporte |
| `heart:Type[*N]` | N cœurs de ce type : `heart:rouge*4`, `heart:rose*3`, `heart:noir*2`. Un monstre n'a que des rouges ; un kit du jeu a ses propres cœurs (`list kits` les donne, et `@Kit` les reprend) ; un kit défini sans aucun `heart:` a 6 rouges, un kit qui en nomme a exactement ceux-là. Les types : `rouge`, `rose`, `noir`, `bouclier`, `bleu`, `verre`, `temps`… |
| `-heart:Type[*N]` | retire des cœurs hérités de `@Base` |
| `draw:N`, `size:N` | pioche et taille : la définition est un monstre |

Casse, accents et blancs sont ignorés. Réservés : `, * = ( )`. Noms exacts : `npm run cli -- list cards | items | usables`.

## `--ai` : qui joue

`--ai` est une liste d'entrées séparées par des virgules :

| Entrée | Sens |
|---|---|
| `kit=ia`, `monster=ia`, `pet=ia` | l'IA de tous les kits / monstres / familiers, quel que soit leur camp |
| `ia` seule (ex. `smart8`, `deck`) | raccourci de `kit=ia` ; **plusieurs** = un tableau par IA, titrés « IA : … » |
| `allies=ia`, `foes=ia` | l'IA de tous les combattants d'un camp (gauche / droite de `--match`) |
| `Nom=ia` | l'IA d'un combattant précis, par nom |

**Défauts, comme dans le jeu** : `kit=smart` (alias du dernier `smartN`, `smart8` aujourd'hui), `monster=deck`, `pet=deck`. Le plus précis l'emporte : `Nom=` > `allies=`/`foes=` > `kit=`/`monster=`/`pet=` > défaut.

| IA | Sens |
|---|---|
| `deck` | l'IA du jeu : la main lue de gauche à droite, comme les monstres, puis le pas gratuit en fin de chaîne s'il reste une place |
| `random` | la main mélangée, puis lue de gauche à droite |
| `smart1[:K]` | gardé pour comparer : essaie K mains mélangées (6 par défaut) sur une copie du combat, sans jouer de lui-même pas ni rotation |
| `smart2[:K]` | cherche en trois passes (main, pas, rotation), chaque essai joué sur une copie du combat, score à la vie seule |
| `smart3[:K]` | `smart2` avec un score plus fin, et une passe qui choisit les usables |
| `smart4[:K]` | `smart3`, qui peut jouer moins de cartes que sa main |
| `smart5[:K]` | `smart3` qui cherche sa main pas à pas au lieu de la tirer au hasard, et compte les statuts de toute unité selon leur durée |
| `smart6` à `smart8` | suites de `smart5` ; `sim --help ai` donne la description de chacune |
| `smart8_path` | `smart8` qui se tourne aussi vers le chemin contournant les obstacles, et départage ses chaînes par la longueur de ce chemin |
| `smart9_2`, `smart9_1_2`, `smart9_1_2_3` | `smart8` qui prédit les autres unités aux depths de son nom et fait la moyenne des scores |
| `smart10` | `smart9_1_2_3` |
| `smart10_blind` | `smart10` qui ne compte que sur ses cartes en main : dans ses essais, pioches et défausses de toutes les unités sont des cartes cachées, qu'il ne joue jamais |
| `smart10_position` | `smart10` qui compte la position face à chaque ennemi : −0,5 cœur au plus quand il est devant un ennemi, +0,5 quand un ennemi est devant lui |
| `smart10_future` | `smart10` qui rejoue ses 6 meilleures chaînes sur deux rounds (au lieu de 3) |
| `smart10_smartfuture` | `smart10` dont le 2ᵉ round des essais est joué par `smart3` en depth 0 pour chaque unité, au lieu de l'IA du deck |
| `smart10_safe`, `smart10_unsafe` | `smart10` qui garde le pire (safe) ou le meilleur (unsafe) de ses scores par niveau, au lieu de la moyenne |
| `smart[:K]` | alias du dernier `smartN` : `smart8` aujourd'hui, redéfini à chaque nouvelle version. Le nom réel (`smart8:6`) reste celui des tableaux et des journaux |

Comme dans le jeu, les héros (kits, recrues, définitions de kits) jouent gratuitement, une fois par round, `Avancer` et une rotation `Tourner`. Les monstres n'en ont pas. Ces cartes prennent une place dans la chaîne. Un monstre **adversaire** a le corps qu'une carte du jeu lui donne (cœurs du niveau `--level`, deck dans l'ordre) ; un monstre **allié** a le même corps, au niveau 1 ; un familier allié a son deck mélangé. Des deux côtés, un monstre garde ses objets et ses usables.

Les `smartN` approchent mieux un joueur qui réfléchit que `deck`, au prix de plusieurs fois plus de temps : le parallélisme compense. Le suffixe `-usables` (`deck-usables`) laisse les usables de côté ; les autres IA (sauf `smart3` et suivantes, qui ne les utilisent que quand ils servent) les utilisent à chaque round. Les objets agissent seuls.

## Options

| Option | Format | Défaut |
|---|---|---|
| `--match` | description `alliés/adversaires`, répétable | obligatoire |
| `--out` | colonnes et `total` | `winrate` |
| `--ai` | voir plus haut | `kit=smart`, `monster=deck`, `pet=deck` |
| `--level` | entier ≥ 1 : niveau d'étage des monstres adversaires : +1 PV par niveau, un exemplaire de Puissance tous les 2 niveaux, pioche, main et chaîne doublées tous les 4 (chaîne de 50 au plus) ; les kits adversaires restent au niveau 1 | `1` |
| `--layer` | `n` ou `a-b` : couche(s) de la carte du biome où piocher les combats (0 = premiers, 11 = boss) | `0-3` |
| `--fight` | sorte de combat piochée sur la carte : `battle`, `elite` (couche 4 au plus tôt), `boss` ; ou l'id d'un combat précis (`npm run cli -- list fights`), pris où la carte le pose, `--layer` ignoré | `battle` |
| `--games` | combats **par ligne** | `30` |
| `--seed` | entier | `1` |
| `--max-rounds` | rounds avant timeout | `60` |
| `--stall` | N rounds de suite sans que personne ne gagne ni ne perde de vie : le combat est bloqué et compte comme un timeout ; `0` ne coupe jamais | `10` |
| `--soft-win` | drapeau : un combat en timeout va au camp qui a le plus abîmé l'autre (voir « Soft win ») | non |
| `--jobs` | `auto` ou N threads qui jouent les combats (1 à 64) ; `auto` utilise tous les cœurs au-delà de 100 combats | `auto` |
| `--sort` | une colonne de `--out` ou `name` (ordre décroissant) | la 1re colonne |
| `--top` | K premières lignes ; K négatif : les K dernières | toutes |
| `--flip` | échange lignes et colonnes | non |
| `--format` | `table`, `csv`, `json` | `table` |
| `--log` | fichier : le journal complet de chaque combat joué (chaînes, cartes, mouvements, vie, statuts, usables…) ; son dossier doit exister | aucun |
| `--quiet` | ni progression ni confirmation | non |

Les combats de la catégorie Agression (contre des kits joués par la meilleure IA) figurent dans `list fights`, mais `sim` refuse de les jouer : il ne sait pas encore faire combattre un kit côté adverse.

`--layer`, `--fight` et `--level` sont **globaux** : ils s'appliquent à toutes les sources `fight:` / `biome:` de la commande. Les anciennes options `--of`, `--pool`, `--show` et `--def` n'existent plus (le sujet est une source de `--match`, les coéquipiers se décrivent dans `--match`, les valeurs de `--show` sont des colonnes de `--out`, les combattants définis s'écrivent en place ou dans un fichier `.def` lu comme une source) : les utiliser donne un message qui dit quoi écrire.

La progression s'écrit sur stderr, une ligne à chaque dizaine de pourcents (`sim : 30 % (90/300 combats, 4.2 s)`), même hors terminal ; `--quiet` la coupe.

Le nombre de combats annoncé sur stderr est `lignes × --games` ; au-delà de 20 000, la commande demande confirmation (`--quiet` l'évite). Un combat dure de 10 à 100 ms ; les `smartN` multiplient ce coût.

**Parallélisme** : les combats sont joués sur plusieurs threads. Chaque ligne est découpée en **tranches de combats** réparties entre les threads, de sorte que peu de lignes occupent quand même tous les cœurs. Chaque combat ne dépend que de sa graine, donc le tableau est le même quel que soit `--jobs`. Chaque thread relit la ligne de commande et recharge le jeu (une à deux secondes de démarrage) : `auto` n'en lance que pour plus de 100 combats. `--jobs 1` désactive les threads.

## Soft win

Sans `--soft-win`, un combat qui finit en timeout (`--max-rounds` atteint, ou blocage) ne compte pas dans le winrate. Avec `--soft-win`, il est tranché sur la vie :

1. Pour chaque camp, on calcule le **pourcentage de vie restante** : la somme des cœurs actuels des unités **de départ** (celles du début du combat, les clones et invocations ne comptent pas) divisée par la somme de leurs cœurs au départ. Une unité morte compte pour 0.
2. Le camp dont l'**adversaire** a le plus bas pourcentage a le plus abîmé l'autre : il gagne.
3. Un camp ne gagne que si le pourcentage de vie de l'adversaire est **inférieur à 100 %**. À égalité, y compris quand personne n'a perdu de vie, le combat reste un timeout, hors winrate.

Les victoires et défaites obtenues ainsi comptent comme des victoires et des défaites ; `--out wins,softwins,losses,softlosses` détaille : `wins` est le total des victoires, `softwins` celles obtenues par ce départage (donc `wins - softwins` sont des victoires normales), de même pour `losses` et `softlosses`.

```
npm run cli --silent -- sim --match "{kits}/random:fight:cave" --max-rounds 30 --soft-win --games 100 --out winrate,n,ci,wins,softwins,timeouts,rounds
```

## Commandes types

Les modèles de base pour tester. Les kits affrontent un combat au hasard des quatre biomes (couches 0 à 3, vrais combats de début de run) ; les monstres affrontent un kit au hasard. `--soft-win` fait compter les combats longs, `--games 100` donne une marge d'environ ±10 points, `--sort name` regroupe les variantes d'un même combattant, et la ligne `total` mélange toutes les variantes.

Pour les **kits**, trois variantes par kit : **Solo** (le kit seul), **Team2** (avec un allié au hasard) et **vsKit** (2 contre 2, un allié au hasard contre deux kits au hasard).

Tous les kits :

```
sim --match "{kits}/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --match "{kits}+random:kits/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --match "{kits}+random:kits/random:kits+random:kits" --games 100 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

Certains kits (ici Mage, Pêcheur et Canonnier) :

```
sim --match "{[kit:Mage,kit:Pêcheur,kit:Canonnier]}/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --match "{[kit:Mage,kit:Pêcheur,kit:Canonnier]}+random:kits/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --match "{[kit:Mage,kit:Pêcheur,kit:Canonnier]}+random:kits/random:kits+random:kits" --games 100 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

Kits custom, ceux d'un fichier `mes-kits.def` (une liste `[kit(…),kit(…)]`, voir « Kits et monstres à la volée ») :

```
sim --match "{@mes-kits.def}/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --match "{@mes-kits.def}+random:kits/random:[fight:cave,fight:forest,fight:mine,fight:hell]" --match "{@mes-kits.def}+random:kits/random:kits+random:kits" --games 100 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

Un **test solo** à lire (le kit seul, un seul combat, avec son journal) : on ne regarde pas le tableau mais le fichier de `--log`. `--games 1` joue un seul combat, `--jobs 1` évite de relancer des threads, `--seed` rejoue le même combat, et `--max-rounds` borne la longueur du journal. Le dossier du journal doit exister.

```
sim --match "kit:Mage/random:fight:cave" --games 1 --jobs 1 --seed 1 --max-rounds 15 --log combat.log --quiet
```

Pour tester sur plusieurs adversaires, on lit peu de combats : `--games 3` ou une ligne par adversaire (`kit:Mage/{[monster:Gobelin,monster:Archer]}`).

Pour les **monstres**, trois variantes par monstre : **Solo** (le monstre seul), **Double** (avec une copie de lui-même) et **avec un Gobelin**, chacune contre un kit au hasard.

Tous les monstres :

```
sim --match "{monsters}/random:kits" --match "{set:m:monsters}+get:m/random:kits" --match "{monsters}+monster:Gobelin/random:kits" --games 100 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

Certains monstres (ici Brute, Troll et Diable) :

```
sim --match "{[monster:Brute,monster:Troll,monster:Diable]}/random:kits" --match "{set:m:[monster:Brute,monster:Troll,monster:Diable]}+get:m/random:kits" --match "{[monster:Brute,monster:Troll,monster:Diable]}+monster:Gobelin/random:kits" --games 100 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

Monstres custom, ceux d'un fichier `mes-monstres.def` (une liste `[monster(…),monster(…)]`) :

```
sim --match "{@mes-monstres.def}/random:kits" --match "{set:m:@mes-monstres.def}+get:m/random:kits" --match "{@mes-monstres.def}+monster:Gobelin/random:kits" --games 100 --soft-win --out winrate,n,ci,rounds,timeouts,total --sort name
```

## Exemples

Un kit contre les monstres du jeu, un par ligne, avec des colonnes détaillées :

```
sim --match "{monsters}/kit:Pêcheur" --games 50 --out winrate,n,rounds
```

Un monstre avec un Gobelin contre un Pêcheur seul (le Pêcheur n'est pas complété) :

```
sim --match "{monsters}+monster:Gobelin/kit:Pêcheur" --games 50
```

Chaque kit seul, puis en équipe de trois, contre un combat de grotte :

```
sim --match "{kits}/random:fight:cave" --match "{kits}+random:kits+random:kits/random:fight:cave" --out winrate,total
```

Comparer deux versions de pilotage, et un kit défini en place :

```
sim --match "{kit:Mage}/random:fight:forest" --ai smart3,smart4
sim --match "kit(Duelliste=Avancer*3,Viser,Estoc*3,Esquive,heart:rouge*4)/random:fight:cave" --games 200 --out winrate,ci
```

## Erreurs

Toutes les vérifications ont lieu avant le premier combat. Une erreur dit quoi, où, et quoi faire, sur stderr, avec le code de sortie 1 : nom inconnu avec les noms proches, nom ambigu avec la forme `type:Nom`, description illisible avec la forme permise, `{}` mal placé, source de plusieurs combats sans `{}` ni `random:`, valeur hors limites, option inconnue avec la plus proche, option supprimée avec ce qui la remplace, définition fautive avec son nom (et sa ligne dans un fichier).

Si des effets de cartes ou d'objets échouent pendant les combats, un avertissement final en stderr en donne le nombre et les messages : c'est le signe d'un combattant défini cassé, et les lignes concernées affichent `errors` avec `--out errors`. Un combat interrompu par une exception est compté comme timeout et signalé de la même façon.
