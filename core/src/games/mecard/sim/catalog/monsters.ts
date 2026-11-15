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
import { AIM, WEAK_AIM } from "../card/subs/movement/Aim"
import { BACK_DASH } from "../card/subs/movement/BackDash"
import { PATH_AIM } from "../card/subs/movement/PathAim"
import { STEP } from "../card/subs/movement/Step"
import { STUNNING_DASH } from "../card/subs/movement/StunningDash"
import { CONJURATION, SMALL_SPELL } from "../card/subs/spell/ElementActions"
import { FIRE, WATER, PLANT } from "../card/subs/spell/ElementCard"
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
import { FLAMETHROWER } from "../card/subs/combat/Flamethrower"
import { SCYTHE } from "../card/subs/attack/Scythe"
import { SUPLEX, GREAT_THRUST, QUAKE } from "../card/subs/attack/Smashes"
import { SKULL_BREAK } from "../card/subs/attack/SkullBreak"
import { CHARGED_SHOT } from "../card/subs/attack/Volleys"
import { RANDOM_STEP } from "../card/subs/body/BodyCards"
import { STUTTER } from "../card/subs/chain/Stutter"
import { CATCH, SHOCK_WAVE } from "../card/subs/combat/Shoves"
import { COUNTER_CARD, WOODEN_SHIELD_CARD } from "../card/subs/combat/DodgeCard"
import { COMBO } from "../card/subs/modifier/Combo"
import { SPYGLASS_CARD } from "../card/subs/modifier/Wrappers"
import { SYNCHRONISATION } from "../card/subs/modifier/Synchronisation"
import { ALLY_AIM, TAUNT } from "../card/subs/movement/Orientation"
import { ANGEL_FLIGHT } from "../card/subs/movement/AngelFlight"
import { POISON, WEAKNESS, RAGE } from "../card/subs/potion/PotionCard"
import { PUDDLE, THROWN_POTION } from "../card/subs/potion/PotionActions"
import { EXO_NERF } from "../card/subs/process/ExoNerf"
import { ETHEREAL_FORM, HAUNT } from "../card/subs/spectre/SpectreCards"
import { BLOCK, CONCENTRATION, EXPLOSIVE_SHELL, HELD_FURY, RAMPART, BLEED } from "../card/subs/status/StatusCards"
import { DECOY, SENTINEL, TURRET } from "../card/subs/summon/ChainSummons"
import { THORN_SHIELD } from "../card/subs/summon/summons"
import { SUPLEX_SURPRISE, THROWN_FRENZY, MEGA_THRUST } from "./cards"
import { HARPOON } from "../card/subs/attack/Harpoon"
import { POSSESSION } from "../card/subs/attack/Possession"
import { CHARM } from "../card/subs/combat/ControlCard"
import { BOUNCE_DASH } from "../card/subs/movement/BounceDash"
import { HUNT } from "../card/subs/movement/Hunt"
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

/** The fire lizards: they run at you, spit a stream of flames, step back, and flame again. */
export const FIRE_LIZARD = monster({
    name: "Lézard de feu", sprite: visual("units/fire_lizard"), hearts: 5, draw: 3,
    cards: [
        PATH_AIM, STEP, STEP,
        PATH_AIM, FLAMETHROWER, FLEE,
        AIM, FLAMETHROWER, FLAMETHROWER,
    ],
})

/** The skeleton reapers: they stumble at you, then mow an arc of 1 to 2 meters. */
export const SKELETON_REAPER = monster({
    name: "Squelette faucheur", sprite: visual("units/skeleton_reaper"), hearts: 6, draw: 3,
    cards: [
        PATH_AIM, STEP, SCYTHE,
        RANDOM_STEP, PATH_AIM, SCYTHE,
        AIM, ASSASSIN_BLOW, SCYTHE,
    ],
})

/** The mad alchemists: poison and weakness thrown from afar, puddles, and a step away from contact. */
export const MAD_ALCHEMIST = monster({
    name: "Alchimiste fou", sprite: visual("units/mad_alchemist"), hearts: 4, draw: 3,
    cards: [
        AIM, THROWN_POTION, POISON,
        FLEE, PUDDLE, POISON,
        AIM, THROWN_POTION, WEAKNESS,
    ],
})

/** The goblin wrestlers: they grab you and do not let go, a combo of holds after another. */
export const GOBLIN_WRESTLER = monster({
    name: "Gobelin catcheur", sprite: visual("units/goblin_wrestler"), hearts: 9, draw: 4,
    cards: [
        PATH_AIM, STEP, CATCH, SUPLEX_SURPRISE,
        COMBO, SKULL_BREAK, WAIT, PATH_AIM,
        PATH_AIM, CATCH, COMBO, SUPLEX,
    ],
})

/** The goblin robot pilots: they steer their allies from behind, and thrust at the end of the cycle. */
export const GOBLIN_PILOT = monster({
    name: "Gobelin pilote de robot", sprite: visual("units/goblin_pilot"), hearts: 4, draw: 4,
    cards: [
        STEP, ALLY_AIM, EXO_NERF, STEP,
        FLEE, ALLY_AIM, STUTTER, ALLY_AIM,
        EXO_NERF, AIM, STEP, THRUST,
    ],
})

/** The orc battle shamans: they synchronize with the nearest ally, and both strike together. */
export const ORC_BATTLE_SHAMAN = monster({
    name: "Orc shaman combattant", sprite: visual("units/orc_battle_shaman"), hearts: 7, draw: 3,
    cards: [
        ALLY_AIM, SYNCHRONISATION, HELD_FURY,
        PATH_AIM, STEP, SLASH,
        ALLY_AIM, SYNCHRONISATION, SWEEP,
    ],
})

/** The haunting ghosts: they haunt their own allies, and strike from their place. */
export const HAUNTING_GHOST = monster({
    name: "Fantôme hanteur", sprite: visual("units/haunting_ghost"), hearts: 4, draw: 3,
    cards: [
        ETHEREAL_FORM, ALLY_AIM, HAUNT,
        SLASH, WAIT, SLASH,
        ALLY_AIM, HAUNT, SWEEP,
    ],
})

/** The shield guards: they fly before the farthest ally, raise their shields, and strike back. */
export const SHIELD_GUARD = monster({
    name: "Garde au bouclier", sprite: visual("units/shield_guard"), hearts: 10, draw: 3,
    cards: [
        ANGEL_FLIGHT, BLOCK, RAMPART,
        WOODEN_SHIELD_CARD, COUNTER_CARD, WAIT,
        PATH_AIM, SLASH, SLASH,
    ],
})

/** The thorn tanks: they draw the blows, and hurt whoever lands them, with little to strike back. */
export const THORN_TANK = monster({
    name: "Tank épineux provocateur", sprite: visual("units/thorn_tank"), hearts: 12, draw: 3,
    cards: [
        TAUNT, THORN_SHIELD, BLOCK,
        DECOY, RAMPART, WAIT,
        TAUNT, EXPLOSIVE_SHELL, SWEEP,
    ],
})

/** The snipers: a long chain, placed and focused, a whole round of waiting, and a shot that cannot be dodged. */
export const SNIPER = monster({
    name: "Sniper", sprite: visual("units/sniper"), hearts: 3, draw: 7,
    cards: [
        PATH_AIM, STEP, CONCENTRATION, WAIT, AIM, SPYGLASS_CARD, SHOT,
        WAIT, WAIT, WAIT, WAIT, WAIT, WAIT, WAIT,
        BACK_DASH, PATH_AIM, SIDESTEP, CONCENTRATION, WAIT, AIM, CHARGED_SHOT,
    ],
})

/** The harpoon pirates: they lasso or harpoon you to them, then cut. */
export const HARPOON_PIRATE = monster({
    name: "Pirate au harpon", sprite: visual("units/harpoon_pirate"), hearts: 5, draw: 3,
    cards: [
        AIM, LASSO, SLASH,
        AIM, HARPOON, SLASH,
        PATH_AIM, STEP, SLASH,
    ],
})

/** The toxic toads: they spit to slow, poison from afar, and keep their distance. */
export const TOXIC_TOAD = monster({
    name: "Crapaud toxique", sprite: visual("units/toxic_toad"), hearts: 4, draw: 3,
    cards: [
        AIM, SPIT, FLEE,
        AIM, SMALL_SPELL, PLANT,
        FLEE, AIM, SPIT,
    ],
})

/** The garrison goblins: they set up a turret, a decoy and a sentinel, and step back behind them. */
export const GARRISON_GOBLIN = monster({
    name: "Gobelin de garnison", sprite: visual("units/garrison_goblin"), hearts: 4, draw: 3,
    cards: [
        TURRET, FLEE, WAIT,
        DECOY, AIM, SHOT,
        SENTINEL, FLEE, WAIT,
    ],
})

/** The werewolves: a bouncing dash on you, and a bite that makes you bleed. */
export const WEREWOLF = monster({
    name: "Loup-garou", sprite: visual("units/werewolf"), hearts: 7, draw: 3,
    cards: [
        AIM, BOUNCE_DASH, SLASH,
        AIM, BLEED, SLASH,
        PATH_AIM, BOUNCE_DASH, SLASH,
    ],
})

/** The ogre crushers: slow and huge, a quake and a shock wave around them, and never a step back. */
export const OGRE_CRUSHER = monster({
    name: "Ogre écraseur", sprite: visual("units/ogre_crusher"), hearts: 14, draw: 3, size: 2,
    cards: [
        PATH_AIM, STEP, WAIT,
        PATH_AIM, QUAKE, WAIT,
        PATH_AIM, SHOCK_WAVE, SUPLEX,
    ],
})

/** The iron knights: blocks, counters and ramparts, and a sweep for whoever gets too close. */
export const IRON_KNIGHT = monster({
    name: "Chevalier de fer", sprite: visual("units/iron_knight"), hearts: 10, draw: 3,
    cards: [
        BLOCK, COUNTER_CARD, STEP,
        RAMPART, PATH_AIM, STEP,
        PATH_AIM, STEP, SWEEP,
    ],
})

/** The wandering samurai: they wait to gather their reach, then strike once, very long, and counter. */
export const WANDERING_SAMURAI = monster({
    name: "Samouraï errant", sprite: visual("units/wandering_samurai"), hearts: 8, draw: 4,
    cards: [
        AIM, STEP, CONCENTRATION, WAIT,
        WAIT, AIM, MEGA_THRUST, COUNTER_CARD,
        AIM, CONCENTRATION, WAIT, GREAT_THRUST,
    ],
})

/** The mind controllers: a thrown frenzy, a hypnosis, a charm and a rage turn the party against itself. */
export const MIND_CONTROLLER = monster({
    name: "Contrôleur mental", sprite: visual("units/mind_controller"), hearts: 5, draw: 3,
    cards: [
        AIM, THROWN_FRENZY, FLEE,
        AIM, HYPNOSIS, CHARM,
        AIM, THROWN_POTION, RAGE,
    ],
})

/** The vengeful spirits: they hunt the feeblest from the shadows, and take the place of what they kill. */
export const VENGEFUL_SPIRIT = monster({
    name: "Esprit vengeur", sprite: visual("units/vengeful_spirit"), hearts: 3, draw: 4,
    cards: [
        ETHEREAL_FORM, SHADOW_AIM, SHADOW_STEP, STEP,
        HUNT, POSSESSION, FLEE, SIDESTEP,
        WEAK_AIM, PATH_AIM, STEP, POSSESSION,
    ],
})

/** The ghosts: they haunt the units of the players, and strike all around from their place. */
export const GHOST = monster({
    name: "Fantôme", sprite: visual("units/ghost"), hearts: 4, draw: 4,
    cards: [
        AIM, HAUNT, SWEEP, WAIT,
        RANDOM_STEP, PATH_AIM, STEP, WAIT,
        SIDESTEP, AIM, HAUNT, DAGGER,
    ],
})

/** The common monsters: those of the floors, and those tamed as allies. */
export const LOOT_MONSTERS: readonly Monster[] = [
    GOBLIN, ARCHER, BRUTE, HUNTER, BERSERKER, BULL, KAMIKAZE_ROBOT, FIRE_MAGE, ELF_ASSASSIN, GOBLIN_RIDER,
    STONE_GOLEM, SLIME, ELF_ARCHER, ICE_MAGE, IMP,
    FIRE_LIZARD, SKELETON_REAPER, MAD_ALCHEMIST, GOBLIN_WRESTLER, GOBLIN_PILOT, ORC_BATTLE_SHAMAN,
    HAUNTING_GHOST, SHIELD_GUARD, THORN_TANK, SNIPER,
    HARPOON_PIRATE, TOXIC_TOAD, GARRISON_GOBLIN, WEREWOLF, OGRE_CRUSHER, IRON_KNIGHT, WANDERING_SAMURAI,
    MIND_CONTROLLER, VENGEFUL_SPIRIT, GHOST,
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

/** The hydra of the swamp: it spits poison from all its heads, and bleeds the party slowly. */
export const HYDRA = monster({
    name: "Hydre des marais", sprite: visual("units/hydra"), hearts: 22, draw: 4, size: 2,
    cards: [
        AIM, SPIT, THROWN_POTION, POISON,
        PATH_AIM, STEP, SWEEP, BLEED,
        AIM, SPIT, THROWN_POTION, WEAKNESS,
        STURDY_AIM, SPIT, REPEAT_2, SLASH,
    ],
})

/** The lich king of the graveyard: he hunts from beyond, scythes what comes close, and possesses a body. */
export const LICH_KING = monster({
    name: "Roi liche", sprite: visual("units/lich_king"), hearts: 20, draw: 4,
    cards: [
        AIM, HAUNT, SCYTHE, WAIT,
        ETHEREAL_FORM, SHADOW_AIM, SHADOW_STEP, SCYTHE,
        AIM, POSSESSION, SPELL, FIRE,
        AIM, HAUNT, DAGGER, SCYTHE,
    ],
})

/** The dark lord of the castle: a bulwark that turns blows back, and a heavy blade for whoever comes near. */
export const DARK_LORD = monster({
    name: "Seigneur noir", sprite: visual("units/dark_lord"), hearts: 24, draw: 4,
    cards: [
        AIM, RAMPART, BLOCK, WAIT,
        PATH_AIM, STEP, GREAT_THRUST, SLASH,
        AIM, COUNTER_CARD, THRUST, WAIT,
        PATH_AIM, STUNNING_DASH, SUPLEX, SLASH,
    ],
})

/** The frost giant of the tundra: twice the body, slow and crushing, with a sweep of ice. */
export const FROST_GIANT = monster({
    name: "Géant de givre", sprite: visual("units/frost_giant"), hearts: 26, draw: 4, size: 2,
    cards: [
        PATH_AIM, STEP, STEP, QUAKE,
        AIM, SPELL, WATER, SHOCK_WAVE,
        PATH_AIM, STUNNING_DASH, SWEEP, SWEEP,
        STURDY_AIM, LASSO, SUPLEX, WAIT,
    ],
})

/** The magma dragon of the volcano: flames in a line, a dive at whoever stands apart. */
export const MAGMA_DRAGON = monster({
    name: "Dragon de magma", sprite: visual("units/magma_dragon"), hearts: 24, draw: 4, size: 2,
    cards: [
        AIM, FLAMETHROWER, FLAMETHROWER, WAIT,
        AIM, SPELL, FIRE, SHOT,
        PATH_AIM, RAM, REPEAT_2, SWEEP,
        STURDY_AIM, FLAMETHROWER, BACK_DASH, SHOT,
    ],
})

/** The kraken captain of the harbor: harpoons to pull the party close, then everything at once. */
export const KRAKEN_CAPTAIN = monster({
    name: "Capitaine Kraken", sprite: visual("units/kraken_captain"), hearts: 22, draw: 4,
    cards: [
        AIM, HARPOON, SHOT, SHOT,
        STURDY_AIM, LASSO, SUPLEX, SLASH,
        AIM, SHOTGUN, RICOCHET, BACK_DASH,
        PATH_AIM, STEP, SWEEP, HARPOON,
    ],
})

/** The goblin mecha of the factory: turrets, missiles, and a kamikaze finish. */
export const GOBLIN_MECHA = monster({
    name: "Mécha-gobelin", sprite: visual("units/goblin_mecha"), hearts: 20, draw: 4, size: 2,
    cards: [
        AIM, TURRET, SHOT, WAIT,
        STURDY_AIM, CHARGED_SHOT, REPEAT_2, SHOT,
        AIM, SENTINEL, SHOTGUN, WAIT,
        STURDY_AIM, MEGA_LASER, WAIT, KAMIKAZE,
    ],
})

/** The ghost shogun of the dojo: quick steps out of the shadows, and a sword that never misses twice. */
export const GHOST_SHOGUN = monster({
    name: "Shogun fantôme", sprite: visual("units/ghost_shogun"), hearts: 20, draw: 4,
    cards: [
        SHADOW_AIM, SHADOW_STEP, ASSASSIN_BLOW, SLASH,
        AIM, BLINK, THRUST, SLASH,
        PATH_AIM, SIDESTEP, DAGGER, SLASH,
        ETHEREAL_FORM, SHADOW_AIM, ASSASSIN_BLOW, SLASH,
    ],
})

/** The bosses, one guarding each floor. */
export const BOSS_MONSTERS: readonly Monster[] = [
    GOLEM, TROLL, MEGALASER, DEVIL,
    HYDRA, LICH_KING, DARK_LORD, FROST_GIANT, MAGMA_DRAGON, KRAKEN_CAPTAIN, GOBLIN_MECHA, GHOST_SHOGUN,
]

/** Every kind of monster. */
export const ALL_MONSTERS: readonly Monster[] = [...LOOT_MONSTERS, ...BOSS_MONSTERS]

/** The training dummy of the arena: it never plays, and is in no catalog, so no floor draws it. */
export const MANNEQUIN = monster({
    name: "Mannequin", sprite: visual("units/mannequin"), hearts: 10, draw: 0, cards: [],
})
