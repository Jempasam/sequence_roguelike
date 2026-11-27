import type { Sprite } from "../../../../engine/gpu"
import type { Area, Point } from "../../../../engine/math"
import type { ParticleSystem, Random } from "../../../../engine/particles"
import type { Visual } from "../../sim/base/Visual"
import type { FloorType } from "../../sim/floor/Floor"
import { SPRITE_METER } from "../look/spriteModes"
import type { AmbientContext, AmbientUnit } from "../travel/ambient/AmbientContext"
import { isIndoors } from "../travel/ambient/themes"
import type { BattleScreen } from "./BattleScreen"

/** What the ambient of a battle asks of the screen that shows it. */
export type ShownArena = Pick<BattleScreen, "shownBattle"|"arenaSettled"|"terrain"|"meter"|"shownUnits">

/**
 * The ground of a battle as the ambient effects see it: its terrain and its units, under the sky of the floor
 * it is fought on. It has no place, and its walls let no traveler in.
 */
export class BattleAmbientContext implements AmbientContext {

    constructor(
        public readonly alpha: ParticleSystem,
        public readonly additive: ParticleSystem,
        public readonly random: Random,
        public readonly screen: ShownArena,

        /** The sort of floor the battle is fought on. */
        public readonly floor: () => FloorType,

        /** The size of the interface. */
        public readonly size: () => { readonly width: number, readonly height: number },

        public readonly sprite: (visual: Visual|null) => Sprite|null,
        public readonly coin: () => Sprite|null,
    ){}

    /** Its units are drawn as large as the ones of the arena. */
    public get scale(): number {
        return this.screen.meter / SPRITE_METER
    }

    public enabled(): boolean {
        return this.screen.shownBattle !== null
    }

    public settled(): boolean {
        return this.screen.arenaSettled
    }

    public scene(): object|null {
        return this.screen.shownBattle
    }

    public outdoors(): boolean {
        return !isIndoors(this.floor())
    }

    public openEdges(): boolean {
        return false
    }

    public units(): readonly AmbientUnit[] {
        return this.screen.shownUnits
    }

    public places(): ReturnType<AmbientContext["places"]> {
        return []
    }

    public area(): Area {
        return this.screen.terrain ?? { x: 0, y: 0, ...this.size() }
    }

    public heroPosition(): Point|null {
        return null
    }
}
