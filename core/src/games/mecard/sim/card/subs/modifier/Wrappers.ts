import { Add, ModifierKey } from "../../../base/Attribute"
import type { Action, UnitContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import { Rarity } from "../../Rarity"

import { ModifierCard } from "../ModifierCard"
import { turn } from "../tools/playing"
import { arrow, chained, label, still } from "../tools/previews"

/** How much range and precision the telescope adds, as a factor and in hearts, while its action plays. */
const SCOPE_RANGE = 0.5
const SCOPE_PRECISION = 1

/** Run something with the stats of a unit raised, then put them back, whatever happens. */
function withScope<T>(unit: Unit, run: () => T): T {
    const key = new ModifierKey("lunette")
    unit.stats.precision.add(key, new Add(SCOPE_PRECISION))
    unit.stats.throwRange.add(key, new Add(SCOPE_RANGE))
    try {
        return run()
    } finally {
        unit.stats.precision.remove(key)
        unit.stats.throwRange.remove(key)
    }
}

/** An action played, and previewed, with the range and the precision raised. */
function scoped(action: Action): Action {
    return {
        use: function* (ctx){
            const key = new ModifierKey("lunette")
            const { unit } = ctx
            unit.stats.precision.add(key, new Add(SCOPE_PRECISION))
            unit.stats.throwRange.add(key, new Add(SCOPE_RANGE))
            try {
                yield* action.use(ctx)
            } finally {
                unit.stats.precision.remove(key)
                unit.stats.throwRange.remove(key)
            }
        },
        preview: ctx => withScope(ctx.unit, () => action.preview(ctx)),
    }
}

export const SPYGLASS_CARD = new ModifierCard("Lunette", [
    "L'action est jouée avec +", String(SCOPE_RANGE), " de portée et +", String(SCOPE_PRECISION), " de précision.",
], Rarity.RARE, actions => actions.map(scoped))


/** A half turn, as a step of its own. */
const HALF_TURN: Action = {
    use: function* (ctx: UnitContext){
        yield* turn(ctx, ctx.unit.direction.opposite)
    },
    preview: ({ pose }) => {
        const away = pose.direction.opposite
        const tip = pose.position.plus(away.times(TURN_LENGTH))
        return still({ ...pose, direction: away }, arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
    },
}

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
