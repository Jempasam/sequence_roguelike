import { joinText } from "../../../../../../semantic"
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

    /** @throws {@link Error} For less than two cards, or when a card does not give actions, or takes something. */
    constructor(cards: readonly Card[], look: CompositeLook = {}){
        if(cards.length < 2) throw new Error(`A merge holds two cards at least, not ${cards.length}.`)
        for(const card of cards){
            if(!canMerge(card)){
                throw new Error(`${card.name} does not give actions on its own: it cannot be played at once with another.`)
            }
        }
        super(cards, MERGED_JOIN, contents => {
            const last = contents[contents.length - 1]
            return [
                MERGE.as("Mélange"), " : joue ", ...joinText(contents.slice(0, -1), ", "), " et ", last,
                " en même temps, en une seule étape.",
            ]
        }, look)
    }


    public get(): readonly Action[] {
        const rows = this.contents.map(card => card.get(undefined) as readonly Action[])
        return [{
            use: ctx => atOnce(rows.map(row => played(row, ctx))),
            preview: ctx => previewedAtOnce(rows, ctx),
        }]
    }
}

/** Can a card be merged with others: does it give actions on its own, taking nothing? */
export function canMerge(card: Card): boolean {
    return card.output === ACTION && card.input === null
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
 * What rows of actions played at once would do: all shown from where the unit stands. Where it would end is
 * a guess, the first row then the next, since what they do to each other is only known when played.
 */
function previewedAtOnce(rows: readonly (readonly Action[])[], ctx: PreviewContext): Preview {
    const indicators = rows.flatMap(row => previewed(row, ctx, ctx.pose).indicators)
    const pose = rows.reduce((at, row) => previewed(row, ctx, at).pose, ctx.pose)
    return { indicators, pose }
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
export const CHARGE = new MergedCard([STEP, THRUST], { name: "Charge", rarity: Rarity.RARE })
