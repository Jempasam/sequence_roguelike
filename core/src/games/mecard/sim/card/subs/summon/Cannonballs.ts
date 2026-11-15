import { DISTANCE } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import { visual } from "../../../base/Visual"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"
import { Rarity } from "../../Rarity"

import { KAMIKAZE } from "../body/BodyCards"
import { BOUNCE_DASH } from "../movement/BounceDash"
import { RAM } from "../movement/Ram"
import { ChainSummonCard } from "./ChainSummons"

/** How far ahead the cannonballs stand, in meters: at the contact. */
const AHEAD = 1

/** How many time hearts a cannonball lives by: it is gone at the end of its round. */
const CANNONBALL_ROUNDS = 1

/** How far a cannonball sees the enemies it flies at, in meters, for the preview. */
const CANNONBALL_RADIUS = 4

/** How many times the cannonball rams, and the bouncing ball bounces before it blows. */
const CANNONBALL_RAMS = 4
const BOUNCING_BALL_BOUNCES = 2

/** The nearest enemy of an owner around a point, within the sight of a cannonball, as a list. */
function nearest(battle: Battle, owner: Unit, at: Vector2): Unit[] {
    const enemy = battle.nearestEnemy(owner, CANNONBALL_RADIUS, at)
    return enemy ? [enemy] : []
}

/** A cannonball: it rams four times in a row, then is gone. */
export const CANNONBALL = new ChainSummonCard("Boulet de canon", [
    "Pose à ", AHEAD, " ", DISTANCE, " devant un boulet de canon d'", new HeartCount(CANNONBALL_ROUNDS),
    " de temps : Dash dégât, ", CANNONBALL_RAMS, " fois.",
], Rarity.RARE, {
    sprite: visual("units/mine"), name: "Boulet de canon", hearts: () => Heart.many(TIME_HEART, CANNONBALL_ROUNDS),
    cards: Array.from({ length: CANNONBALL_RAMS }, () => RAM),
    radius: CANNONBALL_RADIUS, targets: nearest,
})

/** A bouncing ball: it bounces twice, then blows up. */
export const BOUNCING_BALL = new ChainSummonCard("Boulet rebondissant", [
    "Pose à ", AHEAD, " ", DISTANCE, " devant un boulet d'", new HeartCount(CANNONBALL_ROUNDS),
    " de temps : Bounce Dash, ", BOUNCING_BALL_BOUNCES, " fois, puis Kamikaze.",
], Rarity.RARE, {
    sprite: visual("units/mine"), name: "Boulet rebondissant", hearts: () => Heart.many(TIME_HEART, CANNONBALL_ROUNDS),
    cards: [...Array.from({ length: BOUNCING_BALL_BOUNCES }, () => BOUNCE_DASH), KAMIKAZE],
    radius: CANNONBALL_RADIUS, targets: nearest,
})
