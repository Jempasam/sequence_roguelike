import type { Observable } from "../../base/Observable"
import type { GameMode } from "../GameMode"
import type { SettingValues } from "../Setting"

import { LocalManager } from "./LocalManager"
import type { LocalOptions } from "./LocalManager"

/**
 * A game of a mode played on one client alone, with no network: the manager and the client side of the mode
 * on the same client, the people being those that sit at it. What a network does for a mode, it does with the
 * same rules, so a mode that works here works around a network.
 */
export class LocalGame {


    /** The context the manager of the mode is given. */
    public readonly manager: LocalManager

    constructor(mode: GameMode, values: SettingValues, options: LocalOptions){
        this.manager = new LocalManager(mode, values, options)
    }


    /** Told once when the game is over. */
    public get ended(): Observable<null> {
        return this.manager.ended
    }

    /** Someone joins the game. */
    public join(id: string, name: string, options: SettingValues = {}): ReturnType<LocalManager["addMember"]> {
        return this.manager.addMember(id, name, options)
    }

    /** Start the game, once the first have joined: those that join later are told to the mode all the same. */
    public start(): void {
        this.manager.start()
    }

    /** Stop the game: nothing is told any more. */
    public dispose(): void {
        this.manager.dispose()
    }
}
