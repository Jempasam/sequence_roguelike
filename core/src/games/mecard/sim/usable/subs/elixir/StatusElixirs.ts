import type { Visual } from "../../../base/Visual"
import type { Text } from "../../../../../../semantic"
import { Add, ModifierKey } from "../../../base/Attribute"
import type { UnitContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { FORCE, BATTLE_ROUND } from "../../../base/keywords"
import { Concentration } from "../../../status/subs/Calm"
import { HeldFury } from "../../../status/subs/Calm"
import { DemonEnergy } from "../../../status/subs/DemonEnergy"
import { MOMENTUM, Momentum } from "../../../status/subs/Momentum"
import type { Status } from "../../../status/Status"

import { AbstractUsable } from "../AbstractUsable"
import type { UsableOptions } from "../AbstractUsable"
import { RoundElixir } from "./RoundElixir"
import { visual } from "../../../base/Visual"

/** An elixir giving its unit a status, for a number of rounds. */
export class StatusElixir extends AbstractUsable {


    constructor(
        name: string, icon: Visual, description: Text, options: UsableOptions,

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
    "Élixir démoniaque", visual("usables/strength_elixir", { coloration: [0.6, 0.1, 0.7] }), ["Donne 2 ", BATTLE_ROUND.as("rounds"), " d'énergie démoniaque."], { charges: 4 },
    () => new DemonEnergy(2),
)

export const CALM_INFUSION = new StatusElixir(
    "Infusion de calme", visual("usables/haste_elixir", { coloration: [0.4, 0.8, 0.9] }), ["Donne 2 ", BATTLE_ROUND.as("rounds"), " de concentration."], { charges: 4 },
    () => new Concentration(2),
)

/** Boots with a spring in them: a push forward, twice, each combat. */
export const REACTION_BOOTS = new StatusElixir(
    "Bottes à réaction", visual("usables/spring"), ["Donne +2 ", MOMENTUM, ". 2 utilisations par combat."],
    { charges: 2, refill: "battle" },
    () => new Momentum(2),
)

export const FURY_ELIXIR = new StatusElixir(
    "Élixir de fureur", visual("usables/strength_elixir", { coloration: [0.95, 0.45, 0.1] }), ["Donne 1 ", BATTLE_ROUND, " de fureur contenue."], { charges: 4 },
    () => new HeldFury(1),
)

/** A syrup taking the negative statuses off its unit. */
export class CoolSyrup extends AbstractUsable {


    constructor(){
        super(
            "Sirop de sang froid", visual("usables/healing_potion"),
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
            "Pierre à aiguiser", visual("usables/strength_elixir", { coloration: [0.6, 0.6, 0.65] }),
            ["+", WHETSTONE_BONUS, " ", FORCE, " ce ", BATTLE_ROUND, ". 3 utilisations, rechargées à chaque combat."],
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
