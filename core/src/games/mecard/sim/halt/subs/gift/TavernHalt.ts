import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { KITS } from "../../../catalog/kits"
import type { Kit } from "../../../catalog/kits"
import { heroOf } from "../../../run/Hero"
import type { Hero } from "../../../run/Hero"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { stuffOf } from "../shown"

/** The kits a tavern offers: heroes not in the party yet, fewer when fewer are left. */
export function tavernKits(rng: Rng, party: readonly Hero[]): Kit[] {
    const free = KITS.filter(kit => !party.some(hero => hero.name === kit.name))
    return distinct(rng, free, INVENTED_COUNTS)
}

/** The tavern: a hero among some joins the party, with its kit. */
export class TavernHalt extends AbstractHalt {


    constructor(run: Run){
        super(TAVERN_HALT, run,
            "Ces héros boivent ici. L'un d'eux peut te suivre.",
            sceneLook(36, 23, 13, "mecard/travel/tavern"),
            {
                hat: "beret",
                clothes: rgba(1, 0.6, 0.25),
                hatColor: rgba(0.55, 0.2, 0.15)
            },
        )
        this.#kits = tavernKits(run.rng, run.heroes)
    }


    public start(ctx: HaltContext): void {
        if(this.#kits.length === 0){
            ctx.tell("La taverne est vide : tous les héros sont déjà avec toi.")
            return
        }
        ctx.offer("Qui rejoint l'équipe ?", this.#kits, kit => {
            const unit = heroOf(kit)
            return { unit, cards: [...new Set(kit.cards)], text: stuffOf(unit) }
        }, kit => {
            this.impact()
            ctx.tell(concat(this.run.hire(kit), " rejoint l'équipe."))
        })
    }


    /** The kits of the heroes offered. */
    readonly #kits: readonly Kit[]
}

/** The sort of the tavern. */
export const TAVERN_HALT: HaltType = {
    name: "Taverne",
    description: "Un héros parmi trois rejoint l'équipe.",
    code: "TA",
    icon: "mecard/travel/tavern/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new TavernHalt(run),
}
