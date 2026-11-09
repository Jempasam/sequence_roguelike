import type { Vector2 } from "../../../base/Vector2"
import type { Action, Indicator, PreviewContext } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import { frenchNumber } from "../../../battle/words"
import { DISTANCE, UNIT } from "../../../base/keywords"

import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { arrow, label, polygon, still } from "../tools/previews"
import { turning, turnsIn, turnUnitsIn } from "../tools/turning"
import { Rarity } from "../../Rarity"

/** How far the shout and the taunt reach, in meters. */
const SHOUT_RADIUS = 1.5

/** How long the lines splitting the arena for the orientation are, each way, in meters. */
const SPLIT_LENGTH = 40

/** How wide the sector of the icy glare is: the cosine of half its angle, an arc of 90°. */
const GLARE_COS_HALF = Math.SQRT1_2

/** How far the icy glare reaches, in meters. */
const GLARE_RADIUS = 3

/** The cosine of a turn of 45° at most: what a unit facing the one who glares is within. */
const GLARE_FACING = Math.SQRT1_2

/** How far behind the unit the about-face stuns, in meters, and how wide that is. */
const ABOUT_FACE_LENGTH = 1
const ABOUT_FACE_WIDTH = 0.7

/** Which way a unit looks away from another: straight away, or none when they are at the same spot. */
function awayFrom(from: Vector2): (unit: Unit) => Vector2|null {
    return unit => unit.position.minus(from).normalized
}

/** Which way a unit looks at another. */
function towards(to: Vector2): (unit: Unit) => Vector2|null {
    return unit => to.minus(unit.position).normalized
}

/** An action turning the units around its unit, each toward a direction of its own. */
function shouting(directionOf: (center: Vector2) => (unit: Unit) => Vector2|null): Action {
    const area = (pose: { position: Vector2 }): Area => {
        return { kind: "circle", center: pose.position, radius: SHOUT_RADIUS }
    }
    return {
        use: function* ({ battle, unit }){
            const turned = turnUnitsIn(battle, area(unit), unit, directionOf(unit.position))
            yield* hold(battle, WORD_TIME, [polygon(area(unit), CONTROL_COLOR), ...turned.map(other => {
                return arrow(
                    [other.position, other.position.plus(other.direction.times(TURN_LENGTH))], MOVE_WIDTH, CONTROL_COLOR,
                )
            })])
        },
        preview: ({ battle, unit, pose }) => {
            const turnings = turnsIn(battle, area(pose), unit, directionOf(pose.position))
            return still(pose, polygon(area(pose), RANGE_COLOR), ...turnings.map(turning))
        },
    }
}

/** Every unit around, but the one that shouts, turns its back to it. */
export const SHOUT = new ActionCard("Cri", [
    "Tourne le dos à l'", UNIT, " de chaque ", UNIT, " à ", frenchNumber(SHOUT_RADIUS), " ", DISTANCE, " autour. Aucun dégât.",
], Rarity.COMMON, shouting(by => awayFrom(by)))

/** Every unit around turns to face the one that taunts. */
export const TAUNT = new ActionCard("Provocation", [
    "Tourne chaque ", UNIT, " à ", frenchNumber(SHOUT_RADIUS), " ", DISTANCE, " autour vers l'", UNIT, " qui provoque.",
], Rarity.COMMON, shouting(by => towards(by)))


/** How many enemies stand on each side of the axis of a pose: right then left. */
function sides(battle: Battle, unit: Unit, pose: { position: Vector2, direction: Vector2 }): [number, number] {
    let right = 0
    let left = 0
    for(const enemy of battle.enemiesOf(unit)){
        const side = pose.direction.right.dot(enemy.position.minus(pose.position))
        if(side > 0) right++
        else if(side < 0) left++
    }
    return [right, left]
}

/** The turn of an eighth toward the side with the most enemies, none for a tie. */
function sideTurn(battle: Battle, unit: Unit, pose: { position: Vector2, direction: Vector2 }): Vector2|null {
    const [right, left] = sides(battle, unit, pose)
    if(right === left) return null
    return pose.direction.eighth(right > left ? 1 : -1)
}

/** A turn of an eighth toward the side of the axis with the most enemies. */
export const ORIENTATION = new ActionCard("Orientation", [
    "Tourne d'un huitième de tour du côté de l'axe où il y a le plus d'ennemis. Rien à égalité.",
], Rarity.RARE, {
    use: function* (ctx){
        const { battle, unit } = ctx
        const way = sideTurn(battle, unit, unit)
        if(way){
            yield* turn(ctx, way)
            return
        }
        battle.events.push({ type: "skipped", unit, reason: "autant d'ennemis de chaque côté" })
        yield* hold(battle, WORD_TIME, [label(unit.position, "égalité", NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const split = polygon({
            kind: "segment",
            from: pose.position.minus(pose.direction.times(SPLIT_LENGTH)),
            to: pose.position.plus(pose.direction.times(SPLIT_LENGTH)),
            width: 0,
        }, RANGE_COLOR)
        const way = sideTurn(battle, unit, pose)
        if(!way) return still(pose, split, label(pose.position, "égalité", NOTE_COLOR))
        const tip = pose.position.plus(way.times(TURN_LENGTH))
        return still({ ...pose, direction: way }, split, arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
    },
})


/** The unit nearest to a point among some, none for none. */
function closest(units: readonly Unit[], from: Vector2): Unit|null {
    let found: Unit|null = null
    let best = Infinity
    for(const unit of units){
        const distance = unit.position.distance(from)
        if(distance < best){
            found = unit
            best = distance
        }
    }
    return found
}

/** What an aim of this file would turn to, from a pose. */
interface Aimed {
    readonly target: Unit
    readonly way: Vector2
}

/** An aim at a unit chosen among those in a circle, turning toward it and stunning it when asked to. */
function aiming(
    choose: (ctx: PreviewContext, range: number) => Unit|null, radius: (unit: Unit) => number,
    stuns: boolean, nobody: string,
): Action {
    const aimed = (ctx: PreviewContext): Aimed|null => {
        const target = choose(ctx, radius(ctx.unit))
        const way = target?.position.minus(ctx.pose.position).normalized
        return target && way ? { target, way } : null
    }
    // A turn of more than a quarter of a turn takes the target by surprise.
    const startled = (ctx: PreviewContext, { way }: Aimed) => stuns && ctx.pose.direction.dot(way) < 0
    return {
        use: function* (ctx){
            const { battle, unit } = ctx
            const found = aimed({ battle, unit, pose: unit })
            if(!found){
                battle.events.push({ type: "skipped", unit, reason: nobody })
                yield* hold(battle, WORD_TIME, [label(unit.position, nobody, NOTE_COLOR)])
                return
            }
            const stun = startled({ battle, unit, pose: unit }, found)
            yield* turn(ctx, found.way)
            if(stun) battle.stun(found.target)
        },
        preview: ctx => {
            const { pose, unit } = ctx
            // A reach with no end draws no circle.
            const circles: Indicator[] = Number.isFinite(radius(unit))
                ? [polygon({ kind: "circle", center: pose.position, radius: radius(unit) }, RANGE_COLOR)]
                : []
            const found = aimed(ctx)
            if(!found) return still(pose, ...circles, label(pose.position, nobody, NOTE_COLOR))
            const tip = pose.position.plus(found.way.times(TURN_LENGTH))
            const shown: Indicator[] = [...circles, arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR)]
            if(startled(ctx, found)) shown.push(label(found.target.position, "étourdi", NOTE_COLOR))
            return still({ ...pose, direction: found.way }, ...shown)
        },
    }
}

/** How far the energetic aim looks for an enemy, in meters. */
const ENERGETIC_RANGE = 2

/** An aim at the nearest enemy within a short reach, stunning an enemy it had to turn far to reach. */
export const ENERGETIC_AIM = new ActionCard("Visée énergique", [
    "Se tourne vers l'ennemi le plus proche, jusqu'à ", ENERGETIC_RANGE, " ", DISTANCE, ". Si cela demande plus d'un quart ",
    "de tour, il est étourdi.",
], Rarity.RARE, aiming(
    ({ battle, unit, pose }, range) => battle.nearestEnemy(unit, range, pose.position),
    () => ENERGETIC_RANGE, true, "personne à viser",
))

/** An aim at the nearest ally, the unit itself apart. */
export const ALLY_AIM = new ActionCard("Viser allié", [
    "Se tourne vers l'allié le plus proche.",
], Rarity.COMMON, aiming(
    ({ battle, unit, pose }, range) => {
        const allies = battle.bodies.filter(other => other !== unit && other.team === unit.team)
        const near = closest(allies, pose.position)
        return near && near.position.distance(pose.position) <= range ? near : null
    },
    () => Infinity, false, "personne à viser",
))


/** Where the about-face stuns: just behind the unit. */
function behind(pose: { position: Vector2, direction: Vector2 }): Area {
    return {
        kind: "segment",
        from: pose.position,
        to: pose.position.minus(pose.direction.times(ABOUT_FACE_LENGTH)),
        width: ABOUT_FACE_WIDTH,
    }
}

/** A half turn, stunning the nearest unit behind. */
export const ABOUT_FACE = new ActionCard("Volte-face", [
    "Fait demi-tour. L'", UNIT, " la plus proche derrière, à ", ABOUT_FACE_LENGTH, " ", DISTANCE, ", est étourdie.",
], Rarity.COMMON, {
    use: function* (ctx){
        const { battle, unit } = ctx
        const hit = closest(battle.unitsIn(behind(unit), unit), unit.position)
        yield* turn(ctx, unit.direction.opposite)
        if(hit) battle.stun(hit)
    },
    preview: ({ battle, unit, pose }) => {
        const zone = polygon(behind(pose), RANGE_COLOR)
        const away = pose.direction.opposite
        const half = arrow([pose.position, pose.position.plus(away.times(TURN_LENGTH))], MOVE_WIDTH, MOVE_COLOR)
        const hit = closest(battle.unitsIn(behind(pose), unit), pose.position)
        const stunned = hit ? [label(hit.position, "étourdi", NOTE_COLOR)] : []
        return still({ ...pose, direction: away }, zone, half, ...stunned)
    },
})


/** The units of a sector that face its apex within an eighth of a turn each way: those the glare freezes. */
function glared(battle: Battle, unit: Unit, pose: { position: Vector2, direction: Vector2 }): Unit[] {
    const area: Area = {
        kind: "sector", center: pose.position, direction: pose.direction,
        radius: GLARE_RADIUS, cosHalf: GLARE_COS_HALF,
    }
    return battle.unitsIn(area, unit).filter(other => {
        const toward = pose.position.minus(other.position).normalized
        return toward !== null && other.direction.dot(toward) >= GLARE_FACING
    })
}

/** A stare freezing whoever looks back. */
export const ICY_GLARE = new ActionCard("Regard glaçant", [
    "Étourdit chaque ", UNIT, " qui regarde vers elle, à ", GLARE_RADIUS, " ", DISTANCE, " devant dans un quart de tour.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const frozen = glared(battle, unit, unit)
        for(const other of frozen) battle.stun(other)
        yield* hold(battle, WORD_TIME, [polygon({
            kind: "sector", center: unit.position, direction: unit.direction,
            radius: GLARE_RADIUS, cosHalf: GLARE_COS_HALF,
        }, CONTROL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const zone = polygon({
            kind: "sector", center: pose.position, direction: pose.direction,
            radius: GLARE_RADIUS, cosHalf: GLARE_COS_HALF,
        }, RANGE_COLOR)
        return still(pose, zone, ...glared(battle, unit, pose).map(other => {
            return label(other.position, "étourdi", NOTE_COLOR)
        }))
    },
})
