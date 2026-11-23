import { CARTE, FUSION, ITEM } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import { lootUpgraded } from "../../../catalog/upgrades"
import { inventedFusion, lootCard } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltType } from "../../HaltType"
import { RewardHalt, rewardLook } from "./RewardHalt"
import type { Prize } from "./RewardHalt"

/** The red of the reward of a boss. */
const BOSS_COLORATION: [number, number, number] = [0.8, 0.1, 0.15]

/** The reward of a boss: a lot of gold, and among a card, an item, a fusion and an improved card, one. */
export class BossRewardHalt extends RewardHalt {


    constructor(type: HaltType, run: Run, gold: number){
        super(type, run, gold,
            ["Victoire ! Beaucoup d'or, et au choix une ", CARTE, ", un ", ITEM, ", une ", FUSION, " ou une ", CARTE, " améliorée."],
            rewardLook([52, 20, 22], { coloration: BOSS_COLORATION }),
        )
    }


    protected prizes(): readonly Prize[] {
        const { rng } = this.run
        const upgraded = lootUpgraded(rng)
        return [
            this.cardPrize(lootCard(rng)),
            this.lootItemPrize(),
            this.fusionPrize(inventedFusion(rng)),
            ...upgraded ? [this.fusionPrize(upgraded)] : [],
        ]
    }
}

/** The sort of the reward of a boss. */
export const BOSS_REWARD_HALT: HaltType = {
    id: "bossReward",
    name: "Récompense de boss",
    description: ["Une ", CARTE, ", un ", ITEM, ", une ", FUSION, " ou une ", CARTE, " améliorée au choix, et beaucoup d'or."],
    icon: visual("halts/chest", { letter: "R" }),
    transition: visual("great-door", { coloration: BOSS_COLORATION }),
    onMap: false,
    create: run => new BossRewardHalt(BOSS_REWARD_HALT, run, 80),
}
