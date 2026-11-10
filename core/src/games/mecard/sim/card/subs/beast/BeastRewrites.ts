import type { Unit } from "../../../battle/Unit"
import { FUSION, INVOCATION } from "../../../base/keywords"
import { Heart } from "../../../heart/Heart"
import type { Card, RewriteSpot } from "../../Card"
import { BEAST } from "../../CardType"
import type { Beast, BodyPart, Rewrite } from "../../CardType"
import { Rarity } from "../../Rarity"

import { collageOf } from "../composite/ChainRewrites"
import { InputRewriteCard, RewriteCard } from "../composite/RewriteCards"
import { ChainSummonCard } from "../summon/ChainSummons"
import { BeastCard, cardsText } from "./BeastCard"

/** How far around a summoned beast works, in meters: the zone shown in the preview. */
const BEAST_RADIUS = 3

/** What a rewrite finding no beast where it looks gives: nothing, the cards on its right left as they are. */
const NOTHING: Rewrite = { cards: [], consumed: 0, acting: false }

/** The beast of a card, none for a card giving none. */
function beastOf(card: Card|null|undefined): Beast|null {
    return card instanceof BeastCard ? card.beast : null
}

/** The beasts of the cards on the right of a spot, as many as asked: none unless all give one. */
function nextBeasts({ rest }: RewriteSpot, count: number): Beast[]|null {
    const beasts = rest.slice(0, count).map(beastOf)
    return beasts.length === count && beasts.every(beast => beast !== null) ? beasts as Beast[] : null
}

/** What a body summoned from beasts plays, its run and its bite, by the body: told by the collar. */
export interface BeastBody {
    readonly run: readonly Card[]
    readonly bite: readonly Card[]
}

/** The bodies summoned from beasts, with what they play, while they live. */
const BODIES = new WeakMap<Unit, BeastBody>()

/** What a body summoned from beasts plays, none for any other unit. */
export function beastBodyOf(unit: Unit): BeastBody|null {
    return BODIES.get(unit) ?? null
}

/** The chain of a body: its parts, the places of the run and of the bite given the cards of each. */
export function bodyCards(body: readonly BodyPart[], { run, bite }: BeastBody): Card[] {
    return body.flatMap(part => part === "run" ? run : part === "bite" ? bite : [part])
}

/** The hearts of a body summoned by an owner: its groups, the first one more by the summoning of the owner. */
function bodyHearts(beast: Beast, owner: Unit): Heart[] {
    return beast.hearts.flatMap(({ kind, count }, index) => {
        return Heart.many(kind, index === 0 ? count + owner.stats.summon.value : count)
    })
}

/** A card summoning the body of a beast, playing the run of another and the bite of a third: often itself. */
export function summonCardOf(body: Beast, runner: Beast, biter: Beast): Card {
    const played = { run: runner.run, bite: biter.bite }
    const cards = bodyCards(body.body, played)
    const same = body === runner && body === biter
    const name = same ? `${body.name} invoqué` : `${body.name} hybride`
    return new ChainSummonCard(name, [
        INVOCATION.as("Invoque"), " devant toi un ", body.name, " qui joue chaque round : ", ...cardsText(cards), ".",
    ], same ? Rarity.RARE : Rarity.LEGENDARY, {
        sprite: body.sprite,
        name: body.name,
        hearts: owner => bodyHearts(body, owner),
        cards,
        radius: BEAST_RADIUS,
        targets: (battle, owner, at) => {
            const enemy = battle.nearestEnemy(owner, BEAST_RADIUS, at)
            return enemy ? [enemy] : []
        },
        placed: unit => BODIES.set(unit, played),
    })
}

/** A card replaced by what it makes of the beast it takes. */
function using(
    name: string, text: string, rarity: Rarity, make: (beast: Beast) => readonly Card[],
): InputRewriteCard<Beast> {
    return new InputRewriteCard(name, ["Fin de préparation : ", text], rarity, BEAST, (_ctx, _spot, beast) => {
        return { cards: make(beast), consumed: 0, acting: false }
    })
}

export const BITE = using("Morsure", "devient la morsure de sa bête.", Rarity.COMMON, beast => beast.bite)

export const RUN = using("Course", "devient la course de sa bête.", Rarity.COMMON, beast => beast.run)

export const FURY = using("Fureur", "devient la course de sa bête, puis sa morsure.", Rarity.RARE, beast => [...beast.run, ...beast.bite])

export const SUMMONING = using("Invocation", "devient l'invocation du corps de sa bête, qui joue sa course et sa morsure.", Rarity.RARE, beast => {
    return [summonCardOf(beast, beast, beast)]
})

/** The run and the bite of the beast it takes played now, and kept as a fleeting collage in the hand. */
export const TOTAL_TRANSFORMATION = new InputRewriteCard("Transformation totale", [
    "Fin de préparation : devient la course de sa bête, puis sa morsure, et en met un ",
    FUSION.as("collage"), " temporaire dans ta main.",
], Rarity.EPIC, BEAST, (_ctx, _spot, beast) => {
    return { cards: [...beast.run, ...beast.bite], consumed: 0, acting: true }
}, ({ battle, unit }, beast) => {
    // A beast with a run and no bite, or the other way round, gives one card: no collage of one.
    const cards = [...beast.run, ...beast.bite]
    if(cards.length > 0) battle.giveFleetingCard(unit, collageOf(cards))
})

/** The body of the first of three beasts on its right, the run of the second, the bite of the third. */
export const TOTAL_HYBRID = new RewriteCard("Hybride totale", [
    "Fin de préparation : prend les trois bêtes à sa droite. Devient l'invocation du corps de la première, qui joue ",
    "la course de la deuxième et la morsure de la troisième.",
], Rarity.LEGENDARY, (_ctx, spot) => {
    const beasts = nextBeasts(spot, 3)
    if(!beasts) return NOTHING
    return { cards: [summonCardOf(beasts[0], beasts[1], beasts[2])], consumed: 3, acting: false }
}, undefined, "prepless")

/** Every card using a beast. */
export const BEAST_USES: readonly Card[] = [BITE, RUN, FURY, SUMMONING, TOTAL_TRANSFORMATION, TOTAL_HYBRID]
