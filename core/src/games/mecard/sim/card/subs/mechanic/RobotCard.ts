import type { Text } from "../../../../../../semantic"
import { HeartCount, SummonedHearts } from "../../../battle/words"
import type { Action } from "../../../battle/Action"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import type { Card } from "../../Card"
import { ACTION, MODULE } from "../../CardType"
import type { Module } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { InputRewriteCard } from "../composite/RewriteCards"
import { WAIT } from "../movement/Wait"
import { SUMMON_AHEAD, summonSpot, summoning } from "../tools/playing"
import { CARTE, DISTANCE, BATTLE_ROUND, INVOCATION, SUMMON_STAT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** How many shield hearts the improvised robot lives by, before the summoning of the unit. */
const ROBOT_HEARTS = 2

/** How many times the hearts of the tank robot are those of a robot. */
const TANK_FACTOR = 2

/**
 * A robot built from the module plugged into it: a body a little ahead, facing as its unit, with nothing but
 * shield hearts, which plays the cards of the module right after its unit, every round.
 */
export class RobotCard extends AbstractCard<Action, Module> {


    public readonly output = ACTION
    public readonly input = MODULE

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How many times the hearts of a robot it gives. */
        public readonly hearts: number,

        /** The cards a robot plays, from the cards of its module. */
        public readonly program: (cards: readonly Card[]) => readonly Card[],
    ){
        super(name, description, rarity)
    }


    public get(module: Module): Action {
        return RobotCard.#building(this, module)
    }


    static #building(card: RobotCard, module: Module): Action {
        return summoning(
            (unit, pose) => [summonSpot(unit, pose)],
            (unit, battle) => ({
                sprite: visual("units/robot"), name: "Robot",
                hearts: () => Heart.many(SHIELD_HEART, (ROBOT_HEARTS + unit.stats.summon.value) * card.hearts),
                cards: card.program(module.cards(options => battle.rng.pick(options) ?? options[0])),
            }),
            { equip: (_battle, robot) => module.tune(robot) },
        )
    }
}

/** Cards with a wait between each two. */
function slowed(cards: readonly Card[]): Card[] {
    return cards.flatMap((card, index) => index === 0 ? [card] : [WAIT, card])
}

export const IMPROVISED_ROBOT = new RobotCard("Robot improvisé", [
    INVOCATION.as("Invoque"), " à ", SUMMON_AHEAD, " ", DISTANCE, " devant un robot de ", new SummonedHearts(ROBOT_HEARTS, SHIELD_HEART),
    ", tourné ",
    "comme toi. Juste après toi, à chaque ", BATTLE_ROUND, ", il joue les ", CARTE.as("cartes"), " du module.",
], Rarity.RARE, 1, cards => cards)

export const TANK_ROBOT = new RobotCard("Robot tank", [
    INVOCATION.as("Invoque"), " à ", SUMMON_AHEAD, " ", DISTANCE, " devant un robot de ", new HeartCount(ROBOT_HEARTS * TANK_FACTOR),
    " ", SHIELD_HEART, ", ×", TANK_FACTOR, " ", SUMMON_STAT, " comprise. Juste après toi, à chaque ", BATTLE_ROUND,
    ", il joue les ", CARTE.as("cartes"), " du module, en attendant entre chacune.",
], Rarity.RARE, TANK_FACTOR, slowed)

/** The cards of the module it takes, in its place. */
export const IMPROVISED_WEAPON = new InputRewriteCard("Arme improvisée", [
    "Fin de préparation : se remplace par les ", CARTE.as("cartes"), " de son module.",
], Rarity.COMMON, MODULE, (ctx, _spot, module) => {
    return { cards: module.cards(options => ctx.pick(options)), consumed: 0, acting: false }
})
