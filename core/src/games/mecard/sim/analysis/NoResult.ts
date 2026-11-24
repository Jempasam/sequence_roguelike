/** A target that finds nothing to build from a source: the unit has nothing the target is made of. */
export class NoResultError extends Error {


    constructor(
        /** Why there is none, to tell the player. */
        public readonly why: string,
    ){
        super(why)
        this.name = "NoResultError"
    }
}

/** What a conversion gives: the thing, or why there is none. */
export type Converted<T> = { readonly value: T } | { readonly none: string }
