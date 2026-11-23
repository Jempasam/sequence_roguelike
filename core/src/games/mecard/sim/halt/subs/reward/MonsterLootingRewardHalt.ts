import { CARTE, GOLD, MONSTER } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { RewardHalt, rewardLook } from "./RewardHalt"
import type { Prize } from "./RewardHalt"

/** The violet of the monsters' loot. */
const LOOTING_COLORATION: [number, number, number] = [0.6, 0.3, 0.9]

/** How many cards of the monsters it offers. */
const CHOICES = 4

/** How many of the cards of the monsters it draws from: the strongest third. */
const STRONGEST_SHARE = 1 / 3

/**
 * The cards of the monsters that were fought: the strongest third of every card they hold, by rarity, four of
 * them drawn at random.
 */
export class MonsterLootingRewardHalt extends RewardHalt {


    constructor(type: HaltType, run: Run, gold: number){
        super(type, run, gold,
            ["Les ", MONSTER.as("monstres"), " vaincus laissent des ", CARTE.as("cartes"), " : prends-en une."],
            rewardLook([38, 24, 56], { coloration: LOOTING_COLORATION }),
        )
    }


    protected prizes(ctx: HaltContext): readonly Prize[] {
        const held = [...new Set(ctx.fight?.monsters.flatMap(monster => monster.cards) ?? [])]
        // Array.prototype.sort is stable: the cards of the same rarity keep their order.
        const count = Math.ceil(held.length * STRONGEST_SHARE)
        const strongest = held.sort((a, b) => b.rarity.rank - a.rarity.rank).slice(0, count)
        const drawn: Card[] = [...strongest]
        this.run.rng.shuffle(drawn)
        return drawn.slice(0, CHOICES).map(card => this.cardPrize(card))
    }
}

/** The sort of the reward of looting the monsters of a fight. */
export const MONSTER_LOOTING_REWARD_HALT: HaltType = {
    id: "monsterLootingReward",
    name: "Butin des monstres",
    description: [
        "Une ", CARTE, " parmi quatre des plus fortes des ", MONSTER.as("monstres"), " vaincus, et de l'", GOLD, ".",
    ],
    icon: visual("halts/chest", { letter: "R" }),
    transition: visual("gilded-door", { coloration: LOOTING_COLORATION }),
    onMap: false,
    create: run => new MonsterLootingRewardHalt(MONSTER_LOOTING_REWARD_HALT, run, 15),
}
