import { concat, joinText } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import type { HaltContext } from "../../HaltContext"
import { AbstractHalt } from "../AbstractHalt"
import { DECK } from "../../../base/keywords"

/** A halt ending with cards given to a character of the party. */
export abstract class CardGiftHalt extends AbstractHalt {


    /** Give cards to a character of the party, chosen, then go back to the map. */
    protected give(ctx: HaltContext, cards: readonly Card[]): void {
        ctx.hero(concat(joinText(cards, ", "), " : pour qui ?"), hero => {
            this.chooseDeck(ctx, concat(joinText(cards, ", "), " : dans quel ", DECK, " ?"), hero, deck => {
                this.impact()
                this.run.changeDeck(deck, changed => changed.push(...cards))
                ctx.tell(concat(joinText(cards, ", "), " pour ", hero, "."))
            })
        })
    }
}
