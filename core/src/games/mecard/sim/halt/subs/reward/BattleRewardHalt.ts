import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import { lootCards } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltType } from "../../HaltType"
import { RewardHalt, rewardLook } from "./RewardHalt"
import type { Prize } from "./RewardHalt"

/** How many cards the reward of a fight offers. */
const CHOICES = 4

/** The reward of a fight: some gold, and a card among some of the loot. */
export class BattleRewardHalt extends RewardHalt {


    constructor(type: HaltType, run: Run, gold: number){
        super(type, run, gold, ["Victoire ! De l'or, et une ", CARTE, " au choix."], rewardLook([30, 34, 44]))
    }


    protected prizes(): readonly Prize[] {
        return lootCards(this.run.rng, CHOICES).map(card => this.cardPrize(card))
    }
}

/** The sort of the reward of an ordinary fight. */
export const BATTLE_REWARD_HALT: HaltType = {
    id: "battleReward",
    name: "Récompense de combat",
    description: ["Une ", CARTE, " parmi quatre, et de l'or."],
    icon: visual("halts/chest", { letter: "R" }),
    transition: visual("gilded-door"),
    onMap: false,
    create: run => new BattleRewardHalt(BATTLE_REWARD_HALT, run, 15),
}
