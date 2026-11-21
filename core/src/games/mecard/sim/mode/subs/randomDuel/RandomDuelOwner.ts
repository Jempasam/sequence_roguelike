import type { Battle } from "../../../battle/Battle"
import type { GameModeOwner, InstanceView } from "../../GameMode"
import type { GameModeShareable } from "../../GameModeShareable"
import type { HandleChannel, HeardChannel } from "../../HandleChannel"
import { DuelClient } from "../duel/DuelClient"
import type { DuelBench } from "../duel/DuelClient"
import type { Removable } from "../../../../../../lifetime"

/** The client side of the random duels: the duel is played by its owner and shown to every player. */
export class RandomDuelOwner implements GameModeOwner {


    constructor(bench: DuelBench){
        this.#duels = new DuelClient(bench)
    }


    public createBattle(spec: GameModeShareable, manager: HandleChannel): [Battle, HeardChannel] {
        return this.#duels.createBattle(spec, manager)
    }

    public spectateBattle(view: InstanceView<Battle>): Removable {
        return this.#duels.spectateBattle(view)
    }


    readonly #duels: DuelClient
}
