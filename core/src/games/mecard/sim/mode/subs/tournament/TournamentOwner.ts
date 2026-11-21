import type { Battle } from "../../../battle/Battle"
import type { GameModeOwner, InstanceView } from "../../GameMode"
import type { GameModeShareable } from "../../GameModeShareable"
import type { HandleChannel, HeardChannel } from "../../HandleChannel"
import { DuelClient } from "../duel/DuelClient"
import type { DuelBench } from "../duel/DuelClient"

import type { BracketView } from "./Bracket"
import { BRACKET_KEY } from "./TournamentManager"
import type { TournamentAct } from "./TournamentManager"

/** What a tournament asks of the screen, which it knows nothing of. */
export interface TournamentBench extends DuelBench {
    /**
     * Show the bracket as it stands, again each time it changes: between the matches, and to those that
     * are out.
     *
     * @param watch - Ask to watch a match of the round being played, which only one that is not fighting may.
     */
    showBracket(bracket: BracketView, watch: (match: number) => void): void

    /** Take the bracket off the screen: the tournament is over. */
    hideBracket(): void
}

/**
 * What a phase of the teams does on a client: show what it needs of its questions and states. Each part
 * leaves alone what is not its own.
 */
export interface TeamPhaseClient {
    /** A state is told. */
    onState?(key: string, value: GameModeShareable): void

    /** The manager says something. */
    onOrder?(message: GameModeShareable): void

    /** The manager asks something: the answer, or none when the question is not this part's. */
    onAsk?(message: GameModeShareable): GameModeShareable|Promise<GameModeShareable>|undefined
}

/** Phases of a tournament on a client one after the other: each hears everything, the first to answer does. */
export function chainClients(...clients: readonly TeamPhaseClient[]): TeamPhaseClient {
    return {
        onState: (key, value) => clients.forEach(each => each.onState?.(key, value)),
        onOrder: message => clients.forEach(each => each.onOrder?.(message)),
        onAsk: message => {
            for(const each of clients){
                const answer = each.onAsk?.(message)
                if(answer !== undefined) return answer
            }
            return undefined
        },
    }
}

/** The client side of a tournament: the duels, the bracket, and what the phase of the teams asks. */
export class TournamentOwner implements GameModeOwner {


    constructor(
        private readonly bench: TournamentBench,
        private readonly manager: HandleChannel,
        private readonly phase: TeamPhaseClient|null = null,
    ){
        this.#duels = new DuelClient(bench)
    }


    public createBattle(spec: GameModeShareable, manager: HandleChannel): [Battle, HeardChannel] {
        return this.#duels.createBattle(spec, manager)
    }

    public spectateBattle(view: InstanceView<Battle>): { dispose(): void } {
        return this.#duels.spectateBattle(view)
    }

    public onState(key: string, value: GameModeShareable): void {
        if(key !== BRACKET_KEY){
            this.phase?.onState?.(key, value)
            return
        }
        if(value === null) this.bench.hideBracket()
        else {
            const watch = (match: number): void => void this.manager.notify({ watch: match } satisfies TournamentAct)
            this.bench.showBracket(value as unknown as BracketView, watch)
        }
    }

    public onOrder(message: GameModeShareable): void {
        this.phase?.onOrder?.(message)
    }

    public onAsk(message: GameModeShareable): GameModeShareable|Promise<GameModeShareable> {
        return this.phase?.onAsk?.(message) ?? null
    }


    readonly #duels: DuelClient
}
