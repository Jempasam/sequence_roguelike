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
import { GREAT_COLOR, GREAT_HAT } from "../halt_common"
import { visual } from "../../../base/Visual"

/** Hearts found as loot, twice as many. */
function doubled({ heart, count }: HeartLoot): HeartLoot {
    return { heart, count: count * 3 }
}

/** The great hospital: the party healed, then hearts used once, chosen among a few drawn, given twice over. */
export class GreatHospitalHalt extends AbstractHalt {


    constructor(run: Run){
        super(GREAT_HOSPITAL_HALT, run,
            "Allongez-vous : je soigne vos cœurs rouges, et chacun repart avec trois fois le cœur qu'il choisit.",
            sceneLook(18, 33, 41, "mecard/travel/hospital"),
            {
                hat: GREAT_HAT,
                clothes: rgba(0.9, 0.95, 1),
                hatColor: GREAT_COLOR
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


    /** Ask each character in turn for the hearts it takes, among some drawn for it, given twice over. */
    #giveHearts(ctx: HaltContext, heroes: readonly Hero[]): void {
        const [hero, ...others] = heroes
        if(!hero){
            ctx.tell("L'équipe est soignée, et chacun a des cœurs de plus.")
            return
        }
        const show = (loot: HeartLoot) => ({ cards: [], text: heartLootText(loot) })
        const offers = distinct(this.run.rng, SPENT_LOOT_HEARTS, INVENTED_COUNTS).map(doubled)
        ctx.offer(concat("Quel cœur pour ", hero, " ?"), offers, show, loot => {
            this.run.giveHearts(hero, loot)
            this.#giveHearts(ctx, others)
        })
    }
}

/** The sort of the great hospital. */
export const GREAT_HOSPITAL_HALT: HaltType = {
    id: "greatHospital",
    name: "Grand hôpital",
    description: "Soigne tous les cœurs rouges de l'équipe, et donne à chacun le cœur à usage unique choisi, en triple.",
    icon: visual("travel/hospital/logo", { letter: "H*" }),
    glow: GREAT_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new GreatHospitalHalt(run),
}
