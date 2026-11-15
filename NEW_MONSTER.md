# Plan : nouveaux monstres (Dungeon of the Mecard)

## Context
15 monstres communs (`LOOT_MONSTERS`) + 4 boss. Les communs se ressemblent : beaucoup de « Chemin, Avancer, Estoc ». Le catalogue de cartes est très riche et sous-utilisé par les monstres. Objectif : ajouter ~30 monstres communs qui jouent chacun un « truc » lisible, en réutilisant les cartes existantes, plus une nouvelle carte (« Envol de l'ange »). Ils comblent un manque : trop de builds « gros bourrin » de mêlée sont trop forts, donc ajout de colosses de mêlée (forts de près, lents, faibles de loin), de combos de mêlée, de buffeurs/contrôleurs d'alliés.

## Fichiers
- `core/src/games/mecard/sim/catalog/monsters.ts` : nouvelles constantes `monster({...})` + ajout à `LOOT_MONSTERS` (pas aux boss). Même style : doc-comment d'une ligne, `cards` écrites round par round.
- Nouvelle carte Envol de l'ange : dans `core/.../card/subs/movement/` + `ALL_CARDS`.
- `assets/mecard/units/*.png` (ou `generated_assets/` s'il vient de `raw_assets/` via `npm run art`) : un sprite par monstre (`Visual.test.ts` vérifie l'existence). Réutiliser les sprites orphelins quand ils collent, sinon générer via le skill pixel-art.
- Tests : `catalogs.test.ts`, `index.test.ts`, `newContent.test.ts`, `Visual.test.ts` itèrent sur les catalogues ; un test pour Envol de l'ange.

## Nommage
Noms uniques face aux monstres, kits (Artificière, Chaman, Martyr, Pêcheur, Saigneur, Spectre, Tempétiste, Samurai de l'ombre…) et pets. On précise avec une espèce/lieu (« Gobelin artificier », « Orc chaman »), pas systématiquement.

## Lecture des decks
Un deck = les rounds mis bout à bout, `|` sépare les rounds (longueur d'un round = pioche). Convention du jeu : une carte « preneuse » prend ce qui la suit (livraison d'abord, contenu ensuite : `Petit sort, Feu`, `Potion jetable, Poison`, `Combo, Coup`, `Synchronisation, Coup`). Les noms sont ceux de `list cards` ; les noms exacts des constantes TypeScript seront vérifiés à l'écriture.

## Protocole de test sim
Deux situations par monstre, contre les kits Chevalier, Pêcheur et Archère, 100 combats par case, `--soft-win`, niveau 1, IA par défaut :
- **Solo** : `{monstre}/kit:X`.
- **+Gobelin×2** : `{monstre}+monster:Gobelin*2/kit:X` (le monstre avec deux Gobelins ; pour le Gobelin lui-même, trois Gobelins).

Les monstres du plan sont définis dans [command_line/new_monsters.def](command_line/new_monsters.def) (liste `[monster(...), ...]`, plus `monster:Gobelin` en tête). Un monstre ajouté ou changé s'y écrit au même format ; les noms de cartes sont ceux de `list cards`.

### Commande
Depuis la racine du dépôt. **Ne pas mettre `--quiet`** : il coupe la progression, on ne sait plus où en est la sim. IA explicites : monstres `deck`, kits `smart8` (= `smart` aujourd'hui). Toujours `--soft-win`. Une seule commande teste tous les cas (le coût fixe de ~5 s de lancement n'est payé qu'une fois) ; compter ~0,08 s par combat sur 12 threads, soit ~20 min pour 18 600 combats.

**Manière de tester** : `X` est une source qui renvoie plusieurs monstres (`@new_monsters.def`, `monsters`, `[monster:A,monster:B]`…). Chaque monstre de `X` est testé solo, puis avec deux Gobelins, contre les trois kits (6 lignes par monstre) :

```
npm run cli --silent -- sim --match "{X}/kit:Chevalier" --match "{X}/kit:Pêcheur" --match "{X}/kit:Archère" --match "{X}+monster:Gobelin*2/kit:Chevalier" --match "{X}+monster:Gobelin*2/kit:Pêcheur" --match "{X}+monster:Gobelin*2/kit:Archère" --games 100 --ai monster=deck,kit=smart8 --soft-win --out winrate,rounds,timeouts,errors,n
```

Pour le CSV de tout le plan, remplacer `--out …` par `--out winrate,timeouts,errors --format csv > res.csv 2> err.txt`.

Sortie : une ligne CSV `nom,winrate,timeouts,errors` par combat décrit (31 monstres × 6 = 186 lignes), `nom` valant `Monstre/kit:X` (solo) ou `Monstre+monster:Gobelin*2/kit:X`. Au dernier passage, aucun avertissement « effets échoués » (le dernier passage complet n'en génère aucun).

### Combat individuel avec journal (comprendre pourquoi un monstre ne marche pas)
Un monstre + 2 Gobelins contre Chevalier, Pêcheur et Archère, **un combat par kit**, avec le journal complet (`--log`) : pioches, chaînes jouées, mouvements, vie, statuts. Depuis la racine du dépôt, en bash ; remplacer `PretreDesOs` par le nom du monstre dans le `.def` (sans espaces ni accents) :

```
M=$(grep -m1 "^monster(PretreDesOs=" command_line/new_monsters.def | sed 's/[[:space:]]*#.*//; s/,[[:space:]]*$//')
npm run cli --silent -- sim --match "{$M}+monster:Gobelin*2/kit:Chevalier" --match "{$M}+monster:Gobelin*2/kit:Pêcheur" --match "{$M}+monster:Gobelin*2/kit:Archère" --games 1 --seed 1 --ai monster=deck,kit=smart8 --soft-win --out winrate,rounds,timeouts,errors --log combat.txt
```

- La 1re ligne extrait la définition du monstre du `.def` (le `.def` ne permet pas de choisir un monstre par son nom). On peut aussi coller directement le `monster(...)` à la place de `$M`.
- Le dossier du fichier `--log` doit exister ; `combat.txt` est écrasé à chaque lancement. Les trois combats y sont, dans l'ordre des `--match`, chacun commençant par une ligne `########## smart8:6 | Monstre+monster:Gobelin*2/kit:X | partie 1 | graine N ##########`.
- Lire le journal par round : `[Rn.0] … pioche …` (ce que chacun tire), `… chaîne : > …` (ce qu'il joue), puis les mouvements et la vie. Chercher si le monstre joue ses cartes dans le bon ordre, s'il reste sans cible, s'il fuit ou attend alors que ses alliés se battent.
- Pour un autre combat du même cas : changer `--seed` ; `--games 3` joue trois combats par kit (chacun a son en-tête dans le journal).
- Solo : retirer `+monster:Gobelin*2`.

### Remplir les colonnes « Max solo » et « Max +Gobelin×2 »
Pour chaque monstre et chaque situation (solo, puis +Gobelin×2), prendre ses trois winrates (Chevalier, Pêcheur, Archère) et écrire :

`<meilleur winrate> % <kit(s) qui le donnent> (+<écart avec le deuxième meilleur>)`

- Winrate en pourcentage avec une décimale, virgule française ; kits à égalité reliés par « et » (écart +0,0).
- Si les trois valent 0 : `0 % (tous)`.
- « Envol de l'ange » existe (`AngelFlight.ts`, dans `ALL_CARDS`) et les decks Robot-Flinge et Garde au bouclier du `.def` l'utilisent. Leurs colonnes « Max » ont été refaites avec Envol de l'ange.
- Dernier passage complet (36 monstres, 22 200 combats, 0 effet en erreur) : seuls des timeouts, hors winrate (jusqu'à ~40 % des combats pour Gobelin démineur, Orc mitrailleur, Chevalier de fer contre le Pêcheur). Les winrates ont été recalculés, et plusieurs ont beaucoup bougé depuis le passage précédent (le Gobelin de référence passe de 38 % à 25 % avec deux Gobelins) : le moteur et l'IA ont changé entre-temps, les anciennes valeurs ne sont plus comparables.

### Colonne « Force (solo / équipe / support) »
Calculée à partir des winrates maximaux des colonnes « Max » (meilleur des trois kits) ; le Gobelin sert de référence (solo : son Max solo ; équipe : son Max +Gobelin×2, c'est-à-dire avec deux Gobelins) :
- Force Solo = WinRate − WinRateGobelinSolo
- Force Équipe = WinRate − WinRateGobelinÉquipe
- Supportness = ForceÉquipe − ForceSolo

Affichée `solo / équipe / support`, en points de pourcentage. Un supportness élevé = le monstre gagne beaucoup à être accompagné ; négatif = il est meilleur seul qu'en équipe, relativement au Gobelin.

Grand écart = taillé contre cet adversaire. Marge d'erreur de ±3 à ±10 points avec 100 combats : seuls les grands écarts comptent.

## Monstres communs
Colonne **State** : vide (à l'essai dans le `.def`), `🟦 Ajouté` (écrit dans `monsters.ts`), `🟩 Validé` (testé en jeu, sprite et comportement vérifiés). Les couleurs sont des pastilles, le Markdown n'a pas de texte coloré.

| Monstre | PV/pioche | Concept et comportement | Deck exact | Max solo | Max +Gobelin×2 | Force (solo / équipe / support) | State |
|---|---|---|---|---|---|---|---|
| Gobelin (référence, existant) | | | | 0 % (tous) | 25,0 % Archère (+8,0) | +0,0 / +0,0 / +0,0 |  |
| Lézard de feu | 5/3 | Bête de contact. Fonce vers le joueur, crache une gerbe de flammes qui laisse des brûlures, puis recule d'un pas. Dangereux en groupe : le terrain devient brûlant. | Chemin, Avancer, Avancer \| Chemin, Lance-flammes, Fuite \| Viser, Lance-flammes, Lance-flammes | 7,0 % Pêcheur (+6,0) | 46,0 % Archère (+8,0) | +7,0 / +21,0 / +14,0 | 🟦 Ajouté |
| Gobelin démineur | 4/3 | Contrôle de zone. Pose une mine, recule, tire de loin : oblige à ne pas avancer en ligne droite. | Viser, Mine, Dash arrière \| Viser, Tir, Tir \| Pas de côté, Mine, Fuite | 8,9 % Pêcheur (+8,9) | 19,6 % Pêcheur (+15,6) | +8,9 / −5,4 / −14,3 |  |
| Gobelin artificier | 4/3 | Explosifs. Bombe en croix, s'éloigne, grenade flash qui étourdit : prépare la mêlée de ses alliés. Fragile. | Viser, Bombe en croix, Fuite \| Viser, Grenade flash, Fuite \| Viser, Bombe en croix, Pas de côté | 0 % (tous) | 2,0 % Pêcheur (+1,0) | +0,0 / −23,0 / −23,0 |  |
| Pirate au harpon | 5/3 | Tire le joueur vers lui au lasso, puis frappe à l'épée ; le harpon le propulse sur sa cible. Punit les tireurs. | Viser, Lasso, Coup d'épée \| Viser, Harpon, Coup d'épée \| Chemin, Avancer, Coup d'épée | 1,0 % Pêcheur (+1,0) | 29,0 % Pêcheur (+15,0) | +1,0 / +4,0 / +3,0 | 🟦 Ajouté |
| Crapaud toxique | 4/3 | Harceleur. Crache pour ralentir, empoisonne à distance, garde ses distances. | Viser, Crachat, Fuite \| Viser, Petit sort, Plante \| Fuite, Viser, Crachat | 7,1 % Pêcheur (+6,1) | 23,7 % Pêcheur (+14,7) | +7,1 / −1,3 / −8,4 | 🟦 Ajouté |
| Esprit d'orage | 4/3 | Mage erratique. Alterne Vent (pousse au hasard) et Électricité (étourdit), esquive de côté. | Viser, Petit sort, Électricité \| Pas de côté, Conjuration, Vent \| Viser, Petit sort, Vent | 2,0 % Chevalier (+2,0) | 14,0 % Pêcheur (+8,0) | +2,0 / −11,0 / −13,0 |  |
| Orc mitrailleur | 4/4 | Tireur lourd. Mitraillette qui tourne à chaque touche ; recule en tirant. Fort face à un groupe serré. | Chemin, Avancer, Viser, Mitraillette \| Tir de couverture, Viser, Mitraillette, Fuite \| Viser, Pluie de balles, Pas de côté, Tir de couverture | 3,2 % Pêcheur (+2,1) | 29,3 % Pêcheur (+19,3) | +3,2 / +4,3 / +1,1 |  |
| Squelette faucheur | 6/3 | Avance au hasard, puis fauche en arc (touche à 1-2 m seulement). | Chemin, Avancer, Faux \| Pas au hasard, Chemin, Faux \| Viser, Coup d'assassin, Faux | 3,0 % Pêcheur (+2,0) | 44,0 % Pêcheur (+28,0) | +3,0 / +19,0 / +16,0 | 🟦 Ajouté |
| Chauve-souris | 3/3 | Mord pour faire saigner, double le saignement, puis s'éloigne. | Chemin, Dague, Enchaînement sanglant \| Dash arrière, Viser, Dague \| Chemin, Enchaînement sanglant, Dash arrière | 0 % (tous) | 14,0 % Pêcheur (+7,0) | +0,0 / −11,0 / −11,0 |  |
| Rôdeur des ombres | 3/3 | Assassin mobile. Se téléporte, vise à travers les murs, poignarde dans le dos. | Viser de l'ombre, Pas de l'ombre, Dague \| Viser, Ombre fulgurante, Dague \| Voie de l'ombre, Viser, Dague | 0 % (tous) | 23,0 % Pêcheur (+5,0) | +0,0 / −2,0 / −2,0 |  |
| Gobelin de garnison | 4/3 | Poseur de défenses : tourelle, leurre, sentinelle à estoc long, puis recule. | Tourelle, Fuite, Attendre \| Leurre, Viser, Tir \| Sentinelle, Fuite, Attendre | 33,7 % Archère (+4,3) | 37,0 % Pêcheur (+6,0) | +33,7 / +12,0 / −21,7 | 🟦 Ajouté |
| Orc chaman | 5/3 | Soutien. Totem de soin, Bandage, cri qui retourne les unités autour. | Totem, Viser allié, Bandage \| Totem de cri, Fuite, Attendre \| Chemin, Viser, Coup d'épée | 2,3 % Chevalier (+2,3) | 17,0 % Pêcheur (+9,0) | +2,3 / −8,0 / −10,3 |  |
| Loup-garou | 7/3 | Brute rapide. Bounce Dash, morsure à l'épée qui saigne. | Viser, Bounce Dash, Coup d'épée \| Viser, Saignement, Coup d'épée \| Chemin, Bounce Dash, Coup d'épée | 0 % (tous) | 19,0 % Pêcheur (+6,0) | +0,0 / −6,0 / −6,0 | 🟦 Ajouté |
| Alchimiste fou | 4/3 | Statuts de zone : potions (poison, faiblesse), flaques, évite le contact. | Viser, Potion jetable, Poison \| Fuite, Flaque, Poison \| Viser, Potion jetable, Faiblesse | 44,2 % Chevalier (+30,4) | 42,9 % Chevalier (+14,8) | +44,2 / +17,9 / −26,3 | 🟦 Ajouté |
| Golem kamikaze | 6/3 | Bombe lente. Cœur explosif et boucliers, avance, puis explose. | Carapace explosive, Blocage, Rancune \| Chemin, Avancer, Avancer \| Chemin, Avancer, Kamikaze | 0 % (tous) | 19,0 % Pêcheur (+9,0) | +0,0 / −6,0 / −6,0 |  |

### Colosses de mêlée (contre les builds « gros bourrin »)
Très forts au corps à corps, mais lents, peu mobiles, sans attaque à distance : le joueur qui reste loin ou kite les bat, celui qui fonce dans le tas est puni.

| Monstre | PV/pioche | Concept et comportement | Deck exact | Max solo | Max +Gobelin×2 | Force (solo / équipe / support) | State |
|---|---|---|---|---|---|---|---|
| Ogre écraseur | 14/3, taille 2 | Avance d'un pas, attend, puis Tremblement et Onde de choc : zone énorme mais aucune portée. Ne fuit jamais. | Chemin, Avancer, Attendre \| Chemin, Tremblement, Attendre \| Chemin, Onde de choc, Suplex | 13,0 % Pêcheur (+6,0) | 36,0 % Pêcheur (+15,0) | +13,0 / +11,0 / −2,0 | 🟦 Ajouté |
| Chevalier de fer | 10/3 | Tank à contre-attaque : cœurs bleus, Contre, Rempart, puis coups d'épée quand on est collé. On le contourne. | Blocage, Contre, Avancer \| Rempart, Chemin, Avancer \| Chemin, Avancer, Coup circulaire | 2,0 % Pêcheur (+2,0) | 50,0 % Pêcheur (+18,0) | +2,0 / +25,0 / +23,0 | 🟦 Ajouté |
| Gladiateur à la hache | 12/3 | Hache buveuse de sang : se soigne en frappant plusieurs cibles, mais un pas par round et le dos exposé. | Chemin, Avancer, Fureur contenue \| Hache buveuse de sang, Attendre, Hache buveuse de sang \| Chemin, Brisage de crâne, Attendre | 78,0 % Chevalier (+21,0) | 96,0 % Chevalier (+3,0) | +78,0 / +71,0 / −7,0 |  |
| Gobelin catcheur | 9/4 | Collé à vous : agrippe (Attrapage), Surprise Suplex, Combo qui rejoue le coup tant qu'il blesse, Brisage de crâne. Aucune portée. | Chemin, Avancer, Attrapage, Surprise Suplex \| Combo, Brisage de crâne, Attendre, Chemin \| Chemin, Attrapage, Combo, Suplex | 20,0 % Pêcheur (+5,0) | 62,0 % Pêcheur (+11,0) | +20,0 / +37,0 / +17,0 | 🟦 Ajouté |
| Samouraï errant | 8/4 | Duelliste patient : charge son allonge en attendant (Concentration), puis une seule frappe très longue et précise, Contre pour punir qui l'approche. Très peu de déplacement. | Viser, Avancer, Concentration, Attendre \| Attendre, Viser, Méga-Estoc, Contre \| Viser, Concentration, Attendre, Grande estoc | 19,3 % Archère (+19,3) | 14,0 % Pêcheur et Archère (+0,0) | +19,3 / −11,0 / −30,3 | 🟦 Ajouté |

Fort contre : mêlée qui se laisse agripper, builds à faible PV, groupes serrés, joueurs qui avancent en ligne droite (samouraï). Faible contre : tireurs, kite, mobilité, étourdissement avant le combo.

### Buffeurs et contrôleurs d'alliés
| Monstre | PV/pioche | Concept et comportement | Deck exact | Max solo | Max +Gobelin×2 | Force (solo / équipe / support) | State |
|---|---|---|---|---|---|---|---|
| Troll en armure | 10/3 | Support tank. Va au contact de ses alliés, Rempart (cœur bleu aux alliés à 1,5 m, lui compris), Blocage, Provocation (retourne les ennemis à 1,5 m vers lui). Les Gobelins ne sont presque jamais à 1,5 m : en pratique il ne se donne un cœur bleu qu'à lui. | Viser allié, Avancer, Rempart \| Viser, Avancer, Rempart \| Blocage, Provocation, Attendre | 0 % (tous) | 22,0 % Pêcheur (+13,9) | +0,0 / −3,0 / −3,0 |  |
| Gobelin brasseur | 5/4 | Support potions. Vise un allié et lui jette une potion (Potion jetable) de Vigueur, Célérité ou Hirondelle, puis avance ou fuit. Contrairement à la Pluie de potion, ne buffe pas l'ennemi. Sans allié vivant : « personne à viser ». | Viser allié, Potion jetable, Vigueur, Avancer \| Viser allié, Potion jetable, Célérité, Fuite \| Viser allié, Potion jetable, Hirondelle, Fuite | 0 % (tous) | 10,0 % Pêcheur (+4,0) | +0,0 / −15,0 / −15,0 |  |
| Gobelin tambourineur | 4/5 | Bégaiement (le Gobelin visé rejoue ses dernières cartes, surtout utile après un Estoc, mais il rejoue aussi un déplacement, ou touche l'ennemi s'il est devant), Provocation (retourne les ennemis à 1,5 m vers lui), Fuite. Se déplace vers ses alliés, reste derrière eux. | Viser allié, Avancer, Viser allié, Fuite, Bégaiement \| Viser allié, Avancer, Viser allié, Fuite, Bégaiement \| Viser, Avancer, Provocation, Fuite, Attendre | 0 % (tous) | 20,0 % Pêcheur (+7,0) | +0,0 / −5,0 / −5,0 |  |
| Prêtre des os | 5/3 | Prière, Rempart, Bouclier d'âme : blessures partagées entre alliés liés. Fuit le contact. | Prière, Viser allié, Rempart \| Viser allié, Potion jetable, Bouclier d'âme \| Fuite, Blocage, Attendre | 0 % (tous) | 19,2 % Pêcheur (+4,4) | +0,0 / −5,8 / −5,8 |  |
| Gobelin pilote de robot | 4/4 | Contrôleur à distance façon Marionnettiste, pour ses alliés (robots surtout) : Exo-nerf, Bégaiement. Avance avec eux, se replie, et frappe d'un Estoc en fin de cycle. | Avancer, Viser allié, Exo-nerf, Avancer \| Fuite, Viser allié, Bégaiement, Viser allié \| Exo-nerf, Viser, Avancer, Estoc | 5,0 % Archère (+5,0) | 31,0 % Pêcheur (+17,0) | +5,0 / +6,0 / +1,0 | 🟦 Ajouté |
| Orc shaman combattant | 7/3 | Se synchronise avec l'allié le plus proche, puis joue des cartes utiles au combat : buff de soi, Avancer, attaque. Les deux frappent ensemble. | Viser allié, Synchronisation, Fureur contenue \| Chemin, Avancer, Coup d'épée \| Viser allié, Synchronisation, Coup circulaire | 2,0 % Archère (+2,0) | 49,0 % Pêcheur (+29,0) | +2,0 / +24,0 / +22,0 | 🟦 Ajouté |
| Fantôme hanteur | 4/3 | Hante ses ALLIÉS : forme éthérée, Viser allié puis Hantise ; joue les cartes depuis la place de l'hôte sans être ciblable. | Forme éthérée, Viser allié, Hantise \| Coup d'épée, Attendre, Coup d'épée \| Viser allié, Hantise, Coup circulaire | 1,5 % Pêcheur (+1,5) | 50,0 % Pêcheur (+27,0) | +1,5 / +25,0 / +23,5 | 🟦 Ajouté |
| Contrôleur mental | 5/3 | Fait s'entre-tuer le groupe du joueur : Frénésie lancée, Hypnose, Charmer, Rage. Fuit. Inoffensif contre un joueur seul. | Viser, Frénésie lancée, Fuite \| Viser, Hypnose, Charmer \| Viser, Potion jetable, Rage | 0 % (tous) | 20,0 % Pêcheur (+12,0) | +0,0 / −5,0 / −5,0 | 🟦 Ajouté |
| Robot-Flinge | 6/3 | S'envole vers l'allié le plus lointain (Envol de l'ange), tire, puis se sauve. Échoue sans allié. | Envol de l'ange, Viser, Tir \| Dash arrière, Viser, Tir \| Envol de l'ange, Viser, Dash arrière | 0 % (tous) | 14,0 % Pêcheur (+13,0) | +0,0 / −11,0 / −11,0 |  |
| Garde au bouclier | 10/3 | Tank qui se téléporte devant l'allié le plus loin pour le protéger, puis boucliers, Contre et Coup d'épée. | Envol de l'ange, Blocage, Rempart \| Bouclier en bois, Contre, Attendre \| Chemin, Coup d'épée, Coup d'épée | 38,0 % Pêcheur (+32,9) | 77,0 % Pêcheur (+25,0) | +38,0 / +52,0 / +14,0 | 🟦 Ajouté |
| Tank épineux provocateur | 12/3 | Attire les coups : Provocation, Leurre, puis ronces / Carapace explosive : cœurs épineux qui blessent qui le frappe. Presque aucune attaque propre. | Provocation, Bouclier de ronces, Blocage \| Leurre, Rempart, Attendre \| Provocation, Carapace explosive, Coup circulaire | 26,2 % Pêcheur (+19,2) | 63,6 % Pêcheur (+17,6) | +26,2 / +38,6 / +12,4 | 🟦 Ajouté |

Fort contre : joueurs seuls face à un groupe, builds sans burst, groupes alliés (contrôleur mental). Faible contre : assassins, tireurs lointains, zones, Lasso/Grappin pour les isoler.

Points à vérifier à l'écriture : la livraison de potions (« Bouclier d'âme » après « Potion jetable » lie-t-il les éclaboussés ?), l'interaction Hantise + Forme éthérée, et que toute carte « preneuse » soit suivie d'une carte compatible.

### Longues chaînes
Une longue chaîne permet de jouer plusieurs actions APRÈS que le joueur ne peut plus rien faire : il doit se protéger d'une suite d'actions (se cacher, Esquive…) au lieu de l'esquiver en se déplaçant. Pioche haute, déplacement et préparation d'abord, coup à la fin. Chaque round contient du déplacement. Colonnes de sim à remplir après passage.

| Monstre | PV/pioche | Concept et comportement | Deck exact | Max solo | Max +Gobelin×2 | Force (solo / équipe / support) | State |
|---|---|---|---|---|---|---|---|
| Sniper | 3/7 | Se place, se concentre, puis vise et tire en fin de chaîne : inesquivable une fois visé. Son 2e round est entièrement Attendre (chaque Attendre ajoute de la concentration pour le tir suivant). Tir chargé : un tir de plus par 2 actions jouées avant. | Chemin, Avancer, Concentration, Attendre, Viser, Lunette, Tir \| Attendre ×7 \| Dash arrière, Chemin, Pas de côté, Concentration, Attendre, Viser, Tir chargé | 11,1 % Pêcheur (+0,7) | 48,0 % Pêcheur (+5,0) | +11,1 / +23,0 / +11,9 | 🟦 Ajouté |
| Hypnotiseur | 4/5 | Fait jouer aux unités du joueur des actions qui les handicapent (Attendre, Fuite, Viser allié + coup) ; Pensée unique transforme les cartes autour selon un mot-clé. | Chemin, Avancer, Viser, Hypnose, Attendre \| Viser, Hypnose, Viser allié, Estoc, Dash arrière \| Pas de côté, Pensée unique, Tir, Fuite, Viser | 1,1 % Archère (+1,1) | 22,0 % Pêcheur (+10,0) | +1,1 / −3,0 / −4,1 |  |
| Esprit vengeur | 3/4 | Assassin qui achève les faibles : Traque (fébrile le moins vivant, rate sinon), Possession (frappe le plus faible, prend sa place s'il meurt). | Forme éthérée, Viser de l'ombre, Pas de l'ombre, Avancer \| Traque, Possession, Fuite, Pas de côté \| Viser le plus blessé, Chemin, Avancer, Possession | 0 % (tous) | 34,0 % Archère (+13,0) | +0,0 / +9,0 / +9,0 | 🟦 Ajouté |
| Fantôme | 4/4 | Hante les unités du JOUEUR (≠ Fantôme hanteur, qui hante ses alliés) : Hantise, puis la carte suivante se joue depuis la place de l'hôte et frappe son entourage. Hantise rend déjà sans corps. | Viser, Hantise, Coup circulaire, Attendre \| Pas au hasard, Chemin, Avancer, Attendre \| Pas de côté, Viser, Hantise, Dague | 3,0 % Pêcheur et Archère (+0,0) | 44,0 % Pêcheur (+20,0) | +3,0 / +19,0 / +16,0 | 🟦 Ajouté |
| Cheval zombie | 6/5 | Monture de monstres : beaucoup de déplacement (Cheval), déplace ses alliés (Lasso allié, Accroche, Foulée, Échange). | Cheval, Chemin, Avancer, Lasso allié \| Cheval, Chemin, Viser allié, Accroche, Avancer \| Cheval, Foulée, Avancer, Viser allié, Échange | 0 % (tous) | 13,0 % Archère (+4,0) | +0,0 / −12,0 / −12,0 |  |

À vérifier à l'écriture : Hypnose ne prend peut-être que la carte suivante (pas `Viser allié, Estoc`) ; Échange ne vise pas (le `Viser allié` devant est peut-être inutile) ; Traque rate sans ennemi fébrile ; Pensée unique est « preneuse ».

### Nouvelle carte : Envol de l'ange (disponible)
Écrite dans `core/src/games/mecard/sim/card/subs/movement/AngelFlight.ts` (`ANGEL_FLIGHT`, rareté RARE, ajoutée à `ALL_CARDS`). Reste : test d'unité si absent.
- Effet prévu : se téléporte devant l'allié le plus lointain dans un cercle (rayon à fixer, ex. 6 m), orienté comme lui. Alliés seulement : sans allié dans le cercle, la carte échoue.
- Calquée sur `Blink` (`card/subs/movement/Blink.ts`, avec `battle.blink`/`blinkSpot`) et sur `Viser allié` (`movement/Orientation.ts`, tri inversé : le plus loin) ; placement « devant lui » comme `Traque`/`Téléportation d'assassin`.
- À repérer : `ALL_CARDS`, mots-clés dans `base/keywords`. Description française dans le style des autres. Test d'unité.

Règles de conception (mémoire) : doublons/hasard OK ; pas de plafond d'équilibrage ; mécanismes simples ; une carte « preneuse » est suivie de ce qu'elle prend ; taille 2 seulement pour les gros.

## Étapes
1. Valider noms exacts et imports des cartes (CLI `list cards --desc` + grep des constantes).
2. ~~Créer la carte Envol de l'ange~~ (faite ; vérifier le test).
3. Écrire les monstres dans `monsters.ts`.
4. Sprites : assigner/générer, vérifier l'existence des fichiers.
5. Sim CLI (`npm run cli -- sim`, voir `command_line/SIM.md`) pour repérer un monstre ridiculement fort ou inerte ; ajuster. Passage complet refait avec Envol de l'ange (186 cas, 18 600 combats, 566 s) ; colonnes « Max » à jour.

## Vérification
- `npm run cli --silent -- list monsters --desc` : les nouveaux apparaissent.
- `npm test` (catalogues, Visual, newContent).
- Lancer le jeu et affronter 2-3 nouveaux monstres pour vérifier sprites et comportements.
