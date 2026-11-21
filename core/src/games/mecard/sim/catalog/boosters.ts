import {
    PROGRAMMED_BUBBLE, INSPIRATION, INFLATE, SURPRISE_BUBBLE, BATH, EXPLOSIVE_BATH, FIERY_BUBBLE,
    PISTO_BUBBLE, BURSTING,
} from "../card/subs/summon/BubbleCards"
import {
    VIOLET_BUBBLE, BLUE_BUBBLE, GREEN_BUBBLE, RED_BUBBLE, ORANGE_BUBBLE, EXPLOSIVE_BUBBLE, GIANT_BUBBLE, ELEMENTAL_BUBBLE,
    POTION_BUBBLE, BEAST_BUBBLE,
} from "../card/subs/summon/Bubbles"
import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Rng } from "../base/Rng"
import { colored, rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import type { Card } from "../card/Card"
import { DAGGER } from "../card/subs/attack/Dagger"
import { SHOT } from "../card/subs/attack/Shot"
import { SLASH } from "../card/subs/attack/Slash"
import { SWEEP } from "../card/subs/attack/Sweep"
import { THRUST } from "../card/subs/attack/Thrust"
import { BOMB } from "../card/subs/combat/Bomb"
import { DODGE_CARD } from "../card/subs/combat/DodgeCard"
import { BLAST_MODULE, BOW_MODULE, BULL_MODULE, MISSILE } from "../card/subs/mechanic/ModuleCard"
import { IMPROVISED_ROBOT, IMPROVISED_WEAPON, TANK_ROBOT } from "../card/subs/mechanic/RobotCard"
import { ASSASSIN_STEP } from "../card/subs/movement/AssassinStep"
import { BACK_DASH } from "../card/subs/movement/BackDash"
import { BLINK } from "../card/subs/movement/Blink"
import { STEP } from "../card/subs/movement/Step"
import { BOTTLE, THROWN_POTION } from "../card/subs/potion/PotionActions"
import { POISON, WEAKNESS } from "../card/subs/potion/PotionCard"
import { ELEMENT_CARDS, LIGHTNING, WIND } from "../card/subs/spell/ElementCard"
import { SPELL } from "../card/subs/spell/SpellCard"
import { SUBSTITUTION } from "../card/subs/summon/Substitution"
import { COIN, STONE_WALL } from "../card/subs/summon/summons"
import { BLOOD_AXE } from "../card/subs/attack/BloodAxe"
import { CROSSBOW } from "../card/subs/attack/Shot"
import { SHOTGUN } from "../card/subs/attack/Shotgun"
import { SKULL_BREAK } from "../card/subs/attack/SkullBreak"
import { SCYTHE } from "../card/subs/attack/Scythe"
import { BANDAGE } from "../card/subs/combat/Bandage"
import { BLOODLUST_CARD } from "../card/subs/combat/Bloodlust"
import { CLONE } from "../card/subs/combat/Clone"
import { CHARM, FEAR } from "../card/subs/combat/ControlCard"
import { PUSH } from "../card/subs/combat/Push"
import { SHADOW } from "../card/subs/combat/Shadow"
import { HYPNOSIS } from "../card/subs/modifier/Hypnosis"
import { FLEE } from "../card/subs/movement/Flee"
import { GRAPPLE, LASSO, VINE } from "../card/subs/movement/HookCard"
import { HARPOON } from "../card/subs/attack/Harpoon"
import { LEAP } from "../card/subs/movement/Leap"
import { SIDESTEP } from "../card/subs/movement/Sidestep"
import { SWAP } from "../card/subs/movement/Swap"
import { ANTIDOTE, CONFUSION, SLOWNESS, VULNERABILITY } from "../card/subs/potion/PotionCard"
import { THORN_SHIELD, TOTEM } from "../card/subs/summon/summons"
import { signatureOf } from "../card/CardChain"
import {
    AURA, CONJURATION, SMALL_SPELL,
    BEAST_CARDS, BITE, RUN, FURY, TRANSMUTATION, SUMMONING, CYBERNETIC_BEAST, ELEMENTAL,
    SYNCHRONISATION, STUTTER, PAS_DE_DEUX, PARROT, MEMORY_GAP, EXO_NERF,
    STUNNING_DASH, EXPLOSIVE_DASH, RAM, THRUST_CHARGE, BOUNCE_DASH, DEMON_SLASH, MEGA_SLASH, HEAD_JUMP, SHADOW_STEP, BATTERING_RAM,
    REPETITION, SUPER_REPETITION, REPEAT_2, MIRROR, DELAYED_CHARGE, TIME_MANIPULATION, COMBO, TORNADO, DOUBLE_DIAGONAL,
    POSSESSION, HAUNT, PLAGIARISM, ETHEREAL_FORM, SPIRIT_ANCHOR, SPIRIT_PROJECTION, SPIRIT_DASH, SOUL_LINK, SOUL_SHIELD,
    FAR_AIM, WEAK_AIM, CONCENTRATION, SPYGLASS_CARD, CHARGED_SHOT, MACHINE_GUN, RICOCHET, BOUNCING_BOW,
    ASSASSIN_BLOW, TACKLE, BLEED, HEMORRHAGE, MARK_CARD, FRAGILITY_CARD,
    SUCTION, BLACK_HOLE, CATCH, TIDE, SHOCK_WAVE, QUAKE, PROJECTION,
    TURRET, SENTINEL, SHOUT_TOTEM, DECOY,
    VIGOR, SWIFTNESS, SWALLOW, RAGE, FRENZY, PUDDLE, BARREL, POTION_RAIN, COATED_BLADE, BIG_BOTTLE, DISTILLATION, POTION_POUCH,
    BLOCK, RAMPART, WOODEN_SHIELD_CARD, SLIDING_PARRY_CARD, COUNTER_CARD, DISARM_CARD, TAUNT, EXPLOSIVE_SHELL,
    GRUDGE, DEMONIC_STRIKE, HELD_FURY, SACRIFICE, STRENGTH_CARD, COOL_HEAD,
    REACTION, RITUAL, CROSSED_SPELL,
    PAWN_CARD, ROOK_CARD, KNIGHT_PIECE_CARD, BISHOP_CARD, PLAYED_BY_NEAREST, PLAYED_BY_LAST, CASTLING, FORCED_CASTLING,
    REFLECTION, MISDIRECTION, GLASS_KNIFE, BEAR_TRAP, HORSE, KNIGHT_MOVE, STRIDE, SHY_AWAY, MOUNT, KICK, CANNONBALL,
    BOUNCING_BALL, SLINGSHOT, MINE, KAMIKAZE, COLLISION, DRAFT, OVERHEAT_CARD, MAGIC_KNIFE, HOOK_ON, LASER_LINK,
    PAWN_ROBOT,
    TRANSFUSION, EPIDEMIC, STUFFING, TAMING_MARK, SCARIFICATION, INOCULATION, AGGRAVATION, PLAGUE_MASK, PURGE,
    AUTOPSY, WHIP, LURE, MUZZLE, TREAT, STUFFING_PAD, NATURALIZATION, TROPHY,
} from "../card/subs"

/** Cards drawn at random from a pool, as many as `count`. */
export interface BoosterPool {
    readonly count: number
    readonly pool: readonly Card[]
}

/** A set of cards sold as one: opened, it gives `count` cards drawn at random from each of its pools. */
export interface Booster {
    readonly name: string
    readonly color: Rgba

    /** Its name, for the console. */
    toString(): string

    /** Its name in its color. */
    toSemString(): Text

    /** The card it is pictured by. */
    readonly icon: Card
    readonly pools: readonly BoosterPool[]
}

/** A booster, made from all of it but how it tells itself. */
export function booster(spec: Omit<Booster, "toString"|"toSemString">): Booster {
    return { ...spec, toString: () => spec.name, toSemString: () => colored(spec.color, spec.name) }
}

/** What a booster holds, pool after pool: how many cards it draws from which cards. */
export function boosterPoolsText(booster: Booster): Text {
    return concat(...booster.pools.flatMap(({ count, pool }, index) => {
        return [index === 0 ? "" : " · ", `${count} parmi `, joinText(pool, ", ")]
    }))
}

/** How many cards a booster gives when it is opened. */
export function boosterSize(booster: Booster): number {
    return booster.pools.reduce((sum, pool) => sum + pool.count, 0)
}

/** The cards a booster gives when it is opened: for each pool, `count` of its cards drawn at random, all different when it can. */
export function openBooster(rng: Rng, booster: Booster): Card[] {
    const cards: Card[] = []
    for(const { count, pool } of booster.pools){
        const left = [...pool]
        for(let index = 0; index < count; index++){
            if(left.length === 0) left.push(...pool)
            if(left.length === 0) break
            cards.push(...left.splice(rng.int(left.length), 1))
        }
    }
    return cards
}

/**
 * How well a booster fits a list of cards, from 0 to 1: the share of the cards of its pools that the list
 * has a card to read with, the cards of the list it can take or give to counting as much as those it holds.
 */
export function boosterFit(booster: Booster, cards: readonly Card[]): number {
    const pooled = booster.pools.flatMap(({ pool }) => pool)
    if(pooled.length === 0 || cards.length === 0) return 0
    const types = new Set(cards.flatMap(card => {
        const { input, output } = signatureOf(card)
        return input ? [input, output] : [output]
    }))
    const matching = pooled.filter(card => {
        const { input, output } = signatureOf(card)
        return cards.includes(card) || types.has(output) || (input !== null && types.has(input))
    })
    return matching.length / pooled.length
}

/** Every booster of the game, each written by hand. */
export const ALL_BOOSTERS: readonly Booster[] = ([
    {
        name: "Lames", color: rgba(0.8, 0.8, 0.9), icon: SLASH,
        pools: [{ count: 2, pool: [SLASH, THRUST, SWEEP, DAGGER] }, { count: 1, pool: [STEP, BACK_DASH, DODGE_CARD] }],
    },
    {
        name: "Arcanes", color: rgba(0.6, 0.35, 1), icon: SPELL,
        pools: [{ count: 1, pool: [SPELL, SMALL_SPELL, AURA, CONJURATION] }, { count: 2, pool: ELEMENT_CARDS }],
    },
    {
        name: "Ombres", color: rgba(0.35, 0.3, 0.5), icon: ASSASSIN_STEP,
        pools: [{ count: 1, pool: [ASSASSIN_STEP, BLINK] }, { count: 2, pool: [DAGGER, SLASH, BACK_DASH] }],
    },
    {
        name: "Atelier", color: rgba(1, 0.65, 0.2), icon: IMPROVISED_ROBOT,
        pools: [
            { count: 1, pool: [IMPROVISED_ROBOT, TANK_ROBOT, IMPROVISED_WEAPON] },
            { count: 2, pool: [BOW_MODULE, BULL_MODULE, BLAST_MODULE, MISSILE] },
        ],
    },
    {
        name: "Officine", color: rgba(0.35, 0.85, 0.45), icon: THROWN_POTION,
        pools: [{ count: 1, pool: [THROWN_POTION, BOTTLE] }, { count: 2, pool: [POISON, WEAKNESS] }],
    },
    {
        name: "Poudre", color: rgba(0.9, 0.35, 0.25), icon: BOMB,
        pools: [{ count: 2, pool: [BOMB, SHOT] }, { count: 1, pool: [SLASH, STEP] }],
    },
    {
        name: "Illusions", color: rgba(0.95, 0.8, 0.3), icon: COIN,
        pools: [{ count: 1, pool: [COIN, SUBSTITUTION] }, { count: 2, pool: [STONE_WALL, SHOT, SLASH] }],
    },
    {
        name: "Arbalètes", color: rgba(0.7, 0.55, 0.35), icon: CROSSBOW,
        pools: [{ count: 2, pool: [SHOT, CROSSBOW, SHOTGUN] }, { count: 1, pool: [STEP, SIDESTEP, DODGE_CARD] }],
    },
    {
        name: "Sang", color: rgba(0.7, 0.1, 0.15), icon: BLOOD_AXE,
        pools: [{ count: 1, pool: [BLOOD_AXE, SKULL_BREAK, SCYTHE] }, { count: 2, pool: [BLOODLUST_CARD, BANDAGE, SLASH, THRUST] }],
    },
    {
        name: "Crochets", color: rgba(0.4, 0.6, 0.5), icon: GRAPPLE,
        pools: [{ count: 2, pool: [LASSO, GRAPPLE, VINE, HARPOON] }, { count: 1, pool: [STEP, LEAP, FLEE] }],
    },
    {
        name: "Poisons", color: rgba(0.55, 0.8, 0.2), icon: POISON,
        pools: [{ count: 2, pool: [POISON, SLOWNESS, VULNERABILITY, CONFUSION] }, { count: 1, pool: [BOTTLE, THROWN_POTION, ANTIDOTE] }],
    },
    {
        name: "Gardiens", color: rgba(0.5, 0.5, 0.55), icon: TOTEM,
        pools: [{ count: 2, pool: [STONE_WALL, THORN_SHIELD, TOTEM] }, { count: 1, pool: [COIN, CLONE, SHADOW] }],
    },
    {
        name: "Esprit", color: rgba(0.9, 0.5, 0.8), icon: CHARM,
        pools: [{ count: 2, pool: [CHARM, FEAR, HYPNOSIS] }, { count: 1, pool: [PUSH, SWAP, SUBSTITUTION] }],
    },
    {
        name: "Bestial", color: rgba(0.75, 0.5, 0.25), icon: BEAST_CARDS[0],
        pools: [{ count: 1, pool: BEAST_CARDS }, { count: 2, pool: [BITE, RUN, FURY, TRANSMUTATION, SUMMONING] }],
    },
    {
        name: "Mental", color: rgba(0.75, 0.55, 0.9), icon: HYPNOSIS,
        pools: [
            { count: 2, pool: [SYNCHRONISATION, STUTTER, PAS_DE_DEUX, PARROT, MEMORY_GAP, EXO_NERF] },
            { count: 1, pool: [HYPNOSIS, CHARM, FEAR] },
        ],
    },
    {
        name: "Méca-bête", color: rgba(0.7, 0.6, 0.5), icon: CYBERNETIC_BEAST,
        pools: [
            { count: 1, pool: BEAST_CARDS },
            { count: 1, pool: [CYBERNETIC_BEAST] },
            { count: 1, pool: [IMPROVISED_ROBOT, TANK_ROBOT] },
        ],
    },
    {
        name: "Magi-bête", color: rgba(0.3, 0.75, 0.8), icon: ELEMENTAL,
        pools: [
            { count: 1, pool: ELEMENT_CARDS },
            { count: 1, pool: [ELEMENTAL] },
            { count: 1, pool: [FURY, TRANSMUTATION, SUMMONING] },
        ],
    },
    {
        name: "Dash-lame", color: rgba(0.85, 0.55, 0.55), icon: STUNNING_DASH,
        pools: [
            { count: 2, pool: [STUNNING_DASH, EXPLOSIVE_DASH, RAM, THRUST_CHARGE, BOUNCE_DASH, DEMON_SLASH] },
            { count: 1, pool: [MEGA_SLASH, HEAD_JUMP, SHADOW_STEP, BATTERING_RAM] },
        ],
    },
    {
        name: "Chrono", color: rgba(0.4, 0.7, 0.95), icon: REPETITION,
        pools: [
            { count: 2, pool: [REPETITION, SUPER_REPETITION, REPEAT_2, MIRROR, DELAYED_CHARGE] },
            { count: 1, pool: [TIME_MANIPULATION, COMBO, TORNADO, DOUBLE_DIAGONAL] },
        ],
    },
    {
        name: "Spectres", color: rgba(0.65, 0.8, 0.85), icon: ETHEREAL_FORM,
        pools: [
            { count: 1, pool: [POSSESSION, HAUNT, PLAGIARISM] },
            { count: 1, pool: [ETHEREAL_FORM, SPIRIT_ANCHOR, SPIRIT_PROJECTION] },
            { count: 1, pool: [SPIRIT_DASH, SOUL_LINK, SOUL_SHIELD] },
        ],
    },
    {
        name: "Tireurs d'élite", color: rgba(0.55, 0.65, 0.4), icon: CHARGED_SHOT,
        pools: [
            { count: 1, pool: [FAR_AIM, WEAK_AIM, CONCENTRATION] },
            { count: 2, pool: [SPYGLASS_CARD, CHARGED_SHOT, MACHINE_GUN, RICOCHET, BOUNCING_BOW] },
        ],
    },
    {
        name: "Hémorragie", color: rgba(0.55, 0.05, 0.3), icon: HEMORRHAGE,
        pools: [
            { count: 1, pool: [ASSASSIN_BLOW, TACKLE, SCYTHE] },
            { count: 2, pool: [BLEED, HEMORRHAGE, MARK_CARD, FRAGILITY_CARD] },
        ],
    },
    {
        name: "Gravité", color: rgba(0.25, 0.2, 0.45), icon: BLACK_HOLE,
        pools: [
            { count: 2, pool: [SUCTION, BLACK_HOLE, CATCH, TIDE] },
            { count: 1, pool: [SHOCK_WAVE, QUAKE, PROJECTION, BATTERING_RAM] },
        ],
    },
    {
        name: "Automates", color: rgba(0.6, 0.65, 0.7), icon: TURRET,
        pools: [
            { count: 2, pool: [TURRET, SENTINEL, SHOUT_TOTEM, DECOY] },
            { count: 1, pool: [BLACK_HOLE, TOTEM, STONE_WALL] },
        ],
    },
    {
        name: "Alchimie", color: rgba(0.3, 0.8, 0.7), icon: DISTILLATION,
        pools: [
            { count: 1, pool: [VIGOR, SWIFTNESS, SWALLOW, RAGE, FRENZY] },
            { count: 1, pool: [PUDDLE, BARREL, POTION_RAIN, COATED_BLADE, BIG_BOTTLE] },
            { count: 1, pool: [DISTILLATION, ANTIDOTE, POTION_POUCH] },
        ],
    },
    {
        name: "Défense", color: rgba(0.35, 0.5, 0.85), icon: RAMPART,
        pools: [
            { count: 2, pool: [BLOCK, RAMPART, WOODEN_SHIELD_CARD, SLIDING_PARRY_CARD, COUNTER_CARD] },
            { count: 1, pool: [DISARM_CARD, TAUNT, EXPLOSIVE_SHELL] },
        ],
    },
    {
        name: "Fureur", color: rgba(0.9, 0.2, 0.1), icon: DEMONIC_STRIKE,
        pools: [{ count: 3, pool: [GRUDGE, DEMONIC_STRIKE, HELD_FURY, SACRIFICE, STRENGTH_CARD, COOL_HEAD] }],
    },
    {
        name: "Réactions", color: rgba(0.95, 0.6, 0.35), icon: REACTION,
        pools: [{ count: 2, pool: ELEMENT_CARDS }, { count: 1, pool: [REACTION, RITUAL, CROSSED_SPELL] }],
    },
    {
        name: "Échiquier", color: rgba(0.92, 0.88, 0.75), icon: PAWN_CARD,
        pools: [
            { count: 2, pool: [PAWN_CARD, ROOK_CARD, KNIGHT_PIECE_CARD, BISHOP_CARD] },
            { count: 1, pool: [PLAYED_BY_NEAREST, PLAYED_BY_LAST, CASTLING, FORCED_CASTLING] },
        ],
    },
    {
        name: "Cristal", color: rgba(0.65, 0.9, 0.95), icon: GLASS_KNIFE,
        pools: [
            { count: 2, pool: [MIRROR, PARROT, REFLECTION, MISDIRECTION] },
            { count: 1, pool: [GLASS_KNIFE, BEAR_TRAP, THRUST] },
        ],
    },
    {
        name: "Écurie", color: rgba(0.65, 0.4, 0.2), icon: HORSE,
        pools: [
            { count: 2, pool: [HORSE, KNIGHT_MOVE, LEAP] },
            { count: 1, pool: [STRIDE, SHY_AWAY, MOUNT, KICK] },
        ],
    },
    {
        name: "Artillerie", color: rgba(0.5, 0.5, 0.55), icon: CANNONBALL,
        pools: [
            { count: 2, pool: [CANNONBALL, BOUNCING_BALL, SLINGSHOT] },
            { count: 1, pool: [MINE, BOMB, KAMIKAZE] },
        ],
    },
    {
        name: "Impacts", color: rgba(0.85, 0.55, 0.3), icon: COLLISION,
        pools: [
            { count: 2, pool: [COLLISION, DRAFT, PUSH, PROJECTION] },
            { count: 1, pool: [BATTERING_RAM, RAM, BOUNCE_DASH] },
        ],
    },
    {
        name: "Ardeur", color: rgba(1, 0.45, 0.1), icon: OVERHEAT_CARD,
        pools: [
            { count: 1, pool: [OVERHEAT_CARD, HELD_FURY, STRENGTH_CARD] },
            { count: 2, pool: [DEMONIC_STRIKE, SACRIFICE, GRUDGE, BLOODLUST_CARD] },
        ],
    },
    {
        name: "Pièges", color: rgba(0.55, 0.4, 0.25), icon: BEAR_TRAP,
        pools: [
            { count: 2, pool: [BEAR_TRAP, MINE, PUDDLE, BOMB] },
            { count: 1, pool: [DECOY, TAUNT, CATCH] },
        ],
    },
    {
        name: "Lames lancées", color: rgba(0.75, 0.8, 0.9), icon: MAGIC_KNIFE,
        pools: [
            { count: 1, pool: [MAGIC_KNIFE, DAGGER] },
            { count: 2, pool: [RICOCHET, BOUNCING_BOW, CHARGED_SHOT] },
        ],
    },
    {
        name: "Entraide", color: rgba(0.5, 0.85, 0.6), icon: HOOK_ON,
        pools: [
            { count: 2, pool: [HOOK_ON, LASER_LINK, SWAP, PAS_DE_DEUX] },
            { count: 1, pool: [MOUNT, FORCED_CASTLING, PAWN_ROBOT] },
        ],
    },
    {
        name: "Bulles", color: rgba(0.75, 0.7, 1), icon: VIOLET_BUBBLE,
        pools: [
            { count: 2, pool: [VIOLET_BUBBLE, BLUE_BUBBLE, GREEN_BUBBLE, RED_BUBBLE] },
            { count: 1, pool: [EXPLOSIVE_BUBBLE, ORANGE_BUBBLE, GIANT_BUBBLE] },
        ],
    },
    {
        name: "Bain moussant", color: rgba(0.85, 0.95, 1), icon: BATH,
        pools: [
            { count: 2, pool: [BATH, EXPLOSIVE_BATH, PISTO_BUBBLE, BURSTING, KAMIKAZE] },
            { count: 1, pool: [PROGRAMMED_BUBBLE, SURPRISE_BUBBLE] },
        ],
    },
    {
        name: "Bulles ensorcelées", color: rgba(0.6, 0.3, 0.9), icon: ELEMENTAL_BUBBLE,
        pools: [
            { count: 2, pool: [ELEMENTAL_BUBBLE, FIERY_BUBBLE, POTION_BUBBLE, BEAST_BUBBLE] },
            { count: 1, pool: [INSPIRATION, INFLATE, WIND, LIGHTNING] },
        ],
    },
    {
        name: "Pestilence", color: rgba(0.55, 0.75, 0.3), icon: TRANSFUSION,
        pools: [
            { count: 1, pool: [SCARIFICATION, INOCULATION] },
            { count: 1, pool: [TRANSFUSION] },
            { count: 1, pool: [EPIDEMIC, AGGRAVATION, PLAGUE_MASK, PURGE] },
        ],
    },
    {
        name: "Naturalisme", color: rgba(0.6, 0.42, 0.25), icon: AUTOPSY,
        pools: [
            { count: 1, pool: [AUTOPSY] },
            { count: 1, pool: [STUFFING_PAD, NATURALIZATION] },
            { count: 1, pool: [TROPHY, STUFFING] },
        ],
    },
    {
        name: "Dressage", color: rgba(0.4, 0.6, 0.85), icon: TAMING_MARK,
        pools: [
            { count: 1, pool: [LURE, MUZZLE, TREAT] },
            { count: 1, pool: [TAMING_MARK] },
            { count: 1, pool: [WHIP] },
        ],
    },
] satisfies readonly Omit<Booster, "toString"|"toSemString">[]).map(booster)

/** The boosters a magician offers: all of them for now. */
export const LOOT_BOOSTERS: readonly Booster[] = ALL_BOOSTERS
