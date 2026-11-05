import { Rarity } from "../../Rarity"

import { SHOT } from "../attack/Shot"
import { AIM } from "../movement/Aim"
import { FLEE } from "../movement/Flee"
import { PATH_AIM } from "../movement/PathAim"
import { SHADOW_AIM } from "../movement/ShadowAim"
import { SHADOW_STEP } from "../movement/ShadowStep"
import { STEP } from "../movement/Step"
import { SMALL_SPELL } from "../spell/ElementActions"
import { FIRE, WATER } from "../spell/ElementCard"
import { FusionCard } from "./FusionCard"

/** Two steps, each on the way to the enemy. */
export const PURSUIT = new FusionCard([PATH_AIM, STEP, PATH_AIM, STEP], { name: "Poursuite", rarity: Rarity.RARE })

/** A step through the walls, aimed through them: the only way to the aim of the shadow in the loot. */
export const SHADOW_WAY = new FusionCard([SHADOW_AIM, SHADOW_STEP], { name: "Voie de l'ombre", rarity: Rarity.RARE })

/** A small spell of fire, for one card of room. */
export const SPARK = new FusionCard([SMALL_SPELL, FIRE], { name: "Étincelle", rarity: Rarity.COMMON })

/** A small spell of water, for one card of room. */
export const DRIZZLE = new FusionCard([SMALL_SPELL, WATER], { name: "Bruine", rarity: Rarity.COMMON })

/** A step away from whoever is too close, then a shot at it. */
export const RETREAT_SHOT = new FusionCard([FLEE, AIM, SHOT], { name: "Tir de repli", rarity: Rarity.RARE })
