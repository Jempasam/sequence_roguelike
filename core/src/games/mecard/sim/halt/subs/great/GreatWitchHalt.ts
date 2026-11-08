import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Run } from "../../../run/Run"
import type { Usable } from "../../../usable/Usable"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { witchUsables } from "../gift/WitchHalt"
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"
import { usableText } from "../shown"
import { visual } from "../../../base/Visual"

/** The great witch: a usable among some, for a character of the party, given three times over. */
export class GreatWitchHalt extends AbstractHalt {


    constructor(run: Run){
        super(GREAT_WITCH_HALT, run,
            "Trois utilisables mijotent ici. Prends-en un : tu en auras trois.",
            sceneLook(20, 31, 15, "mecard/travel/witch"),
            {
                hat: GREAT_HAT,
                clothes: rgba(0.6, 0.3, 0.8),
                hatColor: GREAT_COLOR,
                cues: { done: "spin" },
                item: "witchWand",
                itemColor: GREAT_COLOR
            },
        )
        this.#usables = witchUsables(run.rng)
    }


    public start(ctx: HaltContext): void {
        const show = (usable: Usable) => ({ cards: [], usables: [usable], text: concat("×3 · ", usableText(usable)) })
        ctx.offer("Choisis un utilisable", this.#usables, show, usable => {
            ctx.hero(concat(usable, " ×3 : pour qui ?"), hero => {
                this.impact()
                for(let i = 0; i < 3; i++) this.run.giveUsable(hero, usable)
                ctx.tell(concat(usable, " ×3 pour ", hero, "."))
            })
        })
    }


    /** The usables offered. */
    readonly #usables: readonly Usable[]
}

/** The sort of the great witch. */
export const GREAT_WITCH_HALT: HaltType = {
    id: "greatWitch",
    name: "Grande sorcière",
    description: "Un utilisable parmi trois, en triple.",
    icon: visual("travel/witch/logo", { letter: "SO*" }),
    glow: GREAT_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new GreatWitchHalt(run),
}
