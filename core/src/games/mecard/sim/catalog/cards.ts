/**
 * @packageDocumentation
 * The catalog of the cards: the ones found as loot, and every card of the game.
 */

import type { Card } from "../card"
import { Rarity } from "../card/Rarity"
import {
    VIOLET_BUBBLE, BLUE_BUBBLE, GREEN_BUBBLE, RED_BUBBLE, ORANGE_BUBBLE, EXPLOSIVE_BUBBLE, GIANT_BUBBLE, ELEMENTAL_BUBBLE,
    POTION_BUBBLE, BEAST_BUBBLE, PROGRAMMED_BUBBLE, INSPIRATION, INFLATE, SURPRISE_BUBBLE, BATH, EXPLOSIVE_BATH, FIERY_BUBBLE,
    PISTO_BUBBLE, BURSTING,
    ANTIDOTE, ASSASSIN_BLOW, ASSASSIN_STEP, ASSASSINATION, BACK_DASH, BANDAGE, BARREL, BIG_BOTTLE, BLINK,
    BODY_CARDS, HAZARD_CARDS, BOMB, BOTTLE, CHARGE, LASER_LINK, HOOK_ON, IRON_CHAIN, SPIRIT_ANCHOR, SPIRIT_PROJECTION, COUNTER_CARD, WOODEN_SHIELD_CARD, SLIDING_PARRY_CARD, DISARM_CARD,
    CHARM, ANGEL_FLIGHT,
    CLONE, COATED_BLADE, COIN, CONFUSION, CURSED_FLURRY, DAGGER, DISTILLATION, DOUBLE_DIAGONAL, DRAW,
    DrawnCard, EXPLOSIVE_DASH, FAR_AIM, FEAR, FIRE, FLAMETHROWER, FLASH_GRENADE, CONCENTRATION, FRENZY, GAMBLE,
    GRAPPLE, HORSE, HYPNOSIS, INSTINCT, LASSO, PATH_AIM, PLANT, POISON, POTION_POUCH, POTION_RAIN, PRAYER,
    PUDDLE, PUSH,
    RAGE, RAGE_FIT, RANDOM_AIM, RECOVERY, REPEAT_2, REPEAT_3, REPETITION, RICOCHET, SHOT, SHOTGUN, SLASH,
    SLOWNESS, SPELL, STONE, STONE_WALL, STRENGTH_CARD, STUNNING_DASH, STURDY_AIM, SUBSTITUTION,
    SUPER_REPETITION, SWAP,
    SWEEP, TASER, THORN_SHIELD, THROWN_POTION, THRUST, TORNADO, TOTEM, UNSTABLE_ELEMENT, UNSTABLE_THRUST,
    UNSURE_BLOW, VINE,
    VULNERABILITY, WATER, WEAK_AIM, WEAKNESS, weighted,
    BLOOD_AXE, BLOOD_STORM, BLOODLUST_CARD, BOUNCE_DASH, BOUNCING_BOW, CROSSBOW, HARPOON, HEAD_JUMP, HUNT, KNIGHT_MOVE,
    LEAP,
    MEGA_SLASH, MINE, SCYTHE, SHADOW, SHADOW_STEP, SKULL_BREAK, TACKLE,
    AURA, BLAST_MODULE, BOW_MODULE, BULL_MODULE, COMPOUND_CARDS, CONJURATION, CROSSED_SPELL,
    GRAND_RITUAL_CARD,
    IMPROVISED_ROBOT, IMPROVISED_WEAPON, LIGHTNING, MISSILE, RAM, REACTION, RITUAL, ECHO_RITUAL, SMALL_SPELL, TANK_ROBOT,
    WIND,
    DIVISION, DRIZZLE, FLEE, MEGA_LASER, PURSUIT, RETREAT_SHOT, SHADOW_AIM, SHADOW_WAY, SIDESTEP, SPARK, SPIT,
    MergedCard, FusionCard, KAMIKAZE,
    BLACK_HOLE, DECOY, SENTINEL, SHOUT_TOTEM, TURRET, CANNONBALL, BOUNCING_BALL, MAGIC_KNIFE, COLLISION, DRAFT, SLINGSHOT, OVERHEAT_CARD,
    PAWN_CARD, ROOK_CARD, KNIGHT_PIECE_CARD, BISHOP_CARD, QUEEN_CARD, PLAYED_BY_NEAREST, PLAYED_BY_LAST, PLAYED_BY_ALL,
    PROMOTION, CASTLING, CHECK,
    REFLECTION, MISDIRECTION, GLASS_KNIFE, BEAR_TRAP, STRIDE, SHY_AWAY, KICK, MOUNT, CAVALRY_CHARGE, CATAPULT,
    FORCED_CASTLING, TRAPPED_PAWN, PAWN_ROBOT,
    ARMOR_PLATING, DELAYED_CHARGE, HOMING_HEAD, INVERTER, MIRROR, MODULE_MIXER, MODULE_CORE, RECYCLING, REPEATER,
    SPYGLASS_CARD, THRUSTERS, TURBO,
    BLEED, BLOCK, COOL_HEAD, EXPLOSIVE_SHELL, FRAGILITY_CARD, GRUDGE, HELD_FURY, HEMORRHAGE, MARK_CARD, RAMPART,
    SOUL_LINK, SOUL_SHIELD, WEAKENING_BLOWS, EPIDEMIC, TRANSFUSION, STUFFING, TAMING_MARK,
    SCARIFICATION, INOCULATION, AGGRAVATION, PLAGUE_MASK, PURGE, COMBAT_FEVER,
    AUTOPSY, WHIP, LURE, MUZZLE, TREAT, STUFFING_PAD, NATURALIZATION, TROPHY,
    CHARGED_SHOT, CROSS_CUT, DEATH_SCYTHE, DEMON_SLASH, DEMONIC_STRIKE, FISHING, GREAT_THRUST, MACHINE_GUN,
    QUAKE, SACRIFICE, SUPLEX, THRUST_CHARGE,
    BATTERING_RAM, CATCH, PROJECTION, SHOCK_WAVE, SLING_CARD, SUCTION, TIDE,
    ABOUT_FACE, AIM, ALLY_AIM, DODGE_CARD, ENERGETIC_AIM, ICY_GLARE, ORIENTATION, SHOUT, STEP, TAUNT, TURNS,
    UNIVERSAL_ELEMENTS, WALKS,
    WAIT, SPIRIT_DASH, SHADOW_BLINK,
    DOUBLE_SLASH,
    TRIPLE_SLASH,
    ADAPTATION, ARC_STEP, ARC_TURN, BEAST_ARMOR, BEAST_CARDS, BITE, COMBO, CYBERNETIC_BEAST, ELEMENTAL, FLESH_CURSE, HYBRIDIZATION,
    REVERSED_ADAPTATION, ELEMENT_ON_BLADE, ELEPHANT_CARD, FURY, POSSESSION, PREPARATION_CARD, RUN,
    SUMMONING, TRANSMUTATION, TIME_MANIPULATION, TOTAL_HYBRID, TOTAL_TRANSFORMATION, TURN_AROUND,
    SWALLOW, SWIFTNESS, VIGOR,
    MEMORY_GAP, ONE_MIND, PARROT, PAS_DE_DEUX, STUTTER, SYNCHRONISATION, CARRION_BREATH, EXO_NERF,
    PIERCING_SPEAR, ETHEREAL_FORM, HAUNT, PLAGIARISM,
} from "../card/subs"
import { CARTE } from "../base/keywords"
import { keywordsOf } from "../card/describe"
import { RewriteCard } from "../card/subs/composite/RewriteCards"
import { upgradedWith, upgradesFor } from "./upgrades"

/**
 * Any card of the game that fits its place, drawn at the end of the preparation, the commoner more often:
 * named here, where every card is known.
 */
export const CHAOS: Card = chaosCard()

/**
 * A card of chaos of its own: given in a hand several times, each is spent on its own, which one shared card
 * could not be.
 */
export function chaosCard(): Card {
    return new DrawnCard("Chaos", [
        "Fin de préparation : devient n'importe quelle ", CARTE, " du jeu qui tient à sa place, les plus rares moins souvent.",
    ], Rarity.EPIC, () => weighted(ALL_CARDS))
}

/**
 * The card on its right improved by an upgrade drawn among those it matches. Named here, where the upgrades
 * are known: they are read only when it is rewritten.
 */
export const ENCHANTMENT: Card = new RewriteCard("Enchantement", [
    "Fin de préparation : la ", CARTE, " qui la suit reçoit une amélioration tirée au hasard parmi celles qui lui vont.",
], Rarity.RARE, (ctx, spot) => {
    const next = spot.next
    const fitting = next ? upgradesFor(next) : []
    if(!next || fitting.length === 0) return { cards: [], consumed: 0, acting: false }
    return { cards: [upgradedWith(ctx.pick(fitting), next, ctx.pick)], consumed: 1, acting: false }
})

/**
 * The card on its right become another of the deck of its unit sharing notions with it: two if any shares as
 * many, else one. Left as it is when none shares any.
 */
export const MOULT: Card = new RewriteCard("Mue", [
    "Fin de préparation : la ", CARTE, " qui la suit devient une ", CARTE, " de ta main, ta défausse ou ta chaîne ",
    "qui partage deux mots-clés avec elle, à défaut un.",
], Rarity.RARE, (ctx, spot) => {
    const next = spot.next
    if(!next || spot.trial) return { cards: [], consumed: 0, acting: false }
    const own = keywordsOf(next)
    const shared = (card: Card): number => [...keywordsOf(card)].filter(keyword => own.has(keyword)).length
    const others = [...new Set(spot.deck)].filter(card => card !== next && spot.fits(card))
    for(const least of [2, 1]){
        const close = others.filter(card => shared(card) >= least)
        if(close.length > 0) return { cards: [ctx.pick(close)], consumed: 1, acting: false }
    }
    return { cards: [], consumed: 0, acting: false }
})

/** The potions and what pours them, found as loot. */
export const POTION_CARDS: readonly Card[] = [
    POISON, SLOWNESS, WEAKNESS, RAGE, CONFUSION, VULNERABILITY, FRENZY, VIGOR, SWIFTNESS, SWALLOW, ANTIDOTE,
    DISTILLATION, BOTTLE, BIG_BOTTLE, THROWN_POTION, POTION_RAIN, BARREL, COATED_BLADE, PUDDLE, POTION_POUCH, RAGE_FIT,
]

/** A thrown potion pouring a frenzy: the target and the ones close to it turn on whoever is closest. */
export const THROWN_FRENZY = new FusionCard([THROWN_POTION, FRENZY], { name: "Frénésie lancée", rarity: Rarity.EPIC })

/** Rare fusions and merges of the new cards: what plays one after the other (→), or at once (+). */
export const BIG_SHOTGUN = new MergedCard([SHOTGUN, BACK_DASH], { name: "Gros Pompe", rarity: Rarity.RARE })
export const ALLY_LASSO = new FusionCard([ALLY_AIM, SPYGLASS_CARD, LASSO], { name: "Lasso allié", rarity: Rarity.RARE })
export const BLOODY_COMBO = new FusionCard([BLEED, HEMORRHAGE], { name: "Enchaînement sanglant", rarity: Rarity.RARE })
export const COVERING_FIRE = new MergedCard([SHOT, BACK_DASH], { name: "Tir de couverture", rarity: Rarity.RARE })
export const BLUE_VENGEANCE = new FusionCard([GRUDGE, BLOCK], { name: "Vengeance bleue", rarity: Rarity.RARE })
export const HUNTER_FUSION = new FusionCard([FAR_AIM, SPYGLASS_CARD, CHARGED_SHOT], { name: "Chasseur", rarity: Rarity.RARE })
export const DEMONIC_COMBO = new FusionCard([DEMON_SLASH, ENERGETIC_AIM, DEMONIC_STRIKE], { name: "Combo démoniaque", rarity: Rarity.RARE })
export const SUPLEX_SURPRISE = new FusionCard([ABOUT_FACE, SUPLEX], { name: "Surprise Suplex", rarity: Rarity.RARE })

/** A slash with the element on its right on the blade, at once: the blow applies its negative. */
export const ENCHANTED_BLADE = new MergedCard([ELEMENT_ON_BLADE, SLASH], { name: "Lame enchantée", rarity: Rarity.RARE })

/** A blade coated with the poison on its right, in one place of the chain. */
export const POISONED_BLADE = new FusionCard([COATED_BLADE, POISON], { name: "Lame empoisonnée", rarity: Rarity.EPIC })

/** The bubbles and what works with them: found in boosters only. */
export const BUBBLE_CARDS: readonly Card[] = [
    VIOLET_BUBBLE, BLUE_BUBBLE, GREEN_BUBBLE, RED_BUBBLE, ORANGE_BUBBLE, EXPLOSIVE_BUBBLE, GIANT_BUBBLE,
    ELEMENTAL_BUBBLE, POTION_BUBBLE, BEAST_BUBBLE, PROGRAMMED_BUBBLE,
    INSPIRATION, INFLATE, SURPRISE_BUBBLE, BATH, EXPLOSIVE_BATH, FIERY_BUBBLE, PISTO_BUBBLE, BURSTING,
]

/** The cards found as loot, the rare ones less often. */
export const LOOT_CARDS: readonly Card[] = [
    SHOT, SLASH, THRUST, SWEEP, STUNNING_DASH, BACK_DASH, BLINK, BOMB, KAMIKAZE, FLAMETHROWER, TASER, PUSH, CHARM, FEAR,
    CLONE, DOUBLE_DIAGONAL, REPEAT_2, REPEAT_3, HYPNOSIS, SPELL, FIRE, WATER, PLANT, STONE, CONCENTRATION, PRAYER,
    UNSTABLE_THRUST, CURSED_FLURRY, CHARGE, UNSTABLE_ELEMENT, UNSURE_BLOW,
    RANDOM_AIM, FAR_AIM, STURDY_AIM, WEAK_AIM, PATH_AIM, LASSO, GRAPPLE, VINE, ASSASSIN_STEP, SWAP,
    EXPLOSIVE_DASH,
    DAGGER, SHOTGUN, RICOCHET, FLASH_GRENADE, BANDAGE, COIN, SUBSTITUTION, STONE_WALL, THORN_SHIELD, TOTEM,
    TORNADO, REPETITION, SUPER_REPETITION, INSTINCT, CHAOS, RECOVERY, DRAW, STRENGTH_CARD, HORSE,
    KNIGHT_MOVE, LEAP, BOUNCE_DASH, SKULL_BREAK, HEAD_JUMP, MEGA_SLASH, ASSASSINATION, HARPOON, SCYTHE,
    BLOOD_AXE,
    BOUNCING_BOW, CROSSBOW, MINE, SHADOW_STEP, TACKLE, BLOODLUST_CARD, SHADOW, HUNT, ASSASSIN_BLOW,
    WIND, LIGHTNING, AURA, SMALL_SPELL, CONJURATION, CROSSED_SPELL, REACTION, RITUAL, GRAND_RITUAL_CARD, ECHO_RITUAL,
    BOW_MODULE, BULL_MODULE, BLAST_MODULE, MISSILE, IMPROVISED_ROBOT, TANK_ROBOT, IMPROVISED_WEAPON, RAM,
    MEGA_LASER, SIDESTEP, FLEE, SPIT, DIVISION, PURSUIT, SHADOW_WAY, SPARK, DRIZZLE, RETREAT_SHOT,
    BLACK_HOLE, TURRET, SHOUT_TOTEM, DECOY, SENTINEL, CANNONBALL, BOUNCING_BALL, MAGIC_KNIFE, COLLISION, DRAFT, SLINGSHOT, OVERHEAT_CARD,
    PAWN_CARD, ROOK_CARD, KNIGHT_PIECE_CARD, BISHOP_CARD, QUEEN_CARD, PLAYED_BY_NEAREST, PLAYED_BY_LAST, PLAYED_BY_ALL,
    CASTLING, CHECK,
    REFLECTION, MISDIRECTION, GLASS_KNIFE, BEAR_TRAP, STRIDE, SHY_AWAY, KICK, MOUNT, CAVALRY_CHARGE, CATAPULT,
    FORCED_CASTLING, TRAPPED_PAWN, PAWN_ROBOT,
    THRUSTERS, ARMOR_PLATING, TURBO, HOMING_HEAD, MODULE_MIXER, RECYCLING, REPEATER, INVERTER, MODULE_CORE,
    SPYGLASS_CARD, MIRROR, DELAYED_CHARGE,
    HELD_FURY, COOL_HEAD, WEAKENING_BLOWS, MARK_CARD, FRAGILITY_CARD, BLEED, HEMORRHAGE, GRUDGE, BLOCK, RAMPART,
    EXPLOSIVE_SHELL, SOUL_LINK, SOUL_SHIELD, EPIDEMIC, TRANSFUSION, STUFFING,
    SCARIFICATION, INOCULATION, AGGRAVATION, PLAGUE_MASK, PURGE, COMBAT_FEVER,
    AUTOPSY, WHIP, LURE, MUZZLE, TREAT, STUFFING_PAD, NATURALIZATION, TROPHY,
    SUPLEX, GREAT_THRUST, THRUST_CHARGE, DEMON_SLASH, MACHINE_GUN, CHARGED_SHOT, DEMONIC_STRIKE, QUAKE,
    DEATH_SCYTHE, CROSS_CUT, FISHING, SACRIFICE,
    PROJECTION, SUCTION, CATCH, BATTERING_RAM, SLING_CARD, SHOCK_WAVE, TIDE,
    BIG_SHOTGUN, ALLY_LASSO, BLOODY_COMBO, COVERING_FIRE, BLUE_VENGEANCE, HUNTER_FUSION, DEMONIC_COMBO, SUPLEX_SURPRISE,
    POISONED_BLADE,
    SHOUT, TAUNT, ORIENTATION, ENERGETIC_AIM, ALLY_AIM, ABOUT_FACE, ICY_GLARE,
    COUNTER_CARD, WOODEN_SHIELD_CARD, SLIDING_PARRY_CARD, DISARM_CARD, LASER_LINK, HOOK_ON, IRON_CHAIN, SPIRIT_ANCHOR, SPIRIT_PROJECTION,
    TURN_AROUND, ARC_STEP, ARC_TURN, TIME_MANIPULATION, PREPARATION_CARD, ENCHANTMENT, MOULT, COMBO, ELEPHANT_CARD,
    ANGEL_FLIGHT,
    POSSESSION, ...BEAST_CARDS, BITE, RUN, FURY, TRANSMUTATION, SUMMONING, TOTAL_TRANSFORMATION, ELEMENT_ON_BLADE, ENCHANTED_BLADE,
    CYBERNETIC_BEAST, FLESH_CURSE, BEAST_ARMOR, ELEMENTAL, HYBRIDIZATION, ADAPTATION, REVERSED_ADAPTATION,
    SYNCHRONISATION, STUTTER, PAS_DE_DEUX, PARROT, MEMORY_GAP, ONE_MIND, EXO_NERF, CARRION_BREATH,
    PIERCING_SPEAR, ETHEREAL_FORM, HAUNT, PLAGIARISM, THROWN_FRENZY,
    ...POTION_CARDS,
]

export const BARRAGE = new MergedCard([SHOTGUN, CROSSBOW], { name: "Barrage", rarity: Rarity.LEGENDARY })
export const SHADOW_COMBO = new FusionCard([STRENGTH_CARD, SHADOW_AIM, SHADOW_STEP, ASSASSINATION], { name: "Combo de l'ombre", rarity: Rarity.LEGENDARY })
export const CRUSH = new MergedCard([HEAD_JUMP, SKULL_BREAK], { name: "Écrasement", rarity: Rarity.LEGENDARY })
export const FORCED_SUICIDE = new FusionCard([GAMBLE, HYPNOSIS, KAMIKAZE], { name: "Forced Suicide", rarity: Rarity.LEGENDARY })
export const TWIN_BLADES = new MergedCard([SLASH, SLASH], { name: "Lames jumelles", rarity: Rarity.LEGENDARY })
export const SURPRISE_THRUST = new MergedCard([BACK_DASH, GREAT_THRUST], { name: "Estoc Surprise", rarity: Rarity.LEGENDARY })
export const MEGA_THRUST = new FusionCard([CONCENTRATION, ELEPHANT_CARD, GREAT_THRUST], { name: "Méga-Estoc", rarity: Rarity.LEGENDARY })
export const QUAKE_SEISM = new MergedCard([SUCTION, QUAKE, SHOCK_WAVE], { name: "Séisme", rarity: Rarity.LEGENDARY })
export const BULLET_RAIN = new MergedCard([MACHINE_GUN, MACHINE_GUN], { name: "Pluie de balles", rarity: Rarity.LEGENDARY })
export const CROSS_BOMB = new FusionCard([DOUBLE_DIAGONAL, BOMB], { name: "Bombe en croix", rarity: Rarity.LEGENDARY })
export const JOURNEY = new MergedCard([ORIENTATION, STEP, PATH_AIM, STEP], { name: "Voyage", rarity: Rarity.RARE })
export const THRUST_COMBO = new MergedCard([THRUST, ARC_STEP, TURN_AROUND, THRUST], { name: "Combo d'estoc", rarity: Rarity.LEGENDARY })
export const STORM_BLADE = new MergedCard([ELEMENT_ON_BLADE, SLASH, SWEEP], { name: "Lame des tempêtes", rarity: Rarity.LEGENDARY })

/** Rare and very powerful cards: two strong actions played at once. */
export const LEGENDARY_CARDS: readonly Card[] = [
    BARRAGE, SHADOW_COMBO, CRUSH, FORCED_SUICIDE, TWIN_BLADES,
    CROSS_BOMB, JOURNEY, SURPRISE_THRUST, MEGA_THRUST, QUAKE_SEISM,
    BULLET_RAIN, SPIRIT_DASH, SHADOW_BLINK,
    DOUBLE_SLASH, TRIPLE_SLASH, BLOOD_STORM,
    THRUST_COMBO, STORM_BLADE, TOTAL_HYBRID, TAMING_MARK,
]

/**
 * The cards every kit starts with: an aim, a wait and a dodge. Found as loot nowhere. The step and the turns
 * are no card of a deck: the characters play them as often as they wish.
 */
export const BASIC_CARDS: readonly Card[] = [AIM, WAIT, DODGE_CARD]

/** What every character of the players plays as often as it wishes, with no card of its hand: a step and the turns. */
export const UNLIMITED_CARDS: readonly Card[] = [STEP, ...TURNS]

/**
 * A card with variants of each family, the variant the unit chooses when it has not chosen: what a saved
 * variant is found by, with its place among the variants of its card. Found as loot nowhere.
 */
export const VARIANT_CARDS: readonly Card[] = [TURNS[0], WALKS[1], UNIVERSAL_ELEMENTS[0]]

/** Every card of the game, each once: what the console gives by name. */
export const ALL_CARDS: readonly Card[] = [
    ...new Set([
        STEP, ...BASIC_CARDS, ...LOOT_CARDS, GAMBLE, SHADOW_AIM, ...BODY_CARDS, ...HAZARD_CARDS, ...BUBBLE_CARDS,
        ...COMPOUND_CARDS, ...LEGENDARY_CARDS, ...VARIANT_CARDS, PROMOTION,
    ]),
]
