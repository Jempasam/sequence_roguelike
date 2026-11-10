import type { Card } from "../../../card/Card"
import { monsterFusion } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { cardShown } from "../shown"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { DARK_COLOR, DARK_MASK } from "../halt_common"
import { offeredMonsters } from "./monster_pool"
import { CARTE, FUSION } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The necro chest: a fusion torn from a monster, among some, free. */
export class NecroChestHalt extends CardGiftHalt {


    constructor(run: Run){
        super(NECRO_CHEST_HALT, run,
            ["Un ", FUSION.as("collage"), " arraché à un monstre, parmi trois, gratuit."],
            sceneLook(31, 23, 13, "mecard/travel/chest"),
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
        this.#cards = offeredMonsters(run.rng).flatMap(monster => monsterFusion(monster, run.rng) ?? [])
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
    description: ["Un ", FUSION.as("collage"), " d'une chaîne d'un monstre, parmi trois, gratuit."],
    icon: visual("travel/chest/logo", { letter: "CO!" }),
    glow: DARK_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new NecroChestHalt(run),
}
