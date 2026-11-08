import { concat } from "../../../../../../semantic"
import { CARTE, DECK, FUSION, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import type { Monster } from "../../../catalog/monsters"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { possessBy } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { CAVE_TRANSITION } from "../../transitions"
import { DeckHalt } from "../deck/DeckHalt"
import { DARK_COLOR, DARK_MASK } from "../halt_common"
import { monsterShown, offeredMonsters } from "./monster_pool"

/** The archdemon: each card of a deck fused with the card of a monster at the same rank. */
export class DarkDemonHalt extends DeckHalt {


    constructor(run: Run){
        super(DARK_DEMON_HALT, run,
            ["Signe, et chaque ", CARTE, " d'un ", DECK, " sera ", FUSION.as("collée"), " à celle d'un monstre."],
            sceneLook(31, 8, 10, "mecard/travel/demon"),
            {
                hat: "hornedCrown",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
                cues: { arrive: "surprise" },
                item: "demonFork",
                itemColor: DARK_COLOR,
            },
        )
        this.#monsters = offeredMonsters(run.rng)
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.length >= 1
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        ctx.offer("Quel monstre ?", this.#monsters, monster => monsterShown(monster), monster => {
            this.impact()
            const fused = this.run.changeDeck(deck, changed => possessBy(changed, monster.cards))
            ctx.tell(concat("Le ", DECK, " de ", hero, " est possédé par ", monster, " : ", fused.length, " ", CARTE.as("cartes"), "."))
        }, { back })
    }


    /** The monsters offered. */
    readonly #monsters: readonly Monster[]
}

/** The sort of the archdemon. */
export const DARK_DEMON_HALT: HaltType = {
    id: "darkDemon",
    name: "Archidémon",
    description: ["Chaque ", CARTE, " d'une ", UNIT, " est ", FUSION.as("collée"), " à la ", CARTE, " d'un monstre au même rang."],
    icon: visual("travel/demon/logo", { letter: "DÉ!" }),
    glow: DARK_COLOR,
    transition: CAVE_TRANSITION,
    create: run => new DarkDemonHalt(run),
}
