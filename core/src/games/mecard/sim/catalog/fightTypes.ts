import type { FightType } from "../fight/FightType"
import { CASTLE_FIGHTS } from "../floor/fights/castleFights"
import { CAVE_FIGHTS } from "../floor/fights/caveFights"
import { DOJO_FIGHTS } from "../floor/fights/dojoFights"
import { FACTORY_FIGHTS } from "../floor/fights/factoryFights"
import { FOREST_FIGHTS } from "../floor/fights/forestFights"
import { GRAVEYARD_FIGHTS } from "../floor/fights/graveyardFights"
import { HARBOR_FIGHTS } from "../floor/fights/harborFights"
import { HELL_FIGHTS } from "../floor/fights/hellFights"
import { MINE_FIGHTS } from "../floor/fights/mineFights"
import { SWAMP_FIGHTS } from "../floor/fights/swampFights"
import { TUNDRA_FIGHTS } from "../floor/fights/tundraFights"
import { VOLCANO_FIGHTS } from "../floor/fights/volcanoFights"
import { EMPTY_FIGHT } from "../fight/fights"

/**
 * Every fight, as saved by id: those the floors lay, and the empty one.
 *
 * @remarks
 * A function, not a value: the fights reach the saves, which reach this, while the floors are still being read.
 */
export function allFightTypes(): readonly FightType[] {
    const floors = [
        CAVE_FIGHTS, FOREST_FIGHTS, MINE_FIGHTS, HELL_FIGHTS, SWAMP_FIGHTS, TUNDRA_FIGHTS, CASTLE_FIGHTS, DOJO_FIGHTS,
        GRAVEYARD_FIGHTS, VOLCANO_FIGHTS, FACTORY_FIGHTS, HARBOR_FIGHTS,
    ]
    return [...floors.flatMap(fights => fights.map(each => each.type)), EMPTY_FIGHT]
}

/**
 * The fight with an id, from a save or a command.
 *
 * @throws {@link Error} When the catalog has none.
 */
export function fightTypeById(id: string): FightType {
    const type = allFightTypes().find(each => each.id === id)
    if(!type) throw new Error(`The catalog has no fight "${id}".`)
    return type
}
