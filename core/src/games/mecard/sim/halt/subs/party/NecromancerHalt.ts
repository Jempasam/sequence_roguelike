import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Hero } from "../../../run/Hero"
import { distinct } from "../../../run/offers"
import { heartLootText, KEPT_LOOT_HEARTS, SPENT_LOOT_HEARTS } from "../../../run/Run"
import type { HeartLoot, Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { visual } from "../../../base/Visual"

/** How many kinds of heart the necromancer offers, each time it asks. */
export const NECROMANCER_OFFER_SIZE = 2

/** Hearts as a dialog offers them. */
function lootShown(loot: HeartLoot): Shown {
    return { cards: [], text: heartLootText(loot) }
}

/** The necromancer: a character given hearts that come back, then hearts used once, each among two. */
export class NecromancerHalt extends AbstractHalt {


    constructor(run: Run){
        super(NECROMANCER_HALT, run,
            "Les cœurs des morts battent encore. Un qui revient, un qui s'use : à toi de choisir.",
            // Waiting for its own art: the scene of the altar.
            sceneLook(36, 13, 18, "mecard/travel/altar"),
            {
                hat: "skullHood",
                clothes: rgba(0.5, 0.45, 0.6),
                hatColor: rgba(0.5, 0.45, 0.6),
                mask: "skeleton"
            },
        )
        this.#kept = distinct(run.rng, KEPT_LOOT_HEARTS, NECROMANCER_OFFER_SIZE)
        this.#spent = distinct(run.rng, SPENT_LOOT_HEARTS, NECROMANCER_OFFER_SIZE)
    }


    public start(ctx: HaltContext): void {
        const ask = (): void => ctx.hero("Pour qui ?", hero => this.#askKept(ctx, hero, ask))
        ask()
    }


    /** The hearts offered that last the whole run. */
    readonly #kept: readonly HeartLoot[]

    /** The hearts offered that are used once. */
    readonly #spent: readonly HeartLoot[]

    /** Ask a character for the hearts it keeps, then for those it uses once. */
    #askKept(ctx: HaltContext, hero: Hero, back: () => void): void {
        const ask = (): void => ctx.offer(concat("Quel cœur durable pour ", hero, " ?"), this.#kept, lootShown, kept => {
            this.#askSpent(ctx, hero, kept, ask)
        }, { back })
        ask()
    }

    /** Ask a character for the hearts it uses once, then give it both: nothing is given before. */
    #askSpent(ctx: HaltContext, hero: Hero, kept: HeartLoot, back: () => void): void {
        ctx.offer(concat("Quel cœur à usage unique pour ", hero, " ?"), this.#spent, lootShown, spent => {
            this.impact()
            this.run.giveHearts(hero, kept)
            this.run.giveHearts(hero, spent)
            ctx.tell(concat(hero, " repart avec des cœurs de plus."))
        }, { back })
    }
}

/** The sort of the necromancer. */
export const NECROMANCER_HALT: HaltType = {
    id: "necromancer",
    name: "Nécromancien",
    description: "Donne à une unité un cœur durable au choix parmi deux, puis un cœur à usage unique au choix parmi deux.",    icon: visual("travel/necromancer/logo", { letter: "NE" }),
    transition: DOOR_TRANSITION,
    create: run => new NecromancerHalt(run),
}
