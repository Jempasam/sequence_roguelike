import type { Layer, Theme } from "../../../../engine/ui"
import type { Unit } from "../../sim/battle/Unit"
import type { BattleScene, ShownStatus } from "../battle/BattleScene"
import type { UnitSprites } from "../look/UnitSprites"

import type { Process } from "../../sim/process/Process"
import { StatusProcessList } from "./StatusProcessList"

/** The space between the list and the edges of the arena, in virtual pixels. */
const MARGIN = 3

/** How many times larger than the icons over the units its icons are. */
const LIST_SCALE = 2

/**
 * The statuses of a unit, one under the other over the bottom left corner of the arena, each telling
 * when the pointer comes over it or leaves.
 */
export class StatusList {


    constructor(
        public readonly theme: Theme,

        /** The layer it lies in. */
        public readonly layer: Layer,

        public readonly sprites: UnitSprites,

        /** What the pointer coming over a status or leaving it does. */
        public readonly onHover: (unit: Unit, status: ShownStatus, over: boolean) => void,

        /** What the pointer coming over a process or leaving it does. */
        public readonly onProcessHover: (unit: Unit, process: Process, over: boolean) => void,
    ){}


    /** Build the list again for a unit, none for an empty list: its statuses, then its processes. */
    public rebuild(unit: Unit|null, scene: BattleScene): void {
        if(this.#list) this.layer.content.remove(this.#list)
        this.#list = null
        if(!unit || !scene.alive(unit)) return
        const list = new StatusProcessList(this.theme, this.sprites, scene, {
            onStatusHover: this.onHover,
            onProcessHover: this.onProcessHover,
        }, { direction: "column", align: "start", scale: LIST_SCALE })
        list.unit = unit
        if(list.count === 0) return
        this.#list = list
        this.layer.content.add(list)
    }

    /** Lay it over the bottom left corner of a room of the arena, in virtual pixels. */
    public place(room: { readonly left: number, readonly bottom: number }): void {
        const list = this.#list
        if(!list) return
        const { preferredHeight } = list.measure(Infinity)
        this.layer.content.setSlot(list, {
            offsetX: Math.round(room.left + MARGIN), offsetY: Math.round(room.bottom - preferredHeight - MARGIN),
        })
    }


    #list: StatusProcessList|null = null
}
