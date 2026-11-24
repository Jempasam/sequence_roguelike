import type { SoundPath } from "../../../../engine/audio"
import type { Rng } from "../../sim/base/Rng"
import type { Visual, VisualColor } from "../../sim/base/Visual"
import type { Cue } from "./Cue"

/** The sound of a unit, among those of the folder of the units. */
function unitCue(file: string): Cue {
    return { path: `mecard/sounds/unit/${file}.ogg` as SoundPath, volume: 1 }
}

/** What a unit nothing else tells is heard by. */
const FALLBACK: Cue = unitCue("fallback")

/** The pictures of the units that have a voice of their own, by the last part of their key. */
const OWN_VOICES: readonly string[] = [
    "acrobat", "animated_bubble", "apothecary", "archer", "artificer", "assassin", "bear", "beast_warrior",
    "berserker", "big_bad_wolf", "black_knight", "bleeder", "boar", "brawler", "brute", "bubble_mage", "bubbler",
    "bull", "bullfighter", "chess_player", "chronomancer", "dark_lord", "demonist", "devil", "druid", "duelist",
    "elf_archer", "elf_assassin", "explosive_goblin", "fire_lizard", "fire_mage", "fisher", "frost_giant",
    "garrison_goblin", "geomancer", "ghost", "ghost_shogun", "glass_man", "goblin", "goblin_mecha", "goblin_pilot",
    "goblin_rider", "goblin_wrestler", "golem", "gravitationist", "gunner", "harpoon_pirate", "haunting_ghost",
    "hawk", "horse", "hunter", "hydra", "hypnotist", "ice_mage", "imp", "iron_knight", "kamikaze_robot", "knight",
    "kraken_captain", "lancer", "lich_king", "mad_alchemist", "mage", "magma_dragon", "mannequin", "martyr",
    "mechanic", "megalaser", "mind_controller", "monster_archer", "ogre_crusher", "orc_battle_shaman", "otter",
    "pikeman", "plague_doctor", "plant_mage", "prestidigitator", "priest", "puppeteer", "pyromancer", "rider",
    "salamander", "shadow_samurai", "shadow_thief", "shaman", "shield_guard", "skeleton_reaper", "slime", "sniper",
    "spectre", "spellblade", "spiritist", "stone_golem", "swamp_sorcerer", "swordsman", "tamer", "taxidermist",
    "tempest_mage", "thorn_tank", "toxic_toad", "troll", "turret_engineer", "vengeful_spirit",
    "wandering_samurai", "werewolf", "witcher", "wolf",
]

/** The sounds that say what a kind of unit is, each with the words of a picture key that tell it. */
const KEYWORD_VOICES: readonly { readonly file: string, readonly words: readonly string[] }[] = [
    { file: "goblin", words: ["goblin", "imp"] },
    { file: "ghost", words: ["ghost", "spirit", "spectre"] },
    { file: "skeleton", words: ["skeleton", "lich", "reaper"] },
    { file: "mage", words: ["mage", "sorcerer", "wizard", "witcher", "spellblade"] },
    { file: "dragon", words: ["dragon", "lizard", "salamander", "hydra"] },
    { file: "beast", words: ["wolf", "bear", "boar", "bull", "horse", "hawk", "otter", "toad"] },
    { file: "golem", words: ["golem", "stone"] },
    { file: "robot", words: ["robot", "mecha", "turret", "mechanic", "engineer"] },
    { file: "slime", words: ["slime", "bubble", "bubbler"] },
    { file: "knight", words: ["knight", "guard", "shield", "iron"] },
    { file: "archer", words: ["archer", "hunter", "sniper", "gunner"] },
    { file: "blade", words: ["assassin", "thief", "samurai", "duelist", "swordsman"] },
    { file: "giant", words: ["giant", "ogre", "troll", "brute"] },
    { file: "rite", words: ["priest", "martyr", "druid", "shaman"] },
    { file: "dark", words: ["devil", "demon", "dark", "black", "shadow", "vengeful"] },
]

/** The hue, in degrees, each color of the wheel goes up to, from red; what is past the last is red again. */
const HUE_LIMITS: readonly { readonly file: string, readonly below: number }[] = [
    { file: "red", below: 15 },
    { file: "orange", below: 45 },
    { file: "yellow", below: 70 },
    { file: "green", below: 165 },
    { file: "cyan", below: 200 },
    { file: "blue", below: 255 },
    { file: "purple", below: 345 },
]

/** The sounds of the colors, from red around the wheel. */
const COLOR_VOICES: readonly string[] = HUE_LIMITS.map(({ file }) => file)

/** The color of the units of no hue, grey or nearly. */
const NEUTRAL_COLOR = "neutral"

/** The saturation below which a color is a grey. */
const GREY_SATURATION = 0.2

/** How many times the hearts of the others a unit has to have to be told a boss. */
export const BOSS_HEARTS_RATIO = 2

/** The chance, from 0 to 1, a unit says its voice when it plays a card, besides the sound of the card. */
export const VOICE_CHANCE = 0.2

/** How loud, as a factor, the voice of a unit that plays a card is: a hint beside the sound of the card. */
export const ACTION_VOICE_VOLUME = 0.1

/** How loud, as a factor, the voice of the first unit to play of a round is. */
export const ROUND_VOICE_VOLUME = 0.25

/** How loud, as a factor, the voice of a unit that enters the battle, summoned or cloned, is. */
export const SPAWN_VOICE_VOLUME = 0.5

/** How long after the sound of a fight the voice of its battle is heard, in milliseconds. */
export const BATTLE_VOICE_DELAY = 2000

/** The same voice, played as loud as the factor says. */
export function quieter(cue: Cue, factor: number): Cue {
    return { ...cue, volume: cue.volume * factor }
}

/** Every sound of the units, for loading them. */
export const UNIT_CUES: readonly Cue[] = [
    ...OWN_VOICES.map(unitCue),
    ...KEYWORD_VOICES.map(({ file }) => unitCue(`keyword/${file}`)),
    ...[...COLOR_VOICES, NEUTRAL_COLOR].map(file => unitCue(`color/${file}`)),
    FALLBACK,
]

/** The pictures that have a voice of their own, for what checks every unit has one. */
export const OWN_VOICE_KEYS: readonly string[] = OWN_VOICES

/** The last part of the key of a picture, which names the unit. */
function nameOf(visual: Visual): string {
    return visual.visual.slice(visual.visual.lastIndexOf("/") + 1)
}

/** The family of a color, from the hue and the saturation: a color of the wheel, or the neutral one. */
function colorFamily([red, green, blue]: VisualColor): string {
    const high = Math.max(red, green, blue)
    const low = Math.min(red, green, blue)
    if(high === 0 || (high - low) / high < GREY_SATURATION) return NEUTRAL_COLOR
    const span = high - low
    let hue: number
    if(high === red) hue = ((green - blue) / span + 6) % 6
    else if(high === green) hue = (blue - red) / span + 2
    else hue = (red - green) / span + 4
    const degrees = hue * 60
    const family = HUE_LIMITS.find(({ below }) => degrees < below)
    return family ? family.file : "red"
}

/**
 * The voice of a unit, from how it looks: its own if its picture has one, else that of the kind its picture
 * is named for, else that of its color, else the generic one.
 */
export function voiceOf(visual: Visual): Cue {
    const name = nameOf(visual)
    if(OWN_VOICES.includes(name)) return unitCue(name)
    const words = name.split("_")
    const kind = KEYWORD_VOICES.find(({ words: kinds }) => words.some(word => kinds.includes(word)))
    if(kind) return unitCue(`keyword/${kind.file}`)
    return unitCue(`color/${colorFamily(visual.coloration ?? visual.color)}`)
}

/** What of a unit the voice of a battle is drawn from. */
export interface VoiceSource {
    readonly sprite: Visual
    readonly hearts: { readonly maxHearts: number }
}

/**
 * The voice heard as a battle starts: that of a boss, a unit with at least {@link BOSS_HEARTS_RATIO} times
 * the average hearts of the others, else that of a unit drawn at random. None when there are none.
 */
export function voiceOfBattle(units: readonly VoiceSource[], rng: Rng): Cue|null {
    if(units.length === 0) return null
    if(units.length > 1){
        const strongest = units.reduce((best, unit) => (
            unit.hearts.maxHearts > best.hearts.maxHearts ? unit : best
        ))
        const others = units.filter(unit => unit !== strongest)
        const average = others.reduce((sum, unit) => sum + unit.hearts.maxHearts, 0) / others.length
        if(strongest.hearts.maxHearts >= average * BOSS_HEARTS_RATIO) return voiceOf(strongest.sprite)
    }
    const unit = rng.pick(units)
    return unit ? voiceOf(unit.sprite) : null
}
