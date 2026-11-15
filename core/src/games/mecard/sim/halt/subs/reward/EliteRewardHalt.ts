import { CARTE, FUSION } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import { inventedFusion, lootCards } from "../../../run/offers"
import type { Run } from "../../../run/Run"
import type { HaltType } from "../../HaltType"
import { RewardHalt, rewardLook } from "./RewardHalt"
import type { Prize } from "./RewardHalt"

/** The yellow of the epic reward. */
const ELITE_COLORATION: [number, number, number] = [0.95, 0.8, 0.2]

/** The reward of an elite: some gold, and among two cards, an item and a fusion, one. */
export class EliteRewardHalt extends RewardHalt {


    constructor(type: HaltType, run: Run, gold: number){
        super(type, run, gold,
            ["Victoire ! De l'or, et au choix une ", CARTE, ", un objet ou un ", FUSION, "."],
            rewardLook([52, 46, 18], { coloration: ELITE_COLORATION }),
        )
    }


    protected prizes(): readonly Prize[] {
        const { rng } = this.run
        return [
            ...lootCards(rng, 2).map(card => this.cardPrize(card)),
            this.lootItemPrize(),
            this.fusionPrize(inventedFusion(rng)),
        ]
    }
}

/** The sort of the reward of an elite. */
export const ELITE_REWARD_HALT: HaltType = {
    id: "eliteReward",
    name: "Récompense d'élite",
    description: ["Deux ", CARTE.as("cartes"), ", un objet ou une ", FUSION, " au choix, et de l'or."],
    icon: visual("travel/chest/logo", { letter: "R" }),
    transition: visual("transitions/gilded-door", { coloration: ELITE_COLORATION }),
    onMap: false,
    create: run => new EliteRewardHalt(ELITE_REWARD_HALT, run, 35),
}
