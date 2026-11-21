import type { Fault } from "../../../../../../engine/net/Fault"
import type { Observer } from "../../../base/Observable"
import { DUEL_HALT } from "../../../halt/subs/duel/DuelHalt"
import type { Run } from "../../../run/Run"

import { DuelLayerFault, signal } from "../../../../sync/faults"
import { detailOf } from "../../../../sync/read"

/**
 * What lays the halts of the duels on the map of a player: a whole row of them, one behind each place of a
 * row, every so many rows, on the floor the party is on and on each floor it enters, so every path of the
 * party goes through the duels. A row that cannot be laid is skipped, and told.
 *
 * @remarks
 * The rows are laid between the rows the map was drawn with, which move down: the party that gets there plays
 * on the map it had, with the duels in the middle. A map that holds halts of the duels is left as it is.
 */
export class DuelLayers {


    /** Told of each row that could not be laid: it is skipped. */
    public readonly faulted = signal<Fault>()

    constructor(
        private readonly run: Run,

        /** One row of the halts of the duels after every this many rows of the map, from that row on. */
        private readonly every: number,

        /** Is a row laid past the last row of the map too, so the party meets the duels before it leaves? */
        private readonly closing = false,
    ){
        this.#observers = [run.travel.floorEntered.add(() => this.lay())]
        this.lay()
    }


    /** Lay the rows on the map as it is now, unless it holds halts of the duels already. */
    public lay(): void {
        const { travel } = this.run
        const { journey } = travel
        if(journey.places.some(place => place.halt === DUEL_HALT)) return
        const rows = journey.layers.length - (journey.exits.length > 0 ? 1 : 0)
        const every = Math.max(1, Math.floor(this.every))
        // Each row laid moves down the rows after it, so the next lies one row further.
        let laid = 0
        const lay = (layer: number): void => {
            try {
                travel.layLayer(DUEL_HALT, layer + laid)
                laid++
            } catch(error){
                this.faulted.notify(new DuelLayerFault(layer + laid, detailOf(error)))
            }
        }
        for(let layer = every; layer < rows; layer += every) lay(layer)
        if(this.closing) lay(rows)
    }

    /** Stop laying them. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
    }


    readonly #observers: readonly Observer[]
}
