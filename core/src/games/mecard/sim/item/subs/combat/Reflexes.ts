import { DISTANCE, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import type { PlugContext } from "../../../battle/Action"
import * as Areas from "../../../battle/area/Areas"
import type { Unit } from "../../../battle/Unit"
import { DEMONIC } from "../../../status/subs/DemonEnergy"
import { BLEEDING } from "../../../status/subs/Wounds"
import { CONCENTRATED } from "../../../status/subs/Calm"
import { turning, turnsIn, turnUnitsIn } from "../../../card/subs/tools/turning"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { MOVE_COLOR, MOVE_WIDTH, RANGE_COLOR } from "../../../battle/previewColors"
import { shoveNow } from "../../../card/subs/tools/shoving"
import { WAIT } from "../../../card/subs/movement/Wait"

import { AbstractItem } from "../AbstractItem"
import { visual } from "../../../base/Visual"
import { frenchNumber } from "../../../battle/words"

/** How far from the unit an attacker must stand behind it, in angle, to be seen by the eyes in the back: the cosine of 130°. */
const BEHIND_COS = Math.cos(130 * Math.PI / 180)

/** How close to the body of its unit a unit must pass to be stunned by the cape, in meters. */
const CAPE_REACH = 0.2

/** The circles of the mask and the magnet, in meters, and how far the magnet pulls. */
const MASK_RADIUS = 1.5
const MAGNET_RADIUS = 3
const MAGNET_PULL = 0.5

/** How many times shorter the moves others make it do become with the soles. */
const SOLES_DIVISOR = 2

/** How far from the unit a blow may start and still be a blow at hand, in meters. */
const BLOW_REACH = 2.5

/** Eyes in the back: a unit struck by one that stands behind it turns around. */
export class BackEyes extends AbstractItem {


    constructor(){
        super("Yeux dans le dos", visual("items/scope"), [
            "Frappée par une ", UNIT, " qui est derrière elle (plus de 130° de son avant), l'", UNIT, " se retourne.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.struck.add(({ attacker }) => {
            const toward = attacker.position.minus(unit.position).normalized
            if(toward && unit.direction.dot(toward) < BEHIND_COS) battle.turn(unit, unit.direction.opposite)
        }))
    }
}

export const BACK_EYES = new BackEyes()

/** A cape: a unit that passes by the body of its unit while it moves on its own is stunned. */
export class ToreroCape extends AbstractItem {


    constructor(){
        super("Cape de torero", visual("items/doll"), [
            "Étourdit chaque ", UNIT, " qui traverse son corps, ou passe à moins de ", frenchNumber(CAPE_REACH), " ", DISTANCE,
            ", en se déplaçant d'elle-même : dash, charge, blink.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        // A move is many strides: a unit is stunned once by the cape for each step it takes.
        const stunned = new Set<Unit>()
        hold(battle.unitStepped.add(() => stunned.clear()))
        hold(battle.unitMoved.add(({ unit: mover, from, to }) => {
            // What others make it do is not a pass: only its own moves.
            if(mover === unit || mover.shoving) return
            if(Areas.distanceToSegment(unit.position, from, to) > unit.radius + CAPE_REACH) return
            if(stunned.has(mover)) return
            stunned.add(mover)
            battle.stun(mover)
        }))
    }
}

export const TORERO_CAPE = new ToreroCape()

/** A frightening mask: at the start of each round, the units around turn their backs. */
export class ScaryMask extends AbstractItem {


    constructor(){
        super("Masque effrayant", visual("items/scary_mask"), [
            "Au début de chaque ", BATTLE_ROUND, ", les ", UNIT.as("unités"), " à ", frenchNumber(MASK_RADIUS), " ", DISTANCE,
            " autour lui tournent le dos.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(() => {
            turnUnitsIn(
                battle, Areas.circle(unit.position, MASK_RADIUS), unit,
                other => other.position.minus(unit.position).normalized,
            )
        }))
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const zone = Areas.circle(pose.position, MASK_RADIUS)
        const turned = turnsIn(battle, zone, unit, other => other.position.minus(pose.position).normalized)
        return Previews.still(pose, Previews.polygon(zone, RANGE_COLOR), ...turned.map(turning))
    }
}

export const SCARY_MASK = new ScaryMask()

/** Sticky soles: what others make it do goes half as far. */
export class StickySoles extends AbstractItem {


    constructor(){
        super("Semelles collantes", visual("items/sticky_soles"), [
            "Les déplacements que d'autres lui imposent sont divisés par ", SOLES_DIVISOR, ".",
        ])
    }


    public init({ unit, hold }: PlugContext): void {
        hold(unit.incomingShove.add(incoming => {
            incoming.distance /= SOLES_DIVISOR
        }))
    }
}

export const STICKY_SOLES = new StickySoles()

/** A magnet: at the start of each round, the units around are pulled a little toward its unit. */
export class Magnet extends AbstractItem {


    constructor(){
        super("Aimant", visual("items/magnet"), [
            "Au début de chaque ", BATTLE_ROUND, ", tire de ", frenchNumber(MAGNET_PULL), " ", DISTANCE, " vers lui chaque ", UNIT, " à ",
            MAGNET_RADIUS, " ", DISTANCE, ". Aucun dégât.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(() => {
            for(const other of battle.fetch(Areas.circle(unit.position, MAGNET_RADIUS), unit)){
                const toward = unit.position.minus(other.position).normalized
                if(toward) shoveNow(battle, unit, other, toward, MAGNET_PULL)
            }
        }))
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const zone = Areas.circle(pose.position, MAGNET_RADIUS)
        const pulls = battle.fetch(zone, unit).map(other => {
            return Previews.arrow([other.position, pose.position], MOVE_WIDTH / 2, MOVE_COLOR)
        })
        return Previews.still(pose, Previews.polygon(zone, RANGE_COLOR), ...pulls)
    }
}

export const MAGNET = new Magnet()

/** A chipped blade: the first unit a blow at hand touches bleeds. */
export class ChippedBlade extends AbstractItem {


    constructor(){
        super("Lame ébréchée", visual("items/whetstone"), [
            "La première ", UNIT, " touchée par un coup au corps à corps gagne un ", BATTLE_ROUND, " de saignement.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let armed = false
        hold(unit.attacking.add(() => {
            armed = true
        }))
        hold(unit.hitting.add(({ target }) => {
            if(!armed) return
            armed = false
            // A blow at hand: what is hit from afar is a shot.
            if(target.position.distance(unit.position) > BLOW_REACH) return
            battle.applyStatus(target, BLEEDING, 1)
        }))
    }
}

export const CHIPPED_BLADE = new ChippedBlade()

/** A demonic fang: each kill feeds the demonic energy. */
export class DemonFang extends AbstractItem {


    constructor(){
        super("Croc démoniaque", visual("items/demon_fang"), [
            "Chaque ", UNIT, " tuée donne un ", BATTLE_ROUND, " d'énergie démoniaque.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.killed.add(() => battle.applyStatus(unit, DEMONIC, 1)))
    }
}

export const DEMON_FANG = new DemonFang()

/** A rosary: each wait gives a round of concentration. */
export class Rosary extends AbstractItem {


    constructor(){
        super("Chapelet", visual("items/rosary"), ["Chaque Attendre donne un ", BATTLE_ROUND, " de concentration."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.stepEnded.add(() => {
            if(unit.stepsPlayed[unit.stepsPlayed.length - 1] === WAIT.action) battle.applyStatus(unit, CONCENTRATED, 1)
        }))
    }
}

export const ROSARY = new Rosary()
