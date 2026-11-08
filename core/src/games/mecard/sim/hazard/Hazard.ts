import type { Text } from "../../../../semantic"
import type { Observer } from "../base/Observable"
import { colored } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"
import type { UnitContext } from "../battle/Action"
import type { Area } from "../battle/Area"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import type { Card } from "../card/Card"
import type { Heart } from "../heart/Heart"
import { BaseStatus } from "../status/BaseStatus"
import type { StatusType } from "../status/Status"

import { HAZARD_TEXT } from "./subs/hazardText"
import type { Visual } from "../base/Visual"

/**
 * What a hazard does, held by the body it is: a status, plugged in and taken back as any, and kept with the
 * body when a battle is saved. A hazard acts only while its body stands.
 */
export abstract class HazardStatus extends BaseStatus {


    public override toString(): string { return this.type.name }

    public override toSemString(): Text { return colored(HAZARD_TEXT, this.toString()) }

    public init(ctx: UnitContext): void {
        this.plug(ctx)
    }

    public remove(): void {
        for(const observer of this.#held) observer.remove()
        this.#held.length = 0
    }


    /** Plug in what it listens to, each kept with {@link HazardStatus.hold}. */
    protected abstract plug(ctx: UnitContext): void

    /** Keep a listener, taken back with the status. */
    protected hold(observer: Observer): void {
        this.#held.push(observer)
    }


    readonly #held: Observer[] = []
}

/** A hazard left in the arena: the body it is, lying on the ground, and what it does. */
export interface HazardSpec {
    readonly sprite: Visual
    readonly name: string

    /** The ground it covers, where its body lies: its middle. */
    readonly zone: Area

    /** What it lives by: its time hearts count its rounds, its solid hearts last. */
    readonly hearts: readonly Heart[]

    /** What it does as it lies there, none for one that only plays its cards: a kind of status and its level. */
    readonly status?: { readonly type: StatusType, readonly level: number }

    /**
     * The cards it plays, right after its owner, none by default: a bomb waits, then blows up. A card
     * plays a step; what happens to whoever comes in is a status.
     */
    readonly cards?: readonly Card[]
}

/**
 * Leave a hazard in the arena for a unit: a body of its team lying on the ground, which takes no room, is
 * aimed at and hit by nobody, and does what its cards and its status say while its hearts last.
 *
 * @returns Its body.
 */
export function placeHazard(battle: Battle, owner: Unit, spec: HazardSpec): Unit|null {
    const body = battle.place(owner, {
        sprite: spec.sprite, name: spec.name, at: middleOf(spec.zone), hearts: spec.hearts, tangible: false,
        zone: spec.zone, cards: spec.cards,
    })
    if(body && spec.status) battle.applyStatus(body, spec.status.type, spec.status.level)
    return body
}

/** The middle of an area, where the body covering it stands. */
function middleOf(area: Area): Vector2 {
    switch(area.kind){
        case "circle":
        case "sector":
            return area.center
        case "segment":
            return area.from.plus(area.to).times(0.5)
        case "crescent":
            return area.center.plus(area.direction.times((area.inner + area.radius) / 2))
        default:
            throw new Error("An area of an unknown kind was covered.")
    }
}
