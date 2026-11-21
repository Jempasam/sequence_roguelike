import type { FloorType } from "../../../floor/Floor"
import { necroFloorType } from "../../../floor/subs/NecroFloor"
import type { Run } from "../../../run/Run"
import type { GameModeShareable } from "../../GameModeShareable"
import type { HandleChannel } from "../../HandleChannel"
import { DuelRaceOwner } from "../duelRace/DuelRaceOwner"
import type { RaceTableBench } from "../duelRace/DuelRaceOwner"
import { duelRules } from "../duelRace/DuelRules"
import type { DuelRules } from "../duelRace/DuelRules"
import type { DuelRacePlayer } from "../duelRace/players/DuelRacePlayer"
import { Rng } from "../../../base/Rng"

import { DuelConversion } from "./DuelConversion"
import type { BuilderRole } from "./MonsterBuilderManager"
import { setUpNecro } from "./NecroSetup"

/** One halt of the duels every this many rows of the map of a necromancer, and one at its end. */
const NECRO_DUEL_EVERY = 4

/** Is what the manager opened a run with the spec of a necromancer? */
function roleOf(spec: GameModeShareable): BuilderRole {
    const { role } = (spec ?? {}) as { role?: unknown }
    return role === "necro" ? "necro" : "hero"
}

/**
 * The client side of a game of monster builders: the run of a hero is the usual one with each fight a duel,
 * the run of a necromancer is its own floor, with an army to raise and halts of the duels. Both are played
 * as a race of duels is, and both fight the duels the manager makes of them.
 */
export class MonsterBuilderOwner extends DuelRaceOwner {


    constructor(
        heroes: DuelRules,
        necros: DuelRules,
        bench: RaceTableBench,
        manager: HandleChannel,
    ){
        super(heroes, null, bench, manager)
        this.#heroes = heroes
        this.#necros = necros
    }


    protected override floorFor(spec: GameModeShareable): FloorType|null {
        return roleOf(spec) === "necro" ? necroFloorType() : null
    }

    protected override rulesFor(run: Run): DuelRules {
        return this.#roles.get(run) === "necro" ? this.#necros : this.#heroes
    }

    protected override made(run: Run, spec: GameModeShareable): void {
        const role = roleOf(spec)
        this.#roles.set(run, role)
        if(role === "necro") setUpNecro(run)
        else this.#conversions.set(run, new DuelConversion(run))
    }

    protected override joined(player: DuelRacePlayer, run: Run): void {
        const conversion = this.#conversions.get(run)
        // A hero that wins a duel is paid as it was for the fight it replaces.
        if(conversion) player.duelOver.add(won => { if(won === true) conversion.win() })
    }


    readonly #heroes: DuelRules
    readonly #necros: DuelRules
    readonly #roles = new WeakMap<Run, BuilderRole>()
    readonly #conversions = new WeakMap<Run, DuelConversion>()
}

/** What the rules of the two parts are made from. */
export interface BuilderRulesSource {
    readonly lives: number
    readonly floors: number
}

/** The rules a hero plays by: no row of duels laid, the map holds them, and it ends after some floors. */
export function heroRules({ lives, floors }: BuilderRulesSource): DuelRules {
    return duelRules(new Rng(0), { lives, duelEvery: 1_000, floors })
}

/** The rules a necromancer plays by: a row of duels every so many rows, and one at the end of each floor. */
export function necroRules({ lives }: BuilderRulesSource): DuelRules {
    return duelRules(new Rng(0), { lives, duelEvery: NECRO_DUEL_EVERY, closing: true })
}
