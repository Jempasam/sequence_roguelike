import type { Frame } from "../space/Frame"
import type { Motion } from "../space/Motion"
import type { Choice, Landmark } from "./Landmark"
import type { Address, Pose } from "./Pose"

/** A color as red, green and blue from 0 to 1. */
export type Rgb = readonly [number, number, number]

/** A kind of element a level can hold, named in the {@link LevelRegistry}, with its share among the kinds. */
export interface ChildKind {
    readonly kind: string
    readonly weight: number
}

/** What a level generates for one element: where it goes and what it looks like. */
export interface ElementData {

    /** How the element moves in the level above. */
    readonly motion: Motion

    /** The main color of the element seen from afar. */
    readonly color: Rgb

    /** How much light the element gives out, from 0. */
    readonly glow: number

    /** The other colors of the element: the land and the sea of a planet, for instance. */
    readonly palette: readonly Rgb[]

    /** The numbers that only the level knows how to read. */
    readonly extra: Readonly<Record<string, number>>
}

/**
 * A way an element shows itself, from the size it has on the screen: it starts to apply when the element is
 * at least `minRadius` pixels wide. The names are the ones the view knows: `point` (a glowing dot), `fog`
 * (its density cloud, seen from outside) and `children` (what it holds, placed).
 */
export interface Stage {
    readonly name: "point" | "fog" | "children"
    readonly minRadius: number
}

/** What a level knows of one point of space at one time. */
export interface Info {

    /** The color of the point. */
    readonly color: Rgb

    /** How much matter the point holds, from 0 to 1. */
    readonly density: number

    /** The height of the ground at the point, 0 where there is none. */
    readonly height: number

    /** Is the point under a liquid? */
    readonly liquid: boolean
}

/** How the space of a level is drawn when one is inside it. */
export type Look = "cloud" | "ground" | "sphere"

/**
 * A scale of the universe, and all that the engine and the interface know of it. A position is a {@link Pose}
 * in a level; a level converts it from the level above and to it, tells what it knows of a point, and shows
 * what it holds around. What a level is made of, and how it picks the place a position falls in, stays in it.
 */
export abstract class Level {

    /** The name that the registry and the kinds of the other levels refer to. */
    public abstract readonly name: string

    /** The name shown to the player. */
    public abstract readonly label: string

    /** How the space of the level is drawn when one is inside it. */
    public readonly look: Look = "cloud"

    /** How the elements of this level show themselves as they grow on the screen, the smallest first. */
    public readonly stages: readonly Stage[] = [{ name: "point", minRadius: 0 }]

    /** Is an element of this level drawn from the level above? */
    public readonly shown: boolean = true

    /** The way an element of this level shows itself when it is `radius` pixels wide. */
    public stageAt(radius: number): Stage["name"] {
        let name = this.stages[0].name
        for(const stage of this.stages) if(radius >= stage.minRadius) name = stage.name
        return name
    }

    /** The place of a level below that a pose in this level falls nearest to. Null when it holds nothing. */
    public abstract pick(parent: Pose, time: number): Choice | null

    /**
     * Turn a pose in the level above into the pose in the element of this level at an address, at a time.
     * With `snap`, a position outside the element is brought to its edge, so a far one lands on its surface.
     */
    public abstract enter(parent: Pose, at: Address, time: number, snap?: boolean): Pose

    /** Turn a pose in this level into the pose in the level above, at a time. */
    public abstract leave(local: Pose, time: number): Pose

    /** Where the element of a pose lies in the space of the level above, at a time. */
    public abstract frame(local: Pose, time: number): Frame

    /** What the level knows of the point of a pose, at a time. */
    public abstract sample(local: Pose, time: number): Info

    /** What the element of a pose holds, placed in its space, at a time. */
    public abstract landmarks(local: Pose, time: number): Landmark[]
}

