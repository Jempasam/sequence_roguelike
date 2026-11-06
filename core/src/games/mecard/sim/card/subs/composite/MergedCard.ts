import type { Action, ActionRun, Indicator, Pose, Preview, PreviewContext, UnitContext } from "../../../battle/Action"
import type { Card } from "../../Card"
import { ACTION } from "../../CardType"
import { Rarity } from "../../Rarity"

import { THRUST } from "../attack/Thrust"
import { STEP } from "../movement/Step"
import { CompositeCard } from "./CompositeCard"
import type { CompositeLook } from "./CompositeCard"
import { MERGE } from "../../../base/keywords"

/** What a merged card is named by, between the names of its cards. */
const MERGED_JOIN = " & "

/**
 * Two cards of actions played at once, as one step: each tick plays a tick of both. Each gives its actions
 * on its own, so neither is a preparation, which would only rewrite a chain.
 */
export class MergedCard extends CompositeCard<readonly Action[]> {


    public readonly output = ACTION
    public readonly input = null

    /** @throws {@link Error} When a card does not give actions, or takes something. */
    constructor(first: Card, second: Card, look: CompositeLook = {}){
        for(const card of [first, second]){
            if(card.output !== ACTION || card.input !== null){
                throw new Error(`${card.name} does not give actions on its own: it cannot be played at once with another.`)
            }
        }
        super([first, second], MERGED_JOIN, ([one, other]) => {
            return [MERGE.as("Mélange"), " : joue ", one, " et ", other, " en même temps, en une seule étape."]
        }, look)
    }


    public get(): readonly Action[] {
        const [first, second] = this.contents.map(card => card.get(undefined) as readonly Action[])
        return [{
            use: ctx => atOnce([played(first, ctx), played(second, ctx)]),
            preview: ctx => previewedAtOnce(first, second, ctx),
        }]
    }
}

/** Actions played one after the other, as one run. */
function* played(actions: readonly Action[], ctx: UnitContext): ActionRun {
    for(const action of actions) yield* action.use(ctx)
}

/** Runs played at once: a tick of each at each tick, in order, until all are over. */
function* atOnce(runs: readonly ActionRun[]): ActionRun {
    let going = [...runs]
    for(;;){
        going = going.filter(run => !run.next().done)
        if(going.length === 0) return
        yield
    }
}

/**
 * What two rows of actions played at once would do: both shown from where the unit stands. Where it would
 * end is a guess, the first row then the second, since what they do to each other is only known when played.
 */
function previewedAtOnce(first: readonly Action[], second: readonly Action[], ctx: PreviewContext): Preview {
    const one = previewed(first, ctx, ctx.pose)
    const other = previewed(second, ctx, ctx.pose)
    const pose = previewed(second, ctx, one.pose).pose
    return { indicators: [...one.indicators, ...other.indicators], pose }
}

/** What actions would do one after the other, each from where the one before leaves the unit. */
function previewed(actions: readonly Action[], ctx: PreviewContext, start: Pose): Preview {
    const indicators: Indicator[] = []
    let pose = start
    for(const action of actions){
        const preview = action.preview({ ...ctx, pose })
        indicators.push(...preview.indicators)
        pose = preview.pose
    }
    return { indicators, pose }
}

/** A step forward, thrusting as it goes. */
export const CHARGE = new MergedCard(STEP, THRUST, { name: "Charge", rarity: Rarity.RARE })
