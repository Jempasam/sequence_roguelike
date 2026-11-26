# Nouveaux monstres (Dungeon of the Mecard) : base des essais

## Où on en est
- **41 monstres à l'essai**, absents du jeu, réglés en simulation. Leurs définitions exactes sont dans [command_line/new_monsters.def](command_line/new_monsters.def), qui fait foi (`monster:Gobelin` en tête comme repère).
- Les 20 monstres de la base précédente déjà dans `monsters.ts` ne figurent plus ici.
- Rien n'est encore écrit dans `monsters.ts` : ni sprites, ni combats d'étage.
- Aucune carte ni objet nouveau : tout se joue avec l'existant.
- `sim` accepte `item:` et `usable:` sur un monstre, des deux côtés du `/` (voir [command_line/SIM.md](command_line/SIM.md)).

## Reste à faire
1. Faire choisir les monstres à garder.
2. Retravailler les faibles et les concepts qui se voient mal : Orc mitrailleur, Robot-Flinge, Robot arpenteur (laser), les potions lancées, les invocations sans place (voir « Remarques »).
3. Pour les retenus : constantes dans `core/src/games/mecard/sim/catalog/monsters.ts` (objets par le champ `items`, déjà appliqué aux adversaires par `foeOf`), ajout à `LOOT_MONSTERS`, sprites (`Visual.test.ts` vérifie qu'ils existent, skill pixel-art), combats d'étage dans `floor/fights/`, tests.

## Règles de conception
- Doublons et hasard permis, pas de plafond d'équilibrage, mécanismes simples.
- Une carte qui prend les suivantes (`Potion jetable`, `Petit sort`, `Hypnose`, `Robot improvisé`, `Par toutes les pièces`...) est suivie, dans le même round, de ce qu'elle prend.
- Taille 2 réservée aux gros.
- Chaînes de 3 à 5 pour la plupart, quelques exceptions de 6 à 8. Aujourd'hui : 7 monstres à 3, 16 à 4, 14 à 5, 2 à 6, 1 à 7, 1 à 8.
- Noms uniques face aux monstres, kits et familiers (vérifié pour les 41).

## Ce qui a marché pour régler un deck
- Allonger la chaîne et placer le déplacement juste avant le coup (`Chemin, Avancer, coup` ou `Viser, Tir`).
- Donner une attaque aux soutiens : sans elle, ils ne gagnent presque jamais.
- Se déplacer avant d'invoquer, sinon l'invocation précédente prend la place.
- Ne pas tirer juste après avoir posé une mine devant soi : le tir la touche.

## Mesure
- Winrate **du monstre** contre les kits Chevalier, Pêcheur et Archère, noté `C / P / A (moyenne)`, seul puis avec deux Gobelins. 100 combats par case, `--soft-win`, niveau 1, monstres `deck`, kits `smart8`. Marge de ±10 points.
- Repère, le Gobelin : seul `0 / 0 / 0 (0)`, à trois `3 / 13 / 28 (15)`.
- Cible tenue : au moins le Gobelin en équipe, environ 40 au plus seul.
- Ces chiffres viennent d'une copie temporaire du simulateur qui portait déjà les objets. Un contrôle avec l'outil du projet sur trois monstres à objets donne 5 points d'écart au plus, et aucun effet en erreur.

## Monstres
Deck : les rounds sont séparés par `/`, la pioche est la longueur d'un round.

### Orientation et position
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Gorgone | 7/4 | Étourdit qui la regarde : lui tourner le dos ou la prendre de côté. Un `Viser` du joueur devient un piège. | Chemin, Avancer, Regard glaçant, Estoc / Viser, Regard glaçant, Avancer, Estoc / Viser, Regard glaçant, Estoc, Pas de côté |  | 0 / 2 / 0 (1) | 11 / 47 / 59 (39) |  | |
| Mule rétive | 9/5 | Ne frappe que derrière elle (ruade, volte-face qui étourdit) : l'attaquer de face. | Chemin, Avancer, Avancer, Volte-face, Ruade / Viser, Retournement, Dash arrière, Ruade, Ruade / Chemin, Avancer, Volte-face, Ruade, Ruade |  | 22 / 55 / 42 (40) | 43 / 52 / 80 (58) |  | |
| Épouvantail | 10/3 | Tourne le dos à qui est près de lui au début du round, puis poignarde (×2 dans le dos) : finir le round loin de lui. | Chemin, Avancer, Dague / Attendre, Dague, Dague / Viser, Dague, Attendre | Masque effrayant | 38 / 37 / 1 (25) | 30 / 45 / 21 (32) | Masque vérifié ; il retourne aussi ses alliés | |
| Bouffon | 6/5 | Pose une mine, échange place et orientation avec le joueur, tire et poignarde. | Viser, Tir, Chemin, Avancer, Estoc / Viser, Mine, Pas de deux, Viser, Tir / Chemin, Avancer, Dague, Pas de deux, Dague |  | 3 / 2 / 0 (2) | 40 / 38 / 52 (43) | Très faible seul | |

### Gêner le tour du joueur
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Mime | 8/5 | Rejoue les cartes du joueur : jouer des cartes inoffensives devant lui. | Chemin, Avancer, Perroquet, Viser, Estoc / Viser, Perroquet, Attendre, Viser, Tir / Chemin, Avancer, Plagiat, Coup circulaire, Perroquet |  | 1 / 15 / 0 (5) | 24 / 58 / 49 (44) |  | |
| Mangeur de songes | 6/5 | Fait oublier un tour entier : rester hors de sa ligne (3,65 m). | Chemin, Avancer, Viser, Trou de mémoire, Dague / Viser, Trou de mémoire, Téléportation d'assassin, Dague, Dague / Chemin, Avancer, Trou de mémoire, Estoc, Fuite |  | 3 / 68 / 4 (25) | 32 / 71 / 45 (49) |  | |
| Geôlier | 9/4 | Muselle puis enchaîne : impossible de s'éloigner pendant qu'il frappe. | Viser, Muselière, Avancer, Coup d'épée / Chemin, Avancer, Chaîne de fer, Coup d'épée / Viser, Chaîne de fer, Coup circulaire, Coup d'épée |  | 20 / 47 / 1 (23) | 24 / 56 / 44 (41) |  | |
| Araignée tisseuse | 8/5 | Immobilise à la liane, empoisonne et lie les héros (toute blessure se répète) : se disperser. | Viser, Liane, Coup circulaire, Dague, Fuite / Viser, Potion jetable, Lien d'âme, Viser, Tir / Viser, Potion jetable, Poison, Viser, Tir |  | 18 / 29 / 4 (17) | 34 / 66 / 24 (41) | Les potions touchent rarement | |

### Mort et héritage
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Gobelin notaire | 5/3 | Lègue sa chaîne à l'allié le plus proche en mourant : le tuer isolé ou en dernier. | Viser, Tir, Tir / Pas de côté, Viser, Tir / Fuite, Viser, Tir | Testament | 0 / 0 / 0 (0) | 19 / 37 / 29 (28) | Testament visible dans 2 morts sur 45 | |
| Porteur d'urne | 4/7 | Cumule des bonus et les donne à ses alliés en mourant : le tuer tôt. | Grande bouteille, Vigueur, Chemin, Avancer, Coup d'épée, Viser, Tir / Grande bouteille, Hirondelle, Viser, Tir, Chemin, Avancer, Estoc / Bouteille, Célérité, Esquive, Contre, Chemin, Avancer, Coup circulaire | Urne, Sablier | 17 / 25 / 0 (14) | 40 / 68 / 36 (48) | Urne visible dans 10 morts sur 33 | |
| Porte-fanion | 5/4 | Après deux invocations mortes, double sa chaîne : épargner les leurres. | Leurre, Chemin, Avancer, Estoc / Viser, Tir, Viser, Tir / Boulet de canon, Dash arrière, Viser, Tir | Fanion | 1 / 7 / 18 (9) | 26 / 54 / 83 (54) | Fanion déclenché dans 57 combats d'équipe sur 60 : la parade du joueur pèse peu | |
| Embaumeur | 9/4 | Relève contre toi ceux qu'il tue : protéger les fragiles et les invocations. | Chemin, Avancer, Empaillage, Faux / Viser, Avancer, Autopsie, Coup d'épée / Empaillage, Chemin, Avancer, Autopsie |  | 1 / 31 / 0 (11) | 9 / 20 / 63 (31) |  | |

### Compte à rebours
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Robot en surchauffe | 8/4 | Surpuissant, mais meurt au bout de 3 rounds (+1 par victime) : fuir et tenir. | Surchauffe, Chemin, Avancer, Attendre / Chemin, Avancer, Coup circulaire, Attendre / Chemin, Avancer, Dash dégât, Coup d'épée / Chemin, Avancer, Coup circulaire, Attendre |  | 0 / 11 / 6 (6) | 24 / 56 / 62 (47) | Blesse beaucoup ses alliés | |
| Usurier gobelin | 4/3 | Commence avec 3 cartes de plus, en perd une par round : survivre au début. | Chemin, Avancer, Estoc / Viser, Tir, Tir / Chemin, Avancer, Coup d'épée | Reconnaissance de dette | 2 / 15 / 0 (6) | 29 / 39 / 40 (36) |  | |
| Flagellant | 8/4 | Gagne en force à chaque cœur perdu : l'achever d'un coup plutôt que l'effriter. | Chemin, Avancer, Coup du sacrifice, Coup circulaire / Chemin, Avancer, Coup d'épée, Scarification / Viser, Avancer, Estoc, Coup du sacrifice | Pacte de sang | 3 / 66 / 0 (23) | 18 / 69 / 57 (48) |  | |

### Zone et distance
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Escargot géant | 10/4 | Se blinde tant qu'il ne bouge pas, ralentit et tire : frapper au round où il rampe. | Viser, Crachat, Attendre, Attendre / Flaque, Lenteur, Viser, Tir / Attendre, Attendre, Viser, Tir / Chemin, Avancer, Coup circulaire, Attendre | Coquille d'escargot | 0 / 26 / 0 (9) | 9 / 52 / 30 (30) | Taille 2. Une poussée ne retire pas la coquille | |
| Golem aimanté | 11/4 | Attire tout le monde puis frappe autour : rester loin. | Chemin, Avancer, Aspiration, Tremblement / Attendre, Séisme, Chemin, Avancer / Chemin, Avancer, Attendre, Séisme | Aimant | 7 / 43 / 2 (17) | 20 / 40 / 46 (35) | Taille 2 | |
| Putois fétide | 9/4 | Empuantit les héros, qui se bousculent entre eux, et tire de loin : se séparer. | Chemin, Avancer, Estoc, Haleine de charogne / Viser, Tir, Viser, Tir / Viser, Haleine de charogne, Viser, Tir |  | 5 / 11 / 0 (5) | 29 / 31 / 68 (43) |  | |
| Lépreux | 9/5 | S'inflige des maux qui le renforcent et les refile : le tenir à distance. | Inoculation, Chemin, Avancer, Fièvre de combat, Coup d'épée / Scarification, Viser, Transfusion, Chemin, Estoc / Inoculation, Viser, Tir, Viser, Tir | Verre d'eau salée | 27 / 36 / 2 (22) | 52 / 62 / 47 (54) | Son coup d'épée touche plus ses alliés que le joueur | |
| Jongleur | 5/3 | Couteau aller-retour : sortir de la ligne avant la fin du round. | Viser, Couteau magique, Pas de côté / Pas de côté, Viser, Couteau magique / Viser, Couteau magique, Fuite |  | 5 / 35 / 6 (15) | 48 / 39 / 30 (39) | Timeouts (60 sur 600) | |
| Robot arpenteur | 8/5 | Tend un laser vers un allié et le balaie en bougeant : ne pas rester entre eux. | Lien laser, Viser, Tir, Viser, Tir / Lien laser, Chemin, Blink, Viser, Estoc / Lien laser, Chemin, Avancer, Coup circulaire, Pas de côté |  | 4 / 12 / 2 (6) | 43 / 63 / 60 (55) | Le laser touche rarement : concept à revoir | |

### Engins et armées
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Ferrailleur gobelin | 4/6 | Bricole des robots à programme : détruire les robots ou leur créateur. | Pas de côté, Robot improvisé, Missile, Dash arrière, Viser, Tir / Pas de côté, Viser, Tir, Viser, Tir, Fuite / Pas de côté, Robot improvisé, Robot arc, Dash arrière, Viser, Tir |  | 54 / 29 / 40 (41) | 44 / 54 / 56 (52) | Timeouts (62 sur 600) ; beaucoup d'invocations ratées faute de place | |
| Gobelin tonnelier | 7/5 | Pose des tonneaux de potion et les projette : choisir où les casser. | Chemin, Avancer, Tonneau, Poison, Projection / Viser, Potion jetable, Poison, Viser, Tir / Chemin, Avancer, Tonneau, Vulnérabilité, Projection |  | 30 / 20 / 1 (17) | 26 / 36 / 11 (24) | Les potions touchent rarement | |
| Roi déchu | 6/8 | Commande ses pièces d'échecs : les nettoyer avant qu'elles s'accumulent. | Pion, Pas de côté, Pion, Pas de côté, Tour, Pas de côté, Échec, Échec / Par toutes les pièces, Avancer, Échec, Fuite, Visée des pions, Échec, Pas de côté, Échec / Cavalier, Pas de côté, Par toutes les pièces, Viser, Par toutes les pièces, Estoc, Échec, Fuite |  | 34 / 18 / 33 (28) | 57 / 24 / 65 (49) | Invocations souvent ratées faute de place | |
| Gobelin catapulté | 9/5 | Se propulse en fin de round sur une trajectoire annoncée : s'en écarter. | Viser, Lance-pierre, Dash arrière, Attendre, Attendre / Chemin, Avancer, Coup circulaire, Viser, Catapulte / Viser, Lance-pierre, Dash arrière, Viser, Tir |  | 0 / 27 / 33 (20) | 11 / 34 / 36 (27) | La propulsion semble aussi le blesser (à vérifier) | |

### Embuscade et tir
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Gobelin démineur | 6/4 | Mines, pièges et tirs : ne pas foncer en ligne droite. | Viser, Tir, Viser, Tir / Chemin, Piège à ours, Viser, Tir / Viser, Mine, Dash arrière, Tir |  | 19 / 5 / 0 (8) | 44 / 10 / 14 (23) |  | |
| Gobelin artificier | 6/4 | Dash explosif qui l'épargne, bombes et grenades. | Viser, Dash explosif, Dash arrière, Tir / Viser, Bombe, Viser, Tir / Chemin, Dash explosif, Viser, Grenade flash |  | 2 / 5 / 1 (3) | 37 / 50 / 28 (38) |  | |
| Esprit d'orage | 4/3 | Plasma et tempête : étourdit, brûle et pousse. | Viser, Petit sort, Plasma / Pas de côté, Viser, Conjuration / Viser, Grand sort, Tempête |  | 10 / 10 / 6 (9) | 46 / 42 / 41 (43) |  | |
| Orc mitrailleur | 4/5 | Tireur lourd, mitraillette qui pivote à chaque touche. | Chemin, Avancer, Viser, Mitraillette, Fuite / Tir de couverture, Viser, Mitraillette, Viser, Tir / Pas de côté, Viser, Pluie de balles, Fuite, Tir de couverture |  | 0 / 4 / 0 (1) | 18 / 18 / 22 (19) | Faible : à retravailler | |

### Mêlée
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Chauve-souris | 5/5 | Saute dans le dos, fait saigner et repart. | Téléportation d'assassin, Dague, Enchaînement sanglant, Dague, Dash arrière / Chemin, Blink, Dague, Viser, Dague / Téléportation d'assassin, Saignement, Dague, Fuite, Pas de côté |  | 8 / 16 / 1 (8) | 25 / 58 / 47 (43) |  | |
| Rôdeur des ombres | 4/3 | Assassin qui frappe dans le dos et passe à travers les murs. | Téléportation d'assassin, Dague, Dash arrière / Viser de l'ombre, Pas de l'ombre, Dague / Téléportation d'assassin, Dague, Dague |  | 2 / 16 / 1 (6) | 18 / 36 / 41 (32) |  | |
| Golem kamikaze | 8/4 | Bombe lente qui finit par exploser. | Carapace explosive, Chemin, Avancer, Avancer / Chemin, Avancer, Avancer, Coup circulaire / Chemin, Dash dégât, Chemin, Kamikaze |  | 0 / 0 / 39 (13) | 11 / 27 / 63 (34) |  | |
| Gladiateur à la hache | 9/3 | Hache buveuse de sang, peu mobile : le tenir à distance. | Chemin, Avancer, Fureur contenue / Hache buveuse de sang, Attendre, Hache buveuse de sang / Chemin, Brisage de crâne, Attendre |  | 35 / 17 / 0 (17) | 65 / 47 / 31 (48) |  | |

### Soutien et contrôle
| Monstre | PV/pioche | Concept et réaction demandée | Deck exact | Objets | Seul C / P / A | +2 Gobelins C / P / A | Remarques | State |
|---|---|---|---|---|---|---|---|---|
| Orc chaman | 7/4 | Totems et soins. | Totem, Dash arrière, Viser allié, Bandage / Chemin, Avancer, Totem de cri, Coup d'épée / Chemin, Avancer, Coup d'épée, Estoc |  | 2 / 6 / 25 (11) | 12 / 39 / 34 (28) |  | |
| Troll en armure | 11/4 | Va vers ses alliés, les protège et provoque. | Viser allié, Avancer, Rempart, Provocation / Chemin, Avancer, Provocation, Coup circulaire / Blocage, Chemin, Avancer, Coup d'épée |  | 0 / 39 / 2 (14) | 9 / 84 / 48 (47) |  | |
| Gobelin brasseur | 8/5 | Potions de vigueur aux alliés, de poison aux héros. | Viser, Potion jetable, Poison, Viser, Tir / Viser allié, Potion jetable, Vigueur, Viser, Tir / Bouteille, Vigueur, Chemin, Avancer, Coup d'épée |  | 1 / 1 / 0 (1) | 31 / 35 / 28 (31) | Les potions touchent rarement | |
| Gobelin tambourineur | 6/5 | Fait bégayer ses alliés, tire et provoque. | Viser allié, Bégaiement, Viser, Tir, Tir / Chemin, Avancer, Estoc, Provocation, Coup circulaire / Viser allié, Bégaiement, Viser, Estoc, Fuite |  | 0 / 3 / 0 (1) | 11 / 55 / 27 (31) |  | |
| Prêtre des os | 6/4 | Prière, remparts et blessures partagées entre les liés. | Prière, Viser, Potion jetable, Bouclier d'âme / Viser allié, Rempart, Viser, Tir / Fuite, Viser, Tir, Blocage |  | 3 / 8 / 0 (4) | 23 / 51 / 22 (32) | Les potions touchent rarement | |
| Robot-Flinge | 7/4 | Rejoint son allié le plus loin et tire. | Envol de l'ange, Viser, Tir, Tir / Dash arrière, Viser, Tir, Tir / Envol de l'ange, Viser, Arbalète, Dash arrière |  | 3 / 1 / 2 (2) | 17 / 18 / 22 (19) | Faible : à retravailler. Envol de l'ange rate sans allié | |
| Gobelin hypnotiseur | 7/6 | Fait jouer au héros des actions contre lui (Coup du sacrifice, Coup circulaire). | Chemin, Avancer, Viser, Hypnose, Coup du sacrifice, Estoc / Viser, Tir, Viser, Hypnose, Coup circulaire, Dash arrière / Chemin, Avancer, Viser, Estoc, Hypnose, Attendre |  | 0 / 0 / 0 (0) | 6 / 34 / 51 (30) | Nul seul | |
| Cheval zombie | 8/5 | Charge, rue et déplace ses alliés. | Charge de cavalerie, Chemin, Dash dégât, Viser allié, Accroche / Cheval, Chemin, Avancer, Ruade, Attendre / Viser, Lasso, Charge de cavalerie, Volte-face, Ruade |  | 0 / 0 / 4 (1) | 12 / 36 / 61 (36) | Charges souvent bloquées, Accroche trouve rarement un allié | |

Colonne **State** : vide (à l'essai), `🟦 Ajouté` (écrit dans `monsters.ts`), `🟩 Validé` (testé en jeu, sprite et comportement vérifiés).

## Protocole de test
Depuis la racine du dépôt. Chaque monstre de `X` (`@new_monsters.def`, ou une liste de `monster(...)`) est testé seul puis avec deux Gobelins contre les trois kits :

```
npm run cli --silent -- sim --match "{X}/kit:Chevalier" --match "{X}/kit:Pêcheur" --match "{X}/kit:Archère" --match "{X}+monster:Gobelin*2/kit:Chevalier" --match "{X}+monster:Gobelin*2/kit:Pêcheur" --match "{X}+monster:Gobelin*2/kit:Archère" --games 100 --ai monster=deck,kit=smart8 --soft-win --out winrate,timeouts,errors
```

Le fichier entier fait 25 200 combats (environ 25 minutes sur 12 threads) : au-delà de 20 000 la commande demande confirmation. Pour régler un deck, `--games 40` suffit.

### Combat journalisé
Un combat par kit avec le journal complet, en bash ; remplacer `GladiateurHache` par le nom voulu :

```
M=$(grep -m1 "^monster(GladiateurHache=" command_line/new_monsters.def | sed 's/,$//')
npm run cli --silent -- sim --match "{$M}+monster:Gobelin*2/kit:Chevalier" --match "{$M}+monster:Gobelin*2/kit:Pêcheur" --match "{$M}+monster:Gobelin*2/kit:Archère" --games 1 --seed 1 --ai monster=deck,kit=smart8 --soft-win --out winrate,rounds,timeouts,errors --log combat.txt
```

Le journal montre chaque pioche, chaîne, déplacement, blessure et statut. Chercher : cartes ratées ou sans cible, coups hors de portée, mécanique qui ne se déclenche jamais, monstre qui blesse surtout les siens.
