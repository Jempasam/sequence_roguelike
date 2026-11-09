import type { Semantic, Text } from "./Text"

/** A notion of a game as a sentence writes it. */
export class KeywordWord implements Semantic {


    constructor(
        /** The notion this word writes. */
        public readonly keyword: Keyword,

        /** How it is written here: its plural, a conjugated form, a capital. */
        public readonly form: string,
    ){}


    public toString(): string { return this.form }

    public toSemString(): Text { return this.form }
}

/**
 * A notion of a game that its texts name: what a word means, whatever way the sentence writes it. It is itself
 * the word that writes it by its name; `as` writes it another way. It says nothing of how it is shown or
 * explained: that is up to the reader of the text, who knows it by reference.
 */
export class Keyword extends KeywordWord {


    constructor(
        /** Its plain form: `collage`. */
        public readonly name: string,
    ){
        super(undefined as never, name)
    }


    /** It writes itself: set once `super` has returned, as `this` does not exist before. */
    public override readonly keyword: Keyword = this


    /** Its own `keyword` is itself, which a JSON could not close: it is written as its name alone. */
    public toJSON(): { name: string } { return { name: this.name } }


    /** This notion as a sentence writes it: `COLLAGE.as("collées")`, `CARTE.as("Cartes")`. */
    public as(form: string): KeywordWord {
        return new KeywordWord(this, form)
    }
}
