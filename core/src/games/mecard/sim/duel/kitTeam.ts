import type { Kit } from "../catalog/kits"
import { Run } from "../run/Run"
import type { SavedUnit } from "../save/battleSave"

import { partyUnits } from "./duelBattle"

/** The units of a team made of these kits, as a new party of them would bring to a duel. */
export function unitsOfKits(kits: readonly Kit[]): readonly SavedUnit[] {
    const run = new Run(0)
    for(const kit of kits) run.hire(kit)
    return partyUnits(run)
}
