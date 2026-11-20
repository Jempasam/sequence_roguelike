import type { SavedUnit } from "@game/core/mecard"
import type { DuelView } from "@game/core/mecard/sync"

/** Wait for the promises of the sync to settle: nothing in the sync waits for a real timer. */
export async function settle(): Promise<void> {
    for(let turn = 0; turn < 20; turn++) await Promise.resolve()
}

/** A unit that cannot be loaded: its hand holds a card the catalog does not have. */
export function brokenUnit(unit: SavedUnit): SavedUnit {
    return { ...unit, hand: ["a card nobody ever made"] }
}

/** What plays for a player: it commits what a bot would, then says it is ready, once a round. */
export class Player {


    constructor(
        public readonly id: string,
        public readonly view: DuelView,
        public readonly ready: () => void,
    ){}


    /** Play what the duel it fights waits for. Nothing is done for a duel only watched, or none. */
    public act(): void {
        const battle = this.view.battle
        if(!battle || battle.phase !== "preparation" || this.view.units.length === 0) return
        if(this.#round === `${this.view.number}:${battle.round}`) return
        this.#round = `${this.view.number}:${battle.round}`
        const mine = new Set(this.view.units)
        for(const unit of battle.awaited.units){
            if(mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
        this.ready()
    }


    #round = ""
}
