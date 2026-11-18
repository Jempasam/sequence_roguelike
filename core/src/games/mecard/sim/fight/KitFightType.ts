import type { Text } from "../../../../semantic"
import type { Visual } from "../base/Visual"
import { BEST_AI } from "../ai/catalog"
import type { Kit } from "../catalog/kits"
import type { Spot } from "../run/Journey"
import type { Run } from "../run/Run"

import type { Fight, FightStage } from "./Fight"
import type { FightCategory } from "./FightCategory"
import type { FightType, Laying } from "./FightType"
import { StandardFight } from "./StandardFight"

/** What a fight against kits is made of. */
export interface KitFightSpec {
    /** What names it in a save or a command, never shown. Two fights never share one. */
    readonly id: string

    readonly name: string
    readonly description: Text
    readonly icon: Visual
    readonly category: FightCategory

    /** The hazards laid out in the arena: none by default. */
    readonly hazards?: readonly Laying[]

    /** The kits the party fights, each one fighter, in the order they stand. */
    readonly kits: readonly Kit[]
}

/**
 * A fight of the party against kits rather than monsters: adventurers who fight with a character's cards,
 * items and usables, each played by the {@link BEST_AI}. It is fought as any {@link StandardFight}.
 */
export class KitFightType implements FightType {

    public readonly id: string
    public readonly name: string
    public readonly description: Text
    public readonly icon: Visual
    public readonly category: FightCategory
    public readonly hazards?: readonly Laying[]

    /** The kits the party fights. */
    public readonly kits: readonly Kit[]

    constructor(spec: KitFightSpec) {
        this.id = spec.id
        this.name = spec.name
        this.description = spec.description
        this.icon = spec.icon
        this.category = spec.category
        this.hazards = spec.hazards
        this.kits = spec.kits
    }

    public populate(stage: FightStage): void {
        for(const kit of this.kits) stage.addKit(kit, { controller: BEST_AI(stage.rng) })
    }

    public create(run: Run, place: Spot): Fight {
        return new StandardFight(this, run, place)
    }
}
