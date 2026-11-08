import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Rng } from "../base/Rng"
import { rgba } from "../base/Rgba"
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
import { ELEMENT_CARDS } from "../card/subs/spell/ElementCard"
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
import { AURA, CONJURATION, SMALL_SPELL } from "../card/subs"

/** Cards drawn at random from a pool, as many as `count`. */
export interface BoosterPool {
    readonly count: number
    readonly pool: readonly Card[]
}

/** A set of cards sold as one: opened, it gives `count` cards drawn at random from each of its pools. */
export interface Booster {
    readonly name: string
    readonly color: Rgba

    /** The card it is pictured by. */
    readonly icon: Card
    readonly pools: readonly BoosterPool[]
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
export const ALL_BOOSTERS: readonly Booster[] = [
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
]

/** The boosters a magician offers: all of them for now. */
export const LOOT_BOOSTERS: readonly Booster[] = ALL_BOOSTERS
