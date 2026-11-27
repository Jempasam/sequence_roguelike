import type { Point } from "../../../../../../engine/math"
import type { Random } from "../../../../../../engine/particles"
import { Unit } from "../../../../sim/battle/Unit"
import type { AmbientContext, AmbientUnit } from "../AmbientContext"

/** The units of a space an effect may take. */
export type Choice = (context: AmbientContext) => readonly AmbientUnit[]

/** Two units that do something together. */
export type Pair = readonly [AmbientUnit, AmbientUnit]

/** The share of its hearts left, at most, under which a unit is worn out. */
const WEARY_SHARE = 1 / 3

/** The bodies standing: no pillar, no trap, nothing lying on the ground. */
export const bodies: Choice = context => context.units().filter(({ unit }) => {
    if(!(unit instanceof Unit)) return true
    return unit.zone === null && unit.tangible && unit.targetable && unit.touchable
})

/** The heroes of the party outside of a battle. */
export const heroes: Choice = context => context.units().filter(({ unit }) => !(unit instanceof Unit))

/** The heroes outside of a battle, and the units the players play in one. */
export const playerHeroes: Choice = context => bodies(context).filter(({ unit }) => {
    return !(unit instanceof Unit) || unit.controller === "player"
})

/** How many hearts of a unit are full, out of how many it shows. */
export function lifeOf(shown: AmbientUnit): { readonly full: number, readonly total: number } {
    return { full: shown.hearts.filter(heart => !heart.isEmpty).length, total: shown.hearts.length }
}

/** The bodies with a third of their hearts or less. */
export const weary: Choice = context => bodies(context).filter(each => {
    const { full, total } = lifeOf(each)
    return full > 0 && full <= total * WEARY_SHARE
})

/** The bodies down to their last heart, out of two at least. */
export const lastHeart: Choice = context => bodies(context).filter(each => {
    const { full, total } = lifeOf(each)
    return full === 1 && total > 1
})

/** The bodies that carry an item or something to use. */
export const carriers: Choice = context => bodies(context).filter(({ unit }) => {
    return unit.items.length > 0 || unit.usables.length > 0
})

/** Is a unit a pet: played by a bot, from a deck that is not kept in order? */
export function isPet({ unit }: AmbientUnit): boolean {
    if(unit.controller === "player") return false
    return unit instanceof Unit ? !unit.stats.ordered.value : unit.bases.ordered !== true
}

/** The pets with a unit of their side that is not one within a distance of them, in pixels. */
export function petsByAFriend(reach: number): Choice {
    return context => {
        const taken = bodies(context)
        return taken.filter(pet => isPet(pet) && taken.some(friend => {
            return !isPet(friend) && sameSide(pet, friend)
                && distanceBetween(pet.position, friend.position) <= reach
        }))
    }
}

/** The heroes outside of a battle with all their hearts. */
export const freshHeroes: Choice = context => heroes(context).filter(each => {
    const { full, total } = lifeOf(each)
    return total > 0 && full === total
})

/** Some of the units, drawn at random, each once: all of them when there are no more than asked. */
export function drawAmong(random: Random, units: readonly AmbientUnit[], most = Infinity): AmbientUnit[] {
    const left = [...units]
    if(left.length <= most) return left
    return Array.from({ length: most }, () => left.splice(Math.floor(random() * left.length), 1)[0])
}

/** How far apart two points are. */
export function distanceBetween(from: Point, to: Point): number {
    return Math.hypot(to.x - from.x, to.y - from.y)
}

/** Are two units on the same side? The heroes outside of a battle all are. */
function sameSide(one: AmbientUnit, other: AmbientUnit): boolean {
    if(one.unit instanceof Unit) return other.unit instanceof Unit && one.unit.team === other.unit.team
    return !(other.unit instanceof Unit)
}

/** The pairs of units of a same side that stand within a distance of each other, each pair once. */
export function pairsWithin(units: readonly AmbientUnit[], reach: number): Pair[] {
    return units.flatMap((one, index) => units.slice(index + 1).flatMap((other): Pair[] => {
        const near = sameSide(one, other) && distanceBetween(one.position, other.position) <= reach
        return near ? [[one, other]] : []
    }))
}
