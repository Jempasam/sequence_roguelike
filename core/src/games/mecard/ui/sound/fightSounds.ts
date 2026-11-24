import type { SoundPath } from "../../../../engine/audio"
import type { FightCategory } from "../../sim/fight/FightCategory"
import type { Cue } from "./Cue"

/** The sound of a fight, among those of the folder of the fights. */
function fightCue(file: string): Cue {
    return { path: `mecard/sounds/fights/${file}.ogg` as SoundPath, volume: 1 }
}

/** What a fight of no known category is heard by. */
const FALLBACK: Cue = fightCue("fallback")

/** The sound of each category of fight, by its id. */
const FIGHT_SOUNDS: ReadonlyMap<string, Cue> = new Map([
    ["battle", fightCue("battle")],
    ["elite", fightCue("elite")],
    ["aggression", fightCue("aggression")],
    ["ambush", fightCue("ambush")],
    ["boss", fightCue("boss")],
])

/** Every sound of the fights, for loading them. */
export const FIGHT_CUES: readonly Cue[] = [...FIGHT_SOUNDS.values(), FALLBACK]

/** The sound heard when a fight begins: the one of its category, else the generic one. */
export function soundOfFight(category: Pick<FightCategory, "id">|null|undefined): Cue {
    return (category && FIGHT_SOUNDS.get(category.id)) || FALLBACK
}
