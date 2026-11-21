import { concat } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import { visual } from "../../../base/Visual"
import type { VisualPatch } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { LOOT_ITEMS } from "../../../catalog/index"
import type { Item } from "../../../item/Item"
import type { Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import type { SceneLook } from "../../SceneLook"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { cardShown, described, fusionShown } from "../shown"

/** How much more gold than its base a reward halt gives at random, at most. */
export const GOLD_SPREAD = 10

/** How much more gold, as a share of its base, a reward halt gives to those who take nothing else. */
export const GOLD_ONLY_BONUS = 0.5

/** Something a reward halt offers: how a dialog shows it, and what it does once a character takes it. */
export interface Prize {
    readonly shown: Shown

    /** Give it, to a character the players choose. */
    give(ctx: HaltContext): void
}

/**
 * The look every reward halt shares: the spotlit bag over the frame of the chest, tinted by the sort of
 * reward, none to keep the colors of the painting.
 *
 * @param panels - The color of its panels, as bytes.
 */
export function rewardLook(panels: readonly [number, number, number], parallax: VisualPatch = {}): SceneLook {
    return { ...sceneLook(...panels, "bag", parallax), border: visual("border/chest") }
}

/**
 * What every halt that pays for a won fight shares: some gold, then one prize among those it offers, for a
 * character of the party.
 *
 * @remarks
 * The prizes are drawn the first time it is visited, when the fight it follows, if any, is known to it: see
 * {@link HaltContext.fight}. The gold is paid once, along with the first prize taken.
 */
export abstract class RewardHalt extends CardGiftHalt {


    constructor(
        type: HaltType,
        run: Run,

        /** The gold it pays, before what is drawn at random on top of it. */
        private readonly gold: number,

        line: Text,
        look: SceneLook,
    ){
        super(type, run, line, look)
    }


    public start(ctx: HaltContext): void {
        this.#prizes ??= [...this.prizes(ctx), this.#goldPrize()]
        ctx.offer("Victoire ! Choisis ta récompense", this.#prizes, prize => prize.shown, prize => prize.give(ctx))
    }


    /** What it offers, drawn once. */
    protected abstract prizes(ctx: HaltContext): readonly Prize[]

    /** A card, for a deck of a character. */
    protected cardPrize(card: Card): Prize {
        return { shown: cardShown(card), give: ctx => this.give(ctx, [card]) }
    }

    /** A fusion, or any card told by what it reads, for a deck of a character. */
    protected fusionPrize(fusion: Card): Prize {
        return { shown: fusionShown(fusion), give: ctx => this.give(ctx, [fusion]) }
    }

    /** An item, for a character. */
    protected itemPrize(item: Item): Prize {
        const shown: Shown = { cards: [], items: [item], text: described(item, item) }
        return {
            shown,
            give: ctx => ctx.hero(concat(item, " : pour qui ?"), hero => {
                this.impact()
                this.run.giveItem(hero, item)
                ctx.tell(concat(item, " pour ", hero, "."))
            }),
        }
    }

    /** An item of the loot, at random. */
    protected lootItemPrize(): Prize {
        return this.itemPrize(this.run.rng.pick(LOOT_ITEMS) ?? LOOT_ITEMS[0])
    }


    /** The last option: only the gold, a little more of it. */
    #goldPrize(): Prize {
        const bonus = Math.ceil(this.gold * GOLD_ONLY_BONUS)
        return {
            shown: { cards: [], text: concat("Seulement de l'or : ", bonus, " de plus.") },
            give: ctx => {
                this.#extra = bonus
                this.impact()
                ctx.tell(concat("Rien que de l'or : ", bonus, " de plus."))
            },
        }
    }

    /** The gold is paid with the first change the halt makes to the run, which is the prize taken: once. */
    protected override impact(): void {
        if(!this.#paid){
            this.#paid = true
            this.run.gold += this.gold + this.run.rng.int(GOLD_SPREAD + 1) + this.#extra
        }
        super.impact()
    }


    #paid = false

    /** The gold more than usual that the players asked for by taking nothing else. */
    #extra = 0
    #prizes: readonly Prize[]|null = null
}
