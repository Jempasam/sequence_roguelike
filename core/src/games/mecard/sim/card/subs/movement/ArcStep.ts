import { AGILITE, DISTANCE } from "../../../base/keywords"
import { Vector2 } from "../../../base/Vector2"
import type { Action, Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { MergedCard } from "../composite/MergedCard"
import { TURN_AROUND } from "../modifier/Wrappers"
import * as Previews from "../../../battle/preview/Previews"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Walk from "../../../battle/mecanic/walk"

/** How many strides the arc of the catalog takes. */
const ARC_STRIDES = 6

/** How far each stride of the arc goes, in meters, before the move factor of the unit. */
const ARC_STRIDE_LENGTH = 0.5

/** How much the heading turns between two strides, clockwise: 30°, a sixth of a half turn. */
const STRIDE_ANGLE = Math.PI / ARC_STRIDES
const STRIDE_COS = Math.cos(STRIDE_ANGLE)
const STRIDE_SIN = Math.sin(STRIDE_ANGLE)

/** The first heading of the arc, from the facing: 75° to the left, the chord of a sixth of a half circle. */
const FIRST_ANGLE = STRIDE_ANGLE / 2 - Math.PI / 2
const FIRST_COS = Math.cos(FIRST_ANGLE)
const FIRST_SIN = Math.sin(FIRST_ANGLE)

/** The headings of the strides of the arc, from a facing: the first to the side, the last to the other. */
function headings(facing: Vector2): Vector2[] {
    const all = [facing.rotated(FIRST_COS, FIRST_SIN)]
    while(all.length < ARC_STRIDES) all.push(all[all.length - 1].rotated(STRIDE_COS, STRIDE_SIN))
    return all
}

/**
 * How far straight ahead the whole arc goes, in meters, before the move factor of the unit: the diameter of
 * the half circle, what the strides add up to along the facing.
 */
export const ARC_DISTANCE = headings(Vector2.UP).reduce((sum, heading) => sum + heading.dot(Vector2.UP), 0) * ARC_STRIDE_LENGTH

/**
 * A walk along a half circle, setting off to the left: it ends straight ahead of where it started, each
 * stride up to the first obstacle. The unit keeps facing where it faced.
 */
const ARC: Action = {
    use: function (ctx){
        const length = ARC_STRIDE_LENGTH * ctx.unit.stats.move.value
        for(const heading of headings(ctx.unit.direction)){
            if(!ctx.unit.alive) return
            const gone = Walk.travel(ctx, heading, length, Walk.WALK_SPEED)
            if(gone.distance < length - Walk.TRAVEL_SLACK) return
        }
    },
    preview: ({ battle, unit, pose }) => {
        const length = ARC_STRIDE_LENGTH * unit.stats.move.value
        const points = [pose.position]
        const indicators: Indicator[] = []
        let at: Pose = pose
        for(const heading of headings(pose.direction)){
            const travelled = Walk.spot(battle, unit, at.position, heading, length)
            at = { position: travelled.to, direction: heading }
            points.push(travelled.to)
            if(travelled.distance < length - Walk.TRAVEL_SLACK){
                indicators.push(Previews.label(travelled.to, "bloqué", NOTE_COLOR))
                break
            }
        }
        indicators.unshift(Previews.arrow(points, MOVE_WIDTH, MOVE_COLOR))
        return { indicators, pose: { position: at.position, direction: pose.direction } }
    },
}

export const ARC_STEP = new ActionCard("Avancer en arc", [
    WALK.as("Avance"), " de ", ARC_DISTANCE, "×", AGILITE, " ", DISTANCE,
    " droit devant, en demi-cercle : part vers la gauche, sans tourner. S'arrête au premier obstacle.",
], Rarity.RARE, ARC)

/** The arc walked while turning around, at once. */
export const ARC_TURN = new MergedCard([ARC_STEP, TURN_AROUND], { name: "Arc retourné", rarity: Rarity.RARE })
