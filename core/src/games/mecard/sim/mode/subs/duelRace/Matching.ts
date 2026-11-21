import type { Rng } from "../../../base/Rng"

/** How many players a camp holds, for this many players left. */
export interface TeamSize {
    size(players: number): number
}

/** Camps of this many players, whatever the number left. */
export function fixed(count: number): TeamSize {
    return { size: () => Math.max(1, count) }
}

/** Camps of this many players, fewer when too few are left to make two camps of that size. */
export function shrinking(count: number): TeamSize {
    return { size: players => Math.max(1, Math.min(count, Math.floor(players / 2))) }
}

/** A duel to fight: the players of each of its two camps, by their ids. */
export interface MatchedFight {
    readonly sides: readonly [readonly string[], readonly string[]]
}

/** What matching the players makes: the duels, and the players left over, who watch one. */
export interface Matched {
    /** The duels, which are numbered by their place in the list. */
    readonly fights: readonly MatchedFight[]

    /** Each player left out, with the number of the duel it watches. */
    readonly watchers: ReadonlyMap<string, number>
}

/** How the players are made into camps and the camps into duels: polymorphic, so a mode chooses. */
export interface Matching {
    /** The duels of these players, none when they are too few to make one. */
    match(players: readonly string[]): Matched
}

/**
 * The players shuffled, then made into camps of the size the {@link TeamSize} says, two camps a duel. The
 * players left over watch a duel drawn at random.
 *
 * @param rng - What it draws from, its own: the numbers of a run are the simulation's.
 */
export function randomTeams(rng: Rng, teamSize: TeamSize): Matching {
    return {
        match: players => {
            const shuffled = [...players]
            rng.shuffle(shuffled)
            const size = teamSize.size(shuffled.length)
            const fights: MatchedFight[] = []
            while(shuffled.length - fights.length * 2 * size >= 2 * size){
                const from = fights.length * 2 * size
                const first = shuffled.slice(from, from + size)
                const second = shuffled.slice(from + size, from + 2 * size)
                fights.push({ sides: [first, second] })
            }
            const watchers = new Map<string, number>()
            if(fights.length > 0){
                const left = shuffled.slice(fights.length * 2 * size)
                for(const id of left) watchers.set(id, rng.int(fights.length))
            }
            return { fights, watchers }
        },
    }
}
