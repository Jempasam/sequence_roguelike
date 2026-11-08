import type { Text } from "../../../../../semantic"
import { colored } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { touches } from "../../battle/Area"
import type { Area } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { STATUS_LEVEL, familyType, statusVisual } from "../../status/Status"
import { doseVariants } from "../../status/StatusVariants"
import type { DoseType } from "../../status/StatusVariants"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"
import { visual } from "../../base/Visual"

/** How many rounds the puddles of the catalog last. */
export const PUDDLE_ROUNDS = 3

/** How wide the puddles of the catalog are, in meters: their radius. */
export const PUDDLE_RADIUS = 1

/** A puddle of a potion. */
export const PUDDLE_HAZARD = familyType("flaque", statusVisual("puddle", HAZARD_TEXT.r, HAZARD_TEXT.g, HAZARD_TEXT.b), "neutral", { cloned: false, description: ["Verse sa potion sur chaque unité qui y entre, puis à la fin de chaque round sur chaque unité qui s'y trouve, au niveau ", STATUS_LEVEL, "."] })

/** The kinds of puddle, one for each dose. */
export const PUDDLES = doseVariants(
    PUDDLE_HAZARD, dose => `${PUDDLE_HAZARD} de ${dose.potion}`, (type, level) => new Puddle(type, level),
)

/**
 * A puddle of a potion: it pours its potion on each unit stepping into it, then at the end of each round on
 * every unit standing in it, at its level. Its body counts its rounds with its time hearts.
 */
export class Puddle extends HazardStatus {


    constructor(
        public readonly type: DoseType,
        level: number,
    ){
        super(level)
    }


    /** The potion it pours. */
    public get dose(): Dose { return this.type.dose }

    /** The level it pours the potion at: its level, turned around for an antidote. */
    public get poured(): number { return this.dose.sign * this.level }

    public override toSemString(): Text { return colored(this.dose.potion.color, this.toString()) }


    protected plug({ battle, unit }: UnitContext): void {
        unit.color = this.dose.potion.color
        const zone = (): Area => unit.zone ?? { kind: "circle", center: unit.position, radius: PUDDLE_RADIUS }
        this.hold(battle.unitMoved.add(({ unit: mover, from, to }) => {
            if(!unit.alive || mover === unit || !mover.tangible) return
            if(touches(zone(), to, mover.radius) && !touches(zone(), from, mover.radius)){
                pour(battle, this.dose, mover, this.poured)
            }
        }))
        this.hold(battle.roundEnding.add(() => {
            if(!unit.alive) return
            for(const target of battle.unitsIn(zone())) pour(battle, this.dose, target, this.poured)
        }))
    }
}

/** Leave a puddle of a potion, lasting rounds: poured on whoever steps in, and at the end of each round. */
export function placePuddle(
    battle: Battle, owner: Unit, center: Vector2, dose: Dose, level: number, rounds: number,
): Unit|null {
    return placeHazard(battle, owner, {
        sprite: visual("units/puddle"), name: `Flaque de ${dose.potion}`,
        zone: { kind: "circle", center, radius: PUDDLE_RADIUS },
        hearts: Heart.many(TIME_HEART, rounds),
        status: { type: PUDDLES.of(dose), level: Math.abs(level) },
    })
}
