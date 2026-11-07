import type { Vector2 } from "../../../base/Vector2"
import { UNIT } from "../../../base/keywords"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit, UnitStats } from "../../../battle/Unit"
import { DemonEnergy } from "../../../status/subs/DemonEnergy"
import { blowDamage, meters } from "../../../battle/words"
import { Rarity } from "../../Rarity"

import { BlowCard } from "./BlowCard"

/** How many hearts the suplex of the catalog takes, before twice the strength of the unit. */
const SUPLEX_DAMAGE = 4

/** How long and wide, in meters, the square the suplex grabs in is, glued to the back of the unit. */
const SUPLEX_SIDE = 1

/** The reach of the great thrust of the catalog, in meters, and how far from the unit it starts. */
const GREAT_THRUST_REACH = 3
const GREAT_THRUST_START = 1
const GREAT_THRUST_WIDTH = 0.5

/** How many meters make one more heart of the great thrust. */
const GREAT_THRUST_PER = 2

/** The circle the demonic strike hits: its radius and how far ahead of the unit it is centered, in meters. */
const DEMONIC_RADIUS = 1
const DEMONIC_AHEAD = 1

/** How many hearts the demonic strike takes, before the strength of the unit. */
const DEMONIC_DAMAGE = 2

/** How far around the unit the quake reaches, in meters. */
const QUAKE_RADIUS = 1.2

/** How many hearts the sacrifice of the catalog takes, before twice the strength, and what it costs its unit. */
const SACRIFICE_DAMAGE = 2
const SACRIFICE_COST = 1

/** The unit of some the nearest to a point, none for none. */
export function nearestOf(units: readonly Unit[], from: Vector2): Unit|null {
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

/** A blow on the single nearest unit of its area, and what it does to it. */
abstract class SingleBlow extends BlowCard {


    /** How many times the damage the nearest unit of the area takes. */
    protected abstract scaleOf(unit: Unit, target: Unit): number

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const target = nearestOf(battle.unitsIn(area, unit), unit.position)
        if(!target) return []
        const hit = battle.strike(unit, area, this.damage + this.bonus(unit.stats), "physical", other => {
            return other === target ? this.scaleOf(unit, target) : 0
        })
        this.after(battle, unit, hit)
        return hit
    }

    /** What it does to the units it hit, nothing by default. */
    protected after(_battle: Battle, _unit: Unit, _hit: Unit[]): void {}

    protected override marked(battle: Battle, unit: Unit, area: Area): Unit[] {
        const target = nearestOf(battle.unitsIn(area, unit), unit.position)
        return target ? [target] : []
    }
}

/** A throw over the shoulder at the unit just behind. */
export class SuplexCard extends SingleBlow {


    constructor(){
        super("Suplex", [
            "Projette l'", UNIT, " la plus proche derrière, dans un carré de ", meters(SUPLEX_SIDE), " : ",
            blowDamage(SUPLEX_DAMAGE), " + deux fois la force, et elle est étourdie.",
        ], Rarity.RARE, SUPLEX_DAMAGE)
    }

    public override bonus(stats: UnitStats): number {
        return 2 * stats.strength.value
    }

    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        const to = pose.position.minus(pose.direction.times(SUPLEX_SIDE * progress))
        return { kind: "segment", from: pose.position, to, width: SUPLEX_SIDE }
    }

    protected scaleOf(): number { return 1 }

    protected override after(battle: Battle, _unit: Unit, hit: Unit[]): void {
        for(const target of hit) battle.stun(target)
    }
}

export const SUPLEX = new SuplexCard()

/** A thrust whose first meter does not reach: it hurts more the farther the unit it hits is. */
export class GreatThrustCard extends SingleBlow {


    constructor(){
        super("Grande estoc", [
            "Perce sur ", meters(GREAT_THRUST_REACH), " devant, sauf le premier mètre : ", blowDamage(1), " à l'", UNIT,
            " la plus proche, et un de plus tous les ", meters(GREAT_THRUST_PER), " de distance.",
        ], Rarity.RARE, 1)
    }

    /** It takes no strength: the distance is what makes it hurt. */
    public override bonus(): number { return 0 }

    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        const from = pose.position.plus(pose.direction.times(GREAT_THRUST_START))
        const to = from.plus(pose.direction.times((GREAT_THRUST_REACH - GREAT_THRUST_START) * progress))
        return { kind: "segment", from, to, width: GREAT_THRUST_WIDTH }
    }

    protected scaleOf(unit: Unit, target: Unit): number {
        return 1 + Math.floor(target.position.distance(unit.position) / GREAT_THRUST_PER)
    }
}

export const GREAT_THRUST = new GreatThrustCard()

/** A blow in a circle ahead, feeding the unit with a demonic energy for each unit it hit. */
export class DemonicStrikeCard extends BlowCard {


    constructor(){
        super("Frappe démoniaque", [
            "Frappe en cercle de ", meters(DEMONIC_RADIUS), " à ", meters(DEMONIC_AHEAD), " devant : ",
            blowDamage(DEMONIC_DAMAGE), " à chaque ", UNIT, ". Chaque ", UNIT, " touchée donne un round d'énergie démoniaque.",
        ], Rarity.RARE, DEMONIC_DAMAGE)
    }

    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        const center = pose.position.plus(pose.direction.times(DEMONIC_AHEAD))
        return { kind: "circle", center, radius: DEMONIC_RADIUS * progress }
    }

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const hit = super.land(battle, unit, area)
        if(hit.length > 0) battle.applyStatus(unit, new DemonEnergy(hit.length))
        return hit
    }

    protected override marked(battle: Battle, unit: Unit, area: Area): Unit[] {
        return battle.unitsIn(area, unit)
    }
}

export const DEMONIC_STRIKE = new DemonicStrikeCard()

/** A blow all around. */
export class QuakeCard extends BlowCard {


    constructor(){
        super("Tremblement", [
            "Fait trembler le sol à ", meters(QUAKE_RADIUS), " autour : ", blowDamage(1), " à chaque ", UNIT, ".",
        ], Rarity.COMMON, 1)
    }

    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return { kind: "circle", center: pose.position, radius: QUAKE_RADIUS * progress }
    }

    protected override marked(battle: Battle, unit: Unit, area: Area): Unit[] {
        return battle.unitsIn(area, unit)
    }
}

export const QUAKE = new QuakeCard()

/** A thrust that costs a heart to its unit, and hurts twice as much. */
export class SacrificeCard extends BlowCard {


    constructor(){
        super("Coup du sacrifice", [
            "Perd ", String(SACRIFICE_COST), " cœur pour frapper sur 2 m devant : ", blowDamage(SACRIFICE_DAMAGE),
            " + deux fois la force à chaque ", UNIT, ".",
        ], Rarity.RARE, SACRIFICE_DAMAGE)
    }

    public override bonus(stats: UnitStats): number {
        return 2 * stats.strength.value
    }

    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return { kind: "segment", from: pose.position, to: pose.position.plus(pose.direction.times(2 * progress)), width: 0.5 }
    }

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        unit.hearts.damage(SACRIFICE_COST, "physical", null)
        if(!unit.alive) return []
        return super.land(battle, unit, area)
    }

    protected override marked(battle: Battle, unit: Unit, area: Area): Unit[] {
        return battle.unitsIn(area, unit)
    }
}

export const SACRIFICE = new SacrificeCard()
