import { Add, ModifierKey, Multiply } from "../../../base/Attribute"
import type { Attribute, Modifier } from "../../../base/Attribute"
import { ALLONGE } from "../../../base/keywords"
import type { Action, UnitContext } from "../../../battle/Action"
import type { Unit, UnitStats } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { ModifierCard } from "../ModifierCard"
import { turn } from "../tools/playing"
import { arrow, chained, label, still } from "../tools/previews"

/** How much range and precision the telescope adds, as a factor and in hearts, while its action plays. */
const SCOPE_RANGE = 0.5
const SCOPE_PRECISION = 1

/** A raise of stats of a unit, for a while: each modifier with the stat it goes on, in the order they go. */
type Boost = (stats: UnitStats) => (readonly [Attribute<number>, Modifier<number>])[]

/**
 * Raise the stats of a unit: each modifier under a key of its own, as a key holds one modifier per stat.
 *
 * @returns What takes them back.
 */
function raise(unit: Unit, name: string, boost: Boost): () => void {
    const raised = boost(unit.stats).map(([stat, modifier]) => {
        const key = new ModifierKey(name)
        stat.add(key, modifier)
        return () => stat.remove(key)
    })
    return () => { for(const back of raised) back() }
}

/** An action played, and previewed, with stats of its unit raised, put back whatever happens. */
function boosted(action: Action, name: string, boost: Boost): Action {
    return {
        use: function* (ctx){
            const back = raise(ctx.unit, name, boost)
            try {
                yield* action.use(ctx)
            } finally {
                back()
            }
        },
        preview: ctx => {
            const back = raise(ctx.unit, name, boost)
            try {
                return action.preview(ctx)
            } finally {
                back()
            }
        },
    }
}

/** What the telescope raises: the range and the precision. */
const SCOPE: Boost = stats => [
    [stats.precision, new Add(SCOPE_PRECISION)],
    [stats.throwRange, new Add(SCOPE_RANGE)],
]

export const SPYGLASS_CARD = new ModifierCard("Lunette", [
    "L'action est jouée avec +", String(SCOPE_RANGE), " de portée et +", String(SCOPE_PRECISION), " de précision.",
], Rarity.RARE, actions => actions.map(action => boosted(action, "lunette", SCOPE)))

/** What the elephant adds to the reaches, before it multiplies them. */
const ELEPHANT_ADD = 1

/** What the elephant multiplies the reaches by, once added to. */
const ELEPHANT_FACTOR = 2

/** What the elephant raises: the melee reach, one added then doubled. */
const ELEPHANT: Boost = stats => [
    [stats.meleeRange, new Add(ELEPHANT_ADD)],
    [stats.meleeRange, new Multiply(ELEPHANT_FACTOR)],
]

export const ELEPHANT_CARD = new ModifierCard("Éléphant", [
    "L'action est jouée avec (", ALLONGE, " + ", ELEPHANT_ADD, ") × ", ELEPHANT_FACTOR, ".",
], Rarity.RARE, actions => actions.map(action => boosted(action, "éléphant", ELEPHANT)))


/** A half turn, as a step of its own. */
export const HALF_TURN: Action = {
    use: function* (ctx: UnitContext){
        yield* turn(ctx, ctx.unit.direction.opposite)
    },
    preview: ({ pose }) => {
        const away = pose.direction.opposite
        const tip = pose.position.plus(away.times(TURN_LENGTH))
        return still({ ...pose, direction: away }, arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
    },
}

/** A half turn alone. */
export const TURN_AROUND = new ActionCard("Retournement", "Fait demi-tour.", Rarity.COMMON, HALF_TURN)

export const MIRROR = new ModifierCard("Miroir", [
    "Joue l'action, fait demi-tour, puis la rejoue.",
], Rarity.EPIC, actions => [...actions, HALF_TURN, ...actions])


/** How many times a delayed charge plays its action: once, and once more for each pair of actions played before it. */
function times(unit: Unit): number {
    return 1 + Math.floor(Math.max(0, unit.stepsPlayed.length - 1) / 2)
}

/** An action played several times in a row, as many as the actions its unit played before it call for. */
function delayed(action: Action): Action {
    return {
        use: function* (ctx){
            const count = times(ctx.unit)
            for(let i = 0; i < count; i++) yield* action.use(ctx)
        },
        preview: ctx => {
            const shown = action.preview(ctx)
            return chained([shown, still(shown.pose, label(ctx.pose.position, `× ${times(ctx.unit)}`, NOTE_COLOR))], ctx.pose)
        },
    }
}

export const DELAYED_CHARGE = new ModifierCard("Charge différée", [
    "Joue l'action une fois, et une fois de plus pour chaque paire d'actions jouées avant elle ce round.",
], Rarity.EPIC, actions => actions.map(delayed))
