import { Multiply, ModifierKey } from "../../../base/Attribute"
import { DISTANCE, INVOCATION, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { CONTROL_COLOR, MOVE_WIDTH, RANGE_COLOR } from "../../../battle/previewColors"
import { ROOTED } from "../../../status/subs/Rooted"
import { FRAGILE } from "../../../status/subs/Wounds"

import { AbstractItem } from "../AbstractItem"

/** How much of the moves others make it take an anchor keeps, and how much of its own. */
const ANCHOR_SHOVE = 0.5
const ANCHOR_MOVE = 0.75

/** How far a lightning rod strikes back, in meters. */
const ROD_RANGE = 3

/** How far a detonator blows, in meters. */
const DETONATOR_RADIUS = 1

/** The levels of fragility a chalk gives. */
const CHALK_LEVEL = 3

/** A chewing gum: each unit that hits its unit is rooted for a step. */
export class ChewingGum extends AbstractItem {


    constructor(){
        super("Chewing-gum", visual("items/chewing_gum"), ["Chaque ", UNIT, " qui te touche est ", ROOTED, " ", 1, "."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.struck.add(({ attacker }) => {
            if(attacker !== unit) battle.applyStatus(attacker, ROOTED, 1)
        }))
    }
}

export const CHEWING_GUM = new ChewingGum()

/** An anchor: what others make its unit do goes half as far, and what it does itself a quarter less. */
export class Anchor extends AbstractItem {


    constructor(){
        super("Ancre", visual("items/anchor"), [
            `Les déplacements que d'autres lui imposent sont réduits de ${(1 - ANCHOR_SHOVE) * 100} %. `,
            `Tes déplacements de ${(1 - ANCHOR_MOVE) * 100} %.`,
        ])
    }


    public init({ unit, hold }: PlugContext): void {
        const key = new ModifierKey(this.name)
        hold(unit.incomingShove.add(incoming => {
            incoming.distance *= ANCHOR_SHOVE
        }))
        unit.stats.move.add(key, new Multiply(ANCHOR_MOVE))
        hold(() => unit.stats.move.remove(key))
    }
}

export const ANCHOR = new Anchor()

/** A lightning rod: the first wound of each round hurts the nearest enemy within reach. */
export class LightningRod extends AbstractItem {


    constructor(){
        super("Paratonnerre", visual("items/lightning_rod"), [
            "Quand tu subis des dégâts : ", 1, " dégât à l'", UNIT, " ennemie la plus proche, à ", ROD_RANGE, " ", DISTANCE,
            " au plus. Une fois par ", BATTLE_ROUND, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let struck = false
        hold(unit.hearts.onDamage.add(() => {
            if(struck) return
            const target = battle.nearestEnemy(unit, ROD_RANGE)
            if(!target) return
            struck = true
            target.hearts.damage(1, DamageType.PHYSICAL, unit)
        }))
        hold(battle.roundEnded.add(() => {
            struck = false
        }))
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const zone = Previews.polygon(Areas.circle(pose.position, ROD_RANGE), RANGE_COLOR)
        const target = battle.nearestEnemy(unit, ROD_RANGE, pose.position)
        return Previews.still(pose, zone, ...target ? Previews.strike([], [target]) : [])
    }
}

export const LIGHTNING_ROD = new LightningRod()

/** A detonator: each body its unit summoned that dies blows up around itself. */
export class Detonator extends AbstractItem {


    constructor(){
        super("Détonateur", visual("items/detonator"), [
            "Quand une de tes ", INVOCATION.as("invocations"), " meurt : ", 1, " ", DamageType.PHYSICAL,
            " à chaque ", UNIT, " à ", DETONATOR_RADIUS, " ", DISTANCE, " autour.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(dead.owner !== unit) return
            battle.strike(unit, Areas.circle(dead.position, DETONATOR_RADIUS), 1, DamageType.PHYSICAL)
        }))
    }
}

export const DETONATOR = new Detonator()

/** A weather vane: each round starts with its unit turned toward the nearest enemy. */
export class WeatherVane extends AbstractItem {


    constructor(){
        super("Girouette", visual("items/weather_vane"), [
            "Début de ", BATTLE_ROUND, " : te tourne vers l'", UNIT, " ennemie la plus proche.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(() => {
            const target = battle.nearestEnemy(unit)
            const toward = target?.position.minus(unit.position).normalized
            if(toward) battle.turn(unit, toward)
        }))
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const target = battle.nearestEnemy(unit, Infinity, pose.position)
        if(!target) return Previews.still(pose)
        return Previews.still(pose, Previews.arrow([pose.position, target.position], MOVE_WIDTH, CONTROL_COLOR))
    }
}

export const WEATHER_VANE = new WeatherVane()

/** A chalk: the enemy nearest at the start of the battle is marked as a target, and made fragile. */
export class Chalk extends AbstractItem {


    constructor(){
        super("Craie", visual("items/chalk"), [
            "Début du combat : l'", UNIT, " ennemie la plus proche gagne ", CHALK_LEVEL, " niveaux de ", FRAGILE, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(round => {
            if(round !== 1) return
            const target = battle.nearestEnemy(unit)
            if(target) battle.applyStatus(target, FRAGILE, CHALK_LEVEL)
        }))
    }
}

export const CHALK = new Chalk()
