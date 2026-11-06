import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Usable } from "../../sim/usable/Usable"

/** Things of one kind, shown as one: the first of them, and all of them in their order. */
export interface Stack<T> {
    readonly first: T
    readonly members: readonly T[]
}

/**
 * Group the things that are the same, each group at the place of its first, so a bag shows one picture for
 * the same item carried several times.
 *
 * @param keyOf - The instance of the catalog a thing is: two things are the same when it is the same one.
 */
export function stacked<T>(things: readonly T[], keyOf: (thing: T) => object): Stack<T>[] {
    const stacks = new Map<object, T[]>()
    for(const thing of things){
        const key = keyOf(thing)
        const members = stacks.get(key)
        if(members) members.push(thing)
        else stacks.set(key, [thing])
    }
    return [...stacks.values()].map(members => ({ first: members[0], members }))
}

/** What is told on hover of a stack, with how many of them there are when several. */
export function countTold(told: Text, count: number): Text {
    return count > 1 ? concat(told, ` (quantité : ${count})`) : told
}

/** The count to write over the picture of items of one kind: none for one alone. */
export function countText(count: number): string|null {
    return count > 1 ? String(count) : null
}

/**
 * The uses to write over the picture of a stack of usables: the charges left of all of them added, over the
 * charges they have all together when they refill at each battle, as one usable tells its own.
 *
 * @param left - The charges left, added.
 * @param full - The charges they have, added.
 */
export function stackUsesText(usable: Usable, left: number, full: number): string|null {
    if(usable.refill === "battle") return `${left}/${full}`
    return full > 1 ? `${left}` : null
}
