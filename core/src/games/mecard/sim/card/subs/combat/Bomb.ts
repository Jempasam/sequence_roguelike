import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { HAZARD_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import { counted, damage, meters } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { placeBomb } from "../../../hazard/subs/Bomb"
import { placeFlashBomb } from "../../../hazard/subs/FlashBomb"
import { MINE_ROUNDS, placeMine } from "../../../hazard/subs/Mine"
import { BLAST_RADIUS, BOMB_DAMAGE, FLASH_RADIUS } from "../body/BodyCards"

import { ActionCard } from "../ActionCard"
import { flight } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { UNIT } from "../../../base/keywords"

/** How far ahead the bombs of the catalog land, in meters, before the reach of the unit. */
const BOMB_THROW = 2

/** How far ahead the mines of the catalog land, in meters, before the reach of the unit. */
const MINE_THROW = 1

/** How long a bomb flies, in seconds. */
const THROW_TIME = 0.25

/** The radius a flying bomb is drawn with, in meters. */
const BOMB_SIZE = 0.15

/** How a bomb is left where it lands, thrown by a unit: its body, none when nothing was left. */
type Placing = (battle: Battle, owner: Unit, point: Vector2) => Unit|null

/** A bomb thrown ahead, going off at the next pass. Each bomb says what it leaves, and how far it reaches. */
export class BombCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far ahead it lands, in meters, before the reach of the unit. */
        public readonly throwLength: number,

        /** How far it reaches when it goes off, in meters: what its preview shows. */
        public readonly radius: number,

        /** Leave what it leaves where it lands, thrown by a unit: its body, none when nothing was left. */
        public readonly place: Placing,
    ){
        super(name, description, rarity, BombCard.#throwing(throwLength, radius, place))
    }


    static #throwing(throwLength: number, radius: number, place: Placing): Action {
        const landing = (unit: Unit, pose: Pose): Vector2 => {
            return pose.position.plus(pose.direction.times(throwLength * unit.stats.throwRange.value))
        }
        return {
            use: function* ({ battle, unit }){
                const from = unit.position
                const point = landing(unit, unit)
                if(!battle.arena.inside(point)) return
                yield* flight(battle, THROW_TIME, share => {
                    const center = from.plus(point.minus(from).times(share))
                    return [polygon({ kind: "circle", center, radius: BOMB_SIZE }, HAZARD_COLOR)]
                })
                const bomb = place(battle, unit, point)
                if(bomb) battle.events.push({ type: "status", unit, text: ["lance ", bomb] })
            },
            preview: ({ battle, unit, pose }) => {
                const point = landing(unit, pose)
                if(!battle.arena.inside(point)) return still(pose, label(point, "hors de l'arène", NOTE_COLOR))
                return still(pose, polygon({ kind: "circle", center: point, radius }, HAZARD_COLOR))
            },
        }
    }
}

export const BOMB = new BombCard("Bombe", [
    "Lance une bombe ", meters(BOMB_THROW), " × portée devant. Elle joue juste après toi, attend, puis explose : ",
    damage(BOMB_DAMAGE, "physical"), " à chaque ", UNIT, " à ", meters(BLAST_RADIUS), " autour, toi compris.",
], Rarity.RARE, BOMB_THROW, BLAST_RADIUS, placeBomb)

export const FLASH_GRENADE = new BombCard("Grenade flash", [
    "Lance une grenade ", meters(BOMB_THROW), " × portée devant. Elle joue juste après toi, attend, puis étourdit chaque ", UNIT, " à ",
    meters(FLASH_RADIUS), " autour, toi compris.",
], Rarity.RARE, BOMB_THROW, FLASH_RADIUS, placeFlashBomb)

export const MINE = new BombCard("Mine", [
    "Pose une mine ", meters(MINE_THROW), " × portée devant, pour ", counted(MINE_ROUNDS, "round"), ". Au premier contact, elle explose : ",
    damage(BOMB_DAMAGE, "physical"), " à chaque ", UNIT, " à ", meters(BLAST_RADIUS), " autour, toi compris.",
], Rarity.RARE, MINE_THROW, BLAST_RADIUS, placeMine)
