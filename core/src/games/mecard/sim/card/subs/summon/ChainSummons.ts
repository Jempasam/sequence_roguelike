import { DISTANCE, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { frenchNumber, HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"
import type { Card } from "../../Card"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { GREAT_THRUST } from "../attack/Smashes"
import { SHOT, SHOT_RANGE } from "../attack/Shot"
import { AIM } from "../movement/Aim"
import { ENERGETIC_AIM, SHOUT, TAUNT } from "../movement/Orientation"
import { WAIT } from "../movement/Wait"
import { SUCTION } from "../combat/Shoves"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { ring } from "../tools/targeting"
import { summonedHearts, summonShown } from "./SummonCard"
import type { Visual } from "../../../base/Visual"
import { visual } from "../../../base/Visual"

/** How far ahead the bodies of the cards of this file stand, in meters: at the contact. */
const AHEAD = 1

/** The radii of the zones the bodies work in, in meters. */
const BLACK_HOLE_RADIUS = 3
const TOTEM_SHOUT_RADIUS = 1.5
const DECOY_RADIUS = 1.5
const SENTINEL_RADIUS = 2
const TURRET_RADIUS = 4

/** How many time hearts the bodies that last a few rounds have. */
const TURRET_ROUNDS = 2
const SHOUT_TOTEM_ROUNDS = 3
const BLACK_HOLE_ROUNDS = 2
const SENTINEL_ROUNDS = 2

/** What a card of this file puts on the arena, and how it tells what its body will work on. */
export interface ChainSummon {
    readonly sprite: Visual
    readonly name: string

    /** The hearts of the body, from its owner. */
    hearts(owner: Unit): Heart[]

    /** The cards the body plays, round after round. */
    readonly cards: readonly Card[]

    /** How far around it the body works, in meters: the zone shown in the preview. */
    readonly radius: number

    /** The units the body would work on from a point, for the preview. */
    targets(battle: Battle, owner: Unit, at: Vector2): Unit[]
}

/** Where the body of a summon stands, from a pose. */
function spotOf(pose: Pose): Vector2 {
    return pose.position.plus(pose.direction.times(AHEAD))
}

/** The units but the owner within a distance of a point. */
function around(battle: Battle, owner: Unit, at: Vector2, radius: number): Unit[] {
    return battle.touchables.filter(other => other !== owner && other.position.distance(at) <= radius + other.radius)
}

/** The nearest enemy of an owner within a distance of a point, as a list. */
function nearestEnemy(battle: Battle, owner: Unit, at: Vector2, radius: number): Unit[] {
    const enemy = battle.nearestEnemy(owner, radius, at)
    return enemy ? [enemy] : []
}

/**
 * A card setting down a body that plays a chain of cards, round after round, as a robot does: it lasts by its
 * hearts, which are often time hearts.
 */
export class ChainSummonCard extends ActionCard {


    constructor(
        name: string, description: ConstructorParameters<typeof ActionCard>[1], rarity: Rarity,
        public readonly summon: ChainSummon,
    ){
        super(name, description, rarity, ChainSummonCard.#summoning(summon))
    }


    static #summoning(summon: ChainSummon): Action {
        return {
            use: function* ({ battle, unit }){
                placeChainSummon(battle, unit, summon)
                yield* hold(battle, SHORT_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const spot = spotOf(pose)
                if(!battle.free(spot, unit, UNIT_RADIUS)) return still(pose, label(spot, "pas de place", NOTE_COLOR))
                return still(
                    pose, summonShown(spot), polygon({ kind: "circle", center: spot, radius: summon.radius }, RANGE_COLOR),
                    ...summon.targets(battle, unit, spot).map(ring),
                )
            },
        }
    }
}

/** Set down the body of a summon a meter ahead of its owner, none when there is no room. */
export function placeChainSummon(battle: Battle, owner: Unit, summon: ChainSummon): Unit|null {
    return battle.place(owner, {
        sprite: summon.sprite, name: summon.name, at: spotOf(owner), direction: owner.direction,
        hearts: summon.hearts(owner), cards: summon.cards,
    })
}

/** Time hearts for a number of rounds. */
function timed(rounds: number): Heart[] {
    return Heart.many(TIME_HEART, rounds)
}

export const BLACK_HOLE = new ChainSummonCard("Trou noir", [
    "Ouvre à ", AHEAD, " ", DISTANCE, " devant un trou noir de ", new HeartCount(BLACK_HOLE_ROUNDS),
    " de temps : deux fois Aspiration, de ", BLACK_HOLE_RADIUS, " ", DISTANCE, " autour de lui.",
], Rarity.EPIC, {
    sprite: visual("units/mine"), name: "Trou noir", hearts: () => timed(BLACK_HOLE_ROUNDS), cards: [SUCTION, SUCTION],
    radius: BLACK_HOLE_RADIUS, targets: (battle, owner, at) => around(battle, owner, at, BLACK_HOLE_RADIUS),
})

export const TURRET = new ChainSummonCard("Tourelle", [
    "Pose à ", AHEAD, " ", DISTANCE, " devant une tourelle de ", new HeartCount(TURRET_ROUNDS),
    " de temps : Viser puis Tir, tir ", frenchNumber(SHOT_RANGE), " ", DISTANCE, ".",
], Rarity.RARE, {
    sprite: visual("units/robot"), name: "Tourelle", hearts: () => timed(TURRET_ROUNDS), cards: [AIM, SHOT],
    radius: TURRET_RADIUS, targets: (battle, owner, at) => nearestEnemy(battle, owner, at, TURRET_RADIUS),
})

export const SHOUT_TOTEM = new ChainSummonCard("Totem de cri", [
    "Plante à ", AHEAD, " ", DISTANCE, " devant un totem de ", new HeartCount(SHOUT_TOTEM_ROUNDS),
    " de temps : Cri puis Attendre, ", frenchNumber(TOTEM_SHOUT_RADIUS), " ", DISTANCE, " autour de lui.",
], Rarity.RARE, {
    sprite: visual("units/totem"), name: "Totem de cri", hearts: () => timed(SHOUT_TOTEM_ROUNDS), cards: [SHOUT, WAIT],
    radius: TOTEM_SHOUT_RADIUS, targets: (battle, owner, at) => around(battle, owner, at, TOTEM_SHOUT_RADIUS),
})

export const DECOY = new ChainSummonCard("Leurre", [
    "Pose à ", AHEAD, " ", DISTANCE, " devant un leurre d'un cœur : Provocation, tourne chaque ", UNIT, " à ",
    frenchNumber(DECOY_RADIUS), " ", DISTANCE, " vers lui.",
], Rarity.COMMON, {
    sprite: visual("units/puppeteer"), name: "Leurre", hearts: owner => summonedHearts(owner, 1), cards: [TAUNT],
    radius: DECOY_RADIUS, targets: (battle, owner, at) => around(battle, owner, at, DECOY_RADIUS),
})

export const SENTINEL = new ChainSummonCard("Sentinelle", [
    "Pose à ", AHEAD, " ", DISTANCE, " devant une sentinelle de ", new HeartCount(SENTINEL_ROUNDS), " de temps : Visée ",
    "énergique, puis Grande estoc.",
], Rarity.RARE, {
    sprite: visual("units/stone_golem"), name: "Sentinelle", hearts: () => timed(SENTINEL_ROUNDS), cards: [ENERGETIC_AIM, GREAT_THRUST],
    radius: SENTINEL_RADIUS, targets: (battle, owner, at) => nearestEnemy(battle, owner, at, SENTINEL_RADIUS),
})
