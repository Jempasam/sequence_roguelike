import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import type { UnitContext } from "../battle/Action"

/** What a status is to the unit holding it: what water washes off is negative. */
export type Polarity = "negative"|"positive"|"neutral"

/** How a kind of status makes a status of a level: the status, and the kind it is made for. */
export type StatusMaker = (level: number, type: StatusType) => Status

/** What sets a kind of status apart beyond its name. */
export interface StatusTypeOptions {
    /**
     * Does a clone of a unit hold it too, as it stands? Yes by default: not for what belongs to a body alone,
     * such as a possession or a hazard.
     */
    readonly cloned?: boolean

    /** The kind it is a variant of, for what shows a kind whatever its variant. Itself by default. */
    readonly family?: StatusType
}

/**
 * A kind of status: a unit holds one status of each kind at most. Compared by reference, so a kind with
 * variants, a dose or an element, is made once for each by its {@link StatusVariants}, never twice.
 */
export class StatusType {


    /** The kind of status it is a variant of: itself for one with no variants. */
    public readonly family: StatusType

    /** Does a clone of a unit hold it too? */
    public readonly cloned: boolean

    constructor(
        public readonly name: string,

        /** The color its name is written in. */
        public readonly color: Rgba,

        /** What it is to the unit holding it. */
        public readonly polarity: Polarity,

        /** What makes a status of this kind, at a level. */
        public readonly make: StatusMaker,

        options: StatusTypeOptions = {},
    ){
        this.family = options.family ?? this
        this.cloned = options.cloned ?? true
    }


    public toString(): string { return this.name }

    public toSemString(): Text { return colored(this.color, this.name) }
}

/**
 * The kind of status that a family of variants shares, a coat of whatever potion: no status is made of it
 * itself, only of its variants, which name it as their {@link StatusType.family}.
 */
export function familyType(
    name: string, color: Rgba, polarity: Polarity, options: StatusTypeOptions = {},
): StatusType {
    return new StatusType(name, color, polarity, () => {
        throw new Error(`"${name}" has variants: a status is made of one of them, never of it.`)
    }, options)
}

/**
 * A lasting effect on a unit: a burn, a root, a dodge.
 *
 * @remarks
 * It acts on its unit only through the observers and the modifiers that {@link Status.init} plugs in, plus
 * its level (what is left of it, how much it stacked). So a saved status is its kind and its level alone:
 * loading calls `init` again, which plugs everything back. A status of a kind a unit holds already is not
 * made again: its level goes up by the new one's.
 */
export interface Status {
    readonly type: StatusType

    /** What is left of it, or how much it stacked: a status of no level is gone. */
    readonly level: number

    /** Make it of another level, and whatever follows from the level with it. */
    setLevel(level: number): void

    /** Its kind and its level, such as `brûlure 2 rounds`. */
    toString(): string

    /** The same, its kind in its color. */
    toSemString(): Text

    /** Plug its observers and modifiers in. */
    init(ctx: UnitContext): void

    /** Take its observers and modifiers back. */
    remove(ctx: UnitContext): void
}
