import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { counted, HeartCount, meters } from "../../../battle/words"
import type { Action, ActionRun, Indicator, Pose, UnitContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Area } from "../../../battle/Area"
import { placePuddle, PUDDLE_RADIUS, PUDDLE_ROUNDS } from "../../../hazard/subs/Puddle"
import { levelOf, POTION_LEVEL, pour } from "../../../potion/Potion"
import type { Dose } from "../../../potion/Potion"
import { Coated } from "../../../status/subs/Coated"
import { SPLASH_RADIUS, Splashing } from "../../../status/subs/Splashing"
import { ACTION, POTION } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { flight, hold, SHORT_TIME, wait } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { summonedHearts, summonShown } from "../summon/SummonCard"
import { UNIT } from "../../../base/keywords"

/** How long a potion flies when thrown, in seconds. */
const THROW_TIME = 0.25

/** How long a splash of a potion shows, in seconds. */
const SPLASH_TIME = 0.3

/** How far ahead the thrown potion of the catalog lands, in meters, before the reach of the unit. */
const POTION_THROW = 2.5

/** How wide the splash of the thrown potion of the catalog is, in meters: its radius. */
const POTION_SPLASH = 1

/** How far the rain of potion of the catalog reaches around its unit, in meters, before its reach. */
const RAIN_RADIUS = 2.5

/** How far ahead the puddle of the catalog lies, in meters, before the reach of the unit. */
const PUDDLE_AHEAD = 1.5

/** How far ahead the barrel of the catalog stands, in meters. */
const BARREL_AHEAD = 1

/** How many hearts the barrel of the catalog lives by, before the summoning of the unit. */
const BARREL_HALVES = 1

/** How many times stronger than a bottle the big bottle and the barrel of the catalog pour. */
const STRONG = 2

/** How a potion shows over an area. */
function shown(dose: Dose, area: Area): Indicator {
    return polygon(area, { ...dose.potion.color, a: 0.35 })
}

/** What the level of a potion card reads as, for the player: `niveau 2 + alchimie`. */
function levelText(times = 1): Text {
    return `niveau ${POTION_LEVEL * times}${times > 1 ? ` + alchimie ×${times}` : " + alchimie"}`
}

/**
 * A card pouring the potion plugged into it, at the level the alchemy of its unit gives: on itself, ahead,
 * around. Each says where, and how strong.
 */
export abstract class PotionActionCard extends AbstractCard<readonly Action[], Dose> {


    public readonly output = ACTION
    public readonly input = POTION

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How many times the level of a bottle it pours at. */
        public readonly times: number,
    ){
        super(name, description, rarity)
    }


    public get(dose: Dose): readonly Action[] {
        return [{
            use: ctx => this.pouring(ctx, dose, levelOf(dose, ctx.unit, this.times)),
            preview: ({ battle, unit, pose }) => still(pose, ...this.shows(battle, unit, pose, dose)),
        }]
    }


    /** Pour the dose, at a level. */
    protected abstract pouring(ctx: UnitContext, dose: Dose, level: number): ActionRun

    /** What its preview shows from a pose. */
    protected abstract shows(battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[]
}

/** A potion drunk: poured on its unit. */
export class BottleCard extends PotionActionCard {


    protected *pouring({ battle, unit }: UnitContext, dose: Dose, level: number): ActionRun {
        pour(battle, dose, unit, level)
        yield* hold(battle, SHORT_TIME, [shown(dose, { kind: "circle", center: unit.position, radius: UNIT_RADIUS })])
    }

    protected shows(_battle: Battle, _unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, { kind: "circle", center: pose.position, radius: UNIT_RADIUS })]
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


    protected *pouring({ battle, unit }: UnitContext, dose: Dose, level: number): ActionRun {
        const area = this.#splash(unit, unit)
        if(area.kind !== "circle") return
        yield* flight(battle, THROW_TIME, share => {
            const center = unit.position.plus(area.center.minus(unit.position).times(share))
            return [shown(dose, { kind: "circle", center, radius: UNIT_RADIUS / 2 })]
        })
        for(const target of battle.unitsIn(area)) pour(battle, dose, target, level)
        yield* hold(battle, SPLASH_TIME, [shown(dose, area)])
    }

    protected shows(_battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, this.#splash(unit, pose))]
    }


    #splash(unit: Unit, pose: Pose): Area {
        const center = pose.position.plus(pose.direction.times(this.distance * unit.stats.throwRange.value))
        return { kind: "circle", center, radius: this.radius }
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


    protected *pouring({ battle, unit }: UnitContext, dose: Dose, level: number): ActionRun {
        const area = this.#rain(unit, unit)
        for(const target of battle.unitsIn(area)) pour(battle, dose, target, level)
        yield* hold(battle, SPLASH_TIME, [shown(dose, area)])
    }

    protected shows(_battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, this.#rain(unit, pose))]
    }


    #rain(unit: Unit, pose: Pose): Area {
        return { kind: "circle", center: pose.position, radius: this.radius * unit.stats.throwRange.value }
    }
}

/** A barrel of a potion set down ahead: broken, by anyone or worn away, it splashes the potion around. */
export class BarrelCard extends PotionActionCard {


    protected *pouring({ battle, unit }: UnitContext, dose: Dose, level: number): ActionRun {
        const at = this.#spot(unit)
        const barrel = battle.summon(unit, "barrel", "Tonneau", at, summonedHearts(unit, BARREL_HALVES))
        if(barrel) battle.applyStatus(barrel, new Splashing(dose, level))
        yield* wait(SHORT_TIME)
    }

    protected shows(_battle: Battle, _unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        const at = this.#spot(pose)
        return [summonShown("barrel", at), shown(dose, { kind: "circle", center: at, radius: SPLASH_RADIUS })]
    }


    #spot(pose: Pose): Vector2 {
        return pose.position.plus(pose.direction.times(BARREL_AHEAD))
    }
}

/** A potion coating the blade: every attack of the round that lands pours it. */
export class CoatCard extends PotionActionCard {


    protected *pouring({ battle, unit }: UnitContext, dose: Dose, level: number): ActionRun {
        battle.applyStatus(unit, new Coated(dose, level))
        yield* hold(battle, SHORT_TIME, [shown(dose, { kind: "circle", center: unit.position, radius: UNIT_RADIUS })])
    }

    protected shows(_battle: Battle, _unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        return [shown(dose, { kind: "circle", center: pose.position, radius: UNIT_RADIUS })]
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


    protected *pouring({ battle, unit }: UnitContext, dose: Dose, level: number): ActionRun {
        const center = this.#center(unit, unit)
        if(!battle.arena.inside(center)) return
        placePuddle(battle, unit, center, dose, level, this.rounds)
        yield* wait(SHORT_TIME)
    }

    protected shows(battle: Battle, unit: Unit, pose: Pose, dose: Dose): Indicator[] {
        const center = this.#center(unit, pose)
        if(!battle.arena.inside(center)) return [label(center, "hors de l'arène", NOTE_COLOR)]
        return [shown(dose, { kind: "circle", center, radius: PUDDLE_RADIUS })]
    }


    #center(unit: Unit, pose: Pose): Vector2 {
        return pose.position.plus(pose.direction.times(PUDDLE_AHEAD * unit.stats.throwRange.value))
    }
}

export const BOTTLE = new BottleCard("Bouteille", ["Bois la potion : ", levelText(), "."], Rarity.COMMON, 1)

export const BIG_BOTTLE = new BottleCard("Grande bouteille", [
    "Bois la potion, deux fois plus forte : ", levelText(STRONG), ".",
], Rarity.RARE, STRONG)

export const THROWN_POTION = new ThrownPotionCard("Potion jetable", [
    "Lance la potion ", meters(POTION_THROW), " × portée devant : elle éclabousse chaque ", UNIT, " à ",
    meters(POTION_SPLASH), " autour, ", levelText(), ".",
], Rarity.COMMON, POTION_THROW, POTION_SPLASH)

export const POTION_RAIN = new PotionRainCard("Pluie de potion", [
    "Fait pleuvoir la potion sur chaque ", UNIT, " à ", meters(RAIN_RADIUS), " × portée autour, toi compris, ",
    levelText(), ".",
], Rarity.RARE, RAIN_RADIUS)

export const BARREL = new BarrelCard("Tonneau", [
    "Pose à ", meters(BARREL_AHEAD), " devant un tonneau de ", new HeartCount(BARREL_HALVES), " + invocation, plein de ",
    "la potion. Quand il casse, il l'éclabousse à ", meters(SPLASH_RADIUS), " autour, ", levelText(STRONG), ".",
], Rarity.RARE, STRONG)

export const COATED_BLADE = new CoatCard("Lame enduite", [
    "Jusqu'à la fin du round, chacune de tes attaques qui touche applique la potion, ", levelText(), ".",
], Rarity.RARE, 1)

export const PUDDLE = new PuddleCard("Flaque", [
    "Répand la potion à ", meters(PUDDLE_AHEAD), " × portée devant, pour ", counted(PUDDLE_ROUNDS, "round"),
    " : elle s'applique à qui y entre, puis en fin de round à qui s'y tient, ", levelText(), ".",
], Rarity.RARE, PUDDLE_ROUNDS)
