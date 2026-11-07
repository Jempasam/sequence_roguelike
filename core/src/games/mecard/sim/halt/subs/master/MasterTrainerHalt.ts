import { concat } from "../../../../../../semantic"
import { CARTE, DECK } from "../../../base/keywords"
import { rgba } from "../../../base/Rgba"
import type { Monster } from "../../../catalog/monsters"
import { upgradeAll, upgradeMatches, UPGRADES } from "../../../catalog/upgrades"
import type { CardUpgrade } from "../../../catalog/upgrades"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { trainerMonsters } from "../gift/TrainerHalt"

/**
 * The master trainer: a trainer whose ally comes trained, one upgrade put on every card of its deck it
 * matches. It offers the allies of the trainer, shown upgraded, the upgrade beside them.
 */
export class MasterTrainerHalt extends AbstractHalt {


    constructor(run: Run){
        super(MASTER_TRAINER_HALT, run,
            "Une de mes trois bêtes améliorées, te suivra, et se battra seul.",
            sceneLook(23, 28, 15, "mecard/travel/trainer"),
            {
                hat: "huntingHat",
                mask: "sunglasses",
                clothes: rgba(1, 0.8, 0.2),
                hatColor: rgba(1, 0.8, 0.2),
                item: "whip"
            },
        )
        this.#offers = trainerMonsters(run.rng).map(monster => this.#trained(monster))
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Quel allié ?", this.#offers, ({ base, upgrade }) => ({
            cards: [...new Set(base.cards)],
            upgrades: upgrade ? [upgrade] : [],
            sprite: base.sprite,
            text: [base, " : ", base.hearts, " cœurs, ", base.draw, " ", CARTE.as("cartes"), " par round, joué par un bot, son ", DECK, " rebattu."],
        }), ({ monster }) => {
            this.impact()
            ctx.tell(concat(this.run.tame(monster), " rejoint l'équipe."))
        })
    }


    /** The allies offered, already trained, and the upgrade each got. */
    readonly #offers: readonly { base: Monster, monster: Monster, upgrade: CardUpgrade|null }[]

    /**
     * A monster with one upgrade, drawn among those matching at least one card of its deck, put on every
     * card of its deck it matches. The plain monster is kept to be shown beside the upgrade.
     */
    #trained(base: Monster): { base: Monster, monster: Monster, upgrade: CardUpgrade|null } {
        const upgrade = this.run.rng.pick(UPGRADES.filter(each => base.cards.some(card => upgradeMatches(each, card)))) ?? null
        if(!upgrade) return { base, monster: base, upgrade }
        const cards = upgradeAll(upgrade, base.cards, this.run.rng)
        return { base, monster: Object.create(base, { cards: { value: cards, enumerable: true } }) as Monster, upgrade }
    }
}

/** The sort of the master trainer. */
export const MASTER_TRAINER_HALT: HaltType = {
    id: "masterTrainer",
    name: "Maître dresseur",
    description: ["Un allié parmi deux pets et un monstre, joué par un bot, une même amélioration sur toutes celles de ses ", CARTE.as("cartes"), " qui la prennent."],
    code: "D*",
    icon: "mecard/travel/trainer/logo.png",
    glow: rgba(1, 0.8, 0.2),
    transition: DOOR_TRANSITION,
    create: run => new MasterTrainerHalt(run),
}
