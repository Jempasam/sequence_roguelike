import type { AmbientEffect } from "./AmbientEffect"
import { BATS } from "./effects/Bats"
import { BIRD_FLOCK } from "./effects/BirdFlock"
import { BOSS_EYE } from "./effects/BossEye"
import { CLOUD_SHADOW } from "./effects/CloudShadow"
import { DEFEATED_GHOST } from "./effects/DefeatedGhost"
import { EMBERS } from "./effects/Embers"
import { FIREFLIES } from "./effects/Fireflies"
import { FOG } from "./effects/Fog"
import { FOOTPRINTS } from "./effects/Footprints"
import { LEAVES } from "./effects/Leaves"
import { LOST_COIN } from "./effects/LostCoin"
import { SHOOTING_STAR } from "./effects/ShootingStar"
import { TRAVELING_MONSTER } from "./effects/TravelingMonster"
import { CAMPFIRE } from "./effects/Campfire"
import { CHERRY_PETALS } from "./effects/CherryPetals"
import { EXPLOSION } from "./effects/Explosion"
import { GUST } from "./effects/Gust"
import { LAVA_GEYSER } from "./effects/LavaGeyser"
import { LIGHTNING } from "./effects/Lightning"
import { MERCHANT_CART } from "./effects/MerchantCart"
import { MINE_CART } from "./effects/MineCart"
import { MONSTER_LINE } from "./effects/MonsterLine"
import { MONSTER_PASSING } from "./effects/MonsterPassing"
import { WHIRL } from "./effects/Whirl"

/** Every ambient effect of the map. */
export const AMBIENT_EFFECTS: readonly AmbientEffect[] = [
    TRAVELING_MONSTER, BIRD_FLOCK, BATS, LEAVES, FIREFLIES, CLOUD_SHADOW, EMBERS, SHOOTING_STAR, FOG,
    BOSS_EYE, LOST_COIN, DEFEATED_GHOST, FOOTPRINTS,
    CAMPFIRE, MERCHANT_CART, MONSTER_PASSING, MONSTER_LINE, WHIRL, LAVA_GEYSER, MINE_CART, CHERRY_PETALS,
    EXPLOSION, LIGHTNING, GUST,
]
