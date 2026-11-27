import type { Observable, Removable } from "../../../base/Observable"
import type { Action, UnitContext } from "../../Action"
import type { Battle } from "../../Battle"
import type { Unit } from "../../Unit"

/**
 * Play something as an action of the unit of the context: what happens meanwhile is inflicted by the unit.
 * The move going on is told before the action is over, so what reacts to it is part of it.
 */
export function act({ battle, unit }: UnitContext, play: () => void): void {
    battle.acting.push(unit)
    try {
        play()
        battle.glide.tell()
    } finally {
        battle.acting.pop()
    }
}

/**
 * Is what happens now inflicted by a unit: does one of its actions play? An action having another unit play
 * one is still playing: both inflict what that one does.
 */
export function isInflictedBy(battle: Battle, unit: Unit): boolean {
    return battle.acting.includes(unit)
}

/**
 * Play an action, listening to what it inflicts.
 *
 * @param listen - Plugs the listening in, giving what takes it back. It hands to `resolve` each value to keep.
 * @returns Every value resolved while the action played, in order.
 */
export function collect<T>(
    ctx: UnitContext, action: Action, listen: (resolve: (value: T) => void) => Removable,
): T[] {
    const collected: T[] = []
    const listening = listen(value => collected.push(value))
    try {
        action.use(ctx)
        ctx.battle.glide.tell()
    } finally {
        listening.remove()
    }
    return collected
}

/**
 * Play an action, listening to one observable.
 *
 * @param filter - Which of its messages are kept, all of them by default.
 * @returns The messages told while the action played, in order.
 */
export function collectFrom<T>(
    ctx: UnitContext, action: Action, observable: Observable<T>, filter: (message: T) => boolean = () => true,
): T[] {
    return collect<T>(ctx, action, resolve => observable.add(message => {
        if(filter(message)) resolve(message)
    }))
}
