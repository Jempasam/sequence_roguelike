import { Color } from "../../../../engine/math"
import type { Rgba } from "../../sim/base/Rgba"
import type { CardType } from "../../sim/card/CardType"
import type { Unit } from "../../sim/battle/Unit"
import type { HeartKind } from "../../sim/heart/HeartKind"

/** The edge around what is being looked at: a heart, a process. */
export const LIT_EDGE = new Color(1, 0.95, 0.6)

/** The engine color of a color of the sim. */
export function engineColor({ r, g, b, a }: Rgba): Color {
    return new Color(r, g, b, a)
}

/** The colors of the card types the interface knows, by name. */
const TYPE_COLORS: Readonly<Record<string, readonly [number, number, number]>> = {
    "action": [0.35, 0.6, 1],
    "préparation": [1, 0.8, 0.3],
    "élément": [0.4, 0.85, 0.45],
    "potion": [0.6, 0.9, 0.2],
    "module": [0.6, 0.7, 0.75],
    "secret": [1, 1, 1],
}

/** A color from a name alone: its hash sets the hue, so the same name is always the same color. */
function hashedColor(name: string): Color {
    let hash = 0
    for(let i = 0; i < name.length; i++) hash = (Math.imul(hash, 31) + name.charCodeAt(i)) >>> 0
    const hue = (hash % 360) / 60
    const channel = (offset: number): number => {
        const k = (offset + hue) % 6
        return 0.75 - 0.45 * Math.max(0, Math.min(k, 4 - k, 1))
    }
    return new Color(channel(5), channel(3), channel(1))
}

const typeColors = new Map<string, Color>()

/**
 * The color a card type is drawn in: its own when known, one hashed from its name otherwise. The color is
 * shared: it is never changed.
 */
export function typeColorOf(type: CardType<unknown>): Color {
    let color = typeColors.get(type.name)
    if(!color){
        const known = TYPE_COLORS[type.name]
        color = known ? new Color(known[0], known[1], known[2]) : hashedColor(type.name)
        typeColors.set(type.name, color)
    }
    return color
}

/** The color a unit is drawn in, the same on the board and in the interface: the one its battle gave it. */
export function colorOf(unit: Unit): Color {
    return engineColor(unit.color)
}

/** The color a heart of a kind is drawn in. */
export function heartColorOf(kind: HeartKind): Color {
    return engineColor(kind.color)
}
