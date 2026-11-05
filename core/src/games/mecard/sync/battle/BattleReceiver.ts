import type { Battle } from "../../sim/battle/Battle"
import type { BattleSave } from "../../sim/save/battleSave"

import type { SyncSource } from "../SyncChannel"
import { readBattleMessage } from "./BattleMessage"
import type { BattleMessage } from "./BattleMessage"

/** A viewer whose own simulation of a round ended elsewhere than where the main client's did. */
export interface BattleDesync {
    /** Which battle of the run, and which round of it. */
    readonly number: number
    readonly round: number
}

/**
 * A viewer of a battle played elsewhere: it loads each save the main client sends into its battle, and plays
 * the rounds itself, from the chains committed, as the main client does.
 *
 * @remarks
 * What comes is taken in at once: whatever shows the battle plays it at its own pace, behind it. Loading a
 * save over its own preparation, it compares the two first, so a simulation that drifted, which the load
 * hides, is still told.
 */
export class BattleReceiver {


    /** The battle watched, none between two: what comes then is left out. */
    public engine: Battle|null

    /** What hears of a drift of the simulation from the main client's, nothing when none. */
    public onDesync: ((desync: BattleDesync) => void)|null = null

    /**
     * What hears that a message could not be read or loaded. A failure nobody hears is thrown, so it is
     * never silent.
     */
    public onError: ((error: unknown) => void)|null = null

    constructor(engine: Battle|null, source: SyncSource){
        this.engine = engine
        this.#listening = source.listen(text => this.receive(text))
    }


    /** Take a message in. */
    public receive(text: string): void {
        try {
            const message = readBattleMessage(text)
            const battle = this.engine
            if(!battle || this.#isStale(message)) return
            this.#applySave(battle, message)
            if(message.kind === "launch") battle.advance()
        } catch(error){
            this.#fail(error)
        }
    }

    /** Stop listening, and leave the battle watched as it is. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }

    /** The battle and the message last taken in, none before the first. */
    #loaded: { readonly number: number, readonly sequence: number }|null = null

    /** Is a message older than the one loaded, which a transport out of order may bring? */
    #isStale(message: BattleMessage): boolean {
        const loaded = this.#loaded
        if(!loaded) return false
        if(message.number !== loaded.number) return message.number < loaded.number
        return message.sequence <= loaded.sequence
    }

    #applySave(battle: Battle, message: BattleMessage): void {
        this.#checkDrift(battle, message)
        battle.load(message.save)
        this.#loaded = { number: message.number, sequence: message.sequence }
    }

    /** Tell when the battle watched, at the same preparation, is not what the main client sends. */
    #checkDrift(battle: Battle, message: BattleMessage): void {
        const sameBattle = message.kind === "save" && this.#loaded?.number === message.number
        if(!sameBattle) return
        // A round played out waits for the next: started here as the main client did, it draws the same.
        // Secret cards tell a bot nothing: its chain is then the main client's to tell.
        if(battle.waiting && battle.round + 1 === message.save.round){
            if(message.secret) battle.startRound()
            else battle.advance()
        }
        if(battle.phase !== "preparation" || battle.round !== message.save.round) return
        const own = comparable(battle.save({ secret: message.secret }), message.secret)
        if(own !== comparable(message.save, message.secret)){
            this.onDesync?.({ number: message.number, round: message.save.round })
        }
    }

    #fail(error: unknown): void {
        if(!this.onError) throw error
        this.onError(error)
    }
}

/**
 * A save as text, to compare two. With the piles secret, the cards of the hands, the decks, those out of the
 * decks and the chains of the bots are left out: a viewer drew secret cards where the main client drew real
 * ones, and planned nothing from them.
 */
function comparable(save: BattleSave, secret: boolean): string {
    if(!secret) return JSON.stringify(save)
    const units = save.units.map(unit => {
        return { ...unit, hand: [], decks: unit.decks.map(() => ({ pile: [], discard: [] })), homes: [] }
    })
    return JSON.stringify({ ...save, units, plans: [], played: [] })
}
