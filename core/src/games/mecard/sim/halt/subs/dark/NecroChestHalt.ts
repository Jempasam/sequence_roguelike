import type { Card } from "../../../card/Card"
import { fusionOfMonster } from "../monster/monsterCards"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { cardShown } from "../shown"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { DARK_COLOR, DARK_COLORATION, DARK_MASK } from "../halt_common"
import { offeredMonsters } from "./monster_pool"
import { CARTE, FUSION, MONSTER } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The necro chest: a fusion torn from a monster, among some, free. */
export class NecroChestHalt extends CardGiftHalt {


    constructor(run: Run){
        super(NECRO_CHEST_HALT, run,
            ["Un ", FUSION.as("collage"), " arraché à un ", MONSTER, ", parmi trois, gratuit."],
            sceneLook(13, 20, 31, "chest", { coloration: [0.72, 0.56, 0.78] }),
            // A dark one keeps this chest, who tore its cards from the monsters.
            {
                hat: "skullHood",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
                item: "demonFork",
                itemColor: DARK_COLOR,
            },
        )
        this.#cards = offeredMonsters(run.rng).map(fusionOfMonster)
    }


    public start(ctx: HaltContext): void {
        ctx.offer(["Choisis une ", CARTE], this.#cards, cardShown, card => this.give(ctx, [card]))
    }


    /** The cards offered. */
    readonly #cards: readonly Card[]
}

/** The sort of the necro chest. */
export const NECRO_CHEST_HALT: HaltType = {
    id: "necroChest",
    name: "Nécro coffre",
    description: ["Un ", FUSION.as("collage"), " d'une chaîne d'un ", MONSTER, ", parmi trois, gratuit."],
    icon: visual("halts/chest", { letter: "CO!" }),
    glow: DARK_COLOR,
    transition: visual("dungeon-door", { coloration: DARK_COLORATION }),
    create: run => new NecroChestHalt(run),
}
