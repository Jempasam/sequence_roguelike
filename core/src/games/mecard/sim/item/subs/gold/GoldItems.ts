import { GOLD, RANDOM, UNIT } from "../../../base/keywords"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { CompositeCard } from "../../../card/subs/composite/CompositeCard"
import { RandomCard } from "../../../card/subs/composite/RandomCard"

import { AbstractItem } from "../AbstractItem"

/** What a lottery ticket wins, and how likely. */
const TICKET_GOLD = 10
const TICKET_CHANCE = 0.5

/** What each card of chance played gives. */
const COIN_GOLD = 5

/** How many cards of chance a card is, those it holds counted. */
function chances(card: Card): number {
    const own = card instanceof RandomCard ? 1 : 0
    if(!(card instanceof CompositeCard)) return own
    return own + card.contents.reduce((total, each) => total + chances(each), 0)
}

/** A lottery ticket: at the start of the battle, one chance in two to win gold. */
export class LotteryTicket extends AbstractItem {


    constructor(){
        super("Ticket de loterie", visual("items/lottery_ticket"), [
            "Début du combat : une chance sur deux de gagner ", TICKET_GOLD, " ", GOLD, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(round => {
            if(round === 1 && battle.rng.chance(TICKET_CHANCE)) battle.giveGold(unit, TICKET_GOLD)
        }))
    }
}

export const LOTTERY_TICKET = new LotteryTicket()

/** How many gold a piggy bank spends for each blue heart, and the most hearts it gives. */
const BANK_GOLD_PER_HEART = 20
const BANK_MAX_HEARTS = 3

/** A piggy bank: at the start of the battle, a blue heart for each few gold in the purse. */
export class PiggyBank extends AbstractItem {


    constructor(){
        super("Tirelire", visual("items/piggy_bank"), [
            "Début du combat : gagne ", new HeartCount(1), " ", BLUE_HEART, " par tranche de ", BANK_GOLD_PER_HEART,
            " ", GOLD, " possédés (", BANK_MAX_HEARTS, " au plus).",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(round => {
            if(round !== 1) return
            const count = Math.min(BANK_MAX_HEARTS, Math.floor(battle.goldOf(unit) / BANK_GOLD_PER_HEART))
            for(const heart of Heart.many(BLUE_HEART, count)) unit.hearts.give(heart)
        }))
    }
}

export const PIGGY_BANK = new PiggyBank()

/** A metal detector: when its unit's team wins, one gold for each unit it killed in the battle. */
export class MetalDetector extends AbstractItem {


    constructor(){
        super("Détecteur de métaux", visual("items/metal_detector"), [
            "Après un combat gagné : ", 1, " ", GOLD, " par ", UNIT, " ennemie que tu as tuée.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let kills = 0
        hold(unit.killed.add(() => {
            kills++
            if(battle.enemiesOf(unit).length === 0) battle.giveGold(unit, kills)
        }))
    }
}

export const METAL_DETECTOR = new MetalDetector()

/** A rigged coin: each card of chance in the chain gives gold. */
export class RiggedCoin extends AbstractItem {


    constructor(){
        super("Pièce truquée", visual("items/rigged_coin"), ["Chaque carte ", RANDOM, " que tu joues te donne ", COIN_GOLD, " ", GOLD, "."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.onPreparing.add(() => {
            const count = unit.chain.cards.reduce((total, card) => total + chances(card), 0)
            if(count > 0) battle.giveGold(unit, count * COIN_GOLD)
        }))
    }
}

export const RIGGED_COIN = new RiggedCoin()
