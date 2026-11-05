import type { Card } from "../../Card"
import { signatureOf } from "../../CardChain"
import { PREPARATION } from "../../CardType"
import type { Preparation } from "../../CardType"
import { RANDOM_FAMILY } from "../../Family"
import type { Family } from "../../Family"
import { Rarity } from "../../Rarity"

import { SWEEP } from "../attack/Sweep"
import { THRUST } from "../attack/Thrust"
import { FIRE, WATER } from "../spell/ElementCard"
import { CompositeCard } from "./CompositeCard"
import type { CompositeLook } from "./CompositeCard"

/** What a random card is named by, between the names of its cards. */
const RANDOM_JOIN = " | "

/**
 * One of two cards, drawn at the end of the preparation: a preparation, replaced in the chain by one of
 * them, which then reads as any other. They take and give the same, so it reads the same either way.
 */
export class RandomCard extends CompositeCard<Preparation> {


    public readonly output = PREPARATION
    public readonly input = null

    public override get family(): Family {
        return RANDOM_FAMILY
    }

    /** @throws {@link Error} When the two cards do not take and give the same. */
    constructor(first: Card, second: Card, look: CompositeLook = {}){
        const one = signatureOf(first)
        const other = signatureOf(second)
        if(one.output !== other.output || one.input !== other.input){
            throw new Error(`${first.name} and ${second.name} do not take and give the same: no draw between them.`)
        }
        super([first, second], RANDOM_JOIN, ([one, other]) => {
            return ["Fin de préparation : devient ", one, " ou ", other, ", au hasard."]
        }, look)
        this.#preparation = {
            rewrite: ctx => ({ cards: [ctx.pick(this.contents)], consumed: 0, acting: false }),
        }
    }


    public get(): Preparation {
        return this.#preparation
    }


    readonly #preparation: Preparation
}

/** Fire or water, for a spell. */
export const UNSTABLE_ELEMENT = new RandomCard(FIRE, WATER, { name: "Élément instable", rarity: Rarity.COMMON })

/** A thrust or a sweep. */
export const UNSURE_BLOW = new RandomCard(THRUST, SWEEP, { name: "Coup incertain", rarity: Rarity.COMMON })
