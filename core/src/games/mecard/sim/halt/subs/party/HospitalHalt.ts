import { rgba } from "../../../base/Rgba"
import { concat } from "../../../../../../semantic"
import type { Hero } from "../../../run/Hero"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import { heartLootText, SPENT_LOOT_HEARTS } from "../../../run/Run"
import type { HeartLoot, Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { visual } from "../../../base/Visual"

/** The hospital: the party healed, then hearts used once, chosen among a few drawn, for each character. */
export class HospitalHalt extends AbstractHalt {


    constructor(run: Run){
        super(HOSPITAL_HALT, run,
            "Allongez-vous : je soigne vos cœurs rouges, et chacun repart avec des cœurs de plus.",
            sceneLook(18, 33, 41, "mecard/travel/hospital"),
            {
                hat: "coif",
                clothes: rgba(0.9, 0.95, 1)
            },
        )
    }


    public start(ctx: HaltContext): void {
        ctx.confirm("Les lits sont libres.", { cards: [], text: "" }, "Se soigner", () => {
            this.impact()
            this.run.heal()
            this.#giveHearts(ctx, [...this.run.heroes])
        })
    }


    /** Ask each character in turn for the hearts it takes, among some drawn for it. */
    #giveHearts(ctx: HaltContext, heroes: readonly Hero[]): void {
        const [hero, ...others] = heroes
        if(!hero){
            ctx.tell("L'équipe est soignée, et chacun a des cœurs de plus.")
            return
        }
        const show = (loot: HeartLoot) => ({ cards: [], text: heartLootText(loot) })
        const offers = distinct(this.run.rng, SPENT_LOOT_HEARTS, INVENTED_COUNTS)
        ctx.offer(concat("Quel cœur pour ", hero, " ?"), offers, show, loot => {
            this.run.giveHearts(hero, loot)
            this.#giveHearts(ctx, others)
        })
    }
}

/** The sort of the hospital. */
export const HOSPITAL_HALT: HaltType = {
    id: "hospital",
    name: "Hôpital",
    description: "Soigne tous les cœurs rouges de l'équipe, et donne à chacun des cœurs à usage unique, au choix parmi trois.",    icon: visual("travel/hospital/logo", { letter: "H" }),
    transition: DOOR_TRANSITION,
    create: run => new HospitalHalt(run),
}
