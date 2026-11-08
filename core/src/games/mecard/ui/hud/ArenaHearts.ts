import { Box } from "../../../../engine/ui"
import type { Layer, Theme } from "../../../../engine/ui"
import type { Unit } from "../../sim/battle/Unit"
import type { Heart } from "../../sim/heart/Heart"
import { SOLID_HEART } from "../../sim/heart/subs/SolidHeartKind"
import type { Process } from "../../sim/process/Process"
import type { UnitSprites } from "../look/UnitSprites"
import type { BattleScene, ShownStatus } from "../battle/BattleScene"

import { heartsRow } from "./HeartView"
import { StatusProcessList } from "./StatusProcessList"

/** Does a unit hold nothing but solid hearts, which no wound takes? */
function onlySolid(unit: Unit): boolean {
    return unit.hearts.all.every(heart => heart.kind === SOLID_HEART)
}

/**
 * The hearts of the units over the arena, in a layer of the interface of their own: the same rows as in the
 * panels, moved over their unit at each frame, the icons of their statuses and processes under it.
 *
 * @remarks
 * The arena is drawn in the world, at its own scale, so the hearts are widgets of the interface laid over
 * it rather than pixels of the world: they look and hover as in the panels.
 */
export class ArenaHearts {


    constructor(
        public readonly theme: Theme,

        /** The layer they lie in, under the panels. */
        public readonly layer: Layer,

        /** The icons of the processes. */
        public readonly sprites: UnitSprites,

        /** What the pointer coming over a heart or leaving it does. */
        public readonly onHover: (unit: Unit, heart: Heart, over: boolean) => void,

        /** What the pointer coming over the icon of a process or leaving it does. */
        public readonly onProcessHover: (unit: Unit, process: Process, over: boolean) => void,

        /** What the pointer coming over the icon of a status or leaving it does. */
        public readonly onStatusHover: (unit: Unit, status: ShownStatus, over: boolean) => void,
    ){}


    /** Build the rows again, one for each unit, from its hearts as shown: after a heart or a unit changed. */
    public rebuild(scene: BattleScene): void {
        const content = this.layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#rows.clear()
        this.#statusRows.clear()
        const { litHeart } = scene
        for(const { unit, hearts } of scene.living){
            const list = new StatusProcessList(this.theme, this.sprites, scene, {
                onStatusHover: this.onStatusHover,
                onProcessHover: this.onProcessHover,
            }, { direction: "row", align: "center" })
            list.unit = unit
            if(list.count > 0){
                this.#statusRows.set(unit, list)
                content.add(list)
            }
            // What holds only solid hearts, a pillar, has no life to show.
            if(onlySolid(unit)) continue
            const lit = litHeart?.unit === unit ? litHeart.indexes : []
            const row = heartsRow(this.theme, hearts, (heart, over) => this.onHover(unit, heart, over), lit)
            this.#rows.set(unit, row)
            content.add(row)
        }
    }

    /**
     * Move each row over its unit.
     *
     * @param anchorOf - Where the middle of the bottom edge of the hearts of a unit lies, in virtual pixels.
     */
    public place(
        anchorOf: (unit: Unit) => readonly [number, number],
        feetOf: (unit: Unit) => readonly [number, number],
    ): void {
        // The statuses and processes lie under the unit, their row centered on it.
        for(const [unit, row] of this.#statusRows){
            const [x, y] = feetOf(unit)
            const { preferredWidth } = row.measure(Infinity)
            this.layer.content.setSlot(row, { offsetX: Math.round(x - preferredWidth / 2), offsetY: Math.round(y) })
        }
        for(const [unit, hearts] of this.#rows){
            const [x, y] = anchorOf(unit)
            const { preferredWidth, preferredHeight } = hearts.measure(Infinity)
            // The hearts lie on the anchor.
            this.layer.content.setSlot(hearts, {
                offsetX: Math.round(x - preferredWidth / 2), offsetY: Math.round(y - preferredHeight),
            })
        }
    }


    /** The row of hearts of each unit shown. */
    readonly #rows = new Map<Unit, Box>()

    /** The statuses and processes of each unit that has any. */
    readonly #statusRows = new Map<Unit, StatusProcessList>()
}
