import { COOP_SEATS, ENEMY_SEATS } from "../../../../sync/run/Seats"
import type { Seatable, SeatMode, SeatPolicy } from "../../../../sync/run/Seats"

/** The side a client plays on in a mixed table: with the party of the host, or against it. */
export type Side = "allié"|"ennemi"

/** A seat of a mixed table, which belongs to a side. */
export interface SidedSeat extends Seatable {
    readonly side: Side
}

/** Who the clients of a table play: the heroes of the party, the enemies it fights, or what each chooses. */
export const PLAYERS = ["héros", "ennemis", "au choix"] as const

/** One of {@link PLAYERS}. */
export type Players = typeof PLAYERS[number]

/**
 * A mixed table: the clients that play the allies are given the heroes of the party, those that play the
 * enemies the enemies of a battle, drawn anew at each battle. The host keeps a hero. The side of a client is
 * the policy's to read.
 *
 * @remarks
 * It remembers the enemies it offered, so the next battle frees the seats of those alone: the heroes stay
 * with the allies.
 */
export function mixedSeats(): SeatMode {
    const enemies = new Set<string>()
    return {
        candidates: ({ heroes, battle, monstersTeam }): readonly SidedSeat[] => {
            const allies = heroes
                .filter(hero => hero.controller === "player")
                .map((hero): SidedSeat => ({ name: hero.name, side: "allié" }))
            if(!battle || battle.round > 0) return allies
            const foes = battle.units
                .filter(unit => unit.team === monstersTeam && unit.decisive)
                .map((unit): SidedSeat => ({ name: unit.name, side: "ennemi" }))
            for(const foe of foes) enemies.add(foe.name)
            return [...allies, ...foes]
        },
        seatHost: (seats, run) => seats.seatHost(run),
        enterBattle: seats => {
            seats.freeIf(name => enemies.has(name))
            enemies.clear()
        },
    }
}

/**
 * The seats of a side among those free, by what a policy picks among them. A seat of no side is an ally's.
 *
 * @param sideOf - The side of a client, the allies' when it has none.
 */
export function sidedSeats(sideOf: (who: string|undefined) => Side, policy: SeatPolicy): SeatPolicy {
    return {
        pick: (free, who, former) => {
            const side = sideOf(who)
            const ofSide = free.filter(each => ((each as Partial<SidedSeat>).side ?? "allié") === side)
            return policy.pick(ofSide, who, former)
        },
    }
}

/** What the clients are given to play, by who they play: a new one each time, as it keeps what it offered. */
export function seatModeOf(players: Players): SeatMode {
    if(players === "ennemis") return ENEMY_SEATS
    if(players === "au choix") return mixedSeats()
    return COOP_SEATS
}
