import { Label } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import { CARTE, COMPOSITE, DECK, FUSION, INVOCATION, SUPPRESSION, UNIT } from "../../sim/base/keywords"
import { ALL_MONSTERS } from "../../sim/catalog/monsters"
import { RED_HEART } from "../../sim/heart/subs/RedHeartKind"
import { BURN } from "../../sim/status/subs/Burn"
import { DODGE } from "../../sim/status/subs/Dodge"
import { ROOTED } from "../../sim/status/subs/Rooted"
import { SLOWED } from "../../sim/status/subs/Slowness"

import { engineColor } from "../look/colors"
import {
    cardNamed, cards, chain, component, heading, hearts, note, paragraph, plug, quote, subheading,
    terms, together, transform,
} from "./GuideBlocks"
import type { GuideBlock, Term } from "./GuideBlocks"
import { arenaSketch, band, mapSketch, ring, roundTimeline, sector } from "./sketches"

const AVANCER = cardNamed("Avancer")
const VISER = cardNamed("Viser")
const CHEMIN = cardNamed("Chemin")
const TIR = cardNamed("Tir")
const COUP_EPEE = cardNamed("Coup d'épée")
const ESTOC = cardNamed("Estoc")
const COUP_CIRCULAIRE = cardNamed("Coup circulaire")
const DAGUE = cardNamed("Dague")
const REPETER_2 = cardNamed("Répéter ×2")
const REPETER_3 = cardNamed("Répéter ×3")
const DOUBLE_DIAGONALE = cardNamed("Double diagonale")
const CINQUANTE = cardNamed("50 %")
const ESTOC_INSTABLE = cardNamed("Estoc instable")
const PETIT_SORT = cardNamed("Petit sort")
const FEU = cardNamed("Feu")
const PRIERE = cardNamed("Prière")
const CONCENTRATION = cardNamed("Concentration")
const CHARMER = cardNamed("Charmer")
const EFFRAYER = cardNamed("Effrayer")

/** A quarter turn, so a unit faces up on the sketches of the arena. */
const UP = -Math.PI / 2

/** What a stat reads, and what raises it: one line of the list of stats. */
function stat(name: string, reads: string, item: string): Term {
    return { head: name, text: `${reads} L'objet « ${item} » l'augmente.` }
}

/** The status a term tells, its name in its color. */
function statusTerm(type: typeof BURN, level: number): Term {
    return {
        head: theme => new Label(theme, type.name, { color: engineColor(type.color) }),
        text: type.describe(level),
    }
}

/** The rounds a monster plays one after the other, over and over, each a row of cards. */
function loopOf(name: string): GuideBlock {
    const monster = ALL_MONSTERS.find(each => each.name === name)
    if(!monster) throw new Error(`The guide names the monster "${name}", which the catalog does not have.`)
    const rounds: GuideBlock[] = []
    for(let first = 0; first < monster.cards.length; first += monster.draw){
        rounds.push(cards(monster.cards.slice(first, first + monster.draw), `Round ${rounds.length + 1}`))
    }
    return together(...rounds)
}

/**
 * The guide of the game, from the first run to the details of a fight: the blocks it is made of, in the order
 * they are read. A block that shows a card or a heart draws it as the game does, so the guide never says
 * of a card more than the card does. The keywords it writes are objects, so a pointer over one explains it.
 */
export const GUIDE: readonly GuideBlock[] = [
    //// 1. Welcome ////
    heading("Bienvenue"),
    paragraph(concat(
        "Dungeon of the Mecard est un jeu de combats tactiques en chaînes de cartes. Tu diriges une petite équipe ",
        "de héros à travers un donjon : elle se bat, ramasse du butin, grossit ses ", DECK.as("decks"),
        ", puis descend d'étage en étage. Quand tous les héros sont tombés, la run est finie et il faut recommencer.",
    )),
    paragraph(concat(
        "Il n'y a pas d'arme ni de sort appris : ",
        "tout ce que ton personnage sait faire, ce sont les ", CARTE.as("cartes"), " de son ", DECK, ".",
    )),
    cards([ESTOC, ESTOC, ESTOC], concat("Le Lancier commence avec trois ", ESTOC, ", l'Épéiste avec trois ", COUP_EPEE, ".")),

    //// 2. Hands on ////
    heading("Prendre en main le jeu"),
    paragraph(
        "Trois gestes à connaître. Ils marchent partout dans le jeu : en combat, sur la carte, dans les haltes, "
        + "et dans ce guide.",
    ),
    paragraph("Survole une carte, un cœur, un objet ou un statut : sa description s'affiche dans la boîte, en bas de l'écran."),
    cards([ESTOC], "Passe ta souris sur cette carte. Sa description s'affiche tout en bas."),
    paragraph("Clic droit : verrouille la boîte telle qu'elle est, un cadre blanc l'entoure. Un deuxième clic droit la libère."),
    paragraph(concat(
        "Les mots en couleur sont des mots-clés : ", CARTE, ", ", DECK, ", ", UNIT, ", ", FUSION, ", ",
        INVOCATION.as("invoquer"), ", ", SUPPRESSION, "… Passe la souris sur l'un d'eux, dans ce guide comme dans une ",
        "description : son explication s'affiche dans la boîte. Clic droit pour la verrouiller, et continue : un mot-clé ",
        "dans l'explication a la sienne.",
    )),
    paragraph(concat("Essaie sur ces mots : ", CARTE, ", ", DECK, ", ", UNIT, ".")),
    cards([ESTOC_INSTABLE], concat(
        "Survole cette carte : sa description contient le mot-clé ", FUSION, ". Survole-le à son tour, puis clic droit.",
    )),
    quote("En cas de doute sur n'importe quoi : survole-le."),
    subheading("Cartes infinies"),
    paragraph(concat(
        "Tes héros savent toujours avancer et se tourner : ", cardNamed("Avancer"), " et Tourner",
        " ne sont dans aucun ", DECK, ". Elles sont en tête de ta main, bordées de blanc : un clic en pose une copie dans ta ",
        "chaîne, une seule fois par tour : une fois posée, elle grise. Sur Tourner, clique le cadran pour choisir la ",
        "direction du trait, ou clique la carte pour la poser. Dans les haltes qui montrent ton ", DECK,
        ", elles figurent aussi, et on peut les choisir plusieurs fois.",
    )),

    //// 3. A game from afar ////
    heading("Une partie, vue de loin"),
    paragraph(
        "Une run descend un voyage : une carte de lieux reliés par des chemins. À chaque lieu, un combat ou une halte. "
        + "Les combats rapportent de l'or et une récompense. Les haltes (taverne, forge, hôpital, magasin…) servent à "
        + "soigner, recruter, améliorer ou acheter.",
    ),
    component(({ theme }) => mapSketch(theme)),
    note("Les chemins ne se croisent jamais. Jamais trois combats ni trois haltes de suite."),
    paragraph(
        "Chaque étage a sa couleur, ses monstres et son boss : la Grotte (Golem runique), la Forêt (Troll), la Mine "
        + "(Robot Megalaser), l'Enfer (Diable). En fin de carte, une sortie mène à l'étage suivant.",
    ),
    paragraph(
        "Ta partie est sauvegardée à chaque sortie de combat et de halte. « Continuer » dans le menu reprend là où tu "
        + "t'étais arrêté. Une défaite efface la sauvegarde.",
    ),

    //// 4. A fight, round by round ////
    heading("Un combat, round par round"),
    paragraph("Un combat se joue en rounds. Dans chacun :"),
    component(({ theme }) => roundTimeline(theme)),
    paragraph(concat(
        "1. Pioche : chaque personnage pioche 2 ", CARTE.as("cartes"), ", une par ", DECK, " à tour de rôle.",
    )),
    paragraph(concat(
        "2. Préparation : tu poses une chaîne de 4 ", CARTE.as("cartes"), " au plus. Les bots annoncent la leur : tu vois ce ",
        "que les monstres vont faire avant de poser la tienne.",
    )),
    paragraph("3. Fin de préparation : les chaînes sont verrouillées et mises en place."),
    paragraph("4. Révélation : toutes les chaînes sont montrées."),
    paragraph(concat(
        "5. Exécution : les ", UNIT.as("unités"), " jouent leurs étapes à tour de rôle, une étape à la fois, dans l'ordre ",
        "d'initiative.",
    )),
    paragraph("6. Fin de round : brûlures et statuts qui expirent, défausse."),
    paragraph("Le round finit quand plus personne n'a d'étape à jouer."),
    quote("Tu décides avant de voir. Une chaîne se pose en une fois, puis elle se joue sans toi."),

    //// 5. Reading a chain ////
    heading("Lire une chaîne"),
    paragraph(
        "Il y a deux grandes sortes de cartes : celles qui se jouent pendant l'exécution (les actions et ce qui les "
        + "modifie), et les cartes de préparation, qui n'agissent pas elles-mêmes : elles changent la chaîne avant "
        + "qu'elle se joue. La couleur du bandeau et le mot en bas de la carte te disent à quelle famille elle appartient.",
    ),
    terms([
        { head: "Action", text: concat("Fait quelque chose, rien à brancher : ", AVANCER, ", ", COUP_EPEE, ", ", TIR, ".") },
        {
            head: "Modificateur",
            text: concat("Se branche sur l'action à sa droite et la change : ", REPETER_2, ", ", DOUBLE_DIAGONALE, ", ", CINQUANTE, "."),
        },
        { head: "Lanceur", text: concat("Se branche sur un élément et s'en sert : ", PETIT_SORT, ".") },
        { head: "Élément", text: concat("Se branche sur un lanceur et ne fait rien seul : ", FEU, ".") },
        {
            head: "Préparation",
            text: concat("Change la chaîne avant l'exécution : les ", FUSION.as("collages"), ", ", PRIERE, ", ", CONCENTRATION, "."),
        },
    ]),
    subheading("Poser des cartes à la suite"),
    paragraph(
        "Deux actions de suite se jouent l'une après l'autre, une par tour : à chaque tour, chaque unité joue une seule "
        + "étape, puis c'est au suivant. Ici, le héros se tourne vers sa cible à son premier tour, puis tire au tour suivant.",
    ),
    chain([plug(VISER), plug(TIR)], "Viser puis tirer : deux tours, une étape par tour."),
    subheading("Brancher une carte dans une autre"),
    paragraph(concat(
        "Un modificateur agit sur la carte qui est à sa droite. ", REPETER_3, " suivi de ", ESTOC,
        " ne fait pas « répéter, puis estoc » : il fait trois estocs.",
    )),
    chain([plug(REPETER_3, plug(ESTOC))], "Une carte, trois étapes. Le trait montre que la carte de gauche agit sur celle de droite."),
    paragraph(concat(
        "Un autre modificateur ne fait qu'une seule étape, mais elle contient deux estocs : ", DOUBLE_DIAGONALE, " sur ",
        ESTOC, " frappe vers les deux diagonales avant d'un seul coup.",
    )),
    chain([plug(DOUBLE_DIAGONALE, plug(ESTOC))], "Une seule étape, deux estocs."),
    subheading("La limite de 4"),
    paragraph(concat(
        "Une chaîne tient 4 cartes au plus. Chaque carte posée compte pour 1, qu'elle soit seule ou branchée sur une autre : ",
        REPETER_2, " sur ", ESTOC, ", ce sont 2 cartes. Mais une ", COMPOSITE.as("carte combinée"), " (un ", FUSION,
        ", voir plus bas) ne compte que pour une seule carte, quel que soit le nombre de cartes qu'elle contient. ",
        "C'est l'arbitrage central du jeu : peu d'étapes fortes, ou plus d'étapes simples ?",
    )),
    chain([plug(REPETER_2, plug(ESTOC)), plug(AVANCER)], "3 cartes sur 4."),
    chain([plug(ESTOC_INSTABLE)], "1 carte sur 4 : celle-ci en contient plusieurs, et ne compte que pour une."),
    subheading("Une carte mal placée est grisée"),
    paragraph(
        "Si tu poses une carte là où elle ne peut se brancher sur rien, par exemple un élément sans lanceur ou un "
        + "modificateur sans action à sa droite, elle est grisée : elle ne sera pas jouée.",
    ),
    chain([plug(PETIT_SORT, plug(FEU)), plug(FEU, null, false)], "À gauche, le Feu est branché sur Petit sort. Seul, il est grisé."),
    subheading("Les cartes de préparation"),
    paragraph(concat(
        "Une carte de préparation ne fait rien quand vient son tour : elle agit avant, à la fin de la préparation, en ",
        "changeant la chaîne, puis disparaît. Ce qui se joue ensuite, c'est la chaîne changée. Un ", FUSION,
        " est la préparation la plus simple : il se déplie en les cartes qu'il contient. D'autres ont aussi un effet ",
        "immédiat : ", PRIERE, " soigne, ", CONCENTRATION, " donne de la force.",
    )),
    transform(
        [plug(ESTOC_INSTABLE)],
        [plug(CINQUANTE, plug(REPETER_2, plug(ESTOC)))],
        "Avant l'exécution, la carte de préparation se remplace par ce qu'elle contient.",
    ),
    quote("Action = ce qui se joue. Préparation = ce qui change ce qui se joue."),

    //// 6. Everything is relative to the facing ////
    heading("Tout est relatif à l'orientation"),
    paragraph(concat(
        "Les unités peuvent faire face à n'importe quelle direction. Toutes les actions sont relatives à cette ",
        "orientation, au moment où elles se jouent. Si on te fait pivoter (charme, peur, poussée), tout le reste de ta ",
        "chaîne part dans l'autre sens. C'est ce qui rend ", CHARMER, " et ", EFFRAYER, " si forts.",
    )),
    paragraph(concat(
        "Et c'est pour ça que ", VISER, " et ", CHEMIN, " sont super importants : ils tournent ton unité vers l'ennemi le ",
        "plus proche (", CHEMIN, " en contournant les obstacles). Sans eux, ton ", ESTOC, " part dans la direction où tu ",
        "regardes, peut-être dans le vide. Presque toutes les chaînes commencent par l'un des deux.",
    )),
    component(({ theme }) => arenaSketch(theme, [
        { facing: 0, zone: sector(1.3, 2 * Math.PI / 3), caption: "Face à droite" },
        { facing: UP, zone: sector(1.3, 2 * Math.PI / 3), caption: "Tourné vers le haut" },
    ])),
    note(concat("Le même ", COUP_EPEE, " : la zone tourne avec l'unité.")),
    paragraph("Les attaques de base, d'un coup d'œil :"),
    terms([
        { head: "Coup d'épée", text: concat(COUP_EPEE, " : un arc de 120° devant, à 1,3 m. 1 cœur.") },
        { head: "Estoc", text: concat(ESTOC, " : une bande de 2 m droit devant, qui transperce. 1 cœur.") },
        { head: "Tir", text: concat(TIR, " : un rayon jusqu'à 5 m, qui s'arrête sur la première unité. ½ cœur.") },
        { head: "Coup circulaire", text: concat(COUP_CIRCULAIRE, " : tout autour, à 1,2 m. 1 cœur.") },
        { head: "Dague", text: concat(DAGUE, " : une bande de 1,1 m devant. 1 cœur, ×2 dans le dos.") },
    ]),
    component(({ theme }) => arenaSketch(theme, [
        { facing: 0, zone: band(2, 0.35), caption: "Estoc" },
        { facing: 0, zone: band(3, 0.1), caption: "Tir" },
        { facing: 0, zone: ring(1.2), caption: "Coup circulaire" },
    ])),
    paragraph(
        "Un déplacement va aussi loin qu'il peut : il s'arrête au premier mur, pilier ou corps. Les disques pâles au "
        + "sol montrent la taille réelle de chaque corps, pour juger les distances.",
    ),

    //// 7. Hearts ////
    heading("Les cœurs"),
    paragraph(
        "Ta vie est une rangée de cœurs d'une vie chacun : un dégât en retire un. Les cœurs rouges sont la vie de "
        + "base ; un cœur rouge perdu laisse une place vide que le soin peut remplir. Les autres sortes ont chacune "
        + "leur règle.",
    ),
    hearts(RED_HEART, 3, "La vie de base."),
    paragraph("Un dégât touche d'abord le dernier cœur de la rangée : les cœurs spéciaux, à droite, protègent les rouges."),
    quote("L'unité tombe quand plus aucun cœur ne l'empêche de mourir."),

    //// 8. Stats, statuses, processes ////
    heading("Statistiques, statuts, processus"),
    paragraph("Les stats modifient ce que font les cartes ; la description d'une carte dit laquelle elle lit."),
    terms([
        stat("Force", "Ajoutée aux coups au corps à corps.", "Pierre à aiguiser"),
        stat("Précision", "Ajoutée aux tirs.", "Viseur"),
        stat("Agilité", "Règle la longueur des déplacements.", "Bottes de sept lieues"),
        stat("Portée", "Règle ce qui est lancé ou tiré.", "Fronde ou Longue-vue"),
        { head: "Allonge", text: "Règle la longueur des coups au corps à corps." },
        stat("Soin", "Ajoutée à chaque soin.", "Trousse de soin"),
        stat("Invocation", "Ajoutée à la vie de chaque invocation.", "Poupée de chiffon"),
        stat("Alchimie", "Ajoutée au niveau de chaque potion.", "Alambic"),
    ]),
    paragraph(
        "Un statut est un état qui s'installe sur une unité et s'y maintient : certains s'effacent tout de suite, "
        + "d'autres durent plusieurs rounds, d'autres jusqu'à la fin du combat ou tant que vit une invocation. Si le "
        + "même statut revient, il se cumule. Quelques-uns, pour commencer ; les autres, tu les découvriras en jouant.",
    ),
    terms([statusTerm(BURN, 2), statusTerm(SLOWED, 2), statusTerm(ROOTED, 2), statusTerm(DODGE, 1)]),
    paragraph(
        "Un processus est un état plus court : il dure jusqu'à la fin du round et c'est tout. Un bonus de force le "
        + "temps d'un round, un cheval qui porte l'unité, une hâte. Ils s'affichent comme les statuts, sur l'unité "
        + "concernée.",
    ),
    note("Les éléments (feu, eau, plante, pierre…) ne sont pas expliqués ici : une carte te dit ce qu'elle fait quand tu la survoles."),

    //// 9. Monsters ////
    heading("Les monstres"),
    paragraph(concat(
        "Un monstre ne réfléchit pas : son ", DECK, " est son comportement. Il joue ses ", CARTE.as("cartes"),
        " de gauche à droite, et son ", DECK, " repasse dans le même ordre : ses actions reviennent en boucle, round après ",
        "round. Apprends à la lire, c'est la clé pour survivre aux boss.",
    )),
    loopOf("Gobelin"),
    note("Le Gobelin s'approche, puis frappe."),
    paragraph(concat("Le seul hasard vient des ", CARTE.as("cartes"), " à 50 %.")),

    //// 10. Halts ////
    heading("Les haltes"),
    paragraph("Entre deux combats, chaque halte a son offre, tirée à ta première visite. À toi de les découvrir."),
    paragraph("Une halte quittée sans rien changer peut être rouverte d'un clic, avec les mêmes offres."),
    subheading("Les collages"),
    paragraph(concat(
        "Un ", FUSION, " est une ", CARTE, " qui en contient plusieurs. Il ne prend qu'une place dans la chaîne mais se ",
        "déplie en plusieurs cartes avant l'exécution : c'est le moyen de dépasser la limite de 4.",
    )),
    transform([plug(ESTOC_INSTABLE)], [plug(CINQUANTE, plug(REPETER_2, plug(ESTOC)))], "Un collage et ce qu'il devient."),

    //// 11. Advice ////
    heading("Conseils pour commencer"),
    paragraph("Lis la chaîne des monstres avant de poser la tienne."),
    paragraph(concat("Un ", DECK, " court et cohérent vaut mieux qu'un gros ", DECK, ".")),
    paragraph("En cas de doute, survole."),
]
