import { NOTE_COLOR } from "../../../battle/previewColors"
import { frenchNumber } from "../../../battle/words"
import type { Action } from "../../../battle/Action"
import { ACTION } from "../../CardType"

import { AbstractCard } from "../AbstractCard"
import { hold, WORD_TIME } from "../tools/playing"
import { label } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** The chance the gamble of the catalog loses each action. */
const GAMBLE_MISS = 0.5

/**
 * A card by which each action may be lost, a coin toss when it plays: chance for the mobs, a drawback bound
 * to a strong card as loot. It is named by its odds.
 */
export class GambleCard extends AbstractCard<readonly Action[], readonly Action[]> {


    public readonly output = ACTION
    public readonly input = ACTION

    constructor(
        /** The chance each action is lost, from 0 to 1. */
        public readonly miss: number,
    ){
        super(
            `${frenchNumber(miss * 100)} %`,
            ["Chaque action a ", frenchNumber(miss * 100), " % de chances d'être perdue."], Rarity.COMMON,
        )
    }


    public get(actions: readonly Action[]): readonly Action[] {
        return actions.map(action => GambleCard.#gambled(this, action))
    }


    /** An action that may be lost to a gamble: shown as it would go, marked with the odds. */
    static #gambled(card: GambleCard, inner: Action): Action {
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                if(!battle.rng.chance(card.miss)){
                    yield* inner.use(ctx)
                    return
                }
                battle.events.push({ type: "skipped", unit, reason: ["raté (", card, ")"] })
                yield* hold(battle, WORD_TIME, [label(unit.position, "raté", NOTE_COLOR)])
            },
            preview: ctx => {
                const preview = inner.preview(ctx)
                const odds = label(ctx.pose.position, card.name, NOTE_COLOR)
                return { ...preview, indicators: [odds, ...preview.indicators] }
            },
        }
    }
}

export const GAMBLE = new GambleCard(GAMBLE_MISS)
