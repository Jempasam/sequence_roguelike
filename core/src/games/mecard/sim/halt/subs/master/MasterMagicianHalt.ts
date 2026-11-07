import { CARTE } from "../../../base/keywords"
import { rgba } from "../../../base/Rgba"
import { BOOSTERS, openBooster } from "../../../catalog/boosters"
import type { Booster } from "../../../catalog/boosters"
import { upgradeAll, upgradeFitsAll, UPGRADES } from "../../../catalog/upgrades"
import type { CardUpgrade } from "../../../catalog/upgrades"
import { INVENTED_COUNTS } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltContext, Shown } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { CardGiftHalt } from "../gift/CardGiftHalt"
import { boosterShown } from "../gift/MagicianHalt"

/** A booster and the upgrade that comes with it, put on every card of the booster it matches. */
interface Bet {
    readonly booster: Booster
    readonly upgrade: CardUpgrade
}

/** A bet: the booster, closed, and the upgrade beside it. */
function betShown({ booster, upgrade }: Bet): Shown {
    return { ...boosterShown(booster), upgrades: [upgrade] }
}

/**
 * The upgrades that match every card of at least one pool of a booster.
 */
function upgradesOf(booster: Booster): CardUpgrade[] {
    return UPGRADES.filter(upgrade => booster.pools.some(pool => upgradeFitsAll(upgrade, pool.pool)))
}

/**
 * The master magician: a booster with an upgrade at random, three bets among which to choose. The chosen
 * booster is opened and the upgrade put on every card of it that matches.
 */
export class MasterMagicianHalt extends CardGiftHalt {


    constructor(run: Run){
        super(MASTER_MAGICIAN_HALT, run,
            ["Trois boosters, chacun avec son charme. Ses ", CARTE.as("cartes"), " en profiteront."],
            sceneLook(26, 13, 41, "mecard/travel/magician"),
            {
                hat: "topHat",
                mask: "sunglasses",
                clothes: rgba(1, 0.8, 0.2),
                hatColor: rgba(1, 0.8, 0.2),
                cues: { done: "spin" },
                item: "magicianWand"
            },
        )
        const boosters = [...BOOSTERS]
        run.rng.shuffle(boosters)
        const bets: Bet[] = []
        for(const booster of boosters){
            const upgrade = run.rng.pick(upgradesOf(booster))
            if(upgrade) bets.push({ booster, upgrade })
            if(bets.length >= INVENTED_COUNTS) break
        }
        this.#bets = bets
    }


    public start(ctx: HaltContext): void {
        ctx.offer("Choisis un pari", this.#bets, betShown, ({ booster, upgrade }) => {
            this.give(ctx, upgradeAll(upgrade, openBooster(this.run.rng, booster), this.run.rng))
        })
    }


    /** The bets offered. */
    readonly #bets: readonly Bet[]
}

/** The sort of the master magician. */
export const MASTER_MAGICIAN_HALT: HaltType = {
    id: "masterMagician",
    name: "Maître magicien",
    description: ["Un booster parmi trois, ouvert et ses ", CARTE.as("cartes"), " améliorées."],
    code: "MG*",
    icon: "mecard/travel/magician/logo.png",
    glow: rgba(1, 0.8, 0.2),
    transition: DOOR_TRANSITION,
    create: run => new MasterMagicianHalt(run),
}
