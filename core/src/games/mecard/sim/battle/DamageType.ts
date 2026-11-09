import type { Text } from "../../../../semantic"

/**
 * What harm is made of: the dodge ignores the physical one. It writes itself in a text as the name of its
 * damage, which the interface may draw its own way. Compared by reference: there are only the two of the class.
 */
export class DamageType {


    public static readonly PHYSICAL = new DamageType("physical", "dégâts physiques")

    public static readonly ELEMENTAL = new DamageType("elemental", "dégâts élémentaires")

    /** The types of damage. */
    public static readonly ALL: readonly DamageType[] = [DamageType.PHYSICAL, DamageType.ELEMENTAL]

    protected constructor(
        /** What it is called, for the console: `physical`. */
        public readonly name: string,

        /** Its damage as a text names it, always in the plural: `dégâts physiques`. */
        public readonly label: string,
    ){}


    public toSemString(): Text { return this.label }

    public toString(): string { return this.label }
}
