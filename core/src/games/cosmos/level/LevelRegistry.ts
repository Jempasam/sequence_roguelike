import type { ElementLevel } from "./ElementLevel"
import type { World } from "./World"

/**
 * The levels of a universe by name. Adding a scale to the universe is adding its level here: the elements
 * name the kinds of their children, and the registry finds them.
 */
export class LevelRegistry {

    private readonly levels = new Map<string, ElementLevel>()

    private bound = false

    /** Put a level in the registry. Two levels cannot share a name. */
    public register(level: ElementLevel): this {
        if(this.levels.has(level.name)) throw new Error(`The level "${level.name}" is already registered.`)
        this.levels.set(level.name, level)
        return this
    }

    /** The level of a name. */
    public get(name: string): ElementLevel {
        const level = this.levels.get(name)
        if(!level) throw new Error(`No level is named "${name}".`)
        return level
    }

    /** The names of the levels, in the order they were registered. */
    public names(): string[] {
        return [...this.levels.keys()]
    }

    /** Give the levels the world they live in. A registry serves one world only. */
    public bind(world: World): void {
        if(this.bound) throw new Error("A registry serves one world only.")
        this.bound = true
        for(const level of this.levels.values()) level.world = world
    }
}
