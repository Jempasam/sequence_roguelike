import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import { Vector2 } from "../base/Vector2"
import type { Visual } from "../base/Visual"
import type { Area } from "../battle/Area"
import type { Battle, PlacedBody } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import { HAZARD_TEXT } from "./subs/hazardText"
import type { StatusType } from "../status/Status"

/**
 * One body of a hazard of the arena, as it stands from where the hazard is laid: what it is, how far ahead of
 * the hazard and to its right it stands, and what else the hazard gives it. A hazard is made of one body or of
 * several, as an arch is.
 */
export interface HazardBody {
    /** What the body is: its look, its shape, its hearts, the cards it plays, all but where it stands and faces. */
    readonly body: Omit<PlacedBody, "at"|"direction"|"zone">

    /** How far ahead of the hazard it stands, in meters. None by default. */
    readonly forward?: number

    /** How far to the right of the hazard it stands, in meters. None by default. */
    readonly side?: number

    /** The statuses it holds from the start, each of a kind and a level. None by default. */
    readonly statuses?: readonly { readonly type: StatusType, readonly level: number }[]

    /** The ground it covers, from where it stands and faces. None for a body that covers none. */
    ground?(at: Vector2, direction: Vector2): Area

    /** Where it faces, from where the hazard does: as the hazard does by default. */
    facing?(direction: Vector2): Vector2
}

/**
 * A sort of hazard of the arena, one value for each: pillars, walls, holes, cannons, whatever a fight lays out
 * to make the ground it is fought on. Every body of it is a unit of the battle, which acts through the cards
 * it plays and the statuses it holds as any unit does, and belongs to the scenery.
 */
export interface HazardType {
    /** What names it in a command, never shown. Two hazards never share one. */
    readonly id: string

    readonly name: string
    readonly description: Text

    /** Its name, for the console. */
    toString(): string

    /** Its name in its color. */
    toSemString(): Text

    /** Its picture, for what lists the hazards. */
    readonly icon: Visual

    /** Where it faces when a fight does not say: what its bodies are turned from. */
    readonly direction: Vector2

    /** The bodies it is made of. */
    readonly bodies: readonly HazardBody[]

    /**
     * Lay it out in a battle, where it stands and faces.
     *
     * @param direction - Where it faces, its own by default.
     * @returns Its bodies, in order.
     * @throws {@link Error} When a body finds no room: the fight that lays it out put it wrong.
     */
    lay(battle: Battle, at: Vector2, direction?: Vector2): Unit[]
}

/** A hazard, made from all of it but how it is laid out. */
export function hazardType(spec: Omit<HazardType, "lay"|"toString"|"toSemString">): HazardType {
    return {
        ...spec,
        toString: () => spec.name,
        toSemString: () => colored(HAZARD_TEXT, spec.name),
        lay: (battle, at, direction = spec.direction) => spec.bodies.map(each => {
            const position = at.plus(Vector2.relative(direction, each.forward ?? 0, each.side ?? 0))
            const facing = each.facing?.(direction) ?? direction
            const placed = battle.place(null, {
                ...each.body, at: position, direction: facing, zone: each.ground?.(position, facing),
            })
            if(!placed) throw new Error(`There is no room for ${spec.name} at ${position}.`)
            for(const { type, level } of each.statuses ?? []) battle.applyStatus(placed, type, level)
            return placed
        }),
    }
}
