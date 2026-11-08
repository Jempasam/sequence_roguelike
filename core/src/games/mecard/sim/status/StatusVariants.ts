import type { Element } from "../element/Element"
import { doseKey } from "../potion/Potion"
import type { Dose } from "../potion/Potion"

import { StatusType } from "./Status"
import type { Status } from "./Status"

/**
 * The variants of a kind of status, a type for each value of what sets them apart: a dose, an element.
 *
 * @remarks
 * It makes each variant once, and it alone does: the type of a status is compared by reference, so a type
 * made on the side would be another kind to the unit holding the first.
 */
export class StatusVariants<P, T extends StatusType> {


    constructor(
        /** What tells two values apart: the same text, the same variant. */
        private readonly key: (value: P) => string,

        /** The type of a value, made once. */
        private readonly create: (value: P) => T,
    ){}


    /** The type of a value, the same one each time. */
    public of(value: P): T {
        const key = this.key(value)
        const known = this.#made.get(key)
        if(known) return known
        const made = this.create(value)
        this.#made.set(key, made)
        return made
    }


    readonly #made = new Map<string, T>()
}

/** The type of a status made for a dose: a coat of a potion, a puddle of it. */
export interface DoseType extends StatusType {
    readonly dose: Dose
}

/** The type of a status made for an element: a ritual of an element, a boulder of it. */
export interface ElementType extends StatusType {
    readonly element: Element
}

/** What builds a status of a variant: its kind, which holds the value, and its level. */
export type VariantMaker<T extends StatusType> = (type: T, level: number) => Status

class DoseTypeOf extends StatusType implements DoseType {

    constructor(
        family: StatusType, name: string, public readonly dose: Dose, make: VariantMaker<DoseType>,
    ){
        super(name, family.visual, family.polarity, (level, type) => make(type as DoseTypeOf, level), {
            family, cloned: family.cloned,
        })
    }
}

class ElementTypeOf extends StatusType implements ElementType {

    constructor(
        family: StatusType, name: string, public readonly element: Element, make: VariantMaker<ElementType>,
    ){
        super(name, family.visual, family.polarity, (level, type) => make(type as ElementTypeOf, level), {
            family, cloned: family.cloned,
        })
    }
}

/**
 * The kinds of a family of statuses made for a dose, one for each dose.
 *
 * @param family - The kind they are variants of, which gives them their color and their polarity.
 * @param name - What a variant is called, from its dose.
 * @param make - What makes a status of a variant.
 */
export function doseVariants(
    family: StatusType, name: (dose: Dose) => string, make: VariantMaker<DoseType>,
): StatusVariants<Dose, DoseType> {
    return new StatusVariants(doseKey, dose => new DoseTypeOf(family, name(dose), dose, make))
}

/** The kinds of a family of statuses made for an element, one for each element: see {@link doseVariants}. */
export function elementVariants(
    family: StatusType, name: (element: Element) => string, make: VariantMaker<ElementType>,
): StatusVariants<Element, ElementType> {
    return new StatusVariants(
        element => element.name, element => new ElementTypeOf(family, name(element), element, make),
    )
}

/** The dose of a kind of a family, none for a kind that is not a variant of it made for a dose. */
export function doseOf(type: StatusType, family: StatusType): Dose|null {
    return type instanceof DoseTypeOf && type.family === family ? type.dose : null
}

/** The element of a kind of a family, none for a kind that is not a variant of it made for an element. */
export function elementOf(type: StatusType, family: StatusType): Element|null {
    return type instanceof ElementTypeOf && type.family === family ? type.element : null
}
