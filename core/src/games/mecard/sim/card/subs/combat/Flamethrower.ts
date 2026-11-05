import { ELEMENTAL_COLOR } from "../../../battle/previewColors"
import { damage as damageText, meters } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import { placeFlames } from "../../../hazard/subs/Flames"
import { Burn } from "../../../status/subs/Burn"

import { ActionCard } from "../ActionCard"
import { FLAMES_BURN, FLAMES_DAMAGE } from "../body/BodyCards"
import { sweep } from "../tools/playing"
import { polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How far the flamethrower of the catalog reaches, in meters. */
const FLAME_RANGE = 3

/** How wide the flames of the catalog are, in meters. */
const FLAME_WIDTH = 0.8

/** How many hearts the flamethrower of the catalog takes. */
const FLAME_DAMAGE = 1

/** How many rounds the flamethrower of the catalog sets a unit burning for. */
const FLAME_BURN = 2

/** How long the flames take to reach their length, in seconds. */
const FLAME_TIME = 0.25

/** A band of fire ahead, leaving flames behind for a pass. */
export class FlamethrowerCard extends ActionCard {


    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,

        /** How wide its flames are, in meters. */
        public readonly width: number,

        /** How many hearts it takes. */
        public readonly damage: number,

        /** How many rounds it sets a unit burning for. */
        public readonly burn: number,
    ){
        super("Lance-flammes", [
            "Brûle ", meters(range), " devant : ", damageText(damage, "elemental"), " et ", new Burn(burn),
            ". Les flammes restent un pas de plus : ", damageText(FLAMES_DAMAGE, "elemental"), " et ",
            new Burn(FLAMES_BURN), " à qui s'y trouve encore.",
        ], Rarity.RARE, FlamethrowerCard.#burning(range, width, damage, burn))
    }


    static #burning(range: number, width: number, amount: number, burn: number): Action {
        // The band it burns from a pose, as long as a share of its reach.
        const flames = (pose: Pose, share = 1): Area => {
            const to = pose.position.plus(pose.direction.times(range * share))
            return { kind: "segment", from: pose.position, to, width }
        }
        return {
            use: function* ({ battle, unit }){
                yield* sweep(battle, FLAME_TIME, share => [polygon(flames(unit, share), ELEMENTAL_COLOR)])
                const area = flames(unit)
                for(const target of battle.strike(unit, area, amount, "elemental")){
                    battle.applyStatus(target, new Burn(burn))
                }
                placeFlames(battle, unit, area)
            },
            preview: ({ pose }) => still(pose, polygon(flames(pose), ELEMENTAL_COLOR)),
        }
    }
}

export const FLAMETHROWER = new FlamethrowerCard(FLAME_RANGE, FLAME_WIDTH, FLAME_DAMAGE, FLAME_BURN)
