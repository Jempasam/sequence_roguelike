import type { SoundPath } from "../../../../engine/audio"
import type { HaltType } from "../../sim/halt/HaltType"
import type { Cue } from "./Cue"

/** How loud the sounds of the halts are, entrance and impact. */
const HALT_VOLUME = 0.5

/** A sound of a halt, among those of a folder: the entrance ones, or the impact ones. */
function haltCue(folder: string, file: string): Cue {
    return { path: `mecard/sounds/${folder}/${file}.ogg` as SoundPath, volume: HALT_VOLUME }
}

/** What a halt has no sound of its own to be heard by. */
const FALLBACK = "fallback"

/** The file of the sounds of each kind of halt, by its id, the same in both folders. */
const HALT_FILES: ReadonlyMap<string, string> = new Map([
    ["darkDemon", "dark_demon"],
    ["darkMadDoctor", "dark_mad_doctor"],
    ["darkMagician", "dark_magician"],
    ["darkStrategist", "dark_strategist"],
    ["darkTavern", "dark_tavern"],
    ["darkTrainer", "dark_trainer"],
    ["necroChest", "necro_chest"],
    ["alchemist", "alchemist"],
    ["altar", "altar"],
    ["antiquarian", "antiquarian"],
    ["butcher", "butcher"],
    ["demon", "demon"],
    ["enchanter", "enchanter"],
    ["forge", "forge"],
    ["removal", "removal"],
    ["strategist", "strategist"],
    ["weaver", "weaver"],
    ["duel", "duel"],
    ["exit", "exit"],
    ["chest", "chest"],
    ["inventor", "inventor"],
    ["magician", "magician"],
    ["merchant", "merchant"],
    ["monster-park", "monster_park"],
    ["shop", "shop"],
    ["tavern", "tavern"],
    ["trainer", "trainer"],
    ["witch", "witch"],
    ["greatChest", "great_chest"],
    ["greatForge", "great_forge"],
    ["greatHospital", "great_hospital"],
    ["greatMagician", "great_magician"],
    ["greatMerchant", "great_merchant"],
    ["greatShop", "great_shop"],
    ["greatWitch", "great_witch"],
    ["masterChest", "master_chest"],
    ["masterInventor", "master_inventor"],
    ["masterMagician", "master_magician"],
    ["masterTrainer", "master_trainer"],
    ["monsterMage", "monster_mage"],
    ["monsterMechanic", "monster_mechanic"],
    ["monsterShaman", "monster_shaman"],
    ["conductor", "conductor"],
    ["necro-recruit", "necro_recruit"],
    ["prompter", "prompter"],
    ["hospital", "hospital"],
    ["madDoctor", "mad_doctor"],
    ["necromancer", "necromancer"],
    ["battleReward", "battle_reward"],
    ["bossReward", "boss_reward"],
    ["eliteReward", "elite_reward"],
    ["monsterLootingReward", "monster_looting_reward"],
])

/** Every sound of the halts, entrance and impact, for loading them. */
export const HALT_CUES: readonly Cue[] = [...HALT_FILES.values(), FALLBACK].flatMap(file => [
    haltCue("halt", file),
    haltCue("halt_impacts", file),
])

/** The sound heard when a halt is entered: its own, else the one every halt without a sound has. */
export function soundOfHalt(type: Pick<HaltType, "id">): Cue {
    return haltCue("halt", HALT_FILES.get(type.id) ?? FALLBACK)
}

/** The sound heard each time a halt changes the run: its own, else the one every halt without a sound has. */
export function soundOfImpact(type: Pick<HaltType, "id">): Cue {
    return haltCue("halt_impacts", HALT_FILES.get(type.id) ?? FALLBACK)
}
