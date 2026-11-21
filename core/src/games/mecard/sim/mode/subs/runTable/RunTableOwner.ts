import type { Run } from "../../../run/Run"
import type { GameModeOwner, InstanceView } from "../../GameMode"
import type { GameModeShareable } from "../../GameModeShareable"
import { reacting } from "../../HandleChannel"
import type { HandleChannel, HeardChannel } from "../../HandleChannel"

import { TableOwner } from "./TableOwner"
import type { ClientRuns, OwnerOrder, TableRules } from "./TableOwner"

/** The client side of a table: the owner holds the run and plays what no client does, the others are seated. */
export class RunTableOwner implements GameModeOwner {


    constructor(
        private readonly rules: TableRules,
        private readonly bench: ClientRuns,
    ){}


    public createRun(spec: GameModeShareable, manager: HandleChannel): [Run, HeardChannel] {
        const seed = (spec as { seed?: unknown }|null)?.seed
        const run = this.bench.create(typeof seed === "number" ? seed : 0)
        const owner = new TableOwner(run, this.rules, this.bench, manager, typeof seed === "number" ? seed : 0)
        this.#tables.set(run, owner)
        return [run, reacting({
            // The owner of the run: what the manager says, and what a client says on it.
            act: ({ from, message }) => {
                if(from === null) owner.order(message as OwnerOrder)
                else return owner.heard(from, message)
            },
        })]
    }

    public spectateRun(view: InstanceView<Run>): { dispose(): void } {
        const table = this.#tables.get(view.engine)
        if(view.own && table) table.show()
        else this.bench.showSeat(view.engine, view.units, view.ready ?? (() => {}))
        return {
            dispose: () => {
                if(view.own) table?.hide()
                this.bench.hideRun()
            },
        }
    }


    readonly #tables = new WeakMap<Run, TableOwner>()
}
