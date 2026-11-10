import { joinText } from "../../../../../../semantic"
import type { Action, ActionRun, Indicator, Pose, Preview, PreviewContext, UnitContext } from "../../../battle/Action"
import type { Card } from "../../Card"
import { ACTION } from "../../CardType"
import type { CardType } from "../../CardType"
import { Rarity } from "../../Rarity"

import { THRUST } from "../attack/Thrust"
import { STEP } from "../movement/Step"
import { CompositeCard } from "./CompositeCard"
import type { CompositeLook } from "./CompositeCard"
import { MERGE } from "../../../base/keywords"

/** What a merged card is named by, between the names of its cards. */
const MERGED_JOIN = " & "

/**
 * Two cards of actions played at once, as one step: each tick plays a tick of both. Each gives actions, so
 * neither is a preparation, which would only rewrite a chain. Those that take something all take the same
 * kind of thing, as many as there are: the merge then takes it, and hands it to each of them, the others
 * taking nothing and playing on their own.
 */
export class MergedCard extends CompositeCard<readonly Action[], unknown> {


    public readonly output = ACTION
    public readonly input: CardType<unknown>|null

    /**
     * @throws {@link Error} For less than two cards, when a card does not give actions, or when some take
     *   different kinds of things.
     */
    constructor(cards: readonly Card[], look: CompositeLook = {}){
        if(cards.length < 2) throw new Error(`A merge holds two cards at least, not ${cards.length}.`)
        for(const card of cards){
            if(card.output !== ACTION){
                throw new Error(`${card.name} does not give actions: it cannot be played at once with another.`)
            }
        }
        const taking = cards.filter(card => card.input !== null)
        if(!mergeable(cards)){
            throw new Error(`A merge holds cards taking one kind of thing at most, not ${taking.map(card => `${card.name} (${card.input?.name})`).join(", ")}.`)
        }
        super(cards, MERGED_JOIN, contents => {
            const last = contents[contents.length - 1]
            return [
                MERGE.as("Mélange"), " : joue ", ...joinText(contents.slice(0, -1), ", "), " et ", last,
                " en même temps, en une seule étape.",
                ...taking.length > 0 ? [" Prend ce que prennent ", ...joinText(taking, ", "), "."] : [],
            ]
        }, look)
        this.input = taking[0]?.input ?? null
    }


    public with(cards: readonly Card[]): MergedCard {
        return new MergedCard(cards, this.look)
    }


    public get(input: unknown): readonly Action[] {
        // Each card taking something gets what the merge took, the others nothing.
        const rows = this.contents.map(card => {
            return card.get(card.input === null ? undefined : input) as readonly Action[]
        })
        return [{
            use: ctx => atOnce(rows.map(row => played(row, ctx))),
            preview: ctx => previewedAtOnce(rows, ctx),
        }]
    }
}

/**
 * The one rule of every merge: can cards be played at once, as a merge? Each gives actions, and those that
 * take something all take the same kind of thing, as many as there are. Fewer than two cards may be checked,
 * for a row that grows.
 */
export function mergeable(cards: readonly Card[]): boolean {
    if(!cards.every(card => card.output === ACTION)) return false
    const taken = new Set(cards.map(card => card.input).filter(input => input !== null))
    return taken.size <= 1
}

/** What the cards of a merge take, all the same kind: nothing when none takes anything. */
export function mergedInput(cards: readonly Card[]): CardType<unknown>|null {
    return cards.find(card => card.input !== null)?.input ?? null
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
