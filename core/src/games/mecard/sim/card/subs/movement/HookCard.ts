import type { Text } from "../../../../../../semantic"
import { rgba } from "../../../base/Rgba"
import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { meters } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { ROOTED } from "../../../status/subs/Rooted"

import { ActionCard } from "../ActionCard"
import { fly } from "../tools/bolt"
import { hold, SHORT_TIME, travel } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { UNIT } from "../../../base/keywords"

/** How far the hooks of the catalog reach, in meters, before the reach of the unit. */
const HOOK_RANGE = 4

/** How fast a hook pulls, in meters per second. */
const PULL_SPEED = 10

/** How far a pull stops short of the body it pulls to, in meters, so the two never overlap. */
const PULL_GAP = 0.05

/** How short of its whole reach a line must stop to have caught a pillar or a wall, in meters. */
const ANCHOR_SLACK = 0.01

/** How many steps the vine of the catalog roots the unit it pulls for. */
const VINE_ROOT = 1

/** The color of a rope flying out. */
const ROPE_COLOR = rgba(0.85, 0.75, 0.5, 0.9)

/** What a hook caught, from a pose, and where the pull it sets off would take who. */
interface Catch {
    /** Where the rope went. */
    readonly end: Vector2

    /** Who is pulled, none when nothing is: the unit caught, or the caster. */
    readonly pulled: Unit|null

    /** Which way and how far, in meters. */
    readonly way: Vector2
    readonly distance: number
}

/**
 * A rope thrown straight ahead, up to the first body, pillar or wall. A unit caught may be pulled to the
 * caster, keeping its facing; a pillar or a wall caught, or a unit the hook does not pull, may pull the
 * caster to it.
 */
export class HookCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it reaches, in meters, before the reach of the unit. */
        public readonly range: number,

        /** Does it pull the unit it catches to the caster? */
        public readonly pullsUnits: boolean,

        /** Does it pull the caster to what it catches, and does not pull? */
        public readonly pullsSelf: boolean,

        /** How many steps it roots the unit it pulls for, none for none. */
        public readonly roots: number,
    ){
        super(name, description, rarity, HookCard.#hooking(range, pullsUnits, pullsSelf, roots))
    }


    /** What a hook would catch from a pose, and the pull it would set off. */
    static #caught(
        battle: Battle, unit: Unit, pose: Pose, range: number, pullsUnits: boolean, pullsSelf: boolean,
    ): Catch {
        const reach = range * unit.stats.throwRange.value
        const { end, unit: hit } = battle.ray(unit, reach, pose)
        if(hit && pullsUnits){
            const distance = hit.position.distance(pose.position) - unit.radius - hit.radius - PULL_GAP
            return { end, pulled: hit, way: pose.direction.opposite, distance: Math.max(0, distance) }
        }
        const anchored = hit !== null || pose.position.distance(end) < reach - ANCHOR_SLACK
        if(anchored && pullsSelf){
            // The line stops on the edge of what it caught: the caster stops a body short of it.
            const distance = pose.position.distance(end) - unit.radius - PULL_GAP
            return { end, pulled: unit, way: pose.direction, distance: Math.max(0, distance) }
        }
        return { end, pulled: null, way: pose.direction, distance: 0 }
    }

    static #hooking(range: number, pullsUnits: boolean, pullsSelf: boolean, roots: number): Action {
        return {
            use: function* ({ battle, unit }){
                const caught = HookCard.#caught(battle, unit, unit, range, pullsUnits, pullsSelf)
                yield* fly(battle, unit.position, caught.end, ROPE_COLOR)
                if(!caught.pulled){
                    battle.events.push({ type: "skipped", unit, reason: "rien à accrocher" })
                    yield* hold(battle, SHORT_TIME, [label(unit.position, "rien à accrocher", NOTE_COLOR)])
                    return
                }
                const forced = caught.pulled !== unit
                const theirs = { battle, unit: caught.pulled }
                yield* travel(theirs, caught.way, caught.distance, PULL_SPEED, forced)
                if(forced && roots > 0) battle.applyStatus(caught.pulled, ROOTED, roots)
            },
            preview: ({ battle, unit, pose }) => {
                const caught = HookCard.#caught(battle, unit, pose, range, pullsUnits, pullsSelf)
                const rope = arrow([pose.position, caught.end], MOVE_WIDTH / 2, ROPE_COLOR)
                const { pulled } = caught
                if(!pulled) return still(pose, rope, label(pose.position, "rien à accrocher", NOTE_COLOR))
                const from = pulled === unit ? pose.position : pulled.position
                const pull = battle.travel(pulled, from, caught.way, caught.distance)
                if(pulled !== unit){
                    return still(pose, rope, arrow([from, pull.to], MOVE_WIDTH, CONTROL_COLOR))
                }
                const gone = arrow([from, pull.to], MOVE_WIDTH, MOVE_COLOR)
                return still({ ...pose, position: pull.to }, rope, gone)
            },
        }
    }
}

export const LASSO = new HookCard("Lasso", [
    "Lance une corde droit devant, jusqu'à ", meters(HOOK_RANGE), " × portée : la première ", UNIT, " prise est tirée ",
    "jusqu'à toi, sans se retourner.",
], Rarity.COMMON, HOOK_RANGE, true, false, 0)

export const GRAPPLE = new HookCard("Grappin", [
    "Lance un grappin droit devant, jusqu'à ", meters(HOOK_RANGE), " × portée : tu te tires jusqu'au premier ",
    "pilier, mur ou corps qu'il accroche.",
], Rarity.COMMON, HOOK_RANGE, false, true, 0)

export const VINE = new HookCard("Liane", [
    "Lance une liane droit devant, jusqu'à ", meters(HOOK_RANGE), " × portée : une ", UNIT, " prise est tirée jusqu'à ",
    "toi et immobilisée ", VINE_ROOT, " étape ; un pilier ou un mur te tire jusqu'à lui.",
], Rarity.RARE, HOOK_RANGE, true, true, VINE_ROOT)
