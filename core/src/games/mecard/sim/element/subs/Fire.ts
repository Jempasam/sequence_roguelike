import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { meters } from "../../battle/words"
import { placeBurningGround } from "../../hazard/subs/BurningGround"
import { Strength } from "../../process/subs/Strength"
import { BURN, Burn } from "../../status/subs/Burn"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"

/** How many rounds the fire burns a unit for. */
const FIRE_BURN = 2

/** How much strength the fire gives for the round. */
const FIRE_STRENGTH = 1

/** How many rounds the flames it calls last. */
const FLAMES_ROUNDS = 3

/** How far the flames it calls spread, in meters: their radius. */
const FLAMES_RADIUS = 1

/** Fire: it burns, and its flames burn whoever acts in them. */
export class Fire extends AbstractElement {


    constructor(){
        super(
            "Feu", rgba(1, 0.55, 0.15), "brûlé",
            new Burn(FIRE_BURN),
            ["retire la brûlure, et +", String(FIRE_STRENGTH), " force ce round"],
            ["des flammes de ", meters(FLAMES_RADIUS), " pendant ", String(FLAMES_ROUNDS), " rounds : qui y joue une étape subit le négatif"],
        )
    }


    public applyNegative({ battle }: UnitContext, target: Unit): void {
        battle.applyStatus(target, new Burn(FIRE_BURN))
    }

    public applyPositive({ battle }: UnitContext, target: Unit): void {
        battle.removeStatus(target, BURN)
        battle.startProcess(target, new Strength(FIRE_STRENGTH))
    }

    public invoke({ battle, unit }: UnitContext, at: Vector2, _direction: Vector2, effect: Element): void {
        placeBurningGround(battle, unit, { kind: "circle", center: at, radius: FLAMES_RADIUS }, FLAMES_ROUNDS, effect)
    }
}

export const FIRE_ELEMENT = new Fire()
