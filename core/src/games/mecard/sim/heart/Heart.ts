import type { Text } from "../../../../semantic"

import type { HeartKind } from "./HeartKind"

/**
 * A heart of a life bar: its kind, and whether it is lost yet kept as an empty place, which a kind may fill
 * again. One life each: what it does lies in the rules of its kind, {@link HeartRule}.
 */
export class Heart {


    constructor(
        public readonly kind: HeartKind,

        /** Is it lost, kept as an empty place? */
        public isEmpty = false,
    ){}


    /** Copies of hearts, so a bar never shares them with another. */
    public static copies(hearts: readonly Heart[]): Heart[] {
        return hearts.map(heart => new Heart(heart.kind, heart.isEmpty))
    }

    /** A number of hearts of a kind, full. */
    public static many(kind: HeartKind, count: number): Heart[] {
        return Array.from({ length: Math.max(0, count) }, () => new Heart(kind))
    }

    /** Its kind, `rouge`, or `rouge vide`. */
    public toString(): string { return this.isEmpty ? `${this.kind.name} vide` : this.kind.name }

    /** The same, its kind in its color. */
    public toSemString(): Text {
        return this.isEmpty ? [this.kind, " vide"] : [this.kind]
    }
}

/**
 * Put a heart in a life bar where it belongs: a heart of the base life after the last one of the base,
 * before the other kinds, which stay the first lost; any other at the end.
 */
export function insertHeart(hearts: Heart[], heart: Heart): void {
    if(!heart.kind.base){
        hearts.push(heart)
        return
    }
    const firstOther = hearts.findIndex(each => !each.kind.base)
    hearts.splice(firstOther >= 0 ? firstOther : hearts.length, 0, heart)
}
