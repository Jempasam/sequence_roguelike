import type { Card } from "../card/Card"
import type { Hero } from "../run/Hero"
import type { Item } from "../item/Item"
import type { Usable } from "../usable/Usable"
import type { HeartGroup } from "../heart/Heart"
import { BLACK_HEART, PINK_HEART, RED_HEART } from "../heart/subs"
import {
    ABOUT_FACE, AIM, ANTIDOTE, ARMOR_PLATING, ASSASSIN_BLOW, ASSASSIN_STEP, ASSASSINATION, BACK_DASH, BANDAGE,
    BATTERING_RAM, BLACK_HOLE, BLAZE_CARD, BLEED, BLINK, BLOCK, BLOOD_AXE, BLOODLUST_CARD, BOMB, BOTTLE,
    BOUNCE_DASH, BOW_MODULE, BRAMBLES_CARD, BULL_MODULE, CATCH, CHARGE, CHARM, COATED_BLADE, COIN, CONFUSION,
    COOL_HEAD, COUNTER_CARD, CROSS_CUT, CROSSBOW, DAGGER, DECOY, DELAYED_CHARGE, DEMON_SLASH, DEMONIC_STRIKE,
    DISARM_CARD, DISTILLATION, DODGE_CARD, DRIZZLE, ECHO, EXPLOSIVE_DASH, EXPLOSIVE_SHELL, FEAR, FIRE,
    FISHING, FLAMETHROWER, FLASH_GRENADE, GRAPPLE, GREAT_THRUST, GRUDGE, HARPOON, HEAD_JUMP, HELD_FURY,
    HEMORRHAGE, HOMING_HEAD, HOOK_ON, HORSE, HUNT, HYPNOSIS, ICY_GLARE, IMPROVISED_ROBOT, IMPROVISED_WEAPON,
    IRON_CHAIN, KNIGHT_MOVE, LASER_LINK, LASSO, LAVA_CARD, LEAP, LIGHTNING, MACHINE_GUN, MARK_CARD, MEGA_LASER,
    MEGA_SLASH, MINE, MIRROR, MISSILE, MUD_CARD, PATH_AIM, PLANT, POISON, PRAYER, PROJECTION, PUDDLE,
    PURSUIT, RAGE, RAGE_FIT, RAMPART, REPEAT_2, REPETITION, RETREAT_SHOT, RICOCHET, SACRIFICE, SCYTHE,
    SENTINEL, SHADOW, SHADOW_AIM, SHADOW_STEP, SHADOW_WAY, SHOCK_WAVE, SHOT, SHOTGUN, SHOUT, SHOUT_TOTEM,
    SIDESTEP, SLASH, SLIDING_PARRY_CARD, SLOWNESS, SMALL_SPELL, SOUL_LINK, SOUL_SHIELD, SPARK, SPELL, SPIRIT_ANCHOR,
    SPIRIT_PROJECTION, SPIT, SPYGLASS_CARD, STEAM_CARD, STEP, STONE, STONE_WALL, STORM_CARD, STUNNING_DASH,
    SUBSTITUTION, SUCTION, SUPER_REPETITION, SUPLEX, SWEEP, TACKLE, TASER, TAUNT, THORN_SHIELD, THROWN_POTION,
    THRUSTERS, THRUST, THRUST_CHARGE, TIDE, TOTEM, TURN_LEFT, TURN_RIGHT, TURRET, VINE, VULNERABILITY, WAIT,
    WATER, WEAKNESS, WIND, WOODEN_SHIELD_CARD,
} from "../card/subs"
import {
    BACK_EYES, ALEMBIC, BOOTS, BLOOD_PACT, CHIPPED_BLADE, DEMON_FANG, DODGE_SCEPTER, DOLL, ECHO_ITEM, ELEMENT_BAG,
    FANG, FISHER_GLOVE, GEAR, GRIMOIRE, HOURGLASS, MAGNET, ROSARY, SCARY_MASK, SCOPE, SPYGLASS, STICKY_SOLES,
    STRENGTH_BELT, TORERO_CAPE, WHETSTONE,
} from "../item/subs"
import {
    BLOOD_FLASK, CALM_INFUSION, COCAINE, COOL_SYRUP, DEMON_ELIXIR, ENERGIZER, FIRE_FLASK, FISHING_CARD,
    FOLDING_TURRET, FURY_ELIXIR, GLUE_FLASK, GLUE_TUBE, HASTE_ELIXIR, HEALING_POTION, INFLATABLE_DECOY,
    MAGIC_WATCH, PLANT_BAG, SHARPENING_STONE, SHIELD_FLASK, STRENGTH_ELIXIR, THRUST_BOTTLE, WHISTLE, WRENCH,
} from "../usable/subs"
import {
    BIG_SHOTGUN, BLOODY_COMBO, BLUE_VENGEANCE, COVERING_FIRE, CRUSH, HUNTER_FUSION, MEGA_THRUST, QUAKE_SEISM,
    SHADOW_COMBO, SPIRIT_DASH, SURPRISE_THRUST, TWIN_BLADES,
} from "./cards"
import type { Visual } from "../base/Visual"
import { visual } from "../base/Visual"

/** The cards every kit starts with before its attacks: moves, turns, aims and a wait. A dodge ends it. */
const BASICS: readonly Card[] = [STEP, STEP, STEP, BACK_DASH, TURN_LEFT, TURN_RIGHT, AIM, AIM, WAIT]

/** The basics of the kits that fight up close: one of their aims finds the way to the enemy. */
const CLOSE_BASICS: readonly Card[] = BASICS.map((card, index) => {
    return index === BASICS.indexOf(AIM) ? PATH_AIM : card
})

/** How many red hearts a kit defined without hearts starts with. */
export const KIT_HEARTS = 6

/** Some red hearts. */
function reds(count: number): HeartGroup {
    return { kind: RED_HEART, count }
}

/** Some black hearts. */
function blacks(count: number): HeartGroup {
    return { kind: BLACK_HEART, count }
}

/** Some pink hearts. */
function pinks(count: number): HeartGroup {
    return { kind: PINK_HEART, count }
}

/** A deck to start with: the basics, the attacks, then a dodge. */
function deckAround(...attacks: Card[]): Card[] {
    return [...BASICS, ...attacks, DODGE_CARD]
}

/** The cards a hero starts a run with: the basics, three copies of its attack, and a dodge. */
export function starterDeck(attack: Card): Card[] {
    return deckAround(attack, attack, attack)
}

/** A deck to start with for a kit that fights up close: its basics, the attacks, then a dodge. */
function closeDeckAround(...attacks: Card[]): Card[] {
    return [...CLOSE_BASICS, ...attacks, DODGE_CARD]
}

/**
 * What a hero starts with, at the start of a run or hired on the way: a name, a deck, items, usables and
 * hearts. A hero is known by its deck: the Lancier by its thrusts, the Épéiste by its slashes.
 *
 * @remarks
 * It holds kinds, never what a hero carries: its items and usables are the shared definitions, and
 * {@link heroOf} makes the mutable ones (the copy of the items, a {@link Carried} for each usable).
 */
export interface Kit {
    readonly name: string

    /** How its character looks. */
    readonly sprite: Visual

    readonly cards: readonly Card[]

    /** The items the hero starts with. */
    readonly items: readonly Item[]

    /** The usables the hero starts with, each with all its charges. */
    readonly usables: readonly Usable[]

    /** The hearts the hero starts with: red ones, then at most one other kept kind. */
    readonly hearts: readonly HeartGroup[]
}

export const LANCER_KIT: Kit = {
    name: "Lancier",
    sprite: visual("units/lancer"),
    cards: closeDeckAround(THRUST, THRUST, GREAT_THRUST, THRUST_CHARGE, LEAP),
    items: [WHETSTONE],
    usables: [THRUST_BOTTLE],
    hearts: [reds(4)],
}

export const SWORDSMAN_KIT: Kit = {
    name: "Épéiste",
    sprite: visual("units/swordsman"),
    cards: closeDeckAround(SLASH, SLASH, CROSS_CUT, COUNTER_CARD, SLIDING_PARRY_CARD),
    items: [],
    usables: [SHARPENING_STONE],
    hearts: [reds(4), blacks(2)],
}

export const ARCHER_KIT: Kit = {
    name: "Archère",
    sprite: visual("units/archer"),
    cards: deckAround(SHOT, SHOT, CROSSBOW, RICOCHET, RETREAT_SHOT),
    items: [SCOPE],
    usables: [],
    hearts: [reds(4)],
}

export const BRAWLER_KIT: Kit = {
    name: "Bagarreur",
    sprite: visual("units/brawler"),
    cards: closeDeckAround(SWEEP, SWEEP, SUPLEX, TACKLE, BLOCK, RAMPART),
    items: [],
    usables: [STRENGTH_ELIXIR],
    hearts: [reds(5), pinks(1)],
}

export const ARTIFICER_KIT: Kit = {
    name: "Artificière",
    sprite: visual("units/artificer"),
    cards: deckAround(BOMB, BOMB, MINE, FLASH_GRENADE, SHOT, SHOT),
    items: [],
    usables: [FIRE_FLASK],
    hearts: [reds(4)],
}

export const MAGE_KIT: Kit = {
    name: "Mage",
    sprite: visual("units/mage"),
    cards: deckAround(SPELL, SPELL, SPELL, FIRE, WATER, STONE, WIND, LIGHTNING, ECHO),
    items: [GRIMOIRE],
    usables: [MAGIC_WATCH],
    hearts: [reds(4), blacks(2)],
}

export const ASSASSIN_KIT: Kit = {
    name: "Assassin",
    sprite: visual("units/assassin"),
    cards: closeDeckAround(DAGGER, DAGGER, DAGGER, ASSASSIN_STEP, BLINK, SHADOW_STEP, ASSASSINATION),
    items: [],
    usables: [HASTE_ELIXIR],
    hearts: [reds(5)],
}

export const APOTHECARY_KIT: Kit = {
    name: "Apothicaire",
    sprite: visual("units/apothecary"),
    cards: deckAround(
        THROWN_POTION, THROWN_POTION, BOTTLE, POISON, POISON, WEAKNESS, SLOWNESS, DISTILLATION, PUDDLE,
    ),
    items: [ALEMBIC],
    usables: [PLANT_BAG],
    hearts: [reds(6)],
}

export const PUPPETEER_KIT: Kit = {
    name: "Marionnettiste",
    sprite: visual("units/puppeteer"),
    cards: deckAround(COIN, COIN, SUBSTITUTION, STONE_WALL, SHOT, SHOT, DECOY, TOTEM, CHARM),
    items: [DOLL],
    usables: [INFLATABLE_DECOY],
    hearts: [reds(6)],
}

export const MECHANIC_KIT: Kit = {
    name: "Mécanicien",
    sprite: visual("units/mechanic"),
    cards: deckAround(IMPROVISED_ROBOT, IMPROVISED_ROBOT, IMPROVISED_WEAPON, BOW_MODULE, BULL_MODULE, MISSILE),
    items: [],
    usables: [WRENCH],
    hearts: [reds(4)],
}

export const HUNTER_KIT: Kit = {
    name: "Chasseur",
    sprite: visual("units/hunter"),
    cards: deckAround(SHOT, SHOT, HUNT, HARPOON, MACHINE_GUN, HUNTER_FUSION, MINE, SPYGLASS_CARD, CROSSBOW),
    items: [SPYGLASS],
    usables: [WHISTLE],
    hearts: [reds(5)],
}

export const BERSERKER_KIT: Kit = {
    name: "Berserker",
    sprite: visual("units/berserker"),
    cards: closeDeckAround(
        SLASH, SLASH, BLOOD_AXE, BLOODLUST_CARD, RAGE, RAGE_FIT, HELD_FURY, DEMON_SLASH,
    ),
    items: [DEMON_FANG],
    usables: [FURY_ELIXIR],
    hearts: [reds(4), blacks(2)],
}

export const PYROMANCER_KIT: Kit = {
    name: "Pyromancien",
    sprite: visual("units/pyromancer"),
    cards: deckAround(
        SPELL, FIRE, FIRE, FLAMETHROWER, FLAMETHROWER, SPARK, SPARK, BLAZE_CARD, LAVA_CARD, EXPLOSIVE_SHELL,
        SLOWNESS, BLOCK,
    ),
    items: [ELEMENT_BAG],
    usables: [FIRE_FLASK],
    hearts: [reds(6)],
}

export const PRIEST_KIT: Kit = {
    name: "Prêtre",
    sprite: visual("units/priest"),
    cards: deckAround(SLASH, PRAYER, BANDAGE, SOUL_SHIELD, ANTIDOTE, BLOCK),
    items: [ROSARY],
    usables: [HEALING_POTION],
    hearts: [reds(5)],
}

export const FISHER_KIT: Kit = {
    name: "Pêcheur",
    sprite: visual("units/fisher"),
    cards: deckAround(FISHING, FISHING, SLASH, LASSO, GRAPPLE, HOOK_ON, IRON_CHAIN, CATCH, SUCTION),
    items: [FISHER_GLOVE],
    usables: [FISHING_CARD],
    hearts: [reds(6)],
}

export const SPIRITIST_KIT: Kit = {
    name: "Spirite",
    sprite: visual("units/spiritist"),
    cards: deckAround(
        SHOT, SHOT, CROSSBOW, SPIRIT_ANCHOR, SPIRIT_PROJECTION, SHADOW, SOUL_LINK, LASER_LINK, MEGA_LASER,
    ),
    items: [],
    usables: [CALM_INFUSION],
    hearts: [reds(5)],
}

export const BULLFIGHTER_KIT: Kit = {
    name: "Torero",
    sprite: visual("units/bullfighter"),
    cards: closeDeckAround(
        SLASH, SLASH, STUNNING_DASH, ABOUT_FACE, ICY_GLARE, TASER, DECOY, TAUNT, COUNTER_CARD, RAMPART,
    ),
    items: [TORERO_CAPE],
    usables: [WHISTLE],
    hearts: [reds(6)],
}

export const CHRONOMANCER_KIT: Kit = {
    name: "Chronomancien",
    sprite: visual("units/chronomancer"),
    cards: deckAround(THRUST, THRUST, SHOT, REPETITION, SUPER_REPETITION, REPEAT_2, DELAYED_CHARGE, MIRROR),
    items: [ECHO_ITEM],
    usables: [MAGIC_WATCH],
    hearts: [reds(5)],
}

export const RIDER_KIT: Kit = {
    name: "Cavalier",
    sprite: visual("units/rider"),
    cards: closeDeckAround(
        THRUST, THRUST, SLASH, HORSE, KNIGHT_MOVE, CHARGE, BATTERING_RAM, BOUNCE_DASH, HEAD_JUMP, STUNNING_DASH,
    ),
    items: [BOOTS],
    usables: [HASTE_ELIXIR],
    hearts: [reds(5)],
}

export const MARTYR_KIT: Kit = {
    name: "Martyr",
    sprite: visual("units/martyr"),
    cards: closeDeckAround(
        SACRIFICE, SACRIFICE, SWEEP, SCYTHE, BLOCK, BLUE_VENGEANCE, GRUDGE, DEMONIC_STRIKE,
    ),
    items: [BLOOD_PACT],
    usables: [SHIELD_FLASK],
    hearts: [reds(6), pinks(1)],
}

export const EXPLOSIVE_GOBLIN_KIT: Kit = {
    name: "Gobelin Explosif",
    sprite: visual("units/explosive_goblin"),
    cards: closeDeckAround(SLASH, SLASH, BOMB, BOMB, EXPLOSIVE_DASH),
    items: [],
    usables: [FIRE_FLASK],
    hearts: [reds(4)],
}

export const GRAVITATIONIST_KIT: Kit = {
    name: "Gravitationniste",
    sprite: visual("units/gravitationist"),
    cards: deckAround(SHOT, SHOT, SUCTION, BLACK_HOLE, QUAKE_SEISM, SHOCK_WAVE, TIDE, PROJECTION),
    items: [MAGNET],
    usables: [GLUE_FLASK],
    hearts: [reds(6)],
}

export const DRUID_KIT: Kit = {
    name: "Druide",
    sprite: visual("units/druid"),
    cards: deckAround(PLANT, PLANT, BRAMBLES_CARD, THORN_SHIELD, VINE, ANTIDOTE, SLASH),
    items: [],
    usables: [HEALING_POTION],
    hearts: [reds(6)],
}

export const GUNNER_KIT: Kit = {
    name: "Canonnier",
    sprite: visual("units/gunner"),
    cards: deckAround(SHOTGUN, SHOTGUN, BIG_SHOTGUN, MACHINE_GUN, COVERING_FIRE),
    items: [],
    usables: [ENERGIZER],
    hearts: [reds(5)],
}

export const HYPNOTIST_KIT: Kit = {
    name: "Hypnotiseur",
    sprite: visual("units/hypnotist"),
    cards: deckAround(SHOT, SHOT, HYPNOSIS, CHARM, FEAR, SHOUT, ICY_GLARE, SLASH),
    items: [SCARY_MASK],
    usables: [WHISTLE],
    hearts: [reds(6)],
}

export const KNIGHT_KIT: Kit = {
    name: "Chevalier",
    sprite: visual("units/knight"),
    cards: closeDeckAround(
        SLASH, SLASH, BLOCK, RAMPART, WOODEN_SHIELD_CARD, SLIDING_PARRY_CARD, TAUNT, BATTERING_RAM,
    ),
    items: [STRENGTH_BELT],
    usables: [STRENGTH_ELIXIR],
    hearts: [reds(6)],
}

export const SHADOW_THIEF_KIT: Kit = {
    name: "Voleur d'ombre",
    sprite: visual("units/shadow_thief"),
    cards: closeDeckAround(DAGGER, DAGGER, SHADOW_WAY, SHADOW, SHADOW_AIM, SHADOW_COMBO, SHADOW_STEP),
    items: [BACK_EYES],
    usables: [HASTE_ELIXIR],
    hearts: [reds(5)],
}

export const TEMPEST_MAGE_KIT: Kit = {
    name: "Tempétiste",
    sprite: visual("units/tempest_mage"),
    cards: deckAround(SPELL, SPELL, LIGHTNING, WIND, STORM_CARD, TASER, SMALL_SPELL),
    items: [HOURGLASS],
    usables: [ENERGIZER],
    hearts: [reds(5)],
}

export const DEMONIST_KIT: Kit = {
    name: "Démoniste",
    sprite: visual("units/demonist"),
    cards: closeDeckAround(SLASH, SLASH, GRUDGE, DEMON_SLASH, DEMONIC_STRIKE, COOL_HEAD),
    items: [DEMON_FANG],
    usables: [DEMON_ELIXIR],
    hearts: [reds(5)],
}

export const ACROBAT_KIT: Kit = {
    name: "Acrobate",
    sprite: visual("units/acrobat"),
    cards: closeDeckAround(SLASH, SLASH, LEAP, HEAD_JUMP, CRUSH, BOUNCE_DASH, SIDESTEP),
    items: [BOOTS],
    usables: [COOL_SYRUP],
    hearts: [reds(6)],
}

export const BLACK_KNIGHT_KIT: Kit = {
    name: "Chevalier noir",
    sprite: visual("units/black_knight"),
    cards: closeDeckAround(SLASH, SLASH, SWEEP, SCYTHE, BLOOD_AXE, BLOCK),
    items: [FANG],
    usables: [STRENGTH_ELIXIR],
    hearts: [blacks(10)],
}

export const BLEEDER_KIT: Kit = {
    name: "Saigneur",
    sprite: visual("units/bleeder"),
    cards: closeDeckAround(SLASH, SLASH, BLEED, HEMORRHAGE, MARK_CARD, ASSASSIN_BLOW, COATED_BLADE, BLOODY_COMBO),
    items: [CHIPPED_BLADE],
    usables: [BLOOD_FLASK],
    hearts: [reds(5)],
}

export const TURRET_ENGINEER_KIT: Kit = {
    name: "Ingénieur de tourelles",
    sprite: visual("units/turret_engineer"),
    cards: deckAround(TURRET, SENTINEL, SHOUT_TOTEM, ARMOR_PLATING, THRUSTERS, HOMING_HEAD, SHOT),
    items: [GEAR],
    usables: [FOLDING_TURRET],
    hearts: [reds(5)],
}

export const DUELIST_KIT: Kit = {
    name: "Duelliste",
    sprite: visual("units/duelist"),
    cards: closeDeckAround(TWIN_BLADES, SURPRISE_THRUST, MEGA_THRUST, PURSUIT, DISARM_CARD, SIDESTEP),
    items: [DODGE_SCEPTER],
    usables: [COCAINE],
    hearts: [reds(4)],
}

export const SWAMP_SORCERER_KIT: Kit = {
    name: "Sorcier des marais",
    sprite: visual("units/swamp_sorcerer"),
    cards: deckAround(
        SMALL_SPELL, MUD_CARD, STEAM_CARD, DRIZZLE, SPIT, CONFUSION, VULNERABILITY, SLOWNESS,
    ),
    items: [STICKY_SOLES],
    usables: [GLUE_TUBE],
    hearts: [reds(6)],
}

export const SHADOW_SAMURAI_KIT: Kit = {
    name: "Samurai de l'ombre",
    sprite: visual("units/shadow_samurai"),
    cards: closeDeckAround(SHADOW_STEP, SLASH, THRUST, MEGA_SLASH, SPIRIT_PROJECTION, SPIRIT_DASH),
    items: [BOOTS],
    usables: [HASTE_ELIXIR],
    hearts: [reds(6)],
}

/** The kits a run starts with. */
export const STARTING_KITS: readonly Kit[] = []

/** Every kit, the starting ones first: the tavern hires the others. */
export const ALL_KITS: readonly Kit[] = [
    ...STARTING_KITS, ARCHER_KIT, BRAWLER_KIT, ARTIFICER_KIT, MAGE_KIT, ASSASSIN_KIT, APOTHECARY_KIT,
    PUPPETEER_KIT, MECHANIC_KIT, HUNTER_KIT, BERSERKER_KIT, PYROMANCER_KIT, PRIEST_KIT, FISHER_KIT,
    SPIRITIST_KIT, BULLFIGHTER_KIT, CHRONOMANCER_KIT, RIDER_KIT, MARTYR_KIT, EXPLOSIVE_GOBLIN_KIT,
    GRAVITATIONIST_KIT, DRUID_KIT, GUNNER_KIT, HYPNOTIST_KIT, KNIGHT_KIT, SHADOW_THIEF_KIT, TEMPEST_MAGE_KIT,
    DEMONIST_KIT, ACROBAT_KIT, BLACK_KNIGHT_KIT, BLEEDER_KIT, TURRET_ENGINEER_KIT, DUELIST_KIT,
    SWAMP_SORCERER_KIT, SHADOW_SAMURAI_KIT,
]

/** How many things of one list a second list shares, each one counted as many times as both hold it. */
function shared<T>(first: readonly T[], second: readonly T[]): number {
    const left = [...second]
    let count = 0
    for (const each of first) {
        const at = left.indexOf(each)
        if (at >= 0) {
            left.splice(at, 1)
            count++
        }
    }
    return count
}

/**
 * How close a hero is to a kit, from 0 (nothing in common) to 1 (the same): what their cards, items and
 * usables share, over everything they hold together.
 */
export function kitScore(hero: Hero, kit: Kit): number {
    const cards = hero.decks.flat()
    const items = hero.items
    const usables = hero.usables.map(carried => carried.usable)
    const common = shared(cards, kit.cards) + shared(items, kit.items) + shared(usables, kit.usables)
    const total = cards.length + items.length + usables.length + kit.cards.length + kit.items.length + kit.usables.length
    return total === 0 ? 0 : 2 * common / total
}

/** The kit a hero is the closest to: the first of the best when several are as close. */
export function closestKit(hero: Hero, kits: readonly Kit[] = ALL_KITS): Kit {
    let best = kits[0]
    let bestScore = -1
    for (const kit of kits) {
        const score = kitScore(hero, kit)
        if (score > bestScore) {
            best = kit
            bestScore = score
        }
    }
    return best
}

/** The kits the tavern may hire: all of them, the party filtering those it already has. */
export const LOOT_KITS: readonly Kit[] = ALL_KITS
