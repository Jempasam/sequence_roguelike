import type { Battle } from "../../../battle/Battle"
import { loadBattle } from "../../../save/battleSave"
import type { BattleSave } from "../../../save/battleSave"
import type { InstanceView } from "../../GameMode"
import type { GameModeShareable } from "../../GameModeShareable"
import { reacting } from "../../HandleChannel"
import type { HandleChannel, HeardChannel } from "../../HandleChannel"
import type { GameBench } from "../../GameBench"

import { DuelOwner } from "./DuelOwner"
import type { DuelOrder } from "./DuelOwner"
import type { Removable } from "../../../../../../lifetime"

/** What a mode that fights duels asks of the screen, which it knows nothing of. */
export interface DuelBench extends GameBench {
    /**
     * Show a battle to this player: it plans the units it is given and says it is ready, and only watches
     * with none.
     *
     * @param ready - Said when the player is ready.
     */
    showBattle(battle: Battle, units: readonly string[], ready: () => void): void
}

/**
 * The duels of a mode on a client: the owner of one plays it, every client is shown it. A mode that fights
 * duels between its members holds one in its owner and writes nothing of a battle.
 */
export class DuelClient {


    constructor(private readonly bench: DuelBench){}


    /** The battle of a duel on a client: the authority of its owner, who plays it. */
    public createBattle(spec: GameModeShareable, manager: HandleChannel): [Battle, HeardChannel] {
        const battle = loadBattle(spec as unknown as BattleSave)
        const owner = new DuelOwner(
            battle, manager, text => this.bench.report(text),
            (_me, units, ready) => this.bench.showBattle(battle, units, ready),
        )
        this.#owners.set(battle, owner)
        return [battle, reacting({
            act: ({ from, message }) => {
                if(from === null) owner.order(message as DuelOrder)
                else return owner.heard(from.id, message)
            },
        })]
    }

    /** The duel is shown to this client: its owner starts it, the others watch or play it. */
    public spectateBattle(view: InstanceView<Battle>): Removable {
        const owner = this.#owners.get(view.engine)
        if(view.own && owner) owner.show(view.me)
        else this.bench.showBattle(view.engine, view.units, view.ready ?? (() => {}))
        return {
            remove: () => {
                if(view.own) owner?.dispose()
                // The screen leaves the battle when it was shown to its end: it is brought there, never told.
                view.engine.abort()
            },
        }
    }


    readonly #owners = new WeakMap<Battle, DuelOwner>()
}
