import { LevelRegistry } from "./LevelRegistry"
import { GalaxyLevel } from "./subs/space/GalaxyLevel"
import { SystemLevel } from "./subs/space/SystemLevel"
import { UniverseLevel } from "./subs/space/UniverseLevel"
import { CityLevel } from "./subs/surface/settlement/CityLevel"
import { DesertBiome } from "./subs/surface/biome/DesertBiome"
import { ForestBiome } from "./subs/surface/biome/ForestBiome"
import { HumanLevel } from "./subs/surface/HumanLevel"
import { PlanetLevel } from "./subs/surface/PlanetLevel"
import { ZoneLevel } from "./subs/surface/ZoneLevel"

/** The levels of the universe as it stands: from the cloud of galaxies down to a person's spot. */
export function defaultLevels(): LevelRegistry {
    return new LevelRegistry()
        .register(new UniverseLevel())
        .register(new GalaxyLevel())
        .register(new SystemLevel())
        .register(new PlanetLevel())
        .register(new ForestBiome())
        .register(new DesertBiome())
        .register(new CityLevel())
        .register(new ZoneLevel())
        .register(new HumanLevel())
}
