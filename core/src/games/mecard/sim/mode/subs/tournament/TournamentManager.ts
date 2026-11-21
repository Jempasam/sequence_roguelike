import type { SavedUnit } from "../../../save/battleSave"
import type { GameMember } from "../../GameMember"
import type { GameModeManager } from "../../GameMode"
import type { GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import { lastOne } from "../../lastOne"
import { Settle } from "../../Settle"
import { DuelStage } from "../duel/DuelStage"
import { teamUnits } from "../randomDuel/RandomDuelManager"

import { Bracket } from "./Bracket"
import type { BracketMatch } from "./Bracket"

/** How long the players read who won a match before the next one, in ms. */
export const TOURNAMENT_PAUSE_MS = 3_000

/** How long the players read who won the tournament before they are back in the lobby, in ms. */
export const TOURNAMENT_LINGER_MS = 10_000

/** How long the manager waits for the clients of the lobby before it starts with those that joined, in ms. */
export const TOURNAMENT_JOIN_WAIT_MS = 10_000

/** How often a tournament with too few players looks again for some, in ms. */
export const TOURNAMENT_LOOK_MS = 2_000

/** The key of the state that holds the bracket, which every client is told as it stands. */
export const BRACKET_KEY = "bracket"

/**
 * Where the teams of a tournament come from: a phase before the first match, made by the manager, whose
 * questions the players answer through the `ask` of the context. A mode that fights duels with picked teams
 * gives its own; none gives every player the same team.
 */
export interface TeamPhase {
    /**
     * Make the team of each player, asking them what it needs to.
     *
     * @returns The units of each player, by its id.
     */
    prepare(ctx: GameModeContext, players: readonly GameMember[]): Promise<ReadonlyMap<string, readonly SavedUnit[]>>

    /**
     * Before each game of a match, change the teams that will fight it, asking the members that watch what it
     * needs to.
     *
     * @param watchers - The members that do not fight in this round.
     * @param teams - The units of each fighter, in the order of the fighters.
     * @returns The units to fight with, in the same order.
     */
    adjust?(
        ctx: GameModeContext, fighters: readonly GameMember[], watchers: readonly GameMember[],
        teams: readonly (readonly SavedUnit[])[],
    ): Promise<readonly (readonly SavedUnit[])[]>
}

/**
 * Phases of a tournament one after the other: their teams are made in turn, each one over what the one
 * before made.
 */
export function chainPhases(...phases: readonly TeamPhase[]): TeamPhase {
    return {
        prepare: async(ctx, players) => {
            const teams = new Map<string, readonly SavedUnit[]>()
            for(const phase of phases){
                for(const [id, units] of await phase.prepare(ctx, players)) teams.set(id, units)
            }
            return teams
        },
        adjust: async(ctx, fighters, watchers, teams) => {
            let adjusted = teams
            for(const phase of phases) adjusted = await phase.adjust?.(ctx, fighters, watchers, adjusted) ?? adjusted
            return adjusted
        },
    }
}

/** What a client says to the manager of a tournament. */
export type TournamentAct = {
    /** The match it asks to watch. */
    readonly watch?: number
}

/**
 * A tournament by elimination: the players are drawn into matches of duels, each match is won by whoever
 * wins the most games, and the winners meet in the next round. Those that are out, or go through a round with
 * no fight, watch a match and may choose which.
 *
 * @remarks
 * The manager holds the bracket, has the duels fought by a {@link DuelStage}, and publishes the bracket as a
 * state, so a client that arrives or comes back is told it as it stands. What the teams are is a
 * {@link TeamPhase}'s to say.
 */
export class TournamentManager implements GameModeManager {


    constructor(
        /** How many games a player wins to win its match. */
        private readonly gamesToWin: number,

        /** Where the teams come from: the same one for every player when none is given. */
        private readonly teams: TeamPhase|null = null,
    ){}


    public async run(ctx: GameModeContext): Promise<void> {
        this.#ctx = ctx
        const players = await this.#gather(ctx)
        this.#teams = this.teams ? await this.teams.prepare(ctx, players) : new Map()
        const bracket = new Bracket(players.map(each => each.id), ctx.rng())
        this.#bracket = bracket
        this.#publish()
        while(bracket.champion === null){
            const round = bracket.view().rounds.at(-1)
            ctx.announce(`${round?.title ?? "Tour"} : ${bracket.pending.length} match(s)`)
            const matches = bracket.pending
            await Promise.all(matches.map(match => this.#play(ctx, match, matches)))
        }
        // A player left alone may have won it already: it is told once.
        if(!this.#ending.settle(bracket.champion)) return
        ctx.announce(`Vainqueur du tournoi : ${this.#member(bracket.champion)?.name ?? "?"}`)
        this.#publish()
        await ctx.sleep(TOURNAMENT_LINGER_MS)
        // The clients take the bracket off their screens before they are back in the lobby.
        ctx.unpublish(BRACKET_KEY)
        ctx.end()
    }

    /** A player that quits: its matches are played by bots, and the one that is left alone wins. */
    public onQuit(ctx: GameModeContext, who: GameMember): void {
        if(!this.#bracket) return
        // It stays in the bracket, greyed and with no name, until the end.
        this.#bracket.markGone(who.id)
        this.#publish()
        lastOne(ctx, each => each.connected, this.#ending)
    }

    /** A client asks to watch a match. */
    public onMessage(_ctx: GameModeContext, from: GameMember, message: GameModeShareable): void {
        const { watch } = (message ?? {}) as TournamentAct
        if(typeof watch === "number") this.#watch(from, watch)
    }


    readonly #stage = new DuelStage()

    /** The end of the tournament: its champion, or the player left alone, settled once. */
    readonly #ending = new Settle<string|null>()
    #ctx: GameModeContext|null = null
    #bracket: Bracket|null = null
    #teams: ReadonlyMap<string, readonly SavedUnit[]> = new Map()

    /** The match each member that does not fight asked to watch, or was given. */
    readonly #watching = new Map<string, number>()

    /** The members that are connected: those the tournament is made of. */
    async #gather(ctx: GameModeContext): Promise<readonly GameMember[]> {
        let isLate = false
        void ctx.sleep(TOURNAMENT_JOIN_WAIT_MS).then(() => { isLate = true })
        for(;;){
            const pool = ctx.members().filter(each => each.connected)
            if(pool.length >= 2 && (pool.length >= ctx.expected() || isLate)) return pool
            await Promise.race([ctx.until(ctx.joined, () => true), ctx.sleep(TOURNAMENT_LOOK_MS)])
        }
    }

    #member(id: string|null): GameMember|null {
        if(id === null) return null
        return this.#ctx?.members().find(each => each.id === id) ?? null
    }

    #publish(): void {
        if(this.#bracket) this.#ctx?.publish(BRACKET_KEY, this.#bracket.view() as unknown as GameModeShareable)
    }

    /** Is this member here to fight: connected? */
    #isHere(member: GameMember|null): member is GameMember {
        return member !== null && member.connected
    }

    /** Play the games of a match until a player has won enough, or the other is not there any more. */
    async #play(ctx: GameModeContext, match: BracketMatch, round: readonly BracketMatch[]): Promise<void> {
        const wins = [0, 0]
        const ids = [match.first, match.second as string]
        while(wins[0] < this.gamesToWin && wins[1] < this.gamesToWin){
            const fighters = ids.map(id => this.#member(id))
            const here = fighters.map(each => this.#isHere(each))
            if(!here[0] || !here[1]){
                // The one that is not there loses; both gone, the first goes on, for someone must.
                wins[!here[0] && here[1] ? 1 : 0] = this.gamesToWin
                break
            }
            const members = fighters as GameMember[]
            const own = members.map(each => this.#teams.get(each.id) ?? teamUnits())
            const inRound = new Set(round.flatMap(each => [each.first, each.second ?? ""]))
            const watchers = ctx.members().filter(each => !inRound.has(each.id))
            const teams = await this.teams?.adjust?.(ctx, members, watchers, own) ?? own
            const result = await this.#stage.fight(ctx, match.id, members, teams, handle => {
                this.#seat(ctx, match.id, round, handle)
            })
            if(result === null){
                const lucky = ctx.rng().int(2)
                ctx.announce(`Égalité : le sort donne la manche à ${members[lucky].name}`)
                wins[lucky]++
            } else wins[result]++
            await ctx.sleep(TOURNAMENT_PAUSE_MS)
        }
        this.#bracket?.decide(match.id, wins[0] >= this.gamesToWin ? ids[0] : ids[1])
        this.#publish()
    }

    /**
     * Have the members that do not fight in this round watch the match they asked for, and those that asked
     * for none, a match of the round, one each in turn.
     */
    #seat(
        ctx: GameModeContext, match: number, round: readonly BracketMatch[],
        handle: Parameters<Parameters<DuelStage["fight"]>[4]>[0],
    ): void {
        const fighting = new Set(round.flatMap(each => [each.first, each.second ?? ""]))
        const others = ctx.members().filter(each => !fighting.has(each.id))
        const ids = round.map(each => each.id)
        others.forEach((member, index) => {
            const asked = this.#watching.get(member.id)
            const watched = asked !== undefined && ids.includes(asked) ? asked : ids[index % ids.length]
            if(watched === match) handle.spectate(member)
        })
    }

    /** A member that does not fight asks to watch another match of the round. */
    #watch(who: GameMember, match: number): void {
        const target = this.#stage.fights.get(match)
        if(!target) return
        // One that fights has no say: it is shown its own match.
        if(this.#bracket?.rounds.at(-1)?.some(each => each.first === who.id || each.second === who.id)) return
        for(const fought of this.#stage.fights.values()){
            if(fought !== target) fought.handle.release(who)
        }
        this.#watching.set(who.id, match)
        target.handle.spectate(who)
    }
}
