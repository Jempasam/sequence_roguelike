# `sim` : combats aléatoires en masse

Une seule commande, une seule simulation : des **combattants** (kits, monstres, familiers, du jeu ou définis à la volée) jouent des centaines de combats contre des **adversaires**, seuls ou en équipe. Le résultat est un tableau : une **ligne** par combattant, une **colonne** par sortie demandée. Résumé des options : `npm run cli -- sim --help` (et `sim --help out | def | ai`).

```
npm run cli -- sim [options]
```

## Lire le tableau

- Une cellule est le **winrate** = victoires / (victoires + défaites + nuls). `--show n,ci,draws,timeouts,rounds,errors` ajoute le nombre de combats, la marge de l'intervalle de confiance à 95 % (`ci`, en points de pourcentage), les nuls, les timeouts, les rounds moyens et les effets en erreur.
- **Timeout** : un combat encore en cours après `--max-rounds` (60), ou bloqué (`--stall` rounds de suite sans qu'aucune unité ne gagne ni ne perde de vie : par exemple deux unités qui ne se rencontrent jamais). Il est compté à part, hors du winrate. Beaucoup de timeouts signalent un pilotage qui ne finit pas les combats (voir `--ai`).
- `-` : cellule sans objet (le partenaire d'un `with:X` est le combattant lui-même).
- Les cellules sont indépendantes : même `--seed`, même résultat, quelles que soient les autres colonnes ou lignes.

## `--out` : les colonnes

Une sortie s'écrit **`[équipe/]adversaire`**. `--out` est une liste séparée par des virgules, dans l'ordre voulu. Défaut : `total,solo,team,cave,forest,mine,hell,kits`.

| Équipe | Sens |
|---|---|
| `solo` | le combattant seul |
| `team` | lui + 2 coéquipiers tirés dans `--pool` (défaut : les kits) |
| `team:N` | équipe de N, de 1 à 6 |
| `with:A[+B]` | lui + A (+ B) : équipe fixée |
| `with:<groupe>` | une colonne par partenaire du groupe |

| Adversaire | Sens |
|---|---|
| `monsters` | un biome tiré au hasard à chaque combat |
| `cave` `forest` `mine` `hell` | un combat de ce biome (grotte, forêt, mine, enfer acceptés) : une carte du biome est générée comme dans le jeu, et le combat est pioché parmi ceux de la couche `--layer` et de la sorte `--fight` |
| `kits` | une équipe de kits au hasard, de même taille que la nôtre, sans nos propres kits tant qu'il y en a d'autres ; `kits:custom` / `kits:official` restreignent le tirage |
| `kit:A[+B]` | adversaire fixé, complété au hasard à la taille de l'équipe |
| `kit:<groupe>` | une colonne par kit du groupe |
| `encounter:Gobelin*3+Archer` | des monstres précis (7 au plus) |

`total` réunit les combats de **toutes les autres** colonnes (chaque combat une fois).

Une équipe seule affronte `monsters`. Un adversaire seul est affronté seul puis en équipe de 3, résultats réunis. Groupes : `kits`, `monsters`, `pets`, `all`.

Un combat contre des kits est joué une fois sur deux depuis chaque côté de l'arène, pour que la position de départ ne favorise personne.

## `--def` : kits et monstres à la volée

`--def "Nom=élément,élément"`, répétable ; plusieurs définitions dans une valeur, séparées par `;`. `--def @fichier.txt` lit une définition par ligne (`#` commente) ; `--def @fichier.ts` charge un module qui exporte `kits` et/ou `monsters`, pour des cartes ou des objets pas encore au catalogue.

| Élément | Sens |
|---|---|
| `Carte`, `Carte*N` | cartes, dans l'ordre du deck |
| `item:Nom[*N]` | objets de départ (kits seulement) |
| `usable:Nom[*N]` | usables de départ (kits seulement) |
| `@Base` | part d'un kit ou monstre du jeu, ou défini plus tôt ; `@kit:X` / `@monster:X` si le nom est ambigu |
| `-Carte`, `-item:Nom`, `-usable:Nom` (`*N` ok) | retire ce que `@Base` apporte |
| `heart:Type[*N]` | N cœurs de ce type : `heart:rouge*4`, `heart:rose*3`, `heart:noir*2`. Un monstre n'a que des rouges ; un kit sans aucun `heart:` a 6 rouges, un kit qui en nomme a exactement ceux-là (`heart:noir*6` seul : un kit sans cœur rouge). Les types : `rouge`, `rose`, `noir`, `bouclier`, `bleu`, `verre`, `temps`… |
| `-heart:Type[*N]` | retire des cœurs hérités de `@Base` (`-heart:rouge*2`) |
| `draw:N`, `size:N` | pioche et taille : la définition est un monstre |

Casse et accents sont ignorés (`cocaine` = `Cocaïne`). Un nom identique à un officiel le **remplace** ; un nom distinct permet de comparer les deux. Réservés : `; , * =`. Noms exacts : `npm run cli -- list cards | items | usables`.

Sans `--of`, les combattants mesurés sont les définitions (sinon les kits du jeu). Elles sont aussi disponibles comme partenaires, adversaires (`kits`, `kits:custom`) et dans les groupes.

## `--ai` : qui joue

| IA | Sens |
|---|---|
| `deck` | l'IA du jeu : la main lue de gauche à droite, comme les monstres. Les monstres jouent toujours ainsi |
| `random` | la main mélangée, puis lue de gauche à droite |
| `lookahead[:K]` (défaut) | essaie K chaînes (6 par défaut) jouées sur une copie du combat et garde celle qui laisse le plus de vie à son équipe |

`lookahead` est le défaut : un deck de héros n'est pas un deck de monstre réglé pour tourner en boucle, donc `deck` joue mal les kits (beaucoup de défaites et de timeouts) et mesure surtout la faiblesse du pilotage. `lookahead` approche mieux un joueur qui réfléchit, au prix de plusieurs fois plus de temps : le parallélisme compense.

Toute IA utilise les usables à chaque round ; le suffixe `-usables` (`deck-usables`) les laisse de côté. Les objets agissent seuls. Entrées de `--ai`, séparées par des virgules : `ia` (alliés ; plusieurs = un tableau par IA), `Nom=ia` (un combattant précis), `foes=ia` (adversaires qui sont des kits ; défaut : la même IA que les alliés).

## Options

| Option | Format | Défaut |
|---|---|---|
| `--of` | combattants et groupes : `Nom`, `kit:Nom` / `monster:Nom` / `pet:Nom` si ambigu, `kits`, `monsters`, `pets`, `all` | les `--def`, sinon `kits` |
| `--out` | liste de sorties | voir plus haut |
| `--def` | voir plus haut | aucune |
| `--pool` | combattants et groupes : d'où tirer les coéquipiers | `kits` |
| `--ai` | voir plus haut | `lookahead` |
| `--level` | entier ≥ 1 : niveau d'étage (PV des monstres, +1 monstre par niveau) | `1` |
| `--layer` | `n` ou `a-b` : couche(s) de la carte du biome où piocher le combat (0 = premiers combats, 11 = boss) | `0-3` |
| `--fight` | sorte de combat piochée sur la carte : `battle`, `elite` (couche 4 au plus tôt), `boss` | `battle` |
| `--games` | combats **par cellule** | `30` |
| `--seed` | entier | `1` |
| `--max-rounds` | rounds avant timeout | `60` |
| `--stall` | N rounds de suite sans que personne ne gagne ni ne perde de vie : le combat est bloqué et compte comme un timeout ; `0` ne coupe jamais | `10` |
| `--soft-win` | drapeau : un combat en timeout va au camp qui a le plus abîmé l'autre (voir « Soft win ») | non |
| `--jobs` | `auto` ou N threads qui jouent les combats (1 à 64) ; `auto` utilise tous les cœurs au-delà de 100 combats | `auto` |
| `--show` | `n ci draws timeouts rounds errors wins softwins losses softlosses` | rien |
| `--sort` | une colonne ou `name` (ordre décroissant) | `total`, sinon la 1re colonne |
| `--top` | K premières lignes ; K négatif : les K dernières | toutes |
| `--flip` | échange lignes et colonnes | non |
| `--format` | `table`, `csv`, `json` | `table` |
| `--quiet` | ni progression ni confirmation | non |

Le nombre de combats annoncé sur stderr est `lignes × cellules × --games` ; au-delà de 20 000, la commande demande confirmation (`--quiet` l'évite). Un combat dure de 10 à 100 ms ; `lookahead` multiplie ce coût.

**Parallélisme** : les combats sont joués sur plusieurs threads. Chaque combat ne dépend que de sa graine, donc le tableau est le même quel que soit `--jobs`. Chaque thread relit la ligne de commande et recharge le jeu (une à deux secondes de démarrage) : `auto` n'en lance que pour plus de 100 combats. `--jobs 1` désactive les threads.

## Soft win

Sans `--soft-win`, un combat qui finit en timeout (`--max-rounds` atteint, ou blocage) ne compte pas dans le winrate. Avec `--soft-win`, il est tranché sur la vie :

1. Pour chaque camp, on calcule le **pourcentage de vie restante** : la somme des cœurs actuels des unités **de départ** (celles du début du combat, les clones et invocations ne comptent pas) divisée par la somme de leurs cœurs au départ. Une unité morte compte pour 0.
2. Le camp dont l'**adversaire** a le plus bas pourcentage a le plus abîmé l'autre : il gagne.
3. Un camp ne gagne que si le pourcentage de vie de l'adversaire est **inférieur à 100 %**. À égalité, y compris quand personne n'a perdu de vie, le combat reste un timeout, hors winrate.

Les victoires et défaites obtenues ainsi comptent comme des victoires et des défaites ; `--show wins,softwins,losses,softlosses` détaille : `wins` est le total des victoires, `softwins` celles obtenues par ce départage (donc `wins - softwins` sont des victoires normales), de même pour `losses` et `softlosses`.

Configuration type, avec 30 rounds maximum et le soft win, pour comparer les kits contre le premier biome sans perdre les combats qui traînent :

```
npm run cli --silent -- sim --of kits --out solo/cave,team/cave --max-rounds 30 --soft-win --games 100 --show n,ci,wins,softwins,timeouts,rounds
```

La colonne `timeouts` ne contient alors que les égalités, et `softwins` montre la part des victoires obtenues à la vie.

## Exemples

Comparer 10 kits définis à la volée, objets et usables compris, seuls et en équipe, contre les combats du premier biome et contre des kits au hasard :

```
npm run cli --silent -- sim --out total,solo/cave,team/cave,solo/kits,team/kits --layer 0-1 --games 100 --show ci \
  --def "Duelliste=Avancer*3,Viser,Estoc*3,Esquive,item:Pierre à aiguiser,usable:Cocaïne;
         Tireur=Avancer*3,Viser*2,Tir*4,Esquive,usable:Tube de colle;
         … (jusqu'à 10)"
```

Autres :

```
sim --of Lancier --out monsters,kits                          # contre des monstres, contre des kits
sim --out total,solo,team,cave,forest,mine,hell,kit:kits      # comparaison complète, avec une colonne par kit
sim --of Mage --out with:kits --flip --top 5                  # avec qui Mage s'associe le mieux (-5 : le moins bien)
sim --of kits --out with:kits                                 # la matrice de toutes les paires
sim --of Lancier,Lancier+ --def "Lancier+=@Lancier,Estoc*2,-Avancer" --ai deck,lookahead
sim --of Lancier --out solo/encounter:Gobelin*2 --games 200 --show ci
```

## Erreurs

Toutes les vérifications ont lieu avant le premier combat. Une erreur dit quoi, où, et quoi faire, sur stderr, avec le code de sortie 1 : nom inconnu avec les noms proches, nom ambigu avec la forme `type:Nom`, sortie illisible avec les formes permises, valeur hors limites, option inconnue avec la plus proche, définition fautive avec son nom (et sa ligne dans un fichier).

Si des effets de cartes ou d'objets échouent pendant les combats, un avertissement final en stderr en donne le nombre et les messages : c'est le signe d'un kit custom cassé, et les cellules concernées affichent `errors` avec `--show errors`. Un combat interrompu par une exception est compté comme timeout et signalé de la même façon.
