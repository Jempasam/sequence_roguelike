import type { ImagePath } from "../../../../../../engine/assets/Assets"
import type { Text } from "../../../../../../semantic"
import { Add, ModifierKey } from "../../../base/Attribute"
import type { UnitContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { damage } from "../../../battle/words"
import { Concentration } from "../../../status/subs/Calm"
import { HeldFury } from "../../../status/subs/Calm"
import { DemonEnergy } from "../../../status/subs/DemonEnergy"
import type { Status } from "../../../status/Status"

import { AbstractUsable } from "../AbstractUsable"
import type { UsableOptions } from "../AbstractUsable"
import { RoundElixir } from "./RoundElixir"

/** An elixir giving its unit a status, for a number of rounds. */
export class StatusElixir extends AbstractUsable {


    constructor(
        name: string, icon: ImagePath, description: Text, options: UsableOptions,

        /** The status it gives. */
        public readonly make: () => Status,
    ){
        super(name, icon, description, options)
    }


    protected act({ battle, unit }: UnitContext): void {
        const given = this.make()
        battle.applyStatus(unit, given.type, given.level)
    }
}

export const DEMON_ELIXIR = new StatusElixir(
    "Élixir démoniaque", "mecard/usables/strength_elixir.png", ["Donne 3 rounds d'énergie démoniaque."], {},
    () => new DemonEnergy(3),
)

export const CALM_INFUSION = new StatusElixir(
    "Infusion de calme", "mecard/usables/haste_elixir.png", ["Donne 3 rounds de concentration."], {},
    () => new Concentration(3),
)

export const FURY_ELIXIR = new StatusElixir(
    "Élixir de fureur", "mecard/usables/strength_elixir.png", ["Donne 2 rounds de fureur contenue."], {},
    () => new HeldFury(2),
)

/** A syrup taking the negative statuses off its unit. */
export class CoolSyrup extends AbstractUsable {


    constructor(){
        super(
            "Sirop de sang froid", "mecard/usables/healing_potion.png",
            ["Retire tous les status négatifs. Rechargé à chaque combat."], { refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        for(const type of [...unit.statuses.keys()]){
            if(type.polarity === "negative") battle.removeStatus(unit, type)
        }
    }
}

export const COOL_SYRUP = new CoolSyrup()

/** How many hearts the whetstone of the catalog adds to each attack, for its round. */
const WHETSTONE_BONUS = 1

/** A whetstone sharpening the blows of its unit for the round, with charges that come back each battle. */
export class SharpeningStone extends RoundElixir {


    constructor(){
        super(
            "Pierre à aiguiser", "mecard/usables/strength_elixir.png",
            ["+", damage(WHETSTONE_BONUS, "physical"), " à tes coups ce round. 3 utilisations, rechargées à chaque combat."],
            { charges: 3, refill: "battle" },
        )
    }


    public boost(unit: Unit): () => void {
        const key = new ModifierKey("pierre à aiguiser")
        unit.stats.strength.add(key, new Add(WHETSTONE_BONUS))
        return () => unit.stats.strength.remove(key)
    }
}

export const SHARPENING_STONE = new SharpeningStone()
