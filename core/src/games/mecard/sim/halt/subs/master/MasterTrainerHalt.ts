import { concat } from "../../../../../../semantic"
import { CARTE, DECK } from "../../../base/keywords"
import { rgba } from "../../../base/Rgba"
import type { Card } from "../../../card/Card"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { upgradeOf } from "../deck/AlchemistHalt"
import { trainerMonsters } from "../gift/TrainerHalt"

/**
 * The master trainer: a trainer whose ally comes trained, every card of its deck upgraded when an upgrade
 * matches it. It offers the allies of the trainer, shown upgraded before the choice.
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
        this.#monsters = trainerMonsters(run.rng).map(monster => this.#trained(monster))
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Quel allié ?", this.#monsters, monster => ({
            cards: [...new Set(monster.cards)], sprite: monster.sprite,
            text: [monster, " : ", monster.hearts, " cœurs, ", monster.draw, " ", CARTE.as("cartes"), " par round, joué par un bot, son ", DECK, " rebattu."],
        }), monster => {
            this.impact()
            ctx.tell(concat(this.run.tame(monster), " rejoint l'équipe."))
        })
    }


    /** The monsters offered, already trained. */
    readonly #monsters: readonly Monster[]

    /**
     * A monster with every card of its deck upgraded that has an upgrade, each by one matching it at random,
     * the copies of a card all alike.
     */
    #trained(monster: Monster): Monster {
        const made = new Map<Card, Card>()
        const cards = monster.cards.map(card => {
            if(!made.has(card)) made.set(card, upgradeOf(card, this.run.rng) ?? card)
            return made.get(card) ?? card
        })
        return Object.create(monster, { cards: { value: cards, enumerable: true } }) as Monster
    }
}

/** The sort of the master trainer. */
export const MASTER_TRAINER_HALT: HaltType = {
    name: "Maître dresseur",
    description: ["Un allié parmi deux pets et un monstre, joué par un bot, une amélioration sur chacune de ses ", CARTE.as("cartes"), "."],
    code: "MD",
    icon: "mecard/travel/trainer/logo.png",
    glow: rgba(1, 0.8, 0.2),
    transition: DOOR_TRANSITION,
    create: run => new MasterTrainerHalt(run),
}
