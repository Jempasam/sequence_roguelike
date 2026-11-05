import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import { counted } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** How many hearts a burn takes at the end of each round. */
const BURN_DAMAGE = 1

/** A burn: a wound at the end of each round. */
export const BURN = new StatusType("brûlure", rgba(1, 0.55, 0.2), "negative")

/** Burning: a heart lost at the end of each round, for a number of rounds. */
export class Burn implements Status {


    public readonly type = BURN

    constructor(
        /** How many ends of round it still burns for. */
        public rounds: number,
    ){}


    public copy(): Burn { return new Burn(this.rounds) }

    public toString(): string { return `${BURN} ${counted(this.rounds, "round")}` }

    public toSemString(): Text { return [BURN, ` ${counted(this.rounds, "round")}`] }

    public init({ battle, unit }: UnitContext): void {
        this.#observer = battle.roundEnded.add(() => {
            battle.signals.notifyStatus.notify({ unit, status: this })
            unit.hearts.damage(BURN_DAMAGE, "elemental", null)
            this.rounds--
            if(this.rounds <= 0) battle.removeStatus(unit, BURN)
        })
    }

    public remove(): void {
        this.#observer?.remove()
    }

    public shorten(rounds: number): boolean {
        this.rounds -= rounds
        return this.rounds <= 0
    }

    /** A new burn rekindles it: the longer of the two is kept. */
    public merge(incoming: Status): void {
        if(incoming instanceof Burn) this.rounds = Math.max(this.rounds, incoming.rounds)
    }


    #observer?: Observer
}
