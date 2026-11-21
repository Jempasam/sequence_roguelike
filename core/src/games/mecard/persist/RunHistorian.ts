import type { SaveSlot } from "../../../engine/save"
import type { Observer } from "../sim/base/Observable"
import type { Run } from "../sim/run/Run"
import { historyEntry } from "../sim/save/historySave"
import type { History } from "../sim/save/historySave"

/**
 * Writes each game that ends in the history of the player's storage: when the party fell, the party as it
 * stood, and how far it went.
 *
 * @remarks
 * Like a {@link RunSaver}, it only reads the run. A failure to write is reported, and that game is lost
 * from the history.
 */
export class RunHistorian {


    /** The run written down when it ends. */
    public get engine(): Run { return this.#engine }

    /** Write another run down instead of this one. */
    public set engine(run: Run){
        this.#observer?.remove()
        this.#engine = run
        if(!this.#isDisposed) this.#register()
    }

    constructor(
        engine: Run,

        /** Where the history is kept. */
        public readonly slot: SaveSlot<History>,

        /** The seed of the run, which the run does not tell. */
        private readonly seed: () => number,

        /** Tell the players that the history could not be written. */
        private readonly report: (text: string) => void,

        /** When it is, in milliseconds since 1970. */
        private readonly now: () => number = Date.now,
    ){
        this.#engine = engine
        this.#register()
    }


    /** Stop writing the history. */
    public dispose(): void {
        this.#isDisposed = true
        this.#observer?.remove()
        this.#observer = null
    }


    #engine: Run
    #observer: Observer|null = null
    #isDisposed = false

    #register(): void {
        this.#observer = this.#engine.defeated.add(run => this.#write(run))
    }

    #write(run: Run): void {
        const entry = historyEntry(run, this.seed(), this.now())
        // Read and written as one operation: two games ending close together both stay in the history.
        this.slot.update(history => ({ entries: [...history?.entries ?? [], entry] })).catch((error: unknown) => {
            this.report(`La partie n'a pas pu être ajoutée à l'historique : ${String(error)}`)
        })
    }
}
