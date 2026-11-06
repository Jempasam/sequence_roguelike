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
import { StatusType } from "../../status/Status"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"

/** How many rounds the puddles of the catalog last. */
export const PUDDLE_ROUNDS = 3

/** How wide the puddles of the catalog are, in meters: their radius. */
export const PUDDLE_RADIUS = 1

/** A puddle of a potion. */
export const PUDDLE_HAZARD = new StatusType("flaque", HAZARD_TEXT, "neutral")

/**
 * A puddle of a potion: it pours its potion on each unit stepping into it, then at the end of each round on
 * every unit standing in it. Its body counts its rounds with its time hearts.
 */
export class Puddle extends HazardStatus {


    public readonly type = PUDDLE_HAZARD

    constructor(
        public readonly dose: Dose,

        /** The level it pours its potion at. */
        public readonly level: number,
    ){
        super()
    }


    public toString(): string { return `flaque de ${this.dose.potion}` }

    public toSemString(): Text { return colored(this.dose.potion.color, this.toString()) }


    protected plug({ battle, unit }: UnitContext): void {
        unit.color = { ...this.dose.potion.color, a: 0.35 }
        const zone = (): Area => unit.zone ?? { kind: "circle", center: unit.position, radius: PUDDLE_RADIUS }
        this.hold(battle.unitMoved.add(({ unit: mover, from, to }) => {
            if(!unit.alive || mover === unit || !mover.tangible) return
            if(touches(zone(), to, mover.radius) && !touches(zone(), from, mover.radius)){
                pour(battle, this.dose, mover, this.level)
            }
        }))
        this.hold(battle.roundEnding.add(() => {
            if(!unit.alive) return
            for(const target of battle.unitsIn(zone())) pour(battle, this.dose, target, this.level)
        }))
    }
}

/** Leave a puddle of a potion, lasting rounds: poured on whoever steps in, and at the end of each round. */
export function placePuddle(
    battle: Battle, owner: Unit, center: Vector2, dose: Dose, level: number, rounds: number,
): Unit|null {
    return placeHazard(battle, owner, {
        sprite: "puddle", name: `Flaque de ${dose.potion}`,
        zone: { kind: "circle", center, radius: PUDDLE_RADIUS },
        hearts: Heart.many(TIME_HEART, rounds),
        status: new Puddle(dose, level),
    })
}
