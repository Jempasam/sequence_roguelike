import type { Vector2 } from "../../../base/Vector2"
import type { Action, Pose } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Indicator } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import { DISTANCE, UNIT } from "../../../base/keywords"

import { ActionCard } from "../ActionCard"
import { hold, WORD_TIME } from "../tools/playing"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import { Rarity } from "../../Rarity"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"
import { STUNNED } from "../../../status/subs/Stunned"

/** How far the shout and the taunt reach, in meters. */
const SHOUT_RADIUS = 1.5 - UNIT_RADIUS

/** How long the lines splitting the arena for the orientation are, each way, in meters. */
const SPLIT_LENGTH = 40

/** How wide the sector of the icy glare is: the cosine of half its angle, an arc of 90°. */
const GLARE_COS_HALF = Math.SQRT1_2

/** How far the icy glare reaches, in meters. */
const GLARE_RADIUS = 3 - UNIT_RADIUS

/** The cosine of a turn of 45° at most: what a unit facing the one who glares is within. */
const GLARE_FACING = Math.SQRT1_2

/** How far behind the unit the about-face stuns, in meters, and how wide that is. */
const ABOUT_FACE_LENGTH = 1 - UNIT_RADIUS
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
    const area = (unit: Unit, pose: Pose): Area => unit.around(SHOUT_RADIUS, pose)
    return {
        use: function ({ battle, unit }){
            const turned = Turn.turnUnitsIn(battle, area(unit, unit), unit, directionOf(unit.position))
            hold(battle, WORD_TIME, [Previews.polygon(area(unit, unit), CONTROL_COLOR), ...turned.map(other => {
                return Previews.arrow(
                    [other.position, other.position.plus(other.direction.times(TURN_LENGTH))], MOVE_WIDTH, CONTROL_COLOR,
                )
            })])
        },
        preview: ({ battle, unit, pose }) => {
            const turnings = Turn.turnsIn(battle, area(unit, pose), unit, directionOf(pose.position))
            return Previews.still(pose, Previews.polygon(area(unit, pose), RANGE_COLOR), ...turnings.map(Turn.turningShown))
        },
    }
}

/** Every unit around, but the one that shouts, turns its back to it. */
export const SHOUT = new ActionCard("Cri", [
    TURN.as("Tourne le dos"), " à l'", UNIT, " de chaque ", UNIT, " à ", SHOUT_RADIUS, " ", DISTANCE, " autour. Aucun dégât.",
], Rarity.COMMON, shouting(by => awayFrom(by)))

/** Every unit around turns to face the one that taunts. */
export const TAUNT = new ActionCard("Provocation", [
    TURN.as("Tourne"), " chaque ", UNIT, " à ", SHOUT_RADIUS, " ", DISTANCE, " autour vers l'", UNIT, " qui provoque.",
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
    TURN.as("Tourne"), " d'un huitième de tour du côté de l'axe où il y a le plus d'ennemis. Rien à égalité.",
], Rarity.RARE, {
    use: function (ctx){
        const { battle, unit } = ctx
        const way = sideTurn(battle, unit, unit)
        if(way){
            Turn.turnToward(ctx, way)
            return
        }
        battle.events.push({ type: "skipped", unit, reason: "autant d'ennemis de chaque côté" })
        hold(battle, WORD_TIME, [Previews.label(unit.position, "égalité", NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const split = Previews.polygon(Areas.line(pose.position.minus(pose.direction.times(SPLIT_LENGTH)), pose.position.plus(pose.direction.times(SPLIT_LENGTH)), 0), RANGE_COLOR)
        const way = sideTurn(battle, unit, pose)
        if(!way) return Previews.still(pose, split, Previews.label(pose.position, "égalité", NOTE_COLOR))
        const tip = pose.position.plus(way.times(TURN_LENGTH))
        return Previews.still({ ...pose, direction: way }, split, Previews.arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
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
        use: function (ctx){
            const { battle, unit } = ctx
            const found = aimed({ battle, unit, pose: unit })
            if(!found){
                battle.events.push({ type: "skipped", unit, reason: nobody })
                hold(battle, WORD_TIME, [Previews.label(unit.position, nobody, NOTE_COLOR)])
                return
            }
            const stun = startled({ battle, unit, pose: unit }, found)
            Turn.turnToward(ctx, found.way)
            if(stun) battle.applyStatus(found.target, STUNNED, 1)
        },
        preview: ctx => {
            const { pose, unit } = ctx
            // A reach with no end draws no circle.
            const circles: Indicator[] = Number.isFinite(radius(unit))
                ? [Previews.polygon(unit.around(radius(unit), pose), RANGE_COLOR)]
                : []
            const found = aimed(ctx)
            if(!found) return Previews.still(pose, ...circles, Previews.label(pose.position, nobody, NOTE_COLOR))
            const tip = pose.position.plus(found.way.times(TURN_LENGTH))
            const shown: Indicator[] = [...circles, Previews.arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR)]
            const { position } = found.target
            if(startled(ctx, found)) shown.push(Previews.label(position, STUNNED.name, NOTE_COLOR))
            return Previews.still({ ...pose, direction: found.way }, ...shown)
        },
    }
}

/** How far the energetic aim looks for an enemy, in meters. */
const ENERGETIC_RANGE = 2 - UNIT_RADIUS

/** An aim at the nearest enemy within a short reach of the edge of the body, stunning an enemy it had to turn far to reach. */
export const ENERGETIC_AIM = new ActionCard("Visée énergique", [
    TURN.as("Se tourne"), " vers l'ennemi le plus proche, jusqu'à ", ENERGETIC_RANGE, " ", DISTANCE, ". Si cela demande plus d'un quart ",
    "de tour, il gagne ", STUNNED, " ", 1, ".",
], Rarity.RARE, aiming(
    ({ battle, unit, pose }, range) => {
        const near = battle.enemiesOf(unit).filter(enemy => unit.hitbox.gap(pose, enemy.hitbox, enemy) <= range)
        return closest(near, pose.position)
    },
    () => ENERGETIC_RANGE, true, "personne à viser",
))

/** An aim at the nearest ally, the unit itself apart. */
export const ALLY_AIM = new ActionCard("Viser allié", [
    TURN.as("Se tourne"), " vers l'allié le plus proche.",
], Rarity.COMMON, aiming(
    ({ battle, unit, pose }, range) => {
        const allies = battle.bodies.filter(other => other !== unit && other.team === unit.team)
        const near = closest(allies, pose.position)
        return near && near.position.distance(pose.position) <= range ? near : null
    },
    () => Infinity, false, "personne à viser",
))


/** Where the about-face stuns: just behind the unit. */
function behind(unit: Unit, pose: Pose): Area {
    const from = unit.muzzle(pose, pose.direction.opposite)
    return Areas.line(from, from.minus(pose.direction.times(ABOUT_FACE_LENGTH)), ABOUT_FACE_WIDTH)
}

/** A half turn, stunning the nearest unit behind. */
export const ABOUT_FACE = new ActionCard("Volte-face", [
    TURN.as("Fait demi-tour"), ". L'", UNIT, " la plus proche derrière, à ", ABOUT_FACE_LENGTH, " ", DISTANCE, ", gagne ",
    STUNNED, " ", 1, ".",
], Rarity.COMMON, {
    use: function (ctx){
        const { battle, unit } = ctx
        const hit = closest(battle.fetch(behind(unit, unit), unit), unit.position)
        Turn.turnToward(ctx, unit.direction.opposite)
        if(hit) battle.applyStatus(hit, STUNNED, 1)
    },
    preview: ({ battle, unit, pose }) => {
        const zone = Previews.polygon(behind(unit, pose), RANGE_COLOR)
        const away = pose.direction.opposite
        const half = Previews.arrow([pose.position, pose.position.plus(away.times(TURN_LENGTH))], MOVE_WIDTH, MOVE_COLOR)
        const hit = closest(battle.fetch(behind(unit, pose), unit), pose.position)
        const stunned = hit ? [Previews.label(hit.position, STUNNED.name, NOTE_COLOR)] : []
        return Previews.still({ ...pose, direction: away }, zone, half, ...stunned)
    },
})


/** The units of a sector that face its apex within an eighth of a turn each way: those the glare freezes. */
function glared(battle: Battle, unit: Unit, pose: Pose): Unit[] {
    const area: Area = Areas.arc(unit.muzzle(pose), pose.direction, GLARE_RADIUS, GLARE_COS_HALF)
    return battle.fetch(area, unit).filter(other => {
        const toward = pose.position.minus(other.position).normalized
        return toward !== null && other.direction.dot(toward) >= GLARE_FACING
    })
}

/** A stare freezing whoever looks back. */
export const ICY_GLARE = new ActionCard("Regard glaçant", [
    "Chaque ", UNIT, " qui regarde vers elle, à ", GLARE_RADIUS, " ", DISTANCE, " devant dans un quart de tour, gagne ",
    STUNNED, " ", 1, ".",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const frozen = glared(battle, unit, unit)
        for(const other of frozen) battle.applyStatus(other, STUNNED, 1)
        hold(battle, WORD_TIME, [Previews.polygon(Areas.arc(unit.muzzle(), unit.direction, GLARE_RADIUS, GLARE_COS_HALF), CONTROL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const zone = Previews.polygon(Areas.arc(unit.muzzle(pose), pose.direction, GLARE_RADIUS, GLARE_COS_HALF), RANGE_COLOR)
        return Previews.still(pose, zone, ...glared(battle, unit, pose).map(other => {
            return Previews.label(other.position, STUNNED.name, NOTE_COLOR)
        }))
    },
})
