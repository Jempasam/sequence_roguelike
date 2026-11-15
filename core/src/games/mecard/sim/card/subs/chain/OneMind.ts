import { keywordsOf } from "../../describe"
import { CONTROL_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { DISTANCE, UNIT } from "../../../base/keywords"
import type { Card } from "../../Card"

import { ModifierCard } from "../ModifierCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { inOrder } from "../tools/sequence"
import { Rarity } from "../../Rarity"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the one mind of the catalog reaches around its caster, in meters. */
const ONE_MIND_RANGE = 4

/** How many keywords two cards have to share for one to be changed into the other. */
const SHARED_KEYWORDS = 2

/** How many keywords two cards share, each counted once. */
function sharedKeywords(first: Card, second: Card): number {
    const others = keywordsOf(second)
    return [...keywordsOf(first)].filter(keyword => others.has(keyword)).length
}

/**
 * Can a card be changed into another: it takes and gives the same types, and shares enough keywords with
 * it? A card is never changed into itself, which is nothing to change.
 */
function resembles(card: Card, into: Card, shared: number): boolean {
    if(card === into) return false
    if(card.input !== into.input || card.output !== into.output) return false
    return sharedKeywords(card, into) >= shared
}

/**
 * Around the caster, in a circle: in the chain of each other unit, every card it has not read yet that takes
 * and gives the same as the card on the right of this one, and names as many of the same notions, becomes
 * that card. The caster plays it as it would.
 */
export class OneMindCard extends ModifierCard {


    constructor(
        /** How far it reaches around the caster, in meters. */
        public readonly range: number,

        /** How many keywords a card shares with the one given for it to be changed. */
        public readonly shared: number,
    ){
        super(
            "Pensée unique",
            [
                "Toute ", UNIT, " à ", range, " ", DISTANCE, " autour de toi, alliée ou ennemie, voit ses cartes pas encore lues ",
                "qui prennent et donnent la même chose que la carte donnée et partagent au moins ", shared,
                " mots-clés avec elle devenir cette carte.",
            ],
            Rarity.EPIC, (action, tree) => inOrder([OneMindCard.#convincing(range, shared, tree[0] ?? null), action]),
        )
    }


    static #convincing(range: number, shared: number, given: Card|null): Action {
        const zone = (pose: Pose): Area => (Areas.circle(pose.position, range))
        const reached = (battle: Battle, unit: Unit, pose: Pose): Unit[] => battle.fetch(zone(pose), unit)
        // Which cards of a unit would change.
        const changing = (unit: Unit): Card[] => {
            return given ? unit.unplayed().filter(card => resembles(card, given, shared)) : []
        }
        return {
            use: function ({ battle, unit }){
                const units = reached(battle, unit, unit)
                hold(battle, SHORT_TIME, [Previews.polygon(zone(unit), CONTROL_COLOR)])
                if(!given) return
                for(const target of units) battle.rewriteChain(target, card => resembles(card, given, shared), given)
            },
            preview: ({ battle, unit, pose }) => {
                const shown: Indicator[] = [Previews.polygon(zone(pose), CONTROL_COLOR)]
                for(const target of reached(battle, unit, pose)){
                    const count = changing(target).length
                    if(count > 0) shown.push(Previews.label(target.position, `${count} ➜ ${given}`, NOTE_COLOR))
                }
                return Previews.still(pose, ...shown)
            },
        }
    }
}

export const ONE_MIND = new OneMindCard(ONE_MIND_RANGE, SHARED_KEYWORDS)
