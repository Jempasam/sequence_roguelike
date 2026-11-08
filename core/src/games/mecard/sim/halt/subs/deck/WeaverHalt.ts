import { rgba } from "../../../base/Rgba"
import type { Text } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import type { Hero } from "../../../run/Hero"
import type { Run } from "../../../run/Run"
import { canWeave, weavable, weave, woven } from "../../../run/visits"
import type { WeaveMode } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "./DeckHalt"
import { cardShown } from "../shown"
import { CARTE, DECK, MERGE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** The ways the weaver ties two cards. */
const MODES: readonly WeaveMode[] = ["merged", "random"]

/** What each way of the weaver ties, as the players are told. */
const WEAVE_TEXTS: Readonly<Record<WeaveMode, Text>> = {
    merged: [MERGE.as("Mélange"), " : deux ", CARTE.as("cartes"), " d'actions qui ne prennent rien, jouées en même temps, en une seule étape."],
    random: ["Au hasard : deux ", CARTE.as("cartes"), " qui prennent et donnent la même chose ; l'une des deux est tirée à chaque combat."],
}

/** Can a character tie two cards of its deck a way? */
function can(deck: readonly Card[], mode: WeaveMode): boolean {
    return deck.some(card => weavable(card, deck, mode))
}

/** The weaver: a way to tie, then two cards of a deck tied that way, in the order picked. */
export class WeaverHalt extends DeckHalt {


    constructor(run: Run){
        super(WEAVER_HALT, run,
            ["Je lie deux ", CARTE.as("cartes"), " : ", MERGE.as("mélangées"), ", ou l'une au hasard."],
            // Waiting for its own art: the scene of the forge.
            sceneLook(41, 18, 10, "mecard/travel/forge"),
            {
                hat: "skullcap",
                clothes: rgba(0.3, 0.85, 0.9),
                hatColor: rgba(0.3, 0.85, 0.9)
            },
        )
    }


    protected fits(deck: readonly Card[]): boolean {
        return MODES.some(mode => can(deck, mode))
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void, hero: Hero): void {
        const ask = (): void => ctx.offer("Comment les lier ?", MODES.filter(mode => can(deck, mode)), mode => {
            return { cards: [], text: WEAVE_TEXTS[mode] }
        }, mode => this.#tie(ctx, hero, deck, mode, ask), { back })
        ask()
    }

    /** Ask for two cards to tie a way, then show what they make before tying them. */
    #tie(ctx: HaltContext, hero: Hero, deck: Card[], mode: WeaveMode, back: () => void): void {
        const first = ["Lie deux ", CARTE.as("cartes"), " de ", hero]
        const count = { min: 2, max: 2 }
        const pick = (title: Text): void => ctx.cards(title, deck, count, cards => {
            if(!canWeave(cards, mode)){
                pick(["Ces deux ", CARTE.as("cartes"), " ne prennent ni ne donnent la même chose : choisis-en deux autres"])
                return
            }
            ctx.confirm(["La ", CARTE, " tissée :"], cardShown(woven(cards, mode), deck), "Tisser", () => {
                this.impact()
                ctx.tell("Tissée :", cardShown(this.run.changeDeck(deck, changed => weave(changed, cards, mode)), deck))
            }, { back: () => pick(first) })
        }, { among: card => weavable(card, deck, mode), back })
        pick(first)
    }
}

/** The sort of the weaver. Waiting for its own art: the logo of the forge. */
export const WEAVER_HALT: HaltType = {
    id: "weaver",
    name: "Tisserand",
    description: ["Lie deux ", CARTE.as("cartes"), " du ", DECK, " : ", MERGE.as("mélangées"), ", ou l'une au hasard."],    icon: visual("travel/forge/logo", { letter: "TI" }),
    transition: DOOR_TRANSITION,
    create: run => new WeaverHalt(run),
}
