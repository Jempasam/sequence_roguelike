import type { SaveSlot } from "../../../../engine/save"
import type { Observer } from "../../sim/base/Observable"
import type { Run } from "../../sim/run/Run"
import type { RunSave } from "../../sim/save/runSave"

/**
 * Keeps a run in a slot of the player's storage: it writes the run as it stands whenever a halt or a fight
 * is left, and removes it once the party fell.
 *
 * @remarks
 * Like a {@link RunBroadcaster}, it only reads the run: nothing of the game knows it is kept. A failure to
 * write is reported, and the next halt or fight tries again.
 */
export class RunSaver {


    /** The run kept. */
    public get engine(): Run { return this.#engine }

    /** Keep another run in place of this one. Nothing is written until it leaves a halt or a fight. */
    public set engine(run: Run){
        this.#unregisterObservers()
        this.#engine = run
        this.#registerObservers()
    }

    constructor(
        engine: Run,

        /** Where the run is kept. */
        public readonly slot: SaveSlot<RunSave>,

        /** Tell the players that the run could not be kept. */
        private readonly report: (text: string) => void,
    ){
        this.#engine = engine
        this.#registerObservers()
    }


    /** Stop keeping the run. */
    public dispose(): void {
        this.#unregisterObservers()
    }


    #engine: Run
    #observers: Observer[] = []

    #registerObservers(): void {
        const run = this.#engine
        this.#observers = [
            run.travel.visitEnded.add(() => this.#write()),
            run.phaseChanged.add(phase => {
                // A party still entering a place is not back: the map comes later.
                if(phase === "travel" && run.travel.phase === "map") this.#write()
            }),
            run.defeated.add(() => this.#attempt(this.slot.remove(), "effacée")),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** Write the run as it stands, unless it is in a fight or a visit: the save is a rest only. */
    #write(): void {
        const run = this.#engine
        if(run.battle) return
        try {
            this.#attempt(this.slot.save(run.save()), "sauvegardée")
        } catch(error){
            this.report(`La partie n'a pas pu être sauvegardée : ${String(error)}`)
        }
    }

    #attempt(done: Promise<void>, what: string): void {
        done.catch((error: unknown) => {
            this.report(`La partie n'a pas pu être ${what} : ${String(error)}`)
        })
    }
}
