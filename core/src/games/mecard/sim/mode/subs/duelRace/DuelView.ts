import type { SyncLink } from "../../../../../../platform"
import { Fault } from "../../../../../../engine/net/Fault"
import type { Observer } from "../../../base/Observable"
import { Arena } from "../../../battle/Arena"
import { Battle } from "../../../battle/Battle"
import { ARENA_SIZE } from "../../../run/formation"

import { BattleGuest } from "../../../../sync/battle/BattleGuest"
import { BattleReceiver } from "../../../../sync/battle/BattleReceiver"
import type { SyncSource } from "../../../../sync/SyncChannel"
import { forward, signal } from "../../../../sync/faults"
import { readDuelFightMessage, readDuelWatchMessage } from "./DuelMessage"
import { DUEL_FIGHT_TOPIC, DUEL_WATCH_TOPIC, duelBattleTopic, duelPlanTopic } from "./modeTopics"

/**
 * How a duel ended for a player that plays these units, by their names there: whether it won, none for a
 * draw, for a duel not over, or for a spectator, who plays none.
 */
export function duelResult(battle: Battle, mine: ReadonlySet<string>): boolean|null {
    const own = battle.units.find(unit => mine.has(unit.name))?.team
    if(!own || !battle.winner) return null
    return battle.winner === own
}

/**
 * The duel a player fights or watches, on its own side of a run: the hub tells which duel it is, and the
 * battle is then taken in as any viewer takes it in, with the plans of the player's units given back.
 *
 * @remarks
 * It never enters a run: it keeps a battle of its own, which a run knows nothing of, so the party and its
 * journey are left as they are. The duel it follows is the last the hub told of; the hub telling the same one
 * again, as it does when a connection comes back, changes nothing.
 */
export class DuelView {


    /** Told when the player fights a duel, with the players of its camp and of the other. */
    public readonly fighting = signal<{
        readonly allies: readonly string[]
        readonly opponents: readonly string[]
    }>()

    /** Told when the player watches a duel, with the players of each camp. */
    public readonly watching = signal<{ readonly sides: readonly (readonly string[])[] }>()

    /** Told when the duel followed is over: whether the player won, none for a draw or for a spectator. */
    public readonly duelOver = signal<boolean|null>()

    /** Told of what could not be read or taken in: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(
        private readonly link: SyncLink,

        /** Where the battles of the duels are heard. */
        private readonly source: SyncSource,
    ){
        this.#listening = [
            DUEL_FIGHT_TOPIC.link(link).listen(text => this.#fight(text)),
            DUEL_WATCH_TOPIC.link(link).listen(text => this.#watch(text)),
        ]
    }


    /** The battle of the duel followed, none when there is none. */
    public get battle(): Battle|null { return this.#battle }

    /** The number of the duel followed, none when there is none. */
    public get number(): number|null { return this.#number }

    /** The units the player plays in the duel, by their names there. */
    public get units(): readonly string[] { return this.#units }

    /** Give the hub what was committed for the units of the player: it is ready. */
    public ready(): void {
        this.#guest?.ready()
    }

    /** Stop following the duel, and listening to the hub. */
    public dispose(): void {
        this.#leave()
        for(const handle of this.#listening) handle.dispose()
    }


    readonly #listening: readonly { dispose(): void }[]
    #battle: Battle|null = null
    #guest: BattleGuest|null = null
    #number: number|null = null
    #units: readonly string[] = []
    #forwarding: { dispose(): void }[] = []
    #observers: Observer[] = []
    #handles: { dispose(): void }[] = []

    #fight(text: string): void {
        const message = readDuelFightMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        if(message.number === this.#number) return
        this.#follow(message.number, message.units)
        this.#watchBattle(new Set(message.units))
        this.fighting.notify({ allies: message.allies, opponents: message.opponents })
    }

    #watch(text: string): void {
        const message = readDuelWatchMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        if(message.number === this.#number) return
        this.#follow(message.number, [])
        this.#watchBattle(new Set())
        this.watching.notify({ sides: message.sides })
    }

    /** Take a duel in, as a viewer takes a battle in: its own battle, loaded from what the hub sends. */
    #follow(number: number, units: readonly string[]): void {
        this.#leave()
        const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), 0)
        const receiver = new BattleReceiver(battle, duelBattleTopic(number).source(this.source))
        this.#handles.push({ dispose: () => receiver.dispose() })
        this.#forwarding.push(forward(receiver, this, false))
        if(units.length > 0){
            const guest = new BattleGuest(battle, duelPlanTopic(number).link(this.link), () => this.#units)
            this.#forwarding.push(forward(guest, this, false))
            this.#guest = guest
        }
        this.#battle = battle
        this.#number = number
        this.#units = units
    }

    /** Tell when the battle is over, and who won it. */
    #watchBattle(mine: ReadonlySet<string>): void {
        const battle = this.#battle
        if(!battle) return
        this.#observers.push(battle.phaseChanged.add(phase => {
            if(phase === "over") this.duelOver.notify(duelResult(battle, mine))
        }))
    }

    #leave(): void {
        for(const handle of this.#handles) handle.dispose()
        for(const handle of this.#forwarding) handle.dispose()
        for(const observer of this.#observers) observer.remove()
        this.#handles = []
        this.#forwarding = []
        this.#observers = []
        this.#guest = null
        this.#battle = null
        this.#number = null
        this.#units = []
    }
}
