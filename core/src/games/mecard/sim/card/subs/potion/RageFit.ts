import { Rarity } from "../../Rarity"

import { FusionCard } from "../composite/FusionCard"
import { BOTTLE } from "./PotionActions"
import { RAGE } from "./PotionCard"

/** A rage drunk at once: a bottle of rage, for one card of room. */
export const RAGE_FIT = new FusionCard([BOTTLE, RAGE], { name: "Accès de rage", rarity: Rarity.RARE })
