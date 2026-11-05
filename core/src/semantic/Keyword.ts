import type { Semantic, Text } from "./Text"

/**
 * A notion of a game that its texts name: what a word means, whatever way the sentence writes it. It says
 * nothing of how it is shown or explained: that is up to the reader of the text, who knows it by reference.
 */
export class Keyword implements Semantic {


    constructor(
        /** Its plain form: `collage`. */
        public readonly name: string,
    ){}


    /** This notion as a sentence writes it: `COLLAGE.as("collées")`, `CARTE.as("Cartes")`. */
    public as(form: string): KeywordWord {
        return new KeywordWord(this, form)
    }

    public toString(): string { return this.name }

    public toSemString(): Text { return this.as(this.name) }
}

/** A {@link Keyword} as a sentence writes it. */
export class KeywordWord implements Semantic {


    constructor(
        public readonly keyword: Keyword,

        /** How it is written here: its plural, a conjugated form, a capital. */
        public readonly form: string,
    ){}


    public toString(): string { return this.form }

    public toSemString(): Text { return this.form }
}
