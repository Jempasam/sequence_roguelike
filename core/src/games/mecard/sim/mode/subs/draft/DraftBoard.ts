import { Fault } from "../../../../../../engine/net/Fault"

/** A pick that cannot be made. */
export class DraftFault extends Fault {


    constructor(public readonly detail: string){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `Ce choix est impossible : ${this.detail}`
    }
}

/** What the draft tells the screens: what is left to pick, whose turn it is, and what each player took. */
export interface DraftView {
    /** The names of the kits left to pick. */
    readonly pool: readonly string[]

    /** The id of the player that picks, none once the draft is over. */
    readonly turn: string|null

    /** How long the player that picks has, in milliseconds, none when the draft is over. */
    readonly turnMs: number|null

    /** The names of the kits each player took, by the id of the player. */
    readonly picks: Readonly<Record<string, readonly string[]>>
}

/**
 * A draft of kits: the players pick in turn from a common pool, each kit going to the one that takes it, in
 * a snake order (the one that picked last of a round picks first of the next).
 */
export class DraftBoard {


    /**
     * @param players - The ids of the players, in the order of the first round.
     * @param pool - The names of the kits that may be picked.
     * @param each - How many kits each player picks.
     */
    constructor(players: readonly string[], pool: readonly string[], each: number){
        this.#pool = [...pool]
        for(const id of players) this.#picks.set(id, [])
        for(let round = 0; round < each; round++){
            this.#order.push(...(round % 2 === 0 ? players : [...players].reverse()))
        }
    }


    /** The id of the player that picks, none once all picks are made or the pool is empty. */
    public get turn(): string|null {
        return this.#pool.length > 0 ? this.#order[this.#next] ?? null : null
    }

    /** The kits left to pick. */
    public get pool(): readonly string[] {
        return this.#pool
    }

    /** The names of the kits a player took. */
    public picksOf(id: string): readonly string[] {
        return this.#picks.get(id) ?? []
    }

    /** A player picks a kit, which only the player whose turn it is may, and only from the pool. */
    public pick(who: string, kit: string): Fault|null {
        if(this.turn === null) return new DraftFault("le draft est fini.")
        if(this.turn !== who) return new DraftFault("ce n'est pas ton tour.")
        const index = this.#pool.indexOf(kit)
        if(index < 0) return new DraftFault(`${kit} n'est plus à prendre.`)
        this.#pool.splice(index, 1)
        this.#picks.get(who)?.push(kit)
        this.#next++
        return null
    }

    /** What the screens are told. */
    public view(turnMs: number|null): DraftView {
        const turn = this.turn
        return {
            pool: [...this.#pool],
            turn,
            turnMs: turn === null ? null : turnMs,
            picks: Object.fromEntries([...this.#picks].map(([id, kits]) => [id, [...kits]])),
        }
    }


    readonly #pool: string[]
    readonly #picks = new Map<string, string[]>()
    readonly #order: string[] = []
    #next = 0
}
