import type { Text } from "../../../../semantic"
import { colored, rgba } from "../base/Rgba"
import type { Card } from "../card/Card"
import { CURSED_FLURRY } from "../card/subs/composite/FusionCard"
import { SHOT } from "../card/subs/attack/Shot"
import { SWEEP } from "../card/subs/attack/Sweep"
import { THRUST } from "../card/subs/attack/Thrust"
import { CLONE } from "../card/subs/combat/Clone"
import { DOUBLE_DIAGONAL } from "../card/subs/modifier/DoubleDiagonal"
import { GAMBLE } from "../card/subs/modifier/GambleCard"
import { HYPNOSIS } from "../card/subs/modifier/Hypnosis"
import { REPEAT_2 } from "../card/subs/modifier/RepeatCard"
import { AIM } from "../card/subs/movement/Aim"
import { BACK_DASH } from "../card/subs/movement/BackDash"
import { PATH_AIM } from "../card/subs/movement/PathAim"
import { STEP } from "../card/subs/movement/Step"
import { STUNNING_DASH } from "../card/subs/movement/StunningDash"
import { CONJURATION, SMALL_SPELL } from "../card/subs/spell/ElementActions"
import { FIRE, WATER } from "../card/subs/spell/ElementCard"
import { SPELL } from "../card/subs/spell/SpellCard"
import { ASSASSIN_BLOW } from "../card/subs/attack/AssassinBlow"
import { KAMIKAZE } from "../card/subs/body/BodyCards"
import { RAM } from "../card/subs/movement/Ram"
import { SHADOW_STEP } from "../card/subs/movement/ShadowStep"
import { WAIT } from "../card/subs/movement/Wait"
import { HORSE } from "../card/subs/process/ProcessCards"
import { DAGGER } from "../card/subs/attack/Dagger"
import { RICOCHET } from "../card/subs/attack/Ricochet"
import { SHOTGUN } from "../card/subs/attack/Shotgun"
import { SLASH } from "../card/subs/attack/Slash"
import { STURDY_AIM } from "../card/subs/movement/Aim"
import { LASSO } from "../card/subs/movement/HookCard"
import { RAGE_FIT } from "../card/subs/potion/RageFit"
import { CROSSBOW } from "../card/subs/attack/Shot"
import { MEGA_LASER } from "../card/subs/attack/MegaLaser"
import { SPIT } from "../card/subs/attack/Spit"
import { TACKLE } from "../card/subs/attack/Tackle"
import { DIVISION } from "../card/subs/combat/Division"
import { DRIZZLE, PURSUIT, RETREAT_SHOT, SPARK } from "../card/subs/composite/fusions"
import { BLINK } from "../card/subs/movement/Blink"
import { FLEE } from "../card/subs/movement/Flee"
import { SHADOW_AIM } from "../card/subs/movement/ShadowAim"
import { SIDESTEP } from "../card/subs/movement/Sidestep"
import type { Visual } from "../base/Visual"
import { visual } from "../base/Visual"

/**
 * A kind of monster: its hearts, and the loop its deck plays.
 *
 * @remarks
 * A monster deck is kept in order, and its draw is the length of one round of it, so it plays the same
 * rounds again and again, which the players learn to read. Its cards are written round by round: the bot
 * plays its hand from left to right, a card taking inputs taking the cards after it.
 */
export interface Monster {
    readonly name: string

    /** How it looks. */
    readonly sprite: Visual

    /** How many red hearts it has. */
    readonly hearts: number

    /** How many cards it draws each round, the first included: one round of its deck. */
    readonly draw: number

    /** How much bigger than the base its body is, a factor of its radius. 1 by default. */
    readonly size?: number

    /** Its deck, in the order it plays, one round after the other. */
    readonly cards: readonly Card[]

    /** Its name. */
    toString(): string

    /** Its name, in the color of the monsters. */
    toSemString(): Text
}

/** The color the name of a kind of monster is written in. */
const MONSTER_COLOR = rgba(0.95, 0.35, 0.3)

/** A kind of monster, telling itself by its name. */
export function monster(spec: Omit<Monster, "toString"|"toSemString">): Monster {
    return { ...spec, toString: () => spec.name, toSemString: () => colored(MONSTER_COLOR, spec.name) }
}

/** The small monsters: a round to come at you, then a thrust, the last one a coin toss. */
export const GOBLIN = monster({
    name: "Gobelin", sprite: visual("units/goblin"), hearts: 4, draw: 3,
    cards: [
        PATH_AIM, STEP, STEP,
        PATH_AIM, STEP, THRUST,
        AIM, GAMBLE, THRUST,
    ],
})

/** The archers: they turn and shoot, step away from whoever comes close, and aside to clear a rock. */
export const ARCHER = monster({
    name: "Archer", sprite: visual("units/monster_archer"), hearts: 4, draw: 3,
    cards: [
        AIM, SHOT, SHOT,
        AIM, FLEE, SHOT,
        AIM, GAMBLE, SHOT,
        SIDESTEP, AIM, SHOT,
    ],
})

/** The brutes: slow to come, then blows all around, the last ones after a stunning charge. */
export const BRUTE = monster({
    name: "Brute", sprite: visual("units/brute"), hearts: 8, draw: 3,
    cards: [
        PATH_AIM, STEP, STEP,
        PATH_AIM, STEP, SWEEP,
        PATH_AIM, STUNNING_DASH, CURSED_FLURRY,
    ],
})

/**
 * The hunters: they aim at whoever is sturdiest, so a coin or a wall does not fool them, and shoot around
 * the pillars.
 */
export const HUNTER = monster({
    name: "Chasseur", sprite: visual("units/hunter"), hearts: 4, draw: 3,
    cards: [
        STURDY_AIM, SHOT, SHOT,
        STURDY_AIM, BACK_DASH, RICOCHET,
        STURDY_AIM, GAMBLE, SHOTGUN,
        SIDESTEP, STURDY_AIM, SHOT,
    ],
})

/** The berserkers: a fit of rage turns them on someone at each step, which aims their lasso and sweeps. */
export const BERSERKER = monster({
    name: "Berserker", sprite: visual("units/berserker"), hearts: 6, draw: 3,
    cards: [
        RAGE_FIT, STEP, SLASH,
        LASSO, SWEEP, SWEEP,
        PATH_AIM, STEP, DAGGER,
    ],
})

/**
 * The boss of the cave: a full chain every round, playing the rare cards, a hypnosis, a clone, a
 * spell, so the players meet them before they own them.
 */
export const GOLEM = monster({
    name: "Golem runique", sprite: visual("units/golem"), hearts: 16, draw: 4,
    cards: [
        PATH_AIM, REPEAT_2, SWEEP, STEP,
        PATH_AIM, STUNNING_DASH, HYPNOSIS, THRUST,
        AIM, CLONE, DOUBLE_DIAGONAL, SHOT,
        AIM, SPELL, FIRE, SHOT,
    ],
})

/** The bulls: they turn and charge, more of it each round, and catch their breath. */
export const BULL = monster({
    name: "Taureau", sprite: visual("units/bull"), hearts: 8, draw: 4,
    cards: [
        PATH_AIM, RAM, WAIT, WAIT,
        PATH_AIM, RAM, PATH_AIM, RAM,
        PATH_AIM, RAM, RAM, WAIT,
    ],
})

/** The kamikaze robots: they come at you and blow up. */
export const KAMIKAZE_ROBOT = monster({
    name: "Robot kamikaze", sprite: visual("units/kamikaze_robot"), hearts: 3, draw: 3,
    cards: [PATH_AIM, STEP, STEP, PATH_AIM, STEP, KAMIKAZE],
})

/** The fire mages: sparks from afar, flames around whoever comes near, and a step away from it. */
export const FIRE_MAGE = monster({
    name: "Mage de feu", sprite: visual("units/fire_mage"), hearts: 4, draw: 3,
    cards: [
        AIM, SMALL_SPELL, FIRE,
        AIM, CONJURATION, FIRE,
        AIM, FLEE, FLEE,
        SIDESTEP, AIM, SPARK,
    ],
})

/** The elf assassins: they aim through the walls, slip across, and finish off whoever is feverish. */
export const ELF_ASSASSIN = monster({
    name: "Assassin elfe", sprite: visual("units/elf_assassin"), hearts: 4, draw: 3,
    cards: [
        SHADOW_AIM, SHADOW_STEP, ASSASSIN_BLOW,
        PATH_AIM, STEP, DAGGER,
        SHADOW_AIM, SHADOW_STEP, DAGGER,
        AIM, BACK_DASH, SHOT,
    ],
})

/** The goblin riders: on horse first, each of their steps then carries them ahead, a mere turn included. */
export const GOBLIN_RIDER = monster({
    name: "Gobelin cavalier", sprite: visual("units/goblin_rider"), hearts: 5, draw: 4,
    cards: [
        HORSE, PATH_AIM, PATH_AIM, SLASH,
        HORSE, PATH_AIM, THRUST, THRUST,
        HORSE, PATH_AIM, PATH_AIM, PATH_AIM,
    ],
})

/** The stone golems: twice the body, slow to come, then blows all around. */
export const STONE_GOLEM = monster({
    name: "Golem de pierre", sprite: visual("units/stone_golem"), hearts: 12, draw: 3, size: 2,
    cards: [
        PATH_AIM, STEP, WAIT,
        PATH_AIM, STEP, SWEEP,
        AIM, WAIT, SWEEP,
    ],
})

/** The slimes: slow to come, they spit to slow you, and split in two while they have hearts to share. */
export const SLIME = monster({
    name: "Slime", sprite: visual("units/slime"), hearts: 6, draw: 3,
    cards: [
        PATH_AIM, STEP, STEP,
        AIM, SPIT, TACKLE,
        DIVISION, PATH_AIM, STEP,
    ],
})

/** The elf archers: they shoot on the move, and never let anyone come close. */
export const ELF_ARCHER = monster({
    name: "Archer elfe", sprite: visual("units/elf_archer"), hearts: 4, draw: 3,
    cards: [
        AIM, CROSSBOW, FLEE,
        SIDESTEP, AIM, SHOT,
        RETREAT_SHOT, RETREAT_SHOT, SIDESTEP,
    ],
})

/** The ice mages: the fire mages, with water. */
export const ICE_MAGE = monster({
    name: "Mage de glace", sprite: visual("units/ice_mage"), hearts: 4, draw: 3,
    cards: [
        AIM, SMALL_SPELL, WATER,
        AIM, CONJURATION, WATER,
        AIM, FLEE, FLEE,
        SIDESTEP, AIM, DRIZZLE,
    ],
})

/** The imps: few hearts, but they run you down and jump at you. */
export const IMP = monster({
    name: "Diablotin", sprite: visual("units/imp"), hearts: 3, draw: 3,
    cards: [
        PURSUIT, DAGGER, BLINK,
        PATH_AIM, BLINK, DAGGER,
        AIM, FLEE, SHOT,
    ],
})

/** The common monsters: those of the floors, and those tamed as allies. */
export const LOOT_MONSTERS: readonly Monster[] = [
    GOBLIN, ARCHER, BRUTE, HUNTER, BERSERKER, BULL, KAMIKAZE_ROBOT, FIRE_MAGE, ELF_ASSASSIN, GOBLIN_RIDER,
    STONE_GOLEM, SLIME, ELF_ARCHER, ICE_MAGE, IMP,
]

/** The troll of the forest: twice the body, a sweep at every step, and a charge when it is close. */
export const TROLL = monster({
    name: "Troll", sprite: visual("units/troll"), hearts: 20, draw: 4, size: 2,
    cards: [
        PATH_AIM, STEP, SWEEP, SWEEP,
        PATH_AIM, RAM, REPEAT_2, SWEEP,
        PATH_AIM, STUNNING_DASH, CURSED_FLURRY, WAIT,
        STURDY_AIM, LASSO, SLASH, SLASH,
    ],
})

/** The megalaser robot of the mine: it shoots at whoever is sturdiest, and hardly ever stops. */
export const MEGALASER = monster({
    name: "Robot Megalaser", sprite: visual("units/megalaser"), hearts: 18, draw: 4,
    cards: [
        STURDY_AIM, REPEAT_2, SHOT, WAIT,
        AIM, SHOTGUN, RICOCHET, BACK_DASH,
        STURDY_AIM, DOUBLE_DIAGONAL, SHOT, SHOT,
        AIM, REPEAT_2, RICOCHET, WAIT,
        WAIT, WAIT, STURDY_AIM, MEGA_LASER,
    ],
})

/** The devil of hell: flames from afar, and it steps through the walls to finish the job. */
export const DEVIL = monster({
    name: "Diable", sprite: visual("units/devil"), hearts: 24, draw: 4,
    cards: [
        AIM, SPELL, FIRE, SHOT,
        SHADOW_AIM, SHADOW_STEP, ASSASSIN_BLOW, SWEEP,
        AIM, HYPNOSIS, THRUST, WAIT,
        AIM, SPELL, FIRE, SHADOW_STEP,
    ],
})

/** The bosses, one guarding each floor. */
export const BOSS_MONSTERS: readonly Monster[] = [GOLEM, TROLL, MEGALASER, DEVIL]

/** Every kind of monster. */
export const ALL_MONSTERS: readonly Monster[] = [...LOOT_MONSTERS, ...BOSS_MONSTERS]

/** The training dummy of the arena: it never plays, and is in no catalog, so no floor draws it. */
export const MANNEQUIN = monster({
    name: "Mannequin", sprite: visual("units/mannequin"), hearts: 10, draw: 0, cards: [],
})
