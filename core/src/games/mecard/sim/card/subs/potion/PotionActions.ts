import { visual } from "../../../base/Visual"
import { concat, deferred } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { counted, frenchNumber, SummonedHearts } from "../../../battle/words"
import type { Action, Pose, UnitContext } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Battle } from "../../../battle/Battle"
import type { Area } from "../../../battle/Area"
import { placePuddle, PUDDLE_RADIUS, PUDDLE_ROUNDS } from "../../../hazard/subs/Puddle"
import { levelOf, POTION_LEVEL, pour } from "../../../potion/Potion"
import type { Dose } from "../../../potion/Potion"
import { coatOf } from "../../../status/subs/Coated"
import { barrelOf, SPLASH_RADIUS } from "../../../status/subs/Splashing"
import { ACTION, POTION } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { flight, hold, SHORT_TIME, SUMMON_AHEAD, summonAt, summonShows, summonSpot, wait } from "../tools/playing"
import { summonedHearts } from "../summon/SummonCard"
import { ALCHEMY, DISTANCE, INVOCATION, PORTEE, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How long a potion flies when thrown, in seconds. */
const THROW_TIME = 0.25

/** How long a splash of a potion shows, in seconds. */
const SPLASH_TIME = 0.3

/** How far ahead the thrown potion of the catalog lands, in meters, before the reach of the unit. */
const POTION_THROW = 2.5 - UNIT_RADIUS

/** How wide the splash of the thrown potion of the catalog is, in meters: its radius. */
const POTION_SPLASH = 1

/** How far the rain of potion of the catalog reaches around its unit, in meters, before its reach. */
const RAIN_RADIUS = 2.5 - UNIT_RADIUS

/** How far ahead the puddle of the catalog lies, in meters, before the reach of the unit. */
const PUDDLE_AHEAD = 1.5 - UNIT_RADIUS

/** How many hearts the barrel of the catalog lives by, before the summoning of the unit. */
const BARREL_HALVES = 1

/** How many times stronger than a bottle the big bottle and the barrel of the catalog pour. */
const STRONG = 2

/** How a potion shows over an area. */
function shown(dose: Dose, area: Area): Indicator {
    return Previews.polygon(area, { ...dose.potion.color, a: 0.35 })
}

/** What the level of a potion card reads as, for the player: `niveau 2 + alchimie`. */
function levelText(times = 1): Text {
    const factor = times > 1 ? [` ×${times}`] : []
    return deferred(() => concat("niveau ", POTION_LEVEL * times, " + ", ALCHEMY, ...factor))
}

/**
 * A card pouring the potion plugged into it, at the level the alchemy of its unit gives: on itself, ahead,
 * around. Each says where, and how strong.
 */
export abstract class PotionActionCard extends AbstractCard<Action, Dose> {


    public readonly output = ACTION
    public readonly input = POTION

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How many times the level of a bottle it pours at. */
        public readonly times: number,
    ){
        super(name, description, rarity)
    }


    public get(dose: Dose): Action {
        return {
            use: ctx => this.pouring(ctx, dose, levelOf(dose, ctx.unit, this.times)),
            preview: ({ battle, unit, pose }) => Previews.still(pose, ...this.shows(battle, unit, pose, dose)),
        }
    }


    /** Pour the dose, at a level. */
    protected abstract pouring(ctx: UnitContext, dose: Dose, level: number): void

    /** What its preview shows from a pose. */
    protected abstract shows(battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[]
}

/** A potion drunk: poured on its unit. */
export class BottleCard extends PotionActionCard {


    protected pouring({ battle, unit }: UnitContext, dose: Dose, level: number): void {
        pour(battle, dose, unit, level)
        hold(battle, SHORT_TIME, [shown(dose, Areas.circle(unit.position, UNIT_RADIUS))])
    }

    protected shows(_battle: Battle, _unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, Areas.circle(pose.position, UNIT_RADIUS))]
    }
}

/** A potion thrown ahead, poured on every unit where it splashes. */
export class ThrownPotionCard extends PotionActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far ahead it lands, in meters, before the reach of the unit. */
        public readonly distance: number,

        /** How far its splash reaches, in meters. */
        public readonly radius: number,
    ){
        super(name, description, rarity, 1)
    }


    protected pouring({ battle, unit }: UnitContext, dose: Dose, level: number): void {
        const landing = this.#landing(unit, unit)
        const area = Areas.circle(landing, this.radius)
        flight(battle, THROW_TIME, share => {
            const center = unit.position.plus(landing.minus(unit.position).times(share))
            return [shown(dose, Areas.circle(center, UNIT_RADIUS / 2))]
        })
        for(const target of battle.fetch(area)) pour(battle, dose, target, level)
        hold(battle, SPLASH_TIME, [shown(dose, area)])
    }

    protected shows(_battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, Areas.circle(this.#landing(unit, pose), this.radius))]
    }


    /** Where the flask lands, from a pose. */
    #landing(unit: Unit, pose: Pose): Vector2 {
        return unit.muzzle(pose).plus(pose.direction.times(this.distance * unit.stats.throwRange.value))
    }
}

/** A potion rained all around its unit, poured on every unit there, its own included. */
export class PotionRainCard extends PotionActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it reaches around, in meters, before the reach of the unit. */
        public readonly radius: number,
    ){
        super(name, description, rarity, 1)
    }


    protected pouring({ battle, unit }: UnitContext, dose: Dose, level: number): void {
        const area = this.#rain(unit, unit)
        for(const target of battle.fetch(area)) pour(battle, dose, target, level)
        hold(battle, SPLASH_TIME, [shown(dose, area)])
    }

    protected shows(_battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, this.#rain(unit, pose))]
    }


    #rain(unit: Unit, pose: Pose): Area {
        return unit.around(this.radius * unit.stats.throwRange.value, pose)
    }
}

/** A barrel of a potion set down ahead: broken, by anyone or worn away, it splashes the potion around. */
export class BarrelCard extends PotionActionCard {


    protected pouring({ battle, unit }: UnitContext, dose: Dose, level: number): void {
        summonAt(battle, unit, [summonSpot(unit, unit, SUMMON_AHEAD)], {
            sprite: visual("units/barrel"), name: "Tonneau", hearts: () => summonedHearts(unit, BARREL_HALVES), fleeting: true,
        }, barrel => battle.applyStatus(barrel, barrelOf(dose), Math.abs(level)))
        wait(battle, SHORT_TIME)
    }

    protected shows(battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return summonShows(battle, unit, [summonSpot(unit, pose, SUMMON_AHEAD)], 1, at => [
            shown(dose, Areas.circle(at, SPLASH_RADIUS)),
        ])
    }
}

/** A potion coating the blade: every attack of the round that lands pours it. */
export class CoatCard extends PotionActionCard {


    protected pouring({ battle, unit }: UnitContext, dose: Dose, level: number): void {
        battle.applyStatus(unit, coatOf(dose), Math.abs(level))
        hold(battle, SHORT_TIME, [shown(dose, Areas.circle(unit.position, UNIT_RADIUS))])
    }

    protected shows(_battle: Battle, _unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, Areas.circle(pose.position, UNIT_RADIUS))]
    }
}

/** A puddle of a potion ahead, lasting rounds: poured on whoever steps in, and at the end of each round. */
export class PuddleCard extends PotionActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How many rounds it lasts. */
        public readonly rounds: number,
    ){
        super(name, description, rarity, 1)
    }


    protected pouring({ battle, unit }: UnitContext, dose: Dose, level: number): void {
        const center = this.#center(unit, unit)
        if(!battle.arena.inside(center)) return
        placePuddle(battle, unit, center, dose, level, this.rounds)
        wait(battle, SHORT_TIME)
    }

    protected shows(battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        const center = this.#center(unit, pose)
        if(!battle.arena.inside(center)) return [Previews.label(center, "hors de l'arène", NOTE_COLOR)]
        return [shown(dose, Areas.circle(center, PUDDLE_RADIUS))]
    }


    #center(unit: Unit, pose: Pose): Vector2 {
        return unit.muzzle(pose).plus(pose.direction.times(PUDDLE_AHEAD * unit.stats.throwRange.value))
    }
}

export const BOTTLE = new BottleCard("Bouteille", ["Bois la potion : ", levelText(), "."], Rarity.COMMON, 1)

export const BIG_BOTTLE = new BottleCard("Grande bouteille", [
    "Bois la potion, deux fois plus forte : ", levelText(STRONG), ".",
], Rarity.RARE, STRONG)

export const THROWN_POTION = new ThrownPotionCard("Potion jetable", [
    "Lance la potion à ", frenchNumber(POTION_THROW), "×", PORTEE, " ", DISTANCE, " devant : elle éclabousse chaque ",
    UNIT, " à ", POTION_SPLASH, " ", DISTANCE, " autour, ", levelText(), ".",
], Rarity.COMMON, POTION_THROW, POTION_SPLASH)

export const POTION_RAIN = new PotionRainCard("Pluie de potion", [
    "Fait pleuvoir la potion sur chaque ", UNIT, " à ", frenchNumber(RAIN_RADIUS), "×", PORTEE, " ", DISTANCE, " autour, toi compris, ",
    levelText(), ".",
], Rarity.RARE, RAIN_RADIUS)

export const BARREL = new BarrelCard("Tonneau", [
    INVOCATION.as("Invoque"), " à ", SUMMON_AHEAD, " ", DISTANCE, " devant un tonneau de ", new SummonedHearts(BARREL_HALVES),
    ", plein de la potion. Quand il casse, il l'éclabousse à ", frenchNumber(SPLASH_RADIUS), " ",
    DISTANCE, " autour, ", levelText(STRONG), ".",
], Rarity.RARE, STRONG)

export const COATED_BLADE = new CoatCard("Lame enduite", [
    "Jusqu'à la fin du ", BATTLE_ROUND, ", chacune de tes attaques qui touche applique la potion, ", levelText(), ".",
], Rarity.RARE, 1)

export const PUDDLE = new PuddleCard("Flaque", [
    "Répand la potion à ", frenchNumber(PUDDLE_AHEAD), "×", PORTEE, " ", DISTANCE, " devant, pour ", counted(PUDDLE_ROUNDS, "round"),
    " : elle s'applique à qui y entre, puis en fin de ", BATTLE_ROUND, " à qui s'y tient, ", levelText(), ".",
], Rarity.RARE, PUDDLE_ROUNDS)
