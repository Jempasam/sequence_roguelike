import { STRATEGIES } from "./strategies"

const SUMMARY = `sim : combats aléatoires en masse, un winrate par combattant (ligne) et par sortie (colonne).
Détails : command_line/SIM.md ; sim --help out | def | ai pour une syntaxe.

Usage : npm run cli -- sim [options]

  --of <liste>        combattants mesurés : Nom, type:Nom, kits, monsters, pets, all
                      (défaut : les --def, sinon kits)
  --out <liste>       sorties (colonnes) : [équipe/]adversaire, total       (sim --help out)
                      défaut : total,solo,team,cave,forest,mine,hell,kits
  --def <définition>  kit/monstre custom, "Nom=Carte*2,item:X,usable:Y" ou @fichier (sim --help def)
  --pool <liste>      d'où tirer les coéquipiers aléatoires (défaut kits)
  --ai <liste>        pilotage : lookahead[:K] (défaut), deck, random, suffixe -usables (sim --help ai)
  --level N           niveau d'étage des monstres (défaut 1)
  --layer n|a-b       couche(s) de la carte du biome où piocher le combat (défaut 0-3 ; le boss est en 11)
  --fight battle|elite|boss   sorte de combat piochée sur la carte (défaut battle)
  --games N           combats par cellule (défaut 30)
  --seed N            graine (défaut 1) : même graine, même sortie
  --max-rounds N      au-delà, le combat est un timeout, hors winrate (défaut 60)
  --stall N           N rounds de suite sans que personne ne gagne ni ne perde de vie : blocage, compté
                      comme un timeout (défaut 10 ; 0 pour ne jamais couper)
  --soft-win          un combat en timeout va au camp qui a le plus abîmé l'autre (voir SIM.md)
  --jobs N|auto      threads qui jouent les combats (défaut auto : tous les cœurs au-delà de 100 combats)
  --show <liste>      en plus du winrate : n, ci, draws, timeouts, rounds, errors, wins, softwins, losses, softlosses
  --sort <colonne>    tri décroissant (colonne ou name) ; défaut total, sinon la 1re colonne
  --top K             garde les K premières lignes (K négatif : les K dernières)
  --flip              lignes et colonnes échangées
  --format table|csv|json   (défaut table)
  --quiet             ni progression ni confirmation (demandée au-delà de 20 000 combats)

Exemples :
  sim --of Lancier --out monsters,kits
  sim --out total,solo,team,cave,forest,mine,hell,kit:kits --games 50
  sim --of Mage --out with:kits --flip --top 5
  sim --def "Lancier+=@Lancier,Estoc*2,-Avancer" --out solo/cave,team/kits --show ci`

const OUT = `--out : la liste des colonnes voulues. Une sortie s'écrit [équipe/]adversaire.

équipe (le sujet de la ligne et ses alliés)
  solo                 le sujet seul
  team                 le sujet + 2 coéquipiers tirés dans --pool
  team:N               équipe de N (1 à 6)
  with:A[+B]           le sujet + A (+ B) : équipe fixée
  with:<groupe>        une colonne par partenaire du groupe (kits, monsters, pets, all)

adversaire
  monsters             un biome tiré au hasard à chaque combat
  cave forest mine hell   les monstres de ce biome (couches --layer, niveau --level)
  kits                 une équipe de kits au hasard, de même taille que la nôtre (kits:custom, kits:official)
  kit:A[+B]            adversaire fixé (complété au hasard à la taille de l'équipe)
  kit:<groupe>         une colonne par kit du groupe
  encounter:Gobelin*3+Archer   des monstres précis (7 au plus)

total                  winrate de toutes les autres colonnes réunies

Une équipe seule affronte monsters. Un adversaire seul est affronté seul puis en équipe de 3, résultats réunis.
Exemples : solo   team   cave   team/kits   solo/cave   with:Mage   with:kits/cave   solo/kit:kits`

const DEF = `--def : définit des kits (ou des monstres) pour les tester avant de les implémenter.

  --def "Nom=élément,élément"     plusieurs définitions : séparées par ; (--def répétable)
  --def @fichier.txt              une définition par ligne, # commente
  --def @fichier.ts               module exportant kits et/ou monsters (cartes pas encore au catalogue)

élément
  Carte, Carte*N       cartes, dans l'ordre du deck ("Coup d'épée*2")
  item:Nom[*N]         objet de départ (kit seulement)
  usable:Nom[*N]       usable de départ (kit seulement)
  @Base                part d'un kit ou monstre du jeu, ou défini plus tôt (@kit:X, @monster:X si ambigu)
  -Carte  -item:Nom  -usable:Nom   (avec *N)   retire un élément hérité de @Base
  heart:Type[*N]       N cœurs de ce type, dans l'ordre donné : rouge (le seul d'un monstre), rose, noir… ;
                       sans aucun heart:, un kit a 6 rouges ; -heart:Type[*N] en retire à ceux de @Base
  draw:N  size:N       pioche et taille : font un monstre

Un nom identique à un officiel le remplace. Casse et accents sont ignorés. Réservés : ; , * =
Noms exacts : npm run cli -- list cards | items | usables

Exemple : --def "Duelliste=Avancer*2,Estoc*3,Esquive,item:Grimoire,usable:Tube de colle;Lancier+=@Lancier,Estoc*2,-Avancer"`

function ai(): string {
    return `--ai : qui joue les chaînes. Liste d'entrées :
  <ia>                 les alliés ; plusieurs <ia> = un tableau par IA
  Nom=<ia>             un combattant précis, quelle que soit sa place
  foes=<ia>            les adversaires qui sont des kits (défaut : la même IA que les alliés) ; les monstres gardent l'IA du jeu

IA
${STRATEGIES.map(each => `  ${each.name.padEnd(10)} ${each.description}`).join("\n")}

Toute IA utilise les usables à chaque round ; le suffixe -usables les laisse de côté (deck-usables).
Exemples : --ai deck,lookahead   --ai Mage=lookahead,foes=random`
}

/** The help of `sim`, or of one syntax of it. */
export function helpText(topic: string|null): string {
    switch(topic){
        case "out": return OUT
        case "def": return DEF
        case "ai": return ai()
        default: return SUMMARY
    }
}

export const HELP_TOPICS = ["out", "def", "ai"]
