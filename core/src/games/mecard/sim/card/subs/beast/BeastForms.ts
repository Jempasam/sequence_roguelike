import { visual } from "../../../base/Visual"
import { CARTE } from "../../../base/keywords"
import type { Element } from "../../../element/Element"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import type { Card } from "../../Card"
import { BEAST, beast, ELEMENT, MODULE } from "../../CardType"
import type { Beast, BeastHearts, Module, Rewrite } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { RewriteCard } from "../composite/RewriteCards"
import { AIM } from "../movement/Aim"
import { STEP } from "../movement/Step"
import { AURA, SMALL_SPELL } from "../spell/ElementActions"
import { COMPOUND_CARDS, ELEMENT_CARDS, ElementCard } from "../spell/ElementCard"
import { BeastCard } from "./BeastCard"
import { bodyCards } from "./BeastRewrites"

/** How many blue hearts the armor of a beast adds. */
const ARMOR_HEARTS = 3

/** How many blue hearts a body made of something else than a beast has. */
const MADE_HEARTS = 2

/** How many beasts a hybrid takes at most. */
const HYBRID_BEASTS = 3

/** What a hybridization finding too few beasts gives: it goes alone, the beasts it found left as they are. */
const ALONE: Rewrite = { cards: [], consumed: 0, acting: false }

/** The card an element is told by: the one of the catalog, else one of its own, for an element mixed. */
function cardOf(element: Element): Card {
    const found = [...ELEMENT_CARDS, ...COMPOUND_CARDS].find(card => card.element === element)
    return found ?? new ElementCard(element, Rarity.COMMON)
}

/** The hearts of a beast with the armor on: its blue group has more, or one is added if it has none. */
function armored(hearts: readonly BeastHearts[]): BeastHearts[] {
    const blue = hearts.findIndex(({ kind }) => kind === BLUE_HEART)
    if(blue < 0) return [...hearts, { kind: BLUE_HEART, count: ARMOR_HEARTS }]
    return hearts.map((group, index) => {
        return index === blue ? { ...group, count: group.count + ARMOR_HEARTS } : group
    })
}

/** A beast as a machine: the cards its body plays, its run and bite in their places, are those of a module. */
export class CyberneticBeastCard extends AbstractCard<Module, Beast> {


    public readonly output = MODULE
    public readonly input = BEAST

    constructor(){
        super("Bête cybernétique", [
            "Donne un module des ", CARTE.as("cartes"), " que sa bête joue à chaque round : son corps, sa course et sa morsure à leur place.",
        ], Rarity.RARE)
    }


    public get(beast: Beast): Module {
        const cards = bodyCards(beast.body, beast)
        return { cards: () => cards, tune: () => {} }
    }
}

/** A module as a beast: a body of what the module plays, which runs but does not bite. */
export class FleshCurseCard extends AbstractCard<Beast, Module> {


    public readonly output = BEAST
    public readonly input = MODULE

    constructor(){
        super("Malédiction de chair", [
            "Donne une bête qui avance, ne mord pas, et dont le corps est fait des ", CARTE.as("cartes"), " de son module (un hasard ",
            "du module est tiré une fois pour toutes).",
        ], Rarity.RARE)
    }


    public get(module: Module): Beast {
        return beast({
            name: "Chair maudite",
            sprite: visual("units/spirit"),
            run: [STEP],
            bite: [],
            hearts: [{ kind: BLUE_HEART, count: MADE_HEARTS }],
            body: module.cards(options => options[0]),
        })
    }
}

/** A beast in armor: the same, with blue hearts more. */
export class BeastArmorCard extends AbstractCard<Beast, Beast> {


    public readonly output = BEAST
    public readonly input = BEAST

    constructor(){
        super("Armure bestiale", ["Donne une copie de sa bête avec ", ARMOR_HEARTS, " cœurs bleus de plus."], Rarity.RARE)
    }


    public get(beast: Beast): Beast {
        return { ...beast, hearts: armored(beast.hearts) }
    }
}

/** An element as a beast: it bites with it, and brings its aura on itself before. */
export class ElementalCard extends AbstractCard<Beast, Element> {


    public readonly output = BEAST
    public readonly input = ELEMENT

    constructor(){
        super("Élémentaire", [
            "Donne une bête de son élément : elle avance, mord d'un petit sort de l'élément, et s'applique son aura avant de viser.",
        ], Rarity.RARE)
    }


    public get(element: Element): Beast {
        const card = cardOf(element)
        return beast({
            name: `Élémentaire de ${element.name}`,
            sprite: visual("units/spirit"),
            run: [STEP],
            bite: [SMALL_SPELL, card],
            hearts: [{ kind: BLUE_HEART, count: MADE_HEARTS }],
            body: [AURA, card, AIM, "bite", "run"],
        })
    }
}

export const CYBERNETIC_BEAST = new CyberneticBeastCard()

export const FLESH_CURSE = new FleshCurseCard()

export const BEAST_ARMOR = new BeastArmorCard()

export const ELEMENTAL = new ElementalCard()

/**
 * Up to three beasts on its right in one: the first has its body, the second its run and its bite, or the
 * second its run and the third its bite. One beast, or none, is not a hybrid: it goes alone.
 */
export const HYBRIDIZATION = new RewriteCard("Hybridation", [
    "Fin de préparation : prend de une à trois bêtes à sa droite. Une seule : disparaît. Deux : la bête a le corps de la première, ",
    "la course et la morsure de la seconde. Trois : le corps de la première, la course de la deuxième et la morsure de la troisième.",
], Rarity.RARE, (_ctx, { rest }) => {
    const beasts: Beast[] = []
    for(const card of rest.slice(0, HYBRID_BEASTS)){
        if(!(card instanceof BeastCard)) break
        beasts.push(card.beast)
    }
    if(beasts.length < 2) return ALONE
    const [body, run] = beasts
    const bite = beasts[beasts.length - 1]
    const hybrid: Beast = beast({ ...body, name: `${body.name} hybride`, run: run.run, bite: bite.bite })
    return { cards: [new BeastCard(hybrid)], consumed: beasts.length, acting: false }
}, undefined, "prepless")
