import { Admissions } from "../../Admission"
import type { Admission } from "../../Admission"
import type { GameMember } from "../../GameMember"
import type { GameModeManager } from "../../GameMode"
import type { GameModeContext, RunHandle } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"

import type { OwnerOrder, OwnerSaid } from "./TableOwner"
import type { Side } from "./tableSeats"

/**
 * A run several clients play together: the first of its members owns the table and plays what no other
 * does, the others are dealt some of its units, and a client that comes late watches.
 *
 * @remarks
 * What differs among its kinds is what the clients are given to play: the heroes of the party, or the foes.
 * The manager holds no run: it decides who comes in, and gives each client what the owner says it plays. The
 * run is the owner's, a replica of which each other client holds, and the battles follow it. A client says
 * its plans as the intent of its run.
 */
export class RunTableManager implements GameModeManager {


    public run(ctx: GameModeContext): void {
        this.#ctx = ctx
        ctx.joined.add(member => this.#welcome(member))
    }

    public onJoin(ctx: GameModeContext, who: GameMember): Admission {
        if(this.#owner === null) this.#owner = who.id
        this.#sides.set(who.id, who.options.camp === "ennemi" ? "ennemi" : "allié")
        // A table whose owner is gone is over, and takes nobody.
        if(this.#table && !this.#table.valid()) return Admissions.accept()
        if(who.id === this.#owner){
            this.#players.add(who.id)
            return Admissions.accept()
        }
        // The clients of the lobby when the game started play, the owner being one of them; one that comes
        // after them, and is not one that came back, watches: it is let in with no seat.
        if(!this.#known.has(who.id) && this.#known.size >= ctx.expected() - 1) return Admissions.accept()
        this.#known.add(who.id)
        this.#players.add(who.id)
        return Admissions.accept()
    }

    /** A client that left is let go: the game already gave its units to bots if it played any. */
    public onQuit(_ctx: GameModeContext, who: GameMember): void {
        if(who.id === this.#owner) return
        this.#told.delete(who.id)
        this.#players.delete(who.id)
        this.#table?.notify({ left: who.id } satisfies OwnerOrder)
    }


    #ctx: GameModeContext|null = null
    #table: RunHandle|null = null

    /** The id of the member that owns the table, none before the first. */
    #owner: string|null = null

    /** The side each client chose, by its id: the allies' for one that chose none, and for the host. */
    readonly #sides = new Map<string, Side>()

    /** The ids of the clients that took part, to tell one that comes back from one that is late. */
    readonly #known = new Set<string>()

    /** The ids of the members that play: the others, let in late, only watch. */
    readonly #players = new Set<string>()

    /** What each client was last told it plays, to tell it again only when it changes. */
    readonly #told = new Map<string, string>()

    /** The table opens with its owner, and the members it was told of come after. */
    #welcome(member: GameMember): void {
        const ctx = this.#ctx
        if(!ctx) return
        if(!this.#table){
            if(member.id !== this.#owner) return
            const table = ctx.openRun(member, { seed: ctx.rng().int(2 ** 31) })
            this.#table = table
            table.said.add(said => this.#said(said as OwnerSaid))
            // The table is over with its owner: the only party there is has no one to play it.
            table.invalidated.add(() => ctx.end())
            table.spectateAll()
            for(const each of ctx.members()) this.#welcome(each)
            return
        }
        if(member.id === this.#owner || !this.#players.has(member.id)) return
        this.#table.notify({
            joined: { id: member.id, side: this.#sides.get(member.id) ?? "allié" },
        } satisfies OwnerOrder as GameModeShareable)
    }

    /** The owner says who plays what, or that the party fell. */
    #said(said: OwnerSaid): void {
        const ctx = this.#ctx
        if(said.over) ctx?.end()
        if(!said.seating || !ctx || !this.#table) return
        for(const [id, units] of Object.entries(said.seating)) {
            const member = ctx.members().find(each => each.id === id)
            const text = JSON.stringify(units)
            if(!member || this.#told.get(id) === text) continue
            this.#told.set(id, text)
            this.#table.play(member, units)
        }
    }
}
