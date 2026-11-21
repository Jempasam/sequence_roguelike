import type { Rng } from "../../../base/Rng"

/** A match of a bracket: two players, or one that goes through with no fight. */
export interface BracketMatch {
    /** Its number in the whole bracket, from the first round on. */
    readonly id: number

    readonly first: string

    /** The opponent, none when `first` goes through with no fight. */
    readonly second: string|null

    /** Who won, none while it is not decided. */
    winner: string|null
}

/** What a bracket tells the screens: the rounds and who stands where, as plain values. */
export interface BracketView {
    readonly rounds: readonly {
        readonly title: string
        readonly matches: readonly {
            readonly id: number
            readonly first: string
            readonly second: string|null
            readonly winner: string|null
        }[]
    }[]

    /** Who won the whole bracket, none while it is played. */
    readonly champion: string|null

    /** The players that left the game, by their id: the screens grey them and give no name for them. */
    readonly gone?: readonly string[]
}

/** The name of a round by how many matches it holds. */
export function roundTitle(matches: number): string {
    if(matches === 1) return "Finale"
    if(matches === 2) return "Demi-finales"
    if(matches === 4) return "Quarts de finale"
    return `Tour de ${matches * 2}`
}

/**
 * The rounds of a tournament by elimination: the players are drawn into matches, those that win meet in the
 * next round, until one is left. An odd player goes through its round with no fight.
 *
 * @remarks
 * It decides nothing of a fight: the mode that plays the matches tells who won each, and the bracket makes
 * the next round once all of one are decided.
 */
export class Bracket {


    /**
     * @param players - The ids of the players, drawn into matches in a random order.
     * @param rng - Where the order comes from.
     */
    constructor(players: readonly string[], rng: Rng){
        const order = [...players]
        for(let index = order.length - 1; index > 0; index--){
            const other = rng.int(index + 1)
            ;[order[index], order[other]] = [order[other], order[index]]
        }
        this.#rounds.push(this.#pair(order))
    }


    /** The rounds made so far, the last one being played. */
    public get rounds(): readonly (readonly BracketMatch[])[] {
        return this.#rounds
    }

    /** The matches of the round being played that are not decided and need a fight. */
    public get pending(): readonly BracketMatch[] {
        return this.#rounds[this.#rounds.length - 1].filter(match => match.winner === null)
    }

    /** Who won the whole bracket, none while it is played. */
    public get champion(): string|null {
        const last = this.#rounds[this.#rounds.length - 1]
        return last.length === 1 ? last[0].winner : null
    }

    /**
     * A match is won. When it was the last of its round, the next round is made, with those that won.
     *
     * @throws {@link Error} When the match is not one of the round being played, or is decided already.
     */
    public decide(id: number, winner: string): void {
        const match = this.#rounds[this.#rounds.length - 1].find(each => each.id === id)
        if(!match || match.winner !== null) throw new Error(`The match ${id} is not one to decide.`)
        if(winner !== match.first && winner !== match.second) throw new Error(`${winner} does not play the match ${id}.`)
        match.winner = winner
        if(this.pending.length > 0 || this.champion !== null) return
        const winners = this.#rounds[this.#rounds.length - 1].map(each => each.winner as string)
        this.#rounds.push(this.#pair(winners))
    }

    /** A player left the game: it stays in the bracket, told as gone. Its matches are played by bots. */
    public markGone(id: string): void {
        this.#gone.add(id)
    }

    /** What the screens are told. */
    public view(): BracketView {
        return {
            gone: [...this.#gone],
            rounds: this.#rounds.map(matches => ({
                title: roundTitle(matches.length),
                matches: matches.map(({ id, first, second, winner }) => ({ id, first, second, winner })),
            })),
            champion: this.champion,
        }
    }


    readonly #rounds: BracketMatch[][] = []
    readonly #gone = new Set<string>()
    #next = 0

    /** The matches of these players two by two; the odd one goes through. */
    #pair(players: readonly string[]): BracketMatch[] {
        if(players.length === 1){
            return [{ id: this.#next++, first: players[0], second: null, winner: players[0] }]
        }
        const matches: BracketMatch[] = []
        for(let index = 0; index < players.length; index += 2){
            const first = players[index]
            const second = players[index + 1] ?? null
            matches.push({ id: this.#next++, first, second, winner: second === null ? first : null })
        }
        return matches
    }
}
