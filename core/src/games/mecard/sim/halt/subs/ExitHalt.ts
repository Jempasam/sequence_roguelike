import type { Floor } from "../../floor/Floor"
import type { Run } from "../../run/Run"
import type { HaltContext } from "../HaltContext"
import type { HaltType } from "../HaltType"
import { DOOR_TRANSITION } from "../transitions"
import { AbstractHalt } from "./AbstractHalt"

/**
 * An exit, behind the boss of a floor: the floor it leads to shown, its look and what it holds, and the party
 * asked whether to go in. Cancelled, the other exits stay open.
 */
export class ExitHalt extends AbstractHalt {


    constructor(
        run: Run,

        /** The floor it leads to. */
        public readonly floor: Floor,
    ){
        super(EXIT_HALT, run, floor.type.description, floor.type.look)
    }


    public start(ctx: HaltContext): void {
        const { type, level } = this.floor
        ctx.confirm(`${type.name}, niveau ${level}.`, { cards: [] }, "Entrer", () => {
            this.impact()
            this.run.travel.enterFloor(this.floor)
            ctx.leave()
        })
    }
}

/** The sort of the exits: one leads where the place it stands on says, else to the first floor ahead. */
export const EXIT_HALT: HaltType = {
    id: "exit",
    name: "Sortie",
    description: "Mène à un autre étage.",
    code: "S",
    icon: "mecard/floors/exit.png",
    transition: DOOR_TRANSITION,
    create: run => new ExitHalt(run, run.travel.place?.exitTo ?? run.travel.journey.exits[0]),
}
