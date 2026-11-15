import { STRATEGIES } from "./strategies"

const SUMMARY = `sim : combats aléatoires en masse, un winrate par combat décrit (ligne) et par statistique (colonne).
Détails : command_line/SIM.md ; sim --help match | out | define | ai pour une syntaxe.

Usage : npm run cli -- sim --match "<alliés>/<adversaires>" [options]

  --match <desc>      un combat décrit : alliés/adversaires, des sources séparées par +    (sim --help match)
                      répétable ; {source} = une ligne par combat de la source
  --out <liste>       colonnes : winrate (défaut), n, ci, draws, timeouts, rounds, errors, wins, softwins,
                      losses, softlosses ; total ajoute une ligne avec tous les combats      (sim --help out)
  --ai <liste>        pilotage : kit=, monster=, pet=, allies=, foes=, Nom=, ou une IA seule (= kit=) (sim --help ai)
  --level N           niveau d'étage des monstres (défaut 1)
  --layer n|a-b       couche(s) de la carte du biome où piocher les combats fight:/biome: (défaut 0-3 ; le boss est en 11)
  --fight battle|elite|boss   sorte de combat piochée sur la carte (défaut battle)
  --games N           combats par ligne (défaut 30)
  --seed N            graine (défaut 1) : même graine, même sortie
  --max-rounds N      au-delà, le combat est un timeout, hors winrate (défaut 60)
  --stall N           N rounds de suite sans que personne ne gagne ni ne perde de vie : blocage, compté
                      comme un timeout (défaut 10 ; 0 pour ne jamais couper)
  --soft-win          un combat en timeout va au camp qui a le plus abîmé l'autre (voir SIM.md)
  --jobs N|auto      threads qui jouent les combats (défaut auto : tous les cœurs au-delà de 100 combats)
  --sort <colonne>    tri décroissant des lignes (une colonne de --out, ou name) ; défaut la 1re colonne
  --top K             garde les K premières lignes (K négatif : les K dernières)
  --flip              lignes et colonnes échangées
  --format table|csv|json   (défaut table)
  --quiet             ni progression ni confirmation (demandée au-delà de 20 000 combats)
  --log FICHIER       écrit le journal complet de chaque combat joué (chaînes, cartes, mouvements, vie, statuts…)

Exemples :
  sim --match "{kits}/random:fight:cave"                    chaque kit seul contre un combat de grotte
  sim --match "{kit:Mage}+random:kits/{monsters}" --out winrate,rounds     Mage + un kit au hasard contre chaque monstre
  sim --match "{kits}+random:kits+random:kits/random:fight:hell" --games 50 --top 5`

const MATCH = `--match : la description d'un combat, alliés/adversaires (un seul / hors parenthèses). Chaque côté est
une liste de sources séparées par + ; rien n'est tiré ni complété sans l'écrire.

source                  fights    membres du combat n°i
  Nom, kit:Nom, monster:Nom   1       ce combattant du jeu ; Nom*3 en met trois
  kit(Nom=…) pet(Nom=…)       1       défini en place, deck mélangé (sim --help define)
  monster(Nom=size:N,…)       1       défini en place, deck trié : size:N obligatoire, deck en entier dans l'ordre
  kits monsters pets all      taille  le i-ième du groupe
  fight:cave|forest|mine|hell  nb de combats   les monstres du combat i du biome (--layer, --fight)
  biome:cave|…                 nb de monstres  le i-ième monstre du biome
  cross(A,B)                  A×B     les membres de A puis de B, tous les couples
  [A,B,C]                     somme   les combats de A, puis de B, puis de C
  sum(A,B)                    le plus grand  A et B appariés un à un (la plus courte repart du début)
  random:S                    1       un combat de S tiré au hasard (écarte les kits déjà pris)
  set:A:S                     celui de S   comme S, et retient le combat sous le nom A, pour ce combat
  get:A                       1       ce que set:A a retenu (après lui dans l'ordre alliés puis adversaires)
  S*N                         celui de S   les combattants de S en N copies (1 à 7), d'un seul tirage
  @fichier                    celle du fichier : lu sur une ligne, commentaires # et blancs retirés

lignes : {source} autour d'une source de la racine d'une équipe en fait une ligne par combat.
  Plusieurs {} se croisent : {kits}/{monsters} = une ligne par couple (kit, monstre).
  Une source de plusieurs combats sans {} ni random: est une erreur : {kits}, ou random:kits.
  Pas de {} dans une source : random:{kits} et [{kits},A] sont refusés.
  encounter:Gobelin*3+Archer   des monstres précis, comme adversaires

copies : {set:m:monsters}+get:m/kit:Pêcheur = chaque monstre avec une copie de lui-même ;
         {set:k:kits}/get:k = chaque kit contre lui-même ; {monsters*2} = chaque monstre en deux exemplaires.
Exemples : {kits}/random:fight:cave   {kit:Pêcheur}+random:kits/{monsters}
           {kit:Mage}/random:[fight:cave,fight:forest]   kit(Duel=Avancer*3,Estoc*3,heart:rouge*4)/fight:mine`

const OUT = `--out : les colonnes du tableau, une statistique des combats d'une ligne chacune, et les sorties générales.

colonnes   winrate (défaut)  n  ci (marge à 95 %, points)  draws  timeouts  rounds (moyens)
           errors  wins  softwins  losses  softlosses
général    total : une dernière ligne avec tous les combats des lignes réunis

--sort prend une de ces colonnes ou name ; --top et --flip portent sur les lignes.
Exemples : --out winrate,n,rounds   --out winrate,total --sort name`

const DEFINE = `Définir des kits ou des monstres pour les tester avant de les implémenter : il n'y a plus de --def,
un combattant s'écrit dans --match, comme une source.

  kit(Nom=élément,élément)         un kit, deck mélangé          pet(Nom=…)  un familier
  monster(Nom=size:N,élément,…)    un monstre, deck trié (size:N obligatoire, deck en entier dans l'ordre)
  @fichier.def                     un fichier lu comme une source : [kit(A=…),kit(B=…)] sur plusieurs lignes,
                                   # commente ; --match "{@mes-kits.def}/random:kits"

élément
  Carte, Carte*N       cartes, dans l'ordre du deck ("Coup d'épée*2")
  item:Nom[*N]         objet de départ (kit seulement)
  usable:Nom[*N]       usable de départ (kit seulement)
  @Base                part d'un kit ou monstre du jeu (@kit:X, @monster:X si ambigu)
  -Carte  -item:Nom  -usable:Nom   (avec *N)   retire un élément hérité de @Base
  heart:Type[*N]       N cœurs de ce type, dans l'ordre donné : rouge (le seul d'un monstre), rose, noir… ;
                       sans aucun heart:, un kit a 6 rouges ; -heart:Type[*N] en retire à ceux de @Base
  draw:N  size:N       pioche et taille : font un monstre

Un combattant défini en place est à part : il ne remplace pas celui du jeu qui porte son nom. Casse, accents et
blancs sont ignorés. Réservés : , * = ( ). Noms exacts : npm run cli -- list cards | items | usables

Exemples : --match "kit(Duelliste=Avancer*2,Estoc*3,Esquive,item:Grimoire,usable:Tube de colle)/random:fight:cave"
           --match "kit(Piquier+=@Piquier,Estoc*2,-Avancer)/random:fight:cave"`

function ai(): string {
    return `--ai : qui joue les chaînes. Liste d'entrées :
  kit=<ia> monster=<ia> pet=<ia>   tous les kits / monstres / familiers, quel que soit leur camp
  <ia>                              une IA seule vaut kit=<ia> ; plusieurs = un tableau par IA
  allies=<ia> foes=<ia>             tous les combattants d'un camp (gauche / droite de --match)
  Nom=<ia>                          un combattant précis, quelle que soit sa place

Le plus précis l'emporte : Nom= > allies=/foes= > kit=/monster=/pet= > défaut.
Défaut, comme dans le jeu : kit=smart (le dernier smartN), monster=deck, pet=deck.

IA
${STRATEGIES.map(each => `  ${each.name.padEnd(10)} ${each.description}`).join("\n")}

Toute IA utilise les usables à chaque round (smart3 et suivants seulement quand ils servent) ; le suffixe -usables les laisse de côté (deck-usables).
Exemples : --ai deck,smart3   --ai Mage=smart3,foes=random   --ai monster=smart8`
}

/** The help of `sim`, or of one syntax of it. */
export function helpText(topic: string|null): string {
    switch(topic){
        case "match": return MATCH
        case "out": return OUT
        case "define": return DEFINE
        case "ai": return ai()
        default: return SUMMARY
    }
}

export const HELP_TOPICS = ["match", "out", "define", "ai"]
