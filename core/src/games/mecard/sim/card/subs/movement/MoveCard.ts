import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { HAZARD_COLOR, MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { ACTION } from "../../CardType"

import { AbstractCard } from "../AbstractCard"
import { TRAVEL_SLACK, travel, wait } from "../tools/playing"
import { arrow, label, polygon } from "../tools/previews"
import type { Rarity } from "../../Rarity"

/** How far the dashes of the catalog go, in meters, before the move factor of the unit: beyond a step. */
export const DASH_LENGTH = 3

/** How fast the dashes of the catalog go, in meters per second. */
export const DASH_SPEED = 9

/** How long a unit stays still after a move, in seconds, so moves one after the other read apart. */
const SETTLE_TIME = 0.08

/** What befalls the unit a move runs into, or the move stopped by anything, a pillar or a wall. */
export interface Impact {
    /** What the preview says on it. */
    readonly word: string

    /** Does anything stopping the move set it off, a pillar or a wall, rather than only a unit? */
    readonly anything?: boolean

    /** What it reaches, for a unit stopped at a pose, none when it touches only the unit run into. */
    area?(unit: Unit, stop: Pose): Area

    /**
     * Do it where the move stopped, to the unit run into, none for a pillar or a wall.
     *
     * @param mover - The unit that moved.
     */
    strike(battle: Battle, struck: Unit|null, mover: Unit): void
}

/**
 * A card moving its unit a little at each tick, as far as it goes before something is in the way. Each move
 * says which way it goes, and what befalls the unit it runs into.
 */
export abstract class MoveCard extends AbstractCard<readonly Action[]> {


    public readonly output = ACTION
    public readonly input = null

    /** What it plays. */
    public readonly action: Action

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it goes, in meters, before the move factor of the unit. */
        public readonly length: number,

        /** How fast it goes, in meters per second. */
        public readonly speed: number,
    ){
        super(name, description, rarity)
        this.action = MoveCard.#moving(this)
    }


    /** The way it goes from a pose: ahead, or backward. */
    public abstract way(pose: Pose): Vector2

    /** What befalls the unit it runs into, none by default. */
    public impact(): Impact|null {
        return null
    }

    public get(): readonly Action[] {
        return [this.action]
    }


    static #moving(card: MoveCard): Action {
        return {
            use: function* (ctx){
                const distance = card.length * ctx.unit.stats.move.value
                const gone = yield* travel(ctx, card.way(ctx.unit), distance, card.speed)
                const impact = card.impact()
                const stopped = gone.distance < distance - TRAVEL_SLACK && ctx.unit.stats.mobility.value > 0
                if(impact && (gone.struck || (impact.anything && stopped))){
                    impact.strike(ctx.battle, gone.struck, ctx.unit)
                }
                yield* wait(SETTLE_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const distance = card.length * unit.stats.move.value
                const travelled = battle.travel(unit, pose.position, card.way(pose), distance)
                const stop = { position: travelled.to, direction: pose.direction }
                const blocked = travelled.distance < distance - TRAVEL_SLACK
                const impact = card.impact()
                const stopped = travelled.struck !== null || (impact?.anything === true && blocked)
                const hits = impact !== null && stopped
                const indicators = [arrow([pose.position, travelled.to], MOVE_WIDTH, MOVE_COLOR)]
                // What it would reach shows even with nothing in the way yet: anyone may stand there by then.
                if(impact?.area){
                    const color = hits ? HAZARD_COLOR : RANGE_COLOR
                    indicators.unshift(polygon(impact.area(unit, stop), color))
                }
                if(blocked) indicators.push(label(travelled.to, "bloqué", NOTE_COLOR))
                if(hits){
                    const at = travelled.struck?.position ?? travelled.to
                    indicators.push(label(at, impact.word, NOTE_COLOR))
                }
                return { indicators, pose: stop }
            },
        }
    }
}
