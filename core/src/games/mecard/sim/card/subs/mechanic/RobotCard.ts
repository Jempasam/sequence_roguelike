import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { HeartCount, meters } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import type { Card } from "../../Card"
import { gives } from "../../Card"
import { ACTION, MODULE } from "../../CardType"
import type { Module } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { RewriteCard } from "../composite/RewriteCards"
import { WAIT } from "../movement/Wait"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { summonShown } from "../summon/SummonCard"
import { CARTE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** How far ahead a robot stands, in meters. */
const ROBOT_AHEAD = 1

/** How many shield hearts the improvised robot lives by, before the summoning of the unit. */
const ROBOT_HEARTS = 2

/** How many times the hearts of the tank robot are those of a robot. */
const TANK_FACTOR = 2

/** Where a robot stands, from a pose. */
function spotOf(pose: Pose): Vector2 {
    return pose.position.plus(pose.direction.times(ROBOT_AHEAD))
}

/**
 * A robot built from the module plugged into it: a body a little ahead, facing as its unit, with nothing but
 * shield hearts, which plays the cards of the module right after its unit, every round.
 */
export class RobotCard extends AbstractCard<readonly Action[], Module> {


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


    public get(module: Module): readonly Action[] {
        return [RobotCard.#building(this, module)]
    }


    static #building(card: RobotCard, module: Module): Action {
        return {
            use: function* ({ battle, unit }){
                const count = (ROBOT_HEARTS + unit.stats.summon.value) * card.hearts
                const robot = battle.place(unit, {
                    sprite: visual("units/robot"), name: "Robot", at: spotOf(unit), direction: unit.direction,
                    hearts: Heart.many(SHIELD_HEART, count), cards: card.program(module.cards(options => battle.rng.pick(options) ?? options[0])),
                })
                if(robot) module.tune(robot)
                yield* hold(battle, SHORT_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const spot = spotOf(pose)
                if(!battle.free(spot, unit, UNIT_RADIUS)) return still(pose, label(spot, "pas de place", NOTE_COLOR))
                return still(pose, summonShown(spot))
            },
        }
    }
}

/** Cards with a wait between each two. */
function slowed(cards: readonly Card[]): Card[] {
    return cards.flatMap((card, index) => index === 0 ? [card] : [WAIT, card])
}

export const IMPROVISED_ROBOT = new RobotCard("Robot improvisé", [
    "Invoque à ", meters(ROBOT_AHEAD), " devant un robot de ", new HeartCount(ROBOT_HEARTS), " bouclier + invocation, tourné ",
    "comme toi. Juste après toi, à chaque round, il joue les ", CARTE.as("cartes"), " du module.",
], Rarity.RARE, 1, cards => cards)

export const TANK_ROBOT = new RobotCard("Robot tank", [
    "Invoque à ", meters(ROBOT_AHEAD), " devant un robot de ", new HeartCount(ROBOT_HEARTS * TANK_FACTOR),
    " bouclier, ×", String(TANK_FACTOR), " invocation comprise. Juste après toi, à chaque round, il joue les ", CARTE.as("cartes"), " du module, ",
    "en attendant entre chacune.",
], Rarity.RARE, TANK_FACTOR, slowed)

/**
 * The cards of the module on its right, in its place. A module that takes another module to be built (a part
 * fitted on a machine) is not one yet: the weapon has none.
 */
export const IMPROVISED_WEAPON = new RewriteCard("Arme improvisée", [
    "Fin de préparation : se remplace par les ", CARTE.as("cartes"), " du module à sa droite.",
], Rarity.COMMON, (ctx, { next }) => {
    if(!next || !gives(next, MODULE) || next.input !== null) return { cards: [], consumed: 0, acting: false }
    return { cards: next.get(undefined).cards(options => ctx.pick(options)), consumed: 1, acting: false }
})
