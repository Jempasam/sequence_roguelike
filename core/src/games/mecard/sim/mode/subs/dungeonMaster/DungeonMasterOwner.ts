import type { Battle } from "../../../battle/Battle"
import type { GameModeOwner, InstanceView } from "../../GameMode"
import type { GameModeShareable } from "../../GameModeShareable"
import type { HandleChannel, HeardChannel } from "../../HandleChannel"
import { PickerClient } from "../choose/Picker"
import type { PromptBench } from "../choose/Picker"
import type { DraftContext } from "../draft/DraftMode"
import { DuelClient } from "../duel/DuelClient"
import type { DuelBench } from "../duel/DuelClient"
import type { Removable } from "../../../../../../lifetime"

/** What a game with a master asks of the screen. */
export type MasterBench = DuelBench & PromptBench

/** The client side of a game with a master: the encounters are shown, and the master is asked what to put. */
export class DungeonMasterOwner implements GameModeOwner {


    constructor(bench: MasterBench){
        this.#duels = new DuelClient(bench)
        this.#picker = new PickerClient(bench, () => ({ picks: {} }) satisfies DraftContext)
    }


    public createBattle(spec: GameModeShareable, manager: HandleChannel): [Battle, HeardChannel] {
        return this.#duels.createBattle(spec, manager)
    }

    public spectateBattle(view: InstanceView<Battle>): Removable {
        return this.#duels.spectateBattle(view)
    }

    public onOrder(message: GameModeShareable): void {
        this.#picker.onOrder(message)
    }

    public onAsk(message: GameModeShareable): GameModeShareable|Promise<GameModeShareable> {
        return this.#picker.onAsk(message) ?? null
    }


    readonly #duels: DuelClient
    readonly #picker: PickerClient
}
