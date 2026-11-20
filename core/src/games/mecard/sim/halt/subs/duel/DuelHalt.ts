import { visual } from "../../../base/Visual"
import { Observable } from "../../../base/Observable"
import { rgba } from "../../../base/Rgba"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { AbstractHalt } from "../AbstractHalt"

/**
 * Where the party waits for the others before a duel: it cannot leave until the duel is over and the halt is
 * released.
 *
 * @remarks
 * It knows nothing of who is waited for, nor of the duel: whoever lays it, a game mode, tells it when the
 * party may go on. Nothing in the generation of the journey lays it.
 */
export class DuelHalt extends AbstractHalt {


    /** The party may leave from now on. */
    public readonly released: Observable<void>

    constructor(run: Run){
        super(DUEL_HALT, run,
            "Les autres arrivent…",
            sceneLook(36, 23, 13, "tavern"),
            {
                hat: "beret",
                clothes: rgba(0.8, 0.25, 0.25),
                hatColor: rgba(0.2, 0.2, 0.25),
            },
        )
        this.released = new Observable(run.report)
    }


    /** Locked until it is released: nobody leaves before the duel is over. */
    public override get locked(): boolean {
        return !this.#isReleased
    }

    /** Let the party leave. Releasing twice changes nothing. */
    public release(): void {
        if(this.#isReleased) return
        this.#isReleased = true
        this.released.notify()
    }

    public start(ctx: HaltContext): void {
        ctx.tell("Les autres arrivent…")
    }


    #isReleased = false
}

/** The sort of the halt of the duels, which no floor lays: a game mode lays it. */
export const DUEL_HALT: HaltType = {
    id: "duel",
    name: "Duel",
    description: "On attend ici que les autres arrivent, puis les équipes s'affrontent.",
    icon: visual("halts/duel", { letter: "DU" }),
    transition: visual("warm-door"),
    create: run => new DuelHalt(run),
}
