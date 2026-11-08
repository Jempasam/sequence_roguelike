import { BLUE_HEART } from "../../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../../heart/subs/ExplosiveHeartKind"

import { HeartFlask } from "./HeartFlask"
import { visual } from "../../base/Visual"

export const BLUE_FLASK = new HeartFlask("Flacon bleu", visual("usables/shield_flask"), BLUE_HEART, 1, { refill: "battle" })

export const EXPLOSIVE_CORE = new HeartFlask("Noyau explosif", visual("usables/shield_flask"), EXPLOSIVE_HEART, 2, { charges: 2 })

export const BLUE_BRACELET = new HeartFlask(
    "Bracelet bleu", visual("usables/shield_flask"), BLUE_HEART, 1, { charges: 2, refill: "battle" },
)
