import { loadBattle, saveBattle } from "../sim/save/battleSave"
import type { Observer } from "../sim/base/Observable"
import type { Battle } from "../sim/battle/Battle"
import type { BattleSave } from "../sim/save/battleSave"

import type { SyncSource } from "./SyncChannel"
import { readMessage } from "./SyncMessage"
import type { SyncKind, SyncMessage } from "./SyncMessage"

/** What a battle loaded came as: at which moment of its round, and whether it is another battle. */
export interface Loaded {
    readonly kind: SyncKind

    /** Is it another battle than the one watched before, rather than its next round? */
    readonly newBattle: boolean
}

/** A viewer whose own simulation of a round ended elsewhere than where the main client's did. */
export interface Desync {
    /** Which battle of the run, and which round of it. */
    readonly battle: number
    readonly round: number
}

/**
 * A viewer of a battle played elsewhere: it loads each battle the main client sends, and plays the rounds
 * itself, from the chains committed, as the main client does.
 *
 * @remarks
 * It keeps the last message only, and loads it once its own round is over, never in the middle of one: a
 * viewer a little late still sees each round to its end. When even a launch comes while it still plays the
 * round before, it is a whole preparation late, and plays the rest of the round at once to catch up.
 *
 * Loading a preparation over its own, it compares the two first, so a simulation that drifted, which the
 * load hides, is still told.
 */
export class BattleReceiver {


    /** The battle being watched, none before the first message. */
    public battle: Battle|null = null

    /** What hears of each battle loaded, and how it came, nothing when none. */
    public onLoad: ((battle: Battle, loaded: Loaded) => void)|null = null

    /** What hears of a drift of the simulation from the main client's, nothing when none. */
    public onDesync: ((desync: Desync) => void)|null = null

    /**
     * What hears that a message could not be read or loaded. A failure nobody hears is thrown, so it is
     * never silent.
     */
    public onError: ((error: unknown) => void)|null = null

    /**
     * Is the battle watched still being shown, its round played out but not yet seen to its end? What comes
     * meanwhile waits, until {@link BattleReceiver.release}. Never by default.
     */
    public holding: (() => boolean)|null = null

    /**
     * What hears that a launch came while the round before is still being shown: the viewer is a whole
     * preparation late, and should show the rest at once. Nothing by default.
     */
    public onLate: (() => void)|null = null

    constructor(source: SyncSource){
        this.#listening = source.listen(text => this.receive(text))
    }


    /** Take a message in: loaded at once at a rest, after the round being played otherwise. */
    public receive(text: string): void {
        let message: SyncMessage
        try {
            message = readMessage(text)
        } catch(error){
            this.#fail(error)
            return
        }
        if(this.#isStale(message)) return
        this.#pending = message
        const battle = this.battle
        if(!battle?.executing && !this.#held()) this.#loadPending()
        // A whole preparation late: the round being played is cut short, which loads the launch at its end.
        else if(message.kind === "launch"){
            if(battle?.executing) battle.playRound()
            else this.onLate?.()
        }
    }

    /** The battle watched was shown to its end: load what came meanwhile. */
    public release(): void {
        if(!this.battle?.executing && !this.#held()) this.#loadPending()
    }

    /** Stop listening, and leave the battle being watched as it is. */
    public dispose(): void {
        this.#listening.dispose()
        this.#observer?.remove()
    }


    readonly #listening: { dispose(): void }

    /** The last message, waiting for the round being played to end, none when none waits. */
    #pending: SyncMessage|null = null

    /** The battle and the message the battle being watched comes from, none before the first. */
    #loaded: { readonly battle: number, readonly sequence: number }|null = null

    /** What hears of the end of the round of the battle being watched. */
    #observer: Observer|null = null

    #held(): boolean {
        return this.holding?.() ?? false
    }

    /** Is a message older than the one loaded, which a transport out of order may bring? */
    #isStale(message: SyncMessage): boolean {
        const loaded = this.#loaded
        if(!loaded) return false
        if(message.battle !== loaded.battle) return message.battle < loaded.battle
        return message.sequence <= loaded.sequence
    }

    #loadPending(): void {
        const message = this.#pending
        if(!message) return
        this.#pending = null
        try {
            this.#checkDrift(message)
            const battle = loadBattle(message.save)
            if(message.kind === "launch") battle.endPreparation()
            this.#observer?.remove()
            this.#observer = battle.phaseChanged.add(phase => {
                if(phase !== "execution" && !this.#held()) this.#loadPending()
            })
            const newBattle = this.#loaded?.battle !== message.battle
            this.battle = battle
            this.#loaded = { battle: message.battle, sequence: message.sequence }
            this.onLoad?.(battle, { kind: message.kind, newBattle })
        } catch(error){
            this.#fail(error)
        }
    }

    /** Tell when the battle being watched, at the same preparation, is not what the main client sends. */
    #checkDrift(message: SyncMessage): void {
        const battle = this.battle
        // A round played out waits for the next: started here as the main client did, it draws the same.
        const isNext = battle?.waiting && message.kind === "preparation" && battle.round + 1 === message.save.round
        if(battle && isNext && this.#loaded?.battle === message.battle) battle.startRound()
        const isSameRest = battle !== null && message.kind === "preparation" && this.#loaded?.battle === message.battle
            && battle.phase === "preparation" && battle.round === message.save.round
        if(!battle || !isSameRest) return
        const own = comparable(saveBattle(battle, { secret: message.secret }), message.secret)
        if(own !== comparable(message.save, message.secret)) {
            this.onDesync?.({ battle: message.battle, round: message.save.round })
        }
    }

    #fail(error: unknown): void {
        if(!this.onError) throw error
        this.onError(error)
    }
}

/**
 * A save as text, to compare two. With the piles secret, the cards of the hands, the decks and those out of
 * the decks are left out: a viewer drew secret cards where the main client drew real ones.
 */
function comparable(save: BattleSave, secret: boolean): string {
    if(!secret) return JSON.stringify(save)
    const units = save.units.map(unit => {
        return { ...unit, hand: [], decks: unit.decks.map(() => ({ pile: [], discard: [] })), homes: [] }
    })
    return JSON.stringify({ ...save, units })
}
