import { Box } from "../../../../engine/ui"
import type { Layer, Theme } from "../../../../engine/ui"
import type { Unit } from "../../sim/battle/Unit"
import type { Heart } from "../../sim/heart/Heart"
import { SOLID_HEART } from "../../sim/heart/subs/SolidHeartKind"
import type { Process } from "../../sim/process/Process"
import type { UnitSprites } from "../look/UnitSprites"
import type { BattleScene } from "../battle/BattleScene"

import { heartsRow } from "./HeartView"
import { processRow } from "./ProcessView"

/** Does a unit hold nothing but solid hearts, which no wound takes? */
function onlySolid(unit: Unit): boolean {
    return unit.hearts.all.every(heart => heart.kind === SOLID_HEART)
}

/**
 * The hearts of the units over the arena, in a layer of the interface of their own: the same rows as in the
 * panels, moved over their unit at each frame, the icons of their processes under them.
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
    ){}


    /** Build the rows again, one for each unit, from its hearts as shown: after a heart or a unit changed. */
    public rebuild(scene: BattleScene): void {
        const content = this.layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#rows.clear()
        const { litHeart, litProcess } = scene
        for(const { unit, hearts, processes } of scene.living){
            // What holds only solid hearts, a pillar, has no life to show.
            if(onlySolid(unit)) continue
            const block = new Box("column", { gap: 1, align: "center" })
            const lit = litHeart?.unit === unit ? litHeart.indexes : []
            const row = heartsRow(this.theme, hearts, (heart, over) => this.onHover(unit, heart, over), lit)
            block.add(row)
            if(processes.length > 0){
                block.add(processRow(this.theme, this.sprites, processes, (process, over) => {
                    this.onProcessHover(unit, process, over)
                }, litProcess?.unit === unit ? litProcess.process : null))
            }
            this.#rows.set(unit, { block, hearts: row })
            content.add(block)
        }
    }

    /**
     * Move each row over its unit.
     *
     * @param anchorOf - Where the middle of the bottom edge of the hearts of a unit lies, in virtual pixels.
     */
    public place(anchorOf: (unit: Unit) => readonly [number, number]): void {
        for(const [unit, { block, hearts }] of this.#rows){
            const [x, y] = anchorOf(unit)
            const { preferredWidth } = block.measure(Infinity)
            const offsetX = Math.round(x - preferredWidth / 2)
            // The hearts lie on the anchor, the processes under them.
            const offsetY = Math.round(y - hearts.measure(Infinity).preferredHeight)
            this.layer.content.setSlot(block, { offsetX, offsetY })
        }
    }


    /** The hearts and processes of each unit shown, and its row of hearts in them. */
    readonly #rows = new Map<Unit, { readonly block: Box, readonly hearts: Box }>()
}
