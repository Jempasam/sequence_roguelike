import { concat, joinText } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import { CARTE, DECK, MONSTER } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import type { Monster } from "../../../catalog/monsters"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { MAX_SWAPPED, swapCards } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DeckHalt } from "../deck/DeckHalt"
import { DARK_COLOR, DARK_COLORATION, DARK_MASK } from "../halt_common"
import { monsterShown, offeredMonsters } from "./monster_pool"

/** The traitor: cards swapped between a deck of the party and the deck of a monster among some. */
export class DarkStrategistHalt extends DeckHalt {


    constructor(run: Run){
        super(DARK_STRATEGIST_HALT, run,
            ["Les ", MONSTER.as("monstres"), " ont de bonnes ", CARTE.as("cartes"), ". Échangeons-en."],
            // Waiting for its own art: the scene of the antiquarian, as the strategist.
            sceneLook(28, 30, 16, "strategist", { coloration: [0.72, 0.56, 0.78] }),
            {
                hat: "bicorne",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
                item: "sword",
                itemColor: DARK_COLOR,
            },
        )
        this.#monsters = offeredMonsters(run.rng)
    }


    protected fits(): boolean {
        return true
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const ask = (): void => ctx.offer(["Avec quel ", MONSTER, " ?"], this.#monsters, monster => monsterShown(monster), monster => {
            this.#swap(ctx, hero, deck, monster, ask)
        }, { back })
        ask()
    }


    /**
     * Ask for cards of the deck, then at least one of the monster, and swap them: the monster's deck is only
     * a pool.
     */
    #swap(ctx: HaltContext, hero: Hero, deck: Card[], monster: Monster, back: () => void): void {
        const title = (whose: Text): Text => concat("Jusqu'à ", MAX_SWAPPED, " ", CARTE.as("cartes"), " ", whose, " à échanger")
        const fromDeck = (): void => ctx.cards(title(concat("de ", hero)), deck, { min: 0, max: MAX_SWAPPED }, leaving => {
            const theirs = [...monster.cards]
            ctx.cards(title(concat("de ", monster)), theirs, { min: 1, max: MAX_SWAPPED }, coming => {
                this.impact()
                this.run.changeDeck(deck, changed => swapCards(changed, leaving, theirs, coming))
                ctx.tell(concat("Échangées : ", joinText([...leaving, ...coming], ", "), "."))
            }, { back: fromDeck })
        }, { back, unlimited: hero.unlimited, copies: false })
        fromDeck()
    }


    /** The monsters offered. */
    readonly #monsters: readonly Monster[]
}

/** The sort of the traitor. */
export const DARK_STRATEGIST_HALT: HaltType = {
    id: "darkStrategist",
    name: "Traître",
    description: ["Échange des ", CARTE.as("cartes"), " entre un ", DECK, " et celui d'un ", MONSTER, " parmi trois."],
    icon: visual("halts/strategist", { letter: "ST!" }),
    glow: DARK_COLOR,
    transition: visual("dungeon-door", { coloration: DARK_COLORATION }),
    create: run => new DarkStrategistHalt(run),
}
