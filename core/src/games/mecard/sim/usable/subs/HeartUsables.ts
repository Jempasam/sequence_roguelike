import { BLUE_HEART } from "../../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../../heart/subs/ExplosiveHeartKind"

import { HeartFlask } from "./HeartFlask"

export const BLUE_FLASK = new HeartFlask("Flacon bleu", "mecard/usables/shield_flask.png", BLUE_HEART, 1, { refill: "battle" })

export const EXPLOSIVE_CORE = new HeartFlask("Noyau explosif", "mecard/usables/shield_flask.png", EXPLOSIVE_HEART, 2, { charges: 2 })

export const BLUE_BRACELET = new HeartFlask(
    "Bracelet bleu", "mecard/usables/shield_flask.png", BLUE_HEART, 1, { charges: 2, refill: "battle" },
)
