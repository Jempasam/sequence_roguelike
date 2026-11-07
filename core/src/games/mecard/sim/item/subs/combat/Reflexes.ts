import { UNIT } from "../../../base/keywords"
import type { PlugContext } from "../../../battle/Action"
import { distanceToSegment } from "../../../battle/Area"
import type { Unit } from "../../../battle/Unit"
import { meters } from "../../../battle/words"
import { DEMONIC } from "../../../status/subs/DemonEnergy"
import { BLEEDING } from "../../../status/subs/Wounds"
import { CONCENTRATED } from "../../../status/subs/Calm"
import { turnUnitsIn } from "../../../card/subs/tools/turning"
import { shoveNow } from "../../../card/subs/tools/shoving"
import { WAIT } from "../../../card/subs/movement/Wait"

import { AbstractItem } from "../AbstractItem"

/** How far from the unit an attacker must stand behind it, in angle, to be seen by the eyes in the back: the cosine of 130°. */
const BEHIND_COS = Math.cos(130 * Math.PI / 180)

/** How close to the body of its unit a unit must pass to be stunned by the cape, in meters. */
const CAPE_REACH = 0.2

/** How long the cape lets a unit that passed be passed again before stunning it, in ticks: one move is many strides. */
const CAPE_PAUSE = 30

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
        super("Yeux dans le dos", "mecard/items/scope.png", [
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
        super("Cape de torero", "mecard/items/doll.png", [
            "Étourdit chaque ", UNIT, " qui traverse son corps, ou passe à moins de ", meters(CAPE_REACH),
            ", en se déplaçant d'elle-même : dash, charge, blink.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const lastStun = new Map<Unit, number>()
        hold(battle.unitMoved.add(({ unit: mover, from, to }) => {
            // What others make it do is not a pass: only its own moves.
            if(mover === unit || mover.shoving) return
            if(distanceToSegment(unit.position, from, to) > unit.radius + CAPE_REACH) return
            const last = lastStun.get(mover)
            if(last !== undefined && battle.clock - last < CAPE_PAUSE) return
            lastStun.set(mover, battle.clock)
            battle.stun(mover)
        }))
    }
}

export const TORERO_CAPE = new ToreroCape()

/** A frightening mask: at the start of each round, the units around turn their backs. */
export class ScaryMask extends AbstractItem {


    constructor(){
        super("Masque effrayant", "mecard/items/bag.png", [
            "Au début de chaque round, les ", UNIT.as("unités"), " à ", meters(MASK_RADIUS),
            " autour lui tournent le dos.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(() => {
            turnUnitsIn(
                battle, { kind: "circle", center: unit.position, radius: MASK_RADIUS }, unit,
                other => other.position.minus(unit.position).normalized,
            )
        }))
    }
}

export const SCARY_MASK = new ScaryMask()

/** Sticky soles: what others make it do goes half as far. */
export class StickySoles extends AbstractItem {


    constructor(){
        super("Semelles collantes", "mecard/items/boots.png", [
            "Les déplacements que d'autres lui imposent sont divisés par ", String(SOLES_DIVISOR), ".",
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
        super("Aimant", "mecard/items/alembic.png", [
            "Au début de chaque round, tire de ", meters(MAGNET_PULL), " vers lui chaque ", UNIT, " à ",
            meters(MAGNET_RADIUS), ". Aucun dégât.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(() => {
            for(const other of battle.unitsIn({ kind: "circle", center: unit.position, radius: MAGNET_RADIUS }, unit)){
                const toward = unit.position.minus(other.position).normalized
                if(toward) shoveNow(battle, unit, other, toward, MAGNET_PULL)
            }
        }))
    }
}

export const MAGNET = new Magnet()

/** A chipped blade: the first unit a blow at hand touches bleeds. */
export class ChippedBlade extends AbstractItem {


    constructor(){
        super("Lame ébréchée", "mecard/items/whetstone.png", [
            "La première ", UNIT, " touchée par un coup au corps à corps gagne un round de saignement.",
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
        super("Croc démoniaque", "mecard/items/fang.png", [
            "Chaque ", UNIT, " tuée donne un round d'énergie démoniaque.",
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
        super("Chapelet", "mecard/items/grimoire.png", ["Chaque Attendre donne un round de concentration."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.stepEnded.add(() => {
            if(unit.stepsPlayed[unit.stepsPlayed.length - 1] === WAIT.action) battle.applyStatus(unit, CONCENTRATED, 1)
        }))
    }
}

export const ROSARY = new Rosary()
