import { SHOT } from "../card/subs/attack/Shot"
import { SLASH } from "../card/subs/attack/Slash"
import { SWEEP } from "../card/subs/attack/Sweep"
import { THRUST } from "../card/subs/attack/Thrust"
import { DAGGER } from "../card/subs/attack/Dagger"
import { RAGE_FIT } from "../card/subs/potion/RageFit"
import { AIM } from "../card/subs/movement/Aim"
import { BACK_DASH } from "../card/subs/movement/BackDash"
import { PATH_AIM } from "../card/subs/movement/PathAim"
import { SIDESTEP } from "../card/subs/movement/Sidestep"
import { STEP } from "../card/subs/movement/Step"
import { WAIT } from "../card/subs/movement/Wait"
import { CONJURATION, SMALL_SPELL } from "../card/subs/spell/ElementActions"
import { FIRE, WATER } from "../card/subs/spell/ElementCard"
import { monster } from "./monsters"
import type { Monster } from "./monsters"
import { visual } from "../base/Visual"

/**
 * A pet: a monster of a trainer, tamed as an ally. Defined as the monsters are, but kept apart, so
 * the trainers have monsters of their own and the floors have theirs.
 */
export type Pet = Monster

/** The wolves: they come fast, bite, and back off. */
export const WOLF = monster({
    name: "Loup", sprite: visual("units/wolf"), hearts: 5, draw: 3,
    cards: [
        PATH_AIM, STEP, DAGGER,
        PATH_AIM, STEP, THRUST,
        AIM, BACK_DASH, DAGGER,
    ],
})

/** The bears: sturdy, slow, and blows all around. */
export const BEAR = monster({
    name: "Ours", sprite: visual("units/bear"), hearts: 10, draw: 3,
    cards: [
        PATH_AIM, STEP, WAIT,
        PATH_AIM, STEP, SWEEP,
        AIM, WAIT, SWEEP,
    ],
})

/** The hawks: they shoot from afar and never stay in place. */
export const HAWK = monster({
    name: "Faucon", sprite: visual("units/hawk"), hearts: 3, draw: 3,
    cards: [
        AIM, SHOT, SIDESTEP,
        AIM, BACK_DASH, SHOT,
        SIDESTEP, AIM, SHOT,
    ],
})

/** The salamanders: sparks of fire, and a step aside. */
export const SALAMANDER = monster({
    name: "Salamandre", sprite: visual("units/salamander"), hearts: 4, draw: 3,
    cards: [
        AIM, SMALL_SPELL, FIRE,
        SIDESTEP, AIM, SHOT,
        AIM, CONJURATION, FIRE,
    ],
})

/** The otters: water on whoever comes close, then a sweep of the tail. */
export const OTTER = monster({
    name: "Loutre", sprite: visual("units/otter"), hearts: 5, draw: 3,
    cards: [
        AIM, SMALL_SPELL, WATER,
        PATH_AIM, STEP, SWEEP,
        AIM, CONJURATION, WATER,
    ],
})

/** The boars: a fit of rage at every round, and slashes after it. */
export const BOAR = monster({
    name: "Sanglier", sprite: visual("units/boar"), hearts: 7, draw: 3,
    cards: [
        RAGE_FIT, STEP, SLASH,
        PATH_AIM, STEP, SLASH,
        RAGE_FIT, PATH_AIM, THRUST,
    ],
})

/** Every pet a trainer may offer. */
export const ALL_PETS: readonly Pet[] = [WOLF, BEAR, HAWK, SALAMANDER, OTTER, BOAR]

/** The pets a trainer offers: all of them for now. */
export const LOOT_PETS: readonly Pet[] = ALL_PETS
