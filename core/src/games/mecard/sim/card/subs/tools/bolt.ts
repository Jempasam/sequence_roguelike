import type { Rgba } from "../../../base/Rgba"
import type { Vector2 } from "../../../base/Vector2"
import type { Visual } from "../../../base/Visual"
import type { Battle } from "../../../battle/Battle"
import type { Element } from "../../../element/Element"

import { SPELL_LOOK } from "./blowLooks"
import { strides } from "../../../battle/mecanic/walk/walk"
import { sampled } from "../../../battle/effects"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How wide a bolt is, in meters: a thin line, which touches the body it stops on. */
export const BOLT_WIDTH = 0.1

/** How fast a bolt flies, in meters per second. */
const BOLT_SPEED = 16

/** How many strides a bolt trails behind its head. */
const BOLT_TAIL = 2

/** How the spell of an element looks: in the hue of its color. */
export function spellLook({ color }: Element): Visual {
    return SPELL_LOOK.with({ coloration: [color.r, color.g, color.b] })
}

/** A bolt flying from a point to another, at its speed: a spit, a harpoon. */
export function fly(battle: Battle, from: Vector2, to: Vector2, color: Rgba): void {
    const seconds = from.distance(to) / BOLT_SPEED
    const lag = BOLT_TAIL / strides(seconds)
    battle.post(sampled(seconds, share => {
        const head = from.plus(to.minus(from).times(share))
        const tail = from.plus(to.minus(from).times(Math.max(0, share - lag)))
        return [Previews.polygon(Areas.line(tail, head, BOLT_WIDTH * 2), color)]
    }))
}
