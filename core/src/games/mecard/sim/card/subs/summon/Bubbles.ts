import { joinText } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import { INVOCATION } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Visual, VisualColor } from "../../../base/Visual"
import type { Action } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"
import type { Dose } from "../../../potion/Potion"
import { EXPLOSIVE } from "../../../status/subs/Explosive"
import { MOMENTUM } from "../../../status/subs/Momentum"
import {
    BUBBLE, BUBBLE_ORANGE_START, BUBBLE_START, BULLE, GIANT, SOAPY,
} from "../../../status/subs/BubbleStatuses"
import { elementCoatingOf } from "../../../status/subs/ElementCoating"
import { potionCoatingOf } from "../../../status/subs/PotionCoating"
import type { Element } from "../../../element/Element"
import type { Card } from "../../Card"
import { ACTION, BEAST, ELEMENT, POTION } from "../../CardType"
import type { Beast, CardType } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { bodyCards } from "../beast/BeastRewrites"
import { AIM } from "../movement/Aim"
import { STEP } from "../movement/Step"
import { WAIT } from "../movement/Wait"
import { ChainSummonCard } from "./ChainSummons"
import type { ChainSummon } from "./ChainSummons"

export { BULLE }

/** How far around a bubble the preview shows what it works on, in meters. */
const BUBBLE_RADIUS = 3

/** The level of the energy of a bubble that works at its death: the blast of an explosive one. */
const EXPLOSIVE_LEVEL = 2

/** What sets a bubble apart from the others. */
export interface BubbleSpec {
    readonly name: string
    readonly sprite: Visual

    /** How many time hearts it lives by, before the summoning of its blower. */
    readonly lives: number

    /** The cards it plays, round after round. */
    readonly cards: readonly Card[]

    /** How much bigger than the base its body is. 1 by default. */
    readonly size?: number

    /** How far ahead of its blower it is set down, in meters. */
    readonly ahead?: number

    /** The level of bubble it is born at. */
    readonly start?: number

    /** What it holds beyond being a bubble, from the lives it has. */
    readonly traits?: (battle: Battle, body: Unit, lives: number) => void
}

/** The colors of the bubbles, tinting the one picture they share. */
const BUBBLE_COLORS = {
    violet: [0.7, 0.45, 1], blue: [0.4, 0.6, 1], green: [0.45, 0.9, 0.5], red: [1, 0.4, 0.4],
    explosive: [1, 0.6, 0.15], orange: [1, 0.7, 0.3], giant: [0.9, 0.85, 0.5], element: [0.6, 0.9, 1],
    potion: [0.5, 1, 0.8], programmed: [0.9, 0.9, 0.9],
} as const

/** The look of a bubble: the picture of the bubbles, in the color of its kind. */
export function bubbleLook(color: keyof typeof BUBBLE_COLORS): Visual {
    const rgb: VisualColor = [...BUBBLE_COLORS[color]]
    return visual("units/bubble", { coloration: rgb, color: rgb })
}

/** Raise the soapiness of a unit to at least a number of rounds. */
export function raiseSoapy(battle: Battle, unit: Unit, rounds: number): void {
    const gap = rounds - (unit.statusOf(SOAPY)?.level ?? 0)
    if(gap > 0) battle.applyStatus(unit, SOAPY, gap)
}

/** What a bubble puts on the arena, from what it is made of. */
export function bubbleSummon(spec: BubbleSpec): ChainSummon {
    return {
        sprite: spec.sprite, name: spec.name, cards: spec.cards, size: spec.size, ahead: spec.ahead, radius: BUBBLE_RADIUS,
        hearts: owner => Heart.many(TIME_HEART, spec.lives + owner.stats.summon.value),
        targets: (battle, owner, at) => {
            const enemy = battle.nearestEnemy(owner, BUBBLE_RADIUS, at)
            return enemy ? [enemy] : []
        },
        placed: body => {
            const { battle, owner } = body
            const lives = body.hearts.all.length
            spec.traits?.(battle, body, lives)
            battle.applyStatus(body, BUBBLE, spec.start ?? BUBBLE_START)
            if(owner) raiseSoapy(battle, owner, lives)
        },
    }
}

/** The words every bubble of a card starts its description with. */
function opening(lives: number): Text[] {
    return [INVOCATION.as("Invoque"), " devant toi une ", BULLE.as("bulle"), " de ", new HeartCount(lives), " de ", TIME_HEART]
}

/** A card setting down a bubble. */
function bubbleCard(
    spec: BubbleSpec, rarity: Rarity, particular: Text[] = [],
): ChainSummonCard {
    return new ChainSummonCard(spec.name, [
        ...opening(spec.lives), " : ", ...joinText(spec.cards, ", "), ".", ...particular,
    ], rarity, bubbleSummon(spec))
}

/** The same card repeated. */
function times(card: Card, count: number): Card[] {
    return new Array<Card>(count).fill(card)
}

export const VIOLET_BUBBLE = bubbleCard({
    name: "Bulle violette", sprite: bubbleLook("violet"), lives: 2, cards: times(WAIT, 4),
}, Rarity.COMMON, [" Copie tes actions."])

export const BLUE_BUBBLE = bubbleCard({
    name: "Bulle bleue", sprite: bubbleLook("blue"), lives: 2, cards: times(STEP, 4),
}, Rarity.COMMON)

export const GREEN_BUBBLE = bubbleCard({
    name: "Bulle verte", sprite: bubbleLook("green"), lives: 2, cards: times(AIM, 4),
}, Rarity.COMMON)

export const RED_BUBBLE = bubbleCard({
    name: "Bulle rouge", sprite: bubbleLook("red"), lives: 2, cards: times(STEP, 2),
    traits: (battle, body, lives) => battle.applyStatus(body, MOMENTUM, lives),
}, Rarity.COMMON, [" Elle blesse ce qu'elle heurte."])

export const EXPLOSIVE_BUBBLE = bubbleCard({
    name: "Bulle explosive", sprite: bubbleLook("explosive"), lives: 1, cards: [WAIT],
    traits: (battle, body) => battle.applyStatus(body, EXPLOSIVE, EXPLOSIVE_LEVEL),
}, Rarity.RARE, [" Elle explose quand elle disparaît."])

export const GIANT_BUBBLE = bubbleCard({
    name: "Bulle géante", sprite: bubbleLook("giant"), lives: 2, cards: times(STEP, 2), size: 2, ahead: 1.5 - UNIT_RADIUS, start: BUBBLE_ORANGE_START,
    traits: (battle, body, lives) => {
        battle.applyStatus(body, MOMENTUM, lives)
        battle.applyStatus(body, GIANT, lives)
    },
}, Rarity.EPIC, [" Géante : plus forte, lente, bélier."])

/** A card that takes an input to set down a bubble. */
class InputBubbleCard<U> extends AbstractCard<Action, U> {


    public readonly output = ACTION

    constructor(
        name: string, description: Text, rarity: Rarity,
        public readonly input: CardType<U>,
        private readonly spec: (input: U, tree: readonly Card[]) => BubbleSpec,
    ){
        super(name, description, rarity)
    }


    public get(input: U, tree: readonly Card[] = []): Action {
        return new ChainSummonCard(this.name, [], this.rarity, bubbleSummon(this.spec(input, tree))).action
    }
}

/** A bubble that waits, then plays the action it takes. */
export const ORANGE_BUBBLE = new InputBubbleCard<Action>("Bulle orange", [
    ...opening(2), " : Attendre, puis l'action de la carte qui la suit. Elle naît chargée : son niveau de ", BULLE.as("bulle"), " est ",
    BUBBLE_ORANGE_START, ".",
], Rarity.RARE, ACTION, (_action, tree) => ({
    name: "Bulle orange", sprite: bubbleLook("orange"), lives: 2, start: BUBBLE_ORANGE_START,
    cards: [WAIT, ...tree],
}))

/** A bubble that goes to its enemy and puts the negative of an element on what it touches. */
export const ELEMENTAL_BUBBLE = new InputBubbleCard<Element>("Bulle élémentaire", [
    ...opening(2), " : Viser, Avancer, Avancer. Au contact, applique le négatif de l'élément de la carte qui la suit.",
], Rarity.RARE, ELEMENT, (element: Element) => ({
    name: "Bulle élémentaire", sprite: bubbleLook("element"), lives: 2, cards: [AIM, STEP, STEP],
    traits: (battle, body, lives) => battle.applyStatus(body, elementCoatingOf(element), lives),
}))

/** A bubble that goes to its enemy and pours a potion on what it touches. */
export const POTION_BUBBLE = new InputBubbleCard<Dose>("Bulle de potion", [
    ...opening(2), " : Viser, Avancer, Avancer. Au contact, verse la potion de la carte qui la suit.",
], Rarity.RARE, POTION, (dose: Dose) => ({
    name: "Bulle de potion", sprite: bubbleLook("potion"), lives: 2, cards: [AIM, STEP, STEP],
    traits: (battle, body, lives) => battle.applyStatus(body, potionCoatingOf(dose), lives),
}))

/** A bubble with the body, the run and the bite of a beast, living one round. */
export const BEAST_BUBBLE = new InputBubbleCard<Beast>("Bulle bestiale", [
    ...opening(1), " : le corps, la course et la morsure de la bête de la carte qui la suit.",
], Rarity.EPIC, BEAST, (beast: Beast) => ({
    name: `Bulle ${beast.name}`, sprite: beast.sprite, lives: 1,
    cards: bodyCards(beast.body, { run: beast.run, bite: beast.bite }),
}))
