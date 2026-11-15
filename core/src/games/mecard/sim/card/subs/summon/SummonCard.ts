import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { SUMMON_PALETTE } from "../../../battle/palettes"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { Heart } from "../../../heart/Heart"
import type { HeartKind } from "../../../heart/HeartKind"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"

import { ActionCard } from "../ActionCard"
import { flight, SHORT_TIME, wait } from "../tools/playing"
import type { Rarity } from "../../Rarity"
import type { Visual } from "../../../base/Visual"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How long a thrown body flies, in seconds. */
const THROW_TIME = 0.25

/** The hearts of a body a unit summons, red ones unless a kind is named: its base ones, and the summoning of the unit on top. */
export function summonedHearts(owner: Unit, count: number, kind: HeartKind = RED_HEART): Heart[] {
    return Heart.many(kind, count + owner.stats.summon.value)
}

/** How a summoned body shows in a preview, where it would stand. */
export function summonShown(at: Vector2) {
    return Previews.polygon(Areas.circle(at, UNIT_RADIUS), { ...SUMMON_PALETTE[0], a: 0.45 })
}

/** What a card summons, and how. */
export interface SummonSpec {
    readonly sprite: Visual

    /** What each body is named. */
    readonly name: string

    /** How many hearts each body lives by, before the summoning of the unit. */
    readonly halves: number

    /** What kind of hearts they are, red ones by default. */
    readonly kind?: HeartKind

    /** Where the bodies stand, from where the unit would stand and face. */
    readonly spots: (unit: Unit, pose: Pose) => readonly Vector2[]

    /** Is it thrown there, flying, rather than set down at once? */
    readonly thrown?: boolean

    /** What each body gets once summoned, beyond its hearts and its wearing away. */
    readonly equip?: (battle: Battle, body: Unit, owner: Unit) => void
}

/**
 * A card summoning bodies for its unit: bodies with no deck, out of the order of play, which block the way
 * and draw the aim as any unit, and wear away half a heart at the end of each round.
 */
export class SummonCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,
        public readonly spec: SummonSpec,
    ){
        super(name, description, rarity, SummonCard.#summoning(spec))
    }


    static #summoning(spec: SummonSpec): Action {
        return {
            use: function ({ battle, unit }){
                const spots = spec.spots(unit, unit)
                if(spec.thrown){
                    flight(battle, THROW_TIME, share => {
                        const from = unit.position
                        const flying = spots.map(spot => from.plus(spot.minus(from).times(share)))
                        const color = SUMMON_PALETTE[0]
                        return flying.map(at => Previews.polygon(Areas.circle(at, UNIT_RADIUS / 2), color))
                    })
                }
                for(const spot of spots){
                    if(!battle.arena.inside(spot, UNIT_RADIUS)) continue
                    const hearts = summonedHearts(unit, spec.halves, spec.kind)
                    const body = battle.summon(unit, spec.sprite, spec.name, spot, hearts)
                    if(body) spec.equip?.(battle, body, unit)
                }
                wait(battle, SHORT_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const spots = spec.spots(unit, pose)
                const room = spots.filter(spot => battle.free(spot, unit, UNIT_RADIUS))
                if(room.length === 0) return Previews.still(pose, Previews.label(spots[0] ?? pose.position, "pas de place", NOTE_COLOR))
                return Previews.still(pose, ...room.map(spot => summonShown(spot)))
            },
        }
    }
}
