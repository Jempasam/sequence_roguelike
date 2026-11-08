import type { Theme } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Unit } from "../../sim/battle/Unit"
import type { Process } from "../../sim/process/Process"
import type { BattleScene, ShownStatus } from "../battle/BattleScene"

import type { UnitSprites } from "../look/UnitSprites"
import { PROCESS_ICON_SIZE, STATUS_ICON_SIZE } from "./AbsItemIcon"
import { AbsItemList } from "./AbsItemList"
import type { AbsItem, AbsItemListOptions } from "./AbsItemList"

/** How the player is told what a status is to its unit. */
const POLARITY_WORDS = { negative: "négatif", positive: "positif", neutral: "neutre" } as const

/** What a status is, for the player: `name X (polarity) : description`, X its level as shown. */
export function statusText(shown: ShownStatus): Text {
    const { type, level } = shown
    return concat(type, ` ${level} (${POLARITY_WORDS[type.polarity]}) : `, type.describe(level))
}

/** What a process is, for the player. */
export function processText(process: Process): Text {
    return concat("Processus ", process, " : jusqu'à la fin du round.")
}

/** What a list of the statuses and processes of a unit does when the pointer comes over them. */
export interface StatusProcessListHooks {
    /** What the pointer coming over a status or leaving it does. */
    readonly onStatusHover: (unit: Unit, status: ShownStatus, over: boolean) => void

    /** What the pointer coming over a process or leaving it does. */
    readonly onProcessHover: (unit: Unit, process: Process, over: boolean) => void
}

/**
 * The statuses of a unit, their level written over their icon, then its processes, as the scene shows
 * them. The process being looked at is outlined in yellow.
 */
export class StatusProcessList extends AbsItemList {


    constructor(
        theme: Theme,
        sprites: UnitSprites,
        public readonly scene: BattleScene,
        public readonly hooks: StatusProcessListHooks,
        options: AbsItemListOptions = {},
    ){
        super(theme, sprites, options)
    }


    /** The unit it tells about, none for an empty list. Setting it shows what the scene has for it now. */
    public get unit(): Unit|null { return this.#unit }

    public set unit(unit: Unit|null){
        this.#unit = unit
        this.refresh()
    }

    /** Read the unit again, after its statuses or processes changed. */
    public refresh(): void {
        const unit = this.#unit
        const shown = unit ? this.scene.of(unit) : undefined
        if(!unit || !shown){
            this.set([])
            return
        }
        const lit = this.scene.litProcess?.unit === unit ? this.scene.litProcess.process : null
        const items: AbsItem[] = []
        for(const status of shown.statuses){
            items.push({
                visual: status.type.visual,
                text: String(status.level),
                iconSize: STATUS_ICON_SIZE,
                onHover: over => this.hooks.onStatusHover(unit, status, over),
            })
        }
        for(const process of shown.processes){
            items.push({
                visual: process.icon,
                text: "",
                activation: process === lit ? "" : null,
                iconSize: PROCESS_ICON_SIZE,
                onHover: over => this.hooks.onProcessHover(unit, process, over),
            })
        }
        this.set(items)
    }


    #unit: Unit|null = null
}
