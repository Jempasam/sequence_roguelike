import { Rarity } from "../../Rarity"

import { BEAR_TRAP } from "../combat/Bomb"
import { PAWN_CARD, PROMOTION } from "../chess/ChessCards"
import { BACK_DASH } from "../movement/BackDash"
import { RAM } from "../movement/Ram"
import { SWAP } from "../movement/Swap"
import { HORSE } from "../process/ProcessCards"
import { HOOK_ON } from "../process/LinkCards"
import { SLINGSHOT } from "../summon/Slingshot"
import { FusionCard } from "./FusionCard"
import { MergedCard } from "./MergedCard"

/** A pawn and a bear trap, for one card of room. */
export const TRAPPED_PAWN = new FusionCard([PAWN_CARD, BEAR_TRAP], { name: "Pion piégé", rarity: Rarity.RARE })

/** An ally hooked to the horse, which then gallops: the ally gallops with it. */
export const MOUNT = new FusionCard([HOOK_ON, HORSE], { name: "Monture", rarity: Rarity.RARE })

/** A horse and a ram at once. */
export const CAVALRY_CHARGE = new MergedCard([HORSE, RAM], { name: "Charge de cavalerie", rarity: Rarity.RARE })

/** A slingshot set down, then a dash back: the flight at the end of the round is longer. */
export const CATAPULT = new MergedCard([SLINGSHOT, BACK_DASH], { name: "Catapulte", rarity: Rarity.RARE })

/** An ally promoted to a piece, then a swap with the nearest unit. */
export const FORCED_CASTLING = new MergedCard([PROMOTION, SWAP], { name: "Roque forcé", rarity: Rarity.RARE })
