import { NECRO_RECRUIT_HALT } from "../../../halt/subs/necro/NecroRecruitHalt"
import type { Place } from "../../../run/Journey"
import type { Run } from "../../../run/Run"

/** How many halts a run lays before its floor: a tavern, a tavern again, and a free halt. */
export const ENTRY_HALTS = 3

/**
 * What makes a run the run of a necromancer: its party is empty, and the halts it starts with, where a hero
 * would hire a character, are where it recruits its first monsters.
 */
export function setUpNecro(run: Run): void {
    for(const hero of [...run.heroes]) run.fire(hero)
    const { travel } = run
    for(const place of travel.journey.places){
        if(place.layer >= ENTRY_HALTS || !place.halt) continue
        (place as { halt: Place["halt"] }).halt = NECRO_RECRUIT_HALT
    }
    travel.mapDrawn.notify(travel.journey)
}
